/*
	Two way databinding between a data object and DOM element(s).
	A databinding is attached to one data object. It can be bound to one or more elements.
	Changes in the element are resolved every x ms;
	Changes in the data are resolved to the element directly;

	config options:
		data: the data object to be used for databinding. Note that this is the 'outer' object, the databinding itself will be set on data[key];
		key: the key within the data object to be bound
		setter: a function that sets the data on the element. A simple example would take the provided value and set it as innerHTML.
		getter: a function that fetches the data from an element. Simple example would be "return target.innerHTML";
		mode: "list" of "field"; the only difference between the two is the listeners that are applied to the supplied element.
			"list" listens on attribute changes, node insertions and node removals.
			"field" listens on attribute changes, subtree modifications.
		parentKey: an additional pointer to where the data is bound without your datastructure; use this to keep track of nesting within your data.
		attributeFilter: a blacklist of attributes that should not trigger a change in data;
		resolve: a function that is called _after_ a change in data has been resolved. The arguments provided to the function are: dataBinding, key, value, oldValue

	Basic usage usage:
		var data = {
			"title" : "foo"
		};

		var dataBinding = new databinding({
			data : data,
			key : title,
			setter : function(value) {
				this.innerHTML = value;
			},
			getter: function() {
				return this.innerHTML;
			}
		});


		dataBinding.bind(document.getElementById('title'));

		console.log(data.title); // "foo"
		data.title = "Hello world"; // innerHTML for title is changed to 'Hello world';
		console.log(data.title); // "Hello world"
		document.getElementById('title').innerHTML = "Bar";
		console.log(data.title); // "Bar"
*/

