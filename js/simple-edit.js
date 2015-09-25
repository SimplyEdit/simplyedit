(function() {
	var editor = {
		storage : {
			url : 'http://yvo.muze.nl/ariadne/loader.php/system/users/yvo/simple-edit-data/',
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
				if (key == "df5207267b592b6cf158898fed1527cccc03349a") {
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
			apply : function(data) {
				var dataFields = document.querySelectorAll("[data-vedor-field]");
				for (var i=0; i<dataFields.length; i++) {
					var dataName = dataFields[i].getAttribute("data-vedor-field");
					var dataPath = dataFields[i].getAttribute("data-vedor-path") ? dataFields[i].getAttribute("data-vedor-path") : location.pathname;

					if (data[dataPath] && data[dataPath][dataName]) {
						editor.field.set(dataFields[i], data[dataPath][dataName]);
					}
				}

				editor.data.list.init(data);
				localStorage.data = JSON.stringify(data);

				document.removeEventListener("DOMContentLoaded", preventDOMContentLoaded, true);
				var event; // The custom event that will be created
				if (document.createEvent) {
					event = document.createEvent("HTMLEvents");
					event.initEvent("DOMContentLoaded", true, true);
				} else {
					event = document.createEventObject();
					event.eventType = "DOMContentLoaded";
				}

				event.eventName = "DOMContentLoaded";

				if (document.createEvent) {
					document.dispatchEvent(event);
				} else {
					document.fireEvent("on" + event.eventType, event);
				}
				if (typeof jQuery !== "undefined") {
					jQuery.holdReady(false);
				}
			},
			stash : function() {
				var data = {};
				var dataName, dataPath, dataFields;
				var i, j, k, subKey;

				if (localStorage.data) {
					data = JSON.parse(localStorage.data);
				}

				var dataLists = document.querySelectorAll("[data-vedor-list]");
				for (i=0; i<dataLists.length; i++) {
					dataName = dataLists[i].dataset.vedorList;
					dataPath = dataLists[i].dataset.vedorPath ? dataLists[i].dataset.vedorPath : location.pathname;

					var listItems = dataLists[i].querySelectorAll("[data-vedor-list-item]");
					for (j=0; j<listItems.length; j++) {
						dataFields = listItems[j].querySelectorAll("[data-vedor-field]:not([data-vedor-stashed])");
						for (k=0; k<dataFields.length; k++) {
							subKey = dataFields[k].dataset.vedorField;
							if (!data[dataPath][dataName]) {
								data[dataPath][dataName] = [];
							}

							if (!data[dataPath][dataName][j]) {
								data[dataPath][dataName][j] = {};
							}

							data[dataPath][dataName][j][subKey] = editor.field.get(dataFields[k]);
							// Mark it so it doesn't get processed twice;
							dataFields[k].dataset.vedorStashed = 1;
						}

					}

					dataFields = dataLists[i].querySelectorAll("[data-vedor-field]:not([data-vedor-stashed])");
					for (k=0; k<dataFields.length; k++) {
						subKey = dataFields[k].dataset.vedorField;
						if (!data[dataPath][dataName]) {
							data[dataPath][dataName] = [];
						}
						if (!data[dataPath][dataName][k]) {
							data[dataPath][dataName][k] = {};
						}

						data[dataPath][dataName][k][subKey] = editor.field.get(dataFields[k]);
						// Mark it so it doesn't get processed twice;
						dataFields[k].dataset.vedorStashed = 1;
					}

					listItems = dataLists[i].querySelectorAll("[data-vedor-list-item]");
					for (j=0; j<listItems.length; j++) {
						if (listItems[j].dataset.vedorTemplate) {
							data[dataPath][dataName][j]['data-vedor-template'] = listItems[j].dataset.vedorTemplate;
						}
					}
				}

				dataFields = document.querySelectorAll("[data-vedor-field]:not([data-vedor-stashed])");
				for (i=0; i<dataFields.length; i++) {
					dataName = dataFields[i].dataset.vedorField;
					dataPath = dataFields[i].dataset.vedorPath ? dataFields[i].dataset.vedorPath : location.pathname;

					if (!data[dataPath]) {
						data[dataPath] = {};
					}

					data[dataPath][dataName] = editor.field.get(dataFields[i]);
				}

				var stashedFields = document.querySelectorAll("[data-vedor-stashed]");
				for (i=0; i<stashedFields.length; i++) {
					delete stashedFields[i].dataset.vedorStashed;
				}

				localStorage.data = JSON.stringify(data);
			},
			save : function() {
				if (editor.storage.connect()) {
					editor.data.stash();
					editor.storage.save(localStorage.data, function() {
						alert("Saved!");
					});
				} 
			},
			load : function() {
				editor.storage.load(function(data) {
					editor.data.apply(JSON.parse(data));

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
				init : function(data) {
					var dataName, dataPath;

					document.createElement("template");
					document.body.innerHTML = document.body.innerHTML;

					var dataLists = document.querySelectorAll("[data-vedor-list]");

					for (var i=0; i<dataLists.length; i++) {
						editor.data.list.parseTemplates(dataLists[i]);

						dataName = dataLists[i].getAttribute("data-vedor-list");
						dataPath = dataLists[i].getAttribute("data-vedor-path") ? dataLists[i].getAttribute("data-vedor-path") : location.pathname;
						if (data[dataPath] && data[dataPath][dataName]) {
							editor.data.list.applyTemplates(dataLists[i], data[dataPath][dataName]);
						}
					}
				},
				parseTemplates : function(list) {
					var dataName = list.getAttribute("data-vedor-list");
					var dataPath = list.getAttribute("data-vedor-path") ? list.getAttribute("data-vedor-path") : location.pathname;

//					var templates = list.querySelectorAll("template");
					var templates = list.getElementsByTagName("template");

					list.templates = {};

					for (var t=0; t<templates.length; t++) {
						var templateName = templates[t].getAttribute("data-vedor-template") ? templates[t].getAttribute("data-vedor-template") : t;
						list.templates[templateName] = templates[t].cloneNode(true);
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
					};

					var fixFirstElementChild = function(clone) {
						if (!("firstElementChild" in clone)) {
							for (var l=0; l<clone.childNodes.length; l++) {
								if (clone.childNodes[l].nodeType == 1) {
									clone.firstElementChild = clone.childNodes[l];
								}
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
							initFields(clone);
							fixFirstElementChild(clone);
							if (list.templates.length > 1) {
								clone.firstElementChild.setAttribute("data-vedor-template", requestedTemplate);
							}
							clone.firstElementChild.setAttribute("data-vedor-list-item", true);
							list.appendChild(clone);
						} else {
							for (e=0; e<list.templates[requestedTemplate].contentNode.childNodes.length; e++) {
								clone = list.templates[requestedTemplate].contentNode.childNodes[e].cloneNode(true);
								initFields(clone);
								fixFirstElementChild(clone);

								if (list.templates.length > 1) {
									clone.firstElementChild.setAttribute("data-vedor-template", requestedTemplate);
								}
								clone.firstElementChild.setAttribute("data-vedor-list-item", true);
								list.appendChild(clone);
							}
						}
					}
				}
			}
		},
		field : {
			set : function(field, data) {
				var attr;
				switch (field.tagName) {
					case "IMG":
						if (typeof data == "string") {
							data = {"src" : data};
						}
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
						for (attr in allowedAttributes) {
							attr = allowedAttributes[attr];
							if (field.getAttribute(attr)) {
								attributes[attr] = field.getAttribute(attr);
							}
						}
			
					return attributes;
					case "A":
						allowedAttributes = ["href", "class", "alt", "title"];
						for (attr in allowedAttributes) {
							attr = allowedAttributes[attr];
							if (field.getAttribute(attr)) {
								attributes[attr] = field.getAttribute(attr);
							}
						}
						attributes.innerHTML = field.innerHTML;

					return attributes;
					default:
					return field.innerHTML;
				}
			}
		},
		loadBaseStyles : function() {
			var baseStyles = document.createElement("link");
			baseStyles.setAttribute("href", "/simple-edit/vedor/vedor-base.css");
			baseStyles.setAttribute("rel", "stylesheet");
			baseStyles.setAttribute("type", "text/css");
			document.head.appendChild(baseStyles);
		},
		init : function() {
			editor.loadBaseStyles();
			editor.data.load();
		},
		editmode : {
			init : function() {
				var toolbarsContainer = document.createElement("DIV");
				document.body.appendChild(toolbarsContainer);

				var http = new XMLHttpRequest();
				var url = "/simple-edit/vedor/toolbars.html";
				url += "?t=" + (new Date().getTime());

				var loadToolbars = function() {
					if (!editor.toolbar || (typeof muze === "undefined")) {
						// Main toolbar code isn't loaded yet, delay a bit;
						window.setTimeout(loadToolbars, 100);
						return;
					}

					var toolbars = [
						"/simple-edit/vedor/toolbar.vedor-main-toolbar.html",
						"/simple-edit/vedor/toolbar.vedor-text.html",
						"/simple-edit/vedor/toolbar.vedor-image.html",
						"/simple-edit/vedor/toolbar.vedor-selectable.html",
						"/simple-edit/vedor/plugin.vedor-htmlsource.html"
					];

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
								editor.brokenImport = true;
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

								var newToolbars = toolbarNode.querySelectorAll(".vedor-toolbar");
								for (i=0; i<newToolbars.length; i++) {
									editor.toolbar.init(newToolbars[i]);
								}
								toolbarsContainer.appendChild(toolbarNode);
							}
						};
						http.send();
					};

					for (var i in toolbars) {
						loadToolbar(toolbars[i]);
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
				scriptTag.setAttribute("src", "/simple-edit/vedor/slip.js");
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

				var hyperlinks = target.querySelectorAll("a");
				var handleDblClick = function(event) {
					document.location.href = this.href + "#vedor-edit";
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
				};

				for (i=0; i<images.length; i++) {
					images[i].addEventListener("drop", imageDrop);
				}

				/* Add keyboard listener to lists */
				var dataLists = target.querySelectorAll("[data-vedor-list]");
				var keyDownHandler = function(evt) {
					if(evt.ctrlKey && evt.altKey && evt.keyCode == 65) { // ctrl-alt-A
						var templateName = Object.keys(this.templates)[0];

						if (Object.keys(this.templates).length > 1) {
							alert('multiple templates possible');
							templateName = Object.keys(this.templates)[prompt("Template number?")];
						}

						var selectedTemplate = this.templates[templateName];

						if (selectedTemplate) {
							var newNode = document.importNode(selectedTemplate.content, true);
							editor.editmode.editable(newNode);
							newNode.firstElementChild.dataset.vedorTemplate = templateName;
							newNode.firstElementChild.dataset.vedorListItem = true;
							this.appendChild(newNode);
						}
						evt.preventDefault();
					}
				};

				for (i=0; i<dataLists.length; i++) {
					dataLists[i].addEventListener("keydown", keyDownHandler);
				}

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
				var unwrap = function(el, target) {
					if ( !target ) {
						target = el.parentNode;
					}
					while (el.firstChild) {
						target.insertBefore(el.firstChild, el);
					}
					el.parentNode.removeChild(el);
				};
				var preventNodeInsert = function(evt) {
					if (evt.target.tagName) {
						unwrap(evt.target);
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
					document.body.style.position = "relative";
					document.body.style.top = document.getElementById("vedor-main-toolbar").offsetHeight + "px";
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
	if (typeof jQuery !== "undefined") {
		jQuery.holdReady(true);
	}

	window.editor = editor;
	editor.init();
}());