var hope = this.hope = ( function( global ) {

	var registered	= {};
	var hope        = {};

	function _namespaceWalk( module, handler ) {
		var rest	= module.replace(/^\s+|\s+$/g, ''); //trim
		var name	= '';
		var temp	= hope.global;
		var i 		= rest.indexOf( '.' );
		while ( i != -1 ) {
			name	= rest.substring( 0, i );
			if ( !temp[name])  {
				temp = handler(temp, name);
				if (!temp) {
					return temp;
				}
			}
			temp	= temp[name];
			rest	= rest.substring( i + 1 );
			i		= rest.indexOf( '.' );
		}
		if ( rest ) {
			if ( !temp[rest] ) {
				temp = handler(temp, rest);
				if (!temp) {
					return temp;
				}
			}
			temp	= temp[rest];
		}
		return temp;
	}

	hope.global = global;

	hope.register = function( module, implementation ) {
		var moduleInstance = _namespaceWalk( module, function(ob, name) {
			ob[name] = {};
			return ob;
		});
		registered[module]=true;
		if (typeof implementation == 'function') {
			implementation.call(moduleInstance);
		}
		return moduleInstance;
	};

	hope.Exception = function(message, code) {
		this.message = message;
		this.code = code;
		this.name = 'hope.Exception';
	};

	return hope;

} )(this);

if (![].includes) {
  Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {'use strict';
    if (this === undefined || this === null) {
      throw new TypeError('Cannot convert this value to object');
    }
    var O = Object(this);
    var len = parseInt(O.length) || 0;
    if (len === 0) {
      return false;
    }
    var n = parseInt(arguments[1]) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {k = 0;}
    }
    var currentElement;
    while (k < len) {
      currentElement = O[k];
      if (searchElement === currentElement ||
         (searchElement !== searchElement && currentElement !== currentElement)) {
        return true;
      }
      k++;
    }
    return false;
  };
}/**
 * hope.range
 *
 * This implements an immutable range object. 
 * Once created using hope.range.create() a range cannot change its start and end properties.
 * Any method that needs to change start or end, will instead create a new range with the new start/end
 * values and return that.
 * If you need to change a range value in place, you can assign the return value back to the original variable, e.g.:
 *   range = range.collapse();
 */

hope.register( 'hope.range', function() {
	

	function hopeRange( start, end ) {
		if ( typeof end == 'undefined' || end < start ) {
			end = start;
		}
		this.start = start;
		this.end = end;
		Object.freeze(this);
	}

	hopeRange.prototype = {
		constructor: hopeRange,
		get length () {
			return this.end - this.start;
		}
	};

	hopeRange.prototype.collapse = function( toEnd ) {
		var start = this.start;
		var end = this.end;
		if ( toEnd ) {
			start = end;
		} else {
			end = start;
		}
		return new hopeRange(start, end );
	};

	hopeRange.prototype.compare = function( range ) {
		range = hope.range.create(range);
		if ( range.start < this.start ) {
			return 1;
		} else if ( range.start > this.start ) {
			return -1;
		} else if ( range.end < this.end ) {
			return 1;
		} else if ( range.end > this.end ) {
			return -1;
		}
		return 0;
	};

	hopeRange.prototype.equals = function( range ) {
		return this.compare(range)===0;
	};

	hopeRange.prototype.smallerThan = function( range ) {
		return ( this.compare( range ) == -1 );
	};

	hopeRange.prototype.largerThan = function( range ) {
		return ( this.compare( range ) == 1 );
	};

	hopeRange.prototype.contains = function( range ) {
		range = hope.range.create(range);
		return this.start <= range.start && this.end >= range.end;
	};

	hopeRange.prototype.overlaps = function( range ) {
		range = hope.range.create(range);
		if (range.equals(this)) {
			return true;
		}

		// not overlapping if only the edges touch...
		if ((range.start == this.end) && (range.start < range.end)) {
			return false;
		}
		if ((range.end == this.start) && (range.start < range.end)) {
			return false;
		}

		// but overlapping if the range to check is collapsed
		if ((range.start == this.end) && (range.start == range.end)) {
			return true;
		}
		if ((range.end == this.start) && (range.start == range.end)) {
			return true;
		}

		return ( range.start <= this.end && range.end >= this.start );
	};

	hopeRange.prototype.isEmpty = function() {
		return this.start >= this.end;
	};

	hopeRange.prototype.overlap = function( range ) {
		range = hope.range.create(range);
		var start = 0;
		var end = 0;
		if ( this.overlaps( range ) ) {
			if ( range.start < this.start ) {
				start = this.start;
			} else {
				start = range.start;
			}
			if ( range.end < this.end ) {
				end = range.end;
			} else {
				end = this.end;
			}
		}
		return new hopeRange(start, end); // FIXME: is this range( 0, 0 ) a useful return value when there is no overlap?
	};

	hopeRange.prototype.exclude = function( range ) {
		// return parts of this that do not overlap with range
		var left  = null;
		var right = null;
		if ( this.equals(range) ) {
			// nop
		} else if ( this.overlaps( range ) ) {
			left  = new hopeRange( this.start, range.start );
			right =	new hopeRange( range.end, this.end );
			if ( left.isEmpty() ) {
				left = null;
			}
			if ( right.isEmpty() ) {
				right = null;
			}
		} else if ( this.largerThan(range) ) {
			left = null;
			right = right;
		} else {
			left = this;
			right = left;
		}
		return [ left, right ];
	};

	hopeRange.prototype.excludeLeft = function( range ) {
		return this.exclude(range)[0];
	};

	hopeRange.prototype.excludeRight = function( range ) {
		return this.exclude(range)[1];
	};

	/** 
	 * remove overlapping part of range from this range
	 * [ 5 .. 20 ].delete( 10, 25 ) => [ 5 .. 10 ]
	 * [ 5 .. 20 ].delete( 10, 15)	 => [ 5 .. 15 ]
	 * [ 5 .. 20 ].delete( 5, 20 )	 => [ 5 .. 5 ]
	 * [ 5 .. 20 ].delete( 0, 10 )	 => [ 0 .. 10 ] ?
	 */
	hopeRange.prototype.delete = function( range ) {
		range = hope.range.create(range);
		var moveLeft = 0;
		var end = this.end;
		if ( this.overlaps(range) ) {
			var cutRange = this.overlap( range );
			var cutLength = cutRange.length;
			end -= cutLength;
		}
		var result = new hopeRange( this.start, end );
		var exclude = range.excludeLeft( this );
		if ( exclude ) {
			result = result.move( -exclude.length );
		}
		return result;
	};

	hopeRange.prototype.copy = function( range ) {
		range = hope.range.create(range);
		return new hopeRange( 0, this.overlap( range ).length );
	};

	hopeRange.prototype.extend = function( length, direction ) {
		var start = this.start;
		var end = this.end;
		if ( !direction ) {
			direction = 1;
		}
		if ( direction == 1 ) {
			end += length;
		} else {
			start = Math.max( 0, start - length );
		}
		return new hopeRange(start, end);
	};

	hopeRange.prototype.toString = function() {
		if ( this.start != this.end ) {
			return this.start + '-' + this.end;
		} else {
			return this.start + '';
		}
	};

	hopeRange.prototype.grow = function( size ) {
		var end = this.end + size;
		if ( end < this.start ) {
			end = this.start;
		}
		return new hopeRange(this.start, end);
	};

	hopeRange.prototype.shrink = function( size ) {
		return this.grow( -size );
	};

	hopeRange.prototype.move = function( length, min, max ) {
		var start = this.start;
		var end = this.end;
		start += length;
		end += length;
		if ( !min ) {
			min = 0;
		}
		start = Math.max( min, start );
		end = Math.max( start, end );
		if ( max ) {
			start = Math.min( max, start );
			end = Math.min( max, start );
		}
		return new hopeRange(start, end);
	};

	this.create = function( start, end ) {
		if ( start instanceof hopeRange ) {
			return start;
		}
		if ( typeof end =='undefined' && parseInt(start,10)==start ) {
			end = start;
		} else if ( Array.isArray(start) && typeof start[1] != 'undefined' ) {
			end = start[1];
			start = start[0];
		}
		return new hopeRange( parseInt(start), parseInt(end) );
	};

});hope.register( 'hope.annotation', function() {

	function hopeAnnotation(range, tag) {
		this.range = hope.range.create(range);
		this.tag   = tag;
		Object.freeze(this);
	}

	hopeAnnotation.prototype.delete = function( range ) {
		return new hopeAnnotation( this.range.delete( range ), this.tag );	
	};

	hopeAnnotation.prototype.copy   = function( range ) {
		return new hopeAnnotation( this.range.copy( range ), this.tag );
	};

	hopeAnnotation.prototype.compare = function( annotation ) {
		return this.range.compare( annotation.range );
	};

	hopeAnnotation.prototype.has = function( tag ) {
		//FIXME: should be able to specify attributes and attribute values as well
		return this.stripTag() == hope.annotation.stripTag(tag);
	};

	hopeAnnotation.prototype.toString = function() {
		return this.range + ':' + this.tag;
	};

	hopeAnnotation.prototype.stripTag = function() {
		return hope.annotation.stripTag(this.tag);
	};

	hopeAnnotation.prototype.isBlock = function() {
		return (hope.render.html.rules.nestingSets.block.indexOf(hope.annotation.stripTag(this.tag)) != -1 ); // FIXME: this should not know about hope.render.html;
	};

	this.create = function( range, tag ) {
		return new hopeAnnotation( range, tag );
	};

	this.stripTag = function(tag) {
		return tag.split(' ')[0];
	};
});

