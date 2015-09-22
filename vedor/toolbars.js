	(function() {
		function getToolbar(el) {
			while ( el && el.tagName!='div' && !/\bvedor-toolbar\b/.test(el.className) ) {
				el = el.parentNode;
			}
			return el;
		}

		function getSection(el) {
			while ( el && el.tagName!='div' && !/\bvedor-toolbar-section\b/.test(el.className) ) {
				el = el.parentNode;
			}
			return el;
		}

		var lastEl = null;
		var lastSection = document.querySelector('.vedor-toolbar-status');
		var vedorSections = document.querySelectorAll(".vedor-section");

		var toolbars = document.querySelectorAll(".vedor-toolbar");

		for (var i=0; i<toolbars.length; i++) {
			var marker = document.createElement("div");
			marker.className = "marker";
			toolbars[i].insertBefore(marker, toolbars[i].firstChild);
		}

		document.body.onclick = function(evt) {
//			evt.preventDefault();
			var el = evt.target;
			if ( el.tagName=='I' ) {
				el = el.parentNode;
			}
			if ( el.tagName == 'BUTTON' ) {
				var action = editor.actions[el.getAttribute("data-vedor-action")];
				if (action) {
					evt.preventDefault();
					var result = action(el);
					if (!result) {
						return;
					}
				}

				switch(el.getAttribute("data-vedor-action")) {
					case null:
					break;
					default:
						var action = editor.actions[el.getAttribute("data-vedor-action")];
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

				evt.target.blur();
				var toolbar = getToolbar(el);
				var section = getSection(el);
				if ( !section ) {
					var sections = toolbar.querySelectorAll('.vedor-toolbar-section.vedor-selected, .vedor-toolbar-status');
					for ( var i=0, l=sections.length; i<l; i++ ) {
						sections[i].className = sections[i].className.replace(/\bvedor-selected\b/,'');
					}
					var selectedSectionButtons = toolbar.querySelectorAll('ul.vedor-buttons button.vedor-selected');
					for ( var i=0, l=selectedSectionButtons.length; i<l; i++ ) {
						selectedSectionButtons[i].className = selectedSectionButtons[i].className.replace(/\bvedor-selected\b/,'');
					}
					if ( !selectedSectionButtons[0] || el != selectedSectionButtons[0] ) {
						el.className += ' vedor-selected';
						var rel = el.dataset.vedorSection;
						if ( rel ) {
							var target = toolbar.querySelectorAll('.vedor-toolbar-section.' + rel );
							if ( target && target[0] ) {
								target[0].className += ' vedor-selected';
								lastSection = target[0];
								lastSection.querySelectorAll("LI > *")[0].focus();
							}
						}
					} else {
						var status = toolbar.querySelectorAll('.vedor-toolbar-status')[0];
						if ( status ) {
							status.className += ' vedor-selected';
						}
					}
				} else {
					var selectedSectionButtons = section.querySelectorAll('.vedor-selected');
					for ( var i=0, l=selectedSectionButtons.length; i<l; i++ ) {
						selectedSectionButtons[i].className = selectedSectionButtons[i].className.replace(/\bvedor-selected\b/,'');
					}
					if ( !selectedSectionButtons[0] || el != selectedSectionButtons[0] ) {
						el.className += ' vedor-selected';
					}
				}
			}
		}
	})();

	function parents(target) {
		var result = [];
		// while(target && (target.nodeType == 1) && !target.classList.contains("editable")) {
		while(target && (target.nodeType == 1)) {
			result.push(target);
			target = target.parentNode;
		}

		return result;
	}

	function checkVedorContext(filter, targets) {
		var sel = vdSelectionState.get();

		while (target = targets.shift()) {
			var tempNode = document.createElement("DIV");
			tempNode.appendChild(target.cloneNode(false));
			var result = 0;
			if (
				( (typeof filter["selector"] !== 'undefined') ? tempNode.querySelectorAll(":scope > " + filter["selector"]).length : true) && 
				( (typeof filter["sel-collapsed"] !== 'undefined') ? (sel.collapsed == filter["sel-collapsed"]) : true)
			) {
				result += 50 * (targets.length+1); // tagName weight
				if (typeof filter["selector"] !== 'undefined') {
					result += 2*(filter["selector"].split(".").length-1); // Add the number of class selectors;
					result += 2*(filter["selector"].split("[").length-1); // Add the number of attribute selectors
				}

				if (typeof filter["sel-collapsed"] !== 'undefined') {
					result += 1;
				}
				if (typeof filter["parent"] == 'undefined') {
					return result;
				} else {
					var parentResult = checkVedorContext(filter["parent"], targets);
					if (parentResult) {
						return result + parentResult;
					} else {
						return 0;
					}
				}
			}
		}
		return 0;
	}

	function getVedorEditorContext() {
		var sel = vdSelectionState ? vdSelectionState.get() : false;

		if (sel) {
			var parent = vdSelection.getNode(sel);

			if ((parent && parent.getAttribute && (parent.getAttribute("contenteditable") || parent.getAttribute("data-vedor-selectable"))) || hasEditableParent(parent)) {
				if (parent || parent.getAttribute || parent.getAttribute("contenteditable")) {
					var validFilters = {};
					var bestFilter = false;
					var bestFilterWeight = 0;
					for (var i in editor.contextFilters) {
						var filter = editor.contextFilters[i];
						var filterWeight = checkVedorContext(filter, parents(parent));

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
						return "vedor-text-cursor";
					} else {
						return "vedor-text-selection";
					}
				}
			} else {
				return "vedor-no-context";
			}
		}
	}

	function initContextProperties(context) {
		if (editor.toolbars[context] && editor.toolbars[context].update) {
			return editor.toolbars[context].update();
		}


		// FIXME: Deze wordt nog niet gebruikt;
		switch (context) {
			case "vedor-text-selection" :
			case "vedor-table-cell-selection":
				vdHideToolbars = false;
				initTextProperties();
			case "vedor-image" :
				vdHideToolbars = false;
			// 	FIXME: Deze wordt nu nog in updateHtmlContext gedaan;
			//	initImageProperties();
			break;
			case "vedor-no-context" :
			break;
			case "vedor-hyperlink" :
				vdHideToolbars = false;
				initHyperlinkProperties();
			break;
			default:
			break;
		}

	}

	function hasEditableParent(checkParent) {
		var parent = checkParent;
		while (parent && parent.parentNode) {
			if (parent.parentNode.getAttribute && parent.parentNode.getAttribute("data-vedor-field")) {
				return true;
			}
			if (parent.parentNode.className && parent.parentNode.className.match(/\beditable\b/)) {
				return true;
			}
			parent = parent.parentNode;
		}
		return false;
	}

	vdHideToolbars = false;

	function showVedorEditorContext() {
		var currentContext = getVedorEditorContext();

		var sections = document.querySelectorAll("section.vedor-section");
		for (var i=0; i<sections.length; i++) {
			sections[i].classList.remove("active");
		}

		initContextProperties(currentContext);

		var hideIt = function() {
			var sections = document.querySelectorAll("section.vedor-section");
			for (var j=0; j<sections.length; j++) {
				if (!(sections[j].className.match(/active/))) {
					sections[j].style.left = "-10000px";
				}
			}
		}
		//window.setTimeout(hideIt, 200);

		var activeSection = document.getElementById(currentContext);
		// console.log(activeSection);

		if (activeSection && !vdHideToolbars) {
				var htmlContext = activeSection.querySelectorAll("div.vedor-toolbar-status")[0];
				if ( htmlContext ) {
					htmlContext.classList.add("vedor-selected");
				}
				// activeSection.style.display = "block";
				activeSection.className += " active";
				hideIt(); // window.setTimeout(hideIt, 200);

				var sel = vdSelectionState.get();
				var parent = vdSelection.getNode(sel);
				if (parent == document) {
					return;
				}
				if (sel.collapsed) {
					var parent = vdSelection.getNode(sel);
					vdSelection.setHTMLText(sel, "<span id='vdBookmarkLeft'></span><span id='vdBookmarkRight'></span>");
				} else {
					vedor.editor.bookmarks.set(sel);
				}

				var bmLeft = document.getElementById("vdBookmarkLeft");
				var obj = bmLeft;

				if (!obj) {
					return;
				}

				var lleft = 0, ltop = 0;
				ltop += obj.offsetHeight;
				do {
					lleft += obj.offsetLeft;
					ltop += obj.offsetTop;
				} while (obj = obj.offsetParent);

				var bmRight = document.getElementById("vdBookmarkRight");
				obj = bmRight;
				var rleft = 0, rtop = 0;
				rtop += obj.offsetHeight;
				do {
					rleft += obj.offsetLeft;
					rtop += obj.offsetTop;
				} while (obj = obj.offsetParent);

				bmRight.parentNode.removeChild(bmRight);
				bmLeft.parentNode.removeChild(bmLeft);

				if ( lleft == 0 && rleft == 0 && ltop == 0 && rtop == 0 ) {
					pos = vdSelection.parentNode(sel).getBoundingClientRect();
					lleft = pos.left;
					ltop = pos.top;
					rleft = pos.right;
					rtop = pos.bottom;
				}

				if ( parent.getAttribute("data-vedor-selectable")) {
					pos = parent.getBoundingClientRect();
					lleft = pos.left;
					ltop = pos.top;
					rleft = pos.right;
					rtop = pos.bottom;
				}

				var top = Math.max(ltop, rtop);
				var left = lleft + ((rleft - lleft) / 2);

				var activeToolbar = activeSection.querySelectorAll("div.vedor-toolbar")[0];

				if (!parent.getAttribute("data-vedor-selectable")) {
					// top -= document.body.scrollTop ? document.body.scrollTop : pageYOffset;
					// left -= document.body.scrollLeft ? document.body.scrollLeft : pageXOffset;
				}

				newleft = left - (activeToolbar.offsetWidth/2);

				if (newleft < 0) {
					markerLeft = activeToolbar.offsetWidth/2 + newleft;

					activeToolbar.getElementsByClassName("marker")[0].style.left = markerLeft + "px";
					newleft = 0;
				} else if (newleft + activeToolbar.offsetWidth > document.body.offsetWidth) {
					var delta = newleft + activeToolbar.offsetWidth - document.body.offsetWidth;
					markerLeft = activeToolbar.offsetWidth/2 + delta;
					activeToolbar.getElementsByClassName("marker")[0].style.left = markerLeft + "px";

					newleft = document.body.offsetWidth - activeToolbar.offsetWidth;
				} else {
					activeToolbar.getElementsByClassName("marker")[0].style.left = "50%";
				}

/*				// Move the toolbar to beneath the top of the selection if the toolbar goes out of view;
				var fullHeight = document.documentElement.clientHeight ? document.documentElement.clientHeight : document.body.clientHeight
				if (top > (fullHeight - (activeSection.scrollHeight * 2))) {
					mintop = Math.min(ltop, rtop);
					mintop -= document.body.scrollTop ? document.body.scrollTop : pageYOffset;

					top = fullHeight - (activeSection.scrollHeight * 2);
					if (top < mintop) {
						top = mintop;
					}
				}
*/
				activeSection.style.top = top + 10 + "px"; // 80 is the height of the main vedor toolbar if the toolbars are directly under the document - not used since they moved to editorPane
				activeSection.style.left = newleft + "px";

// FIXME: Android fix here
//				// restore selection triggers contextupdate, which triggers restore selection - this hopefully prevents that loop.
				skipContextUpdate = true;
				if (!sel.collapsed) {
				//	vdSelectionState.restore(sel); // // FIXME: This reverses the current selection, which causes problems selecting from right to left; Is it used at all?
				}
				window.setTimeout(function() { skipContextUpdate = false;}, 20);
		} else {
			hideIt();
		}

		if (document.getElementById("VD_DETAILS")) {
			if (showBorders) {
				document.getElementById('VD_DETAILS').classList.add('vedor-selected');
			} else {
				document.getElementById('VD_DETAILS').classList.remove('vedor-selected');
			}
		}

		if (document.getElementById('vdShowTagBoundaries')) {
			if (showTagBoundaries) {
				document.getElementById('vdShowTagBoundaries').classList.add('vedor-selected');
			} else {
				document.getElementById('vdShowTagBoundaries').classList.remove('vedor-selected');
			}
		}

		if (document.getElementById('vdShowTagStack')) {
			if (showTagStack) {
				document.getElementById('vdShowTagStack').classList.add('vedor-selected');
			} else {
				document.getElementById('vdShowTagStack').classList.remove('vedor-selected');
			}
		}
	}

	function initTextProperties() {
		var sel = vdSelectionState.get();
		if (sel) {
			var parent = vdSelection.getNode(sel);
			if (parent || parent.getAttribute || parent.getAttribute("contenteditable")) {
				var parentStyles = getAllStyles(parent);

				var textAlign = document.querySelectorAll(".vedor-text-align[data-type=vedor-buttongroup-radio]");
				for (var i=0; i<textAlign.length;i++) {
					var parentStyles = getAllStyles(parent);

					switch (parentStyles["text-align"]) {
						case "right" :
							vdSetProperty(textAlign[i], "right");
						break;
						case "center" :
							vdSetProperty(textAlign[i], "center");
						break;
						case "justify" :
							vdSetProperty(textAlign[i], "justify");
						break;
						case "left" :
						default :
							vdSetProperty(textAlign[i], "left");
						break;
					}
				}

				// Set the parent icon for alignment as well;
				var currentIcon = document.querySelectorAll("div.vedor-text-align button.vedor-selected i")[0];
				var icons = document.querySelectorAll("button[data-vedor-section=vedor-text-align] i");
				for (var i=0; i<icons.length; i++) {
					icons[i].className = currentIcon.className;
				}

				// Check "Bold"
				var textBold = document.querySelectorAll(".vedor-text-bold button");
				for (var i=0; i<textBold.length; i++) {
					if (parentStyles["font-weight"] == "bold") {
						textBold[i].classList.add("vedor-selected");
					} else {
						textBold[i].classList.remove("vedor-selected");
					}
				}

				// Check "Italic"
				var textItalic = document.querySelectorAll(".vedor-text-italic button");
				for (var i=0; i<textItalic.length; i++) {
					if (parentStyles["font-style"] == "italic") {
						textItalic[i].classList.add("vedor-selected");
					} else {
						textItalic[i].classList.remove("vedor-selected");
					}
				}

				// Check "Underline"
				var textUnderline = document.querySelectorAll(".vedor-text-underline button");
				for (var i=0; i<textUnderline.length; i++) {
					if (parentStyles["text-decoration"].match(/underline/)) {
						textUnderline[i].classList.add("vedor-selected");
					} else {
						textUnderline[i].classList.remove("vedor-selected");
					}
				}
			}
		}
		return true;
	}

	function getAllStyles(elem) {
		var styleNode = {};
		if (!elem) return []; // Element does not exist, empty list.
		if (elem == document) { return []; } // Document is not what we are looking for;

		var win = document.defaultView || window, style, styleNode = [];
		if (win.getComputedStyle) { /* Modern browsers */
			style = win.getComputedStyle(elem, '');
			for (var i=0; i<style.length; i++) {
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
			for (var i=0; i<style.length; i++) {
				styleNode[style[i]] = style[style[i]];
			}
		}
		return styleNode;
	}

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


	function updateHtmlContext() {
		// Check if the current selection is part of an uneditable thing, if so, move the selection to that parent;
		var sel = vdSelectionState.get();
		var parent = vdSelection.getNode(sel);
		// console.log(parent);
		var selParent = getUneditableParent(parent);
		if (selParent) {
			// console.log(selParent);
			// Selection if part of something uneditable
			sel.selectNode(selParent);
			sel.startContainer.ownerDocument.defaultView.getSelection().removeAllRanges();
			sel.startContainer.ownerDocument.defaultView.getSelection().addRange(sel);
			vdSelectionState.save(sel);
			sel.startContainer.ownerDocument.defaultView.getSelection().removeAllRanges()
		}

		showVedorEditorContext();

		var parent			= false;
		var sel				= vdSelectionState.get();
		var imgOptions		= false;
		var htmlblockOptions= false;
		var newContextStack	= new Array();


		if (sel) {
			parent = vdSelection.getNode(sel);

			var contextString=new String();
			while (parent && hasEditableParent(parent) && parent.parentNode) {
				if (!imgOptions && parent.tagName=='IMG') {
					imgOptions=true;
					currentImage=parent;
					imgStackIndex=newContextStack.length;
				}
				try {
					if (!htmlblockOptions && parent.getAttribute('ar:type')=='htmlblock') {
						var htmlblock_id = parent.getAttribute('ar:id');
						if (tbContentEditOptions['htmlblocks'][htmlblock_id]['context']) {
							// var context_tmpl = tbContentEditOptions['htmlblocks'][htmlblock_id]['context'];
							htmlblockStackIndex = newContextStack.length;
							currentHTMLBlock = parent;
							htmlblockOptions = true;
							if( window.getSelection ) { // FF and Co
								if( sel.collapsed ) {
									var selection = document.defaultView.getSelection();
									if( selection.setBaseAndExtent ) { // broken webkit
										selection.setBaseAndExtent(currentHTMLBlock, 0, currentHTMLBlock, 1);
									} else {
										sel.selectNode( currentHTMLBlock );
										sel.startContainer.ownerDocument.defaultView.getSelection().removeAllRanges();
										sel.startContainer.ownerDocument.defaultView.getSelection().addRange(sel);
									}
								}
							} else {
								if (!sel.text) {
									var r = document.body.createControlRange();
									r.add( currentHTMLBlock );
									r.select();
								}
							}
							//alert('htmlblock with context template found');
						}
					} else if ( parent.getAttribute('contentEditable') == 'false' ) {
						// uneditable content block
						currentHTMLBlock = parent;
						if( window.getSelection ) { // FF and Co
							if( sel.collapsed ) {
								var selection = document.defaultView.getSelection();
								if( selection.setBaseAndExtent ) { // broken webkit
									selection.setBaseAndExtent(currentHTMLBlock, 0, currentHTMLBlock, 1);
								} else {
									sel.selectNode( currentHTMLBlock );
									sel.startContainer.ownerDocument.defaultView.getSelection().addRange(sel);
									sel.startContainer.ownerDocument.defaultView.getSelection().removeAllRanges();
								}
							}
						} else {
							if (!sel.text) {
								var r = document.body.createControlRange();
								r.add( currentHTMLBlock );
								r.select();
							}
						}
					}
				} catch(e) {
				}

				newContextStack.push(parent);
				contextString='<li unselectable="on"><a class="tag" href="#" title="{vd.editor:selecttag}" unselectable="on" onClick="showContextInfo('+(newContextStack.length-1)+',this);">'+parent.tagName +
				//	'<span unselectable="on" class="deltag" title="{vd.editor:removetag}" onClick="return vdDelTag('+(newContextStack.length-1)+')">X</span>' +
					'</a></li>'+contextString;
				parent=parent.parentNode;
			}
		}

//		setHtmlTagsContext('<ul class="tagStack" unselectable="on"><li class="vedor-label">{vd.editor:htmlcontext}</li>'+contextString+'</ul>');
		vdHtmlContextStack=newContextStack;

		if (htmlblockOptions) {
			var context_tmpl = tbContentEditOptions['htmlblocks'][htmlblock_id]['context'];
			var vdHTMLBlockProperties = document.getElementById('vdHTMLBlockProperties');
			vdHTMLBlockProperties.src = objectURL + context_tmpl;
		}

		if (imgOptions) {
//			initImageProperties(currentImage);
		}
	}

	function getUneditableParent(checkParent) {
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
	}

	function replaceNodeTags(source, target) {
		var field = getEditableField();
		if (!field) {
			return;
		}
		var sel = vdSelectionState.get();
		vedor.editor.bookmarks.set(sel);

		var elms = field.querySelectorAll(source);
		for (var i=0; i<elms.length; i++) {
			var newNode = document.createElement(target);
			newNode.innerHTML = elms[i].innerHTML;

			elms[i].parentNode.replaceChild(newNode, elms[i]);
		}

		vedor.editor.bookmarks.select();
		vedor.editor.bookmarks.remove();
	}


	function setFormat(command, value) {
		var blockRe=new RegExp('(H[1-7])|P');
		var skipExecCommand=false;
		var field=getEditableField();
		if (!field) {
			return;
		}
		registerChange(field.id);

		var sel = vdSelectionState.get();

		var target = document;
		if( !window.getSelection && target.selection.type != "None" ) { // make sure we execCommand on the selection for IE.
			target = sel;
		}

		target.execCommand(command, false, value);

		vdSelectionState.restore();

		vdStoreUndo();
		vdEditPane_DisplayChanged();
		return true;
	}

	function registerChange(field) {
	}
	function vdEditPane_DisplayChanged() {
	}
	function vdStoreUndo() {
	}

	function getEditableField() {
		var vdParent=false;
		var sel = vdSelectionState.get();
		if (sel) {
			vdParent = vdSelection.getNode(sel);
			while(vdParent) {
				if (vdParent.className && vdParent.className.match(/\beditable\b/)) {
					return vdParent;
				} else if (vdParent.getAttribute("data-vedor-field")) {
					return vdParent;
				} else {
					vdParent = vdParent.parentNode;
				}
			}
			return false;
		}
		return false;
	}

	function setFormatStyle(styleInfo) {
		var field=getEditableField();
		if (!field) {
			return false;
		}

		vedor.editor.styles.init(window);
		vedor.editor.styles.format(styleInfo, field);

		vdStoreUndo();

		vdEditPane_DisplayChanged();
		return true;
	}

	window.setTimeout(function() {
		vdSelectionState = vedor.editor.selection;
		vdSelection = vedor.dom.selection;
		vdSelectionState.init(window);
		selectionchange.start(document); // onselectionchange event for Firefox

		muze.event.attach( document, 'selectionchange', updateHtmlContext );
		muze.event.attach( document, 'keyup', updateHtmlContext );
	}, 1000);
