hope.register( 'hope.editor', function() {
	var hopeTokenCounter = 0;
	var browserCountsWhitespace = (function() {
		var div = document.createElement("DIV");
		div.innerHTML = "		<div>		<span>abc</span>	</div>		";
		document.body.appendChild(div);
		var range = document.createRange();
		range.setStart(div.querySelector("div"), 1);
		var offset1 = range.startOffset;
		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
		var newRange = sel.getRangeAt(0);
		var offset2 = newRange.startOffset;
		var result = (offset1 == offset2);
		document.body.removeChild(div);
		return result;
	}());

	function unrender(target) {
		var textValue = '';
		var tags = [];

		var node;

		var tagStart, tagEnd;

		for (var i in target.childNodes) {
			if (target.childNodes[i].nodeType == document.ELEMENT_NODE) {
				if (
					!target.childNodes[i].hasChildNodes()
				) {
					tagStart = hopeTokenCounter;
					hopeTokenCounter += 1;

					switch (target.childNodes[i].tagName.toLowerCase()) {
						case 'br':
						case 'hr':
							textValue += "\n";
						break;
						case 'img':
							textValue += "\u00AD"; // &shy;
						break;
						default:
							textValue += "\u00AD"; // &shy;
					}

					tagEnd = hopeTokenCounter;

					tags.push({
						start : tagStart,
						end : tagEnd,
						tag : target.childNodes[i].tagName.toLowerCase(),
						attrs : target.childNodes[i].attributes
					});
				} else {

					tagStart = hopeTokenCounter;

					node = this.unrender(target.childNodes[i]);
					// hopeTokenCounter += node.length;
					textValue += node.text;
					tagEnd = hopeTokenCounter;

					tags.push({
						start : tagStart,
						end : tagEnd,
						tag : target.childNodes[i].tagName.toLowerCase(),
						attrs : target.childNodes[i].attributes,
						caret : this.getCaretOffset(target.childNodes[i])
					});

					for (var j=0; j<node.tags.length; j++) {
						tags.push(node.tags[j]);
					}
				}
			} else if (target.childNodes[i].nodeType == document.TEXT_NODE) {
				var textContent = target.childNodes[i].nodeValue;
				textContent = textContent.replace(/\u00AD+/g, "");

				if (browserCountsWhitespace) {
					hopeTokenCounter += textContent.length;
					textValue += textContent;
				} else {
					if (textContent.trim().length) {
						hopeTokenCounter += textContent.length;
						textValue += textContent;
					}
				}
			}
		}

		return {
			text : textValue,
			tags : tags
		};
	}

	function getCaretOffset(node) {
		// find out the position of the cursor within this element;
		var caret = -1;
		var sel = window.getSelection();

		if (sel.rangeCount) {
			var range = sel.getRangeAt(0);
			if (!range.collapsed) {
				return caret;
			}

			var startContainer = range.startContainer;
			if (startContainer.nodeType == document.TEXT_NODE && (node == startContainer.parentNode)) {
				caret = range.startOffset + this.selection.getTotalOffset(startContainer) - this.selection.getTotalOffset(startContainer.parentNode);
			} else if (node == startContainer) {
				caret = range.startOffset;
			}
		}
		return caret;
	}

	function setCaretOffset(node) {
		// restore the cursor into this element; current offset should be in data-hope-caret
		var selection = document.createRange();

		var caret = node.getAttribute('data-hope-caret');
		for (var i=0; i<node.childNodes.length; i++) {
			var nodeOffset = this.selection.getTotalOffset(node.childNodes[i]) - this.selection.getTotalOffset(node);
			if (nodeOffset + node.childNodes[i].textContent.length >= caret) {
				try {
					selection.setStart(node.childNodes[i], caret - nodeOffset);
				} catch (e) {
					console.log("Warning: could not set caret position");
				}
				node.removeAttribute("data-hope-caret");
				return selection;
			}
		}

	}

	function tagsToText(tags) {
		var result = '';
		var i,j;

		for (i=0; i<tags.length; i++) {
			result += tags[i].start + "-" + tags[i].end + ":" + tags[i].tag;
			if (tags[i].attrs) {
				for (j =0; j<tags[i].attrs.length; j++) {
					result += " " + tags[i].attrs[j].name + "=\"" + tags[i].attrs[j].value + "\"";
				}
			}
			if (tags[i].caret > -1) {
				result += " data-hope-caret=\"" + tags[i].caret + "\"";
			}
			result += "\n";
		}
		return result;
	}

	function hopeEditor( textEl, annotationsEl, outputEl, renderEl ) {
		this.refs = {
			text: textEl,
			annotations: annotationsEl,
			output: outputEl,
			render: renderEl
		};
		this.selection = hope.editor.selection.create(0,0,this);
		this.commandsKeyUp = {};

		if (this.refs.output.innerHTML !== '') {
			this.refs.output.innerHTML = this.refs.output.innerHTML.replace(/\/p>/g, "/p>");
			this.parseHTML();
		}

		this.browserCountsWhitespace = browserCountsWhitespace;

		var text = this.refs.text.value;
		var annotations = this.refs.annotations.value;
		this.fragment = hope.fragment.create( text, annotations );
		this.refs.output.contentEditable = true;
		this.update();
		this.initDone = true;
//		initEvents(this);
	}

	function initEvents(editor) {
		hope.events.listen(editor.refs.output, 'keypress', function( evt ) {
			if ( !evt.ctrlKey && !evt.altKey ) {
				// check selection length
				// remove text in selection
				// add character
				var range = editor.selection.getRange();
				var charCode = evt.which;

				if (evt.which) {
					var charTyped = String.fromCharCode(charCode);
					if ( charTyped ) { // ignore non printable characters
		    				if ( range.length ) {
		    					editor.fragment = editor.fragment.delete(range);
		    				}
						editor.fragment = editor.fragment.insert(range.start, charTyped );
						editor.selection.collapse().move(1);
						setTimeout( function() {
							editor.update();
						}, 0 );
					}
					return hope.events.cancel(evt);
				}
			}
		});

		hope.events.listen(editor.refs.output, 'keydown', function( evt ) {
			var key = hope.keyboard.getKey( evt );
			if ( editor.commands[key] ) {
				var range = editor.selection.getRange();
				editor.commands[key].call(editor, range);
				setTimeout( function() {
					editor.update();
				}, 0);
				return hope.events.cancel(evt);
			} else if ( evt.ctrlKey || evt.altKey ) {
				return hope.events.cancel(evt);
			}
		});

		hope.events.listen(editor.refs.output, 'keyup', function( evt ) {
			var key = hope.keyboard.getKey( evt );
			if ( editor.selection.cursorCommands.indexOf(key)<0 ) {
				if ( editor.commandsKeyUp[key] ) {
					var range = editor.selection.getRange();
					editor.commandsKeyUp[key].call(editor, range);
					setTimeout( function() {
						editor.update();
					}, 0);
				}
				return hope.events.cancel(evt);
			}
		});

	}

	hopeEditor.prototype.setCaretOffset = setCaretOffset;
	hopeEditor.prototype.getCaretOffset = getCaretOffset;
	hopeEditor.prototype.unrender = unrender;

	hopeEditor.prototype.parseHTML = function() {
		hopeTokenCounter = 0;

		var data = this.unrender(this.refs.output);
		this.refs.annotations.value = tagsToText(data.tags);
		this.refs.text.value = data.text;
		this.fragment = hope.fragment.create( this.refs.text.value, this.refs.annotations.value );
	};

	hopeEditor.prototype.getEditorRange = function(start, end ) {
		var treeWalker = document.createTreeWalker( 
			this.refs.output, 
			NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, 
			function(node) {
				if (
					node.nodeType == document.TEXT_NODE ||
					!node.hasChildNodes()
				) {
					return NodeFilter.FILTER_ACCEPT;
				} else {
					return NodeFilter.FILTER_SKIP;
				}
			},
			false
		);
		var offset = 0;
		var node = null;
		var range = document.createRange();
		var lastNode = null;
		do {
			lastNode = node;
			node = treeWalker.nextNode();
			if ( node ) {
				if (node.nodeType == document.ELEMENT_NODE) {
					offset += 1;
				} else {
					offset += node.textContent.length;
				}
			}			
		} while ( offset < start && node );
		if ( !node ) {
			if (lastNode) {
				if (lastNode.nodeType == document.ELEMENT_NODE) {
					range.setStart(lastNode, 0);
					range.setEndAfter(lastNode);
				} else {
					range.setStart(lastNode, lastNode.textContent ? lastNode.textContent.length : 1 );
					range.setEnd(lastNode, lastNode.textContent ? lastNode.textContent.length : 1 );
				}
				return range;
			}
			return false;
		}

		var preOffset = offset - (node.nodeType == document.TEXT_NODE ? node.textContent.length : 1);
		var nextNode;
		if (node.nodeType == document.ELEMENT_NODE) {
			nextNode = treeWalker.nextNode();
			treeWalker.previousNode();
			if (nextNode) {
				range.setStartBefore(nextNode);
			} else {
				range.setStartAfter(node);
			}
		} else {
			if (start-preOffset == node.textContent.length) {
				nextNode = treeWalker.nextNode();
				treeWalker.previousNode();
				if (nextNode) {
					range.setStartBefore(nextNode);
				} else {
					range.setStartAfter(node);
				}
			} else {
				range.setStart(node, start - preOffset );
			}
		}
		while ( offset < end && node ) {
			node = treeWalker.nextNode();
			if ( node ) {
				if (node.nodeType == document.ELEMENT_NODE) {
					offset += 1;
				} else {
					offset += node.textContent.length;
				}
			}
		}
		if ( !node ) {
			if (lastNode) {
				range.setEnd(lastNode, lastNode.textContent ? lastNode.textContent.length : 1 );
				return range;
			}
			return false;
		}

		preOffset = offset - (node.nodeType == document.TEXT_NODE ? node.textContent.length : 1);

		if (node.nodeType == document.ELEMENT_NODE) {
			range.setEndAfter(node);
		} else {
			range.setEnd(node, end - preOffset );
		}
		return range;
	};

	hopeEditor.prototype.showCursor = function() {
		var range = this.selection.getRange();
		var selection = this.getEditorRange(range.start, range.end);
		var caretElm = document.querySelector('[data-hope-caret]');
		if (caretElm) {
			selection = this.setCaretOffset(caretElm);
		}
		// remove all other caret attributes from the other elements;
		var otherCarets = document.querySelectorAll('[data-hope-caret]');
		for (var i=0; i<otherCarets.length; i++) {
			otherCarets[i].removeAttribute("data-hope-caret");
		}

		if (selection && document.body.contains(selection.startContainer)) {
			var htmlSelection = window.getSelection();
			htmlSelection.removeAllRanges();
			htmlSelection.addRange(selection);
		}
	};

	hopeEditor.prototype.getBlockAnnotation = function( position ) {
		var annotations = this.fragment.annotations.getAt( position );
		var isBlockTag = this.isBlockTag;
		var filter = function(annotation) {
			return isBlockTag(annotation.tag);
		};
		return annotations.filter(filter);
	};

	hopeEditor.prototype.isBlockTag = function( tag ) {
		tag = hope.annotation.stripTag(tag);
		return (hope.render.html.rules.nestingSets.block.includes(tag)); // FIXME: this should not know about hope.render.html
	};

	hopeEditor.prototype.getNextBlockTag = function( tag ) {
		tag = hope.annotation.stripTag(tag);
		var tagOrder = {
			'h1' : 'p',
			'h2' : 'p',
			'h3' : 'p',
			'p'  : 'p',
			'li' : 'li'
		};
		if ( typeof tagOrder[tag] != 'undefined' ) {
			return tagOrder[tag];
		}
		return 'p';
	};

	hopeEditor.prototype.commands = {
		'Control+b': function(range) {
			this.fragment = this.fragment.toggle(range, 'strong');
		},
		'Control+i': function(range) {
			this.fragment = this.fragment.toggle(range, 'em');
		},
		'Backspace' : function(range) {
			if ( range.isEmpty() ) {
				range = range.extend(1, -1);
			}
			// check if range extends over multiple block annotations
			// if so remove all block annotations except the first
			// and expand that to cover full range of first upto last block annotation
			this.fragment = this.fragment.delete( range );
			this.selection.collapse().move(-1);
		},
		'Delete' : function(range) {
			if ( range.isEmpty() ) {
				range = range.extend(1, 1);
			}
			this.fragment = this.fragment.delete( range );
			this.selection.collapse();
		},
		'Shift+Enter' : function(range) {
			this.fragment = this.fragment
				.delete( range )
				.insert( range.start, "\n" )
				.apply( [ range.start, range.start + 1 ], 'br' );
			this.selection.collapse().move(1);
		},
		'Enter' : function(range) {
			var br = this.fragment.has( [range.start-1, range.start], 'br' );
			if ( br ) {
				var blockAnnotation = this.getBlockAnnotation( range.start ).last();
				// close it and find which annotation to apply next
				var closingAnnotation = hope.annotation.create( [ blockAnnotation.range.start, br.range.start ], blockAnnotation.tag );
				var openingAnnotation = hope.annotation.create( [ range.start, blockAnnotation.range.end + 1 ], this.getNextBlockTag( blockAnnotation.tag ) );
				this.fragment = this.fragment
					.remove( br.range, br.tag )
					.remove( blockAnnotation.range, blockAnnotation.tag )
					.insert(range.start, '\n')
					.apply( closingAnnotation.range, closingAnnotation.tag )
					.apply( openingAnnotation.range, openingAnnotation.tag )
				;
			} else {
				this.fragment = this.fragment
					.delete( range )
					.insert( range.start, "\n" )
					.apply( [ range.start, range.start + 1 ], 'br' );
			}
			this.selection.collapse().move(1);
		}
	};

	hopeEditor.prototype.update = function() {
		var html = hope.render.html.render( this.fragment );
		this.refs.output.innerHTML = html;
		if (this.initDone) {
			this.showCursor();
		}
		if ( this.refs.text ) {
			this.refs.text.value = ''+this.fragment.text;
		}
		if ( this.refs.render ) {
			this.refs.render.innerHTML = html.replace('&','&amp;').replace('<', '&lt;').replace('>', '&gt');
		}
		if ( this.refs.annotations ) {
			this.refs.annotations.value = this.fragment.annotations+'';
		}
	};

	hopeEditor.prototype.command = function( key, callback, keyup ) {
		if ( keyup ) {
			this.commandsKeyUp[key] = callback;
		} else {
			this.commands[key] = callback;
		}
	};

	this.create = function( textEl, annotationsEl, outputEl, previewEl ) {
		return new hopeEditor( textEl, annotationsEl, outputEl, previewEl);
	};

});