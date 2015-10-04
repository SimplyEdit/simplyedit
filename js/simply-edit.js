/*
	Vedor editor - Simply edit the Web

	Written by Yvo Brevoort
	Copyright Muze 2015, all rights reserved.
*/
(function() {
	var editor = {
		baseURL : "http://yvo.muze.nl/simply-edit/",
		storage : {
			url : 'http://yvo.muze.nl/ariadne/loader.php/system/users/yvo/simply-edit-data/',
			save : function(data, callback) {
				var http = new XMLHttpRequest();
				var url = editor.storage.url + "save";
				var params = "data=" + escape(data);
				params += "&key=" + editor.storage.key;

				http.open("POST", url, true);
				//Send the proper header information along with the request
				http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
				       		callback();
					}
				};
				http.send(params);
			},
			load : function(callback) {
				var http = new XMLHttpRequest();
				var url = editor.storage.url + "get";
				url += "?t=" + (new Date().getTime());

				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						callback(http.responseText);
					}
				};
				http.send();
			},
			validateKey : function(key) {
				if (key == "demo") {
					return true;
				}
				if (key == "08716d61df433e26cd4b540c22b147e243f8443b") {
					return true;
				}
			},
			connect : function() {
				if (!editor.storage.key) {
					editor.storage.key = localStorage.storageKey;
				}
				if (!editor.storage.key) {
					editor.storage.key = prompt("Please enter your authentication key");
				}

				if (editor.storage.validateKey(editor.storage.key)) {
					localStorage.storageKey = editor.storage.key;
					return true;
				} else {
					delete localStorage.storageKey;
					return editor.storage.connect();
				}
			},
			disconnect : function() {
				delete editor.storage.key;
				delete localStorage.storageKey;
			}
		},
		data : {
			apply : function(data, target) {
				if (typeof editor.data.originalBody === "undefined") {
					editor.data.originalBody = document.body.cloneNode(true);
				}

				var dataFields = target.querySelectorAll("[data-vedor-field]");
				for (var i=0; i<dataFields.length; i++) {
					var dataName = dataFields[i].getAttribute("data-vedor-field");
					var dataPath = dataFields[i].getAttribute("data-vedor-path") ? dataFields[i].getAttribute("data-vedor-path") : location.pathname;

					if (data[dataPath] && data[dataPath][dataName]) {
						editor.field.set(dataFields[i], data[dataPath][dataName]);
					}
				}

				editor.data.list.init(data, target);

				document.removeEventListener("DOMContentLoaded", preventDOMContentLoaded, true);
				window.removeEventListener("load", preventDOMContentLoaded, true);

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
						target.fireEvent("on" + event.eventType, event);
					}
				};

				fireEvent("DOMContentLoaded", document);
				window.setTimeout(function() {
					fireEvent("load", window);
				}, 100);

				if (typeof jQuery !== "undefined") {
					jQuery.holdReady(false);
				}
			},
			get : function(target) {
				var i, j;
				var data = {};
				var dataName, dataPath, dataFields, dataLists, listItems;

				target.dataset.vedorGetData = 1;

				dataLists = target.parentNode.querySelectorAll(":scope [data-vedor-get-data][data-vedor-list],:scope [data-vedor-get-data] [data-vedor-list]");
				for (i=0; i<dataLists.length; i++) {
					if (dataLists[i].dataset.vedorStashed) {
						continue;
					}
					dataName = dataLists[i].dataset.vedorList;
					dataPath = dataLists[i].dataset.vedorPath ? dataLists[i].dataset.vedorPath : location.pathname;

					if (!data[dataPath]) {
						data[dataPath] = {};
					}

					if (!data[dataPath][dataName]) {
						data[dataPath][dataName] = [];
					}

					listItems = dataLists[i].querySelectorAll(":scope > [data-vedor-list-item]");
					for (j=0; j<listItems.length; j++) {
						if (!data[dataPath][dataName][j]) {
							data[dataPath][dataName][j] = {};
						}
						var subData = editor.data.get(listItems[j]);
						for (var subPath in subData) {
							if (subPath != dataPath) {
								console.log("Notice: use of data-vedor-path in subitems is not permitted, translated " + subPath + " to " + dataPath);
							}
							data[dataPath][dataName][j] = subData[subPath];
						}
						// data[dataPath][dataName][j] = editor.data.get(listItems[j]);
						if (listItems[j].dataset.vedorTemplate) {
							data[dataPath][dataName][j]['data-vedor-template'] = listItems[j].dataset.vedorTemplate;
						}
					}
					dataLists[i].dataset.vedorStashed = 1;
				}

				dataFields = target.parentNode.querySelectorAll(":scope [data-vedor-get-data][data-vedor-field],:scope [data-vedor-get-data] [data-vedor-field]");
				for (i=0; i<dataFields.length; i++) {
					if (dataFields[i].dataset.vedorStashed) {
						continue;
					}

					dataName = dataFields[i].dataset.vedorField;
					dataPath = dataFields[i].dataset.vedorPath ? dataFields[i].dataset.vedorPath : location.pathname;

					if (!data[dataPath]) {
						data[dataPath] = {};
					}

					data[dataPath][dataName] = editor.field.get(dataFields[i]);
					dataFields[i].dataset.vedorStashed = 1;
				}
				delete target.dataset.vedorGetData;

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

				if (localStorage.data) {
					data = JSON.parse(localStorage.data);
				}

				var stashedFields = document.querySelectorAll("[data-vedor-stashed]");
				for (i=0; i<stashedFields.length; i++) {
					delete stashedFields[i].dataset.vedorStashed;
				}

				var newData = editor.data.get(document);
				data = editor.data.merge(data, newData);
	
				localStorage.data = JSON.stringify(data, null, "\t");
			},
			save : function() {
				if (editor.storage.connect()) {
					editor.data.stash();
					if (editor.actions['vedor-beforesave']) {
						editor.actions['vedor-beforesave']();
					}
					editor.storage.save(localStorage.data, function() {
						if (editor.actions['vedor-aftersave']) {
							editor.actions['vedor-aftersave']();
						} else {
							alert("Saved!");
						}
					});
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
						if (document.location.hash == "#vedor-edit") {
							if (editor.storage.connect()) {
								editor.editmode.init();
								editor.editmode.editable(document);
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
				init : function(data, target) {
					var dataName, dataPath;
					var dataLists = target.querySelectorAll("[data-vedor-list]");
					for (var i=0; i<dataLists.length; i++) {
						editor.data.list.parseTemplates(dataLists[i]);
						dataName = dataLists[i].getAttribute("data-vedor-list");
						dataPath = dataLists[i].getAttribute("data-vedor-path") ? dataLists[i].getAttribute("data-vedor-path") : location.pathname;
						if (data[dataPath] && data[dataPath][dataName]) {
							editor.data.list.applyTemplates(dataLists[i], data[dataPath][dataName]);
						}

						if (!dataLists[i].querySelector(":scope > [data-vedor-list-item]")) {
							dataLists[i].classList.add("vedor-empty");
						}
						dataLists[i].addEventListener("keydown", editor.data.list.keyDownHandler);
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
					var dataName = list.getAttribute("data-vedor-list");
					var dataPath = list.getAttribute("data-vedor-path") ? list.getAttribute("data-vedor-path") : location.pathname;

//					var templates = list.querySelectorAll("template");
					var templates = list.getElementsByTagName("template");

					if (typeof list.templates === "undefined") {
						list.templates = {};
					}
					for (var t=0; t<templates.length; t++) {
						var templateName = templates[t].getAttribute("data-vedor-template") ? templates[t].getAttribute("data-vedor-template") : t;

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

					var initFields = function(clone) {
						var dataName;
						var dataFields = clone.querySelectorAll("[data-vedor-field]");
						for (k=0; k<dataFields.length; k++) {
							dataName = dataFields[k].getAttribute("data-vedor-field");
							if (listData[j][dataName]) {
								editor.field.set(dataFields[k], listData[j][dataName]);
							}
						}

						var dataLists = clone.querySelectorAll("[data-vedor-list]");
						for (k=0; k<dataLists.length; k++) {
							editor.data.list.parseTemplates(dataLists[k]);
							dataName = dataLists[k].getAttribute("data-vedor-list");
							if (listData[j][dataName]) {
								editor.data.list.applyTemplates(dataLists[k], listData[j][dataName]);
							}

							if (!dataLists[k].querySelector(":scope > [data-vedor-list-item]")) {
								dataLists[k].classList.add("vedor-empty");
							}
						}
					};

					for (j=0; j<listData.length; j++) {
						var requestedTemplate = listData[j]["data-vedor-template"];

						if (!list.templates[requestedTemplate]) {
							for (var t in list.templates) {
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
							if (Object.keys(list.templates).length > 1) {
								clone.firstElementChild.setAttribute("data-vedor-template", requestedTemplate);
							}

							clone.firstElementChild.setAttribute("data-vedor-list-item", true);
							clone.firstElementChild.setAttribute("data-vedor-selectable", true);
							list.appendChild(clone);
							editor.data.list.init(listData[j], clone);
						} else {
							for (e=0; e<list.templates[requestedTemplate].contentNode.childNodes.length; e++) {
								clone = list.templates[requestedTemplate].contentNode.childNodes[e].cloneNode(true);
								initFields(clone);
								editor.data.list.fixFirstElementChild(clone);

								if (Object.keys(list.templates).length > 1) {
									clone.firstElementChild.setAttribute("data-vedor-template", requestedTemplate);
								}
								clone.firstElementChild.setAttribute("data-vedor-list-item", true);
								clone.firstElementChild.setAttribute("data-vedor-selectable", true);
								list.appendChild(clone);
								editor.data.list.init(listData[j], clone);
							}
						}
					}
					list.setAttribute("data-vedor-selectable", true);
				}
			}
		},
		field : {
			set : function(field, data) {
				var attr;
				switch (field.tagName) {
					case "IMG":
					case "IFRAME":
						if (typeof data == "string") {
							data = {"src" : data};
						}
						for (attr in data) {
							field.setAttribute(attr, data[attr]);
						}
					break;
					case "META":
						for (attr in data) {
							field.setAttribute(attr, data[attr]);
						}
					break;
					case "A":
						for (attr in data) {
							if (attr == "innerHTML") {
								field.innerHTML = data[attr];
							} else {
								field.setAttribute(attr, data[attr]);
							}
						}
					break;
					default:
						field.innerHTML = data;
					break;
				}
			},
			get : function(field) {
				var attr;
				var attributes = {};
				var allowedAttributes = {};

				switch (field.tagName) {
					case "IMG": 
						allowedAttributes = ["src", "class", "alt", "title"];
					break;
					case "A":
						allowedAttributes = ["href", "class", "alt", "title"];
						attributes.innerHTML = field.innerHTML;
					break;
					case "META":
						allowedAttributes = ["content"];
					break;
					case "IFRAME":
						allowedAttributes = ["src"];
					break;
					default:
					return field.innerHTML;
				}
				for (attr in allowedAttributes) {
					attr = allowedAttributes[attr];
					if (field.getAttribute(attr)) {
						attributes[attr] = field.getAttribute(attr);
					}
				}
				return attributes;
			}
		},
		loadBaseStyles : function() {
			var baseStyles = document.createElement("link");
			baseStyles.setAttribute("href", editor.baseURL + "vedor/vedor-base.css");
			baseStyles.setAttribute("rel", "stylesheet");
			baseStyles.setAttribute("type", "text/css");
			document.head.appendChild(baseStyles);
		},
		init : function(config) {
			document.createElement("template");
			document.body.innerHTML = document.body.innerHTML;
			if (config.toolbars) {
				editor.editmode.toolbars = config.toolbars;
			}
			editor.loadBaseStyles();
			editor.data.load();
		},
		editmode : {
			toolbars : null,
			init : function() {
				var toolbarsContainer = document.createElement("DIV");
				toolbarsContainer.id = "vedor-editor";
				document.body.appendChild(toolbarsContainer);

				var http = new XMLHttpRequest();
				var url = editor.baseURL + "vedor/toolbars.html";
				url += "?t=" + (new Date().getTime());

				var loadToolbars = function() {
					if (!editor.toolbar || (typeof muze === "undefined")) {
						// Main toolbar code isn't loaded yet, delay a bit;
						window.setTimeout(loadToolbars, 100);
						return;
					}

					var loadToolbar = function(url) {
						var i;
						var http = new XMLHttpRequest();
						url += "?t=" + (new Date().getTime());

						http.open("GET", url, true);
						http.onreadystatechange = function() {//Call a function when the state changes.
							if(http.readyState == 4 && http.status == 200) {
								var toolbars = document.createElement("TEMPLATE");
								toolbars.innerHTML = http.responseText;

								if (!("content" in toolbars)) {
									var fragment = document.createDocumentFragment();
									while (toolbars.children.length) {
										fragment.appendChild(toolbars.children[0]);
									}
									toolbars.content = fragment;
								}
								// editor.brokenImport = true;
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

								var newToolbars = toolbarNode.querySelectorAll(".vedor-toolbar,.vedor-dialog-body");
								for (i=0; i<newToolbars.length; i++) {
									editor.toolbar.init(newToolbars[i]);
								}
								toolbarsContainer.appendChild(toolbarNode);
							}
						};
						http.send();
					};

					for (var i in editor.editmode.toolbars) {
						loadToolbar(editor.editmode.toolbars[i]);
					}

					editor.editmode.toolbarMonitor();
				};

				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						var i;

						var toolbars = document.createElement("TEMPLATE");
						toolbars.innerHTML = http.responseText;
						if (!("content" in toolbars)) {
							var fragment = document.createDocumentFragment();
							while (toolbars.children.length) {
								fragment.appendChild(toolbars.children[0]);
							}
							toolbars.content = fragment;
						}

						editor.brokenImport = true;
						var toolbarNode = document.importNode(toolbars.content, true);
						toolbarsContainer.appendChild(toolbarNode);
						
						if (editor.brokenImport) {
							editor.importScripts = true;
						}
						if (editor.brokenImport) {
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
						loadToolbars();
					}
				};
				http.send();


				// Add slip.js for sortable items;
				var scriptTag = document.createElement("SCRIPT");
				scriptTag.setAttribute("src", editor.baseURL + "vedor/slip.js");
				document.head.appendChild(scriptTag);
			},
			editable : function(target) {
				var i;

				var dataFields = target.querySelectorAll("[data-vedor-field]");
				for (i=0; i<dataFields.length; i++) {
					dataFields[i].contentEditable = true;
				/*	dataFields[i].addEventListener("keyup", function() {
						var clones = target.querySelectorAll("[data-vedor-field='" + this.dataset["vedorField"] + "']");
						var dataPath = this.dataset["vedorPath"] ? this.dataset["vedorPath"] : location.pathname;

						for (var j=0; j<clones.length; j++) {
							cloneDataPath = clones[j].dataset["vedorPath"] ? clones[j].dataset["vedorPath"] : location.pathname;
							if (cloneDataPath == dataPath) {
								if (clones[j].innerHTML != this.innerHTML) {
									clones[j].innerHTML = this.innerHTML;
								}
							}
						}
					});
				*/
				}

				var dataLists = target.querySelectorAll("[data-vedor-list]");
				for (i=0; i<dataLists.length; i++) {
					dataLists[i].dataset.vedorSelectable = true;
				}

				var hyperlinks = target.querySelectorAll("a");
				var handleDblClick = function(evt) {
					if (
						this.pathname
					) {
						var pathname = this.pathname;
						var hostname = this.hostname;
						if (hostname == document.location.hostname && (typeof editor.currentData[this.pathname] == "undefined")) {
							history.pushState(null, null, this.href + "#vedor-edit");
							document.body.innerHTML = editor.data.originalBody.innerHTML;
							editor.data.load();
							var openTemplateDialog = function() {
								if (editor.actions['vedor-template']) {
									if (!document.getElementById("vedor-template")) {
										window.setTimeout(openTemplateDialog, 200);
										return;
									}
									editor.actions['vedor-template']();
								} else {
									alert("This page does not exist yet. Save it to create it!");
								}
							};
							openTemplateDialog();
							evt.preventDefault();
						} else {
							document.location.href = this.href + "#vedor-edit";
						}
					}
				};
				var handleClick = function(event) {
					event.preventDefault();
				};

				for (i=0; i<hyperlinks.length; i++) {
					hyperlinks[i].addEventListener("dblclick", handleDblClick);
					hyperlinks[i].addEventListener("click", handleClick);
				}

				var images = target.querySelectorAll("img[data-vedor-field]");
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
					images[i].dataset.vedorSelectable = true;
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

				var list = target.querySelectorAll("[data-vedor-sortable]");
				
				var preventDefault = function(evt) {
					evt.preventDefault();
				};
				
				var addBeforeOrderEvent = function(e) {
					var sublists = this.querySelectorAll("[data-vedor-sortable]");
					for (var j=0; j<sublists.length; j++) {
						sublists[j].addEventListener('slip:beforereorder', preventDefault);
					}
				};
				var removeBeforeOrderEvent = function(e) {
					e.target.parentNode.insertBefore(e.target, e.detail.insertBefore);
								
					var sublists = this.querySelectorAll("[data-vedor-sortable]");
					for (var j=0; j<sublists.length; j++) {
						sublists[j].removeEventListener('slip:beforereorder', preventDefault);
					}
					return false;
				};

				for (var i=0; i<list.length; i++) {
					list[i].addEventListener('slip:reorder', removeBeforeOrderEvent, false);
				
					if (list[i].querySelectorAll('[data-vedor-sortable]').length) {
						list[i].addEventListener('slip:beforereorder', addBeforeOrderEvent, false);
					}
					
					new Slip(list[i]);
				}
			},
			textonly : function(target) {
				var textonly = target.querySelectorAll("[data-vedor-content='text']");
				var preventNodeInsert = function(evt) {
					if (evt.target.tagName) {
						editor.node.unwrap(evt.target);
					}
				};

				for (var i=0; i<textonly.length; i++) {
					textonly[i].addEventListener("DOMNodeInserted", preventNodeInsert);
				}
			},
			stop : function() {
				editor.storage.disconnect();
				document.location.href = document.location.href.split("#")[0];
			},
			toolbarMonitor : function() {
				var target = document.querySelector('#vedor-main-toolbar');
				if (!target) {
					window.setTimeout(editor.editmode.toolbarMonitor, 100);
					return false;
				}

				var setBodyTop = function() {
					var style = document.head.querySelector("#vedor-body-top");
					if (!style) {
						style = document.createElement("style");
						style.setAttribute("type", "text/css");

						style.id = "vedor-body-top";
						document.head.appendChild(style);
					}

					var toolbarHeight = document.getElementById("vedor-main-toolbar").offsetHeight;

					style.innerHTML = "html:before { display: block; width: 100%; height: " + toolbarHeight + "px; content: ''; }";
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

	editor.actions = {
		"vedor-save" : editor.data.save,
		"vedor-logout" : editor.editmode.stop
	};

	editor.toolbars = {};
	editor.contextFilters = {};
	editor.plugins = {};

	editor.addToolbar = function(toolbar) {
		if (toolbar.filter) {
			editor.addContextFilter(toolbar.name, toolbar.filter);
		}
		for (var i in toolbar.actions) {
			editor.actions[i] = toolbar.actions[i];
		}
		editor.toolbars[toolbar.name] = toolbar;
		if (toolbar.init) {
			toolbar.init();
		}
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
	document.addEventListener("DOMContentLoaded", preventDOMContentLoaded, true);
	window.addEventListener("load", preventDOMContentLoaded, true);

	if (typeof jQuery !== "undefined") {
		jQuery.holdReady(true);
	}

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
	editor.init({
		toolbars : [
			editor.baseURL + "vedor/toolbar.vedor-main-toolbar.html",
			editor.baseURL + "vedor/toolbar.vedor-text.html",
			editor.baseURL + "vedor/toolbar.vedor-image.html",
			editor.baseURL + "vedor/toolbar.vedor-iframe.html",
			editor.baseURL + "vedor/toolbar.vedor-selectable.html",
			editor.baseURL + "vedor/plugin.vedor-htmlsource.html",
			editor.baseURL + "vedor/plugin.vedor-meta.html",
			editor.baseURL + "vedor/plugin.vedor-template.html",
			editor.baseURL + "vedor/plugin.vedor-save.html",
			editor.baseURL + "vedor/toolbar.vedor-list.html",
			editor.baseURL + "vedor/plugin.vedor-image-browse.html",
			editor.baseURL + "vedor/plugin.vedor-dropbox.html",
			editor.baseURL + "vedor/plugin.vedor-symbol.html"
		]
	});
}());