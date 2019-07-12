	editor.toolbar = {
		getToolbarEl : function(el) {
			while ( el && el.tagName!='div' && !/\bsimply-toolbar\b/.test(el.className) ) {
				el = el.parentNode;
			}
			return el;
		},
		getSectionEl : function(el) {
			while ( el && el.tagName!='div' && !/\bsimply-toolbar-section\b/.test(el.className) ) {
				el = el.parentNode;
			}
			return el;
		},
		getDialogEl : function(el) {
			while ( el && el.tagName!='div' && !/\bsimply-dialog\b/.test(el.className) ) {
				el = el.parentNode;
			}
			return el;
		},
		handleButton : function(el) {
			var toolbar = editor.toolbar.getToolbarEl(el);
			var section = editor.toolbar.getSectionEl(el);
			var i;
			var l;
			var selectedSectionButtons;

			if (el.getAttribute("disabled")) {
				return true;
			}
			if ( toolbar ) {
				if ( !section ) {
					var sections = toolbar.querySelectorAll('.simply-toolbar-section.simply-selected, .simply-toolbar-status');
					for ( i=0, l=sections.length; i<l; i++ ) {
						sections[i].className = sections[i].className.replace(/\bsimply-selected\b/,'');
					}
					selectedSectionButtons = toolbar.querySelectorAll('ul.simply-buttons button.simply-selected');
					for ( i=0, l=selectedSectionButtons.length; i<l; i++ ) {
						selectedSectionButtons[i].className = selectedSectionButtons[i].className.replace(/\bsimply-selected\b/,'');
					}
					if ( !selectedSectionButtons[0] || el != selectedSectionButtons[0] ) {
						el.className += ' simply-selected';
						var rel = el.dataset.simplySection;
						if ( rel ) {
							var target = toolbar.querySelector('.simply-toolbar-section.' + rel );
							if ( target ) {
								target.className += ' simply-selected';
								var focusTarget = target.querySelector("input,button,select");
								if (focusTarget) {
									focusTarget.focus();
								}
							}
						}
					} else {
						var status = toolbar.querySelectorAll('.simply-toolbar-status')[0];
						if ( status ) {
							status.className += ' simply-selected';
						}
					}
				} else {
					selectedSectionButtons = section.querySelectorAll('.simply-selected');
					for ( i=0, l=selectedSectionButtons.length; i<l; i++ ) {
						selectedSectionButtons[i].className = selectedSectionButtons[i].className.replace(/\bsimply-selected\b/,'');
					}
					if ( !selectedSectionButtons[0] || el != selectedSectionButtons[0] ) {
						el.className += ' simply-selected';
					}
				}
			}
		},
		addMarkers : function() {
			var toolbars = editor.toolbarsContainer.querySelectorAll(".simply-toolbar");

			for (var i=0; i<toolbars.length; i++) {
				editor.toolbar.addMarker(toolbars[i]);
			}
		},
		addMarker : function(toolbar) {
			if (!toolbar.querySelector("div.marker")) {
				var marker = document.createElement("div");
				marker.className = "marker";
				toolbar.insertBefore(marker, toolbar.firstChild);
			}
		},
		beforeAction : function() {
			if (typeof editor.context.hopeEditor == "undefined") {
				var currentField = editor.node.getEditableField();
				editor.context.hopeEditor = currentField.hopeEditor;
			}
			editor.context.targetNode = vdSelection.getNode(vdSelectionState.get());

			if (editor.context.hopeEditor) {
				editor.context.skipUpdate = true;
				if (!editor.toolbarsContainer.querySelector(".simply-dialog.active")) {
					editor.context.hopeEditor.parseHTML();
				}
				
				window.setTimeout(function() {
					editor.context.skipUpdate = false;
					editor.context.update();
				}, 50);
			}
		},
		bindInput : function(data, key, elm) {
			if (!elm) {
				console.log("Warning: element for binding does not exist");
				return;
			}
			var bindingConfig = {
				data : data,
				setter : function(value) {
					this.value = value;
				},
				getter : function() {
					return this.value;
				},
				resolve : function() {
					return;

					// FIXME: if the value is changed
					// from the data object (instead of
					// the DOM element), the
					// corresponding toolbar action is
					// not fired because no change was
					// detected. Firing a change event
					// here will cause problems too
					// because the change event will
					// then fire twice;
					/*
					if (!editor.toolbar.updating) {
						if (this.elements[0]) {
							muze.event.fire(this.elements[0], "change");
						}
					}
					*/
				},
				key : key
			};
			var binding = new dataBinding(bindingConfig);
			binding.bind(elm);
		},
		bindButton : function(data, key, elm) {
			if (!elm) {
				console.log("Warning: element for binding does not exist");
				return;
			}
			var bindingConfig = {
				data : data,
				setter : function(value) {
					if (value) {
						this.classList.add("simply-selected");
					} else {
						this.classList.remove("simply-selected");
					}
				},
				getter : function() {
					return this.classList.contains("simply-selected");
				},
				resolve : function(key, value, oldValue) {
					if (!editor.toolbar.updating && (value != oldValue)) {
						if (this.elements[0]) {
							muze.event.fire(this.elements[0], "click");
						}
					}
				},
				key : key
			};
			var binding = new dataBinding(bindingConfig);
			binding.bind(elm);
		},
		bindButtonGroup : function(data, key, elm) {
			if (!elm) {
				console.log("Warning: element for binding does not exist");
				return;
			}
			var bindingConfig = {
				data : data,
				setter : function(value) {
					var values = this.querySelectorAll("button");
					for (var i=0; i<values.length; i++) {
						values[i].classList.remove("simply-selected");
						if (values[i].attributeValue) {
							if (JSON.stringify(values[i].attributeValue) == JSON.stringify(value)) {
								values[i].classList.add("simply-selected");
							}
						} else {
							if (values[i].getAttribute("data-value") == value) {
								values[i].classList.add("simply-selected");
							}
						}
					}
				},
				getter : function() {
					var value = this.querySelector("button.simply-selected");
					if (value) {
						if (value.attributeValue) {
							return value.attributeValue;
						} else {
							return value.getAttribute("data-value");
						}
					} else {
						return '';
					}
				},
				resolve : function(key, value, oldValue) {
					if (!editor.toolbar.updating && (value != oldValue)) {
						if (this.elements[0]) {
							if (this.elements[0].querySelector("button.simply-selected")) {
								muze.event.fire(this.elements[0].querySelector("button.simply-selected"), "click");
							}
						}
					}
				},
				key : key
			};
			var binding = new dataBinding(bindingConfig);
			binding.bind(elm);
		},
		init : function(toolbar) {
			toolbar.addEventListener("click", function(evt) {
				var el = evt.target;
				while (el != this && !(el.tagName.toLowerCase() == "button" || el.classList.contains("simply-button"))) {
					el = el.parentNode;
				}

				if ( el.tagName == 'BUTTON' || el.classList.contains("simply-button")) {
					if (el.getAttribute('disabled')) {
						return;
					}
					switch(el.getAttribute("data-simply-action")) {
						case null:
						break;
						default:
							var action = editor.actions[el.getAttribute("data-simply-action")];
							if (action) {
								editor.toolbar.beforeAction();
								var result = action(el);
								editor.context.update();
								if (!result) {
									return;
								}
							} else {
								console.log(el.getAttribute("data-simply-action") + " not yet implemented");
							}
						break;
					}

					evt.target.blur();
					editor.toolbar.handleButton(el);

					evt.preventDefault();

				}
			});

			var inputs = toolbar.querySelectorAll("select[data-simply-action], input[data-simply-action], textarea[data-simply-action]");
			var handleChange = function(evt) {
				var action = editor.actions[this.getAttribute("data-simply-action")];
				if (action) {
					window.setTimeout(function(value) {
						return function() {
							var focus = document.querySelector(":focus");
							editor.toolbar.beforeAction();
							var result = action(value);
							if (focus) {
								focus.focus();
							}
						};
					}(this.value));
				} else {
					console.log(this.getAttribute("data-simply-action") + " not yet implemented");
				}

			};

			for (var i=0; i<inputs.length; i++) {
				inputs[i].addEventListener("change", handleChange);
				// inputs[i].addEventListener("input", handleChange);
			}

			editor.toolbar.addMarker(toolbar);
		}
	};

	var lastEl = null;
	var lastSection = editor.toolbarsContainer.querySelector('.simply-toolbar-status');
	var simplySections = editor.toolbarsContainer.querySelectorAll(".simply-section");

	editor.node = {
		parents : function(target) {
			var result = [];
			while(target && (target.nodeType == document.ELEMENT_NODE)) {
				result.push(target);
				target = target.parentNode;
			}
	
			return result;
		},
		hasEditableParent : function(checkParent) {
			var parent = checkParent;
			while (parent && parent.parentNode) {
				if (parent.parentNode.getAttribute && parent.parentNode.getAttribute("data-simply-field")) {
					return true;
				}
				if (typeof parent.parentNode.className === "string" && parent.parentNode.className.match(/\beditable\b/)) {
					return true;
				}
				parent = parent.parentNode;
			}
			return false;
		},
		hasSimplyParent : function(checkParent) {
			var parent = checkParent;
			while (parent && parent.parentNode) {
				if (editor.node.isSimplyParent(parent.parentNode)) {
					return true;
				}
				parent = parent.parentNode;
			}
			return false;
		},
		getSimplyParent : function(checkParent) {
			if (editor.node.isSimplyParent(checkParent)) {
				return checkParent;
			}
			var parent = checkParent;
			while (parent && parent.parentNode) {
				if (editor.node.isSimplyParent(parent.parentNode)) {
					return parent.parentNode;
				}
				parent = parent.parentNode;
			}
			return false;
		},
		isSimplyParent : function(elm) {
			if (elm.getAttribute) {
				if (elm.getAttribute("data-simply-field")) {
					return true;
				}
				if (elm.getAttribute("data-simply-list")) {
					return true;
				}
				if (elm.getAttribute("data-simply-selectable")) {
					return true;
				}
			}
			return false;
		},
		getSimplyField : function(checkParent) {
			if (editor.node.isSimplyField(checkParent)) {
				return checkParent;
			}
			var parent = checkParent;
			while (parent && parent.parentNode) {
				if (editor.node.isSimplyField(parent.parentNode)) {
					return parent.parentNode;
				}
				parent = parent.parentNode;
			}
			return false;
		},
		isSimplyField : function(elm) {
			if (elm.getAttribute) {
				if (elm.getAttribute("data-simply-field")) {
					return true;
				}
			}
			return false;
		},
		hasToolbarParent : function(checkParent) {
			var parent = checkParent;
			while (parent && parent.parentNode) {
				if (typeof parent.parentNode.className  === "string" && parent.parentNode.className.match(/\bsimply-toolbar\b/)) {
					return true;
				}
				if (typeof parent.parentNode.className  === "string" && parent.parentNode.className.match(/\bsimply-dialog\b/)) {
					return true;
				}
				parent = parent.parentNode;
			}
			return false;
		},
		getUneditableParent : function(checkParent) {
			var parent = checkParent;
			while (parent) {
				if (typeof parent.className === "string" && parent.className.match(/\buneditable\b/)) {
					return parent;
				} else if (typeof parent.className === "string" && parent.className.match(/\beditable\b/)) {
					return false;
				}
				parent = parent.parentNode;
			}
			return false;
		},
		getAllStyles : function(elem) {
			if (!elem) return []; // Element does not exist, empty list.
			if (elem == document) { return []; } // Document is not what we are looking for;

			var win = document.defaultView || window, style, styleNode = [];
			var i;

			if (win.getComputedStyle) { /* Modern browsers */
				style = win.getComputedStyle(elem, '');
				for (i=0; i<style.length; i++) {
					styleNode[style[i]] = style.getPropertyValue(style[i]);
					//			   ^name ^		   ^ value ^
				}
			} else if (elem.currentStyle) { /* IE */
				style = elem.currentStyle;
				for (var name in currentStyle) {
					styleNode[name] = currentStyle[name];
				}
			} else { /* Ancient browser..*/
				style = elem.style;
				for (i=0; i<style.length; i++) {
					styleNode[style[i]] = style[style[i]];
				}
			}
			return styleNode;
		},
		getEditableField : function() {
			var sel = vdSelectionState.get();
			var parent = vdSelection.getNode(sel);
			if (sel) {
				while(parent && parent != document) {
					if (typeof parent.className === "string" && parent.className.match(/\beditable\b/)) {
						return parent;
					} else if (parent.getAttribute("data-simply-field") && (parent.getAttribute("data-simply-content") !== "template")) {
						return parent;
					} else {
						parent = parent.parentNode;
					}
				}
				return false;
			}
			return false;
		},
		replaceTags : function(source, target) {
			var field = editor.node.getEditableField();
			if (!field) {
				return;
			}
			var sel = vdSelectionState.get();
			simply.editor.bookmarks.set(sel);

			var elms = field.querySelectorAll(source);
			for (var i=0; i<elms.length; i++) {
				var newNode = document.createElement(target);
				newNode.innerHTML = elms[i].innerHTML;

				elms[i].parentNode.replaceChild(newNode, elms[i]);
			}

			simply.editor.bookmarks.select();
			simply.editor.bookmarks.remove();
		},
		replaceAlignToClass : function(source, target) {
			var field = editor.node.getEditableField();
			if (!field) {
				return;
			}

			var elms = field.querySelectorAll("[style='text-align: " + source + ";'], [align='" + source + "']");
			for (var i=0; i<elms.length; i++) {
				elms[i].classList.remove("simply-text-align-left");
				elms[i].classList.remove("simply-text-align-right");
				elms[i].classList.remove("simply-text-align-justify");
				elms[i].classList.remove("simply-text-align-center");

				elms[i].classList.add(target);
				elms[i].removeAttribute("style");
				elms[i].removeAttribute("align");
			}
		},
		replaceClassToAlign : function(source, target) {
			var field = editor.node.getEditableField();
			if (!field) {
				return;
			}
			var elms = field.querySelectorAll("[class*='" + source + "']");
			for (var i=0; i<elms.length; i++) {
				elms[i].classList.remove(source);
				elms[i].setAttribute("style", "text-align: " + target + ";");
				elms[i].setAttribute("align", target);
			}
		},
		unwrap : function(el, target) {
			if ( !target ) {
				target = el.parentNode;
			}
			if (!target) {
				return;
			}
			while (el.firstChild) {
				target.insertBefore(el.firstChild, el);
			}
			if (el.parentNode) {
				el.parentNode.removeChild(el);
			}
		},
		wrap : function(node, element) {
			var sel = window.getSelection();
			var range, savedRange;
			if (sel.rangeCount) {
				range = sel.getRangeAt(0);
				savedRange = {
					startContainer : range.startContainer,
					endContainer : range.endContainer,
					startOffset : range.startOffset,
					endOffset : range.endOffset
				};
			}

			var el = element;
			if (typeof el === "string") {
				el = document.createElement(el);
			}

			node.parentNode.insertBefore(el, node);
			if (el.parentNode == node.parentNode) {
				el.appendChild(node);
				if (savedRange) {
					range.setStart(savedRange.startContainer, savedRange.startOffset);
					range.setEnd(savedRange.endContainer, savedRange.endOffset);
					sel.removeAllRanges();
					sel.addRange(range);
				}
				return el;
			} else {
				return false;
			}
		},
		escapeHtml : function(text) {
			return text.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#039;");
		},
		findClassNode : function(node, selector) {
			// Helper function to find the node for a class
			// selector; It searches starting on the given node
			// and goes upwards to find the specific node; Only
			// parents of the starting node are valid results;

			if (!selector) {
				selector = hope.render.html.rules.nestingSets.block.join(","); // default to blocks only
			}
			var parents = editor.node.parents(node);
			var query = ":scope > " + selector.replace(/,/, ', :scope >');
			for (var i=0; i<parents.length; i++) {
				if (!(parents[i].isSimplyParent && parents[i].hasSimplyParent)) {
					var targets = parents[i].querySelectorAll(query);
					for (var j=0; j<targets.length; j++) {
						if (parents.indexOf(targets[j]) > -1) {
							return targets[j];
						}
					}
				}
			}
			return false;
		}
	};

	editor.context = {
		touching : false,
		skipUpdate : false,
		explain : {},
		weigh : function(filter, targets) {
			var sel = vdSelectionState.get();

			var target = targets.shift();

			var listBonus = false;
			if (target && target.clickStart) {
				listBonus = true;
			}

			if (!filter.context) {
				filter.context = "parent";
			}

			if (typeof editor.context.explain[filter.context] === "undefined") {
				editor.context.explain[filter.context] = [];
			}
			editor.context.explain[filter.context].push({
				"filter" : filter,
				"targets" : targets
			});

			while (target) {
				var tempNode = document.createElement("DIV");
				tempNode.appendChild(target.cloneNode(false));

				if (typeof editor.context.explain[filter.context] === "undefined") {
					editor.context.explain[filter.context] = [];
				}

				var result = 0;
				if (
					( (typeof filter.selector !== 'undefined') ? tempNode.querySelectorAll(":scope > " + filter.selector).length : true) && 
					( (typeof filter["sel-collapsed"] !== 'undefined') ? (sel.collapsed == filter["sel-collapsed"]) : true)
				) {
					editor.context.explain[filter.context].push("click depth score, +" + (50 * (targets.length+1)) + " points");
					result += 50 * (targets.length+1); // tagName weight
					if (typeof filter.selector !== 'undefined') {
						editor.context.explain[filter.context].push("class selector bonus, +" + (2*(filter.selector.split(".").length-1)) + " points");
						result += 2*(filter.selector.split(".").length-1); // Add the number of class selectors;
						editor.context.explain[filter.context].push("attribute selectors bonus, +" + (2*(filter.selector.split("[").length-1)) + " points");
						result += 2*(filter.selector.split("[").length-1); // Add the number of attribute selectors
					}

					if (listBonus) {
						var rect = target.getBoundingClientRect();
						if (
							target.clickStart.x > rect.left &&
							target.clickStart.x < rect.right &&
							target.clickStart.y < rect.bottom &&
							target.clickStart.y > rect.top
						) {
							// click was in the element; less value for lists and list items;
							if (target.getAttribute("contenteditable") && filter.context && (typeof filter["list-bonus"] !== 'undefined')) {
								editor.context.explain[filter.context].push("filter has list-bonus, but click was in the element, -5 points");
								result -= 5;
							}
						} else {
							// click was outside the element; more value for lists and list items;
							if (typeof filter["list-bonus"] !== 'undefined') {
								editor.context.explain[filter.context].push("filter has list-bonus, click was outside the element; +" + 50 * (targets.length) + " points");
								result += 50 * (targets.length);
							}
						}
					}

					if (typeof filter["sel-collapsed"] !== 'undefined') {
						editor.context.explain[filter.context].push("filters on selection collapsed, +1 point");
						result += 1;
					}
					if (typeof filter.parent == 'undefined') {
						editor.context.explain[filter.context].push("result = " + result);
						return result;
					} else {
						var parentResult = editor.context.weigh(filter.parent, targets);
						if (parentResult) {
							editor.context.explain[filter.context].push("has parent filter value, +" + parentResult + " points");
							editor.context.explain[filter.context].push(editor.context.explain.parent);
							editor.context.explain[filter.context].push("result = " + parseInt(result + parentResult));
							return result + parentResult;
						} else {
							editor.context.explain[filter.context].push("parent filter did not match, result = 0");
							return 0;
						}
					}
				}
				if (!(target.tagName.toLowerCase() == "td" && target.parentNode && target.parentNode.getAttribute("data-simply-list-item"))) {
					// Special case for td, because the :before for the list item is set on the TD instead of the TR; We need to keep the list bonus one cycle longer;
					listBonus = false;
				}
				target = targets.shift();
			}
			editor.context.explain[filter.context].push("result = 0");
			return 0;
		},
		get : function() {
			editor.context.explain = {};

			var sel = vdSelectionState ? vdSelectionState.get() : false;

			if (sel) {
				var parent = vdSelection.getNode(sel);

				if ((parent && parent.getAttribute && (parent.getAttribute("contenteditable") || parent.getAttribute("data-simply-selectable"))) || editor.node.hasEditableParent(parent)) {
					if (parent || parent.getAttribute || parent.getAttribute("contenteditable")) {
						var validFilters = {};
						var bestFilter = false;
						var bestFilterWeight = 0;
						for (var i in editor.contextFilters) {
							var filter = editor.contextFilters[i];
							var filterWeight = editor.context.weigh(filter, editor.node.parents(parent));

							if (filterWeight) {
								validFilters[i] = filterWeight;
								if (filterWeight > bestFilterWeight) {
									bestFilter = filter.context;
									bestFilterWeight = filterWeight;
								}
							}
						}
						editor.context.explain.validFilters = validFilters;

						return bestFilter;
					} else {
						if (sel.collapsed) {
							editor.context.explain['simply-text-cursor'] = ["cursor is in a contentEditable field and selection is collapsed."];
							return "simply-text-cursor";
						} else {
							editor.context.explain['simply-text-selection'] = ["cursor is in a contentEditable field and selection is not collapsed."];
							return "simply-text-selection";
						}
					}
				} else {
					editor.context.explain['simply-no-context'] = ["selection parent is not editable, not selectable and does not have an editable parent"];
					return "simply-no-context";
				}
			}
		},
		toolbar : {
			getPosition : function(sel, useCursor) {
				var ltop, lleft, rleft, rtop, top, left;

				var range = sel; //.getRangeAt(0);
				if ( !range ) {
					return null;
				}
				var rects = range.getClientRects();
				var parent = vdSelection.getNode(sel);

				if ( !rects.length ) {
					muze.event.fire(range.startContainer, "databinding:pause");
					var focusedElement = document.querySelector(":focus");
					var selStart = focusedElement ? focusedElement.selectionStart : 0;
					var selEnd = focusedElement ? focusedElement.selectionEnd : selStart;

					// insert element at range and get its position, other options aren't exact enough
					var span = document.createElement('span');
					if ( span.getClientRects ) {
						// Ensure span has dimensions and position by
						// adding a zero-width space character
						try {
							span.appendChild( document.createTextNode("\u200b") );
							range.insertNode(span);
							rects = span.getClientRects();
							var spanParent = span.parentNode;
							spanParent.removeChild(span);
							// Glue any broken text nodes back together
							spanParent.normalize();
						} catch(e) {
							console.log(e);
						}
						if (focusedElement) {
							focusedElement.focus(); // Restore focus after chrome lost it when inserting the span.
							focusedElement.selectionStart = selStart;
							focusedElement.selectionEnd = selEnd;
						}
					}


					muze.event.fire(range.startContainer, "databinding:resume");
				}
				if ( rects.length ) {
					ltop = rects[0].top;
					lleft = rects[0].left;
					rleft = rects[rects.length-1].right;
					rtop = rects[rects.length-1].bottom; 
				}
				if ( parent && ( !rects.length || (parent.getAttribute("data-simply-selectable") ) ) ) {
					pos = parent && parent.getBoundingClientRect ? parent.getBoundingClientRect() : { left: 0, top: 0, right: 0, bottom: 0};
					lleft = pos.left;
					ltop = pos.top;
					rleft = pos.right;
					rtop = pos.bottom;
				}
				// fallback... if nothing else works
				if ( lleft === 0 && rleft === 0 && ltop === 0 && rtop === 0 ) {
					parent = vdSelection.parentNode(sel);
					if ( !parent || !parent.getBoundingClientRect ) {
						return false;
					}
					pos = parent.getBoundingClientRect();
					lleft = pos.left;
					ltop = pos.top;
					rleft = pos.right;
					rtop = pos.bottom;
				}

				if (window.getComputedStyle(document.body).position == "static") {
					ltop += Math.max(document.body.scrollTop, document.documentElement.scrollTop);
					lleft += Math.max(document.body.scrollLeft, document.documentElement.scrollLeft);
					rtop += Math.max(document.body.scrollTop, document.documentElement.scrollTop);
					rleft += Math.max(document.body.scrollLeft, document.documentElement.scrollLeft);
				} else {
					ltop -= document.body.getClientRects()[0].top;
					rtop -= document.body.getClientRects()[0].top;
				}

				top = Math.max(ltop, rtop);
				left = lleft + ((rleft - lleft) / 2);

				return { top: top, left: left, ltop: ltop, lleft: lleft, rtop: rtop, rleft: rleft };
			},
			reposition : function() {
				var markerLeft, scrollHeight, scrollTop;

				var sel = vdSelectionState.get();
				var currentContext = editor.context.get();
				var activeSection = editor.toolbarsContainer.getElementById(currentContext);
				var pos = editor.context.toolbar.getPosition(sel);
				if ( !pos || !activeSection ) {
					// editor.context.toolbar.hide = true;
					return;
				}

				// skip repositioning if the element is
				// returning all 0 values, this happens when
				// the selection element is no longer in
				// view (for instance, pulldown menu element
				// which is no longer active). It is better
				// to leave the toolbar where it is in this
				// case;
				if (pos.top === 0 && pos.left === 0 && pos.ltop === 0 && pos.lleft === 0 && pos.rtop === 0 && pos.rleft === 0) {
					return;
				}

				var top = pos.top;
				var left = pos.left;
				var activeToolbar = activeSection.querySelector("div.simply-toolbar");
				top += document.body.offsetTop;
				var newleft = left - (activeToolbar.offsetWidth/2);

				// Recalculate toolbar position if it is off-screen left/right
				if (newleft < document.body.scrollLeft) {
					markerLeft = Math.max(activeToolbar.offsetWidth/2 + newleft - document.body.scrollLeft, 20) + "px";
				} else if (newleft + activeToolbar.offsetWidth > document.body.offsetWidth + document.body.scrollLeft) {
					var delta = newleft + activeToolbar.offsetWidth - document.body.offsetWidth - document.body.scrollLeft;
					markerLeft = Math.min(activeToolbar.offsetWidth/2 + delta, activeToolbar.offsetWidth - 20) + "px";
				} else {
					markerLeft = "50%";
				}
				activeToolbar.getElementsByClassName("marker")[0].style.left = markerLeft;

				// Recalculate toolbar position if it is off-screen left/right
				if (newleft < document.body.scrollLeft) {
					newleft = document.body.scrollLeft;
				} else if (newleft + activeToolbar.offsetWidth > document.body.offsetWidth + document.body.scrollLeft) {
					newleft = document.body.offsetWidth -  activeToolbar.offsetWidth + document.body.scrollLeft;
				} else {
				}

				// Recalculate the toolbar width, the browser messes this up because the buttons are floating;
				var buttons = activeToolbar.querySelectorAll("ul.simply-buttons > li");
				var width = activeToolbar.offsetWidth;
				var newWidth = 0;
				for (var i=0; i<buttons.length; i++) {
					newWidth += buttons[i].offsetWidth;
				}

				// activeToolbar.style.width = newWidth + "px"; // FIXME: This messes up when expanding a section with more items than the top section;

				// hide the marker if no active buttons are left;
				if (newWidth === 0) {
					activeToolbar.getElementsByClassName("marker")[0].style.display = "none";
				} else {
					activeToolbar.getElementsByClassName("marker")[0].style.display = "block";
				}

				// Move the toolbar to beneath the top of the selection if the toolbar goes out of view;
				// check the position 
				// - if toolbar bottom <= editor pane bottom, no problem
				// - if toolbar can be repositioned, no problem
				// - if edit pane content can be scrolled down, no problem
				// - else: add space on the bottom so that you can scroll down
				var editPaneRect = {
					height : Math.max(document.body.scrollTop, document.documentElement.scrollTop) + window.innerHeight
				};

				var toolbarRect = activeSection.getBoundingClientRect();

				if ( top + toolbarRect.height > editPaneRect.height ) {
					// toolbar extends beyond bottom edge if not repositioned
					var mintop = Math.min(pos.ltop, pos.rtop);
					if ( mintop + toolbarRect.height <= editPaneRect.height ) {
						// toolbar can be repositioned
						// FIXME: min top should be position of the cursor, not selection
						top = editPaneRect.height - toolbarRect.height - 32; // 32 to allow space for scrollbars;
					} else {
						top = mintop;
						scrollHeight = Math.max(document.body.scrollHeight, document.body.clientHeight);
						scrollTop    = Math.max(document.body.scrollTop, document.documentElement.scrollTop);
						if ( scrollTop >= (scrollHeight - document.body.clientHeight - toolbarRect.height ) ) {
							// no more scroll space, so add it.
							document.body.classList.add('simply-footer-space');
						}

						/*
						if ( top + toolbarRect.height > editPaneRect.height ) {
							// FIXME: even after adding footer space, we still don't fit. Now what?
						}
						*/
					}
				}

				if ( document.body.classList.contains('simply-footer-space') ) {
					scrollHeight = Math.max(document.body.scrollHeight, document.body.clientHeight);
					scrollTop    = Math.max(document.body.scrollTop, document.documentElement.scrollTop);
					if ( scrollTop < (scrollHeight - document.body.clientHeight - toolbarRect.height - 132 )) {
						document.body.classList.remove('simply-footer-space');
					}
				}
				activeSection.style.top = top + 10 + "px"; // 10 is the height of the marker arrow
				activeSection.style.left = newleft + "px";
			}
		},
		show : function() {
			var currentContext = editor.context.get();

			var sections = editor.toolbarsContainer.querySelectorAll("section.simply-section");
			for (var i=0; i<sections.length; i++) {
				if(sections[i].classList.contains("active")) {
					sections[i].classList.remove("active");
				}
			}

			editor.context.initProperties(currentContext);

			var hideIt = function() {
				var sections = editor.toolbarsContainer.querySelectorAll("section.simply-section");
				for (var j=0; j<sections.length; j++) {
					if (!(sections[j].className.match(/active/))) {
						if (parseInt(sections[j].style.left) > -1) {
							sections[j].style.left = "-10000px";
						}
					}
				}
			};
			//window.setTimeout(hideIt, 200);

			var activeSection = editor.toolbarsContainer.getElementById(currentContext);
			// console.log(activeSection);

			if (activeSection && !editor.context.toolbar.hide) {
				var htmlContext = activeSection.querySelectorAll("div.simply-toolbar-status")[0];
				if ( htmlContext ) {
					if (!htmlContext.classList.contains("simply-selected")) {
						htmlContext.classList.add("simply-selected");
					}
				}
				// activeSection.style.display = "block";
				activeSection.className += " active";
				hideIt(); // window.setTimeout(hideIt, 200);


				var sel = vdSelectionState.get();
				var parent = vdSelection.getNode(sel);
				if (parent == document) {
					return;
				}

				editor.context.toolbar.reposition();

				if (editor.context.touching) {
					// FIXME: Android fix here
					// restore selection triggers contextupdate, which triggers restore selection - this hopefully prevents that loop.
					editor.context.skipUpdate = true;
					if (!sel.collapsed) {
						// FIXME: This reverses the
						// current selection, which
						// causes problems selecting
						// from right to left; It is
						// needed to allow text
						// selection on android.
						vdSelectionState.restore(sel); 
					}
					window.setTimeout(function() { editor.context.skipUpdate = false;}, 20);
				}
			} else {
				hideIt();
			}

			if (editor.toolbarsContainer.getElementById("VD_DETAILS")) {
				if (showBorders) {
					editor.toolbarsContainer.getElementById('VD_DETAILS').classList.add('simply-selected');
				} else {
					editor.toolbarsContainer.getElementById('VD_DETAILS').classList.remove('simply-selected');
				}
			}

			if (editor.toolbarsContainer.getElementById('vdShowTagBoundaries')) {
				if (showTagBoundaries) {
					editor.toolbarsContainer.getElementById('vdShowTagBoundaries').classList.add('simply-selected');
				} else {
					editor.toolbarsContainer.getElementById('vdShowTagBoundaries').classList.remove('simply-selected');
				}
			}

			if (editor.toolbarsContainer.getElementById('vdShowTagStack')) {
				if (showTagStack) {
					editor.toolbarsContainer.getElementById('vdShowTagStack').classList.add('simply-selected');
				} else {
					editor.toolbarsContainer.getElementById('vdShowTagStack').classList.remove('simply-selected');
				}
			}
		},
		initProperties : function(context) {
			switch (context) {
				case "simply-text-selection" :
				case "simply-table-cell-selection":
				case "simply-image" :
				case "simply-hyperlink" :
					editor.context.toolbar.hide = false;
				break;
				default:
				break;
			}
			
			if (editor.toolbars[context] && editor.toolbars[context].update) {
				editor.toolbar.updating = true;
				editor.toolbars[context].update(editor.toolbarsContainer.getElementById(context));
				editor.toolbar.updating = false;
			}
		},
		fixSelection : function() {
			// check the current selection and update it if necessary
			var sel = vdSelectionState.get();
			var parent = vdSelection.getNode(sel);

			// console.log(parent);
			var selParent = editor.node.getUneditableParent(parent);
			if (selParent) {
				// console.log(selParent);
				// Selection if part of something uneditable
				sel.selectNode(selParent);
				sel.startContainer.ownerDocument.defaultView.getSelection().removeAllRanges();
				sel.startContainer.ownerDocument.defaultView.getSelection().addRange(sel);
				vdSelectionState.save(sel);
				sel.startContainer.ownerDocument.defaultView.getSelection().removeAllRanges();
			}

		},
		getTagStack : function() {
			var sel	= vdSelectionState.get();
			var parent = vdSelection.getNode(sel);
			var newContextStack	= [];

			if (sel) {
				while (parent && editor.node.hasEditableParent(parent) && parent.parentNode) {
					newContextStack.push(parent);
					parent=parent.parentNode;
				}
			}

			return newContextStack;
		},
		update : function() {
			// Check if the current selection is part of an uneditable thing, if so, move the selection to that parent;
			var sel = vdSelectionState.get();
			var parent = vdSelection.getNode(sel);

			// Skip the update when the selection is within a toolbar;
			if (editor.node.hasToolbarParent(parent)) {
				return;
			}
			if (document.querySelector(":focus") && editor.node.hasToolbarParent(document.querySelector(":focus"))) {
				return;
			}
			if (editor.context.skipUpdate) {
				return;
			}
			if (editor.context.touching) {
				return;
			}
			if (editor.toolbarsContainer.querySelector(".simply-dialog.active")) {
				return;
			}

			var field = editor.node.getEditableField();
			hopeEditor = field.hopeEditor;
			editor.context.fixSelection();
			if ((typeof hopeEditor !== "undefined") && hopeEditor.needsUpdate) {
				hopeEditor.selection.updateRange();
				hopeEditor.parseHTML(); // FIXME: This causes flickering in Firefox and random cursor movement;
				hopeEditor.needsUpdate = false;
			}
			editor.context.show();
			vdHtmlContextStack = editor.context.getTagStack();
		}
	};

	editor.plugins.dialog = {
		backdrop : null,
		open : function(target, callback) {
			vdSelectionState.save(vdSelectionState.get());
			editor.plugins.dialog.selectionIsCollapsed = window.getSelection().isCollapsed;

			if (!editor.plugins.dialog.backdrop) {
				editor.plugins.dialog.createBackdrop();
			}
			document.body.classList.add("simply-overflow-hidden");
			editor.plugins.dialog.backdrop.style.display = "block";
			target.classList.add("active");

			editor.plugins.dialog.currentField = editor.node.getEditableField();
			if (editor.plugins.dialog.currentField.hopeEditor) {
				editor.plugins.dialog.currentField.hopeEditor.selection.updateRange();
				var range = editor.plugins.dialog.currentField.hopeEditor.selection.getRange();
				editor.plugins.dialog.currentField.hopeEditor.currentRange = range;
			}

			if (typeof callback == "function") {
				callback();
			}
			window.setTimeout(function() {
				var sel = window.getSelection();
				sel.removeAllRanges();
			}, 10);
		},
		close : function(callback) {
			target = editor.toolbarsContainer.querySelector(".simply-dialog.active");
			editor.plugins.dialog.backdrop.style.display = "none";
			document.body.classList.remove("simply-overflow-hidden");
			target.classList.remove("active");

			var hopeEditor = editor.plugins.dialog.currentField.hopeEditor;
			if (hopeEditor) {
				editor.fireEvent("databinding:pause", editor.plugins.dialog.currentField);
				hopeEditor.parseHTML();
				hopeEditor.update();
				hopeEditor.selection.updateRange(hopeEditor.currentRange.start, hopeEditor.currentRange.end);
				hopeEditor.showCursor();
				editor.fireEvent("databinding:resume", editor.plugins.dialog.currentField);
			} else {
				vdSelectionState.restore(vdSelectionState.get());
				if (editor.plugins.dialog.selectionIsCollapsed) {
					window.setTimeout(function() {
						var sel = window.getSelection();
						sel.removeAllRanges();
					}, 10);
				}
			}
			vdSelectionState.remove();
			if (typeof callback == "function") {
				callback();
			}
		},
		createBackdrop : function() {
			if (!editor.plugins.dialog.backdrop) {
				backdrop = document.createElement("IFRAME");
				backdrop.className = "simply-dialog-backdrop";
				backdrop.style.display = "none";
				backdrop.style.width = "100%";
				backdrop.style.height = "100%";
				backdrop.style.top = 0;
				backdrop.style.left = 0;
				backdrop.style.position = "fixed";
				backdrop.style.zIndex = 100001;
				backdrop.style.border = 0;
				backdrop.style.backgroundColor = "rgba(255,255,255,0.7)";
				document.body.appendChild(backdrop);
				editor.plugins.dialog.backdrop = backdrop;
			}
		},
		fullscreen : function(button) {
			var dialog = editor.plugins.dialog.getDialogEl(button);
			if (dialog.classList.contains("fullscreen")) {
				button.classList.remove("simply-selected");
				dialog.classList.remove("fullscreen");
			} else {
				button.classList.add("simply-selected");
				dialog.classList.add("fullscreen");
			}
			editor.fireEvent("resize", document);
		},
		getDialogEl : function(el) {
			while ( el && el.tagName!='div' && !/\bsimply-dialog\b/.test(el.className) ) {
				el = el.parentNode;
			}
			return el;
		}
	};
	editor.addAction("simply-dialog-fullscreen", editor.plugins.dialog.fullscreen);
	editor.addAction("simply-dialog-close", editor.plugins.dialog.close);
	editor.addAction("simply-main-collapse", function() {
		editor.toolbarsContainer.querySelector("#simply-main-toolbar").classList.toggle("simply-collapse");
	});

	editor.context.toolbar.hide = false;

	document.addEventListener("click", function(event) {
		var target = muze.event.target(event);
		if( target.tagName.toLowerCase() === 'img' ) {
			var range = document.createRange();
			range.selectNode(target);
			var sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
			if (focus in target) {
				target.focus();
			}
			editor.context.update();
		}
	});

	function monitorIframe() {
		// monitor for iframes that get focus;
		if (editor.monitor) {
			// already monitoring iframes;
			return;
		}

		editor.monitor = setInterval(function(){
			var elem = document.activeElement;
			if(elem && elem.tagName == 'IFRAME'){
				if (editor.context.currentIframe != elem) {
					editor.context.currentIframe = elem;
					var sel = vdSelectionState.get();
					sel.selectNode(elem);
					sel.startContainer.ownerDocument.defaultView.getSelection().removeAllRanges();
					sel.startContainer.ownerDocument.defaultView.getSelection().addRange(sel);
					vdSelectionState.save(sel);
					sel.startContainer.ownerDocument.defaultView.getSelection().removeAllRanges();
					editor.context.update();
				}
			} else {
				if (editor.context.currentIframe) {
					vdSelectionState.remove();
					vdSelectionState.restore();
					editor.context.update();
					editor.context.currentIframe = null;
				}
			}
		}, 100);		
	}

	var vdSelection, vdSelectionState;
	var initSelections = function() {
		if (typeof simply === "undefined" || typeof simply.editor === "undefined") {
			window.setTimeout(initSelections, 100);
			return;
		}
		vdSelectionState = simply.editor.selection;
		vdSelection = simply.dom.selection;
		vdSelectionState.init(window);
		simply.editor.selectionchange.start(document); // onselectionchange event for Firefox

		editor.selectionChangeTimer = false;

		muze.event.attach( document, 'selectionchange', function() {
			if (editor.selectionChangeTimer) {
				return;
			}
			// throttle selection changed - only execute this once in one loop;
			editor.selectionChangeTimer = window.setTimeout(function() {
				editor.selectionChangeTimer = false;
				var field = editor.node.getEditableField();
				var hopeEditor = field.hopeEditor;
				if (hopeEditor) {
					if (hopeEditor.field == editor.node.getSimplyParent(document.activeElement)) {
						editor.context.hopeEditor = hopeEditor;
						hopeEditor.selection.updateRange();
						var range = hopeEditor.selection.getRange();
						hopeEditor.currentRange = range;
					}
				}

				if (editor.context.touching) {
					editor.context.touching = false; // force update when selection changed;
					editor.context.update();
					editor.context.touching = true;
				} else {
				//	editor.context.update(); // removed; the update will be triggered by the mouseup/keyup events;
				}
			}, 0);
		});

		muze.event.attach( document, 'keyup', function(evt) {
			// skip context updates when the keyup event is coming from autofilled (username/password) inputs, to prevent looping in chrome when credentials are saved.
			try {
				if (evt.target && evt.target.matches && evt.target.matches(":-webkit-autofill")) {
					return;
				}
			} catch(e) {
				if (e.code !== e.SYNTAX_ERR) {
					throw e;
				}
				if (!e.message.match(":-webkit-autofill")) {
					throw e;
				}
				// catch the error for SyntaxError: ':-webkit-autofill' is not a valid selector, let the rest bubble up;
			}
			editor.context.update();
		});

		muze.event.attach( document, 'mouseup', function(evt) {
			if (!document.querySelector(":focus")) {
				// firefox on mac doesn't set focus for the mouseup until after the event;
				evt.target.focus();
			}
			editor.context.toolbar.hide = false;
			editor.context.update();
		});

		muze.event.attach( document, 'scroll', editor.context.toolbar.reposition );
		muze.event.attach( document, 'touchstart', function(evt) {
			editor.context.touching = true;
		});
		muze.event.attach( document, 'touchend', function(evt) {
			window.setTimeout(function() {
				editor.context.touching = false;
			}, 1);
		});

		monitorIframe();
	};

	initSelections();