var resolveNameSpace = function(property) {
	var namespace = "xmlns:" + property.split(":")[0];
	var namespaceElement = document.body.closest("[" + CSS.escape(namespace) + "]");
	if (namespaceElement) {
		return namespaceElement.getAttribute(namespace) + property.split(":")[1];
	}
	return property;
};

tripleBinding = function(triple, dataBinding) {
	/* 
		Triple is an object:
		{
			store : rdfStore,
			subject : rdfSubject,
			predicate : rdfPredicate
		}
	*/

		
	var self = this;
	this.triple = triple;
	this.dataBinding = dataBinding;
	this.triple.dataBinding = dataBinding;
	this.triple.tripleBinding = this;
	this.simplyDataBindingElement = true;

	this.triple.predicate = resolveNameSpace(this.triple.predicate);

	if (typeof this.triple.store.simplyDataBindings === "undefined") {
		this.triple.store.simplyDataBindings = {};
	}
	if (typeof this.triple.store.simplyDataBindings[this.triple.subject] === "undefined") {
		this.triple.store.simplyDataBindings[this.triple.subject] = {};
	}
	if (typeof this.triple.store.simplyDataBindings[this.triple.subject][this.triple.predicate] === "undefined") {
		this.triple.store.simplyDataBindings[this.triple.subject][this.triple.predicate] = this;
	} else {
		console.log("Warning: binding to the same subject/predicate twice");
		var previousBinding = this.triple.store.simplyDataBindings[this.triple.subject][this.triple.predicate];
		previousBinding.isInDocument = function() {
			return false;
		};
		this.dataBinding.unbind(previousBinding);
		this.triple.store.simplyDataBindings[this.triple.subject][this.triple.predicate] = this;
	}
	this.unbind = function() {
		if (this.dataBinding) {
			this.dataBinding.unbind(this);
		}
	};
	this.dataBindingPaused = 0;

	this.getBlankNode = function(self, subject) {
		var result = {};
		if (!self.triple.store.subjectIndex[subject]) {
			subject = "_:" + subject;
		}
		if (!self.triple.store.subjectIndex[subject]) {
			return;
		}
		self.triple.store.subjectIndex[subject].forEach(function(triple) {
			if (typeof result[triple.predicate.value] === "undefined") {
				result[triple.predicate.value] = [];
			}
			result[triple.predicate.value].push(triple.object);
		});
		return result;
	};
	this.getNamedNode = function(self, subject) {
		var result = {};
		if (!self.triple.store.subjectIndex[subject]) {
			subject = "<" + subject + ">";
		}
		if (!self.triple.store.subjectIndex[subject]) {
			return;
		}
		self.triple.store.subjectIndex[subject].forEach(function(triple) {
			if (typeof result[triple.predicate.value] === "undefined") {
				result[triple.predicate.value] = [];
			}
			result[triple.predicate.value].push(triple.object);
		});
		return result;
	};
	
	this.getObjects = function() {
		var triples = this.getTriples();
		var objects = [];
		triples.forEach(function(triple) {
			if (triple.object.termType == "Collection") {
				triple.object.elements.forEach(function(item) {
					objects.push(item);
				});
			} else {
				objects.push(triple.object);
			}
		});
		return objects;
	};

	this.getTriples = function() {
		var triples = [];
		var subject = this.triple.subject;
		var predicate = this.triple.predicate;
		var store = this.triple.store;
		var self = this;

		if (!this.triple.store.subjectIndex[subject]) {
			if (this.triple.store.subjectIndex["<" + subject + ">"]) {
				subject = "<" + subject + ">";
			} else if (this.triple.store.subjectIndex[subject.replace(/^\[(.*)\]$/, "$1")]) {
				subject = subject.replace(/^\[(.*)\]$/, "$1");
			}
		}
		if (!this.triple.store.subjectIndex[subject]) {
			return [];
		}
		this.triple.store.subjectIndex[subject].forEach(function(triple) {
			if (triple.predicate.value != predicate) {
				return;
			}
			if ((triple.object.termType == "Collection") && (triple.object.elements.length == 0)) {
				return; // empty collection, no need to add
			}
			triples.push(triple);
		});
		return triples;
	};

	this.getter = function() {
		var self = this;
		var objects = this.getObjects();
		if (!objects) {
			return;
		}
		if (this.dataBinding.mode == "field") {
			if (objects.length) {
				return objects[0].isBlank ? "[_:" + objects[0].value + "]" : objects[0].value;
				// follows the format as described in https://www.w3.org/TR/2008/REC-rdfa-syntax-20081014/#sec_5.4.5.
			}
			return;
		} else {
			var result = objects.map(function(object) {
				switch (object.termType) {
					case "Collection":
						return object.elements.map(function(item) {
							if (item.isBlank) {
								item.contents = self.getBlankNode(self, item.value);
							}
							return {
								value : (item.isBlank ? "[_:" + item.value + "]" : item.value),
								contents: item.contents
							};
						});
					// break;
					case "Literal":
						return object;
					// break;
					case "BlankNode":
						return {
							value: "[_:" + object.value + "]",
							contents: self.getBlankNode(self, object.value)
						};
					// break;
					case "NamedNode":
						return {
							value: object.value,
							contents: self.getNamedNode(self, object.value)
						};
					// break;
				}
			});
			return result;
		}
	};

	this.getFirstElementBinding = function(dataBinding) {
		for (var i=0; i<dataBinding.elements.length; i++) {
			if (dataBinding.elements[i] instanceof elementBinding) {
				return dataBinding.elements[i];
			}
		}
	};

	function bindChildren(item, newItem) {
		Object.keys(item).forEach(function(key) {
			var subItem;
			if (!item._bindings_ || !item._bindings_[key]) {
				return;
			}
			if (
				item._bindings_[key].elements.length &&
				self.getFirstElementBinding(item._bindings_[key]).element.getAttribute("typeof") 
			) {
				if (key !== "value") {
					subItem = new $rdf.BlankNode();
					item[key].about = "[_:" + newItem.value + "]";
					item._bindings_[key].resolve(true); // make sure the elements are resolved to have the correct 'about' value;
					// console.log("created blank node " + subItem.value + " as child of " + newItem.value);
					self.triple.store.add(subItem, $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), $rdf.sym(resolveNameSpace(self.getFirstElementBinding(item._bindings_[key]).element.getAttribute("typeof"))));
					self.triple.store.add(newItem, $rdf.sym(resolveNameSpace(self.getFirstElementBinding(item._bindings_[key]).element.getAttribute("property"))), subItem); // FIXME: this assumes it is nested one deep; It could be deeper though
					bindChildren(item[key], subItem);
					item._bindings_[key].resolve(true); // make sure the elements are resolved to have the correct 'about' value;
				}
			}
		});
	}

	function bindParents(value, subject) {
		value.forEach(function(item) {
			if (typeof item === "undefined") {
				return;
			}
			if (
				(typeof item.value === "undefined") ||
				((typeof item.value === "object") && (item.value.about === null))
			) {
				var keys = Object.keys(item);
				if (keys.indexOf("value") > 0) { // move value to the front so we handle that first, setting the about value for the other fields
					var index = keys.indexOf("value");
					keys.splice(index, 1);
					keys.unshift("value");
				}
				var blankNode = new $rdf.BlankNode();
				item.value = "[_:" + blankNode.value + "]";
				// console.log("created blank node " + blankNode.value + " as parent");
				var predicate = self.getFirstElementBinding(item._bindings_.value).element.getAttribute("property");
				if (!predicate) {
					predicate = self.getFirstElementBinding(item._bindings_.value).element.parentNode.getAttribute("property");
				}
				if (!predicate) {
					return;
				}
				predicate = resolveNameSpace(predicate);

				self.triple.store.add(blankNode, $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), $rdf.sym(resolveNameSpace(self.getFirstElementBinding(item._bindings_.value).element.getAttribute("typeof"))));
				self.triple.store.subjectIndex[subject].every(function(triple) {
					if (triple.predicate.value != predicate) {
						return true; // continue
					}
					if (triple.object.termType === "Collection") {
						triple.object.append(blankNode);
					} else {
						self.triple.store.add(self.triple.store.subjectIndex[subject][0].subject, $rdf.sym(predicate), blankNode);
					}
					return false; // stop loop after first time we added it;
				});

				bindChildren(item, blankNode);
				setTimeout(function() {
					keys.forEach(function(key) {
						if (!item._bindings_ || !item._bindings_[key]) {
							return;
						}
						if (!item._bindings_[key].elements.length) {
							return;
						}
						var subject = self.getFirstElementBinding(item._bindings_[key]).element.closest("[about]").getAttribute("about");
						if (!self.triple.store.subjectIndex[subject]) {
							if (self.triple.store.subjectIndex["<" + subject + ">"]) {
								subject = "<" + subject + ">";
							} else if (self.triple.store.subjectIndex[subject.replace(/^\[(.*)\]$/, "$1")]) {
								subject = subject.replace(/^\[(.*)\]$/, "$1");
							}
						}
						if (!self.triple.store.subjectIndex[subject]) {
							return;
						}
						subject = self.triple.store.subjectIndex[subject][0].subject;
						var predicate = self.getFirstElementBinding(item._bindings_[key]).element.getAttribute("property");
						if (!predicate) {
							predicate = self.getFirstElementBinding(item._bindings_[key]).element.parentNode.getAttribute("property");
						}
						if (!predicate) {
							return;
						}
						predicate = resolveNameSpace(predicate);
						var value = item[key];
						if ((subject.isBlank ? "[_:" + subject.value + "]" : subject.value) === value) {
							return;
						}

						if (value && value.length && typeof value !== "object") {
							// console.log("adding " + predicate + " to " + subject);
							self.triple.store.add(subject, $rdf.sym(predicate), value);
						} else {
							if (!value || typeof value.forEach !== "function") {
								return;
							}
							bindParents(value, subject);
						}
							
						var triple = new tripleBinding(
							{
								store : self.triple.store,
								subject : (subject.isBlank ? "[_:" + subject.value + "]" : subject.value),
								predicate: predicate,
								initFromStore : self.triple.initFromStore
							},
							item._bindings_[key]
						);
						item._bindings_[key].bind(triple);
					});
				}, 10); // needs a bit to let the 'about' property get set;
			}
		});
	}				

	this.deleteBlankNode = function(store, node) {
		while (store.subjectIndex["_:" + node].length) {
			subEntry = store.subjectIndex["_:" + node][0];
			store.removeStatement(subEntry);
			if (subEntry.object.termType === "BlankNode") {
				this.deleteBlankNode(store, subEntry.object.value);
			}
		}
	};

	this.setter = function(data) {
		try {
			if (this.getFirstElementBinding(this.triple.dataBinding).element.closest("[about]").getAttribute("about") !== this.triple.subject) {
				// 'about' changed, update to reflect;
				console.log("Updating subject from: " + this.triple.subject);
				delete this.triple.store.simplyDataBindings[this.triple.subject][this.triple.predicate];
				this.triple.subject = this.getFirstElementBinding(this.triple.dataBinding).element.closest("[about]").getAttribute("about");
				console.log("Updating subject to: " + this.triple.subject);
				this.triple.store.simplyDataBindings[this.triple.subject][this.triple.predicate] = this;
			}
		} catch (e) {
		}

		if ((typeof data === "object") && (typeof data.about !== "undefined") && (data.about === null)) {
			return;
		}
		var subject = this.triple.subject;
		var objects = this.getObjects();
		if (this.dataBinding.mode == "field") {
		/*
			if (data.indexOf("http") === 0) { // make it a symbol if it is a url
				data = $rdf.sym(data);
			}
		*/
			if (objects.length) {
				if ((data !== null) && (typeof data !== "undefined") && data !== "") {
					switch (data.termType) {
						case "Literal":
							objects[0] = data;
						break;
						default:
							if (objects[0].termType === "BlankNode") {
								data = data.replace(/^\[_:(.*)\]$/, "$1");
							}
							objects[0].value = data;
						break;
					}
				} else {
					this.triple.store.removeStatement(this.getTriples()[0]);
				}
			} else {
				if (this.triple.subject == data) {
					return; // skip descriptions for ourself
				}
				if (data == "") {
					return; // skip creation of empty data
				}
				if ((typeof data.about === "object") && (data.about === null)) {
					return; // no known about, skip it
				}

				console.log("create a new triple for value");
				console.log(data);
				console.log(this.triple);
				if (!this.triple.store.subjectIndex[subject]) {
					if (this.triple.store.subjectIndex["<" + subject + ">"]) {
						subject = "<" + subject + ">";
					} else if (this.triple.store.subjectIndex[subject.replace(/^\[(.*)\]$/, "$1")]) {
						subject = subject.replace(/^\[(.*)\]$/, "$1");
					}
				}
				if (!this.triple.store.subjectIndex[subject]) {
					try {
						subject = $rdf.sym(subject);
					} catch (e) {
						return;
					}
				} else {
					subject = this.triple.store.subjectIndex[subject][0].subject;
				}
				if ((data !== null) && (typeof data !== "undefined") && data !== "") {
					if ((typeof data.about !== "undefined") && (subject.isBlank) && ("[_:" + subject.value + "]" == data.about)) {
						console.log("skip adding about self");
					} else {
						this.triple.store.add(subject, $rdf.sym(this.triple.predicate), data);
					}
				}
			}
		} else {
			var self = this;
			if (!this.triple.store.subjectIndex[subject]) {
				if (this.triple.store.subjectIndex["<" + subject + ">"]) {
					subject = "<" + subject + ">";
				} else if (this.triple.store.subjectIndex[subject.replace(/^\[(.*)\]$/, "$1")]) {
					subject = subject.replace(/^\[(.*)\]$/, "$1");
				}
			}
			if (!this.triple.store.subjectIndex[subject]) {
				return;
			}
			var dataNodes = data.map(function(entry) {
				return entry.value;
			});
			
			var triples = this.getTriples();
			if (triples.length === 0 && dataNodes.length > 0) {
				self.triple.store.add($rdf.sym(self.triple.subject), $rdf.sym(self.triple.predicate), new $rdf.Collection());
			}

			triples.forEach(function(entry) {
				switch (entry.object.termType) {
					case "Collection":
						entry.object.elements.forEach(function(item, index, elements) {
							if (dataNodes.indexOf(item.isBlank ? "[_:" + item.value + "]" : item.value) === -1) {
								// node was removed;
								// console.log("remove node");
								// console.log(self.triple.subject);
								// console.log(self.triple.predicate);
								// console.log(item.value);
								// self.triple.store.removeStatement(item);
								elements.splice(index, 1); // remove it from the collection;
								if (item.termType === "BlankNode") {
									self.deleteBlankNode(self.triple.store, item.value);
								}
							}
						});
						entry.object.elements.sort(function(a, b) {
							aIndex = dataNodes.indexOf(a.isBlank ? "[_:" + a.value + "]" : a.value);
							bIndex = dataNodes.indexOf(b.isBlank ? "[_:" + b.value + "]" : b.value);
							if (aIndex > bIndex) {
								return 1;
							} else if (aIndex < bIndex) {
								return -1;
							} else {
								return 0;
							}
						});
					break;
					case "BlankNode":
						if (dataNodes.indexOf("[_:" + entry.object.value + "]" ) === -1) {
							self.triple.store.removeStatement(entry);
							self.deleteBlankNode(self.triple.store, entry.object.value);
						}
					break;
					default:
						if (dataNodes.indexOf(entry.object.value) === -1) {
							self.triple.store.removeStatement(entry);
						}
					break;
				}
			});
			setTimeout(function() {
				bindParents(data, subject);
			});
		}
		return data;
	};
	
	this.addListeners = function() {
	};

	this.removeListeners = function() {
	};

	this.resumeListeners = function() {
		this.triple.dataBindingPaused--;
		if (this.triple.dataBindingPaused < 0) {
			console.log("Warning: resume called of non-paused databinding");
			this.triple.dataBindingPaused = 0;
		}
	};
	this.pauseListeners = function() {
		this.triple.dataBindingPaused++;
	};

	this.fireEvent = function(event) {
	};
	this.isInDocument = function() {
		return true;
	};


	// Init triples from the rdfStore to start with;
	if (this.triple.initFromStore) {
		var storeValue = this.getter();
		if (Array.isArray(storeValue) && !storeValue.length) {
			return;
		}
		if (!storeValue) {
			return;
		}
		this.dataBinding.set(this.getter());
		this.dataBinding.resolve(true);
	}	
};

