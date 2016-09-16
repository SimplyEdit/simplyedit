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

	var oldValue;

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
		if (typeof value==="undefined") {
			return value;
		}
		return JSON.parse(JSON.stringify(value));
	};
	var isEqual = function(value1, value2) {
		return JSON.stringify(value1) == JSON.stringify(value2);
	};
	var setShadowValue = function(value) {
		shadowValue = value;
		//if (typeof shadowValue === "object") {
		//	shadowValue = dereference(shadowValue);
		//}
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
						if (!binding.runningArrayFunction) {
							newValue = dereference(shadowValue);
							shadowValue = null;
							binding.set(newValue);
							binding.resolve();
						}
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
				if (data.hasOwnProperty(name)) {
					return; // we already did this;
				}
				Object.defineProperty(data, name, {
					value : function() {
						binding.resolve(); // make sure the shadowValue is in sync with the latest state;

						// Add a marker so that array value set does not trigger resolving, we will resolve after we're done.
						binding.runningArrayFunction = true;
						var result = Array.prototype[name].apply(shadowValue, arguments);
						binding.runningArrayFunction = false;
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
	var setElements = function() {
		for (var i=0; i<binding.elements.length; i++) {
			if (
				binding.mode == "list" || // if it is a list, we need to reset the values so that the bindings are setup properly.
				(!isEqual(binding.elements[i].getter(), shadowValue))
			) {
				binding.pauseListeners(binding.elements[i]);
				binding.elements[i].setter(shadowValue);
				binding.resumeListeners(binding.elements[i]);
			}
		}

		if (typeof binding.config.resolve === "function") {
			if (!isEqual(oldValue, shadowValue)) {
				binding.config.resolve.call(binding, key, dereference(shadowValue), dereference(oldValue));
				oldValue = shadowValue;
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
		oldValue = dereference(data[key]);

		Object.defineProperty(data, key, { 
			set : function(value) {
				binding.set(value);
				binding.resolve(true);
			},
			get : function() {
				return shadowValue;
			}
		});
	};

	this.set = function (value) {
		changeStack.push(value);
		this.resolve();
	};

	this.get = function() {
		if (changeStack.length) {
			this.resolve();
		}
		return shadowValue;
	};

	this.resolve = function(instant) {
		if (!changeStack.length) {
			if (instant) {
				setElements();
			}
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

		setShadowValue(value);		// Update the shadowValue to the new value;

		if (instant) {
			setElements();
		} else {
			if (binding.elementTimer) {
				window.clearTimeout(binding.elementTimer);
			}
			binding.elementTimer = window.setTimeout(function() {
				setElements();	// Set the new value in all the databound elements;
			}, 100);
		}

		binding.resolveCounter--;
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

	if (binding.mode == "list") {
		// FIXME: This should be an event we fire ourselves;
		document.addEventListener("simply-data-changed", function() {
			oldValue = dereference(binding.get());
		});
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
	element.dataBindingPaused = false;
};
dataBinding.prototype.resumeListeners = function(element) {
	element.dataBindingPaused = false;
};
dataBinding.prototype.pauseListeners = function(element) {
	element.dataBindingPaused = true;
};
dataBinding.prototype.removeListeners = function(element) {
	if (this.mode == "field") {
		if (element.mutationObserver) {
			element.mutationObserver.disconnect();
		}
		element.removeEventListener("DOMSubtreeModified", this.handleEvent);
		element.removeEventListener("DOMNodeRemoved", fieldNodeRemovedHandler);
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
	if (target.dataBindingPaused) {
		return;
	}

	if (target.dataBinding.paused) {
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
		window.setTimeout(function() {
			self.pauseListeners(target);	// prevent possible looping, getter sometimes also triggers an attribute change;
			self.set(target.getter());
			self.resumeListeners(target);
		}, 0); // allow the rest of the mutation event to occur;
	}
};			

dataBinding.prototype.handleEvent = function (event) {
	var target = event.currentTarget;
	var self = target.dataBinding;
	if (typeof self === 'undefined') {
		return;
	}
	if (self.paused) {
		return;
	}
	if (target.dataBindingPaused) {
		return;
	}
	if (self.mode === "list") {
		if (target != event.relatedNode) {
	//		return;
		}
	}

	var i, data, items;
	if (self.mode === "list" && event.type == "DOMNodeRemoved") {
		// find the index of the removed target node;
		items = this.querySelectorAll(":scope > [data-simply-list-item]");
//		window.handlingDataBinding = true;
//		window.setTimeout(function() {
//			window.handlingDataBinding = false;
//		}, 0);
		for (i=0; i<items.length; i++) {
			if (items[i] == event.target) {
				// console.log("removing node " + i);
				// console.log(editor.list.get(event.target));
				data = target.dataBinding.get();
				items[i].simplyData = data.splice(i, 1)[0];
				self.set(JSON.parse(JSON.stringify(data)));
				self.resolve();
				return;
			}
		}
	}

	if (self.mode === "list" && event.type == "DOMNodeInserted") {
		// find the index of the inserted target node;
		items = this.querySelectorAll(":scope > [data-simply-list-item]");
//		window.handlingDataBinding = true;
//		window.setTimeout(function() {
//			window.handlingDataBinding = false;
//		}, 0);
		for (i=0; i<items.length; i++) {
			if (items[i] == event.target) {
				// console.log("inserted node " + i);
				if (items[i].simplyData) {
					// console.log("have saved data");

					data = target.dataBinding.get();
					data.splice(i, 0, items[i].simplyData);
					self.set(JSON.parse(JSON.stringify(data)));
					self.resolve();
					return;
				}
			}
		}
	}

//	if (window.handlingDataBinding) {
//		return;
//	}

//	if ((event.type == "DOMNodeRemoved") && !window.handlingDataBinding) {
//		window.handlingDataBinding = true;
//	}
//	if ((event.type == "DOMNodeInserted") && !window.handlingDataBinding) {
//		window.handlingDataBinding = true;
//	}

	switch (event.type) {
		case "DOMCharacterDataModified":
		case "databinding:valuechanged":
		case "change":
		case "DOMAttrModified":
		case "DOMNodeInserted":
		case "DOMSubtreeModified":
		case "DOMNodeRemoved":
			// Allow the browser to fix what it thinks needs to be fixed (node to be removed, cleaned etc) before setting the new data;

			// there are needed to keep the focus in an element while typing;
			self.pauseListeners(target);
			self.set(target.getter());
			self.resumeListeners(target);

			// these are needed to update after the browser is done doing its thing;
			window.setTimeout(function() {
				self.pauseListeners(target);
				self.set(target.getter());
				self.resumeListeners(target);
			}, 1); // allow the rest of the mutation event to occur;
		break;
	}

//	window.setTimeout(function() {
//		window.handlingDataBinding = false;
//	}, 0);
};

// Housekeeping, remove references to deleted nodes
document.addEventListener("DOMNodeRemoved", function(evt) {
	var target = evt.target;
	if (target.nodeType != document.ELEMENT_NODE) { // We don't care about removed text nodes;
		return;
	}
	if (!target.dataBinding) { // nor any element that doesn't have a databinding;
		return;
	}
	window.setTimeout(function() { // chrome sometimes 'helpfully' removes the element and then inserts it back, probably as a rendering optimalization. We're fine cleaning up in a bit, if still needed.
		if (!target.parentNode && target.dataBinding) {
			target.dataBinding.unbind(target);
			delete target.dataBinding;
		}
	}, 1000);
});
