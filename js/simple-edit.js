(function() {
	var editor = {
		storage : {
			url : 'http://yvo.muze.nl/ariadne/loader.php/system/users/yvo/simple-edit-data/',
		},
		data : {
			apply : function(data) {
				var dataFields = document.querySelectorAll("[data-vedor-field]");
				for (var i=0; i<dataFields.length; i++) {
					var dataName = dataFields[i].dataset["vedorField"];
					var dataPath = dataFields[i].dataset["vedorPath"] ? dataFields[i].dataset["vedorPath"] : location.pathname;

					if (data[dataPath] && data[dataPath][dataName]) {
						editor.field.set(dataFields[i], data[dataPath][dataName]);
					}
				}

				editor.data.initLists(data);
				localStorage['data'] = JSON.stringify(data);
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
				if (!localStorage["ariadneStorageKey"]) {
					editor.editmode.requestKey();
				}

				if (editor.editmode.validateKey(localStorage["ariadneStorageKey"])) {
					editor.data.stash();

					var http = new XMLHttpRequest();
					var url = editor.storage.url + "save";
					var params = "data=" + escape(localStorage.data);
					params += "&key=" + localStorage["ariadneStorageKey"];

					http.open("POST", url, true);

					//Send the proper header information along with the request
					http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

					http.onreadystatechange = function() {//Call a function when the state changes.
						if(http.readyState == 4 && http.status == 200) {
					       		alert("Saved!");
						}
					}
					http.send(params);
				} 
			},
			load : function() {
				var http = new XMLHttpRequest();
				var url = editor.storage.url + "get";
				url += "?t=" + (new Date().getTime());

				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						editor.data.apply(JSON.parse(http.responseText));

						var checkEdit = function() {
							if (document.location.hash == "#vedor-edit") {
								var key = localStorage['ariadneStorageKey'];
								if (!key) {
									editor.editmode.requestKey();
								}
								if (editor.editmode.validateKey(localStorage['ariadneStorageKey'])) {
									editor.editmode.init();
									editor.editmode.editable(document);
								}
							}
						};

						window.addEventListener("hashchange", checkEdit);
						checkEdit();
					}
				}
				http.send();
			},
			initLists : function(data) {
				var dataLists = document.querySelectorAll("[data-vedor-list]");
				for (var i=0; i<dataLists.length; i++) {
					var dataName = dataLists[i].dataset["vedorList"];
					var dataPath = dataLists[i].dataset["vedorPath"] ? dataLists[i].dataset["vedorPath"] : location.pathname;

					if (data[dataPath] && data[dataPath][dataName]) {
						var listData = data[dataPath][dataName];
						var templates = dataLists[i].querySelectorAll("template");
						dataLists[i].templates = {};

						for (var t=0; t<templates.length; t++) {
							var templateName = templates[t].dataset["vedorTemplate"] ? templates[t].dataset["vedorTemplate"] : t;
							dataLists[i].templates[templateName] = templates[t].cloneNode(true);
						}
						dataLists[i].innerHTML = '';

						for (var j=0; j<listData.length; j++) {
							var requestedTemplate = listData[j]["data-vedor-template"];
							if (!dataLists[i].templates[requestedTemplate]) {
								requestedTemplate = Object.keys(dataLists[i].templates)[0];
							}

							var clone = document.importNode(dataLists[i].templates[requestedTemplate].content, true);

							// FIXME: Duplicate code
							var dataFields = clone.querySelectorAll("[data-vedor-field]");
							for (var k=0; k<dataFields.length; k++) {
								var dataName = dataFields[k].dataset["vedorField"];
								if (listData[j][dataName]) {
									editor.field.set(dataFields[k], listData[j][dataName]);
								}
							}
							if (templates.length > 1) {
								clone.firstElementChild.dataset["vedorTemplate"] = requestedTemplate;
							}
							clone.firstElementChild.dataset["vedorListItem"] = true;

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
				var http = new XMLHttpRequest();
				var url = "/simple-edit/vedor/toolbars.html";
				url += "?t=" + (new Date().getTime());

				http.open("GET", url, true);
				http.onreadystatechange = function() {//Call a function when the state changes.
					if(http.readyState == 4 && http.status == 200) {
						var toolbars = document.createElement("DIV");
						toolbars.innerHTML = http.responseText;
						document.body.appendChild(toolbars);
						editor.editmode.toolbarMonitor();

						toolbars.addEventListener("click", function(event) {
							var el = event.target;
							if ( el.tagName=='I' ) {
								el = el.parentNode;
							}

							switch(el.dataset["vedorAction"]) {
								case null:
								case undefined:
								break;
								default:
									var action = editor.actions[el.dataset["vedorAction"]];
									if (action) {
										var result = action(el);
										if (!result) {
											return;
										}
									} else {
										console.log(el.getAttribute("data-vedor-action") + " not yet implemented");
									}
								break;
							}
						});
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
			validateKey : function(key) {
				if (key == "demo") {
					return true;
				}
				if (key == "df5207267b592b6cf158898fed1527cccc03349a") {
					return true;
				}
			},
			requestKey : function() {
				var key = prompt("Please enter your authentication key");
				if (key) {
					if (editor.editmode.validateKey(key)) {
						editor.storagekey = key;
						localStorage["ariadneStorageKey"] = key;
					} else {
						editor.editmode.requestKey(key);
					}		
				}
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
				delete localStorage["ariadneStorageKey"];
				document.location.href = document.location.href.split("#")[0];
			},
			toolbarMonitor() {
				var target = document.querySelector('#vedor-main-toolbar');

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

	window.editor = editor;
	editor.init();
}());