editor.field.storedInit = editor.field.init;
editor.list.storedInit = editor.list.init;

window.simplyBlankNodeCount = 1;

var initRdflibTriple = function(element) {
	var fieldName = element.getAttribute("data-simply-field");
	if (!fieldName) {
		fieldName = element.getAttribute("data-simply-list");
	}

	var about = element.closest("[about]");
	if (!about) {
		window.setTimeout(function() {
			initRdflibTriple(element);
		}, 10);
		return;
	}

	var subject = about.getAttribute("about");
	if (element.hasAttribute("typeof")) {
		if (subject.indexOf("[") !== 0) { // skip blank nodes; FIXME: do we need a better way to exclude them?
			// Only add the type if it is not already set;
			var currentType = simplyApp.rdfStore.match($rdf.sym(subject), $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"));
			if (currentType.length) {
				element.setAttribute("typeof", currentType[0].object.value);
			} else {
				simplyApp.rdfStore.add($rdf.sym(subject), $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), $rdf.sym(resolveNameSpace(element.getAttribute("typeof"))));
			}
		}
	}

	if (!element.hasAttribute("property")) {
		return;
	}

	var property = element.getAttribute("property");
	var initFromStore = true;
	if (element.getAttribute("data-set-to-store")) {
		initFromStore = false;
	}
	if (element.dataBinding) {
		if (
			!simplyApp.rdfStore.simplyDataBindings ||
			!simplyApp.rdfStore.simplyDataBindings[subject] ||
			!simplyApp.rdfStore.simplyDataBindings[subject][property]
		) {
			element.dataBinding.bind(
				new tripleBinding(
					{
						store: simplyApp.rdfStore,
						subject : subject,
						predicate : property,
						initFromStore: initFromStore
					},
					element.dataBinding
				)
			);
		}
	}
};

editor.field.init = function(field, dataParent, useDataBinding) {
	editor.field.storedInit(field, dataParent, useDataBinding);
	initRdflibTriple(field);
};
editor.list.init = function(list, dataParent, useDataBinding) {
	editor.list.storedInit(list, dataParent, useDataBinding);
	initRdflibTriple(list);
};
