/*	Slip - swiping and reordering in lists of elements on touch screens, no fuss.

	Fires these events on list elements:

		â€¢ slip:swipe
			When swipe has been done and user has lifted finger off the screen.
			If you execute event.preventDefault() the element will be animated back to original position.
			Otherwise it will be animated off the list and set to display:none.

		â€¢ slip:beforeswipe
			Fired before first swipe movement starts.
			If you execute event.preventDefault() then element will not move at all.

		â€¢ slip:reorder
			Element has been dropped in new location. event.detail contains the location:
				â€¢ insertBefore: DOM node before which element has been dropped (null is the end of the list). Use with node.insertBefore().
				â€¢ spliceIndex: Index of element before which current element has been dropped, not counting the element iself.
							   For use with Array.splice() if the list is reflecting objects in some array.

		â€¢ slip:beforereorder
			When reordering movement starts.
			Element being reordered gets class `slip-reordering`.
			If you execute event.preventDefault() then element will not move at all.

		â€¢ slip:beforewait
			If you execute event.preventDefault() then reordering will begin immediately, blocking ability to scroll the page.

		â€¢ slip:tap
			When element was tapped without being swiped/reordered.

		â€¢ slip:cancelswipe
			Fired when the user stops dragging and the element returns to its original position.


	Usage:

		CSS:
			You should set `user-select:none` (and WebKit prefixes, sigh) on list elements,
			otherwise unstoppable and glitchy text selection in iOS will get in the way.

			You should set `overflow-x: hidden` on the container or body to prevent horizontal scrollbar
			appearing when elements are swiped off the list.


		var list = document.querySelector('ul#slippylist');
		new Slip(list);

		list.addEventListener('slip:beforeswipe', function(e) {
			if (shouldNotSwipe(e.target)) e.preventDefault();
		});

		list.addEventListener('slip:swipe', function(e) {
			// e.target swiped
			if (thatWasSwipeToRemove) {
				e.target.parentNode.removeChild(e.target);
			} else {
				e.preventDefault(); // will animate back to original position
			}
		});

		list.addEventListener('slip:beforereorder', function(e) {
			if (shouldNotReorder(e.target)) e.preventDefault();
		});

		list.addEventListener('slip:reorder', function(e) {
			// e.target reordered.
			if (reorderedOK) {
				e.target.parentNode.insertBefore(e.target, e.detail.insertBefore);
			} else {
				e.preventDefault();
			}
		});

	Requires:
		â€¢ Touch events
		â€¢ CSS transforms
		â€¢ Function.bind()

	Caveats:
		â€¢ Elements must not change size while reordering or swiping takes place (otherwise it will be visually out of sync)
*/
/*! @license
	Slip.js 1.2.0

	Â© 2014 Kornel LesiÅ„ski <kornel@geekhood.net>. All rights reserved.

	Redistribution and use in source and binary forms, with or without modification,
	are permitted provided that the following conditions are met:

	1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

	2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
	   the following disclaimer in the documentation and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
	INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
	DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
	SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
	WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
	USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

window['Slip'] = (function(){
	'use strict';

	var damnYouChrome = /Chrome\/[34]/.test(navigator.userAgent); // For bugs that can't be programmatically detected :( Intended to catch all versions of Chrome 30-40
	var needsBodyHandlerHack = damnYouChrome; // Otherwise I _sometimes_ don't get any touchstart events and only clicks instead.

	/* When dragging elements down in Chrome (tested 34-37) dragged element may appear below stationary elements.
	   Looks like WebKit bug #61824, but iOS Safari doesn't have that problem. */
	var compositorDoesNotOrderLayers = damnYouChrome;

	// -webkit-mess
	var testElement = document.createElement('div');

	var transitionPrefix = "webkitTransition" in testElement.style ? "webkitTransition" : "transition";
	var transformPrefix = "webkitTransform" in testElement.style ? "webkitTransform" : "transform";
	var transformProperty = transformPrefix === "webkitTransform" ? "-webkit-transform" : "transform";
	var userSelectPrefix = "webkitUserSelect" in testElement.style ? "webkitUserSelect" : "userSelect";

	testElement.style[transformPrefix] = 'translateZ(0)';
	var hwLayerMagic = testElement.style[transformPrefix] ? 'translateZ(0) ' : '';
	var hwTopLayerMagic = testElement.style[transformPrefix] ? 'translateZ(1px) ' : '';
	testElement = null;

	var globalInstances = 0;
	var attachedBodyHandlerHack = false;
	var nullHandler = function(){};

	function Slip(container, options) {
		if ('string' === typeof container) container = document.querySelector(container);
		if (!container || !container.addEventListener) throw new Error("Please specify DOM node to attach to");

		if (!this || this === window) return new Slip(container, options);

		this.options = options;

		// Functions used for as event handlers need usable `this` and must not change to be removable
		this.cancel = this.setState.bind(this, this.states.idle);
		this.onTouchStart = this.onTouchStart.bind(this);
		this.onTouchMove = this.onTouchMove.bind(this);
		this.onTouchEnd = this.onTouchEnd.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onMouseLeave = this.onMouseLeave.bind(this);
		this.onSelection = this.onSelection.bind(this);
		this.onScroll = this.onScroll.bind(this);

		this.setState(this.states.idle);
		this.attach(container);
	}

	function getTransform(node) {
		var transform = node.style[transformPrefix];
		if (transform) {
			return {
				value:transform,
				original:transform,
			};
		}

		if (window.getComputedStyle) {
			var style = window.getComputedStyle(node).getPropertyValue(transformProperty);
			if (style && style !== 'none') return {value:style, original:''};
		}
		return {value:'', original:''};
	}

	function findIndex(target, nodes) {
		var originalIndex = 0;
		var listCount = 0;

		for (var i=0; i < nodes.length; i++) {
		if (nodes[i].nodeType === 1) {
			listCount++;
			if (nodes[i] === target.node) {
			originalIndex = listCount-1;
			}
		}
		}

		return originalIndex;
	}

	/* Helper functions to improve on getBoundingClientRect - also works
	 * for elements that are collapsed because all the child elements
	 * have float: styles. */

	function getNodeBounds(el) {
		var minTop;
		var maxBottom;
		var minLeft;
		var maxRight;

		if (el.offsetHeight > 0) {
			return el.getBoundingClientRect();
		}

		// Its a collapsed element, probably because of floating child elements.
		for (var i=0; i<el.childNodes.length; i++) {
			if (el.childNodes[i].nodeType === document.ELEMENT_NODE) {
				var rects = el.childNodes[i].getBoundingClientRect();
				if (typeof minTop === "undefined") {
					minTop = rects.top;
				} else if (minTop > rects.top) {
					minTop = rects.top;
				}

				if (typeof maxBottom === "undefined") {
					maxBottom = rects.bottom;
				} else if (maxBottom < rects.bottom) {
					maxBottom = rects.bottom;
				}

				if (typeof minLeft === "undefined") {
					minLeft = rects.left;
				} else if (minLeft > rects.left) {
					minLeft = rects.left;
				}

				if (typeof maxRight === "undefined") {
					maxRight = rects.right;
				} else if (maxRight < rects.right) {
					maxRight = rects.right;
				}
			}
		}
		return {
			top : minTop,
			bottom : maxBottom,
			left : minLeft,
			right: maxRight
		}
	}

	function getNodeHeight(el) {
		if (el.offsetHeight > 0) {
			return el.offsetHeight;
		}
		if (el.childNodes.length) {
			var nodeBounds = getNodeBounds(el);
			return nodeBounds.bottom - nodeBounds.top;
		}
		return 0;
	}
	function getNodeWidth(el) {
		if (el.offsetHeight > 0) {
			return el.offsetWidth;
		}
		if (el.childNodes.length) {
			var nodeBounds = getNodeBounds(el);
			return nodeBounds.right - nodeBounds.left;
		}
		return 0;
	}
	function getNodeLeft(el) {
		if (el.offsetHeight > 0) {
			return el.offsetLeft;
		}
		if (el.childNodes.length) {
			var nodeBounds = getNodeBounds(el);
			return nodeBounds.left;
		}
		return 0;
	}
	function getNodeTop(el) {
		if (el.offsetHeight > 0) {
			return el.offsetTop;
		}
		if (el.childNodes.length) {
			var nodeBounds = getNodeBounds(el);
			return nodeBounds.top;
		}
		return 0;
	}


	// All functions in states are going to be executed in context of Slip object
	Slip.prototype = {

		container: null,
		options: {},
		state: null,

		target: null, // the tapped/swiped/reordered node with height and backed up styles

		usingTouch: false, // there's no good way to detect touchscreen preference other than receiving a touch event (really, trust me).
		mouseHandlersAttached: false,

		startPosition: null, // x,y,time where first touch began
		latestPosition: null, // x,y,time where the finger is currently
		previousPosition: null, // x,y,time where the finger was ~100ms ago (for velocity calculation)

		canPreventScrolling: false,

		states: {
			idle: function idleStateInit() {
				this.target = null;
				this.usingTouch = false;
				this.removeMouseHandlers();

				return {
					allowTextSelection: true,
				};
			},

			undecided: function undecidedStateInit() {
				this.target.height = this.target.node.offsetHeight;
				this.target.node.style[transitionPrefix] = '';

				if (!this.dispatch(this.target.originalTarget, 'beforewait')) {
					if (this.dispatch(this.target.originalTarget, 'beforereorder')) {
					this.setState(this.states.reorder);
					}
				} else {
					var holdTimer = setTimeout(function(){
						var move = this.getAbsoluteMovement();
						if (this.canPreventScrolling && move.x < 15 && move.y < 25 && !this.selectionChanged) {
							if (this.dispatch(this.target.originalTarget, 'beforereorder')) {
								this.setState(this.states.reorder);
							}
						}
					}.bind(this), 300);
				}

				return {
					leaveState: function() {
						clearTimeout(holdTimer);
					},

					onMove: function() {
						var move = this.getAbsoluteMovement();
				
						if (move.x > 20 && move.y < Math.max(100, this.target.height)) {
							if (this.dispatch(this.target.originalTarget, 'beforeswipe')) {
								this.setState(this.states.swipe);
								return false;
							} else {
								this.setState(this.states.idle);
							}
						}
						if (move.x > 20) {
							this.setState(this.states.idle);
						}
						if (move.y > 20) {
							this.setState(this.states.idle);
						}

						// Chrome likes sideways scrolling :(
						if (move.x > move.y*1.2) return false;
					},

					onLeave: function() {
						this.setState(this.states.idle);
					},

					onEnd: function() {
						var allowDefault = this.dispatch(this.target.originalTarget, 'tap');
						this.setState(this.states.idle);
						return allowDefault;
					},
				};
			},

			swipe: function swipeStateInit() {
				var swipeSuccess = false;
				var container = this.container;

				var originalIndex = findIndex(this.target, this.container.childNodes);

				container.className += ' slip-swiping-container';
				function removeClass() {
					container.className = container.className.replace(/(?:^| )slip-swiping-container/,'');
				}

				this.target.height = this.target.node.offsetHeight;

				return {
					leaveState: function() {
						if (swipeSuccess) {
							this.animateSwipe(function(target){
								target.node.style[transformPrefix] = target.baseTransform.original;
								target.node.style[transitionPrefix] = '';
								if (this.dispatch(target.node, 'afterswipe')) {
									removeClass();
									return true;
								} else {
									this.animateToZero(undefined, target);
								}
							}.bind(this));
						} else {
							this.animateToZero(removeClass);
							this.dispatch(this.target.node, 'cancelswipe');
						}
					},

					onMove: function() {
						var move = this.getTotalMovement();

						if (Math.abs(move.y) < this.target.height+20) {
							this.target.node.style[transformPrefix] = 'translate(' + move.x + 'px,0) ' + hwLayerMagic + this.target.baseTransform.value;
							return false;
						} else {
							this.setState(this.states.idle);
						}
					},

					onLeave: function() {
						this.state.onEnd.call(this);
					},

					onEnd: function() {
						var dx = this.latestPosition.x - this.previousPosition.x;
						var dy = this.latestPosition.y - this.previousPosition.y;
						var velocity = Math.sqrt(dx*dx + dy*dy) / (this.latestPosition.time - this.previousPosition.time + 1);

						var move = this.getAbsoluteMovement();
						var swiped = velocity > 0.6 && move.time > 110;

						var direction;
						if (dx > 0) {
							direction = "right";
						} else {
							direction = "left";
						}

						if (swiped) {
							if (this.dispatch(this.target.node, 'swipe', {direction: direction, originalIndex: originalIndex})) {
								swipeSuccess = true; // can't animate here, leaveState overrides anim
							}
						}
						this.setState(this.states.idle);
						return !swiped;
					},
				};
			},

			reorder: function reorderStateInit() {

				this.target.height = getNodeHeight(this.target.node);
				this.target.width = getNodeWidth(this.target.node);

				var nodes = this.container.childNodes;
				var originalIndex = findIndex(this.target, nodes);
				var mouseOutsideTimer;
				var zeroY = getNodeTop(this.target.node) + this.target.height/2;
				var zeroX = getNodeLeft(this.target.node) + this.target.width/2;

				this.target.rects = getNodeBounds(this.target.node);
				this.target.node.rects = this.target.rects;

				this.target.parentList = Array.prototype.slice.call(this.target.node.parentNode.children);

				var otherNodes = [];
				var variationInX = false;
				var variationInY = false;
				 
				for(var i=0; i < nodes.length; i++) {
					if (nodes[i].nodeType != 1 || nodes[i] === this.target.node) continue;
					var t = getNodeTop(nodes[i]);
					var l = getNodeLeft(nodes[i]);
					
					nodes[i].style[transitionPrefix] = transformProperty + ' 0.2s ease-in-out';
					if (nodes[i].offsetParent) {
						otherNodes.push({
							node: nodes[i],
							baseTransform: getTransform(nodes[i]),
							rects : getNodeBounds(nodes[i]),
							posY: t + (t < zeroY ? getNodeHeight(nodes[i]) : 0) - zeroY,
							posX: l + (l < zeroX ? getNodeWidth(nodes[i]) : 0) - zeroX,
						});
						nodes[i].rects = getNodeBounds(nodes[i]);

						if (otherNodes[0].posX != otherNodes[otherNodes.length-1].posX) {
							variationInX = true;
						}
						if (otherNodes[0].posY != otherNodes[otherNodes.length-1].posY) {
							variationInY = true;
						}
						if (t != getNodeTop(this.target.node)) {
							variationInY = true;
						}
						if (l != getNodeLeft(this.target.node)) {
							variationInX = true;
						}
					}
				}

				this.target.node.className += ' slip-reordering';
				this.target.node.style.zIndex = '99999';
				this.target.node.style[userSelectPrefix] = 'none';
				if (compositorDoesNotOrderLayers) {
					// Chrome's compositor doesn't sort 2D layers
					this.container.style.webkitTransformStyle = 'preserve-3d';
				}
				this.container.origTransform = this.container.style[transformPrefix];
				this.container.origTransformOrigin = this.container.style[transformPrefix + "Origin"];
				this.container.origTransition = this.container.style[transitionPrefix];

				var containerRects = this.container.getBoundingClientRect();
				if (
					(window.innerHeight < containerRects.height) ||
					(window.innerWidth < containerRects.width)
				) {
					this.container.scale = Math.min(
						(window.innerHeight-100)/containerRects.height,
						(window.innerWidth)/containerRects.width
					);

					if (this.container.scale < 0.4) {
						this.container.scale = 0.4;
					};

					this.container.style[transitionPrefix] = transformProperty + " .3s ease-in-out";
					this.container.style[transformPrefix + "Origin"] = (this.startPosition.x - containerRects.left) + "px " + (this.startPosition.y - containerRects.top) + "px";
					this.container.style[transformPrefix] = "scale(" + this.container.scale + ")";
					document.addEventListener("focus", this.preventFocus, true);
				}

				function setPosition() {
					/*jshint validthis:true */
					
					if (mouseOutsideTimer) {
						// don't care where the mouse is as long as it moves
						clearTimeout(mouseOutsideTimer); mouseOutsideTimer = null;
					}

					var move = this.getTotalMovement();
					if (!variationInX) {
						move.x = 0;
					}
					if (!variationInY) {
						move.y = 0;
					}

					var targetRects = getNodeBounds(this.target.node);
					this.target.node.focus();

					var yAngleCorrection = Math.sin(2 * Math.PI / 180) * (move.x);
					move.y -= yAngleCorrection;

//					this.target.node.style[transformPrefix] = 'translate(0,' + move.y + 'px) ' + hwTopLayerMagic + this.target.baseTransform.value;
					this.target.node.style[transformPrefix] = 'rotate(2deg) translate(' + move.x + 'px,' + move.y + 'px) ' + hwTopLayerMagic + this.target.baseTransform.value;
					this.target.node.style["animationName"] = 'none'; // FIXME;
					// rotate around the position of the mouse to prevent the rotation from selecting text;
					// this.target.node.style[transformPrefix + "Origin"] = (this.startPosition.x - targetRects.left) + "px " + (this.startPosition.y - targetRects.top) + "px";
					this.target.node.style[transformPrefix + "Origin"] = this.startOrigin;

					var height = this.target.height;
					var width = this.target.width;
					var currentTarget = this.target;

					// Set to the middle of the dragged element;
					var currentRect = {
						top : (currentTarget.rects.top + currentTarget.rects.bottom) / 2,
						bottom: (currentTarget.rects.top + currentTarget.rects.bottom) / 2,
						left : (currentTarget.rects.left + currentTarget.rects.right) / 2,
						right: (currentTarget.rects.left + currentTarget.rects.right) / 2
					};

					// Offset the mouse position;
					currentRect.top += move.y;
					currentRect.bottom += move.y;
					currentRect.left += move.x;
					currentRect.right += move.x;

					var hoverTarget;

					otherNodes.forEach(function(o){
						if (
							(currentRect.right > o.rects.left) &&
							(currentRect.left < o.rects.right) &&
							(currentRect.top < o.rects.bottom) &&
							(currentRect.bottom > o.rects.top)
						) {
							hoverTarget = o;
						}
						return;
					});

					if (!hoverTarget) {
						if (
							(currentRect.right > currentTarget.rects.left) &&
							(currentRect.left < currentTarget.rects.right) &&
							(currentRect.top < currentTarget.rects.bottom) &&
							(currentRect.bottom > currentTarget.rects.top)
						) {
							// We are hovering over our old spot;
							hoverTarget = currentTarget;
						} else {
							// No target is an exact match, find the closest one;
							var bestDeltaMatch = currentTarget;
							var delta1, delta2;

							otherNodes.forEach(function(o){
								delta1 = Math.pow((o.rects.top - currentRect.top), 2) + Math.pow((o.rects.right - currentRect.right), 2);
								delta2 = Math.pow((bestDeltaMatch.rects.top - currentRect.top), 2) + Math.pow((bestDeltaMatch.rects.right - currentRect.right), 2);
								if (delta1 < delta2) {
									bestDeltaMatch = o;
								}

								return;
							});
							hoverTarget = bestDeltaMatch;
						}
					}

					if (hoverTarget) {
						var hoverTargetIndex = currentTarget.parentList.indexOf(hoverTarget.node);
						var currentTargetIndex = currentTarget.parentList.indexOf(currentTarget.node);
						var beginIndex = Math.min(hoverTargetIndex, currentTargetIndex);
						var endIndex = Math.max(hoverTargetIndex, currentTargetIndex);

						for (var i=0; i<otherNodes.length; i++) {
							if (hoverTarget != currentTarget.hoverTarget) {
								otherNodes[i].node.style[transformPrefix] = otherNodes[i].baseTransform.original;
							}

							var index = currentTarget.parentList.indexOf(otherNodes[i].node);
							if (index >= beginIndex && index <= endIndex) {
								var node1, node2;
								if (hoverTargetIndex > currentTargetIndex) {
									node1 = currentTarget.parentList[i+1];
									node2 = currentTarget.parentList[i];
									// console.log("swap " + (i+1) + " to " + (i));
								} else {
									node1 = currentTarget.parentList[i];
									node2 = currentTarget.parentList[i+1];
									// console.log("swap " + (i) + " to " + (i+1));
								}

								var offY = node2.rects.top - node1.rects.top;
								var offX = node2.rects.left - node1.rects.left;

								if (offX === 0) {
									offY = (offY > 0) ? currentTarget.height : -currentTarget.height;
								}
								if (offY === 0) {
									offX = (offX > 0) ? currentTarget.width: -currentTarget.width;
								}									

								// FIXME: should change accelerated/non-accelerated state lazily
								// node1.node.style[transformPrefix] = off ? 'translate(0,'+off+'px) ' + hwLayerMagic + o.baseTransform.value : o.baseTransform.original;
								otherNodes[i].node.style[transformPrefix] = (offX || offY) ? 'translate('+offX+'px,'+offY+'px) ' + hwLayerMagic + otherNodes[i].baseTransform.value : otherNodes[i].baseTransform.original;
								otherNodes[i].node.style["animationName"] = "none";
							}
						}
						currentTarget.hoverTarget = hoverTarget;
					} else {
						for (var i=0; i<otherNodes.length; i++) {
							otherNodes[i].node.style[transformPrefix] = otherNodes[i].baseTransform.original;
							// node1.node.style[transitionPrefix] = ''; // FIXME: animate to new position
						}
					}
					return false;
				}

				setPosition.call(this);

				return {
					leaveState: function() {
						if (mouseOutsideTimer) clearTimeout(mouseOutsideTimer);

						if (compositorDoesNotOrderLayers) {
							this.container.style.webkitTransformStyle = '';
						}
						this.container.style[transformPrefix] = this.container.origTransform;
						var targetContainer = this.container;

						window.setTimeout(function() {
							targetContainer.style[transitionPrefix] = targetContainer.origTransition;
						}, 500);
						this.container.style[transformPrefix + "Origin"] = this.container.origTransformOrigin;

						this.target.node.className = this.target.node.className.replace(/(?:^| )slip-reordering/,'');
						this.target.node.style[userSelectPrefix] = '';

						this.animateToZero(function(target){
							target.node.style.zIndex = '';
						});
						otherNodes.forEach(function(o){
							o.node.style[transformPrefix] = o.baseTransform.original;
							o.node.style[transitionPrefix] = ''; // FIXME: animate to new position
						});
					},

					onMove: setPosition,

					onLeave: function() {
						// don't let element get stuck if mouse left the window
						// but don't cancel immediately as it'd be annoying near window edges
						if (mouseOutsideTimer) clearTimeout(mouseOutsideTimer);
						mouseOutsideTimer = setTimeout(function(){
							mouseOutsideTimer = null;
							this.cancel();
						}.bind(this), 700);
					},

					onEnd: function() {
						var currentTarget = this.target;

						var index1 = currentTarget.parentList.indexOf(currentTarget.node);
						var index2 = currentTarget.parentList.indexOf(currentTarget.hoverTarget.node);

						if (index1 > index2) {
							this.dispatch(this.target.node, 'reorder', {spliceIndex:index2, insertBefore:currentTarget.parentList[index2], originalIndex: originalIndex});
						} else {
							this.dispatch(this.target.node, 'reorder', {spliceIndex:index2+1, insertBefore:currentTarget.parentList[index2+1], originalIndex: originalIndex});
						}

						this.setState(this.states.idle);
						return false;
					},
				};
			},
		},

		attach: function(container) {
			globalInstances++;
			if (this.container) this.detach();

			// In some cases taps on list elements send *only* click events and no touch events. Spotted only in Chrome 32+
			// Having event listener on body seems to solve the issue (although AFAIK may disable smooth scrolling as a side-effect)
			if (!attachedBodyHandlerHack && needsBodyHandlerHack) {
				attachedBodyHandlerHack = true;
				document.body.addEventListener('touchstart', nullHandler, false);
			}

			this.container = container;
			this.otherNodes = [];

			document.addEventListener("selectionchange", this.onSelection, false);

			// cancel is called e.g. when iOS detects multitasking gesture
			this.container.addEventListener('touchcancel', this.cancel, false);
			this.container.addEventListener('touchstart', this.onTouchStart, false);
			this.container.addEventListener('touchmove', this.onTouchMove, false);
			this.container.addEventListener('touchend', this.onTouchEnd, false);
			this.container.addEventListener('mousedown', this.onMouseDown, false);
			// mousemove and mouseup are attached dynamically
		},

		detach: function() {
			this.cancel();

			this.container.removeEventListener('mousedown', this.onMouseDown, false);
			this.container.removeEventListener('touchend', this.onTouchEnd, false);
			this.container.removeEventListener('touchmove', this.onTouchMove, false);
			this.container.removeEventListener('touchstart', this.onTouchStart, false);
			this.container.removeEventListener('touchcancel', this.cancel, false);

			document.removeEventListener("selectionchange", this.onSelection, false);

			globalInstances--;
			if (!globalInstances && attachedBodyHandlerHack) {
				attachedBodyHandlerHack = false;
				document.body.removeEventListener('touchstart', nullHandler, false);
			}
		},

		setState: function(newStateCtor){
			if (this.state) {
				if (this.state.ctor === newStateCtor) return;
				if (this.state.leaveState) this.state.leaveState.call(this);
			}

			// Must be re-entrant in case ctor changes state
			var prevState = this.state;
			var nextState = newStateCtor.call(this);
			if (this.state === prevState) {
				nextState.ctor = newStateCtor;
				this.state = nextState;
			}
		},

		findTargetNode: function(targetNode) {
			while(targetNode && targetNode.parentNode !== this.container) {
				targetNode = targetNode.parentNode;
			}
			return targetNode;
		},

		onSelection: function(e) {
			var isRelated = e.target === document || this.findTargetNode(e);
			if (!isRelated) return;

			this.selectionChanged = true;
		},

		addMouseHandlers: function() {
			// unlike touch events, mousemove/up is not conveniently fired on the same element,
			// but I don't need to listen to unrelated events all the time
			if (!this.mouseHandlersAttached) {
				this.mouseHandlersAttached = true;
				document.documentElement.addEventListener('mouseleave', this.onMouseLeave, false);
				window.addEventListener('mousemove', this.onMouseMove, true);
				window.addEventListener('mouseup', this.onMouseUp, true);
				window.addEventListener('blur', this.cancel, false);
				window.addEventListener("scroll", this.onScroll);

			}
		},

		removeMouseHandlers: function() {
			if (this.mouseHandlersAttached) {
				this.mouseHandlersAttached = false;
				document.documentElement.removeEventListener('mouseleave', this.onMouseLeave, false);
				window.removeEventListener('mousemove', this.onMouseMove, true);
				window.removeEventListener('mouseup', this.onMouseUp, true);
				window.removeEventListener('blur', this.cancel, false);
				window.removeEventListener("scroll", this.onScroll);
			}
		},

		onMouseLeave: function(e) {
			if (this.usingTouch) return;

			if (e.target === document.documentElement || e.relatedTarget === document.documentElement) {
				if (this.state.onLeave) {
					this.state.onLeave.call(this);
				}
			}
		},
		preventDragStart : function(e) {
			e.preventDefault();
			return false;
		},
		preventFocus : function(e) {
			e.stopPropagation();
			e.target.blur();
		},
		onMouseDown: function(e) {
			if (this.usingTouch || e.button != 0 || !this.setTarget(e)) return;

			document.addEventListener("dragstart", this.preventDragStart);

			this.addMouseHandlers(); // mouseup, etc.

			this.canPreventScrolling = true; // or rather it doesn't apply to mouse

			this.startAtPosition({
				x: e.clientX,
				y: e.clientY,
				time: e.timeStamp,
			});
		},

		onTouchStart: function(e) {
			this.usingTouch = true;
			this.canPreventScrolling = true;

			// This implementation cares only about single touch
			if (e.touches.length > 1) {
				this.setState(this.states.idle);
				return;
			}

			if (!this.setTarget(e)) return;

			this.startAtPosition({
				x: e.touches[0].clientX,
				y: e.touches[0].clientY,
				time: e.timeStamp,
			});
		},

		setTarget: function(e) {
			var targetNode = this.findTargetNode(e.target);
			if (!targetNode) {
				this.setState(this.states.idle);
				return false;
			}

			//check for a scrollable parent
			var scrollContainer = targetNode.parentNode;
			while (scrollContainer){
				if (scrollContainer.scrollHeight > scrollContainer.clientHeight && window.getComputedStyle(scrollContainer)['overflow-y'] != 'visible') break;
				else scrollContainer = scrollContainer.parentNode;
			}

			this.target = {
				originalTarget: e.target,
				node: targetNode,
				scrollContainer: scrollContainer,
				baseTransform: getTransform(targetNode),
			};
			return true;
		},

		startAtPosition: function(pos) {
			this.startPosition = this.previousPosition = this.latestPosition = pos;

			var targetRects = this.target.node.getBoundingClientRect();
			this.startOrigin = (this.startPosition.x - targetRects.left) + "px " + (this.startPosition.y - targetRects.top) + "px";
			var self = this;
			window.setTimeout(function() {
				self.selectionChanged = false;
			}, 5);
			this.setState(this.states.undecided);
			var scrollable = this.target.scrollContainer || document.body;
			this.scrollTopStart = scrollable.scrollTop;
			this.scrollLeftStart = scrollable.scrollLeft;
			this.scrollTopDelta = 0;
			this.scrollLeftDelta = 0;
		},

		updatePosition: function(e, pos) {
			if(this.target == null)
				return;
			this.latestPosition = pos;

			var triggerOffset = 40,
				offset = 0;

			var scrollable = this.target.scrollContainer || document.body,
				containerRect = scrollable.getBoundingClientRect(),
				targetRect = this.target.node.getBoundingClientRect(),
				bottomOffset = Math.min(containerRect.bottom, window.innerHeight) - targetRect.bottom,
				topOffset = targetRect.top - Math.max(containerRect.top, 0);

			if (bottomOffset < triggerOffset){
				offset = triggerOffset - bottomOffset;
			}
			else if (topOffset < triggerOffset){
				offset = topOffset - triggerOffset;
			}

			var prevScrollTop = scrollable.scrollTop;
//			scrollable.scrollTop += offset; // commented out, this causes issues it seems. When the editor is scrolled down, dragging a form element would cause the page to scroll to top; removing this line prevents that.
			if (prevScrollTop != scrollable.scrollTop) this.startPosition.y += prevScrollTop-scrollable.scrollTop;

			if (this.state.onMove) {
				if (this.state.onMove.call(this) === false) {
					e.preventDefault();
				}
			}

			// sample latestPosition 100ms for velocity
			if (this.latestPosition.time - this.previousPosition.time > 100) {
				this.previousPosition = this.latestPosition;
			}
		},

		onScroll : function(e) {
			var scrollable = this.target.scrollContainer || document.body;

			this.scrollTopDelta = this.scrollTopStart - scrollable.scrollTop;
			this.scrollLeftDelta = this.scrollLeftStart - scrollable.scrollLeft;

			this.updatePosition(e, this.latestPosition);
		},

		onMouseMove: function(e) {
			this.updatePosition(e, {
				x: e.clientX,
				y: e.clientY,
				time: e.timeStamp,
			});
		},

		onTouchMove: function(e) {
			this.updatePosition(e, {
				x: e.touches[0].clientX,
				y: e.touches[0].clientY,
				time: e.timeStamp,
			});

			// In Apple's touch model only the first move event after touchstart can prevent scrolling (and event.cancelable is broken)
			this.canPreventScrolling = false;
		},

		onMouseUp: function(e) {
			if (this.usingTouch || e.button !== 0) return;

			if (this.state.onEnd && false === this.state.onEnd.call(this)) {
				e.preventDefault();
			}

			document.removeEventListener("dragstart", this.preventDragStart);
			document.removeEventListener("focus", this.preventFocus, true);
		},

		onTouchEnd: function(e) {
			if (e.touches.length > 1) {
				this.cancel();
			} else if (this.state.onEnd && false === this.state.onEnd.call(this)) {
				e.preventDefault();
			}
			document.removeEventListener("focus", this.preventFocus, true);
		},

		getTotalMovement: function() {
			var scale = this.container.scale;
			if (typeof scale === "undefined") {
				scale = 1;
			}

			return {
				x:(this.latestPosition.x - this.startPosition.x - this.scrollLeftDelta)/scale,
				y:(this.latestPosition.y - this.startPosition.y - this.scrollTopDelta)/scale,
			};
		},

		getAbsoluteMovement: function() {
			var scale = this.container.scale;
			if (typeof scale === "undefined") {
				scale = 1;
			}
			return {
				x: Math.abs(this.latestPosition.x - this.startPosition.x)/scale,
				y: Math.abs(this.latestPosition.y - this.startPosition.y)/scale,
				time:this.latestPosition.time - this.startPosition.time,
			};
		},

		dispatch: function(targetNode, eventName, detail) {
			var event = document.createEvent('CustomEvent');
			if (event && event.initCustomEvent) {
				event.initCustomEvent('slip:' + eventName, true, true, detail);
			} else {
				event = document.createEvent('Event');
				event.initEvent('slip:' + eventName, true, true);
				event.detail = detail;
			}
			return targetNode.dispatchEvent(event);
		},

		getSiblings: function(target) {
			var siblings = [];
			var tmp = target.node.nextSibling;
			while(tmp) {
				if (tmp.nodeType == 1) siblings.push({
					node: tmp,
					baseTransform: getTransform(tmp),
				});
				tmp = tmp.nextSibling;
			}
			return siblings;
		},

		animateToZero: function(callback, target) {
			// save, because this.target/container could change during animation
			target = target || this.target;

			target.node.style[transitionPrefix] = transformProperty + ' 0.1s ease-out';
			target.node.style[transformPrefix] = 'translate(0,0) ' + hwLayerMagic + target.baseTransform.value;
			setTimeout(function(){
				target.node.style[transitionPrefix] = '';
				target.node.style[transformPrefix] = target.baseTransform.original;
				if (callback) callback.call(this, target);
			}.bind(this), 101);
		},

		animateSwipe: function(callback) {
			var target = this.target;
			var siblings = this.getSiblings(target);
			var emptySpaceTransform = 'translate(0,' + this.target.height + 'px) ' + hwLayerMagic + ' ';

			// FIXME: animate with real velocity
			target.node.style[transitionPrefix] = 'all 0.1s linear';
			target.node.style[transformPrefix] = ' translate(' + (this.getTotalMovement().x > 0 ? '' : '-') + '100%,0) ' + hwLayerMagic + target.baseTransform.value;

			setTimeout(function(){
				if (callback.call(this, target)) {
					siblings.forEach(function(o){
						o.node.style[transitionPrefix] = '';
						o.node.style[transformPrefix] = emptySpaceTransform + o.baseTransform.value;
					});
					setTimeout(function(){
						siblings.forEach(function(o){
							o.node.style[transitionPrefix] = transformProperty + ' 0.1s ease-in-out';
							o.node.style[transformPrefix] = 'translate(0,0) ' + hwLayerMagic + o.baseTransform.value;
						});
						setTimeout(function(){
							siblings.forEach(function(o){
								o.node.style[transitionPrefix] = '';
								o.node.style[transformPrefix] = o.baseTransform.original;
							});
						},101);
					}, 1);
				}
			}.bind(this), 101);
		},
	};

	// AMD
	if ('function' === typeof define && define.amd) {
		define(function(){
			return Slip;
		});
	}
	return Slip;
})();