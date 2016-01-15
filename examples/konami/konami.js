/*
 * Konami-JS ~ 
 * :: Now with support for touch events and multiple instances for 
 * :: those situations that call for multiple easter eggs!
 * Code: http://konami-js.googlecode.com/
 * Examples: http://www.snaptortoise.com/konami-js
 * Copyright (c) 2009 George Mandis (georgemandis.com, snaptortoise.com)
 * Version: 1.4.2 (9/2/2013)
 * Licensed under the MIT License (http://opensource.org/licenses/MIT)
 * Tested in: Safari 4+, Google Chrome 4+, Firefox 3+, IE7+, Mobile Safari 2.2.1 and Dolphin Browser
 */

var Konami = function (callback) {
	var konami = {
		load: function (link) {
			this.iphone.load(link);
		},
		code: function (link) {
			window.location = link;
		},
		iphone: {
			start_x: 0,
			start_y: 0,
			stop_x: 0,
			stop_y: 0,
			tap: false,
			double: false,
			orig_keys: "",
			keys: [
				["DOUBLEDOWN", "DOUBLELEFT"],
				["DOUBLEDOWN", "DOUBLERIGHT"],
				["DOWN", "DOWN", "LEFT", "LEFT"],
				["DOWN", "DOWN", "RIGHT", "RIGHT"],
			],
			code: function (link) {
				konami.code(link);
			},
			load: function (link) {
				this.orig_keys = this.keys;
				document.addEventListener("touchmove", function (evt) {
					if (evt.touches.length == 2) {
						touch = evt.touches[1];
						konami.iphone.double = true;
					} else if (evt.touches.length == 1) {
						touch = evt.touches[0];
						konami.iphone.double = false;
					}
					konami.iphone.stop_x = touch.pageX;
					konami.iphone.stop_y = touch.pageY;
					konami.iphone.tap = false;
				});
				document.addEventListener("touchend", function (evt) {
					konami.iphone.check_direction();
				}, false);
				document.addEventListener("touchcancel", function (evt) {
					konami.iphone.check_direction();
				}, false);
				document.addEventListener("touchstart", function (evt) {
					konami.iphone.start_x = evt.changedTouches[0].pageX;
					konami.iphone.start_y = evt.changedTouches[0].pageY;
					konami.iphone.tap = true;
				});
			},
			check_direction: function (link) {
				x_magnitude = Math.abs(this.start_x - this.stop_x);
				y_magnitude = Math.abs(this.start_y - this.stop_y);
				x = ((this.start_x - this.stop_x) < 0) ? "RIGHT" : "LEFT";
				y = ((this.start_y - this.stop_y) < 0) ? "DOWN" : "UP";
				result = (x_magnitude > y_magnitude) ? x : y;
				result = (this.tap === true) ? "TAP" : result;
				if (this.double) {
					result = "DOUBLE" + result;
				}
				for (var i=0; i<this.keys.length; i++) {
					if (result == this.keys[i][0]) this.keys[i] = this.keys[i].slice(1, this.keys[i].length);
					if (this.keys[i].length === 0) {
						this.keys = this.orig_keys;
						this.code(link);
					}
				}
			}
		}
	};

	if (typeof callback === "string") {
		konami.load(callback);
	}
	if (typeof callback === "function") {
		konami.code = callback;
		konami.load();
	}

	return konami;
};