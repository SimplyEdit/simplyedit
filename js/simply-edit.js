/*
	Simply edit the Web

	Written by Yvo Brevoort
	Copyright Muze 2015-2016, all rights reserved.
*/
(function() {
	if (window.editor) {
		return;
	}

	var getScriptEl = function() {
		var scriptEl = document.querySelector("[src$='simply-edit.js'][data-api-key]");
		if (!scriptEl) {
			scriptEl = document.querySelector("[src$='simply-edit.js']");
		}
		return scriptEl;
	};

	var scriptEl = getScriptEl();
	var apiKey = scriptEl.getAttribute("data-api-key") ? scriptEl.getAttribute("data-api-key") : "";

	var getKeylessBaseURL  = function(url) {
		var scriptURL = document.createElement('a');
		scriptURL.href = url;
		scriptURL.pathname = scriptURL.pathname.replace('simply-edit.js', '').replace(/\/js\/$/, '/');
		return scriptURL.href;
	};

	var getBaseURL = function(url) {
		var scriptURL = document.createElement('a');
		scriptURL.href = url;
		scriptURL.pathname = scriptURL.pathname.replace('simply-edit.js', '').replace(/\/js\/$/, '/');
		if (apiKey !== "") {
			scriptURL.pathname = scriptURL.pathname + apiKey + "/";
		}
		return scriptURL.href;
	};

	var editor = {
		version: '@version',
		apiKey : apiKey,
		baseURL : getBaseURL(scriptEl.src),
		baseURLClean : getKeylessBaseURL(scriptEl.src),
		bindingParents : [],
		data : {
			getDataPath : function(field) {
				var parent = field;
				while (parent && parent.parentNode) {
					if (parent.getAttribute("data-simply-path")) {
						return parent.getAttribute("data-simply-path");
					}
					parent = parent.parentNode;
				}
				return location.pathname;
			},
			apply : function(data, target) {
				// data = JSON.parse(JSON.stringify(data)); // clone data to prevent reference issues;

				if (typeof editor.data.originalBody === "undefined") {
					editor.data.originalBody = document.body.cloneNode(true);
				}

				var dataFields;
				if (target.nodeType == document.ELEMENT_NODE && target.getAttribute("data-simply-field")) {
					dataFields = [target];
				} else {
					dataFields = target.querySelectorAll("[data-simply-field]");
				}
				var subFields;
				if (target.nodeType == document.DOCUMENT_NODE || target.nodeType == document.DOCUMENT_FRAGMENT_NODE) {
					subFields = target.querySelectorAll("[data-simply-list] [data-simply-field]");
				} else {
					subFields = target.querySelectorAll(":scope [data-simply-list] [data-simply-field]"); // use :scope here, otherwise it will also return items that are a part of a outside-scope-list
				}

				if (target == document) {
					editor.settings.databind.parentKey = '/';
				} else {
					editor.settings.databind.parentKey = editor.bindingParents.join("/") + "/";
				}

				var savedParentKey = editor.settings.databind.parentKey;
				for (var i=0; i<dataFields.length; i++) {
					editor.settings.databind.parentKey = savedParentKey;

					// Only handle datafields that are our direct descendants, list descendants will be handled by the list;
					var isSub = false;
					for (var a=0; a<subFields.length; a++) {
						if (dataFields[i] == subFields[a]) {
							isSub = true;
						}
					}
					if (isSub) {
						continue;
					}

					var dataPath = editor.data.getDataPath(dataFields[i]);
					if (!data[dataPath]) {
						data[dataPath] = {};
					}

					editor.field.init(dataFields[i], data[dataPath], true);
				}

				editor.settings.databind.parentKey = savedParentKey;
				editor.list.initLists(data, target);
				editor.fireEvent("simply-data-applied", target);
			},
			get : function(target) {
				if (target == document && editor.currentData) {
					return editor.currentData;
				} else if (target.dataBinding) {
					return target.dataBinding.get();
				} else {
					var stashedFields = target.querySelectorAll("[data-simply-stashed]");
					for (i=0; i<stashedFields.length; i++) {
						stashedFields[i].removeAttribute("data-simply-stashed");
					}
					if (target.nodeType == document.ELEMENT_NODE) {
						target.removeAttribute("data-simply-stashed");
					}

					return editor.list.get(target);
				}
			},
			stash : function() {
				editor.fireEvent("simply-stash", document);
				localStorage.data = editor.data.stringify(editor.currentData);
				var dataSources = document.querySelectorAll("[data-simply-data]");
				for (var i=0; i<dataSources.length; i++) {
					editor.list.get(dataSources[i]);
				}
			},
			stringify : function(data) {
				var jsonData = JSON.stringify(data, null, "\t");

				// Replace characters for encoding with btoa, needed for github;
				jsonData = jsonData.replace(
					/[^\x00-\x7F]/g,
					function ( char ) {
						var hex = char.charCodeAt( 0 ).toString( 16 );
						while ( hex.length < 4 ) {
							hex = '0' + hex;
						}
						return '\\u' + hex;
					}
				);
				return jsonData;
			},
			save : function() {
				if (editor.storage.connect()) {
					editor.data.stash();
					if (editor.actions['simply-beforesave']) {
						editor.actions['simply-beforesave']();
					}
					editor.storage.load(function(data) {
						// check if the data is different from the last time;
						if (data != editor.loadedData && editor.plugins.undoRedo) {
							console.log("Notice: Is someone else also editing? Data on the server changed since we loaded it. Trying to merge...");
							alert("Is someone else also editing? Data on the server changed since we loaded it. Trying to merge...");
							var newData = JSON.parse(data);

							// if so, try to replay the undoset on it;
							if (editor.plugins.undoRedo) {
								newData = editor.plugins.undoRedo.replay(newData);
							} else {
								newData = false;
							}

							if (newData) {
								// if that works, go ahead and save the replayed version;
								console.log("Notice: Merge was succesful.");
								alert("Merge was succesful.");
								localStorage.data = editor.data.stringify(newData);
							} else {
								// if not, ask what to do;
								console.log("Notice: Data on the server changed, and we could not merge the changes.");
								if (!confirm("Could not merge. Do you want to overwrite the changes?")) {
									if (editor.plugins.undoRedo && confirm("Do you want to merge field-by-field? (" + editor.plugins.undoRedo.mergeErrors + " conflicts to resolve.)")) {
										newData = JSON.parse(data);
										newData = editor.plugins.undoRedo.replay(newData, true);
										localStorage.data = editor.data.stringify(newData);
									} else {
										// User declined the overwrite; Skip saving.
										result = {
											error: true,
											message : "Save cancelled by user."
										};
										if (editor.actions['simply-aftersave-error']) {
											editor.actions['simply-aftersave-error'](result);
										} else {
											alert("Save failed: " + result.message);
										}	
										return;
									}
								}
							}
						}

						editor.storage.save(localStorage.data, function(result) {
							if (!result) {
								result = {};
							}
							result.newData = localStorage.data;
							var savedEvent = editor.fireEvent("simply-data-saved", document, result);
							editor.loadedData = result.newData;

							if (result && result.error) {
								if (editor.actions['simply-aftersave-error']) {
									editor.actions['simply-aftersave-error'](result);
								} else {
									alert("Save failed: " + result.message);
								}
							} else {
								if (editor.actions['simply-aftersave']) {
									editor.actions['simply-aftersave']();
								} else {
									alert("Saved!");
								}
							}
						});
						for (var source in editor.dataSources) {
							if (editor.dataSources[source].save) {
								for (var i=0; i<editor.dataSources[source].stash.length; i++) {
									editor.dataSources[source].save(editor.dataSources[source].stash[i]);
								}
							}
						}
					});

				} 
			},
			load : function() {
				editor.storage.load(function(data) {
					try {
						localStorage.data = data;
					} catch(e) {
						editor.readOnly = true;
					}

					editor.loadedData = data;
					try {
						editor.currentData = JSON.parse(data);
					} catch(e) {
						editor.currentData = {};
						console.log("Warning: Not able to parse JSON data.");
					}

					editor.data.apply(editor.currentData, document);
					editor.pageData = editor.currentData[document.location.pathname];
					editor.fireEvent("simply-content-loaded", document);

					var checkEdit = function() {
						if (document.location.hash == "#simply-edit" && !document.body.getAttribute("data-simply-edit")) {
							if (editor.storage.connect()) {
								editor.editmode.init();
								var checkHope = function() {
									if (typeof hope !== "undefined") {
										editor.editmode.makeEditable(document);
									} else {
										window.setTimeout(checkHope, 100);
									}
								};
								checkHope();
							} else {
								window.setTimeout(checkEdit, 100);
							}
						}
					};

					if ("addEventListener" in window) {
						window.addEventListener("hashchange", checkEdit);
					}
					checkEdit();
				});
			}
		},
		list : {
			get : function(target) {
				var i, j;
				var data = {};
				var dataName, dataPath, dataFields, dataLists, listItems;

				var addListData = function(list) {
					if (list.getAttribute("data-simply-stashed")) {
						return;
					}
					dataName = list.getAttribute("data-simply-list");
					dataPath = editor.data.getDataPath(list);

					if (!data[dataPath]) {
						data[dataPath] = {};
					}

					var dataParent = data[dataPath];
					var dataKeys = dataName.split(".");
					dataName = dataKeys.pop();
					for (var j=0; j<dataKeys.length; j++) {
						if (!dataParent[dataKeys[j]]) {
							dataParent[dataKeys[j]] = {};
						}
						dataParent = dataParent[dataKeys[j]];
					}

					if (!dataParent[dataName]) {
						dataParent[dataName] = [];
					}

					listItems = list.querySelectorAll("[data-simply-list-item]");
					var counter = 0;
					for (j=0; j<listItems.length; j++) {
						if (listItems[j].parentNode != list) {
							continue;
						}

						if (!dataParent[dataName][counter]) {
							dataParent[dataName][counter] = {};
						}
						var subData = editor.list.get(listItems[j]);
						for (var subPath in subData) {
							if (subPath != dataPath) {
								console.log("Notice: use of data-simply-path in subitems is not permitted, translated " + subPath + " to " + dataPath);
							}
							dataParent[dataName][counter] = subData[subPath];
						}

						// dataParent[dataName][counter] = editor.data.get(listItems[j]);
						if (listItems[j].getAttribute("data-simply-template")) {
							dataParent[dataName][counter]['data-simply-template'] = listItems[j].getAttribute("data-simply-template");
						}
						counter++;
					}
					list.setAttribute("data-simply-stashed", 1);

					var dataSource = list.getAttribute("data-simply-data");
					if (dataSource) {
						if (editor.dataSources[dataSource]) {
							if (!editor.dataSources[dataSource].stash) {
								editor.dataSources[dataSource].stash = [];
							}

							editor.dataSources[dataSource].stash.push({
								list : list,
								dataPath : dataPath,
								dataName : dataName,
								data : dataParent[dataName]
							});

							if (typeof editor.dataSources[dataSource].get === "function") {
								dataParent[dataName] = editor.dataSources[dataSource].get(list);
								if (dataParent[dataName] === null) {
									dataParent[dataName] = []; // returning null will confuse the databinding;
								}
							}
						}
					}
				};

				var addData = function(field) {
					if (field.getAttribute("data-simply-stashed")) {
						return;
					}

					dataName = field.getAttribute("data-simply-field");
					dataPath = editor.data.getDataPath(field);

					if (!data[dataPath]) {
						data[dataPath] = {};
					}

					var dataParent = data[dataPath];
					var dataKeys = dataName.split(".");
					dataName = dataKeys.pop();
					for (var j=0; j<dataKeys.length; j++) {
						if (!dataParent[dataKeys[j]]) {
							dataParent[dataKeys[j]] = {};
						}
						dataParent = dataParent[dataKeys[j]];
					}

					dataParent[dataName] = editor.field.get(field);
					field.setAttribute("data-simply-stashed", 1);
				};

				if (target.nodeType == document.ELEMENT_NODE && target.getAttribute("data-simply-list")) {
					addListData(target);
				}

				dataLists = target.querySelectorAll("[data-simply-list]");
				for (i=0; i<dataLists.length; i++) {
					addListData(dataLists[i]);
				}

				dataFields = target.querySelectorAll("[data-simply-field]");
				for (i=0; i<dataFields.length; i++) {
					addData(dataFields[i]);
				}
				if (target.nodeType == document.ELEMENT_NODE && target.getAttribute("data-simply-field")) {
					addData(target);
				}

				if (target.nodeType == document.ELEMENT_NODE && target.getAttribute("data-simply-list-item")) {
					if (target.getAttribute("data-simply-template")) {
						dataPath = editor.data.getDataPath(target);
						if (!data[dataPath]) {
							data[dataPath] = {};
						}
						data[dataPath]['data-simply-template'] = target.getAttribute("data-simply-template");
					}
				}

				// timeout so we do this cleanup after all is done;
				window.setTimeout(function() {
					var stashedFields = target.querySelectorAll("[data-simply-stashed]");
					for (i=0; i<stashedFields.length; i++) {
						stashedFields[i].removeAttribute("data-simply-stashed");
					}
				});
				return data;
			},
			keyDownHandler : function(evt) {
				if(evt.ctrlKey && evt.altKey && evt.keyCode == 65) { // ctrl-alt-A
					if (typeof editor.plugins.list.add !== "undefined") {
						editor.plugins.list.add(this);
						evt.preventDefault();
					}
				}
			},
			applyDataSource : function (list, dataSource, listData) {
				if (editor.dataSources[dataSource]) {
					if (editor.dataSources[dataSource].applyOnce && list.dataSourceApplied) {
						return;
					}
					if (list.dataSourceTimer) { // just in case we already have a timer running, don't do things twice;
						window.clearTimeout(list.dataSourceTimer);
					}
					editor.fireEvent("databinding:pause", list);
					if (typeof editor.dataSources[dataSource].set === "function") {
						editor.dataSources[dataSource].set(list, listData);
					}
					if (typeof editor.dataSources[dataSource].load === "function") {
						editor.dataSources[dataSource].load(list, function(result) {
							editor.list.set(list, result);
							editor.responsiveImages.init(list);
							if (typeof hope !== "undefined") {
								editor.editmode.makeEditable(list);
							}
						});
					} else if (editor.dataSources[dataSource].load) {
						editor.list.set(list, editor.dataSources[dataSource].load);
						if (typeof hope !== "undefined") {
							editor.editmode.makeEditable(list);
						}
					}
					// set again, in case we wanted to set data using the result of the load;
					if (typeof editor.dataSources[dataSource].set === "function") {
						editor.dataSources[dataSource].set(list, listData);
					}
					editor.fireEvent("databinding:resume", list);
					list.dataSourceApplied = true;
				} else {
					list.dataSourceTimer = window.setTimeout(function() {editor.list.applyDataSource(list, dataSource, listData);}, 500);
				}
			},
			dataBindingGetter : function() {
				var dataName = this.getAttribute("data-simply-list");
				var dataPath = editor.data.getDataPath(this);
				var stashedFields = this.querySelectorAll("[data-simply-stashed]");
				for (i=0; i<stashedFields.length; i++) {
					stashedFields[i].removeAttribute("data-simply-stashed");
				}
				this.removeAttribute("data-simply-stashed");

				var data = editor.list.get(this);
				return data[dataPath][dataName];
			},
			dataBindingSetter : function(value) {

				var savedBindingParents = editor.bindingParents;
				if (this.dataBinding) {
					editor.bindingParents = this.dataBinding.parentKey.replace(/\/$/,'').split("/");
				}

				if (this.getAttribute('data-simply-data')) {
					editor.list.applyDataSource(this, this.getAttribute('data-simply-data'), value);
				} else {
					editor.list.set(this, value);
				}
				editor.responsiveImages.init(this);

				editor.bindingParents = savedBindingParents;
				if (document.body.getAttribute("data-simply-edit")) {
					var list = this;
					editor.editmode.makeEditable(list);
				}
			},
			initLists : function(data, target) {
				var initList = function(data, list) {
					editor.list.parseTemplates(list);
					var dataPath = editor.data.getDataPath(list);

					if (!data[dataPath]) {
						data[dataPath] = {};
					}

					var savedParentKey = editor.settings.databind.parentKey;
					editor.list.init(list, data[dataPath], true);
					editor.settings.databind.parentKey = savedParentKey;
				};

				var dataLists = target.querySelectorAll("[data-simply-list]");
				var subLists;
				if (target.nodeType == document.DOCUMENT_NODE || target.nodeType == document.DOCUMENT_FRAGMENT_NODE) {
					subLists = target.querySelectorAll("[data-simply-list] [data-simply-list], [data-simply-field] [data-simply-list]");
				} else {
					subLists = target.querySelectorAll(":scope [data-simply-list] [data-simply-list], :scope [data-simply-field] [data-simply-list]"); // use :scope here, otherwise it will also return items that are a part of a outside-scope-list
				}
				for (var i=0; i<dataLists.length; i++) {
					var isSub = false;
					for (var a=0; a<subLists.length; a++) {
						if (dataLists[i] == subLists[a]) {
							isSub = true;
						}
					}
					if (isSub) {
						continue;
					}

					initList(data, dataLists[i]);
				}
				if (target.nodeType == document.ELEMENT_NODE && target.getAttribute("data-simply-list")) {
					initList(data, target);
				}
			},
			fixFirstElementChild : function(clone) {
				if (!("firstElementChild" in clone)) {
					for (var l=0; l<clone.childNodes.length; l++) {
						if (clone.childNodes[l].nodeType == document.ELEMENT_NODE) {
							clone.firstElementChild = clone.childNodes[l];
						}
					}
				}
			},
			parseTemplates : function(list) {
				if (typeof list.templates !== "undefined") {
					return; // we already parsed the templates for this list;
				}

				var dataName = list.getAttribute("data-simply-list");
				var dataPath = editor.data.getDataPath(list);

				list.innerHTML = list.innerHTML; // reset innerHTML to make sure templates are recognized;
				var templates = list.getElementsByTagName("template");

				if (templates.length === 0) {
					console.log("Warning: no list templates found for " + dataName);
				}

				if (typeof list.templates === "undefined") {
					list.templates = {};
				}
				if (typeof list.templateIcons === "undefined") {
					list.templateIcons = {};
				}
				for (var t=0; t<templates.length; t++) {
					var templateName = templates[t].getAttribute("data-simply-template") ? templates[t].getAttribute("data-simply-template") : t;

					// Allow the 'rel' attribute to point to the contents of another (global) template;
					var sourceTemplate = templates[t].getAttribute("rel");
					if (sourceTemplate && document.getElementById(sourceTemplate)) {
						list.templates[templateName] = document.getElementById(sourceTemplate);
					} else {
						list.templates[templateName] = templates[t];
					}
					if (!("content" in list.templates[templateName])) {
						var fragment = document.createDocumentFragment();
						var fragmentNode = document.createElement("FRAGMENT");

						content  = list.templates[templateName].children;
						for (j = 0; j < content.length; j++) {
							fragmentNode.appendChild(content[j].cloneNode(true));
							fragment.appendChild(content[j]);
						}
						list.templates[templateName].content = fragment;
						list.templates[templateName].contentNode = fragmentNode;
					}
					var templateIcon = templates[t].getAttribute("data-simply-template-icon");
					if (templateIcon) {
						list.templateIcons[templateName] = templateIcon;
					}
				}
				while (templates.length) {
					templates[0].parentNode.removeChild(templates[0]);
				}
			},
			init : function(list, dataParent, useDataBinding) {
				editor.list.parseTemplates(list);
				var dataName = list.getAttribute("data-simply-list");

				var dataKeys = dataName.split(".");
				dataName = dataKeys.pop();
				for (var j=0; j<dataKeys.length; j++) {
					if (!dataParent[dataKeys[j]]) {
						dataParent[dataKeys[j]] = {};
					}
					dataParent = dataParent[dataKeys[j]];
					editor.settings.databind.parentKey += dataKeys[j] + "/";
				}

				if (!dataParent[dataName]) {
					dataParent[dataName] = [];
				}
				if (list.dataBinding && list.dataBinding.mode == "field") {
					useDataBinding = false; // this list is already bound as a field, skip dataBinding
				}

				if (dataParent && dataParent[dataName]) {
					if (useDataBinding) {
						if (list.dataBinding) {
							// Check if the existing dataBinding is still for the same path - if not, unbind it;
							if (list.dataBinding.config.dataPath != editor.data.getDataPath(list)) {
								list.dataBinding.unbind(list);
								list.dataBinding = false;
							}
						}
						if (list.dataBinding) {
							editor.list.dataBindingSetter.call(list, dataParent[dataName]);
							list.dataBinding.setData(dataParent);
							list.dataBinding.set(dataParent[dataName]);
							list.dataBinding.resolve(true);
						} else {
							var listDataBinding;
							if (dataParent._bindings_ && dataParent._bindings_[dataName]) {
								listDataBinding = dataParent._bindings_[dataName];
							} else {
								var bindingConfig    = {};
								for (var i in editor.settings.databind) {
									bindingConfig[i] = editor.settings.databind[i];
								}
								// bindingConfig.parentKey = list.getAttribute("data-simply-list") + "/" + j + "/";
								bindingConfig.data   = dataParent;
								bindingConfig.key    = dataName;
								bindingConfig.dataPath = editor.data.getDataPath(list);
								bindingConfig.getter = editor.list.dataBindingGetter;
								bindingConfig.setter = editor.list.dataBindingSetter;
								bindingConfig.mode   = "list";
								bindingConfig.attributeFilter = ["data-simply-selectable", "class", "tabindex", "data-simply-stashed", "contenteditable", "style", "data-simply-list-item"];
								listDataBinding = new dataBinding(bindingConfig);
							}
							listDataBinding.bind(list);
							list.addEventListener("databind:elementresolved", function(evt) {
								editor.list.emptyClass(this);
							});
						}
					} else {
						editor.list.dataBindingSetter.call(list, dataParent[dataName]);
					}
				}

				editor.list.emptyClass(list);
				list.addEventListener("keydown", editor.list.keyDownHandler);
			},
			emptyClass : function(list) {
				var hasChild = false;
				for (var m=0; m<list.childNodes.length; m++) {
					if (
						list.childNodes[m].nodeType == document.ELEMENT_NODE &&
						list.childNodes[m].getAttribute("data-simply-list-item")
					) {
						hasChild = true;
					}
				}
				if (!hasChild) {
					if ("classList" in list) {
						list.classList.add("simply-empty");
					} else {
						list.className += " simply-empty";
					}
				}
			},
			detach : function(list) {
				// Remove the list from the DOM, do all the stuff and reinsert it, so we only redraw once for all our modifications.
				var nextNode = list.nextSibling;
				var listParent = list.parentNode;
				if (listParent) {
					list.reattach = function() {
						listParent.insertBefore(list, nextNode);
						editor.fireEvent("simply-selectable-inserted", document);
					};
					listParent.removeChild(list);
				} else {
					list.reattach = function() {
						editor.fireEvent("simply-selectable-inserted", document);
					};
				}
			},
			clear : function(list) {
				editor.fireEvent("databinding:pause", list);
				// Remove the current list items to replace them with the new data;
				var children = list.querySelectorAll("[data-simply-list-item]");
				for (var i=0; i<children.length; i++) {
					if (children[i].parentNode == list) {
						list.removeChild(children[i]);
					}
				}
				editor.fireEvent("databinding:resume", list);
			},
			initListItem : function(clone, useDataBinding, listDataItem) {
				var k;
				var dataFields = clone.querySelectorAll("[data-simply-field]");
				var savedParentKey = editor.settings.databind.parentKey;

				for (k=0; k<dataFields.length; k++) {
					editor.field.init(dataFields[k], listDataItem, useDataBinding);
					editor.settings.databind.parentKey = savedParentKey;
				}
				if (clone.nodeType == document.ELEMENT_NODE && clone.getAttribute("data-simply-field")) {
					editor.field.init(clone, listDataItem, useDataBinding);
				}

				var dataLists = clone.querySelectorAll("[data-simply-list]");
				for (k=0; k<dataLists.length; k++) {
					editor.list.init(dataLists[k], listDataItem, useDataBinding);
				}
				if (clone.nodeType == document.ELEMENT_NODE && clone.getAttribute("data-simply-list")) {
					editor.list.init(clone, listDataItem, useDataBinding);
				}
			},
			set : function(list, listData) {
				editor.fireEvent("databinding:pause", list);
				editor.list.clear(list);
				editor.list.append(list, listData);
				editor.list.emptyClass(list);
				editor.fireEvent("databinding:resume", list);
			},
			cloneTemplate : function(template) {
				var clone;
				if ("importNode" in document) {
					clone = document.importNode(template.content, true);

					// Grr... android browser imports the nodes, except the contents of subtemplates. Find them and put them back where they belong.
					var originalTemplates = template.content.querySelectorAll("template");
					var importedTemplates = clone.querySelectorAll("template");

					for (i=0; i<importedTemplates.length; i++) {
						importedTemplates[i].innerHTML = originalTemplates[i].innerHTML;
					}
				} else {
					clone = document.createElement("DIV");
					for (e=0; e<template.contentNode.childNodes.length; e++) {
						var clonedNode = template.contentNode.childNodes[e].cloneNode(true);
						clone.appendChild(clonedNode);
					}
				}
				return clone;
			},
			append : function(list, listData) {
				var e,j,l;
				var t, counter;
				var stashedFields, i, newData, dataPath;

				if (!listData) {
					listData = [];
				}
				editor.fireEvent("databinding:pause", list);

				editor.list.detach(list);

				if (list.dataBinding) {
					editor.bindingParents = [list.dataBinding.parentKey + list.dataBinding.key];
				} else {
					editor.bindingParents.push(list.getAttribute("data-simply-list"));
				}

				var listIndex = list.querySelectorAll(":scope > [data-simply-list-item]");

				for (j=0; j<listData.length; j++) {
					if (!listData[j]) {
						continue;
					}

					editor.bindingParents.push(j + listIndex.length);
					var currentBinding = list.dataBinding;
					if (typeof currentBinding !== "undefined") {
						if (currentBinding.mode == "list") {
							if (currentBinding.get() != listData) {
								currentBinding.get().push(listData[j]);
							//	console.log("Appending items to existing data");
							}
						} else {
							console.log("Warning: Can't append list items to a field databinding");
						}
					}

					editor.settings.databind.parentKey = editor.bindingParents.join("/") + "/"; // + list.getAttribute("data-simply-list") + "/" + j + "/";

					var requestedTemplate = listData[j]["data-simply-template"];

					if (!list.templates[requestedTemplate]) {
						for (t in list.templates) {
							requestedTemplate = t;
							break;
						}
						// requestedTemplate = Object.keys(list.templates)[0];
					}

					var clone;
					if ("importNode" in document) {
						clone = document.importNode(list.templates[requestedTemplate].content, true);

						// Grr... android browser imports the nodes, except the contents of subtemplates. Find them and put them back where they belong.
						var originalTemplates = list.templates[requestedTemplate].content.querySelectorAll("template");
						var importedTemplates = clone.querySelectorAll("template");

						for (i=0; i<importedTemplates.length; i++) {
							importedTemplates[i].innerHTML = originalTemplates[i].innerHTML;
						}

						if (list.getAttribute("data-simply-data")) {
							editor.list.initListItem(clone, false, listData[j]);
						} else {
							editor.list.initListItem(clone, true, listData[j]);
						}

						editor.list.fixFirstElementChild(clone);

						counter = 0;
						for (t in list.templates) {
							counter++;
						}
						
						if (counter > 1) {
							clone.firstElementChild.setAttribute("data-simply-template", requestedTemplate);
						}

						clone.firstElementChild.setAttribute("data-simply-list-item", true);
						clone.firstElementChild.setAttribute("data-simply-selectable", true);

						if (list.templateIcons[requestedTemplate]) {
							clone.firstElementChild.setAttribute("data-simply-list-icon", list.templateIcons[requestedTemplate]);
						}
						
						stashedFields = clone.firstElementChild.querySelectorAll("[data-simply-stashed]");
						for (i=0; i<stashedFields.length; i++) {
							stashedFields[i].removeAttribute("data-simply-stashed");
						}

						if (!listData[j]._bindings_) {
							newData = editor.list.get(clone.firstElementChild);
							dataPath = editor.data.getDataPath(clone.firstElementChild);
							editor.data.apply(newData, clone.firstElementChild);
							clone.firstElementChild.simplyData = newData[dataPath]; // optimize: this allows the databinding to cleanly insert the new item;
						}
						if (document.body.getAttribute("data-simply-edit")) {
							editor.editmode.makeEditable(clone);
						}

						list.appendChild(clone);
						editor.list.initLists(listData[j], clone);
					} else {
						for (e=0; e<list.templates[requestedTemplate].contentNode.childNodes.length; e++) {
							clone = list.templates[requestedTemplate].contentNode.childNodes[e].cloneNode(true);
							if (list.getAttribute("data-simply-data")) {
								editor.list.initListItem(clone, false, listData[j]);
							} else {
								editor.list.initListItem(clone, true, listData[j]);
							}
							editor.list.fixFirstElementChild(clone);

							counter = 0;
							for (t in list.templates) {
								counter++;
							}
							if (counter > 1) {
								clone.setAttribute("data-simply-template", requestedTemplate);
							}
							clone.setAttribute("data-simply-list-item", true);
							clone.setAttribute("data-simply-selectable", true);
							
							if (list.templateIcons[requestedTemplate]) {
								clone.firstElementChild.setAttribute("data-simply-list-icon", list.templateIcons[requestedTemplate]);
							}

							stashedFields = clone.querySelectorAll("[data-simply-stashed]");
							for (i=0; i<stashedFields.length; i++) {
								stashedFields[i].removeAttribute("data-simply-stashed");
							}

							if (!listData[j]._bindings_) {
								newData = editor.list.get(clone);
								dataPath = editor.data.getDataPath(clone);
								editor.data.apply(newData, clone);
								clone.simplyData = newData[dataPath]; // optimize: this allows the databinding to cleanly insert the new item;
							}

							if (document.body.getAttribute("data-simply-edit")) {
								editor.editmode.makeEditable(clone);
							}

							list.appendChild(clone);
							editor.list.initLists(listData[j], clone);
						}
					}

					editor.bindingParents.pop();
					editor.settings.databind.parentKey = editor.bindingParents.join("/") + "/"; // + list.getAttribute("data-simply-list") + "/" + j + "/";
				}

				list.setAttribute("data-simply-selectable", true);
				editor.bindingParents.pop();
				editor.settings.databind.parentKey = editor.bindingParents.join("/") + "/"; // + list.getAttribute("data-simply-list") + "/" + j + "/";

				var hasChild = false;
				for (j=0; j<list.childNodes.length; j++) {
					if (
						list.childNodes[j].nodeType == document.ELEMENT_NODE &&
						list.childNodes[j].getAttribute("data-simply-list-item")
					) {
						hasChild = true;
					}
				}
				if ("classList" in list) {
					if (!hasChild) {
						list.classList.add("simply-empty");
					} else {
						list.classList.remove("simply-empty");
					}
				} else {
					if (!hasChild) {
						list.className += " simply-empty";
					} else {
						list.className.replace(/ simply-empty/g, '');
					}
				}
				list.reattach();
				editor.fireEvent("databinding:resume", list);
			}
		},
		field : {
			dataBindingGetter : function() {
				return editor.field.get(this);
			},
			dataBindingSetter : function(value) {
				if (JSON.stringify(editor.field.get(this)) != JSON.stringify(value)) {
					return editor.field.set(this, value);
				}
			},
			fieldTypes : {
				"img" : {
					get : function(field) {
						var result = editor.field.defaultGetter(field, ["src", "class", "alt", "title", ["data-simply-src"]]);
						if (result['data-simply-src']) {
							result.src = result['data-simply-src'];
							delete result['data-simply-src'];
						}
						if (field.simplyString) {
							return result.src;
						}
						return result;
					},
					set : function(field, data) {
						if (typeof data == "string") {
							field.simplyString = true;
							data = {"src" : data};
						}
						if (data) {
							data = JSON.parse(JSON.stringify(data));
							data['data-simply-src'] = data.src;
							delete(data.src);
							editor.field.defaultSetter(field, data);
							editor.responsiveImages.initImage(field);
						}
					},
					makeEditable : function(field) {
						editor.field.initHopeStub(field);
						field.setAttribute("data-simply-selectable", true);
					}
				},
				"iframe" : {
					get : function(field) {
						var result = editor.field.defaultGetter(field, ["src"]);
						if (field.simplyString) {
							return result.src;
						}
						return result;
					},
					set : function(field, data) {
						if (typeof data == "string") {
							field.simplyString = true;
							data = {"src" : data};
						}
						return editor.field.defaultSetter(field, data);
					},
					makeEditable : function(field) {
						field.contentEditable = true;
					}
				},
				"meta" : {
					get : function(field) {
						return editor.field.defaultGetter(field, ["content"]);
					},
					set : function(field, data) {
						return editor.field.defaultSetter(field, data);
					},
					makeEditable : function(field) {
						field.contentEditable = true;
					}
				},
				"a" : {
					get : function(field) {
						var result = editor.field.defaultGetter(field, ["href", "class", "alt", "title", "innerHTML", "name", "rel", "target"]);
						if (result.rel == "nofollow") {
							result.nofollow = true;
						}
						if (result.target == "_blank") {
							result.newwindow = true;
						}
						delete result.rel;
						delete result.target;
						if (field.simplyString) {
							return result.href;
						}
						return result;
					},
					set : function(field, data) {
						if (typeof data == "string") {
							field.simplyString = true;
							return editor.field.defaultSetter(field, {href : data});
						}
						if (typeof data.name == "string") {
							data.id = data.name;
						}
						if (data.newwindow) {
							data.target = "_blank";
						}
						if (data.nofollow) {
							data.rel = "nofollow";
						}
						delete data.newwindow;
						delete data.nofollow;
						return editor.field.defaultSetter(field, data);
					},
					makeEditable : function(field) {
						if (field.getAttribute("data-simply-content") == "fixed") {
							editor.field.initHopeStub(field);
							field.setAttribute("data-simply-selectable", true);
						} else {
							editor.field.initHopeEditor(field);
						}
					}
				},
				"i.fa" : {
					makeEditable : function(field) {
						field.setAttribute("data-simply-selectable", true);
					}
				},
				"title" : {
					makeEditable : function(field) {
						field.contentEditable = true;
					}
				},
				"input[type=text],input:not([type]),input[type=hidden],textarea" : {
					get : function(field) {
						return field.value;
					},
					set : function(field, data) {
						field.value = data;
					}
				},
				"input[type=checkbox]" : {
					get : function(field) {
						if (field.checked) {
							return 1;
						}
						return 0;
					},
					set : function(field, data) {
						if (data) {
							field.checked = true;
						} else {
							field.checked = false;
						}
					}
				},
				"[data-simply-content='template']" : {
					get : function(field) {
						if (editor.data.getDataPath(field) == field.storedPath) {
							return field.storedData;
						}
					},
					set : function(field, data) {
						editor.list.parseTemplates(field);
						field.innerHTML = '';
						if (field.templates[data]) {
							var clone = editor.list.cloneTemplate(field.templates[data]);
							field.appendChild(clone);
							editor.data.apply(editor.currentData, field.firstElementChild);
						}
						field.storedPath = editor.data.getDataPath(field);
						field.storedData = data;
					},
					makeEditable : function(field) {
						return true;
					}
				}
			},
			initHopeEditor : function(field) {
				if (typeof hope === "undefined") {
					window.setTimeout(function() {
						editor.field.initHopeEditor(field);
					}, 300);
					return;
				}
				if (typeof field.hopeEditor !== "undefined") {
					return;
				}

				// This allows us to handle empty-ish fields better; data-simply-hope will get a min-width and min-height, collapsed will get inline-block;
				field.setAttribute('data-simply-hope', true);
				if (getComputedStyle(field).display == "inline" && field.offsetWidth === 0) {
					field.setAttribute('data-simply-collapsed', true);
				}
				if (field.innerHTML.trim() === "") {
					field.innerHTML = "";
				}

				field.hopeContent = document.createElement("textarea");
				field.hopeMarkup = document.createElement("textarea");
				field.hopeRenderedSource = document.createElement("DIV");
				field.hopeEditor = hope.editor.create( field.hopeContent, field.hopeMarkup, field, field.hopeRenderedSource );
				field.hopeEditor.field = field;
				field.hopeEditor.field.addEventListener("DOMCharacterDataModified", function() {
					field.hopeEditor.needsUpdate = true;
				});
				field.addEventListener("slip:beforereorder", function(evt) {
					var rect = this.getBoundingClientRect();
					if (
						this.clickStart &&
						this.clickStart.x > rect.left &&
						this.clickStart.x < rect.right &&
						this.clickStart.y < rect.bottom &&
						this.clickStart.y > rect.top
					) {
						// this will prevent triggering list sorting when using tap-hold on text;
						// the check of the clientrect will allow a click on the list item marker to continue, because it is positioned out of bounds;
						evt.preventDefault(); // this will prevent triggering list sorting when using tap-hold on text;
						return false;
					}
				}, false);
				field.addEventListener("slip:beforeswipe", function(evt) {
					var rect = this.getBoundingClientRect();
					if (
						this.clickStart &&
						this.clickStart.x > rect.left &&
						this.clickStart.x < rect.right &&
						this.clickStart.y < rect.bottom &&
						this.clickStart.y > rect.top
					) {
						// this will prevent triggering list swiping;
						// the check of the clientrect will allow a click on the list item marker to continue, because it is positioned out of bounds;
						evt.preventDefault(); // this will prevent triggering list swiping on text;
						return false;
					}
				}, false);
			},
			initHopeStub : function(field) {
				if (typeof field.hopeEditor !== "undefined") {
					return;
				}
				field.hopeEditor = {
					field : field,
					parseHTML : function(){},
					fragment : {
						has : function() {
							return false;
						}
					},
					getBlockAnnotation : function() {
						return false;
					},
					currentRange : false,
					selection : {
						getRange : function() {
							return false;
						},
						updateRange : function() {}
					},
					update : function() {},
					showCursor : function() {}
				};
			},
			matches : function(el, selector) {
				var p = Element.prototype;
				var f = p.matches || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || function(s) {
					return [].indexOf.call(document.querySelectorAll(s), this) !== -1;
				};
				return f.call(el, selector);
			},
			defaultGetter : function(field, attributes) {
				var result = {};
				for (var i=0; i<attributes.length; i++) {
					attr = attributes[i];
					if (attr == "innerHTML") {
						result.innerHTML = editor.field.getInnerHTML(field);
					} else {
						if (field.getAttribute(attr) !== null) {
							result[attr] = field.getAttribute(attr);
						}
					}
				}

				if (field.getAttribute("data-simply-content") == "fixed") {
					delete result.innerHTML;
				}
				return result;
			},
			defaultSetter : function(field, data) {
				if (typeof data === "string") {
					console.log("Warning: A string was given to a field that expects an object - did you maybe use the same field name on different kinds of elements?");
					return;
				}

				if (field.getAttribute("data-simply-content") == "fixed") {
					delete data.innerHTML;
				}
				for (var attr in data) {
					if (attr == "innerHTML") {
						field.innerHTML = data[attr];
						editor.responsiveImages.init(field);
						if (field.hopeEditor) {
							field.hopeEditor.needsUpdate = true;
						}
					} else {
						if (data[attr] !== null) {
							field.setAttribute(attr, data[attr]);
						} else {
							field.removeAttribute(attr);
						}
					}
				}
			},
			registerType : function(fieldType, getter, setter, editmode) {
				editor.field.fieldTypes[fieldType] = {
					get : getter,
					set : setter,
					makeEditable : editmode
				};
			},
			set : function(field, data) {
				if (typeof data === "undefined") {
					return;
				}
				window.setTimeout(function() {
					editor.fireEvent("selectionchange", document); // fire this after we're done. Using settimeout so it will run afterwards.
				}, 0);
				var setter;
				for (var i in editor.field.fieldTypes) {
					if (editor.field.matches(field, i)) {
						if (typeof editor.field.fieldTypes[i].set === "function") {
							setter = editor.field.fieldTypes[i].set;
						}
					}
				}
				if (setter) {
					return setter(field, data);
				}
				field.innerHTML = data;
				editor.responsiveImages.init(field);
				if (field.hopeEditor) {
					field.hopeEditor.needsUpdate = true;
				}
			},
			getInnerHTML : function(field) {
				// misc cleanups to revert any changes made by simply edit - this should return a pristine version of the content;
				if (!field.querySelectorAll("img[data-simply-src]")) {
					return field.innerHTML;
				} else {
					// There are responsive images in the field; clean them up to return to a pristine state and return that;
					var fieldClone = field.cloneNode(true);
					var responsiveImages = fieldClone.querySelectorAll("img[data-simply-src]");
					for (var i=0; i<responsiveImages.length; i++) {
						responsiveImages[i].removeAttribute("src");
						responsiveImages[i].removeAttribute("sizes");
						responsiveImages[i].removeAttribute("srcset");
					}
					return fieldClone.innerHTML;
				}
			},
			get : function(field) {
				var getter;
				for (var i in editor.field.fieldTypes) {
					if (editor.field.matches(field, i)) {
						if (typeof editor.field.fieldTypes[i].get === "function") {
							getter = editor.field.fieldTypes[i].get;
						}
					}
				}

				if (getter) {
					return getter(field);
				}
				return editor.field.getInnerHTML(field);
			},
			makeEditable : function(field) {
				if (field.dataBinding) {
					field.dataBinding.pauseListeners(field);
					window.setTimeout(function() {
						field.dataBinding.resumeListeners(field);
					});
				}
				var editable;
				for (var i in editor.field.fieldTypes) {
					if (editor.field.matches(field, i)) {
						if (typeof editor.field.fieldTypes[i].makeEditable === "function") {
							editable = editor.field.fieldTypes[i].makeEditable;
						}
					}
				}
				if (editable) {
					return editable(field);
				}
				if (field.getAttribute("data-simply-content") == "fixed") {
					editor.field.initHopeStub(field);
					field.setAttribute("data-simply-selectable", true);
				} else {
					editor.field.initHopeEditor(field);
				}
			},
			init : function(field, dataParent, useDataBinding) {
				var dataName = field.getAttribute("data-simply-field");

				var dataKeys = dataName.split(".");
				dataName = dataKeys.pop();
				for (var j=0; j<dataKeys.length; j++) {
					if (!dataParent[dataKeys[j]]) {
						dataParent[dataKeys[j]] = {};
					}
					dataParent = dataParent[dataKeys[j]];
					editor.settings.databind.parentKey += dataKeys[j] + "/";
				}
				if (
					(typeof dataParent[dataName] === "undefined") ||
					(!dataParent[dataName] && !Object.keys(dataParent).length) ||
					(dataParent[dataName] === null)
				) {
					dataParent[dataName] = editor.field.get(field);
				}
				if (dataParent[dataName] !== null) {
					if (useDataBinding) {
						if (field.dataBinding) {
							// Check if the existing dataBinding is still for the same path - if not, unbind it;
							if (field.dataBinding.config.dataPath != editor.data.getDataPath(field)) {
								field.dataBinding.unbind(field);
								field.dataBinding = false;
							}
						}

						if (field.dataBinding) {
							field.dataBinding.setData(dataParent);
							field.dataBinding.set(dataParent[dataName]);
							field.dataBinding.resolve(true);
						} else {
							var fieldDataBinding;
							if (dataParent._bindings_ && dataParent._bindings_[dataName]) {
								fieldDataBinding = dataParent._bindings_[dataName];
							} else {
								var bindingConfig    = {};
								for (var i in editor.settings.databind) {
									bindingConfig[i] = editor.settings.databind[i];
								}
								// bindingConfig.parentKey = list.getAttribute("data-simply-list") + "/" + j + "/";
								bindingConfig.data   = dataParent;
								bindingConfig.key    = dataName;
								bindingConfig.dataPath = editor.data.getDataPath(field);
								bindingConfig.getter = editor.field.dataBindingGetter;
								bindingConfig.setter = editor.field.dataBindingSetter;
								bindingConfig.mode   = "field";
								bindingConfig.attributeFilter = ["data-simply-selectable", "tabindex", "data-simply-stashed", "contenteditable", "data-simply-list-item"];
								fieldDataBinding = new dataBinding(bindingConfig);
							}
							fieldDataBinding.bind(field);
						}
					} else {
						editor.field.set(field, dataParent[dataName]);
					}
				}
			}
		},
		fireEvent : function(evtname, target, eventData) {
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
		},
		loadBaseStyles : function() {
			var baseStyles = document.createElement("link");
			var cssuri = 'data:text/css,'+ encodeURIComponent(
			'.simply-text-align-left { text-align: left; }'  +
			'.simply-text-align-right { text-align: right; }' +
			'.simply-text-align-center { text-align: center; }' +
			'.simply-text-align-justify { text-align: justify; }' +
			'.simply-image-align-left { float: left; }' +
			'.simply-image-align-right { float: right; }' +
			'.simply-image-align-middle { vertical-align: middle; }' +
			'.simply-image-align-top { vertical-align: top; }' +
			'.simply-image-align-bottom { vertical-align: bottom; }' +
			'.simply-overflow-hidden { overflow: hidden; }' +
			'');
			baseStyles.setAttribute("href", cssuri);
			baseStyles.setAttribute("rel", "stylesheet");
			baseStyles.setAttribute("type", "text/css");
			document.getElementsByTagName("HEAD")[0].appendChild(baseStyles);
		},
		init : function(config) {
			document.createElement("template");
			if (config.toolbars) {
				for (i=0; i<config.toolbars.length; i++) {
					editor.editmode.toolbars.push(config.toolbars[i]);
				}
			}
			editor.loadBaseStyles();

			// convert URL for the endpoint to an absolute path;
			if (typeof config.endpoint !== 'undefined' && config.endpoint) {
				var parser = document.createElement("A");
				parser.href = config.endpoint;
				config.endpoint = parser.href;
			}

			editor.profile = config.profile;
			editor.storage = storage.init(config.endpoint);
			editor.fireEvent("simply-storage-init", document);

			// Add databinding and load data afterwards
			// editor.loadScript(editor.baseURLClean + "simply/databind.js" + (editor.profile == "dev" ? "?t=" + (new Date().getTime()) : "?v=" + editor.version), editor.data.load);
			editor.loadScript(editor.baseURLClean + "simply/databind.js" + "?v=" + editor.version, editor.data.load);
		},
		loadScript : function(src, callback) {
			if (!document.head.querySelector('script[src="'+src+'"]')) {
				var scriptTag = document.createElement("SCRIPT");
				scriptTag.setAttribute("src", src);
				scriptTag.addEventListener("load", function(evt) {
					if (typeof callback === "function") {
						callback();
					}
				});
				document.head.appendChild(scriptTag);
			}
		},
		loadStyleSheet : function(src, attributes) {
			var styleTag = document.createElement("LINK");
			styleTag.setAttribute("rel", "stylesheet");
			styleTag.setAttribute("type", "text/css");
			if (typeof attributes !== 'undefined'){
				for (var key in attributes) {
					styleTag.setAttribute(key, attributes[key]);
				}
			}
			styleTag.href = src;
			document.head.appendChild(styleTag);
		},
		editmode : {
			toolbars : [],
			loadToolbarList : function(toolbarList) {
				var toolbarsContainer = document.querySelector("#simply-editor");

				var url = toolbarList.shift();
				var i;
				var http = new XMLHttpRequest();
				if (editor.profile == "dev") {
					url += "?t=" + (new Date().getTime());
				} else {
					url += "?v=" + editor.version;
				}

				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4) {
						if ((http.status > 199) && (http.status < 300)) { // accept any 2xx http status as 'OK';
							var toolbars = document.createElement("TEMPLATE");
							toolbars.innerHTML = http.responseText;

							if (!("content" in toolbars)) {
								var fragment = document.createDocumentFragment();
								while (toolbars.children.length) {
									fragment.appendChild(toolbars.children[0]);
								}
								toolbars.content = fragment;
							}
							var scriptTags = toolbars.content.querySelectorAll("SCRIPT");
							for (i=0; i<scriptTags.length; i++) {
								scriptTags[i].parentNode.removeChild(scriptTags[i]);
							}

							var toolbarNode = document.importNode(toolbars.content, true);
							var newToolbars = toolbarNode.querySelectorAll(".simply-toolbar,.simply-dialog-body");
							toolbarsContainer.appendChild(toolbarNode);

							for (i=0; i<scriptTags.length; i++) {
								var newNode = document.createElement("SCRIPT");
								if (scriptTags[i].src) {
									newNode.src = scriptTags[i].src;
								}
								if (scriptTags[i].innerHTML) {
									newNode.innerHTML = scriptTags[i].innerHTML;
								}
								document.head.appendChild(newNode);
							}

							for (i=0; i<newToolbars.length; i++) {
								editor.toolbar.init(newToolbars[i]);
							}
						} else {
							console.log("Warning: toolbar did not load.");
						}
						if (toolbarList.length) {
							editor.editmode.loadToolbarList(toolbarList);
						} else {
							editor.fireEvent("simply-toolbars-loaded", document);
						}
					}
				};
				http.send();
			},
			init : function() {
				if (editor.readOnly) {
					alert("Can't start editmode, editor is in read only mode. Do you have private browsing on?");
					return;
				}

				var toolbarsContainer = document.createElement("DIV");
				toolbarsContainer.id = "simply-editor";
				document.body.appendChild(toolbarsContainer);

				var loadToolbars = function() {
					if (!editor.toolbar || (typeof muze === "undefined")) {
						// Main toolbar code isn't loaded yet, delay a bit;
						window.setTimeout(loadToolbars, 100);
						return;
					}

					editor.editmode.loadToolbarList(editor.editmode.toolbars.slice()); // slice to copy the toolbars;
					editor.editmode.toolbarMonitor();
				};

				// Test document import;  make sure we know if importDocument will execute scripts or not;
				editor.brokenImport = true;
				var testTemplate = document.createElement("TEMPLATE");
				testTemplate.innerHTML = "<script> editor.brokenImport = false; </script>";
				if (!("content" in testTemplate)) {
					var fragment = document.createDocumentFragment();
					while(testTemplate.children.length) {
						fragment.appendChild(testTemplate.children[0]);
					}
					testTemplate.content = fragment;
				}

				var testNode = document.importNode(testTemplate.content, true);
				toolbarsContainer.appendChild(testNode);

				// Add slip.js for sortable items;
				editor.loadScript(editor.baseURL + "simply/slip.js" + (editor.profile == "dev" ? "?t=" + (new Date().getTime()) : "?v=" + editor.version));

				// Add hope
				editor.loadScript(editor.baseURL + "hope/hope.packed.js");

				// Add editor stylesheet
				editor.loadStyleSheet(editor.baseURL + "simply/css/editor.v9.css");

				// Add font awesome
				editor.loadStyleSheet("//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.4.0/css/font-awesome.min.css",{
					'integrity': 'sha256-k2/8zcNbxVIh5mnQ52A0r3a6jAgMGxFJFE2707UxGCk=',
					'crossorigin':"anonymous"
				});

				// Add legacy scripts
				editor.loadScript(editor.baseURL + "simply/scripts.js");

				// Add toolbar scripts
				editor.loadScript(editor.baseURL + "simply/toolbars.js");

				var handleBeforeUnload = function(evt) {
					if (editor.editmode.isDirty()) {
						var message = "You have made changes to this page, if you leave these changes will not be saved.";
						evt = evt || window.event;
						// For IE and Firefox prior to version 4
						if (evt) {
							evt.returnValue = message;
						}
						// For Safari
						return message;
					}
				};

				document.body.setAttribute("data-simply-edit", true);

				document.body.onbeforeunload = handleBeforeUnload; // Must do it like this, not with addEventListener;
				editor.fireEvent("simply-editmode", document);	
				loadToolbars();

			},
			makeEditable : function(target) {
				var i;

				var dataFields = target.querySelectorAll("[data-simply-field]");
				for (i=0; i<dataFields.length; i++) {
					editor.field.makeEditable(dataFields[i]);
					// FIXME: Add support to keep fields that point to the same field within the same path in sync here;
				}
				if (target.getAttribute && target.getAttribute("data-simply-field")) {
					editor.field.makeEditable(target);
				}
				document.body.addEventListener("dragover", function(evt) {
					evt.preventDefault();
				});

				var dataLists = target.querySelectorAll("[data-simply-list]");
				for (i=0; i<dataLists.length; i++) {
					dataLists[i].setAttribute("data-simply-selectable", true);
				}

				var handleDblClick = function(evt) {
					if (
						evt.target.pathname
					) {
						var pathname = evt.target.pathname;
						var hostname = evt.target.hostname;
						var extraCheck = true;
						if (typeof editor.storage.checkJail === "function") {
							extraCheck = editor.storage.checkJail(evt.target.href);
						}
							
						if (extraCheck && (hostname == document.location.hostname) && (typeof editor.currentData[evt.target.pathname] == "undefined")) {
							editor.storage.page.save(evt.target.href);
							evt.preventDefault();
						} else {
							// FIXME: check for dirty fields and stash/save the changes
							document.location.href = evt.target.href + "#simply-edit";
						}
					}
				};
				var handleClick = function(event) {
					event.preventDefault();
				};

				target.addEventListener("dblclick", function(event) {
					if (event.target.tagName.toLowerCase() === "a") {
						handleDblClick(event);
					}
				}, true);

				target.addEventListener("click", function(event) {
					if (event.target.tagName.toLowerCase() === "a") {
						if (editor.node.hasSimplyParent(event.target) || editor.node.isSimplyParent(event.target)) {
							handleClick(event);
						}
					}
					if (editor.node.isSimplyParent(event.target)) {
						handleClick(event);
					}
				});

				// FIXME: Have a way to now init plugins as well;
				editor.editmode.sortable(target);
				editor.editmode.textonly(target);

				// Disable object resizing for Firefox;
				document.execCommand("enableObjectResizing", false, false);
			},
			sortable : function(target) {
				if (!window.Slip) {
					window.setTimeout(function() {
						editor.editmode.sortable(target);
					}, 500);

					return;
				}

				var list = target.querySelectorAll("[data-simply-sortable]");
				
				var preventDefault = function(evt) {
					evt.preventDefault();
				};
				
				var addBeforeOrderEvent = function(e) {
					var sublists = this.querySelectorAll("[data-simply-sortable]");
					for (var j=0; j<sublists.length; j++) {
						sublists[j].addEventListener('slip:beforereorder', preventDefault);
						sublists[j].addEventListener('slip:beforeswipe', preventDefault);
					}
				};
				var removeBeforeOrderEvent = function(e) {
					var sublists = this.querySelectorAll("[data-simply-sortable]");
					for (var j=0; j<sublists.length; j++) {
						sublists[j].removeEventListener('slip:beforereorder', preventDefault);
						sublists[j].removeEventListener('slip:beforeswipe', preventDefault);
					}
					return false;
				};

				var removeSelection = function() {
					vdSelectionState.remove();
					window.getSelection().removeAllRanges();
					editor.context.update();
				};
				var slipReorderHandler = function(e) {
					e.target.parentNode.insertBefore(e.target, e.detail.insertBefore);
					window.setTimeout(removeSelection, 1);
					return false;
				};

				for (var i=0; i<list.length; i++) {
					list[i].addEventListener('slip:beforereorder', addBeforeOrderEvent, false);
					list[i].addEventListener('slip:beforeswipe', addBeforeOrderEvent, false);
					list[i].addEventListener('slip:reorder', slipReorderHandler);
					new Slip(list[i]);
				}

				if (typeof document.simplyRemoveBeforeOrderEvent === "undefined") {
					document.simplyRemoveBeforeOrderEvent = removeBeforeOrderEvent;
					document.addEventListener("mouseup", removeBeforeOrderEvent, false);
					document.addEventListener("touchend", removeBeforeOrderEvent, false);
				}
			},
			textonly : function(target) {
				var textonly = target.querySelectorAll("[data-simply-content='text']");
				var preventNodeInsert = function(evt) {
					if (evt.target.tagName) {
						editor.node.unwrap(evt.target);
					}
				};

				for (var i=0; i<textonly.length; i++) {
					textonly[i].addEventListener("DOMNodeInserted", preventNodeInsert);
				}
			},
			isDirty : function() {
				editor.data.stash();
				var newData = localStorage.data;
				var oldData = editor.data.stringify(editor.currentData);
				if (newData != oldData) {
					return true;
				}
				return false;
			},
			stop : function() {
				if (editor.editmode.isDirty()) {
					var message = "You have made changes to this page, if you log out these changes will not be saved. Log out?";
					if (confirm(message)) {
						editor.editmode.isDirty = function() { return false; };
						editor.storage.disconnect(
							function() {
								document.location.href = document.location.href.split("#")[0];
							}
						);
					}
				} else {
					editor.storage.disconnect(
						function() {
							document.location.href = document.location.href.split("#")[0];
						}
					);
				}
			},
			toolbarMonitor : function() {
				var target = document.querySelector('#simply-main-toolbar');
				if (!target) {
					window.setTimeout(editor.editmode.toolbarMonitor, 100);
					return false;
				}

				var setBodyTop = function() {
					var style = document.head.querySelector("#simply-body-top");
					if (!style) {
						style = document.createElement("style");
						style.setAttribute("type", "text/css");

						style.id = "simply-body-top";
						document.head.appendChild(style);
					}
					if (document.getElementById("simply-main-toolbar")) {
						var toolbarHeight = document.getElementById("simply-main-toolbar").offsetHeight;
						style.innerHTML = "html:before { display: block; width: 100%; height: " + toolbarHeight + "px; content: ''; }";
					}
				};

				// create an observer instance
				var observer = new MutationObserver(setBodyTop);

				// configuration of the observer:
				var config = { childList: true, subtree: true, attributes: true, characterData: true };

				// pass in the target node, as well as the observer options
				observer.observe(target, config);

				window.setTimeout(setBodyTop, 100);
			}
		},
		responsiveImages : {
			getEndpoint  : function() {
				var imagesPath = document.querySelector("[data-simply-images]") ? document.querySelector("[data-simply-images]").getAttribute("data-simply-images") : null;
				if (typeof imagesPath !== 'undefined' && imagesPath) {
					var parser = document.createElement("A");
					parser.href = imagesPath;
					imagesPath = parser.href;
				}
				return imagesPath;
			},
			sizes : function(src) {
				return {};
			},
			init : function(target) {
				var images = target.querySelectorAll("img[data-simply-src]");
				for (var i=0; i<images.length; i++) {
					editor.responsiveImages.initImage(images[i]);
				}
			},
			errorHandler : function(evt) {
				if (!this.parentNode) {
					// We no longer exist in the dom;
					return;
				}
				if (this.errorHandled) {
					return;
				}
				var src = this.getAttribute("data-simply-src");

				this.removeAttribute("srcset");
				this.removeAttribute("sizes");
				this.setAttribute("src", src);

				// Bugfix for chrome - the image tag somehow
				// remembers that it is scaled, so now the
				// "natural" size of the image source is a
				// lot bigger than the image really is.
				// Cloning resolves this problem.

				// FIXME: Replacing the element causes a problem for databinding - need to rebind this.
				var clone = this.cloneNode();
				this.parentNode.insertBefore(clone, this.nextSibling); // insert the clone after! the current image to keep the selection;

				if (this.dataBinding) {
					this.dataBinding.rebind(clone);
				}
				this.parentNode.removeChild(this);
				editor.fireEvent("selectionchange", document);
			},
			isInEndpoint : function(imageSrc) {
				if (imageSrc) {
					var parser = document.createElement("A");
					parser.href = imageSrc;
					imageSrc = parser.href;
				}
				var imagesPath = this.getEndpoint();
				if (imagesPath && (imageSrc.indexOf(imagesPath) === 0)) {
					return true;
				}
				return false;
			},
			initImage : function(imgEl) {
				if (editor.responsiveImages.isInDocumentFragment(imgEl)) { // The image is still in the document fragment from the template, and not part of our document yet. This means we can't calculate any styles on it.
					if (!imgEl.simplyResponsiveImageTimer) {
						imgEl.simplyResponsiveImageTimer = window.setTimeout(function() {
							editor.responsiveImages.initImage(imgEl);
						}, 50);
					}
					return;
				}

				var imageSrc = imgEl.getAttribute("data-simply-src");
				if (!imageSrc) {
					return;
				}

				if (typeof imageSrc === "undefined") {
					return;
				}
				var srcSet = [];
				if (editor.responsiveImages.isInEndpoint(imageSrc)) {
					var sizes = editor.responsiveImages.sizes(imageSrc);
					for (var size in sizes) {
						srcSet.push(sizes[size] + " " + size);
					}
				}

				if (imgEl.dataBinding) {
					imgEl.dataBinding.pauseListeners(imgEl);
				}
				imgEl.removeAttribute("srcset");
				imgEl.removeAttribute("sizes");
				imgEl.removeAttribute("src");

				imgEl.removeEventListener("error", editor.responsiveImages.errorHandler);
				imgEl.addEventListener("error", editor.responsiveImages.errorHandler);

				var sizeRatio = editor.responsiveImages.getSizeRatio(imgEl);
				if (sizeRatio > 0) {
					imgEl.setAttribute("sizes", sizeRatio + "vw");
				}
				imgEl.setAttribute("srcset", srcSet.join(", "));
				imgEl.setAttribute("src", imageSrc);

				if (imgEl.dataBinding) {
					imgEl.dataBinding.resumeListeners(imgEl);
				}
				editor.fireEvent("selectionchange", document);
			},
			getSizeRatio : function(imgEl) {
				if (imgEl.dataBinding) {
					imgEl.dataBinding.pauseListeners(imgEl);
				}
				var storedAlt = imgEl.getAttribute("alt");
				var storedSrc = imgEl.getAttribute("src");

				imgEl.setAttribute("alt", "");
				imgEl.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; // transparent 1x1 gif, this forces a redraw of the image thus recalculating its width;
				if (storedSrc) {
					imgEl.setAttribute("src", storedSrc);
				} else {
					imgEl.removeAttribute("src");
				}
				var imageWidth = imgEl.width;
				if (storedAlt) {
					imgEl.setAttribute("alt", storedAlt);
				}
				if (imgEl.dataBinding) {
					imgEl.dataBinding.resumeListeners(imgEl);
				}

				if (imgEl.simplyComputedWidth || imageWidth === 0) {
					imgEl.simplyComputedWidth = true;
					var computed = getComputedStyle(imgEl);

					if (computed.maxWidth) {
						if (computed.maxWidth.indexOf("%") != -1) {
							imageWidth = parseFloat(computed.maxWidth) / 100.0;
							var offsetParent = imgEl.offsetParent ? imgEl.offsetParent : imgEl.parentNode;
							imageWidth = offsetParent.offsetWidth * imageWidth;
						}
						if (computed.maxWidth.indexOf("px") != -1) {
							imageWidth = parseInt(computed.maxWidth);
						}
					}
				}
				var sizeRatio = parseInt(Math.ceil(100 * imageWidth / window.innerWidth));
				return sizeRatio;
			},
			resizeHandler : function() {
				var images = document.querySelectorAll("img[data-simply-src][sizes]");
				for (var i=0; i<images.length; i++) {
					var sizeRatio = editor.responsiveImages.getSizeRatio(images[i]);
					if (sizeRatio > 0) {
						images[i].setAttribute("sizes", sizeRatio + "vw");
					}
				}
			},
			isInDocumentFragment : function(el) {
				var parent = el.parentNode;
				while (parent) {
					if (parent.nodeType === document.DOCUMENT_FRAGMENT_NODE) {
						return true;
					}
					parent = parent.parentNode;
				}
				return false;
			}
		}
	};

	var storage = {
		getType : function(endpoint) {
			if (document.querySelector("[data-simply-storage]")) {
				return document.querySelector("[data-simply-storage]").getAttribute("data-simply-storage");
			}
			if (endpoint === null) {
				endpoint = document.location.href;
			}
			if (endpoint.indexOf("/ariadne/loader.php/") !== -1) {
				return "ariadne";
			} else if (endpoint.indexOf("github.io") !== -1) {
				return "github";
			} else if (endpoint.indexOf("github.com") !== -1) {
				return "github";
			}
			return "default";
		},
		init : function(endpoint) {
			var result;

			var storageType = storage.getType(endpoint);

			if (storage[storageType]) {
				result = storage[storageType];
			} else if (window[storageType]) {
				result = window[storageType];
			} else {
				console.log("Warning: custom storage not found");
			}

			if (!result.escape) {
				result.escape = storage.default.escape;
			}

			if (typeof result.init === "function") {
				result.init(endpoint);
			}
			return result;
		},
		ariadne : {
			init : function(endpoint) {
				if (endpoint === null) {
					endpoint = location.origin + "/";
				}
				this.url = endpoint;
				this.list = storage.default.list;
				this.sitemap = storage.default.sitemap;
				this.listSitemap = storage.default.listSitemap;
				this.disconnect = storage.default.disconnect;
				this.escape = storage.default.escape;
				this.page = storage.default.page;

				this.endpoint = endpoint;
				this.dataEndpoint = endpoint + "data.json";
				this.file = storage.default.file;

				if (editor.responsiveImages) {
					if (
						editor.settings['simply-image'] &&
						editor.settings['simply-image'].responsive
					) {
						if (typeof editor.settings['simply-image'].responsive.sizes === "function") {
							editor.responsiveImages.sizes = editor.settings['simply-image'].responsive.sizes;
						} else if (typeof editor.settings['simply-image'].responsive.sizes === "object") {
							editor.responsiveImages.sizes = (function(sizes) {
								return function(src) {
									var result = {};
									var info = src.split(".");
									var extension = info.pop().toLowerCase();
									if (extension === "jpg" || extension === "png") {
										for (var i=0; i<sizes.length; i++) {
											result[sizes[i] + "w"] = info.join(".") + "-simply-scaled-" + sizes[i] + "." + extension;
										}
									}
									return result;
								};
							}(editor.settings['simply-image'].responsive.sizes));
						}
					} else {
						editor.responsiveImages.sizes = function(src) {
							if (!(src.match(/\.(jpg|png)$/i))) {
								return {};
							}

							return {
								"1200w" : src + "?size=1200",
								"800w" : src + "?size=800",
								"640w" : src + "?size=640",
								"480w" : src + "?size=480",
								"320w" : src + "?size=320",
								"160w" : src + "?size=160",
								"80w" : src + "?size=80"
							};
						};
					}

					window.addEventListener("resize", editor.responsiveImages.resizeHandler);
				}
			},
			save : function(data, callback) {
				return editor.storage.file.save("data.json", data, callback);
			},
			load : function(callback) {
				var http = new XMLHttpRequest();
				var url = editor.storage.dataEndpoint;
				if (editor.profile == "dev") {
					url += "?t=" + (new Date().getTime());
				}

				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4) {
						if ((http.status > 199) && (http.status < 300) && http.responseText.length) { // accept any 2xx http status as 'OK';
							if (http.responseText === "") {
								console.log("Warning: data file found, but empty");
								return callback("{}");
							}
							callback(http.responseText.replace(/data-vedor/g, "data-simply"));
						} else {
							console.log("Could not load data, starting empty.");
							callback("{}");
						}
					}
				};
				http.send();
			},
			connect : function() {
				var url = editor.storage.url + "login";
				var http = new XMLHttpRequest();
				http.open("POST", url, true);
				http.send();
				return true;
			}
		},
		github : {
			repoName : null,
			repoUser : null,
			repoBranch : "gh-pages",
			dataFile : "data.json",
			getRepoInfo : function(endpoint) {
				var result = {};
				var parser = document.createElement('a');
				parser.href = endpoint;

				var pathInfo;
				pathInfo = parser.pathname.split("/");
				if (parser.pathname.indexOf("/") === 0) {
					pathInfo.shift();
				}

				if (parser.hostname == "github.com") {
					result.repoUser = pathInfo.shift();
					result.repoName =  pathInfo.shift();
					result.repoBranch = "master";
				} else {
					//github.io;
					result.repoUser = parser.hostname.split(".")[0];
					result.repoName = pathInfo.shift();
					result.repoBranch = "gh-pages";
				}

				if (document.querySelector("[data-simply-repo-branch]")) {
					result.repoBranch = document.querySelector("[data-simply-repo-branch]").getAttribute("data-simply-repo-branch");
				}
				if (document.querySelector("[data-simply-repo-name]")) {
					result.repoBranch = document.querySelector("[data-simply-repo-name]").getAttribute("data-simply-repo-name");
				}
				if (document.querySelector("[data-simply-repo-user]")) {
					result.repoBranch = document.querySelector("[data-simply-repo-user]").getAttribute("data-simply-repo-user");
				}

				var repoPath = pathInfo.join("/");
				repoPath = repoPath.replace(/\/$/, '');

				result.repoPath = repoPath;
				return result;
			},
			checkJail : function(url) {
				var repo1 = this.getRepoInfo(url);
				var repo2 = this.getRepoInfo(this.endpoint);
				
				
				if (
					(repo1.repoUser == repo2.repoUser) && 
					(repo1.repoName == repo2.repoName) &&
					(repo1.repoBranch == repo2.repoBranch)
				) {
					return true;
				}
				return false;
			},
			init : function(endpoint) {
				if (endpoint === null) {
					endpoint = document.location.href.replace(document.location.hash, "");
				}
				var script = document.createElement("SCRIPT");
				script.src = editor.baseURLClean + "github.js";
				document.head.appendChild(script);

				var repoInfo = this.getRepoInfo(endpoint);
				this.repoUser = repoInfo.repoUser;
				this.repoName = repoInfo.repoName;
				this.repoBranch = repoInfo.repoBranch;

				this.endpoint = endpoint;
				this.dataFile = "data.json";
				this.dataEndpoint = endpoint + "data.json";

				this.sitemap = storage.default.sitemap;
				this.listSitemap = storage.default.listSitemap;
				this.page = storage.default.page;
				this.escape = storage.default.escape;

				if (editor.responsiveImages) {
					if (
						editor.settings['simply-image'] &&
						editor.settings['simply-image'].responsive
					) {
						if (typeof editor.settings['simply-image'].responsive.sizes === "function") {
							editor.responsiveImages.sizes = editor.settings['simply-image'].responsive.sizes;
						} else if (typeof editor.settings['simply-image'].responsive.sizes === "object") {
							editor.responsiveImages.sizes = (function(sizes) {
								return function(src) {
									var result = {};
									var info = src.split(".");
									var extension = info.pop().toLowerCase();
									if (extension === "jpg" || extension === "png") {
										for (var i=0; i<sizes.length; i++) {
											result[sizes[i] + "w"] = info.join(".") + "-simply-scaled-" + sizes[i] + "." + extension;
										}
									}
									return result;
								};
							}(editor.settings['simply-image'].responsive.sizes));
						}
					}
					window.addEventListener("resize", editor.responsiveImages.resizeHandler);
				}
			},
			connect : function() {
				if (typeof Github === "undefined") {
					return false;
				}

				if (!editor.storage.key) {
					editor.storage.key = localStorage.storageKey;
				}
				if (!editor.storage.key) {
					editor.storage.key = prompt("Please enter your authentication key");
				}

				if (editor.storage.validateKey(editor.storage.key)) {
					if (!this.repo) {
						localStorage.storageKey = editor.storage.key;
						this.github = new Github({
							token: editor.storage.key,
							auth: "oauth"
						});
						this.repo = this.github.getRepo(this.repoUser, this.repoName);
					}
					return true;
				} else {
					return editor.storage.connect();
				}
			},
			disconnect : function(callback) {
				delete this.repo;
				delete localStorage.storageKey;
				callback();
			},
			validateKey : function(key) {
				return true;
			},
			save : function(data, callback) {
				var saveCallback = function(err) {
					if (err === null) {
						return callback();
					}

					if (err.error == 401) {
						return callback({message : "Authorization failed.", error: true});
					}
					return callback({message : "SAVE FAILED: Could not store.", error: true});
				};

				this.repo.write(this.repoBranch, this.dataFile, data, "Simply edit changes on " + new Date().toUTCString(), saveCallback);
			},
			load : function(callback) {
				var http = new XMLHttpRequest();
				var url = "https://raw.githubusercontent.com/" + this.repoUser + "/" + this.repoName + "/" + this.repoBranch + "/" + this.dataFile;
				if (editor.profile == "dev") {
					url += "?t=" + (new Date().getTime());
				}
				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4) {
						if ((http.status > 199) && (http.status < 300)) { // accept any 2xx http status as 'OK';
							if (http.responseText === "") {
								console.log("Warning: data file found, but empty");
								return callback("{}");
							}
							callback(http.responseText);
						} else {
							console.log("No data found, starting with empty dataset");
							callback("{}");
						}
					}
				};
				http.send();
			},
			saveTemplate : function(pageTemplate, callback) {
				var dataPath = location.pathname.split(/\//, 3)[2];
				if (dataPath.match(/\/$/)) {
					dataPath += "index.html";
				}

				var repo = this.repo;
				repo.read(this.repoBranch, pageTemplate, function(err, data) {
					if (data) {
						repo.write(this.repoBranch, dataPath, data, pageTemplate + " (copy)", callback);
					}
				});
			},
			list : function(url, callback) {
				if (url.indexOf(editor.storage.dataEndpoint) === 0) {
					return this.listSitemap(url, callback);
				}

				var repoInfo = this.getRepoInfo(url);

				var repoUser = repoInfo.repoUser;
				var repoName = repoInfo.repoName;
				var repoBranch = repoInfo.repoBranch;
				var repoPath = repoInfo.repoPath;

				var github = new Github({});
				var repo = github.getRepo(repoUser, repoName);
				repo.read(repoBranch, repoPath, function(err, data) {
					if (data) {
						data = JSON.parse(data);
						var result = {
							images : [],
							folders : [],
							files : []
						};

						for (var i=0; i<data.length; i++) {
							if (data[i].type == "file") {
								var fileData = {
									url : url + data[i].name,
									src : url + data[i].name,
									name : data[i].name // data[i].download_url
								};
								if (url === editor.storage.endpoint && data[i].name === "data.json") {
									fileData.name = "My pages";
									result.folders.push(fileData);
								} else {
									result.files.push(fileData);
									if (fileData.url.match(/(jpg|gif|png|bmp|tif|svg)$/i)) {
										result.images.push(fileData);
									}
								}
							} else if (data[i].type == "dir") {
								result.folders.push({
									url : url + data[i].path,
									name : data[i].name
								});
							}
						}

						callback(result);
					}
				});
			}
		},
		default : {
			init : function(endpoint) {
				if (endpoint === null) {
					endpoint = location.origin + "/";
				}
				this.url = endpoint;
				this.endpoint = endpoint;
				this.dataPath = "data/data.json";
				this.dataEndpoint = this.url + this.dataPath;

				if (editor.responsiveImages) {
					if (
						editor.settings['simply-image'] &&
						editor.settings['simply-image'].responsive
					) {
						if (typeof editor.settings['simply-image'].responsive.sizes === "function") {
							editor.responsiveImages.sizes = editor.settings['simply-image'].responsive.sizes;
						} else if (typeof editor.settings['simply-image'].responsive.sizes === "object") {
							editor.responsiveImages.sizes = (function(sizes) {
								return function(src) {
									var result = {};
									var info = src.split(".");
									var extension = info.pop().toLowerCase();
									if (extension === "jpg" || extension === "png") {
										for (var i=0; i<sizes.length; i++) {
											result[sizes[i] + "w"] = info.join(".") + "-simply-scaled-" + sizes[i] + "." + extension;
										}
									}
									return result;
								};
							}(editor.settings['simply-image'].responsive.sizes));
						}
					}
					window.addEventListener("resize", editor.responsiveImages.resizeHandler);
				}
			},
			escape : function(path) {
				return path.replace(/[^A-Za-z0-9_\.-]/g, "-");
			},
			file : {
				save : function(path, data, callback) {
					var http = new XMLHttpRequest();
					var url = editor.storage.url + path;

					http.open("PUT", url, true);
					http.withCredentials = true;

					http.onreadystatechange = function() {//Call a function when the state changes.
						if(http.readyState == 4) {
							var saveResult = {};
							if ((http.status > 199) && (http.status < 300)) { // accept any 2xx http status as 'OK';
								saveResult = {path : path, response: http.responseText};
							} else {
								saveResult = {path : path, message : "SAVE FAILED: Could not store.", error: true, response: http.responseText};
							}
							var saveEvent = editor.fireEvent("simply-storage-file-saved", document, saveResult);
							if (!saveEvent.defaultPrevented) {
								callback(saveEvent.data);
							}
						} 
					};
					http.upload.onprogress = function (event) {
						if (event.lengthComputable) {
							var complete = (event.loaded / event.total * 100 | 0);
							var progress = document.querySelector("progress[data-simply-progress='" + editor.storage.escape(path) + "']");
							if (progress) {
								progress.value = progress.innerHTML = complete;
							}
						}
					};

					http.send(data);
				},
				delete : function(path, callback) {
					var http = new XMLHttpRequest();
					var url = editor.storage.url + path;

					http.open("DELETE", url, true);
					http.withCredentials = true;

					http.onreadystatechange = function() {//Call a function when the state changes.
						if(http.readyState == 4) {
							var deleteResult = {};
							if ((http.status > 199) && (http.status < 300)) { // accept any 2xx http status as 'OK';
								deleteResult = {path : path, response: http.responseText};
							} else {
								deleteResult = {path : path, message : "DELETE FAILED: Could not delete.", error: true, response: http.responseText};
							}
							var deleteEvent = editor.fireEvent("simply-storage-file-deleted", document, deleteResult);
							if (!deleteEvent.defaultPrevented) {
								callback(deleteEvent.data);
							}
						}
					};

					http.send();
				}
			},
			save : function(data, callback) {
				return editor.storage.file.save(this.dataPath, data, callback);
			},
			load : function(callback) {
				var http = new XMLHttpRequest();
				var url = editor.storage.dataEndpoint;
				if (editor.profile == "dev") {
					url += "?t=" + (new Date().getTime());
				}
				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4) {
						if ((http.status > 199) && (http.status < 300)) { // accept any 2xx http status as 'OK';
							if (http.responseText === "") {
								console.log("Warning: data file found, but empty");
								return callback("{}");
							}
							callback(http.responseText);
						} else {
							callback("{}");
							console.log("Warning: no data found. Starting with empty set");
						}
					}
				};
				http.send();
			},
			connect : function() {
				var http = new XMLHttpRequest();
				var url = editor.storage.url + "login";
				http.open("POST", url, true);
				http.send();
				return true;
			},
			disconnect : function(callback) {
				delete editor.storage.key;
				delete localStorage.storageKey;

				var http = new XMLHttpRequest();
				var url = editor.storage.url + "logout";
				http.open("GET", url, true, "logout", (new Date()).getTime().toString());
				http.setRequestHeader("Authorization", "Basic ABCDEF");

				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && ((http.status > 399) && (http.status < 500)) ) {
						callback();
					}
				};
				http.send();
			},
			page : {
				save : function(url) {
					history.pushState(null, null, url + "#simply-edit");

					document.body.innerHTML = editor.data.originalBody.innerHTML;
					document.body.removeAttribute("data-simply-edit");

					editor.data.load();
					var openTemplateDialog = function() {
						if (editor.actions['simply-template']) {
							if (!document.getElementById("simply-template")) {
								window.setTimeout(openTemplateDialog, 200);
								return;
							}
							editor.actions['simply-template']();
						} else {
							alert("This page does not exist yet. Save it to create it!");
						}
					};
					openTemplateDialog();
				}
			},
			sitemap : function() {
				var output = {
					children : {},
					name : 'Sitemap'
				};
				for (var i in editor.currentData) {
					var chain = i.split("/");
					chain.shift();
					var lastItem = chain.pop();
					if (lastItem !== "") {
						chain.push(lastItem);
					} else {
						var item = chain.pop();
						if (typeof item === "undefined") {
							item = '';
						}
						chain.push(item + "/");
					}
					
					var currentNode = output.children;
					var prevNode;
					for (var j = 0; j < chain.length; j++) {
						var wantedNode = chain[j];
						var lastNode = currentNode;
						for (var k in currentNode) {
							if (currentNode[k].name == wantedNode) {
								currentNode = currentNode[k].children;
								break;
							}
						}
						// If we couldn't find an item in this list of children
						// that has the right name, create one:
						if (lastNode == currentNode) {
							currentNode[wantedNode] = {
								name : wantedNode,
								children : {}
							};
							currentNode = currentNode[wantedNode].children;
						}
					}
				}
				return output;
			},
			listSitemap : function(url, callback) {
				if (url.indexOf(editor.storage.dataEndpoint) === 0) {
					var subpath = url.replace(editor.storage.dataEndpoint, "");
					var sitemap = editor.storage.sitemap();
					var result = {
						folders : [],
						files : []
					};
					if (subpath !== "") {
						var pathicles = subpath.split("/");
						pathicles.shift();
						for (var i=0; i<pathicles.length; i++) {
							if (sitemap.children[pathicles[i]]) {
								sitemap = sitemap.children[pathicles[i]];
							} else {
								sitemap = {};
								break;
							}
						}
						result.folders.push({
							url : url.replace(/\/[^\/]+$/, ''),
							name : '..'
						});
					} else {
						result.folders.push({
							url : editor.storage.endpoint,
							name : '..'
						});
					}

					for (var j in sitemap.children) {
						if (j=="/") {
							result.files.push({
								url : url + "/",
								name : "Home"
							});
						}

						if (Object.keys(sitemap.children[j].children).length) {
							result.folders.push({
								url : url + "/" + j,
								name : j + "/"
							});
						} else {
							if (j != "/") {
								result.files.push({
									url : url + "/" + j,
									name : j.replace(/\/$/, '')
								});

								if (Object.keys(editor.currentData[(url + "/" + j).replace(editor.storage.dataEndpoint, "")]).length === 0) {
									result.folders.push({
										url : url + "/" + j.replace(/\/$/, ''),
										name : j
									});
								}
							}
						}
					}

					return callback(result);
				}
			},
			list : function(url, callback) {
				if (url.indexOf(editor.storage.dataEndpoint) === 0) {
					return this.listSitemap(url, callback);
				}
				if (url == editor.storage.endpoint) {
					var result = {
						images : [],
						folders : [],
						files : []
					};
					result.folders.push({url : editor.storage.dataEndpoint, name : 'My pages'});
					var parser = document.createElement("A");

					if (document.querySelector("[data-simply-images]")) {
						var imagesEndpoint = document.querySelector("[data-simply-images]").getAttribute("data-simply-images");
						parser.href = imagesEndpoint;
						imagesEndpoint = parser.href;
						result.folders.push({url : imagesEndpoint, name : 'My images'});
					}
					if (document.querySelector("[data-simply-files]")) {
						var filesEndpoint = document.querySelector("[data-simply-files]").getAttribute("data-simply-files");
						parser.href = filesEndpoint;
						filesEndpoint = parser.href;
						result.folders.push({url : filesEndpoint, name : 'My files'});
					}
					return callback(result);
				}

				url += "?t=" + (new Date().getTime());
				var iframe = document.createElement("IFRAME");
				iframe.src = url;
				iframe.style.opacity = 0;
				iframe.style.position = "absolute";
				iframe.style.left = "-10000px";
				iframe.addEventListener("load", function() {
					var result = {
						images : [],
						folders : [],
						files : []
					};

					var images = iframe.contentDocument.body.querySelectorAll("a");
					for (var i=0; i<images.length; i++) {
						href = images[i].getAttribute("href");
						if (href.substring(0, 1) === "?") {
							continue;
						}

						var targetUrl = images[i].href;
						if (href.substring(href.length-1, href.length) === "/") {
							result.folders.push({url : targetUrl, name : images[i].innerHTML});
						} else {
							if (targetUrl === editor.storage.dataEndpoint) {
								result.folders.push({url : targetUrl, name: "My pages"});
							} else {
								result.files.push({url : targetUrl, name : images[i].innerHTML});
								if (targetUrl.match(/(jpg|gif|png|bmp|tif|svg)$/i)) {
									result.images.push({url : targetUrl, name : images[i].innerHTML});
								}
							}
						}
					}

					document.body.removeChild(iframe);
					callback(result);
				});
				document.body.appendChild(iframe);
			}
		}
	};


	editor.actions = {
		"simply-save" : editor.data.save,
		"simply-logout" : editor.editmode.stop
	};

	editor.toolbars = {};
	editor.contextFilters = {};
	editor.plugins = {};
	editor.dataSources = {};

	editor.loadToolbar = function(url) {
		if (!editor.toolbar || (typeof muze === "undefined")) {
			// Main toolbar code isn't loaded yet;
			editor.editmode.toolbars.push(url);
		} else {
			editor.editmode.loadToolbarList([url]);
		}
	};

	editor.addToolbar = function(toolbar) {
		if (toolbar.filter) {
			editor.addContextFilter(toolbar.name, toolbar.filter);
		}
		for (var i in toolbar.actions) {
			editor.actions[i] = toolbar.actions[i];
		}
		editor.toolbars[toolbar.name] = toolbar;
		if (toolbar.init) {
			toolbar.init(editor.settings[toolbar.name]);
		}
	};

	editor.addDataSource = function(name, datasource) {
		editor.dataSources[name] = datasource;
	};

	editor.addContextFilter = function(name, filter) {
		if (!filter.context) {
			filter.context = name;
		}
		if (typeof editor.contextFilters[name] !== "undefined") {
			console.log("Warning: Context filter " + name + " is already defined.");
		}
		editor.contextFilters[name] = filter;
	};
	editor.addAction = function(name, action) {
		editor.actions[name] = action;
	};

	var preventDOMContentLoaded = function(event) {
		event.preventDefault();
		return false;
	};

	if ("addEventListener" in document) {
		document.addEventListener("DOMContentLoaded", preventDOMContentLoaded, true);
		window.addEventListener("load", preventDOMContentLoaded, true);
	}

	if (typeof jQuery !== "undefined") {
		if (typeof jQuery.holdReady === "function") {
			jQuery.holdReady(true);
		}
	}

	document.addEventListener("simply-content-loaded", function(evt) {
		if ("removeEventListener" in document) {
			document.removeEventListener("DOMContentLoaded", preventDOMContentLoaded, true);
			window.removeEventListener("load", preventDOMContentLoaded, true);
		}
			
		editor.fireEvent("DOMContentLoaded", document);
		window.setTimeout(function() {
			editor.fireEvent("load", window);
		}, 100);

		if (typeof jQuery !== "undefined") {
			if (typeof jQuery.holdReady === "function") {
				jQuery.holdReady(false);
			}
		}
	});

	// Add fake window.console for IE8/9
	if (!window.console) console = {log: function() {}};

