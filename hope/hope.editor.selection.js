hope.register( 'hope.editor.selection', function() {

	function hopeEditorSelection(start, end, editor) {
		this.start = start;
		this.end = end;
		this.editor = editor;
		var self = this;

		var updateRange = function() {
			var sel = window.getSelection();
			if (sel.focusNode == self.editor.refs.output) {
				// cursor is not in any child node, so the offset is in nodes instead of characters;

				self.start = self.getTotalOffset(sel.focusNode.childNodes[sel.focusOffset]);
				self.end = self.getTotalOffset(sel.anchorNode.childNodes[sel.anchorOffset]);
			} else {
				self.end = self.getTotalOffset( sel.focusNode ) + sel.focusOffset;
				self.start = self.getTotalOffset( sel.anchorNode ) + sel.anchorOffset;
			}
			if (self.end < self.start) {
				var temp = self.start;
				self.start = self.end;
				self.end = temp;
			}
			if (self.end == self.start) {
				self.collapse();
			}
		};

		hope.events.listen(this.editor.refs.output, 'keyup', updateRange);
		hope.events.listen(this.editor.refs.output, 'mouseup', updateRange);
		hope.events.listen(this.editor.refs.output, 'mousedown', updateRange, true);
	}

	hopeEditorSelection.prototype.updateRange = function (start, end) {
		if ((typeof start === 'undefined') && (typeof end === 'undefined')) {
			var sel = window.getSelection();
			if (sel.focusNode == this.editor.refs.output) {
				this.end = this.getTotalOffset(sel.focusNode.childNodes[sel.focusOffset]);
				this.start = this.getTotalOffset(sel.anchorNode.childNodes[sel.anchorOffset]);
			} else {
				this.end = this.getTotalOffset( sel.focusNode ) + sel.focusOffset;
				this.start = this.getTotalOffset( sel.anchorNode ) + sel.anchorOffset;
			}
		}

		if (this.end < this.start) {
			var temp = this.start;
			this.start = this.end;
			this.end = temp;
		}
		if (this.end == this.start) {
			this.collapse();
		}
	};

	hopeEditorSelection.prototype.cursorCommands = [
		'Shift+Home',
		'Shift+End',
		'Shift+PageDown',
		'Shift+PageUp',
		'Shift+ArrowDown',
		'Shift+ArrowUp',
		'Shift+ArrowLeft',
		'Shift+ArrowRight',
		'Home',
		'End',
		'PageDown',
		'PageUp',
		'ArrowDown',
		'ArrowUp',
		'ArrowLeft',
		'ArrowRight',
	];

	hopeEditorSelection.prototype.getRange = function() {
		if ( this.start <= this.end ) {
			return hope.range.create( this.start, this.end );
		} else {
			return hope.range.create( this.end, this.start );
		}
	};

	hopeEditorSelection.prototype.getCursor = function () {
		return this.end;
	};

	hopeEditorSelection.prototype.collapse = function(toEnd) {
		var r = this.getRange().collapse(toEnd);
		this.start = r.start;
		this.end = r.end;
		return this;
	};

	hopeEditorSelection.prototype.move = function(distance) {
		this.start = Math.min( this.editor.fragment.text.length, Math.max( 0, this.start + distance ) );
		this.end = Math.min( this.editor.fragment.text.length, Math.max( 0, this.end + distance ) );
		return this;
	};

	hopeEditorSelection.prototype.isEmpty = function() {
		return ( this.start==this.end );
	};

	hopeEditorSelection.prototype.grow = function(size) {
		this.end = Math.min( this.editor.fragment.text.length, Math.max( 0, this.end + size ) );
		return this;
	};

	hopeEditorSelection.prototype.getNextTextNode = function(textNode) {
		if (!textNode) {
			return false;
		}
		var treeWalker = document.createTreeWalker( 
			this.editor.refs.output, 
			NodeFilter.SHOW_TEXT, 
			function(node) {
				return NodeFilter.FILTER_ACCEPT; 
			},
			false
		);
		treeWalker.currentNode = textNode;
		return treeWalker.nextNode();
	};

	hopeEditorSelection.prototype.getPrevTextNode = function(textNode) {
		if (!textNode) {
			return false;
		}
		
		var treeWalker = document.createTreeWalker( 
			this.editor.refs.output, 
			NodeFilter.SHOW_TEXT, 
			function(node) {
				return NodeFilter.FILTER_ACCEPT; 
			},
			false
		);
		treeWalker.currentNode = textNode;
		return treeWalker.previousNode();	
	};

	hopeEditorSelection.prototype.getPlaceHolderOffset = function(node) {
		if (!node) {
			return false;
		}
		var treeWalker = document.createTreeWalker(
			this.editor.refs.output,
			NodeFilter.SHOW_ELEMENT,
			function(node) {
				if (
					node.tagName.toLowerCase() == "img" ||
					node.tagName.toLowerCase() == "br" ||
					node.tagName.toLowerCase() == "hr"
				) {
					return NodeFilter.FILTER_ACCEPT;
				}
			},
			false
		);
		treeWalker.currentNode = node;
		var count = 0;
		while (treeWalker.previousNode()) {
			count++;
		}
		return count;
	};

	hopeEditorSelection.prototype.getTotalOffset = function( node ) {
		offset = 0;
		offset = this.getPlaceHolderOffset(node);
		
		node = this.getPrevTextNode(node);
		while ( node ) {
			offset += node.textContent.length;
			node = this.getPrevTextNode(node);
		}
		return offset;
	};

	hopeEditorSelection.prototype.getArrowDownPosition = function() {
		// FIXME: handle columns, floats, etc.
		// naive version here expects lines of similar size and position
		// without changes in textflow
		var cursorEl = this.editor.refs.output.ownerDocument.getElementById('hopeCursor');
		if ( !cursorEl ) {
			return null;
		}
		var cursorRect = cursorEl.getBoundingClientRect();
		if ( this.xBias === null ) {
			this.xBias = cursorRect.left;
			console.log('set xbias: '+this.xBias);
		}
		var node = cursorEl; // will this work? -> not a text node
		var nodeRect = null;
		var range = null;
		var rangeRect = null;
		var yBias = null;
		// find textnode to place cursor in	
		do {
			node = this.getNextTextNode(node);
			if ( node ) {
				range = document.createRange();
				range.setStart(node, 0);
				range.setEnd(node, node.textContent.length);
				nodeRect = range.getBoundingClientRect();
				if ( !yBias ) {
					if ( nodeRect.top > cursorRect.top ) {
						yBias = nodeRect.top;
					} else {
						yBias = cursorRect.top;
					}
				}
			}
		} while ( node && nodeRect.height!==0 && nodeRect.top <= yBias ); //< cursorRect.bottom ); //left >= this.xBias );
		
		if ( node && nodeRect.right >= this.xBias ) {
			// find range in textnode to set cursor to
			var nodeLength = node.textContent.length;
			range.setEnd( node, 0 );
			var offset = 0;
			do {
				offset++;
				range.setStart( node, offset);
				range.setEnd( node, offset);
				rangeRect = range.getBoundingClientRect();
			} while ( 
				offset < nodeLength && 
				( 
					(rangeRect.top <= yBias ) || 
					( rangeRect.right < this.xBias) 
				) 
			);

			return range.endOffset + this.getTotalOffset(node); // should check distance for end-1 as well
		} else if ( node && range ) {
			range.setStart( range.endContainer, range.endOffset );
			rangeRect = range.getBoundingClientRect();
			if ( rangeRect.top > yBias ) {
				// cannot set cursor to x pos > xBias, so get rightmost position in current node
				range.setEnd(node, node.textContent.length);
				return range.endOffset + this.getTotalOffset(node);
			} else {
				// cursor cannot advance further
				return this.getCursor();
			}
		} else {
			return this.getCursor();
		}
	};


	this.create = function(start, end, editor) {
		return new hopeEditorSelection(start, end, editor);
	};

});