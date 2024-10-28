(function(global) {
	var dataBinding = function(dataParent, path) {
                if (dataParent.hasOwnProperty("_bindings_") && dataParent._bindings_[path]) {
                        return dataParent._bindings_[path];
                }

		var self = this;
		
		var setup = function(dataParent, path) {
			path = "" + path;
			/*
				resolve binding to field.subfield.key, adding databindings along the data path;
			*/
			var keys = path.split(".");
			var key  = keys.pop();
			var parentBinding;		
			var currentParent = dataParent;
			keys.forEach(function(parentKey) {
				if (!currentParent[parentKey]) {
					currentParent[parentKey] = {};
				}
				parentBinding = simply.databind.create(currentParent, parentKey);
				currentParent = currentParent[parentKey];
			});
			if (!currentParent[key]) {
				currentParent[key] = undefined;
				// if twoWay -> set value to current element value (getter?) -> initialize later (on bind) if undefined
			}
//			return { parentBinding: parentBinding, dataParent: dataParent, key: key};
/* oude code hieronder */

			self.parentBinding = parentBinding; //setup(dataParent, key);
			self.dataParent = currentParent;
			self.key = key;
			self.elements = [];
			self.changeStack = [];

			registerBinding(self.dataParent, self.key);
		};

		var addShadowValue = function() {
			if (!self.hasOwnProperty("shadowValue")) {
				var shadowValue;
				Object.defineProperty(self, "shadowValue", {
					get : function() {
						return shadowValue;
					},
					set : function(value) {
						if (isEqual(shadowValue, value)) {
							return;
						}

						var previousValue = shadowValue;
						shadowValue = value;

						if (shadowValue instanceof Array) {
							overrideArrayFunctions(shadowValue);
						}
						if (typeof shadowValue === "object") {
							monitorChildData(shadowValue);
						}

						if (previousValue && shadowValue) {
							transferBindings(previousValue, shadowValue);
						}
					}
				});
			}
		};

		var transferBindings = function(oldValue, newValue) {
			if (!oldValue._bindings_) {
				return;
			}
			var oldBindings = oldValue._bindings_;
			var newBindings = newValue._bindings_;
			for (var key in oldBindings) {
				if (newBindings && newBindings[key]) {
					transferBoundElements(oldBindings[key], newBindings[key]);
				} else {
					setReconnectTrigger(newValue, key, oldBindings[key]);
				}
			}
		};

		var transferBoundElements = function(oldBinding, newBinding) {
			oldBinding.elements.forEach(function(element) {
				if (element.listItemDataBinding && (element.listItemDataBinding.binding === oldBinding)) {
					var getter = element.listItemDataBinding.getter;
					var setter = element.listItemDataBinding.setter;
					oldBinding.unbind(element);
					newBinding.bind(element, getter, setter);
				} else if (element.dataBinding && (element.dataBinding.binding === oldBinding)) {
					if (oldBinding.parentBinding && oldBinding.parentBinding.key == -1) {
						// when the key is -1, the element was removed so no need to worry about it;
						return;
					}
					var getter = element.dataBinding.getter;
					var setter = element.dataBinding.setter;
					oldBinding.unbind(element);
					newBinding.bind(element, getter, setter);
				}
			});
		};

		var setReconnectTrigger = function(dataParent, key, previousBinding) {
			var reconnectChildren = function(value, previousData) {
				var previousDescriptors = Object.getOwnPropertyDescriptors(previousData);
				for (var i in previousDescriptors) {
					if (typeof previousDescriptors[i].get !== "function" && typeof previousDescriptors[i].set === "function") {
						var newBinding = previousDescriptors[i].set({}); // set it just to fetch the previous binding, so we can add a reconnect trigger for it;
						setReconnectTrigger(value, i, newBinding);
					}
				}
				if (typeof value === "undefined") {
					return;
				}
				if (previousData && previousData._bindings_) {
					for (var i in previousData._bindings_) {
						if (typeof value[i] === "undefined") {
							setReconnectTrigger(value, i, previousData._bindings_[i]);
						} else {
							// there is no databinding on the new value yet - add it and transfer the bindings/elements;
							var newBinding = new dataBinding(value, i);
							reconnectChildren(value[i], previousData[i]);
							transferBindings(previousData[i], value[i]);
							if (newBinding) {
								transferBoundElements(previousData._bindings_[i], newBinding);
							}
						}
					}
				}
			};

			var reconnectBinding = function(value) {
				if (typeof value !== 'undefined') {
					newBinding = new dataBinding(dataParent, key);
					reconnectChildren(value, previousBinding.shadowValue);
					dataParent[key] = value;
					transferBindings(previousBinding.shadowValue, value);
					transferBoundElements(previousBinding, newBinding);
					return newBinding;
				}
			};
			Object.defineProperty(dataParent, key, {
				set : reconnectBinding,
				configurable: true
			});
		};

		var addParentKey = function() {
			if (!self.hasOwnProperty("parentKey")) {
				Object.defineProperty(self, "parentKey", {
					get : function() {
						var parentKeys = [];

						var binding = self.parentBinding;
						while(binding) {
							parentKeys.unshift(binding.key);
							binding = binding.parentBinding;
						}

						parentKeys.unshift(""); // root node
						parentKeys.push(""); // end node

						return parentKeys.join("/"); //TODO: SWITCH TO '.' 
					}
				});
			}
		};
		
		var addPath = function() {
			if (!self.hasOwnProperty("path")) {
				Object.defineProperty(self, "path", {
					get : function() {
						var parentKeys = [];

						var binding = self.parentBinding;
						while(binding) {
							parentKeys.unshift(binding.key);
							binding = binding.parentBinding;
						}

						parentKeys.unshift(""); // root node
						parentKeys.push(self.key); // end node

						return parentKeys.join("/"); //TODO: switch to '.'
					}
				});
			}
		};

		var addBindings = function(dataParent) {
			if (!dataParent.hasOwnProperty("_bindings_")) {
				var bindings = {};
				Object.defineProperty(dataParent, "_bindings_", {
					get : function() {
						return bindings;
					}
				});
			}
		};

		var registerBinding = function(dataParent, key) {

			addShadowValue();			
			self.shadowValue = dataParent[key];

			addParentKey();

			addPath();

			addBindings(dataParent);
			dataParent._bindings_[key] = self;

			Object.defineProperty(dataParent, key, {
				set : function(value) {
					self.set(value, self);
					// FIXME: run upwards on parentBindings;
				},
				get : function() {
					return self.shadowValue;
				},
				enumerable: true
			});
		};

		var overrideArrayFunction = function(shadowValue, name) {
			if (shadowValue.hasOwnProperty(name)) {
				return; // we already did this;
			}
			Object.defineProperty(shadowValue, name, {
				value : function() {
					self.resolve(); // make sure the shadowValue is in sync with the latest state;
					var result = Array.prototype[name].apply(shadowValue, arguments);


					// for (var i in shadowValue) {
					// 	shadowValue[i] = shadowValue[i]; // this will force a renumber/reindex for the parentKeys;
					// }

					self.set(shadowValue, self);

					monitorChildData(shadowValue); // we might have new children that we need to watch as well;
					return result;
				}
			});
		};

		var overrideArrayFunctions = function(shadowValue) {
			['pop','push','shift','unshift','splice'].forEach(function(fn) {
				overrideArrayFunction(shadowValue, fn);
			});
		};

		var monitorChildData = function(shadowValue) {
			var monitor = function(shadowValue, key) {
				var childBinding = new dataBinding(shadowValue, key);
				if (!childBinding.parentBinding) {
					childBinding.parentBinding = self;
				}
			};

			for (var key in shadowValue) {
				monitor(shadowValue, key);
			}
		};
		
/*
		var info = setup(dataParent, path);
console.log(info);
		this.parentBinding = info.parentbinding; //setup(dataParent, key);
		this.dataParent = info.dataParent;
		this.key = info.key;
		this.elements = [];
		this.elementIndex = new WeakMap();
		this.changeStack = [];

		registerBinding(this.dataParent, this.key);
*/
		setup(dataParent, path);
	};

	dataBinding.prototype.bind = function(element, getter, setter) {
		var index = this.elements.push(element);

		// change this to non enumerable property
		var elementBinding = {
			setter : setter,
			getter : getter,
			binding : this,
			observer: null,
			observerPaused: 0
		};
		if (this.dataParent instanceof Array) {
			if (element.listItemDataBinding) {
				element.listItemDataBinding.binding.unbind(element);
			}
			element.listItemDataBinding = elementBinding;
		} else {
			if (element.dataBinding) {
				element.dataBinding.binding.unbind(element);
			}
			element.dataBinding = elementBinding;
		}
		if (typeof this.shadowValue === 'undefined') {
			this.set(getter(element), element);
		} else {
			setter(element, this.shadowValue);
		}
		this.addListeners(element);
	};

	dataBinding.prototype.bindOneWay = function(element, setter) {
		if (element.dataBinding) {
			element.dataBinding.binding.unbind(element);
		}
		var index = this.elements.push(element);
		element.dataBinding = {
			setter : setter,
			binding : this
		};
		if (typeof this.shadowValue !== 'undefined') {
			setter(element, this.shadowValue); // or try to set an empty value?
		}
	};

	dataBinding.prototype.set = function(value, source) {
		// using a changeStack here for debugging - if different pieces of code
		// change a value within one resolve cycle, this allows you to see 
		// what caused this and if your change was actually registered
		this.changeStack.push({value: value, source: source});
		this.resolve(); // must run immediately or this.get will return old values

		// update the parentBindings to reconnect to it, in case we got lost
		this.updateParent(value, source);
	};

	dataBinding.prototype.updateParent = function(value, source) {
                if (this.parentBinding) {
                        if (this.parentBinding.dataParent[this.parentBinding.key] !== this.dataParent) {
                                this.parentBinding.dataParent[this.parentBinding.key][this.key] = value;
			}
                        this.parentBinding.updateParent(this.dataParent, source);
                }
	};

	dataBinding.prototype.get = function() {
		return this.shadowValue;
	};

	dataBinding.prototype.resolve = function() {
		var self = this;
		if (this.resolveTimer) {
			clearTimeout(this.resolveTimer);
		}
		if (!this.changeStack.length) {
			return;
		}
		// we only need the last change
		// stack is useful for debugging purposes only
		var change = this.changeStack.pop();
		this.changeStack = [];
		
		var oldValue = this.shadowValue;
		this.shadowValue = change.value;
		var newValue = this.shadowValue;

		// event / callback voor wijziging in data zelf hier toevoegen
		// of in updateElements als je throttle wil hebben.
		self.updateElements(change);
		this.fireEvent("databind:resolved", document, {dataBinding: this, arguments:{oldValue: oldValue, newValue: newValue}});
	};
	dataBinding.prototype.getElementBinding = function(element) {
		if (element.dataBinding && (element.dataBinding.binding === this)) {
			return element.dataBinding;
		} else if (element.listItemDataBinding && (element.listItemDataBinding.binding === this)) {
			return element.listItemDataBinding;
		}
	};
	dataBinding.prototype.updateElement = function(element) {
		var elementBinding = this.getElementBinding(element);
		if (!elementBinding) {
			return;
		}
		elementBinding.idleCallback = false;
		this.pauseListeners(element);
		elementBinding.setter(element, this.get());
		this.resumeListeners(element);
		this.fireEvent("databind:elementresolved", element);
	};

	dataBinding.prototype.updateElements = function(change) {
		var isElementXPercentInViewport = function(el, percentVisible) {
			var rect = el.getBoundingClientRect();
			var windowHeight = (window.innerHeight || document.documentElement.clientHeight);

			return !(
			  Math.floor(100 - (((rect.top >= 0 ? 0 : rect.top) / +-(rect.height / 1)) * 100)) < percentVisible ||
			  Math.floor(100 - ((rect.bottom - windowHeight) / rect.height) * 100) < percentVisible
			)
		};

		var visibilityPercentage = function(el) {
			var rect = el.getBoundingClientRect();
			var windowHeight = (window.innerHeight || document.documentElement.clientHeight);

			return windowHeight / Math.min(
			  Math.abs(Math.floor(100 - (((rect.top >= 0 ? 0 : rect.top) / +-(rect.height / 1)) * 100))),
			  Math.abs(Math.floor(100 - ((rect.bottom - windowHeight) / rect.height) * 100))
			);
		};

		var self = this;
		this.elements.forEach(function(element, index) {
			if (change.source != element) {
				var elementBinding = self.getElementBinding(element);
				if (!elementBinding) {
					return;
				}

				if (elementBinding.idleCallback) {
					return; // 
				}

				if (isElementXPercentInViewport(element, 50)) {
					self.updateElement(element);
				} else {
					if (elementBinding.idleCallback) {
						cancelIdleCallback(elementBinding.idleCallback);
					};
					elementBinding.idleCallback = requestIdleCallback(function() {
						self.updateElement(element);
					}, {timeout: 10 * parseInt(visibilityPercentage(element) * 50)}); 
					// spread out the timeout for the elements so they don't clog the browser because they update all at once.
					// elements that are closer to be on screen are done before the elements that are far away.
				}
			}
		});

		if (!self.handleScreenUpdate) {
			self.handleScreenUpdate = function() {
				self.elements.forEach(function(element, index) {
					var elementBinding = self.getElementBinding(element);
					if (!elementBinding) {
						return;
					}
					if (elementBinding.idleCallback && isElementXPercentInViewport(element, 50)) {
						console.log("updating element that has idle callback and is now in view");
						cancelIdleCallback(elementBinding.idleCallback);
						self.updateElement(element);
					}
				});
			};
		}

		window.removeEventListener("scroll", self.handleScreenUpdate);
		window.addEventListener("scroll", self.handleScreenUpdate);
	};

	dataBinding.prototype.unbind = function(element) {
		// change elements to Set()
		if (this.elements.indexOf(element) > -1) {
			this.removeListeners(element);
			this.elements.splice(this.elements.indexOf(element), 1);
			if (element.dataBinding && (element.dataBinding.binding === this)) {
				delete element.dataBinding;
			} else if (element.listItemDataBinding && (element.listItemDataBinding.binding === this)) {
				delete element.listItemDataBinding;
			}
			return true;
		}
		return false;
	};

	var isEqual = function(data1, data2) {
		return JSON.stringify(data1) == JSON.stringify(data2);
	};
	dataBinding.prototype.updateFrom = function(element) {
		if (element.dataBinding) {
			elementValue = element.dataBinding.getter(element);
			if (!isEqual(elementValue, this.shadowValue)) {
				this.set(elementValue, element);
			}
		}
	};

	dataBinding.prototype.addListeners = function(element) {
		var dataBinding = element.dataBinding;
		if (!dataBinding) {
			dataBinding = element.listItemDataBinding;
		}
		if (dataBinding) {
			if (dataBinding.observer) {
				this.removeListeners(element);
			}
			var self = this;
			dataBinding.observer = new MutationObserver(
				getChangeHandler(element)
			);
			// FIXME: doesn't trigger when element itself is removed from the dom
			dataBinding.observer.observe(element, {
				characterData: true,
				subtree: true,
				childList: true,
				attributes: true
			});
		}
		// FIXME: the mutationObserver is slow to pick up on node insert/node remove changes
	};

	dataBinding.prototype.pauseListeners = function(element) {
		if (element.dataBinding && element.dataBinding.observer) {
			element.dataBinding.observer.disconnect();
			element.dataBinding.observerPaused++;
		}
	};

	dataBinding.prototype.resumeListeners = function(element) {
		if (element.dataBinding && element.dataBinding.observerPaused) {
			element.dataBinding.observerPaused--;
			if (!element.dataBinding.observerPaused) {
				element.dataBinding.observer.observe(element, {
					characterData: true,
					subtree: true,
					childList: true,
					attributes: true				
				});
			}
		}
		if (element.listItemDataBinding && element.listItemDataBinding.observerPaused) {
			element.listItemDataBinding.observerPaused--;
			if (!element.listItemDataBinding.observerPaused) {
				element.listItemDataBinding.observer.observe(element, {
					characterData: true,
					subtree: true,
					childList: true,
					attributes: true				
				});
			}
		}
	};

	dataBinding.prototype.fireEvent = function(evtname, target, eventData) {
		var event; // The custom event that will be created
		if (document.createEvent) {
			event = document.createEvent("HTMLEvents");
			event.initEvent(evtname, true, true);
		} else {
			event = document.createEventObject();
			event.eventType = evtname;
		}

		event.data = eventData;
		event.eventName = evtname;

		if (document.createEvent) {
			target.dispatchEvent(event);
		} else {
			// target.fireEvent("on" + event.eventType, event);
		}
		return event;
	};

	dataBinding.prototype.removeListeners = function(element) {
		if (element.dataBinding && element.dataBinding.observer) {
			element.dataBinding.observer.disconnect();
		}
		if (element.listItemDataBinding && element.listItemDataBinding.observer) {
			element.listItemDataBinding.observer.disconnect();
		}
	};

	/**
	 * returns a function that updates the data from a 
	 * target element. This function is passed on to the
	 * mutation observer so we don't need to search for the
	 * bound element there.
	 * @param target DomElement the bound element
	 * @return void
	 */
	function getChangeHandler(target) {
		return function(mutations) {
			if (target.dataBinding && target.dataBinding.binding) {
				if (target.dataBinding.binding.shadowValue instanceof Array) {
					mutations.forEach(function(mutation) {
						if (mutation.type == "childList" && mutation.target == target) {
							mutation.removedNodes.forEach(function(node) {
								if (node.nodeType != document.ELEMENT_NODE) {
									return;
								}
								if (!node.listItemDataBinding) {
									return;
								}
								var index = parseInt(node.listItemDataBinding.binding.key);
								if (index < 0) {
									return;
								}
								var listItemParent = node.listItemDataBinding.binding.dataParent;
								console.log("remove childNode, value before splice " + JSON.stringify(listItemParent));
								listItemParent._bindings_[index].key = -1;

								node.listItemDataBinding.simplyData = Array.prototype['splice'].call(
									listItemParent, index, 1
								)[0];

								delete listItemParent._bindings_[index];

								var counter = 0;
								for (i in listItemParent._bindings_) {
									listItemParent._bindings_[counter] = listItemParent._bindings_[i];
									console.log("renumbering " + listItemParent._bindings_[counter].key + " to " + counter);
									listItemParent._bindings_[counter].key = counter;
									delete listItemParent._bindings_[i];
									counter++;
								}
								console.log("remove childNode, value after splice " + JSON.stringify(listItemParent));
							});

							mutation.addedNodes.forEach(function(node) {
								if (node.nodeType != document.ELEMENT_NODE) {
									return;
								}
								var index = 0;
								if (mutation.previousSibling) {
									if (!mutation.previousSibling.listItemDataBinding) {
										return;
									}
									index = parseInt(mutation.previousSibling.listItemDataBinding.binding.key) + 1;
								}
								if (!node.parentNode) {
									// node was already removed, carry on;
									return;
								}
								var listItemParent = node.parentNode.dataBinding.binding.get();
								console.log("add childNode, value before splice " + JSON.stringify(listItemParent));

								Array.prototype['splice'].call(
									listItemParent,
									// listDataBinding can be empty if we clone a list item and append it to the list;
									// the data change will be picked up by the list getter instead;
									index, 0, (node.listItemDataBinding ? node.listItemDataBinding.simplyData :null)
								);

								var counter = 0;
								node.parentNode.childNodes.forEach(function(listItem) {
									if (listItem.listItemDataBinding) {
										console.log("renumbering " + listItem.listItemDataBinding.binding.key + " to " + counter);
										listItemParent._bindings_[counter] = listItem.listItemDataBinding.binding;
										listItem.listItemDataBinding.binding.key = counter;
										counter++;
									}
								});
								console.log("add childNode, value after splice " + JSON.stringify(listItemParent));
							});
						}
					});
				}

				target.dataBinding.binding.updateFrom(target);
			}
		};
	}

	var databind = {
		create: function(dataParent, path) {
			if (typeof dataParent != "object") {
				console.log("Attempted to bind on a non-object data for " + path);
				return;
			}
			// If we already have a databinding on this data[key], re-use that one instead of creating a new one;
			if (dataParent.hasOwnProperty("_bindings_") && dataParent._bindings_[path]) {
				return dataParent._bindings_[path];
			}
			return new dataBinding(dataParent, path);
		},
		debug: function(on) {
			debugMode = Boolean(on);
			// log change/resolve changes value and source
		},
		sync: function(data) {
			// stel ik delete een entry uit een array met 'delete arr[2]'
			// dan wil ik 'simply.databind.sync(arr)' kunnen doen om alsnog
			// de change te triggeren... hoe doe ik dat?
		}
	};

	if (typeof module !== 'undefined' && typeof module.exports != 'undefined') {
		module.exports = databind;
	} else {
		if (!global.simply) {
			global.simply = {};
		}
		global.simply.databind = databind;
	}

})(this);