hope.register( 'hope.fragment', function() {
	
	var self = this;

	function hopeFragment( text, annotations ) {
		this.text = hope.fragment.text.create( text );
		this.annotations  = hope.fragment.annotations.create( annotations );
		Object.freeze(this);
	}

	hopeFragment.prototype.delete = function( range ) {
		return new hopeFragment(
			this.text.delete( range ),
			this.annotations.delete( range )
		);
	};

	hopeFragment.prototype.copy  = function( range ) {
		// return copy fragment at range with the content and annotations at that range
		return new hopeFragment( 
			this.text.copy( range ), 
			this.annotations.copy( range ).delete( hope.range.create( 0, range.start ) ) 
		);
	};

	hopeFragment.prototype.insert = function( position, fragment ) {
		if ( ! ( fragment instanceof hopeFragment ) ) {
			fragment = new hopeFragment( fragment );
		}
		var result = new hopeFragment( 
			this.text.insert(position, fragment.text),
			this.annotations.grow(position, fragment.text.length )
		);
		for ( var i=0, l=fragment.annotations.length; i<l; i++ ) {
			result.annotations = result.annotations.apply( fragment.annotations[i].range.move(position), fragment.annotations[i].tag );
		}
		return result;
	};

	hopeFragment.prototype.apply = function( range, tag ) { 
		return new hopeFragment( 
			this.text, 
			this.annotations.apply( range, tag )
		);
	};

	hopeFragment.prototype.toggle = function( range, tag ) {
		// apply if range.start is not inside or on edge of
		// existing annotation with same tag
		var r2 = range.collapse().grow(1);
		if ( this.has( r2, tag ) ) {
			return this.remove( range, tag );
		} else {
			return this.apply( range, tag );
		}
	};

	hopeFragment.prototype.has = function( range, tag ) {
		return this.annotations.has( range, tag );
	};

	hopeFragment.prototype.remove = function( range, tag ) {
		return new hopeFragment( 
			this.text, 
			this.annotations.remove( range, tag )
		);
	};

	hopeFragment.prototype.clear = function( range ) {
		return new hopeFragment(
			this.text,
			this.annotations.clear( range )
		);
	};

	hopeFragment.prototype.toString = function() {
		return hope.mime.encode( [ 
			'Content-type: text/plain\n\n' + this.text, 
			'Content-type: text/hope\n\n' + this.annotations
		]);
	};

	self.create = function( text, annotations ) {
		return new hopeFragment( text, annotations );
	};

	self.parse = function( fragmentStr ) {
		var info = hope.mime.decode( fragmentStr );
		var text = '', annotations = '';
		if ( info.parts ) {
			for ( var i=0, l=info.parts.length; i<l; i++ ) {
				switch ( info.parts[i].headers['content-type'] ) {
					case 'text/plain' :
						text = info.parts[i].message;
					break;
					case 'text/hope' :
						annotations = info.parts[i].message;
					break;
				}
			}
		}
		return new hopeFragment( text, annotations );
	};

});
hope.register( 'hope.fragment.annotations', function() {

	function parseMarkup( annotations ) {
		var reMarkupLine = /^(?:([0-9]+)(?:-([0-9]+))?:)?(.*)$/m;
		var matches = [];
		var list = [];
		var annotation = null;
		while ( annotations && ( matches = annotations.match(reMarkupLine) ) ) {
			if ( matches[2] ) {
				annotation = hope.annotation.create( 
					[ parseInt(matches[1]), parseInt(matches[2]) ],
					matches[3]
				);
			} else {
				annotation = hope.annotation.create(
					matches[1], matches[3]
				);
			}
			list.push(annotation);
			annotations = annotations.substr( matches[0].length + 1 );
		}
		return list;
	}

	function hopeAnnotationList( annotations ) {
		this.list = [];
		if ( annotations instanceof hopeAnnotationList ) {
			this.list = annotations.list;
		} else if ( Array.isArray( annotations) ) {
			this.list = annotations;
		} else {
			this.list = parseMarkup( annotations + '' );
		}
		this.list.sort( function( a, b ) {
			return a.compare( b );
		});
	}

	hopeAnnotationList.prototype.toString = function() {
		var result = '';
		for ( var i=0, l=this.list.length; i<l; i++ ) {
			result += this.list[i] + '\n';
		}
		return result;
	};

	hopeAnnotationList.prototype.clean = function() {
		var list = this.list.slice();
		//list.filter( function( a ) {
		//	return (a.range.length>0);
		//});
		list.sort( function( a, b ) {
			return a.compare( b );
		});
		return new hopeAnnotationList(list);
	};

	hopeAnnotationList.prototype.apply = function( range, tag ) {
		var list = this.list.slice();
		list.push( hope.annotation.create( range, tag ) );
		return new hopeAnnotationList(list).clean();
	};

	hopeAnnotationList.prototype.grow = function( position, size ) {
		var i;

		function getBlockIndexes(list, index, position) {
			var blockIndexes = [];
			for ( var i=index-1; i>=0; i-- ) {
				if ( list[i].range.contains([position-1, position]) && list[i].isBlock() ) {
					blockIndexes.push(i);
				}
			}
			return blockIndexes;
		}

		var list = this.list.slice();
		var removeRange = false;
		var growRange = false;
		var removeList = [];
		var foundCaret = false;
		if ( size < 0 ) {
			removeRange = hope.range.create( position + size, position );
		} else {
			growRange = hope.range.create( position, position + size );
		}
		for ( i=0, l=list.length; i<l; i++ ) {
			if ( removeRange ) { // && removeRange.overlaps( list[i].range ) ) {
				if ( removeRange.contains( list[i].range ) ) {
					removeList.push(i);
				} else if ( removeRange.end >= list[i].range.start && removeRange.start <= list[i].range.start ) {
					// range to remove overlaps start of this range, but is not equal
					if ( list[i].isBlock() ) {
						// block annotation must be merged with previous annotation, if available 
						// get block annotation at start of removeRange
						var prevBlockIndexes = getBlockIndexes(list, i, removeRange.start);
						if ( prevBlockIndexes.length === 0 ) {
							// no block element in removeRange.start, so just move this block element
							list[i] = hope.annotation.create( list[i].range.delete( removeRange ), list[i].tag );
						} else {
							// prevBlocks must now contain this block
							for ( var ii=0, ll=prevBlockIndexes.length; ii<ll; ii++ ) {
								var prevBlockIndex = prevBlockIndexes[ii];
								var prevBlock = list[ prevBlockIndex ];
								list[ prevBlockIndex ] = hope.annotation.create(
									hope.range.create( 
										prevBlock.range.start,
										list[i].range.end
									).delete( removeRange ),
									prevBlock.tag
								);
							}
							removeList.push(i);
						}
					} else {
						// inline annotations simply shrink
						list[i] = hope.annotation.create( list[i].range.delete( removeRange ), list[i].tag );
					}
				} else { //if ( removeRange.start <= list[i].range.end && removeRange.end >= list[i].range.end ) {
					// range to remove overlaps end of this range, but is not equal
					// if this range needs to be extended, that will done when we find the next block range
					// so just shrink this range
					list[i] = hope.annotation.create( list[i].range.delete( removeRange ), list[i].tag );
				}
			} else if (growRange) {
				var range;
				if ( list[i].range.start == position ) {
					if (list[i].tag.indexOf("data-hope-caret") > -1) {
						foundCaret = true;
						range = list[i].range.grow( size );
						list[i] = hope.annotation.create( range, list[i].tag );
					} else {
						if (foundCaret) {
							range = list[i].range.move( size, position );
							list[i] = hope.annotation.create( range, list[i].tag );
						}
					}
				} else if (list[i].range.end == position ) {
					if (list[i].tag.indexOf("data-hope-caret") > -1) {
						foundCaret = true;
						range = list[i].range.grow( size );
						list[i] = hope.annotation.create( range, list[i].tag );
					} else {
						if (foundCaret) {
							range = list[i].range.grow( size );
							list[i] = hope.annotation.create( range, list[i].tag );
						}
					}
				} else if ( list[i].range.start > position ) {
					range = list[i].range.move( size, position );
					list[i] = hope.annotation.create( range, list[i].tag );
				} else if ( list[i].range.end > position ) {
					range = list[i].range.grow( size );
					list[i] = hope.annotation.create( range, list[i].tag );
				}
			}
		}
		// now remove indexes in removeList from list
		for ( i=removeList.length-1; i>=0; i--) {
			list.splice( removeList[i], 1);
		}
		return new hopeAnnotationList(list).clean();
	};

	hopeAnnotationList.prototype.clear = function( range ) {
		var i;
		range = hope.range.create(range);
		var list = this.list.slice();
		var remove = [];
		for ( i=0, l=list.length; i<l; i++ ) {
			var listRange = list[i].range;
			if ( listRange.overlaps( range ) && !listRange.contains( range ) ) {
				if ( range.contains( listRange ) ) {
					list[i] = null;
					remove.push(i);
				} else if ( listRange.start > range.start ) {
					list[i] = hope.annotation.create( [range.end, listRange.end], list[i].tag );
				} else if ( listRange.end <= range.end ) {
					list[i] = hope.annotation.create( [listRange.start, range.start], list[i].tag );
				}
			}
		}
		for ( i=remove.length-1; i>=0; i-- ) {
			list.splice( remove[i], 1);
		}
		return new hopeAnnotationList(list).clean();
	};

	hopeAnnotationList.prototype.remove = function( range, tag ) {
		var i;
		range = hope.range.create(range);
		var list = this.list.slice();
		var remove = [];
		var add = [];
		for ( i=0, l=list.length; i<l; i++ ) {
			var listRange = list[i].range;
			if ( !list[i].has( tag ) ) {
				continue;
			}
			if ( !listRange.overlaps(range) ) {
				continue;
			}
			// this is a diff / !intersects algorithm , which should be in hope.range
			// but that would require an extended range format which supports sequences of simple ranges
			if ( listRange.equals(range) || range.contains(listRange) ) {
				// range encompasses annotation range
				list[i] = null;
				remove.push(i);
			} else if (listRange.start<range.start && listRange.end>range.end) {
				// range is enclosed entirely in annotation range
				list[i] = hope.annotation.create(
					[ listRange.start, range.start ],
					list[i].tag
				);
				add.push( hope.annotation.create(
					[ range.end, listRange.end ],
					list[i].tag
				));
			} else if ( listRange.start < range.start ) {
				// range overlaps annotation to the right
				list[i] = hope.annotation.create( 
					[ listRange.start, range.start ], 
					list[i].tag
				);
			} else if ( listRange.end > range.end ) {
				// range overlaps annotation to the left
				list[i] = hope.annotation.create( 
					[ range.end, listRange.end ], 
					list[i].tag 
				);
			}

		}
		for ( i=remove.length-1;i>=0; i-- ) {
			list.splice( remove[i], 1);
		}
		list = list.concat(add);
		return new hopeAnnotationList(list).clean();
	};

	hopeAnnotationList.prototype.delete = function( range ) {
		range = hope.range.create(range);
		return this.grow( range.end, -range.length );
	};

	hopeAnnotationList.prototype.copy = function( range ) {
		range = hope.range.create(range);
		var copy = [];
		for ( var i=0, l=this.list.length; i<l; i++ ) {
			if ( this.list[i].range.overlaps( range ) ) {
				copy.push( 
					hope.annotation.create( 
						this.list[i].range.overlap(range).move(-range.start), 
						this.list[i].tag 
					)
				);
			}
		}
		return new hopeAnnotationList( copy );
	};

	hopeAnnotationList.prototype.getAt = function( position ) {
		if ( !position ) {
			position = 1;
		}
		range = hope.range.create(position, position);
		var matches = [];
		for ( var i=0, l=this.list.length; i<l; i++ ) {
			if ( this.list[i].range.overlaps( range ) ) {
				matches.push( this.list[i] );
			}
		}
		return new hopeAnnotationList( matches );		
	};

	hopeAnnotationList.prototype.has = function(range, tag) {
		range = hope.range.create(range);
		// first check if we can find a perfect match;
		var i,l;
		for ( i=0,l=this.list.length; i<l; i++ ) {
			if (
				this.list[i].range.equals( range ) &&
				this.list[i].has( tag )
			) {
				return this.list[i];
			}
		}
		// if not, find one that overlaps and return the first match we find;
		for ( i=0,l=this.list.length; i<l; i++ ) {
			if (
				this.list[i].range.overlaps( range ) && 
				this.list[i].has( tag )
			) {
				return this.list[i];
			}
		}
		return false;
	};

	hopeAnnotationList.prototype.length = function() {
		return this.list.length;
	};

	hopeAnnotationList.prototype.get = function( index ) {
		return this.list[index];
	};

	hopeAnnotationList.prototype.last = function( ) {
		return this.list[this.list.length-1];
	};

	hopeAnnotationList.prototype.filter = function(f) {
		var list = this.list.slice();
		list = list.filter( f );
		return new hopeAnnotationList( list );
	};

	hopeAnnotationList.prototype.getEventList = function() {
		function getUnsortedEventList() {
			var eventList = [];
			for ( var i=0, l=this.list.length; i<l; i++ ) {
				if ( typeof this.list[i].range.start != 'undefined' ) {
					if ( this.list[i].range.start != this.list[i].range.end ) {
						eventList.push( { type: 'start', offset: this.list[i].range.start, index: i });
						eventList.push( { type: 'end', offset: this.list[i].range.end, index: i });
					} else {
						eventList.push( { type: 'insert', offset: this.list[i].range.start, index: i});
					}							
				}
			}
			return eventList;
		}

		function calculateRelativeOffsets( eventList ) {
			var relativeList = eventList.slice();
			var currentOffset = 0;
			for ( var i=0, l=relativeList.length; i<l; i++ ) {
				relativeList[i].offset -= currentOffset;
				currentOffset += relativeList[i].offset;
			}
			return relativeList;
		}

		function groupByOffset( eventList ) {
			var groupedList = [];
			var current = -1;
			for ( var i=0, l=eventList.length; i<l; i++ ) {
				if ( eventList[i].offset > 0 ) {
					current++;
				}
				if ( current < 0 ) {
					current = 0;
				}
				if ( !groupedList[current] ) {
					groupedList[current] = { offset: eventList[i].offset, markup: [] };
				}
				groupedList[current].markup.push( { type: eventList[i].type, index: eventList[i].index } );
			}
			return groupedList;
		}

		var relativeList = getUnsortedEventList.call(this);
		relativeList.sort(function(a,b) {
			if ( a.offset < b.offset ) {
				return -1;
			} else if ( a.offset > b.offset ) {
				return 1;
			}
			return 0;
		});
		relativeList = calculateRelativeOffsets.call( this, relativeList );
		relativeList = groupByOffset.call( this, relativeList );
		return relativeList;
	};

	this.create = function( annotations ) {
		return new hopeAnnotationList( annotations );	
	};

});hope.register( 'hope.fragment.text', function() {

	function hopeTextFragment( text ) {
		this.content = text+'';
	}

	hopeTextFragment.prototype = {
		constructor: hopeTextFragment,
		get length () {
			return this.content.length;
		}
	};

	hopeTextFragment.prototype.delete   = function( range ) {
		range = hope.range.create(range);
		// cut range from content, return the cut content
		if ( range.start >= range.end ) {
			return this;
		} else {
			return new hopeTextFragment( this.content.slice( 0, range.start ) + this.content.slice( range.end ) );
		}
	};

	hopeTextFragment.prototype.copy  = function( range ) {
		range = hope.range.create(range);
		// return copy of content at range
		return new hopeTextFragment( this.content.slice( range.start, range.end ) );
	};

	hopeTextFragment.prototype.insert = function( position, content ) {
		// insert fragment at range, return cut fragment
		return new hopeTextFragment( this.content.slice( 0, position ) + content + this.content.slice( position ) );
	};

	hopeTextFragment.prototype.toString = function() {
		return this.content;
	};

	hopeTextFragment.prototype.search = function( re, matchIndex ) {
		function escapeRegExp(s) {
			return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
		}
		if ( ! ( re instanceof RegExp ) ) {
			re = new RegExp( escapeRegExp( re ) , 'g' );
		}
		var result = [];
		var match = null;
		if ( !matchIndex ) {
			matchIndex = 0;
		}
		while ( ( match = re.exec( this.content ) ) !== null ) {
			result.push( hope.range.create( match.index, match.index + match[matchIndex].length ) );
			if ( !re.global ) {
				break;
			}
		}
		return result;
	};

	this.create = function( content ) {
		return new hopeTextFragment( content );
	};

});hope.register( 'hope.render.html', function() {

	var nestingSets = {
		'inline'	: [ 'tt', 'u', 'strike', 'em', 'strong', 'dfn', 'code', 'samp', 'kbd', 'var', 'cite', 'abbr', 'acronym', 'sub', 'sup', 'q', 'span', 'bdo', 'a', 'object', 'img', 'bd', 'br', 'i' ],
		'block'		: [ 'address', 'dir', 'menu', 'hr', 'li', 'table', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'ul', 'ol', 'dl', 'div', 'blockquote', 'iframe' ]
	};

	nestingSets.all = nestingSets.block.concat( nestingSets.inline );

	this.rules = {
		nesting: {
			'a'         : nestingSets.inline.filter( function(element) { return element != 'a'; } ),
			'abbr'      : nestingSets.inline,
			'acronym'   : nestingSets.inline,
			'address'   : [ 'p' ].concat( nestingSets.inline ),
			'bdo'       : nestingSets.inline,
			'blockquote': nestingSets.all,
			'br'        : [],
			'caption'   : nestingSets.inline,
			'cite'      : nestingSets.inline,
			'code'      : nestingSets.inline,
			'col'       : [],
			'colgroup'  : [ 'col' ],
			'dd'        : nestingSets.all,
			'dfn'       : nestingSets.inline,
			'dir'       : [ 'li' ],
			'div'       : nestingSets.all,
			'dl'        : [ 'dt', 'dd' ],
			'dt'        : nestingSets.inline,
			'em'        : nestingSets.inline,
			'h1'        : nestingSets.inline,
			'h2'        : nestingSets.inline,
			'h3'        : nestingSets.inline,
			'h4'        : nestingSets.inline,
			'h5'        : nestingSets.inline,
			'h6'        : nestingSets.inline,
			'hr'        : [],
			'img'       : [],
			'kbd'       : nestingSets.inline,
			'li'        : nestingSets.all,
			'menu'      : [ 'li' ],
			'object'    : [ 'param' ].concat( nestingSets.all ),
			'ol'        : [ 'li' ],
			'p'         : nestingSets.inline,
			'pre'       : nestingSets.inline,
			'q'         : nestingSets.inline,
			'samp'      : nestingSets.inline,
			'span'      : nestingSets.inline,
			'strike'    : nestingSets.inline,
			'strong'    : nestingSets.inline,
			'sub'       : nestingSets.inline,
			'sup'       : nestingSets.inline,
			'table'     : [ 'caption', 'colgroup', 'col', 'thead', 'tbody' ],
			'tbody'     : [ 'tr' ],
			'td'        : nestingSets.all,
			'th'        : nestingSets.all,
			'thead'     : [ 'tr' ],
			'tr'        : [ 'td', 'th' ],
			'tt'        : nestingSets.inline,
			'u'         : nestingSets.inline,
			'ul'        : [ 'li' ],
			'var'       : nestingSets.inline
		},
		// which html elements can not have child elements at all and shouldn't be closed
		'noChildren' : [ 'hr', 'br', 'col', 'img' ],
		// which html elements must have a specific child element
		'obligChild' : {
			'ol' : [ 'li' ],
			'ul' : [ 'li' ],
			'dl' : [ 'dt', 'dd' ]
		},
		// which html elements must have a specific parent element
		'obligParent' : {
			'li' : [ 'ul', 'ol', 'dir', 'menu' ],
			'dt' : [ 'dl' ],
			'dd' : [ 'dl' ]
		},
		// which html elements to allow as the top level, default is only block elements
		'toplevel' : nestingSets.block.concat(nestingSets.inline), // [ 'li', 'img', 'span', 'strong', 'em', 'code' ],
		'nestingSets' : nestingSets
	};

	this.getTag = function( markup ) {
		return markup.split(' ')[0].toLowerCase(); // FIXME: more robust parsing needed
	};

	this.getAnnotationStack = function( annotationSet ) {
		// { index:nextAnnotationEntry.index, entry:nextAnnotation }
		// 		{ start:, end:, annotation: }
		// assert: annotationSet must only contain annotation that has overlapping ranges
		// if not results will be unpredictable
		var annotationStack = [];
		if ( !annotationSet.length ) {
			return [];
		}
		
		var rules = this.rules;

		annotationSet.sort( function( a, b ) {
			if ( a.range.start < b.range.start ) {
				return -1;
			} else if ( a.range.start > b.range.start ) {
				return 1;
			} else if ( a.range.end > b.range.end ) {
				return -1;
			} else if ( a.range.end < b.range.end ) {
				return 1;
			}

			// if comparing ul/ol and li on the same range, ul/ol goes first;
			if (rules.obligParent[a.tag.split(/ /)[0]]) {
				if (rules.obligParent[a.tag.split(/ /)[0]].indexOf(b.tag.split(/ /)[0]) != -1) {
					return 1;
				}
			}
			if (rules.obligParent[b.tag.split(/ /)[0]]) {
				if (rules.obligParent[b.tag.split(/ /)[0]].indexOf(a.tag.split(/ /)[0]) != -1) {
					return -1;
				}
			}

			// block elementen komen voor andere elementen
			if (nestingSets.block.indexOf(a.tag.split(/ /)[0]) != '-1') {
				return -1;
			}
			if (nestingSets.block.indexOf(b.tag.split(/ /)[0]) != '-1') {
				return 1;
			}

			// hack om hyperlinks met images er in te laten werken.
			if (a.tag.split(/ /)[0] == 'a') {
				return -1;
			}
			if (b.tag.split(/ /)[0] == 'a') {
				return 1;
			}

			// daarna komen inline elementen
			if (nestingSets.inline.indexOf(a.tag.split(/ /)[0]) != '-1') {
				return -1;
			}
			if (nestingSets.inline.indexOf(b.tag.split(/ /)[0]) != '-1') {
				return 1;
			}

			return 0;
		});
		var unfilteredStack = [];
		for ( var i=0, l=annotationSet.length; i<l; i++ ) {
			unfilteredStack.push( annotationSet[i] ); // needs to be filtered
		}
		// assume annotation higher in the stack is what user intended, so should override conflicting annotation lower in the stack
		// stack will be built up in reverse, most local styles applied first
		var annotation        = unfilteredStack.pop();
		var annotationTag     = this.getTag( annotation.tag );
		var lastAnnotationTag = '';
		var skippedAnnotation = [];

		// make sure any obligatory child is applied
		// FIXME: for readable html you should allow whitespace to be outside an obligatory child element
/*		if ( this.rules.obligChild[ annotationTag ] ) {
			lastAnnotationTag = this.rules.obligChild[ annotationTag ][0];
			annotationStack.push( lastAnnotationTag );
		}
*/
		do {
			annotationTag = this.getTag( annotation.tag );

			// Treat unknown types as a div.
			if (typeof this.rules.nesting[ annotationTag ] === "undefined") {
				this.rules.nesting[ annotationTag ] = this.rules.nesting["div"];
				for (i in this.rules.nesting) {
					this.rules.nesting[i].push(annotationTag);
				}
			}
			if (this.rules.toplevel.indexOf( annotationTag ) == -1) {
				this.rules.toplevel.push(annotationTag); // allow it as a toplevel element;
			}

			if ( 
				( !lastAnnotationTag && this.rules.toplevel.indexOf( annotationTag ) == -1 ) || 
				( lastAnnotationTag && ( !this.rules.nesting[ annotationTag ] || 
				this.rules.nesting[ annotationTag ].indexOf( lastAnnotationTag ) == -1 ) ) 
			) {
				// not legal: lastAnnotationTag may not be set inside annotationTag - so we cannot apply annotationTag
				// save it for another try later
				skippedAnnotation.push( annotation );			
			} else {
				annotationStack.push( annotation );
				lastAnnotationTag = this.getTag( annotation.tag );
			}
			annotation = unfilteredStack.pop();
		} while ( annotation );


		if ( skippedAnnotation.length ) {
			// now try to find a spot for any annotation from the skippedAnnotation set
			// most likely: inline annotation that was more generally applied than block annotation
			// the order has been reversed
			var topAnnotationTag = this.getTag( annotationStack[0].tag );
			annotation = skippedAnnotation.pop();
			while ( annotation ) {
				annotationTag = this.getTag( annotation.tag );
				if (  
					( !topAnnotationTag && this.rules.toplevel.indexOf( annotationTag ) == -1 ) || 
					( topAnnotationTag && ( !this.rules.nesting[ topAnnotationTag ] || 
					this.rules.nesting[ topAnnotationTag ].indexOf( annotationTag ) == -1 ) ) 
				) {
					// not legal, you could try another run... FIXME: should probably try harder 
				} else {
					annotationStack.unshift( annotation );
					topAnnotationTag = annotationTag;
				}
				annotation = skippedAnnotation.pop();
			}
		}
		// FIXME: this routine can be improved - it needs a more intelligent algorithm to reorder the annotation to maximize the applied
		// annotation from the annotationSet in the annotationStack
		return annotationStack.reverse();
	};

	this.getAnnotationDiff = function( annotationStackFrom, annotationStackTo, annotationsOnce ) {
		var i;
		var annotationDiff = [];
		for ( i=0, l=annotationsOnce.length; i<l; i++ ) {
			annotationDiff.push( { type : 'insert', annotation : annotationsOnce[i] } );
		}

		var commonStack = [];
		for ( i=0, l=annotationStackFrom.length; i<l; i++ ) {
			if ( annotationStackFrom[i] != annotationStackTo[i] ) {
				break;
			}
			commonStack.push( annotationStackFrom[i] );
		}
		var commonIndex = i-1;
		for ( i=annotationStackFrom.length-1; i>commonIndex; i-- ) {
			annotationDiff.push( { type : 'close', annotation : annotationStackFrom[i] } );
		}
		for ( i=commonIndex+1, l=annotationStackTo.length; i<l; i++ ) {
			annotationDiff.push( { type : 'start', annotation : annotationStackTo[i] } );
		}

		return annotationDiff;
	};

	this.renderAnnotationDiff = function( annotationDiff ) {
		// FIXME: allow rendering of custom elements, must still be inserted into this.rules
		var renderedDiff = '';
		for ( var i=0, l=annotationDiff.length; i<l; i++ ) {
			var annotationTag;
			if ( annotationDiff[i].type == 'close' ) {
				annotationTag = this.getTag( annotationDiff[i].annotation.tag );
				if ( this.rules.noChildren.indexOf( annotationTag ) == -1 ) {
					renderedDiff += '</' + annotationTag + '>';
				}
			} else if ( annotationDiff[i].type == 'insert' ) {
				renderedDiff += '<' + annotationDiff[i].annotation.tag + '>';
				annotationTag = this.getTag( annotationDiff[i].annotation.tag );
				if ( this.rules.noChildren.indexOf( annotationTag ) == -1 ) {
					renderedDiff += '</' + annotationTag + '>';
				}
			} else {
				renderedDiff += '<' + annotationDiff[i].annotation.tag + '>';
			}
		}
		return renderedDiff;
	};

	this.escape = function( content ) {
		return content
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	};

	this.render = function( fragment ) {
		// FIXME: annotation should be the relative annotation list to speed things up
		var annotationSet      = [];    // set of applicable annotation at current position
		var annotationStack    = [];  // stack of applied (valid) annotation at current position

		var relativeAnnotation = fragment.annotations.getEventList();
		var content        = fragment.text.toString();

		var renderedHTML   = '';
		var cursor         = 0;

		while ( relativeAnnotation.length ) {

			var annotationChangeSet = relativeAnnotation.shift();
			var annotationAdded     = []; // list of annotation added in this change set
			var annotationSetOnce   = []; // list of annotation that can not have children, needs no close
			for ( i=0, l=annotationChangeSet.markup.length; i<l; i++ ) {
				var annotationChange = annotationChangeSet.markup[i];
				switch ( annotationChange.type ) {
					case 'start':
						annotationSet.push( fragment.annotations.list[ annotationChange.index ] );
						annotationAdded.push( annotationChange.index );
					break;
					case 'end':
						annotationSet = annotationSet.filter( function( element ) {
							return element != fragment.annotations.list[ annotationChange.index ];
						} );
					break;
					case 'insert':
						annotationSetOnce.push( fragment.annotations.list[ annotationChange.index ] );
					break;
				}
			}

			// add any content that has no change in annotation
			var offset = annotationChangeSet.offset;
			if ( offset > 0 ) {
				if (diffHTML && (
					diffHTML.indexOf("<br>") !== -1 ||
					diffHTML.indexOf("<hr>") !== -1 ||
					diffHTML.indexOf("<img") !== -1 ||
					(offset == 1 && (content.substr(cursor, offset) == "\u00AD")) // FIXME: This should have some kind of check to see if the element was empty in the first place;
				) ) {
					// skip the placeholder char for the rendering;
					cursor++;
					offset--;
				}

				renderedHTML += this.escape( content.substr(cursor, offset) );
				cursor+=offset;
			}
			offset = 0;

			// calculate the valid annotation stack from a given set
			var newAnnotationStack = this.getAnnotationStack( annotationSet ); //.concat( annotationSetOnce ) );
			var newAnnotationsOnce = this.getAnnotationStack( annotationSetOnce );
			// calculate the difference - how to get from stack one to stack two with the minimum of tags
			var diff = this.getAnnotationDiff( annotationStack, newAnnotationStack, newAnnotationsOnce );
			// remove autoclosing annotation from the newAnnotationStack
			newAnnotationStack = this.getAnnotationStack( annotationSet );
			var diffHTML = this.renderAnnotationDiff( diff );

			renderedHTML += diffHTML;
			annotationStack = newAnnotationStack;

		} while( relativeAnnotation.length );

		if ( cursor < content.length ) {
			renderedHTML += this.escape( content.substr( cursor ) );
		}

		return renderedHTML;
	};

} );hope.register('hope.events', function() {
	
	if ( typeof hope.global.addEventListener != 'undefined' ) {
		this.listen = function( el, event, callback, capture ) {
			return el.addEventListener( event, callback, capture );
		};
	} else if ( typeof hope.global.attachEvent != 'undefined' ) {
		this.listen = function( el, event, callback, capture ) {
			return el.attachEvent( 'on' + event, function() {
				var evt = hope.global.event;
				var self = evt.srcElement;
				if ( !self ) {
					self = hope.global;
				}
				return callback.call( self, evt );
			} );
		};
	} else {
		throw new hope.Exception( 'Browser is not supported', 'hope.editor.events.1' );
	}

	this.cancel = function( evt ) {
		if ( typeof evt.stopPropagation != 'undefined' ) {
			evt.stopPropagation();
		}
		if ( typeof evt.preventDefault != 'undefined' ) {
			evt.preventDefault();
		}
		if ( typeof evt.cancelBubble != 'undefined' ) {
			evt.cancelBubble = true;
		}
		return false;
	};
	
} );hope.register( 'hope.keyboard', function() {
	var i;

	var self = this;

	var keyCodes = [];
	keyCodes[3]  = 'Cancel';
	keyCodes[6]  = 'Help';
	keyCodes[8]  = 'Backspace';
	keyCodes[9]  = 'Tab';
	keyCodes[12] = 'Numlock-5';
	keyCodes[13] = 'Enter';

	keyCodes[16] = 'Shift';
	keyCodes[17] = 'Control';
	keyCodes[18] = 'Alt';
	keyCodes[19] = 'Pause';
	keyCodes[20] = 'CapsLock';
	keyCodes[21] = 'KanaMode'; //HANGUL

	keyCodes[23] = 'JunjaMode';
	keyCodes[24] = 'FinalMode';
	keyCodes[25] = 'HanjaMode'; //KANJI

	keyCodes[27] = 'Escape';
	keyCodes[28] = 'Convert';
	keyCodes[29] = 'NonConvert';
	keyCodes[30] = 'Accept';
	keyCodes[31] = 'ModeChange';
	keyCodes[32] = 'Spacebar';
	keyCodes[33] = 'PageUp';
	keyCodes[34] = 'PageDown';
	keyCodes[35] = 'End';
	keyCodes[36] = 'Home';
	keyCodes[37] = 'ArrowLeft';
	keyCodes[38] = 'ArrowUp';
	keyCodes[39] = 'ArrowRight'; // opera has this as a "'" as well...
	keyCodes[40] = 'ArrowDown';
	keyCodes[41] = 'Select';
	keyCodes[42] = 'Print';
	keyCodes[43] = 'Execute';
	keyCodes[44] = 'PrintScreen'; // opera ';';
	keyCodes[45] = 'Insert'; // opera has this as a '-' as well...
	keyCodes[46] = 'Delete'; // opera - ',';
	keyCodes[47] = '/'; // opera

	keyCodes[59] = ';';
	keyCodes[60] = '<';
	keyCodes[61] = '=';
	keyCodes[62] = '>';
	keyCodes[63] = '?';
	keyCodes[64] = '@';

	keyCodes[91] = 'OS'; // opera '[';
	keyCodes[92] = 'OS'; // opera '\\';
	keyCodes[93] = 'ContextMenu'; // opera ']';
	keyCodes[95] = 'Sleep';
	keyCodes[96] = '`';

	keyCodes[106] = '*'; // keypad
	keyCodes[107] = '+'; // keypad
	keyCodes[109] = '-'; // keypad
	keyCodes[110] = 'Separator'; 
	keyCodes[111] = '/'; // keypad

	keyCodes[144] = 'NumLock';
	keyCodes[145] = 'ScrollLock';

	keyCodes[160] = '^';
	keyCodes[161] = '!';
	keyCodes[162] = '"';
	keyCodes[163] = '#';
	keyCodes[164] = '$';
	keyCodes[165] = '%';
	keyCodes[166] = '&';
	keyCodes[167] = '_';
	keyCodes[168] = '(';
	keyCodes[169] = ')';
	keyCodes[170] = '*';
	keyCodes[171] = '+';
	keyCodes[172] = '|';
	keyCodes[173] = '-';
	keyCodes[174] = '{';
	keyCodes[175] = '}';
	keyCodes[176] = '~';

	keyCodes[181] = 'VolumeMute';
	keyCodes[182] = 'VolumeDown';
	keyCodes[183] = 'VolumeUp';

	keyCodes[186] = ';';
	keyCodes[187] = '=';
	keyCodes[188] = ',';
	keyCodes[189] = '-';
	keyCodes[190] = '.';
	keyCodes[191] = '/';
	keyCodes[192] = '`';

	keyCodes[219] = '[';
	keyCodes[220] = '\\';
	keyCodes[221] = ']';
	keyCodes[222] = "'";
	keyCodes[224] = 'Meta';
	keyCodes[225] = 'AltGraph';

	keyCodes[246] = 'Attn';
	keyCodes[247] = 'CrSel';
	keyCodes[248] = 'ExSel';
	keyCodes[249] = 'EREOF';
	keyCodes[250] = 'Play';
	keyCodes[251] = 'Zoom';
	keyCodes[254] = 'Clear';

	// a-z
	for ( i=65; i<=90; i++ ) {
		keyCodes[i] = String.fromCharCode( i ).toLowerCase();
	}

	// 0-9
	for ( i=48; i<=57; i++ ) {
		keyCodes[i] = String.fromCharCode( i );
	}
	// 0-9 keypad
	for ( i=96; i<=105; i++ ) {
		keyCodes[i] = ''+(i-95);
	}

	// F1 - F24
	for ( i=112; i<=135; i++ ) {
		keyCodes[i] = 'F'+(i-111);
	}

	function convertKeyNames( key ) {
		switch ( key ) {
			case ' ':
				return 'Spacebar';
			case 'Esc' :
				return 'Escape';
			case 'Left' : 
			case 'Up' :
			case 'Right' : 
			case 'Down' :
				return 'Arrow'+key;
			case 'Del' :
				return 'Delete';
			case 'Scroll' :
				return 'ScrollLock';
			case 'MediaNextTrack' :
				return 'MediaTrackNext';
			case 'MediaPreviousTrack' :
				return 'MediaTrackPrevious';
			case 'Crsel' :
				return 'CrSel';
			case 'Exsel' :
				return 'ExSel';
			case 'Zoom' :
				return 'ZoomToggle';
			case 'Multiply' :
				return '*';
			case 'Add' : 
				return '+';
			case 'Subtract' :
				return '-';
			case 'Decimal' :
				return '.';
			case 'Divide' :
				return '/';
			case 'Apps' :
				return 'Menu';
			default:
				return key;
		}
	}

	this.getKey = function( evt ) {
		var keyInfo = '';
		if ( evt.ctrlKey && evt.keyCode != 17 ) {
			keyInfo += 'Control+';
		}
		if ( evt.metaKey && evt.keyCode != 224 ) {
			keyInfo += 'Meta+';
		}
		if ( evt.altKey && evt.keyCode != 18 ) {
			keyInfo += 'Alt+';
		}
		if ( evt.shiftKey && evt.keyCode != 16 ) {
			keyInfo += 'Shift+';
		}
		// evt.key turns shift+a into A, while keeping shiftKey, so it becomes Shift+A, instead of Shift+a.
		// so while it may be the future, i'm not using it here.
		if ( evt.charCode ) {
			keyInfo += String.fromCharCode( evt.charCode ).toLowerCase();
		} else if ( evt.keyCode ) {
			if ( typeof keyCodes[evt.keyCode] == 'undefined' ) {
				keyInfo += '('+evt.keyCode+')';
			} else {
				keyInfo += keyCodes[evt.keyCode];
			}
		} else {
			keyInfo += 'Unknown';
		}
		return keyInfo;
	};

	this.listen = function( el, key, callback, capture ) {
		return hope.editor.events.listen( el, 'keydown', function(evt) {
			var  pressedKey = self.getKey( evt );
			if ( key == pressedKey ) {
				callback.call( this, evt );
			}
		}, capture);
	};

} );hope.register( 'hope.editor', function() {
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

});hope.register( 'hope.editor.selection', function() {
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