dataBinding = function(config) {
	var data = config.data;
	var key = config.key;
	this.config = config;
	this.setter = config.setter;
	this.getter = config.getter;
	this.mode = config.mode;
	this.parentKey = config.parentKey ? config.parentKey : "";
	this.key = config.key;
	this.attributeFilter = config.attributeFilter;
	this.elements = [];
	var changeStack = [];
	var binding = this;
	var shadowValue;

	binding.resolveCounter = 0;

	if (!this.mode) {
		this.mode = "field";
	}
	if (!this.attributeFilter) {
		this.attributeFilter = [];
	}

	// If we already have a databinding on this data[key], re-use that one instead of creating a new one;
	if (data.hasOwnProperty("_bindings_") && data._bindings_[key]) {
		return data._bindings_[key];
	}

	var dereference = function(value) {
		return JSON.parse(JSON.stringify(value));
	};
	var isEqual = function(value1, value2) {
		return JSON.stringify(value1) == JSON.stringify(value2);
	};
	var setShadowValue = function(value) {
		shadowValue = value;
		if (typeof shadowValue === "object") {
			shadowValue = dereference(shadowValue);
		}
		monitorChildData(shadowValue);
	};
	var monitorChildData = function(data) {
		// Watch for changes in our child data, because these also need to register as changes in the databound data/elements;
		// This allows the use of simple data structures (1 key deep) as databound values and still resolve changes on a specific entry;
		if (typeof data === "object") {
			var monitor = function(data, key) {
				var myvalue = data[key];
				Object.defineProperty(data, key, {
					set : function(value) {
						myvalue = value;
						newValue = dereference(shadowValue);
						shadowValue = null;
						binding.set(newValue);
						binding.resolve();
					},
					get : function() {
						return myvalue;
					}
				});
			};

			for (var key in data) {
				monitor(data, key);
			}
		}

		// Override basic array functions in the databound data, if it is an array;
		// Allows the use of basic array functions and still resolve changes.
		if (data instanceof Array) {
			overrideArrayFunction = function(name) {
				Object.defineProperty(data, name, {
					value : function() {
						binding.resolve(); // make sure the shadowValue is in sync with the latest state;
						var result = Array.prototype[name].apply(shadowValue, arguments);
						newValue = dereference(shadowValue);
						shadowValue = null;
						binding.set(newValue);
						binding.resolve(); // and apply our array change;
						return result;
					}
				});
			};
			overrideArrayFunction("pop");
			overrideArrayFunction("push");
			overrideArrayFunction("shift");
			overrideArrayFunction("unshift");
			overrideArrayFunction("splice");
		}
	};
	var resumeListeners = function() {
		var i;
		for (i=0; i<binding.elements.length; i++) {
			if (!isEqual(binding.elements[i].getter(), shadowValue)) {
				// this element changed when we were not listening; play catch up;
				binding.set(binding.elements[i].getter());
			}
		}
		binding.resolve();
		for (i=0; i<binding.elements.length; i++) {
			if (!isEqual(binding.elements[i].getter(), shadowValue)) {
				console.log("Warning: Setters and getters for elements in this databinding are using differing data models.");
				binding.resolveCounter = 5;
			}
			binding.addListeners(binding.elements[i]);
		}
	};
	var pauseListeners = function() {
		for (var i=0; i<binding.elements.length; i++) {
			binding.removeListeners(binding.elements[i]); // Stop listening before we set new values to prevent looping;
		}
	};
	var resolverIsLooping = function() {
		// Check for resolve loops - 5 seems like a safe count. If we pass this point 5 times within the same stack execution, break the loop.
		binding.resolveCounter++;
		if (binding.resolveCounter > 5) {
			console.log("Warning: databinding resolve loop detected!");
			window.setTimeout(function() {
				binding.resolveCounter = 0;
			}, 300); // 300 is a guess; could be any other number. It needs to be long enough so that everyone can settle down before we start resolving again.
			return true;
		}
		return false;
	};
	var setElements = function(value) {
		for (var i=0; i<binding.elements.length; i++) {
			if (
				binding.mode == "list" || // if it is a list, we need to reset the values so that the bindings are setup properly.
				(!isEqual(binding.elements[i].getter(), shadowValue))
			) {
				binding.elements[i].setter(value);
			}
		}
	};
	var initBindings = function(data, key) {
		if (!data.hasOwnProperty("_bindings_")) {
			var bindings = {};

			Object.defineProperty(data, "_bindings_", {
				get : function() {
					return bindings;
				},
				set : function(value) {
					bindings[key] = binding;
				}
			});
		}
		data._bindings_[key] = binding;

		setShadowValue(data[key]);

		Object.defineProperty(data, key, { 
			set : function(value) {
				binding.set(value);
				binding.resolve();
			},
			get : function() {
				return shadowValue;
			}
		});
	};

	this.set = function (value) {
		changeStack.push(value);
		if (!this.resolveTimer) {
			this.resolveTimer = window.setTimeout(this.resolve, 100);
		}
	};

	this.get = function() {
		if (changeStack.length) {
			this.resolve();
		}
		return shadowValue;
	};

	this.resolve = function() {
		binding.resolveTimer = false;

		if (!changeStack.length) {
			return; // No changes to resolve;
		}
		var value = changeStack.pop(); // Only apply the last change;
		changeStack = [];

		if (isEqual(value, shadowValue)) {
			return; // The change is not actually a change, so no action needed;
		}

		if (resolverIsLooping()) {
			return; // The resolver is looping, yield to give everything time to settle down;
		}

		var oldValue = shadowValue;	// keep the old value for the custom resolver;
		setShadowValue(value);		// Update the shadowValue to the new value;
		pauseListeners();		// Stop listening while we set the new value in the elements, to prevent looping;
		setElements(value);		// Set the new value in all the databound elements;

		if (typeof binding.config.resolve === "function") {
			binding.config.resolve.call(binding, key, value, oldValue);
		}
		binding.resolveCounter--;
		window.setTimeout(resumeListeners, 5);
	};

	this.bind = function(element, config) {
		if (element.dataBinding) {
			element.dataBinding.unbind(element);
		}

		binding.elements.push(element);
		element.getter 		= (config && typeof config.getter === "function") ? config.getter : binding.getter;
		element.setter 		= (config && typeof config.setter === "function") ? config.setter : binding.setter;
		element.dataBinding 	= binding;

		element.setter(shadowValue);

		binding.addListeners(element);

		if (!binding.resolveTimer) {
			binding.resolveTimer = window.setTimeout(this.resolve, 100);
		}
	};

	this.rebind = function(element, config) {
		// Use this when a DOM node is cloned and the clone needs to be registered with the databinding, without setting its data.
		if (element.dataBinding) {
			element.dataBinding.unbind(element);
		}

		binding.elements.push(element);
		element.getter 		= (typeof config.getter === "function") ? config.getter : binding.getter;
		element.setter 		= (typeof config.setter === "function") ? config.setter : binding.setter;
		element.dataBinding 	= binding;

		binding.addListeners(element);

		if (!binding.resolveTimer) {
			binding.resolveTimer = window.setTimeout(this.resolve, 100);
		}
	};

	this.unbind = function(element) {
		if (binding.elements.indexOf(element) > -1) {
			binding.removeListeners(element);
			binding.elements.splice(binding.elements.indexOf(element), 1);
		}
	};

	initBindings(data, key);
	// Call the custom init function, if it is there;
	if (typeof binding.config.init === "function") {
		binding.config.init.call(binding);
	}
};

