/*
	Simply edit the Web

	Written by Yvo Brevoort
	Copyright Muze 2015, all rights reserved.
*/
(function() {
	if (window.editor) {
		return;
	}
	var apiKey = document.querySelector("[data-api-key]").getAttribute("data-api-key");
	
	var getBaseURL = function() {
		var scriptEl = (typeof document.currentScript != 'undefined' ? document.currentScript : document.getElementById('SimplyEditScript'));
		var scriptURL = document.createElement('a');
		scriptURL.href = scriptEl.src;
		scriptURL.pathname = scriptURL.pathname.replace('simply-edit.js', '').replace(/\/js\/$/, '/');
		return scriptURL.protocol + '//' + scriptURL.host + scriptURL.pathname;
	};

	var editor = {
	        baseURL : getBaseURL(),
		data : {
			apply : function(data, target) {
				if (typeof editor.data.originalBody === "undefined") {
					editor.data.originalBody = document.body.cloneNode(true);
				}

				var dataFields = target.querySelectorAll("[data-simply-field]");

				for (var i=0; i<dataFields.length; i++) {
					var dataName = dataFields[i].getAttribute("data-simply-field");
					var dataPath = dataFields[i].getAttribute("data-simply-path") ? dataFields[i].getAttribute("data-simply-path") : location.pathname;

					if (data[dataPath] && data[dataPath][dataName]) {
						editor.field.set(dataFields[i], data[dataPath][dataName]);
					}
				}

				editor.data.list.init(data, target);

				if ("removeEventListener" in document) {
					document.removeEventListener("DOMContentLoaded", preventDOMContentLoaded, true);
					window.removeEventListener("load", preventDOMContentLoaded, true);
				}

				var fireEvent = function(evtname, target) {
					var event; // The custom event that will be created
					if (document.createEvent) {
						event = document.createEvent("HTMLEvents");
						event.initEvent(evtname, true, true);
					} else {
						event = document.createEventObject();
						event.eventType = evtname;
					}

					event.eventName = evtname;

					if (document.createEvent) {
						target.dispatchEvent(event);
					} else {
						// target.fireEvent("on" + event.eventType, event);
					}
				};

				
				fireEvent("DOMContentLoaded", document);
				window.setTimeout(function() {
					fireEvent("load", window);
				}, 100);

				if (typeof jQuery !== "undefined") {
					if (typeof jQuery.holdReady === "function") {
						jQuery.holdReady(false);
					}
				}
			},
			get : function(target) {
				var i, j;
				var data = {};
				var dataName, dataPath, dataFields, dataLists, listItems;

				var addListData = function(list) {
					if (list.getAttribute("data-simply-stashed")) {
						return;
					}
					dataName = list.getAttribute("data-simply-list");
					dataPath = list.getAttribute("data-simply-path") ? list.getAttribute("data-simply-path") : location.pathname;

					if (!data[dataPath]) {
						data[dataPath] = {};
					}

					if (!data[dataPath][dataName]) {
						data[dataPath][dataName] = [];
					}

					listItems = list.querySelectorAll("[data-simply-list-item]");
					var counter = 0;
					for (j=0; j<listItems.length; j++) {
						if (listItems[j].parentNode != list) {
							continue;
						}

						if (!data[dataPath][dataName][counter]) {
							data[dataPath][dataName][counter] = {};
						}
						var subData = editor.data.get(listItems[j]);
						for (var subPath in subData) {
							if (subPath != dataPath) {
								console.log("Notice: use of data-simply-path in subitems is not permitted, translated " + subPath + " to " + dataPath);
							}
							data[dataPath][dataName][counter] = subData[subPath];
						}
						// data[dataPath][dataName][counter] = editor.data.get(listItems[j]);
						if (listItems[j].getAttribute("data-simply-template")) {
							data[dataPath][dataName][counter]['data-simply-template'] = listItems[j].getAttribute("data-simply-template");
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
								data : data[dataPath][dataName]
							});

							if (typeof editor.dataSources[dataSource].get === "function") {
								data[dataPath][dataName] = editor.dataSources[dataSource].get(list);
							}
						}
					}
				};

				var addData = function(field) {
					if (field.getAttribute("data-simply-stashed")) {
						return;
					}

					dataName = field.getAttribute("data-simply-field");
					dataPath = field.getAttribute("data-simply-path") ? field.getAttribute("data-simply-path") : location.pathname;

					if (!data[dataPath]) {
						data[dataPath] = {};
					}

					data[dataPath][dataName] = editor.field.get(field);
					field.setAttribute("data-simply-stashed", 1);
				};

				if (target.nodeType == 1 && target.getAttribute("data-simply-list")) {
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
				if (target.nodeType == 1 && target.getAttribute("data-simply-field")) {
					addData(target);
				}

				return data;
			},
			merge : function(data, newData) {
				// target, src) {
				for (var path in newData) {
					if (typeof data[path] === "undefined") {
						data[path] = newData[path];
					} else {
						for (var field in newData[path]) {
							data[path][field] = newData[path][field];
						}
					}
				}
				return data;
			},
			stash : function() {
				var data = {};
				var dataName, dataPath, dataFields;
				var i, j, k, subKey;
				var dataSource;
				if (localStorage.data) {
					data = JSON.parse(localStorage.data);
				}

				var stashedFields = document.querySelectorAll("[data-simply-stashed]");
				for (i=0; i<stashedFields.length; i++) {
					stashedFields[i].removeAttribute("data-simply-stashed");
				}

				for (dataSource in editor.dataSources) {
					if (editor.dataSources[dataSource].stash) {
						delete editor.dataSources[dataSource].stash;
					}
				}

				var newData = editor.data.get(document);
				
				for (dataSource in editor.dataSources) {
					if (typeof editor.dataSources[dataSource].merge === "function") {
						newData = editor.dataSources[dataSource].merge(newData);
					}
				}
				
				data = editor.data.merge(data, newData);
				localStorage.data = editor.data.stringify(data);
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
					editor.storage.save(localStorage.data, function(result) {
						if (result && result.message) {
							if (editor.actions['simply-aftersave-error']) {
								editor.actions['simply-aftersave-error'](result.message);
							} else {
								alert("Error saving: " + result.message);
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
				} 
			},
			load : function() {
				document.body.style.opacity = 0;

				editor.storage.load(function(data) {
					document.body.style.opacity = 1;
					localStorage.data = data;
					editor.currentData = JSON.parse(data);
					editor.data.apply(editor.currentData, document);

					var checkEdit = function() {
						if (document.location.hash == "#simply-edit") {
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
			},
			list : {
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
						if (typeof editor.dataSources[dataSource].set === "function") {
							editor.dataSources[dataSource].set(list, listData);
						}
						if (typeof editor.dataSources[dataSource].load === "function") {
							editor.dataSources[dataSource].load(list, function(result) {
								editor.data.list.applyTemplates(list, result);
								if (typeof hope !== "undefined") {
									editor.editmode.makeEditable(list);
								}
							});
						} else if (editor.dataSources[dataSource].load) {
							editor.data.list.applyTemplates(list, editor.dataSources[dataSource].load);
							if (typeof hope !== "undefined") {
								editor.editmode.makeEditable(list);
							}
						}
					} else {
						window.setTimeout(function() {editor.data.list.applyDataSource(list, dataSource, listData);}, 500);
					}
				},
				init : function(data, target) {
					var dataName, dataPath;
					var dataLists = target.querySelectorAll("[data-simply-list]");


					for (var i=0; i<dataLists.length; i++) {
						dataLists[i].innerHTML = dataLists[i].innerHTML; // reset innerHTML to make sure templates are recognized;

						editor.data.list.parseTemplates(dataLists[i]);
						dataName = dataLists[i].getAttribute("data-simply-list");
						dataPath = dataLists[i].getAttribute("data-simply-path") ? dataLists[i].getAttribute("data-simply-path") : location.pathname;

						var dataSource = dataLists[i].getAttribute("data-simply-data");
						if (dataSource !== null) {
							var listData = {};
							if (data && data[dataPath] && data[dataPath][dataName]) {
								listData = data[dataPath][dataName];
							}
				
							editor.data.list.applyDataSource(dataLists[i], dataSource, listData);
						} else if (data[dataPath] && data[dataPath][dataName]) {
							editor.data.list.applyTemplates(dataLists[i], data[dataPath][dataName]);
						}

						var hasChild = false;
						for (var j=0; j<dataLists[i].childNodes.length; j++) {
							if (
								dataLists[i].childNodes[j].nodeType == 1 && 
								dataLists[i].childNodes[j].getAttribute("data-simply-list-item")
							) {
								hasChild = true;
							}
						}
						if (!hasChild) {
							if ("classList" in dataLists[i]) {
								dataLists[i].classList.add("simply-empty");
							} else {
								dataLists[i].className += " simply-empty";
							}
						}

						if ("addEventListener" in dataLists[i]) {
							dataLists[i].addEventListener("keydown", editor.data.list.keyDownHandler);
						}
					}
				},
				fixFirstElementChild : function(clone) {
					if (!("firstElementChild" in clone)) {
						for (var l=0; l<clone.childNodes.length; l++) {
							if (clone.childNodes[l].nodeType == 1) {
								clone.firstElementChild = clone.childNodes[l];
							}
						}
					}
				},
				parseTemplates : function(list) {
					var dataName = list.getAttribute("data-simply-list");
					var dataPath = list.getAttribute("data-simply-path") ? list.getAttribute("data-simply-path") : location.pathname;

//					var templates = list.querySelectorAll("template");
					var templates = list.getElementsByTagName("template");

					if (typeof list.templates === "undefined") {
						list.templates = {};
					}
					for (var t=0; t<templates.length; t++) {
						var templateName = templates[t].getAttribute("data-simply-template") ? templates[t].getAttribute("data-simply-template") : t;

//						list.templates[templateName] = templates[t].cloneNode(true);
						list.templates[templateName] = templates[t];
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
					}
					while (templates.length) {
						templates[0].parentNode.removeChild(templates[0]);
					}
				},
				applyTemplates : function(list, listData) {
					var e,j,k,l;
					var dataName;
					var t, counter;

					var initFields = function(clone) {

						var handleFields = function(elm) {
							dataName = elm.getAttribute("data-simply-field");
							if (listData[j][dataName]) {
								editor.field.set(elm, listData[j][dataName]);
							}
						};

						var handleLists = function(elm) {
							editor.data.list.parseTemplates(elm);
							dataName = elm.getAttribute("data-simply-list");

							var dataSource = elm.getAttribute("data-simply-data");
							if (dataSource !== null) {
								editor.data.list.applyDataSource(elm, dataSource, listData[j][dataName]);
							} else if (listData[j][dataName]) {
								editor.data.list.applyTemplates(elm, listData[j][dataName]);
							}

							var hasChild = false;
							for (var m=0; m<elm.childNodes.length; m++) {
								if (
									elm.childNodes[m].nodeType == 1 &&
									elm.childNodes[m].getAttribute("data-simply-list-item")
								) {
									hasChild = true;
								}
							}
							if (!hasChild) {
								if ("classList" in elm) {
									elm.classList.add("simply-empty");
								} else {
									elm.className += " simply-empty";
								}
							}
						};

						var dataName;
						var dataFields = clone.querySelectorAll("[data-simply-field]");
						for (k=0; k<dataFields.length; k++) {
							handleFields(dataFields[k]);
						}
						if (clone.nodeType == 1 && clone.getAttribute("data-simply-field")) {
							handleFields(clone);
						}

						var dataLists = clone.querySelectorAll("[data-simply-list]");
						for (k=0; k<dataLists.length; k++) {
							handleLists(dataLists[k]);
						}
						if (clone.nodeType == 1 && clone.getAttribute("data-simply-list")) {
							handleLists(clone);
						}
					};

					for (j=0; j<listData.length; j++) {
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

							for (var i=0; i<importedTemplates.length; i++) {
								importedTemplates[i].innerHTML = originalTemplates[i].innerHTML;
							}

							initFields(clone);
		
							editor.data.list.fixFirstElementChild(clone);

							counter = 0;
							for (t in list.templates) {
								counter++;
							}
							
							if (counter > 1) {
								clone.firstElementChild.setAttribute("data-simply-template", requestedTemplate);
							}

							clone.firstElementChild.setAttribute("data-simply-list-item", true);
							clone.firstElementChild.setAttribute("data-simply-selectable", true);
							list.appendChild(clone);
							editor.data.list.init(listData[j], clone);
						} else {
							for (e=0; e<list.templates[requestedTemplate].contentNode.childNodes.length; e++) {
								clone = list.templates[requestedTemplate].contentNode.childNodes[e].cloneNode(true);
								initFields(clone);
								editor.data.list.fixFirstElementChild(clone);

								counter = 0;
								for (t in list.templates) {
									counter++;
								}
								if (counter > 1) {
									clone.setAttribute("data-simply-template", requestedTemplate);
								}
								clone.setAttribute("data-simply-list-item", true);
								clone.setAttribute("data-simply-selectable", true);

								list.appendChild(clone);
								editor.data.list.init(listData[j], clone);
							}
						}
					}
					list.setAttribute("data-simply-selectable", true);

					var hasChild = false;
					for (j=0; j<list.childNodes.length; j++) {
						if (
							list.childNodes[j].nodeType == 1 && 
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
				}
			}
		},
		field : {
			fieldTypes : {
				"img" : {
					get : function(field) {
						return editor.field.defaultGetter(field, ["src", "class", "alt", "title"]);
					},
					set : function(field, data) {
						if (typeof data == "string") {
								data = {"src" : data};
						}
						return editor.field.defaultSetter(field, data);
					},
					makeEditable : function(field) {
						field.setAttribute("data-simply-selectable", true);
					}
				},
				"iframe" : {
					get : function(field) {
						return editor.field.defaultGetter(field, ["src"]);
					},
					set : function(field, data) {
						if (typeof data == "string") {
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
						return editor.field.defaultGetter(field, ["href", "class", "alt", "title", "innerHTML"]);
					},
					set : function(field, data) {
						return editor.field.defaultSetter(field, data);
					},
					makeEditable : function(field) {
						field.hopeContent = document.createElement("textarea");
						field.hopeMarkup = document.createElement("textarea");
						field.hopeRenderedSource = document.createElement("DIV");
						field.hopeEditor = hope.editor.create( field.hopeContent, field.hopeMarkup, field, field.hopeRenderedSource );
						field.hopeEditor.field = field;
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
				}
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
						result.innerHTML = field.innerHTML;
					} else {
						if (field.getAttribute(attr)) {
							result[attr] = field.getAttribute(attr);
						}
					}
				}
				return result;
			},
			defaultSetter : function(field, data) {
				for (var attr in data) {
					if (attr == "innerHTML") {
						field.innerHTML = data[attr];
					} else {
						field.setAttribute(attr, data[attr]);
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
				for (var i in editor.field.fieldTypes) {
					if (editor.field.matches(field, i)) {
						if (typeof editor.field.fieldTypes[i].set === "function") {
							return editor.field.fieldTypes[i].set(field, data);
						}
					}
				}

				field.innerHTML = data;
			},
			get : function(field) {
				for (var i in editor.field.fieldTypes) {
					if (editor.field.matches(field, i)) {
						if (typeof editor.field.fieldTypes[i].get === "function") {
							return editor.field.fieldTypes[i].get(field);
						}
					}
				}

				return field.innerHTML;
			},
			makeEditable : function(field) {
				for (var i in editor.field.fieldTypes) {
					if (editor.field.matches(field, i)) {
						if (typeof editor.field.fieldTypes[i].makeEditable === "function") {
							return editor.field.fieldTypes[i].makeEditable(field);
						}
					}
				}

				field.hopeContent = document.createElement("textarea");
				field.hopeMarkup = document.createElement("textarea");
				field.hopeRenderedSource = document.createElement("DIV");
				field.hopeEditor = hope.editor.create( field.hopeContent, field.hopeMarkup, field, field.hopeRenderedSource );
				field.hopeEditor.field = field;
			}
		},
		loadBaseStyles : function() {
			var baseStyles = document.createElement("link");
			baseStyles.setAttribute("href", editor.baseURL + "simply/simply-base.css");
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

			editor.profile = config.profile;
			editor.storage = storage.init(config.endpoint);
			editor.data.load();
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
				}
				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4) {
						if (http.status == 200) {
							var toolbars = document.createElement("TEMPLATE");
							toolbars.innerHTML = http.responseText;

							if (!("content" in toolbars)) {
								var fragment = document.createDocumentFragment();
								while (toolbars.children.length) {
									fragment.appendChild(toolbars.children[0]);
								}
								toolbars.content = fragment;
							}
							var toolbarNode = document.importNode(toolbars.content, true);
							if (editor.brokenImport) {
								editor.importScripts = true;
							}
							if (editor.importScripts) {
								var scriptTags = toolbars.content.querySelectorAll("SCRIPT");
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
							}

							var newToolbars = toolbarNode.querySelectorAll(".simply-toolbar,.simply-dialog-body");
							for (i=0; i<newToolbars.length; i++) {
								editor.toolbar.init(newToolbars[i]);
							}
							toolbarsContainer.appendChild(toolbarNode);
						}
						if (toolbarList.length) {
							editor.editmode.loadToolbarList(toolbarList);
						}
					}
				};
				http.send();
			},
			init : function() {
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

				var addScript = function(src) {
					if (!document.head.querySelector('script[src="'+src+'"]')) {
						var scriptTag = document.createElement("SCRIPT");
						scriptTag.setAttribute("src", src);
						document.head.appendChild(scriptTag);
					}
				};

				var addStyleSheet = function(src) {
					var styleTag = document.createElement("LINK");
					styleTag.setAttribute("rel", "stylesheet");
					styleTag.setAttribute("type", "text/css");
					styleTag.href = src;
					document.head.appendChild(styleTag);
				};

				// Add slip.js for sortable items;
				addScript(editor.baseURL + "simply/slip.js" + (editor.profile == "dev" ? "?t=" + (new Date().getTime()) : ""));

				// Add hope
				addScript(editor.baseURL + "hope/hope.packed.js");

				// Add editor stylesheet
				addStyleSheet(editor.baseURL + "simply/css/editor.v9.css");

				// Add font awesome
				addStyleSheet("//netdna.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css");

				// Add legacy scripts
				addScript(editor.baseURL + "simply/scripts.js");

				// Add toolbar scripts
				addScript(editor.baseURL + "simply/toolbars.js");

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

				document.body.onbeforeunload = handleBeforeUnload; // Must do it like this, not with addEventListener;
				
				loadToolbars();

			},
			makeEditable : function(target) {
				var i;

				var dataFields = target.querySelectorAll("[data-simply-field]");

				for (i=0; i<dataFields.length; i++) {
					editor.field.makeEditable(dataFields[i]);

					// FIXME: Add support to keep fields that point to the same field within the same path in sync here;
				}

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
							history.pushState(null, null, evt.target.href + "#simply-edit");
					
							document.body.innerHTML = editor.data.originalBody.innerHTML;
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
						handleClick(event);
					}
				});

				var images = target.querySelectorAll("img[data-simply-field]");
				var imageDrop = function(event) {
					var imageData = event.dataTransfer.getData("text/html");

					var container = document.createElement("DIV");
					container.innerHTML = imageData;
					
					var image = container.querySelector("img");

					if (image && image.getAttribute("src")) {
						this.src = image.getAttribute("src");
					}
					if (event.stopPropagation) {
						event.stopPropagation(); // stops the browser from redirecting.
					}
					event.preventDefault();
				};

				for (i=0; i<images.length; i++) {
					images[i].addEventListener("drop", imageDrop);
					images[i].contentEditable = true; // needs to be true for drop event?
					images[i].setAttribute("data-simply-selectable", true);
				}

				// FIXME: Have a way to now init plugins as well;
				editor.editmode.sortable(target);
				editor.editmode.textonly(target);
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
					}
				};
				var removeBeforeOrderEvent = function(e) {
					var sublists = this.querySelectorAll("[data-simply-sortable]");
					for (var j=0; j<sublists.length; j++) {
						sublists[j].removeEventListener('slip:beforereorder', preventDefault);
					}
					return false;
				};

				for (var i=0; i<list.length; i++) {
					list[i].addEventListener('slip:beforereorder', addBeforeOrderEvent, false);
					list[i].addEventListener('slip:reorder', function(e) {
						e.target.parentNode.insertBefore(e.target, e.detail.insertBefore);
						return false;
					});

					new Slip(list[i]);
				}
				document.addEventListener("mouseup", removeBeforeOrderEvent, false);
				document.addEventListener("touchend", removeBeforeOrderEvent, false);
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
				editor.storage.disconnect();
				document.location.href = document.location.href.split("#")[0];
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
		}
	};

	var storage = {
		getType : function(endpoint) {
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

			if (document.querySelector("[data-simply-storage]")) {
				var storageName = document.querySelector("[data-simply-storage]").getAttribute("data-simply-storage");
				if (window[storageName]) {
					result = window[storageName];
				} else {
					console.log("Warning: custom storage not found");
				}
			} else {
				var storageType = storage.getType(endpoint);
				if (!storage[storageType]) {
					storageType = "default";
				}
				result = storage[storageType];
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

				this.endpoint = endpoint;
			},
			save : function(data, callback) {
				var http = new XMLHttpRequest();
				var url = editor.storage.url + "data.json";

				http.open("PUT", url, true);
				http.withCredentials = true;

				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						callback();
					}
				};
				http.send(data);
			},
			load : function(callback) {
				var http = new XMLHttpRequest();
				var url = editor.storage.url + "data.json";
				if (editor.profile == "dev") {
					url += "?t=" + (new Date().getTime());
				}
				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						callback(http.responseText.replace(/data-vedor/g, "data-simply"));
					}
				};
				http.send();
			},
			connect : function() {
				return true;
			},
			disconnect : function() {
				delete editor.storage.key;
				delete localStorage.storageKey;
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
				script.src = "http://se-cdn.muze.nl/github.js";
				document.head.appendChild(script);

				var repoInfo = this.getRepoInfo(endpoint);
				this.repoUser = repoInfo.repoUser;
				this.repoName = repoInfo.repoName;
				this.repoBranch = repoInfo.repoBranch;

				this.endpoint = endpoint;
				this.dataFile = "data.json";

				this.sitemap = storage.default.sitemap;
				this.listSitemap = storage.default.listSitemap;
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
			disconnect : function() {
				delete this.repo;
				delete localStorage.storageKey;
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
						return callback({message : "Authorization failed."});
					}
					return callback({message : "Could not store."});
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
					if(http.readyState == 4 && http.status == 200) {
						callback(http.responseText);
					}
					if(http.readyState == 4 && http.status == 404) {
						callback("{}");
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
				if (url.indexOf(editor.storage.endpoint + "data.json") === 0) {
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
									if (fileData.url.match(/(jpg|gif|png|bmp|tif|svg)$/)) {
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
			},
			save : function(data, callback) {
				var http = new XMLHttpRequest();
				var url = editor.storage.url + "data/data.json";

				http.open("PUT", url, true);
				//Send the proper header information along with the request
				http.setRequestHeader("Content-type", "application/json");
				http.setRequestHeader("charset", "UTF-8");

				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						callback();
					}
				};
				http.send(data);
			},
			load : function(callback) {
				var http = new XMLHttpRequest();
				var url = editor.storage.url + "data/data.json";
				if (editor.profile == "dev") {
					url += "?t=" + (new Date().getTime());
				}
				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						callback(http.responseText);
					} else if (http.readyState == 4 && http.status == 404) {
                                                callback("{}");
                                        }
				};
				http.send();
			},
			connect : function() {
				return true;
			},
			disconnect : function() {
				delete editor.storage.key;
				delete localStorage.storageKey;
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
				if (url.indexOf(editor.storage.endpoint + "data.json") === 0) {
					var subpath = url.replace(editor.storage.endpoint + "data.json", "");
					var sitemap = editor.storage.sitemap();
					var result = {
						folders : [],
						files : []
					};
					if (subpath !== "") {
						var pathicles = subpath.split("/");
						pathicles.shift();
						for (var i=0; i<pathicles.length; i++) {
							sitemap = sitemap.children[pathicles[i]];
						}
						result.folders.push({
							url : url.replace(/\/[^\/]+$/, ''),
							name : 'Parent'
						});
					} else {
						result.folders.push({
							url : url.replace(/\/[^\/]+$/, '/'),
							name : 'Parent'
						});
					}

					for (var j in sitemap.children) {
						if (Object.keys(sitemap.children[j].children).length) {
							result.folders.push({
								url : url + "/" + j,
								name : j
							});
						} else {
							result.files.push({
								url : url + "/" + j,
								name : j
							});
						}
					}

					return callback(result);
				}
			},
			list : function(url, callback) {
				if (url.indexOf(editor.storage.endpoint + "data.json") === 0) {
					return this.listSitemap(url, callback);
				}

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
							if (targetUrl === editor.storage.endpoint + "data.json") {
								result.folders.push({url : targetUrl, name: "My pages"});
							} else {
								result.files.push({url : targetUrl});
								if (targetUrl.match(/(jpg|gif|png|bmp|tif|svg)$/)) {
									result.images.push({url : targetUrl});
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
	editor.settings = document.querySelector("[data-simply-settings]") ? window[document.querySelector("[data-simply-settings]").getAttribute("data-simply-settings")] : {};

	editor.init({
		endpoint : document.querySelector("[data-simply-endpoint]") ? document.querySelector("[data-simply-endpoint]").getAttribute("data-simply-endpoint") : null,
		toolbars : [
			editor.baseURL + "simply/toolbar.simply-main-toolbar.html",
			editor.baseURL + "simply/toolbar.simply-text.html",
			editor.baseURL + "simply/toolbar.simply-image.html",
			editor.baseURL + "simply/plugin.simply-image-browse.html",
			editor.baseURL + "simply/plugin.simply-file-browse.html",
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
			editor.baseURL + "simply/plugin.simply-keyboard.html"
		],
		profile : 'beta'
	});
}());
