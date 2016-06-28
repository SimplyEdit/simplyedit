hope.register( 'hope.editor.selection', function() {
	function hopeEditorSelection(start, end, editor) {
		this.start = start;
		this.end = end;
		this.editor = editor;

		var self = this;

		var updateRange = function() {
			var sel   = window.getSelection();
			var rangeStart, rangeEnd;
			var bestStart, bestEnd;

			if (sel.rangeCount) {
				for (var i=0; i<sel.rangeCount; i++) {
					var range = sel.getRangeAt(i);
					if (range.startContainer.nodeType === document.TEXT_NODE) {
						rangeStart = self.getTotalOffset(range.startContainer) + range.startOffset;
					} else if (range.startContainer.childNodes.length === 0) {
						rangeStart = self.getTotalOffset(range.startContainer);
					} else if (range.startContainer.childNodes[range.startOffset]) {
						rangeStart = self.getTotalOffset(range.startContainer.childNodes[range.startOffset]);
					} else {
						rangeStart = self.getTotalOffset(range.startContainer.childNodes[range.startOffset-1], true);
					}

					if (range.endContainer.nodeType === document.TEXT_NODE) {
						rangeEnd = self.getTotalOffset(range.endContainer) + range.endOffset;
					} else if (range.endContainer.childNodes.length === 0) {
						rangeEnd = self.getTotalOffset(range.endContainer);
					} else if (range.endContainer.childNodes[range.endOffset]) {
						rangeEnd = self.getTotalOffset(range.endContainer.childNodes[range.endOffset]);
					} else {
						rangeEnd = self.getTotalOffset(range.endContainer.childNodes[range.endOffset-1], true);
					}

					if (rangeEnd < rangeStart) {
						var tempRange = rangeStart;
						rangeStart = rangeEnd;
						rangeEnd = tempRange;
					}
					if (typeof bestStart !== "undefined") {
						bestStart = Math.min(bestStart, rangeStart);
					} else {
						bestStart = rangeStart;
					}

					if (typeof bestEnd !== "undefined") {
						bestEnd = Math.max(bestEnd, rangeEnd);
					} else {
						bestEnd = rangeEnd;
					}
				}
			}

			self.end = bestEnd;
			self.start = bestStart;

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
	}

	hopeEditorSelection.prototype.updateRange = function (start, end) {
		if ((typeof start === 'undefined') && (typeof end === 'undefined')) {
			var sel   = window.getSelection();
			var rangeStart, rangeEnd;
			var bestStart, bestEnd;

			if (sel.rangeCount) {
				for (var i=0; i<sel.rangeCount; i++) {
					var range = sel.getRangeAt(i);
					if (range.startContainer.nodeType === document.TEXT_NODE) {
						rangeStart = this.getTotalOffset(range.startContainer) + range.startOffset;
					} else if (range.startContainer.childNodes.length === 0) {
						rangeStart = this.getTotalOffset(range.startContainer);
					} else if (range.startContainer.childNodes[range.startOffset]) {
						rangeStart = this.getTotalOffset(range.startContainer.childNodes[range.startOffset]);
					} else {
						rangeStart = this.getTotalOffset(range.startContainer.childNodes[range.startOffset-1], true);
					}

					if (range.endContainer.nodeType === document.TEXT_NODE) {
						rangeEnd = this.getTotalOffset(range.endContainer) + range.endOffset;
					} else if (range.endContainer.childNodes.length === 0) {
						rangeEnd = this.getTotalOffset(range.endContainer);
					} else if (range.endContainer.childNodes[range.endOffset]) {
						rangeEnd = this.getTotalOffset(range.endContainer.childNodes[range.endOffset]);
					} else {
						rangeEnd = this.getTotalOffset(range.endContainer.childNodes[range.endOffset-1], true);
					}

					if (rangeEnd < rangeStart) {
						var tempRange = rangeStart;
						rangeStart = rangeEnd;
						rangeEnd = tempRange;
					}

					if (typeof bestStart !== "undefined") {
						bestStart = Math.min(bestStart, rangeStart);
					} else {
						bestStart = rangeStart;
					}

					if (typeof bestEnd !== "undefined") {
						bestEnd = Math.max(bestEnd, rangeEnd);
					} else {
						bestEnd = rangeEnd;
					}
				}
				this.start = bestStart;
				this.end = bestEnd;
			}
		} else {
			this.start = start;
			this.end = end;
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

	hopeEditorSelection.prototype.getPlaceHolderOffset = function(node, countThis) {
		if (!node) {
			return false;
		}
		var treeWalker = document.createTreeWalker(
			this.editor.refs.output,
			NodeFilter.SHOW_ELEMENT,
			function(node) {
				if (
					!node.hasChildNodes()
				) {
					return NodeFilter.FILTER_ACCEPT;
				}
			},
			false
		);
		treeWalker.currentNode = node;
		var count = 0;
		if (countThis) {
			count++;
		}
		while (treeWalker.previousNode()) {
			count++;
		}
		return count;
	};

	hopeEditorSelection.prototype.getTotalOffset = function( node, countThis ) {
		offset = 0;
		offset = this.getPlaceHolderOffset(node, countThis);
		if (!countThis) {
			node = this.getPrevTextNode(node);
		}
		while ( node ) {
			if (this.editor.browserCountsWhitespace) {
				offset += node.textContent.length;
			} else {
				if (node.textContent.trim().length !== 0) {
					offset += node.textContent.length;
				}
			}

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