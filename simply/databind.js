dataBinding = function(data, key) {
	if (data.hasOwnProperty("_bindings_") && data._bindings_[key]) {
		return data._bindings_[key];
	}
	this.elements = [];
	var shadowValue = data[key];

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
	var binding = data._bindings_[key];

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

		if (typeof value == "object") {
			value = JSON.parse(JSON.stringify(value)); // clone the value;
		}
		shadowValue = value;

		for (var i=0; i<binding.elements.length; i++) {
			binding.removeListeners(binding.elements[i]);
			if (JSON.stringify(binding.elements[i].getter()) != JSON.stringify(shadowValue)) {
				binding.elements[i].setter(value);
			}
		}
		
		var addListener = function() {
			for (var i=0; i<binding.elements.length; i++) {
				if (JSON.stringify(binding.elements[i].getter()) != JSON.stringify(shadowValue)) {
					// this element changed when we were not listening; play catch up;
					binding.set(binding.elements[i].element.getter());
				}
				binding.addListeners(binding.elements[i]);
			}
		};
		window.setTimeout(addListener, 5);
	};

	this.bind = function(element, skipSet) {
		element.mutationObserver = new MutationObserver(this.handleMutation);
		binding.elements.push(element);

		if (element.getAttribute("data-simply-field")) {
			element.getter = function() {
				return editor.field.get(this);
			};
			element.setter = function(value) {
				element.simplyData = value;
				return editor.field.set(this, value);
			};

		} else if (element.getAttribute("data-simply-list")) {
			element.getter = function() {
				var dataName = this.getAttribute("data-simply-list");
				var dataPath = editor.data.getDataPath(this);
				var stashedFields = this.querySelectorAll("[data-simply-stashed]");
				for (i=0; i<stashedFields.length; i++) {
					stashedFields[i].removeAttribute("data-simply-stashed");
				}
				this.removeAttribute("data-simply-stashed");

				var data = editor.data.list.get(this);
				return data[dataPath][dataName];
			};
			element.setter = function(value) {
				element.simplyData = value;
				var children = this.querySelectorAll("[data-simply-list-item]");
				for (var i=0; i<children.length; i++) {
					this.removeChild(children[i]);
				}

				editor.data.list.applyTemplates(this, value);
				if (document.body.getAttribute("data-simply-edit")) {
					editor.editmode.makeEditable(this);
				}
			};
		} else {
			return;
		}

		if (!skipSet) {
			element.setter(shadowValue);
		}
		this.addListeners(element);

		setInterval(this.resolve, 200);
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
	if (element.getAttribute("data-simply-field")) {
		element.mutationObserver.observe(element, {attributes: true});
	//	element.addEventListener("DOMCharacterDataModified", this.handleEvent);

	//	element.addEventListener("DOMAttrModified", this, false);
		element.addEventListener("DOMSubtreeModified", this.handleEvent);
		element.addEventListener("DOMNodeRemoved", fieldNodeRemovedHandler);

	}
	if (element.getAttribute("data-simply-list")) {
		element.addEventListener("DOMNodeRemoved", this, false);
		element.addEventListener("DOMNodeInserted", this, false);
	}
	element.dataBinding = this;
};
dataBinding.prototype.removeListeners = function(element) {
	if (element.getAttribute("data-simply-field")) {
	//	element.removeEventListener("DOMCharacterDataModified", this.handleEvent);
		element.mutationObserver.disconnect();
		element.removeEventListener("DOMNodeRemoved", fieldNodeRemovedHandler);

	//	element.removeEventListener("DOMAttrModified", this, false);
		element.removeEventListener("DOMSubtreeModified", this.handleEvent);
	}
	if (element.getAttribute("data-simply-list")) {
		element.removeEventListener("DOMNodeRemoved", this, false);
		element.removeEventListener("DOMNodeInserted", this, false);
	}
//	element.removeEventListener("DOMSubtreeModified", this, false);
};

dataBinding.prototype.handleMutation = function(event) {
	var target = event[0].target;
	var self = target.dataBinding;
	self.set(target.getter());
};			

dataBinding.prototype.handleEvent = function (event) {
	var target = event.currentTarget;
	var self = target.dataBinding;

	switch (event.type) {
		case "change":
		case "DOMAttrModified":
		case "DOMNodeInserted":
		case "DOMCharacterDataModified":
		case "DOMSubtreeModified":
			self.set(target.getter());
		break;
		case "DOMNodeRemoved":
			// Allow the node to be removed before setting the new data;
			window.setTimeout(function() {
				self.set(target.getter());
			}, 1);
		break;
	}
};
