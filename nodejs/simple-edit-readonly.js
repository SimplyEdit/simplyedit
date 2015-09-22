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
				}
				http.send(params);
			},
			load : function(callback) {
				console.log("loading data...");

				var http = new XMLHttpRequest();
				var url = editor.storage.url + "get";
				url += "?t=" + (new Date().getTime());

				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						callback(http.responseText);
					}
				}
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
					editor.storage.key = localStorage['storageKey'];
				}
				if (!editor.storage.key) {
					editor.storage.key = prompt("Please enter your authentication key");
				}

				if (editor.storage.validateKey(editor.storage.key)) {
					localStorage["storageKey"] = editor.storage.key;
					return true;
				} else {
					delete localStorage["storageKey"];
					return editor.storage.connect();
				}
			},
			disconnect : function() {
				delete editor.storage.key;
				delete localStorage['storageKey'];
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

				editor.data.initLists(data);
			},
			stash : function() {
				var data = {};
				if (localStorage.data) {
					data = JSON.parse(localStorage.data);
				}

				var dataLists = document.querySelectorAll("[data-vedor-list]");
				for (var i=0; i<dataLists.length; i++) {
					var dataName = dataLists[i].dataset["vedorList"];
					var dataPath = dataLists[i].dataset["vedorPath"] ? dataLists[i].dataset["vedorPath"] : location.pathname;

					var listItems = dataLists[i].querySelectorAll("[data-vedor-list-item]");
					for (var j=0; j<listItems.length; j++) {
						var dataFields = listItems[j].querySelectorAll("[data-vedor-field]:not([data-vedor-stashed])");
						for (var k=0; k<dataFields.length; k++) {
							var subKey = dataFields[k].dataset["vedorField"];
							if (!data[dataPath][dataName]) {
								data[dataPath][dataName] = [];
							}

							if (!data[dataPath][dataName][j]) {
								data[dataPath][dataName][j] = {};
							}

							data[dataPath][dataName][j][subKey] = editor.field.get(dataFields[k]);
							// Mark it so it doesn't get processed twice;
							dataFields[k].dataset['vedorStashed'] = 1;
						}

					}

					var dataFields = dataLists[i].querySelectorAll("[data-vedor-field]:not([data-vedor-stashed])");
					for (var k=0; k<dataFields.length; k++) {
						var subKey = dataFields[k].dataset["vedorField"];
						if (!data[dataPath][dataName]) {
							data[dataPath][dataName] = [];
						}
						if (!data[dataPath][dataName][k]) {
							data[dataPath][dataName][k] = {};
						}

						data[dataPath][dataName][k][subKey] = editor.field.get(dataFields[k]);
						// Mark it so it doesn't get processed twice;
						dataFields[k].dataset['vedorStashed'] = 1;
					}

					var listItems = dataLists[i].querySelectorAll("[data-vedor-list-item]");
					for (var j=0; j<listItems.length; j++) {
						if (listItems[j].dataset['vedorTemplate']) {
							data[dataPath][dataName][j]['data-vedor-template'] = listItems[j].dataset['vedorTemplate'];
						}
					}
				}

				var dataFields = document.querySelectorAll("[data-vedor-field]:not([data-vedor-stashed])");
				for (var i=0; i<dataFields.length; i++) {
					var dataName = dataFields[i].dataset["vedorField"];
					var dataPath = dataFields[i].dataset["vedorPath"] ? dataFields[i].dataset["vedorPath"] : location.pathname;

					if (!data[dataPath]) {
						data[dataPath] = {};
					}

					data[dataPath][dataName] = editor.field.get(dataFields[i]);
				}

				var stashedFields = document.querySelectorAll("[data-vedor-stashed]");
				for (var i=0; i<stashedFields.length; i++) {
					delete stashedFields[i].dataset['vedorStashed'];
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
				console.log("frop");

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

					window.addEventListener("hashchange", checkEdit);
					checkEdit();
				});
			},
			initLists : function(data) {
				var dataLists = document.querySelectorAll("[data-vedor-list]");
				for (var i=0; i<dataLists.length; i++) {
					var dataName = dataLists[i].getAttribute("data-vedor-list");
					var dataPath = dataLists[i].getAttribute("data-vedor-path") ? dataLists[i].getAttribute("data-vedor-path") : location.pathname;

					var templates = dataLists[i].querySelectorAll("template");
					dataLists[i].templates = {};

					for (var t=0; t<templates.length; t++) {
						var templateName = templates[t].getAttribute("data-vedor-template") ? templates[t].getAttribute("data-vedor-template") : t;
						dataLists[i].templates[templateName] = templates[t].cloneNode(true);
						if (!("content" in dataLists[i].templates[templateName])) {
							var fragment = document.createDocumentFragment();
							content  = dataLists[i].templates[templateName].children;
							for (j = 0; node = content[j]; j++) {
								fragment.appendChild(node);
							}
							dataLists[i].templates[templateName].content = fragment;
						}
						templates[t].parentNode.removeChild(templates[t]);

					}

					if (data[dataPath] && data[dataPath][dataName]) {
						var listData = data[dataPath][dataName];
						for (var j=0; j<listData.length; j++) {
							var requestedTemplate = listData[j]["data-vedor-template"];
							if (!dataLists[i].templates[requestedTemplate]) {
								for (t in dataLists[i].templates) {
									requestedTemplate = t;
									break;
								}
								// requestedTemplate = Object.keys(dataLists[i].templates)[0];
							}
							console.log(dataLists[i].templates[requestedTemplate]);
							break;


							var clone = document.importNode(dataLists[i].templates[requestedTemplate].content, true);
							// FIXME: Duplicate code
							var dataFields = clone.querySelectorAll("[data-vedor-field]");
							for (var k=0; k<dataFields.length; k++) {
								var dataName = dataFields[k].getAttribute("data-vedor-field");
								if (listData[j][dataName]) {
									editor.field.set(dataFields[k], listData[j][dataName]);
								}
							}

							if (!("firstElementChild" in clone)) {
								for (var l=0; l<clone.childNodes.length; l++) {
									if (clone.childNodes[l].nodeType == 1) {
										clone.firstElementChild = clone.childNodes[l];
									}
								}
							}

							if (templates.length > 1) {
								clone.firstElementChild.getAttribute("data-vedor-template") = requestedTemplate;
							}
							clone.firstElementChild.setAttribute("data-vedor-list-item", true);
							dataLists[i].appendChild(clone);
						}
					}
				}
			},

		},
		field : {
			set : function(field, data) {
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
				switch (field.tagName) {
					case "IMG": 
						var attributes = {};
						var allowedAttributes = ["src", "class", "alt", "title"];
						for (attr in allowedAttributes) {
							attr = allowedAttributes[attr];
							if (field.getAttribute(attr)) {
								attributes[attr] = field.getAttribute(attr);
							}
						}
			
						return attributes;
					break;
					case "A":
						var attributes = {};
						var allowedAttributes = ["href", "class", "alt", "title"];
						for (attr in allowedAttributes) {
							attr = allowedAttributes[attr];
							if (field.getAttribute(attr)) {
								attributes[attr] = field.getAttribute(attr);
							}
						}
						attributes['innerHTML'] = field.innerHTML;

						return attributes;
					break;
					default:
						return field.innerHTML;
					break;
				}
			}
		},
		init : function() {
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
					var toolbars = [
						"/simple-edit/vedor/toolbar.vedor-main-toolbar.html",
						"/simple-edit/vedor/toolbar.vedor-text-cursor.html",
						"/simple-edit/vedor/toolbar.vedor-text-selection.html",
						"/simple-edit/vedor/toolbar.vedor-image.html"
					];


					for (i in toolbars) {
						(function() {
							var http = new XMLHttpRequest();
							var url = toolbars[i];
							url += "?t=" + (new Date().getTime());
							console.log(url);

							http.open("GET", url, true);
							http.onreadystatechange = function() {//Call a function when the state changes.
								if(http.readyState == 4 && http.status == 200) {
									var toolbars = document.createElement("TEMPLATE");
									toolbars.innerHTML = http.responseText;
									console.log(toolbars);

									if (!("content" in toolbars)) {
										var fragment = document.createDocumentFragment();
										while (toolbars.children.length) {
											fragment.appendChild(toolbars.children[0]);
										}
										toolbars.content = fragment;

										toolbars.brokenImport = true;
									}
									var toolbarNode = document.importNode(toolbars.content, true);
									var newToolbars = toolbarNode.querySelectorAll(".vedor-toolbar");
									for (var i=0; i<newToolbars.length; i++) {
										var marker = document.createElement("div");
										marker.className = "marker";
										newToolbars[i].insertBefore(marker, newToolbars[i].firstChild);
									}

									toolbarsContainer.appendChild(toolbarNode);
									if (toolbars.brokenImport) {
										var scriptTags = toolbars.content.querySelectorAll("SCRIPT");
										for (var i=0; i<scriptTags.length; i++) {
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
								}
							}
							http.send();
						}());
					}
					editor.editmode.toolbarMonitor();
				};

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
							toolbars.brokenImport = true;
						}

						var toolbarNode = document.importNode(toolbars.content, true);
						var newToolbars = toolbarNode.querySelectorAll(".vedor-toolbar");
						for (var i=0; i<newToolbars.length; i++) {
							var marker = document.createElement("div");
							marker.className = "marker";
							newToolbars[i].insertBefore(marker, newToolbars[i].firstChild);
						}

						toolbarsContainer.appendChild(toolbarNode);
						if (toolbars.brokenImport) {
							var scriptTags = toolbars.content.querySelectorAll("SCRIPT");
							for (var i=0; i<scriptTags.length; i++) {
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
				}
				http.send();


				// Add slip.js for sortable items;
				var scriptTag = document.createElement("SCRIPT");
				scriptTag.setAttribute("src", "/simple-edit/vedor/slip.js");
				document.head.appendChild(scriptTag);

			},
			editable : function(target) {
				var dataFields = target.querySelectorAll("[data-vedor-field]");
				for (var i=0; i<dataFields.length; i++) {
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
				for (var i=0; i<hyperlinks.length; i++) {
					hyperlinks[i].addEventListener("dblclick", function(event) {
						document.location.href = this.href + "#vedor-edit";
					});
					hyperlinks[i].addEventListener("click", function(event) {
						event.preventDefault();
					});
				}

				var images = target.querySelectorAll("img[data-vedor-field]");
				for (var i=0; i<images.length; i++) {
					images[i].addEventListener("drop", function(event) {
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
					});
				}

				/* Add keyboard listener to lists */
				var dataLists = target.querySelectorAll("[data-vedor-list]");
				for (var i=0; i<dataLists.length; i++) {
					dataLists[i].addEventListener("keydown", function(evt) {
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
								newNode.firstElementChild.dataset["vedorTemplate"] = templateName;
								newNode.firstElementChild.dataset["vedorListItem"] = true;
								this.appendChild(newNode);
							}
							evt.preventDefault();
						}
					});
				}

				editor.editmode.sortable(target);
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
				}
				
				for (var i=0; i<list.length; i++) {
					list[i].addEventListener('slip:reorder', function(e) {	
						e.target.parentNode.insertBefore(e.target, e.detail.insertBefore);
								
						var sublists = this.querySelectorAll("[data-vedor-sortable]");
						for (var j=0; j<sublists.length; j++) {
							sublists[j].removeEventListener('slip:beforereorder', preventDefault);
						}
						return false;
					}, false);
				
					if (list[i].querySelectorAll('[data-vedor-sortable]').length) {
						list[i].addEventListener('slip:beforereorder', function(e) {
							var sublists = this.querySelectorAll("[data-vedor-sortable]");
							for (var j=0; j<sublists.length; j++) {
								sublists[j].addEventListener('slip:beforereorder', preventDefault);
							}
						}, false);
					}
					
					new Slip(list[i]);
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
				}

				// create an observer instance
				var observer = new MutationObserver(setBodyTop);

				// configuration of the observer:
				var config = { childList: true, subtree: true, attributes: true, characterData: true };

				// pass in the target node, as well as the observer options
				observer.observe(target, config);

				window.setTimeout(setBodyTop, 500);
			}
		},
	}

	editor.actions = {
		"vedor-save" : editor.data.save,
		"vedor-logout" : editor.editmode.stop
	}

	editor.toolbars = {};
	editor.contextFilters = {};

	editor.addToolbar = function(toolbar) {
		if (toolbar.filter) {
			editor.addContextFilter(toolbar.name, toolbar.filter);
		}
		for (i in toolbar.actions) {
			editor.actions[i] = toolbar.actions[i];
		}
		editor.toolbars[toolbar.name] = toolbar;
	}

	editor.addContextFilter = function(name, filter) {
		if (!filter['context']) {
			filter['context'] = name;
		}
		editor.contextFilters[name] = filter;
	}

	window.editor = editor;
	editor.init();
}());