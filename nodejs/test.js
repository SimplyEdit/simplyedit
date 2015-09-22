var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var jsdom = require('jsdom');

	var editor = {
		storage : {
			url : 'http://yvo.muze.nl/ariadne/loader.php/system/users/yvo/simple-edit-data/',
			load : function(callback) {
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
			load : function() {
				editor.storage.load(function(data) {
					editor.data.apply(JSON.parse(data));
					var myscript = document.querySelector("SCRIPT[src$='simple-edit.js']");
					myscript.parentNode.removeChild(myscript);

					console.log("<!DOCTYPE HTML><html>" + document.head.outerHTML + document.body.outerHTML + "</html>");
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
			}
		},
		init : function() {
			editor.data.load();
		}
	}


jsdom.env({
  url: "http://yvo.muze.nl/simple-edit/",
  onload: function(window) {
    document = window.document;
    location = {pathname : '/simple-edit/'};
//    console.log(window.document.doctype.toString());

    editor.init();
//    console.log(window.document.body);
  }
});