/*	document.addEventListener("click", function(evt) {
		if (
			evt.target && 
			evt.target.pathname
		) {
			var pathname = evt.target.pathname;
			var hostname = evt.target.hostname;
			if (hostname == document.location.hostname && (typeof editor.currentData[evt.target.pathname] !== "undefined")) {
				history.pushState(null, null, evt.target.href);
				document.body.innerHTML = editor.data.originalBody.innerHTML;
				editor.data.load();
				evt.preventDefault();
			}
		}
	});
*/
	window.editor = editor;
	editor.storageConnectors = storage;

	editor.settings = {};
	// Find custom settings if they are set;
	if (scriptEl.hasAttribute("data-simply-settings")) {
		var customSettings = window[scriptEl.getAttribute("data-simply-settings")];
		if (customSettings) {
			editor.settings = customSettings;
		} else {
			console.log("Warning: data-simply-settings was set, but no settings were found. Starting without them...");
		}
	}

	if (!editor.settings.databind) {
		editor.settings.databind = {};
	}

	if (editor.settings.databind.resolve) {
		var savedResolver = editor.settings.databind.resolve;
		editor.settings.databind.resolve = function() {
			var args = {
				dataBinding : this,
				arguments : arguments
			};
			editor.fireEvent("simply-data-changed", document, args);
			savedResolver.apply(this, arguments);
		};
	} else {
		editor.settings.databind.resolve = function() {
			var args = {
				dataBinding : this,
				arguments : arguments
			};
			editor.fireEvent("simply-data-changed", document, args);
		};
	}

	var defaultToolbars = [
		editor.baseURL + "simply/toolbar.simply-main-toolbar.html",
		editor.baseURL + "simply/toolbar.simply-text.html",
		editor.baseURL + "simply/toolbar.simply-image.html",
		editor.baseURL + "simply/plugin.simply-browse.html",
		editor.baseURL + "simply/toolbar.simply-iframe.html",
		editor.baseURL + "simply/toolbar.simply-selectable.html",
		editor.baseURL + "simply/toolbar.simply-list.html",
		editor.baseURL + "simply/toolbar.simply-icon.html",
		editor.baseURL + "simply/plugin.simply-template.html",
		editor.baseURL + "simply/plugin.simply-save.html",
		editor.baseURL + "simply/plugin.simply-meta.html",
		editor.baseURL + "simply/plugin.simply-htmlsource.html",
		editor.baseURL + "simply/plugin.simply-symbol.html",
		editor.baseURL + "simply/plugin.simply-paste.html",
		editor.baseURL + "simply/plugin.simply-undo-redo.html",
		editor.baseURL + "simply/plugin.simply-keyboard.html",
		editor.baseURL + "simply/plugin.simply-about.html"
	];

	if (typeof editor.settings.plugins === 'object') {
		for(var i=0; i<editor.settings.plugins.length; i++) {
			var toolbarUrl = editor.settings.plugins[i];
			if (toolbarUrl.indexOf("//") < 0) {
				toolbarUrl = editor.baseURL + "simply/" + toolbarUrl;
			}
			defaultToolbars.push(toolbarUrl);
		}
	}

	// Backwards compatibility for pre-0.50;
	editor.data.list = editor.list;
	editor.data.list.applyTemplates = editor.list.set;

	editor.init({
		endpoint : document.querySelector("[data-simply-endpoint]") ? document.querySelector("[data-simply-endpoint]").getAttribute("data-simply-endpoint") : null,
		toolbars : defaultToolbars,
		profile : 'live'
	});
}());
