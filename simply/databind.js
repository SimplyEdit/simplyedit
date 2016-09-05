dataBinding = function(config) {
	var data = config.data;
	var key = config.key;
	this.config = config;
	this.setter = config.setter;
	this.getter = config.getter;
	this.mode = config.mode;
	this.parentKey = config.parentKey ? config.parentKey : "";
	this.key = config.key;

	if (!this.mode) {
		this.mode = "field";
	}

	var monitorChildData = function(data) {
		if (typeof data === "object") {
			var monitor = function(data, key) {
				var myvalue = data[key];
				Object.defineProperty(data, key, {
					set : function(value) {
						myvalue = value;
						newValue = JSON.parse(JSON.stringify(shadowValue));
						shadowValue = null;
						binding.set(newValue);
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
		if (data instanceof Array) {
			overrideArrayFunction = function(name) {
				Object.defineProperty(data, name, {
					value : function() {
						binding.resolve(); // make sure the shadowValue is in sync with the latest state;
						var result = Array.prototype[name].apply(shadowValue, arguments);
						newValue = JSON.parse(JSON.stringify(shadowValue));
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

	if (data.hasOwnProperty("_bindings_") && data._bindings_[key]) {
		return data._bindings_[key];
	}
	this.elements = [];
	var shadowValue = data[key];
	if (typeof shadowValue === "object") {
		shadowValue = JSON.parse(JSON.stringify(shadowValue)); // clone the value;
	}

	monitorChildData(shadowValue);

	var changeStack = [];

	Object.defineProperty(data, key, { 
		set : function(value) {
			binding.set(value);
		},
		get : function() {
			return shadowValue;
		}
	});

	if (!data.hasOwnProperty("_bindings_")) {
		var bindings = {};

		Object.defineProperty(data, "_bindings_", {
			get : function() {
				return bindings;
			},
			set : function(value) {
				bindings[key] = this;
			}
		});
	}
	data._bindings_[key] = this;
	var binding = this;

	this.set = function (value) {
		changeStack.push(value);
	};

	this.get = function() {
		if (changeStack.length) {
			this.resolve();
		}
		return shadowValue;
	};

	this.resolve = function() {
		if (!changeStack.length) {
			return;
		}
		var value = changeStack.pop();
		changeStack = [];

		if (JSON.stringify(value) == JSON.stringify(shadowValue)) {
			return;
		}

		if (typeof value === "object") {
		 	value = JSON.parse(JSON.stringify(value)); // clone the value;
		}
		shadowValue = value;
		monitorChildData(shadowValue);

		var i;
		for (i=0; i<binding.elements.length; i++) {
			binding.removeListeners(binding.elements[i]);
		}
		for (i=0; i<binding.elements.length; i++) {
			if (
				binding.mode == "list" || // if it is a list, we need to reset the values so that the bindings are setup properly.
				(JSON.stringify(binding.elements[i].getter()) != JSON.stringify(shadowValue))
			) {
				binding.elements[i].setter(value);
			}
		}
		
		var addListener = function() {
			var i;
			for (i=0; i<binding.elements.length; i++) {
				if (JSON.stringify(binding.elements[i].getter()) != JSON.stringify(shadowValue)) {
					// this element changed when we were not listening; play catch up;
					binding.set(binding.elements[i].getter());
					binding.resolve();
				}
			}
			for (i=0; i<binding.elements.length; i++) {
				binding.addListeners(binding.elements[i]);
			}
		};
		if (typeof binding.config.resolve === "function") {
			binding.config.resolve.call(binding, key, value);
		}
		window.setTimeout(addListener, 5);
	};

	if (typeof binding.config.init === "function") {
		binding.config.init.call(binding);
	}

	this.bind = function(element, skipSet) {
		if (binding.mode == "field") {
			element.mutationObserver = new MutationObserver(this.handleMutation);
		}

		binding.elements.push(element);

		element.getter = binding.getter;
		element.setter = binding.setter;

		if (!skipSet) {
			element.setter(shadowValue);
		}
		element.dataBinding = binding;

		this.addListeners(element);

		if (!binding.resolver) {
			binding.resolver = setInterval(this.resolve, 200);
		}
	};
	this.rebind = function(element) {
		return this.bind(element, true);
	};

	this.unbind = function(element) {
		if (binding.elements.indexOf(element) > -1) {
			binding.elements.splice(binding.elements.indexOf(element), 1);
		}
	};
};

var fieldNodeRemovedHandler = function(evt) {
	if (!this.parentNode) {
		this.dataBinding.unbind(this);
	}
};

dataBinding.prototype.addListeners = function(element) {
	if (element.dataBinding) {
		element.dataBinding.removeListeners(element);
	}
	if (this.mode == "field") {
		element.mutationObserver.observe(element, {attributes: true});
		element.addEventListener("DOMSubtreeModified", this.handleEvent);
		element.addEventListener("DOMNodeRemoved", fieldNodeRemovedHandler);
	}
	if (this.mode == "list") {
		element.addEventListener("DOMNodeRemoved", this.handleEvent);
		element.addEventListener("DOMNodeInserted", this.handleEvent);
	}
};

dataBinding.prototype.removeListeners = function(element) {
	if (this.mode == "field") {
		element.mutationObserver.disconnect();
		element.removeEventListener("DOMNodeRemoved", fieldNodeRemovedHandler);
		element.removeEventListener("DOMSubtreeModified", this.handleEvent);
	}
	if (this.mode == "list") {
		element.removeEventListener("DOMNodeRemoved", this.handleEvent);
		element.removeEventListener("DOMNodeInserted", this.handleEvent);
	}
};

dataBinding.prototype.handleMutation = function(event) {
	var target = event[0].target;
//	if (event[0].attributeName == "data-simply-stashed") {
//		return;
//	}
	var self = target.dataBinding;
	self.set(target.getter());
};			

dataBinding.prototype.handleEvent = function (event) {
	var target = event.currentTarget;
	var self = target.dataBinding;

	if (self.mode === "list") {
		if (target != event.relatedNode) {
			return;
		}
	}

	switch (event.type) {
		case "change":
		case "DOMAttrModified":
		case "DOMNodeInserted":
		case "DOMCharacterDataModified":
		case "DOMSubtreeModified":
		case "DOMNodeRemoved":
			// Allow the browser to fix what it thinks needs to be fixed (node to be removed, cleaned etc) before setting the new data;
			self.set(target.getter());
			window.setTimeout(function() {
				self.set(target.getter());
			}, 1);
		break;
	}
};
