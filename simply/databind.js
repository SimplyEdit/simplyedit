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
	if (Array.isArray(data[key])) {
		if (this.mode == "field") {
			console.log("Warning: databinding started in field mode but array-type data given; Switching to list mode.");
		}
		this.mode = "list";
		this.config.mode = "list";
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
	this.setData = function(newdata) {
		data = newdata;
		initBindings(data, key);
	};

	var reconnectParentBindings = function(binding) {
		var parent;

		if (binding.config.data._parentBindings_) {
			parent = binding.config.data._parentBindings_[binding.key];
			while (parent && parent.get()[binding.key] == binding.get()) {
				binding = parent;
				parent = binding.config.data._parentBindings_? binding.config.data._parentBindings_[binding.key] : null;
				if (!parent) {
					if (binding.config.data._parentData_ && (binding.config.data._parentData_[binding.key] !== binding.get())) {
						binding.config.data._parentData_[binding.key] = binding.get();
					}
					for (var i in binding.config.data._parentBindings_) {
						parent = binding.config.data._parentBindings_[i];
						continue;
					}
				}
			}
		}
	};

	var setShadowValue = function(value) {
		var valueBindings;
		if (shadowValue && shadowValue._bindings_) {
			valueBindings = shadowValue._bindings_;
		}

		shadowValue = value;

		reconnectParentBindings(binding);

		if (valueBindings && (typeof shadowValue === "object")) {
			if (shadowValue && !shadowValue.hasOwnProperty("_bindings_")) {
				var bindings = {};

				Object.defineProperty(shadowValue, "_bindings_", {
					get : function() {
						return bindings;
					},
					set : function(value) {
						bindings[key] = binding;
					}
				});
			}

			var setRestoreTrigger = function(data, key, previousBinding) {
				var prevDescriptor = Object.getOwnPropertyDescriptor(previousBinding.config.data, key);
				var childTriggers = function(previousData) {
					return function(value) {
						if (typeof value === "undefined") {
							return;
						}
						if (previousData && previousData._bindings_) {
							for (var i in previousData._bindings_) {
								if (typeof value[i] === "undefined") {
									setRestoreTrigger(value, i, previousData._bindings_[i]);
									value._bindings_[i] = previousData._bindings_[i];
								} else {
									value._bindings_[i] = previousData._bindings_[i];
									value._bindings_[i].config.data = value;
									value._bindings_[i].set(value[i]);
								}
							}
						}
					};
				}(previousBinding.config.data[key]);

				previousBinding.config.data = data;
			//	binding.config.data = data;

				// binding.set(null);
				// delete data[key];
				var restoreBinding = function(value) {
					if (typeof value === "object" && !value.hasOwnProperty("_bindings_")) {
						var bindings = {};

						Object.defineProperty(value, "_bindings_", {
							get : function() {
								return bindings;
							},
							set : function(value) {
								bindings[key] = previousBinding;
							}
						});
					}
					childTriggers(value);
					data._bindings_[key].setData(data);
					data._bindings_[key].set(value);
					if (typeof prevDescriptor.get !== "function" && typeof prevDescriptor.set === "function") {
						prevDescriptor.set(value);
					}
				};

				Object.defineProperty(data, key, {
					set : restoreBinding,
					configurable : true
				});
			};

			for (var i in valueBindings) {
				if (typeof shadowValue[i] === "undefined") {
					if (typeof valueBindings[i].get() === "string") {
						valueBindings[i].set("");
					} else if (typeof valueBindings[i].get() === "object") {
						if (valueBindings[i].get() instanceof Array) {
							valueBindings[i].config.data[i] = [];
						} else {
							valueBindings[i].config.data[i] = {};
						}
					}

					setRestoreTrigger(shadowValue, i, valueBindings[i]);
				} else {
					valueBindings[i].set(shadowValue[i]);
					valueBindings[i].resolve(true);
				}
				shadowValue._bindings_[i] = valueBindings[i];
			}
		}

		if (typeof oldValue !== "undefined" && !isEqual(oldValue, shadowValue)) {
			binding.config.resolve.call(binding, key, dereference(shadowValue), dereference(oldValue));
		}
		//if (typeof shadowValue === "object") {
		//	shadowValue = dereference(shadowValue);
		//}
		monitorChildData(shadowValue);
	};
	var monitorChildData = function(data) {
		// Watch for changes in our child data, because these also need to register as changes in the databound data/elements;
		// This allows the use of simple data structures (1 key deep) as databound values and still resolve changes on a specific entry;
		var parentData = data;

		if (typeof data === "object") {
			var monitor = function(data, key) {
				if (!data.hasOwnProperty("_parentBindings_")) {
					var bindings = {};

					Object.defineProperty(data, "_parentBindings_", {
						get : function() {
							return bindings;
						},
						set : function(value) {
							bindings[key] = binding;
						}
					});
					Object.defineProperty(data, "_parentData_", {
						get : function() {
							return parentData;
						}
					});
				}
				data._parentBindings_[key] = binding;

				var myvalue = data[key];

				var renumber = function(key, value, parentBinding) {
					var oldparent, newparent;
					if (value && value._bindings_) {
						for (var subbinding in value._bindings_) {
							oldparent = value._bindings_[subbinding].parentKey;
							newparent = parentBinding.parentKey + parentBinding.key + "/" + key + "/";
							// console.log(oldparent + " => " + newparent);
							value._bindings_[subbinding].parentKey = newparent;
							if (value[subbinding] && value[subbinding].length) {
								for (var i=0; i<value[subbinding].length; i++) {
									renumber(i, value[subbinding][i], value._bindings_[subbinding]);
								}
							}
						}
					}
				};

				renumber(key, myvalue, binding);

				Object.defineProperty(data, key, {
					set : function(value) {
						myvalue = value;
						renumber(key, value, binding);

						if (parentData._bindings_ && parentData._bindings_[key]) {
							parentData._bindings_[key].set(value);
							parentData._bindings_[key].resolve();
						}

						// Marker is set by the array function, it will do the resolve after we're done.
						if (!binding.runningArrayFunction) {
							newValue = shadowValue;
							shadowValue = null;
							binding.set(newValue);
							binding.resolve();
						}
					},
					get : function() {
						if (parentData._bindings_ && parentData._bindings_[key]) {
							return parentData._bindings_[key].get();
						}
						return myvalue;
					}
				});
			};

			for (var key in data) {
				if (typeof data[key] !== "function") { // IE11 has a function 'includes' for arrays;
					monitor(data, key);
				}
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
						for (var i in shadowValue) {
							shadowValue[i] = shadowValue[i]; // this will force a renumber/reindex for the parentKeys;
						}
						binding.runningArrayFunction = false;

						//for (var j=0; j<binding.elements.length; j++) {
						//	binding.bind(binding.elements[j]);
						//}

						newValue = shadowValue;
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
		if (binding.elementTimer) {
			window.clearTimeout(binding.elementTimer);
		}
		for (var i=0; i<binding.elements.length; i++) {
			if (
				// binding.mode == "list" || // if it is a list, we need to reset the values so that the bindings are setup properly.
				// FIXME: Always setting a list element will make a loop - find a better way to setup the bindings;
				(!isEqual(binding.elements[i].getter(), shadowValue))
			) {
				binding.pauseListeners(binding.elements[i]);
				binding.elements[i].setter(shadowValue);
				binding.resumeListeners(binding.elements[i]);
			}
			fireEvent(binding.elements[i], "elementresolved");
		}
		if (data._parentBindings_ && data._parentBindings_[key] && data._parentBindings_[key] !== binding) {
			data[key] = shadowValue; 
		}
		if (typeof binding.config.resolve === "function") {
			if (!isEqual(oldValue, shadowValue)) {
				oldValue = dereference(shadowValue);
			}
		}
		fireEvent(document, "resolved");
	};

	var initBindings = function(data, key) {
		if (typeof data != "object") {
			console.log("Attempted to bind on non-object data for " + key);
			return;
		}

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

		setShadowValue(data[key]);
		oldValue = dereference(data[key]);

		data._bindings_[key] = binding;
		if (binding.mode == "list") {
			if (data[key] === null) {
				data[key] = [];
			}
		}

		Object.defineProperty(data, key, {
			set : function(value) {
				if (!isEqual(value, shadowValue)) {
					binding.set(value);
					binding.resolve(true);
				}
				if (data._parentBindings_ && data._parentBindings_[key]) {
					if (data._parentBindings_[key].get()[key] !== value) {
						data._parentBindings_[key].get()[key] = value;
						data._parentBindings_[key].resolve(true);
					}
				}
			},
			get : function() {
				return shadowValue;
			},
			enumerable: true
		});
	};
	var fireEvent = function(targetNode, eventName, detail) {
		var event = document.createEvent('CustomEvent');
		if (event && event.initCustomEvent) {
			event.initCustomEvent('databind:' + eventName, true, true, detail);
		} else {
			event = document.createEvent('Event');
			event.initEvent('databind:' + eventName, true, true);
			event.detail = detail;
		}
		return targetNode.dispatchEvent(event);
	};
	this.fireEvent = fireEvent;

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

		if (binding.config.data._simplyConverted) {
			// Update the reference in the parent to the new value as well;
			binding.config.data._simplyConvertedParent[binding.config.data._simplyConvertedParent.indexOf(binding.config.data)] = value;
		}

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
		element.dataBindingPaused = 0;

		element.setter(shadowValue);
		var elementValue = element.getter();
		window.setTimeout(function() { // defer adding listeners until the run is done, this is a big performance improvement;
			binding.addListeners(element);
			// find out if our value / element changed since we bound, if so, update;
			if (!isEqual(element.getter(), shadowValue)) {
				changeStack.push(shadowValue);
			}
			if (!isEqual(element.getter(), elementValue)) {
				changeStack.push(element.getter());
			}
		}, 0);
		if (!binding.resolveTimer) {
			binding.resolveTimer = window.setTimeout(this.resolve, 100);
		}
		binding.cleanupBindings();
	};

	this.rebind = function(element, config) {
		// Use this when a DOM node is cloned and the clone needs to be registered with the databinding, without setting its data.
		if (element.dataBinding) {
			element.dataBinding.unbind(element);
		}
		binding.elements.push(element);
		element.getter 		= (config && typeof config.getter === "function") ? config.getter : binding.getter;
		element.setter 		= (config && typeof config.setter === "function") ? config.setter : binding.setter;
		element.dataBinding 	= binding;
		element.dataBindingPaused = 0;

		var elementValue = element.getter();
		window.setTimeout(function() { // defer adding listeners until the run is done, this is a big performance improvement;
			binding.addListeners(element);
			// find out if our value / element changed since we bound, if so, update;
			if (!isEqual(element.getter(), shadowValue)) {
				changeStack.push(shadowValue);
			}
			if (!isEqual(element.getter(), elementValue)) {
				changeStack.push(element.getter());
			}
		}, 0);

		if (!binding.resolveTimer) {
			binding.resolveTimer = window.setTimeout(this.resolve, 100);
		}
		binding.cleanupBindings();
	};

	this.unbind = function(element) {
		if (binding.elements.indexOf(element) > -1) {
			binding.removeListeners(element);
			binding.elements.splice(binding.elements.indexOf(element), 1);
		}
	};

	this.cleanupBindings = function() {
		if (binding.elements.length < 2) {
			return;
		}

		var inDocument = function(element) {
			if (document.contains && document.contains(element)) {
				return true;
			}
			var parent = element.parentNode;
			while (parent) {
				if (parent === document) {
					return true;
				}
				if (parent.nodeType === document.DOCUMENT_FRAGMENT_NODE) {
					if (parent.host && inDocument(parent.host)) {
						return true;
					}
				}
				parent = parent.parentNode;
			}
			return false;
		};

		binding.elements.forEach(function(element) {
			if (!inDocument(element)) {
				element.markedForRemoval = true;
			} else {
				element.markedForRemoval = false;
			}
		});

		if (binding.cleanupTimer) {
			clearTimeout(binding.cleanupTimer);
		}

		binding.cleanupTimer = window.setTimeout(function() {
			binding.elements.filter(function(element) {
				if (element.markedForRemoval && !inDocument(element)) {
					element.dataBinding.unbind(element);
					return false;
				}
				element.markedForRemoval = false;
				return true;
			});
		}, 1000); // If after 1 second the element is still not in the dom, remove the binding;
	};

	initBindings(data, key);
	// Call the custom init function, if it is there;
	if (typeof binding.config.init === "function") {
		binding.config.init.call(binding);
	}

	if (binding.mode == "list") {
		document.addEventListener("databind:resolved", function() {
			if (!binding.skipOldValueUpdate) {
				oldValue = dereference(binding.get());
			}
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
		if (typeof MutationObserver === "function") {
			element.mutationObserver = new MutationObserver(this.handleAllMutations);
		}
	}
	if (this.mode == "field") {
		if (element.mutationObserver) {
			element.mutationObserver.observe(element, {attributes: true, childList: true, subtree: true, characterData: true});
		} else {
			element.addEventListener("DOMSubtreeModified", this.handleEvent);
			element.addEventListener("DOMNodeRemoved", fieldNodeRemovedHandler);
		}
		element.addEventListener("change", this.handleEvent);
	}
	if (this.mode == "list") {
		if (element.mutationObserver) {
			element.mutationObserver.observe(element, {attributes: true, childList: true, substree: true, characterData: true});
		} else {
			element.addEventListener("DOMNodeRemoved", this.handleEvent);
			element.addEventListener("DOMNodeInserted", this.handleEvent);
		}
	}
	element.addEventListener("databinding:valuechanged", this.handleEvent);

	element.addEventListener("databinding:pause", function() {
		this.dataBinding.pauseListeners(this);
	});
	element.addEventListener("databinding:resume", function() {
		this.dataBinding.resumeListeners(this);
	});
};
dataBinding.prototype.resumeListeners = function(element) {
	element.dataBindingPaused--;
	if (element.dataBindingPaused < 0) {
		console.log("Warning: resume called of non-paused databinding");
		element.dataBindingPaused = 0;
	}
};
dataBinding.prototype.pauseListeners = function(element) {
	element.dataBindingPaused++;
};
dataBinding.prototype.removeListeners = function(element) {
	if (this.mode == "field") {
		if (element.mutationObserver) {
			element.mutationObserver.disconnect();
		} else {
			element.removeEventListener("DOMSubtreeModified", this.handleEvent);
			element.removeEventListener("DOMNodeRemoved", fieldNodeRemovedHandler);
		}
		element.removeEventListener("change", this.handleEvent);
	}
	if (this.mode == "list") {
		if (element.mutationObserver) {
			element.mutationObserver.disconnect();
		} else {
			element.removeEventListener("DOMNodeRemoved", this.handleEvent);
			element.removeEventListener("DOMNodeInserted", this.handleEvent);
		}
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
		event.stopPropagation();
		return;
	}
	if (self.mode === "list") {
		if (event.relatedNode && (target != event.relatedNode)) {
			return;
		}
	}

	var i, data, items;
	if (self.mode === "list" && event.type == "DOMNodeRemoved") {
		if (event.target.nodeType != document.ELEMENT_NODE) {
			return;
		}
		// find the index of the removed target node;
		items = this.querySelectorAll(":scope > [data-simply-list-item]");
		for (i=0; i<items.length; i++) {
			if (items[i] == event.target) {
				data = target.dataBinding.get();
				items[i].simplyData = data.splice(i, 1)[0];
				return;
			}
		}
	}

	if (self.mode === "list" && event.type == "DOMNodeInserted") {
		// find the index of the inserted target node;
		items = this.querySelectorAll(":scope > [data-simply-list-item]");
		for (i=0; i<items.length; i++) {
			if (items[i] == event.target) {
				if (items[i].simplyData) {
					data = target.dataBinding.get();
					data.splice(i, 0, items[i].simplyData);
					return;
				}
			}
		}
	}

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
	self.fireEvent(target, "domchanged");
};

dataBinding.prototype.handleAllMutations = function (records, observer) {
	let target = records[0].target
	while(target && !target.dataBinding) {
		target = target.parentElement
	}
	if (!target) {
		console.error('no databinding target for mutation record', records[0])
	}
	let self = target.dataBinding
	if (self.paused) {
		return;
	}
	if (target.dataBindingPaused || target.dataBinding.paused) {
		return;
	}
	let handleAttributes = false;
	let handleList = false;
	for (const record of records) {
		switch(record.type) {
			case 'attributes':
				if (target.dataBinding.attributeFilter.indexOf(record.attributeName) == -1) {
					handleAttributes = true; // only handle the event 
				}
			break
			case 'childList':
				if (record.removedNodes?.length && self.mode === 'list') {
					if (record.target.nodeType != document.ELEMENT_NODE) {
						break;
					}
					// FIXME: this no longer works, since the target has already been removed
					// use previousSibling or nextSibling instead (note these can be text nodes)
					let removedIndex = null
					let previousSiblingNode = record.previousSibling;
					if (previousSiblingNode && previousSiblingNode.nodeType!=Node.ELEMENT_NODE) {
						previousSiblingNode = previousSiblingNode.previousElementSibling;
					}
					let items = target.querySelectorAll(":scope > [data-simply-list-item]");
					if (!previousSiblingNode) {
						removedIndex = 0;
						handleList = true;
					} else {
						// find the index of the removed target node;
						for (i=0; i<items.length; i++) {
							if (items[i] == previousSiblingNode) {
								removedIndex = i+1;
								handleList = true;
								break;
							}
						}
					}
					if (removedIndex!==null) {
						data = target.dataBinding.get();
						data.splice(removedIndex, 1)
					}
				}
				if (record.addedNodes?.length) {
					// find the index of the inserted target node;
					items = target.querySelectorAll(":scope > [data-simply-list-item]");
					for (i=0; i<items.length; i++) {
						if (items[i] == record.target) {
							if (items[i].simplyData) {
								data = target.dataBinding.get();
								data.splice(i, 0, items[i].simplyData);
								handleList = true;
								break;
							}
						}
					}
				}
			break
			case 'characterData':
			break
		}
	}
	self.fireEvent(target, "domchanged");
};


// Housekeeping, remove references to deleted nodes
if (typeof MutationObserver != 'undefined') {
	const houseKeeping = new MutationObserver(function(records, observer) {
		for (const record of records) {
			if (record.removedNodes) {
				window.setTimeout(function() {
					for (const removedNode of record.removedNodes) {
						if (!removedNode.parentNode && removedNode.dataBinding) {
							removedNode.dataBinding.unbind(removedNode);
							delete removedNode.dataBinding;
						}
					}
				}, 1000);
			}
		}
	});
	houseKeeping.observe(document.body, {childList: true, subtree: true})
} else {
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
}

// polyfill to add :scope selector for IE
(function() {
  if (!HTMLElement.prototype.querySelectorAll) {
    throw new Error('rootedQuerySelectorAll: This polyfill can only be used with browsers that support querySelectorAll');
  }

  // A temporary element to query against for elements not currently in the DOM
  // We'll also use this element to test for :scope support
  var container = document.createElement('div');

  // Check if the browser supports :scope
  try {
    // Browser supports :scope, do nothing
    container.querySelectorAll(':scope *');
  }
  catch (e) {
    // Match usage of scope
    var scopeRE = /\s*:scope/gi;

    // Overrides
    function overrideNodeMethod(prototype, methodName) {
      // Store the old method for use later
      var oldMethod = prototype[methodName];

      // Override the method
      prototype[methodName] = function(query) {
        var nodeList,
            gaveId = false,
            gaveContainer = false;

        if (query.match(scopeRE)) {
          if (!this.parentNode) {
            // Add to temporary container
            container.appendChild(this);
            gaveContainer = true;
          }

          parentNode = this.parentNode;

          if (!this.id) {
            // Give temporary ID
            this.id = 'rootedQuerySelector_id_'+(new Date()).getTime();
            gaveId = true;
          }

          // Remove :scope
          query = query.replace(scopeRE, '#' + this.id + " ");

          // Find elements against parent node
          // nodeList = oldMethod.call(parentNode, '#'+this.id+' '+query);
          nodeList = parentNode[methodName](query);
          // Reset the ID
          if (gaveId) {
            this.id = '';
          }

          // Remove from temporary container
          if (gaveContainer) {
            container.removeChild(this);
          }

          return nodeList;
        }
        else {
          // No immediate child selector used
          return oldMethod.call(this, query);
        }
      };
    }

    // Browser doesn't support :scope, add polyfill
    overrideNodeMethod(HTMLElement.prototype, 'querySelector');
    overrideNodeMethod(HTMLElement.prototype, 'querySelectorAll');
  }
}());