var fieldNodeRemovedHandler = function(evt) {
	if (!this.parentNode && this.dataBinding) {
		this.dataBinding.unbind(this);
	}
};

dataBinding.prototype.addListeners = function(element) {
	if (element.dataBinding) {
		element.dataBinding.removeListeners(element);
	}
	if (typeof element.mutationObserver === "undefined") {
		element.mutationObserver = new MutationObserver(this.handleMutation);
	}
	if (this.mode == "field") {
		element.mutationObserver.observe(element, {attributes: true});
		element.addEventListener("DOMSubtreeModified", this.handleEvent);
		element.addEventListener("DOMNodeRemoved", fieldNodeRemovedHandler);
		element.addEventListener("change", this.handleEvent);
	}
	if (this.mode == "list") {
		element.mutationObserver.observe(element, {attributes: true});
		element.addEventListener("DOMNodeRemoved", this.handleEvent);
		element.addEventListener("DOMNodeInserted", this.handleEvent);
	}
	element.addEventListener("databinding:valuechanged", this.handleEvent);
};

dataBinding.prototype.removeListeners = function(element) {
	if (this.mode == "field") {
		if (element.mutationObserver) {
			element.mutationObserver.disconnect();
		}
		element.removeEventListener("DOMNodeRemoved", fieldNodeRemovedHandler);
		element.removeEventListener("DOMSubtreeModified", this.handleEvent);
		element.removeEventListener("change", this.handleEvent);
	}
	if (this.mode == "list") {
		if (element.mutationObserver) {
			element.mutationObserver.disconnect();
		}
		element.removeEventListener("DOMNodeRemoved", this.handleEvent);
		element.removeEventListener("DOMNodeInserted", this.handleEvent);
	}
	element.removeEventListener("databinding:valuechanged", this.handleEvent);
};

dataBinding.prototype.handleMutation = function(event) {
	// FIXME: assuming that one set of mutation events always have the same target; this might not be the case;
	var target = event[0].target;
	if (!target.dataBinding) {
		return;
	}

	var handleMe = false;
	for (var i=0; i<event.length; i++) {
		if (target.dataBinding.attributeFilter.indexOf(event[i].attributeName) == -1) {
			handleMe = true; // only handle the event 
		}
	}

	if (handleMe) {
		var self = target.dataBinding;
		self.removeListeners(target);	// prevent possible looping, getter sometimes also triggers an attribute change;
		self.set(target.getter());
		self.addListeners(target);
	}
};			

dataBinding.prototype.handleEvent = function (event) {
	var target = event.currentTarget;
	var self = target.dataBinding;
	if (typeof self === 'undefined') {
		return;
	}
	if (self.mode === "list") {
		if (target != event.relatedNode) {
			return;
		}
	}

	switch (event.type) {
		case "databinding:valuechanged":
		case "change":
		case "DOMAttrModified":
		case "DOMNodeInserted":
		case "DOMCharacterDataModified":
		case "DOMSubtreeModified":
		case "DOMNodeRemoved":
			// Allow the browser to fix what it thinks needs to be fixed (node to be removed, cleaned etc) before setting the new data;
			self.removeListeners(target);
			self.set(target.getter());
			self.addListeners(target);

			window.setTimeout(function() {
				self.removeListeners(target);
				self.set(target.getter());
				self.addListeners(target);
			}, 1);
		break;
	}
};

// Housekeeping, remove references to deleted nodes
document.addEventListener("DOMNodeRemoved", function(evt) {
	var target = evt.srcElement;
	if (target.dataBinding) {
		target.dataBinding.unbind(target);
		delete target.dataBinding;
	}
});
