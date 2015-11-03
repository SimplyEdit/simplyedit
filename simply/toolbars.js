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
		handleButton : function(el) {
			var toolbar = editor.toolbar.getToolbarEl(el);
			var section = editor.toolbar.getSectionEl(el);
			var i;
			var l;
			var selectedSectionButtons;


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
		},
		addMarkers : function() {
			var toolbars = document.querySelectorAll(".simply-toolbar");

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
			if (typeof hopeEditor == "undefined") {
				var currentField = editor.node.getEditableField();
				hopeEditor = currentField.hopeEditor;
			}

			if (hopeEditor) {
				editor.context.skipUpdate = true;
				if (!document.querySelector(".simply-dialog.active")) {
					hopeEditor.parseHTML();
				}
				
				window.setTimeout(function() {
					editor.context.skipUpdate = false;
				}, 50);
			}
		},
		init : function(toolbar) {
			toolbar.addEventListener("click", function(evt) {
				evt.preventDefault();
				var el = evt.target;
				if ( el.tagName=='I' ) {
					el = el.parentNode;
				}

				if ( el.tagName == 'BUTTON' ) {
					switch(el.getAttribute("data-simply-action")) {
						case null:
						break;
						default:
							var action = editor.actions[el.getAttribute("data-simply-action")];
							if (action) {
								editor.toolbar.beforeAction();
								var result = action(el);
								editor.context.show();
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
				}
			});

			var inputs = toolbar.querySelectorAll("select[data-simply-action], input[data-simply-action], textarea[data-simply-action]");
			var handleChange = function(evt) {
				var action = editor.actions[this.getAttribute("data-simply-action")];
				if (action) {
					editor.toolbar.beforeAction();
					var result = action(this.value);
				} else {
					console.log(this.getAttribute("data-simply-action") + " not yet implemented");
				}
			};

			for (var i=0; i<inputs.length; i++) {
				inputs[i].addEventListener("change", handleChange);
			}

			editor.toolbar.addMarker(toolbar);
		}
	};

	var lastEl = null;
	var lastSection = document.querySelector('.simply-toolbar-status');
	var simplySections = document.querySelectorAll(".simply-section");

	editor.node = {
		parents : function(target) {
			var result = [];
			// while(target && (target.nodeType == 1) && !target.classList.contains("editable")) {
			while(target && (target.nodeType == 1)) {
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
				if (parent.parentNode.className && parent.parentNode.className.match(/\beditable\b/)) {
					return true;
				}
				parent = parent.parentNode;
			}
			return false;
		},
		hasToolbarParent : function(checkParent) {
			var parent = checkParent;
			while (parent && parent.parentNode) {
				if (parent.parentNode.className && parent.parentNode.className.match(/\bsimply-toolbar\b/)) {
					return true;
				}
				if (parent.parentNode.className && parent.parentNode.className.match(/\bsimply-dialog\b/)) {
					return true;
				}
				parent = parent.parentNode;
			}
			return false;
		},
		getUneditableParent : function(checkParent) {
			var parent = checkParent;
			while (parent) {
				if (parent.className && parent.className.match(/\buneditable\b/)) {
					return parent;
				} else if (parent.className && parent.className.match(/\beditable\b/)) {
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
					if (parent.className && parent.className.match(/\beditable\b/)) {
						return parent;
					} else if (parent.getAttribute("data-simply-field")) {
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
			while (el.firstChild) {
				target.insertBefore(el.firstChild, el);
			}
			el.parentNode.removeChild(el);
		}
	};

	editor.context = {
		touching : false,
		skipUpdate : false,
		weigh : function(filter, targets) {
			var sel = vdSelectionState.get();

			var target = targets.shift();
			while (target) {
				var tempNode = document.createElement("DIV");
				tempNode.appendChild(target.cloneNode(false));
				var result = 0;
				if (
					( (typeof filter.selector !== 'undefined') ? tempNode.querySelectorAll(":scope > " + filter.selector).length : true) && 
					( (typeof filter["sel-collapsed"] !== 'undefined') ? (sel.collapsed == filter["sel-collapsed"]) : true)
				) {
					result += 50 * (targets.length+1); // tagName weight
					if (typeof filter.selector !== 'undefined') {
						result += 2*(filter.selector.split(".").length-1); // Add the number of class selectors;
						result += 2*(filter.selector.split("[").length-1); // Add the number of attribute selectors
					}

					if (typeof filter["sel-collapsed"] !== 'undefined') {
						result += 1;
					}
					if (typeof filter.parent == 'undefined') {
						return result;
					} else {
						var parentResult = editor.context.weigh(filter.parent, targets);
						if (parentResult) {
							return result + parentResult;
						} else {
							return 0;
						}
					}
				}
				target = targets.shift();
			}
			return 0;
		},
		get : function() {
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
						return bestFilter;
					} else {
						if (sel.collapsed) {
							return "simply-text-cursor";
						} else {
							return "simply-text-selection";
						}
					}
				} else {
					return "simply-no-context";
				}
			}
		},
		toolbar : {
			getPosition : function(sel) {
				var ltop, lleft, rleft, rtop, top, left;

				var range = sel; //.getRangeAt(0);
				if ( !range ) {
					return null;
				}
				var rects = range.getClientRects();
				var parent = vdSelection.getNode(sel);
				if ( !rects.length ) {
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
						}
					}
				}
				if ( rects.length ) {
					ltop = rects[0].top;
					lleft = rects[0].left;
					rleft = rects[rects.length-1].right;
					rtop = rects[rects.length-1].bottom; 
				}
				if ( !rects.length || parent.getAttribute("data-simply-selectable") ) {
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

				ltop += Math.max(document.body.scrollTop, document.documentElement.scrollTop);
				lleft += Math.max(document.body.scrollLeft, document.documentElement.scrollLeft);
				rtop += Math.max(document.body.scrollTop, document.documentElement.scrollTop);
				rleft += Math.max(document.body.scrollLeft, document.documentElement.scrollLeft);

				top = Math.max(ltop, rtop);
				left = lleft + ((rleft - lleft) / 2);

				return { top: top, left: left, ltop: ltop, lleft: lleft, rtop: rtop, rleft: rleft };
			},
			reposition : function() {
				var markerLeft, scrollHeight, scrollTop;

				var sel = vdSelectionState.get();
				var currentContext = editor.context.get();

				var activeSection = document.getElementById(currentContext);
				var pos = editor.context.toolbar.getPosition(sel);
				if ( !pos || !activeSection ) {
					// editor.context.toolbar.hide = true;
					return;
				}
				var top = pos.top;
				var left = pos.left;
					
				var activeToolbar = activeSection.querySelector("div.simply-toolbar");
				top += document.body.offsetTop;
				var newleft = left - (activeToolbar.offsetWidth/2);
				if (newleft < 0) {
					markerLeft = activeToolbar.offsetWidth/2 + newleft;
					activeToolbar.getElementsByClassName("marker")[0].style.left = markerLeft+'px';
					newleft = 0;
				} else if (newleft + activeToolbar.offsetWidth > document.body.offsetWidth) {
					var delta = newleft + activeToolbar.offsetWidth - document.body.offsetWidth;
					markerLeft = activeToolbar.offsetWidth/2 + delta;
					activeToolbar.getElementsByClassName("marker")[0].style.left = markerLeft+'px';
					newleft = document.body.offsetWidth - activeToolbar.offsetWidth;
				} else {
					activeToolbar.getElementsByClassName("marker")[0].style.left = "50%";
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
						top = editPaneRect.height - toolbarRect.height;
					} else {
						top = mintop;
						scrollHeight = Math.max(document.body.scrollHeight, document.body.clientHeight);
						scrollTop    = Math.max(document.body.scrollTop, document.documentElement.scrollTop);
						if ( scrollTop >= (scrollHeight - document.body.clientHeight - toolbarRect.height ) ) {
							// no more scroll space, so add it.
							document.body.classList.add('simply-footer-space');
						}
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

			var sections = document.querySelectorAll("section.simply-section");
			for (var i=0; i<sections.length; i++) {
				if(sections[i].classList.contains("active")) {
					sections[i].classList.remove("active");
				}
			}

			editor.context.initProperties(currentContext);

			var hideIt = function() {
				var sections = document.querySelectorAll("section.simply-section");
				for (var j=0; j<sections.length; j++) {
					if (!(sections[j].className.match(/active/))) {
						if (parseInt(sections[j].style.left) > -1) {
							sections[j].style.left = "-10000px";
						}
					}
				}
			};
			//window.setTimeout(hideIt, 200);

			var activeSection = document.getElementById(currentContext);
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

			if (document.getElementById("VD_DETAILS")) {
				if (showBorders) {
					document.getElementById('VD_DETAILS').classList.add('simply-selected');
				} else {
					document.getElementById('VD_DETAILS').classList.remove('simply-selected');
				}
			}

			if (document.getElementById('vdShowTagBoundaries')) {
				if (showTagBoundaries) {
					document.getElementById('vdShowTagBoundaries').classList.add('simply-selected');
				} else {
					document.getElementById('vdShowTagBoundaries').classList.remove('simply-selected');
				}
			}

			if (document.getElementById('vdShowTagStack')) {
				if (showTagStack) {
					document.getElementById('vdShowTagStack').classList.add('simply-selected');
				} else {
					document.getElementById('vdShowTagStack').classList.remove('simply-selected');
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
				return editor.toolbars[context].update(document.getElementById(context));
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
			var field = editor.node.getEditableField();
			hopeEditor = field.hopeEditor;
			editor.context.fixSelection();
			editor.context.show();
			vdHtmlContextStack = editor.context.getTagStack();

		}
	};

	editor.plugins.dialog = {
		backdrop : null,
		open : function(target, callback) {
			vdSelectionState.save(vdSelectionState.get());
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
		},
		close : function(callback) {
			target = document.querySelector(".simply-dialog.active");
			editor.plugins.dialog.backdrop.style.display = "none";
			document.body.classList.remove("simply-overflow-hidden");
			target.classList.remove("active");
			vdSelectionState.remove();

			var hopeEditor = editor.plugins.dialog.currentField.hopeEditor;
			if (hopeEditor) {
				hopeEditor.parseHTML();
				hopeEditor.selection.updateRange(hopeEditor.currentRange.start, hopeEditor.currentRange.end);
				hopeEditor.showCursor();
			}

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

	editor.context.toolbar.hide = false;

	if( window.getSelection ) {
		var selection = document.defaultView.getSelection();
		if( selection && selection.setBaseAndExtent ) { // broken webkit
			document.addEventListener("click", function(event) {
				var target = muze.event.target(event);
				if( target.tagName == 'IMG' ) {
					var selection = document.defaultView.getSelection();
					selection.setBaseAndExtent(target, 0, target, 1);
					vdEditPane_DisplayChanged();
				}
			});
		}
	}

	function registerChange(field) {
	}

	var updateHtmlTimer;
	function vdEditPane_DisplayChanged() {
		if (updateHtmlTimer) {
			window.clearTimeout(updateHtmlTimer);
		}
		updateHtmlTimer = window.setTimeout(function() {
			editor.context.update();
		}, 100);

		return true;
	}

	function vdStoreUndo() {
	}

	function monitorIframe() {
		// monitor for iframes that get focus;
		var monitor = setInterval(function(){
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
		if (typeof simply === "undefined") {
			window.setTimeout(initSelections, 100);
			return;
		}
		vdSelectionState = simply.editor.selection;
		vdSelection = simply.dom.selection;
		vdSelectionState.init(window);
		selectionchange.start(document); // onselectionchange event for Firefox

		muze.event.attach( document, 'selectionchange', editor.context.update );
		muze.event.attach( document, 'keyup', editor.context.update );
		muze.event.attach( document, 'mouseup', function() {
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