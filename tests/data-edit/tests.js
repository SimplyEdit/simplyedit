QUnit.config.autostart = false;
QUnit.config.reorder = false;

localStorage.storageKey = "demo";

document.location.hash = "#simply-edit";

var checkEditor = function() {
	if (typeof editor != "undefined" && editor && editor.plugins && editor.plugins.text) {
		editor.storage.key = "demo";
		QUnit.start();
	} else {
		// console.log('waiting for editor');
		window.setTimeout(checkEditor, 300);
	}
};

checkEditor();

function setCaretPosition(elem, start, length) {
	var range = document.createRange();

	var targetNode = elem.childNodes[0];
	if (typeof targetNode === "undefined") {
		targetNode = elem;
	}
	range.setStart(targetNode, start);
	if (length) {
		range.setEnd(targetNode, start + length);
	}

	var sel = window.getSelection();
	sel.removeAllRanges();
	sel.addRange(range);
	if (focus in elem) {
		elem.focus();
	}
	var newRange = sel.getRangeAt(0);
	editor.context.skipUpdate = false;
	editor.context.update();
}
function selectImage(img) {
	var range = document.createRange();
	range.selectNode(img);

	var sel = window.getSelection();
	sel.removeAllRanges();
	sel.addRange(range);
	if (focus in img) {
		img.focus();
	}
	editor.context.skipUpdate = false;
	editor.context.update();
}

function setSelectionEnd(elem, offset) {
	var range = window.getSelection().getRangeAt(0);
	range.setEnd(elem, offset);
	var sel = window.getSelection();

	sel.removeAllRanges();
	sel.addRange(range);
	if (focus in elem) {
		elem.focus();
	}
	editor.context.skipUpdate = false;
	editor.context.update();
}

var simulateClick = function(target, offsetTop, offsetLeft) {
	window.scrollTo(0,0);
	var rect = target.getBoundingClientRect();
	if (typeof offsetTop === "undefined") {
		offsetTop = 0;
	}
	if (typeof offsetLeft === "undefined") {
		offsetLeft = 0;
	}
	var targetTop = parseInt(rect.top) + parseInt(offsetTop);
	var targetLeft = parseInt(rect.left) + parseInt(offsetLeft);
	
	var targetEl = document.elementFromPoint(targetLeft, targetTop);
	while (targetEl === null) {
		// Sometimes the point we want to click on is not in view; scroll the page until it is.
		window.scrollBy(0, 10);
		targetEl = document.elementFromPoint(targetLeft, targetTop - window.pageYOffset);
	}

	var evt = mouseEvent("mousedown", targetLeft, targetTop, targetLeft, targetTop);
	dispatchEvent(targetEl, evt);
	evt = mouseEvent("click", targetLeft, targetTop, targetLeft, targetTop);
	dispatchEvent(targetEl, evt);
	evt = mouseEvent("mouseup", targetLeft, targetTop, targetLeft, targetTop);
	dispatchEvent(targetEl, evt);
	targetEl.focus();

	var div = document.createElement("DIV");
	div.setAttribute("id", "clickShim");
	div.style.position = "absolute";
	div.style.backgroundColor = "red";
	div.style.height = "5px";
	div.style.width = "5px";
	div.style.top = targetTop + "px";
	div.style.left = targetLeft + "px";
	document.body.appendChild(div);
	window.setTimeout(function() {
		document.body.removeChild(document.getElementById("clickShim"));
	}, 500);
};

function mouseEvent(type, sx, sy, cx, cy) {
	var evt;
	var e = {
		bubbles: true,
		cancelable: (type != "mousemove"),
		view: window,
		detail: 0,
		screenX: sx, 
		screenY: sy,
		clientX: cx, 
		clientY: cy,
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		metaKey: false,
		button: 0,
		relatedTarget: undefined
	};
	if (typeof( document.createEvent ) == "function") {
		evt = document.createEvent("MouseEvents");
		evt.initMouseEvent(type, 
			e.bubbles, e.cancelable, e.view, e.detail,
			e.screenX, e.screenY, e.clientX, e.clientY,
			e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
			e.button, document.body.parentNode);
	} else if (document.createEventObject) {
		evt = document.createEventObject();
		for (var prop in e) {
		evt[prop] = e[prop];
	}
		evt.button = { 0:1, 1:4, 2:2 }[evt.button] || evt.button;
	}
	return evt;
}
function dispatchEvent (el, evt) {
	if (el.dispatchEvent) {
		el.dispatchEvent(evt);
	} else if (el.fireEvent) {
		el.fireEvent('on' + evt.type, evt);
	}
	return evt;
}

function simulateKeyDown(el, k) {
	oEvent = document.createEvent('Event');
	oEvent.initEvent('keydown', true, false);
	oEvent.keyCode = k;
	oEvent.which = k;
	dispatchEvent(el, oEvent);
}
function simulateKeyUp(el, k) {
	oEvent = document.createEvent('Event');
	oEvent.initEvent('keyup', true, false);
	oEvent.keyCode = k;
	oEvent.which = k;
	dispatchEvent(el, oEvent);
}

QUnit.module("editor init");
	QUnit.test("editmode init", function(assert) {
		assert.ok(vdSelectionState, "vdSelectionState initialized");
	});

QUnit.module("legacy selection bevahiour");
	QUnit.test("getNode returns input", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<input type='text' value='foo'>";
		var inputNode = testContent.querySelector("input");

		inputNode.focus();
		var selectionNode = vdSelection.getNode(vdSelectionState.get());
		assert.equal(selectionNode, inputNode, "input node is returned by getNode");
	});

QUnit.module("hope editor behaviour");
	QUnit.test("seperate p stay seperated", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello</p><p>world</p>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		assert.equal(testContent.innerHTML, "<p>Hello</p><p>world</p>", "innerHTML did not change");
	});

	QUnit.test("seperate br stay seperated", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello<br><br>world</p>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		assert.equal(testContent.innerHTML, "<p>Hello<br><br>world</p>", "innerHTML did not change");
	});

	QUnit.test("seperate hr stay seperated", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "hello<hr><hr>world";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		assert.equal(testContent.innerHTML, "hello<hr><hr>world", "innerHTML did not change");
	});

	QUnit.test("seperate hr stay seperated", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>hello</p><hr><hr><p>world</p>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		assert.equal(testContent.innerHTML, "<p>hello</p><hr><hr><p>world</p>", "innerHTML did not change");
	});

	QUnit.test("seperate divs stay seperated", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "hello<div></div><div></div>world";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		assert.equal(testContent.innerHTML, "hello<div></div><div></div>world", "innerHTML did not change");
	});
	QUnit.test("strong tag doesnt get extra p tags", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<strong>llo</strong> world</p>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		setCaretPosition(testContent.querySelector("p"), 1, 0);
		assert.equal(testContent.innerHTML, "<p>He<strong>llo</strong> world</p>", "innerHTML did not change");
	});

	QUnit.test("code tag is not removed from div tag", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<div>test1</div><div><code>Hello</code></div>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		setCaretPosition(testContent.querySelector("div"), 1, 0);
		assert.equal(testContent.innerHTML, "<div>test1</div><div><code>Hello</code></div>", "innerHTML did not change");
	});

	QUnit.test("unnumbered list, li is rendered", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<ul><li>test1</li><li>test2</li></ul>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		assert.equal(testContent.innerHTML, "<ul><li>test1</li><li>test2</li></ul>", "innerHTML did not change");
	});

	QUnit.test("unnumbered list, strong in li is rendered", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<ul><li><strong>test1</strong></li><li>test2</li></ul>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		assert.equal(testContent.innerHTML, "<ul><li><strong>test1</strong></li><li>test2</li></ul>", "innerHTML did not change");
	});
	QUnit.test("unnumbered list, empty <i> tag in li", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<ul>' + "\n" + '<li><i class="fa"></i>Hello</li><li>world</li></ul>';
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();

		// replace the newline - phantomJS removes it from between the ul and the li;
		assert.equal(testContent.innerHTML.replace(/\n/g, ''), '<ul><li><i class="fa"></i>Hello</li><li>world</li></ul>', "innerHTML did not change");
	});
	QUnit.test("unnumbered list, nonempty <i> tag in li", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<ul><li><i class="fa">X</i>Hello</li><li>world</li></ul>';
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		assert.equal(testContent.innerHTML, '<ul><li><i class="fa">X</i>Hello</li><li>world</li></ul>', "innerHTML did not change");
	});

	QUnit.test("footer HTML element works", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<footer>Hello world</footer>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		assert.equal(testContent.innerHTML, "<footer>Hello world</footer>", "innerHTML did not change");
	});

	QUnit.test("unknown elements works", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<gobblefoo>Hello <gobblebar>world</gobblebar></gobblefoo>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		assert.equal(testContent.innerHTML, "<gobblefoo>Hello <gobblebar>world</gobblebar></gobblefoo>", "innerHTML did not change");
	});

	QUnit.test("parseHTML leaves caret where it was", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "abcdef<p><br></p>";
		setCaretPosition(testContent.querySelector("p"), 0, 0);
		var node1 = window.getSelection().focusNode;
		testContent.hopeEditor.parseHTML();
		var node2 = window.getSelection().focusNode;
		assert.equal(node1, node2);
	});

	QUnit.test("offset calculation works for nested items, paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "		<div>		<p>abcdef</p>		</div>		";
		setCaretPosition(testContent.querySelector("p"), 2, 0);
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		testContent.hopeEditor.selection.updateRange();

		var annotation = testContent.hopeEditor.fragment.has(hopeEditor.currentRange, "p");
		assert.equal(annotation.tag.split(" ")[0], 'p');
	});

	QUnit.test("offset calculation works for nested items with image", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "		<div>		<img src='frop'>		</div>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		selectImage(testContent.querySelector("img"));
		editor.context.update();
		testContent.hopeEditor.selection.updateRange();

		var annotation = testContent.hopeEditor.fragment.has(hopeEditor.currentRange, "img");
		assert.equal(annotation.tag.split(" ")[0], 'img');
	});

	QUnit.test("offset calculation works for nested items, image and characters", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "		<div>		a	b<img src='frop'>		</div>";
		setCaretPosition(testContent.querySelector("div"), 2, 0);
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		selectImage(testContent.querySelector("img"));
		editor.context.update();
		testContent.hopeEditor.selection.updateRange();

		var annotation = testContent.hopeEditor.fragment.has(hopeEditor.currentRange, "img");
		assert.equal(annotation.tag.split(" ")[0], 'img');
	});

	QUnit.test("offset calculation works for nested items, less tabs", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "		<div>abc<img src='frop'>		</div>";
		setCaretPosition(testContent.querySelector("div"), 2, 0);
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		editor.context.update();
		testContent.hopeEditor.selection.updateRange();
		var annotation = testContent.hopeEditor.fragment.has(hopeEditor.currentRange, "div");
		assert.equal(annotation.tag.split(" ")[0], 'div');
	});

	QUnit.test("offset calculation works for nested items", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "		<div>ab<img src='frop'>		</div>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		editor.context.update();
		setCaretPosition(testContent.querySelector("div"), 2, 0);
		testContent.hopeEditor.selection.updateRange();
		var img = testContent.hopeEditor.fragment.has(hopeEditor.currentRange, "img");
		assert.equal(img.tag, 'img src="frop"');
	});

	QUnit.test("offset calculation works for nested items, tabs and image", function(assert) {
		var testContent = document.querySelector("#testContent");
		// testContent.style.whiteSpace = "pre";
		testContent.innerHTML = "		<div>		<img src='frop'>		</div>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		selectImage(testContent.querySelector("img"));
		editor.context.update();
		testContent.hopeEditor.selection.updateRange();

		var img = testContent.hopeEditor.fragment.has(hopeEditor.currentRange, "img");
		assert.equal(img.tag, 'img src="frop"');
	});
	QUnit.test("offset calculation works for nested items spaces", function(assert) {
		var testContent = document.querySelector("#testContent");
		//testContent.style.whiteSpace = "pre";
		testContent.innerHTML = "  <div>  <img src='frop'>  </div>";
		setCaretPosition(testContent.querySelector("div"), 2, 0);
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		editor.context.update();
		testContent.hopeEditor.selection.updateRange();
		var img = testContent.hopeEditor.fragment.has(hopeEditor.currentRange, "img");
		assert.equal(img.tag, 'img src="frop"');
	});

	QUnit.test("offset calculation works for nested items, image and tabs", function(assert) {
		var testContent = document.querySelector("#testContent");
		//testContent.style.whiteSpace = "pre";
		testContent.innerHTML = "		<div>		<img src='frop'>		</div>";
		setCaretPosition(testContent.querySelector("div"), 1, 1);
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		editor.context.update();
		testContent.hopeEditor.selection.updateRange();
		var annotation = testContent.hopeEditor.fragment.has(hopeEditor.currentRange, "div");
		assert.equal(annotation.tag.split(" ")[0], 'div');
	});



	QUnit.test("offset calculation works for nested items, char before img", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "		<div>		a<img src='frop'>		</div>";
		setCaretPosition(testContent.querySelector("div"), 2, 0);
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		editor.context.update();
		testContent.hopeEditor.selection.updateRange();
		var annotation = testContent.hopeEditor.fragment.has(hopeEditor.currentRange, "div");
		assert.equal(annotation.tag.split(" ")[0], 'div');
	});

	QUnit.test("offset calculation with multiple text nodes", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h1>Hel<img src='frop'>lo wo<img src='frop'>rld.</h1>";
		setCaretPosition(testContent.querySelector("h1").childNodes[4], 2, 0);
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		editor.context.update();
		testContent.hopeEditor.selection.updateRange();
		assert.equal(testContent.hopeEditor.currentRange.start, 12);
	});

	QUnit.test("caret offset calculation with multiple text nodes", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h1>Hel<img src='frop'>lo wo<img src='frop'>rld.</h1>";
		setCaretPosition(testContent.querySelector("h1").childNodes[4], 2, 0);
		testContent.hopeEditor.parseHTML();
		editor.context.update();
		testContent.hopeEditor.selection.updateRange();
		assert.equal(testContent.hopeEditor.getCaretOffset(testContent.querySelector("h1")), 12);
	});

	QUnit.test("caret offset calculation with multiple text nodes", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h1 data-hope-caret=12>Hel<img src='frop'>lo wo<img src='frop'>rld.</h1>";
		testContent.hopeEditor.parseHTML();
		editor.context.update();
		testContent.hopeEditor.selection.updateRange();
		var range = testContent.hopeEditor.setCaretOffset(testContent.querySelector("h1"));
		if (range) {
			var htmlSelection = window.getSelection();
			htmlSelection.removeAllRanges();
			htmlSelection.addRange(range);
		}

		assert.equal(testContent.hopeEditor.getCaretOffset(testContent.querySelector("h1")), 12);
	});

	QUnit.test("allow block elements in list item", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<ul><li><h2>Hello</h2><div>World</div></li></ul>';
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		assert.equal(testContent.innerHTML, '<ul><li><h2>Hello</h2><div>World</div></li></ul>');
	});

	QUnit.test("render spaces as spaces, not nbsp", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<span>a  b</span>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		assert.equal(testContent.innerHTML, '<span>a  b</span>');
	});

	QUnit.test("caret attribute does not repeat", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h1>Hello world</h1>";
		setCaretPosition(testContent.querySelector("h1"), 5);
		editor.actions['simply-insert-source']();
		editor.toolbarsContainer.getElementById('insertHTMLSource').value = "<ul><li>1</li><li>2</li></ul>";
		editor.actions['simply-htmlsource-insert']();
		var carets = testContent.querySelectorAll("[data-hope-caret]");
		assert.equal(carets.length, 0, "zero caret attributes attributes found");
	});

	QUnit.test("do return elements that end on the edge of a caret without selection at the start of another element", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<a>Hello</a><p>world</p>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		setCaretPosition(testContent.querySelector("p"), 0, 0);
		var range = hopeEditor.selection.getRange();
		var annotation = hopeEditor.fragment.has(range, "a");

		assert.equal(annotation.tag, "a");
		assert.equal(annotation.range.start, 0);
		assert.equal(annotation.range.end, 5);
	});

	QUnit.test("do return elements that end on the edge of a caret without selection at the start of another element", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<a>Hello</a><p>world</p>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		setCaretPosition(testContent.querySelector("a"), 5, 0);
		var range = hopeEditor.selection.getRange();
		var annotation = hopeEditor.fragment.has(range, "p");

		assert.equal(annotation.tag, "p");
		assert.equal(annotation.range.start, 5);
		assert.equal(annotation.range.end, 10);
	});

	QUnit.test("do not return elements that end on the edge of a selection at the end of another element", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<a>Hello</a><p>world</p>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		setCaretPosition(testContent.querySelector("p"), 0, 3);

		var range = hopeEditor.selection.getRange();
		var annotation = hopeEditor.fragment.has(range, "a");
		assert.notOk(annotation);
	});

	QUnit.test("do not return elements that end on the edge of a selection at the end of another element", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<a>Hello</a><p>world</p>";
		testContent.hopeEditor.parseHTML();
		testContent.hopeEditor.update();
		setCaretPosition(testContent.querySelector("a"), 2, 3);

		var range = hopeEditor.selection.getRange();
		var annotation = hopeEditor.fragment.has(range, "p");
		assert.notOk(annotation);
	});

	
QUnit.module("editor context");
	QUnit.test("text context", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();
		setCaretPosition(testContent, 2, 0);
		var context = editor.context.get();
		assert.equal(context, "simply-text-cursor");
	});

	QUnit.test("text context", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();
		setCaretPosition(testContent, 2, 3);
		var context = editor.context.get();
		assert.equal(context, "simply-text-selection");
	});

QUnit.module("editor text cursor");
	QUnit.test("text plugin loaded", function(assert) {
		assert.ok(editor.plugins.text);
	});

	QUnit.test("text set align right within paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		var button = editor.toolbarsContainer.querySelector("button[data-value='simply-text-align-right']");
		editor.actions[button.getAttribute("data-simply-action")](button);

		assert.equal(testContent.innerHTML, '<p class="simply-text-align-right">Hello world</p>', "Found align class");
	});

	QUnit.test("text set align from right to left within paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<p class="simply-text-align-right">Hello world</p>';
		testContent.hopeEditor.parseHTML();
		
		setCaretPosition(testContent.querySelector("p"), 2, 0);
		var button = editor.toolbarsContainer.querySelector("button[data-value='simply-text-align-left']");
		editor.actions[button.getAttribute("data-simply-action")](button);

		assert.equal(testContent.innerHTML, '<p class="simply-text-align-left">Hello world</p>', "Found align class");
	});

	QUnit.test("text set align from right to none within paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<p class="simply-text-align-right">Hello world</p>';
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("p"), 2, 0);

		var button = editor.toolbarsContainer.querySelector("#simply-text-cursor div.simply-text-align button[data-value='none']");
		editor.actions[button.getAttribute("data-simply-action")](button);

		assert.equal(testContent.innerHTML, '<p>Hello world</p>', "Found align class");
	});
	QUnit.test("text set align from center to justify within paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<p class="simply-text-align-center">Hello world</p>';
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		var button = editor.toolbarsContainer.querySelector("button[data-value='simply-text-align-justify']");
		editor.actions[button.getAttribute("data-simply-action")](button);

		assert.equal(testContent.innerHTML, '<p class="simply-text-align-justify">Hello world</p>', "Found align class");
	});
	QUnit.test("text style init paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		var currentStyle = editor.toolbarsContainer.querySelector("#simply-text-cursor select[data-simply-action='simply-text-blockstyle']").value;
		assert.equal(currentStyle, "p", "text style is correctly updated");
	});
	QUnit.test("text style init h2", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h2>Hello world</h2>";
		testContent.hopeEditor.parseHTML();
		setCaretPosition(testContent.querySelector("h2"), 3, 0);
		var currentStyle = editor.toolbarsContainer.querySelector("#simply-text-cursor select[data-simply-action='simply-text-blockstyle']").value;
		assert.equal(currentStyle, "h2", "text style is correctly updated");
	});

	QUnit.test("text style set h2 to h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h2>Hello world</h2>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("h2"), 2, 0);

		editor.actions['simply-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<h1>Hello world</h1>');
	});

	QUnit.test("text style set h2 with one class to h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<h2 class="hello">Hello world</h2>';
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("h2"), 2, 0);

		editor.actions['simply-text-blockstyle']('h1');

		assert.equal(testContent.innerHTML, '<h1 class="hello">Hello world</h1>');
	});

	QUnit.test("text style set h2 with multiple classes to h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<h2 class="hello world class">Hello world</h2>';
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("h2"), 2, 0);

		editor.actions['simply-text-blockstyle']('h1');

		testContent.hopeEditor.update();
		assert.equal(testContent.innerHTML, '<h1 class="hello world class">Hello world</h1>');
	});

	QUnit.test("text style set h2 with anchor to h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<h2><a name="title">Hello world</a></h2>';
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("a"), 2, 0);
		editor.actions['simply-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<h1><a name="title">Hello world</a></h1>');
	});

	QUnit.test("text style unset to h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent, 2, 0);
		editor.actions['simply-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<h1>Hello world</h1>');
	});

	QUnit.test("text in section style set h2 to h1", function(assert) {
		var testContent = document.querySelector("#testSection");
		testContent.innerHTML = "<h2>Hello world</h2>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("h2"), 2, 0);
		editor.actions['simply-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<h1>Hello world</h1>');
	});

	QUnit.test("text style unset to unnumbered list", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent, 2, 0);
		editor.actions['simply-text-blockstyle']('ul');
		assert.equal(testContent.innerHTML, '<ul><li>Hello world</li></ul>');
	});

	QUnit.test("text style unnumbered list to unset", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<ul><li>Hello world</li></ul>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("li"), 2, 0);
		editor.actions['simply-text-blockstyle']('');
		assert.equal(testContent.innerHTML, 'Hello world');
	});

	QUnit.test("text style unnumbered list to paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<ul><li>Hello world</li></ul>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("li"), 2, 0);
		editor.actions['simply-text-blockstyle']('p');
		assert.equal(testContent.innerHTML, '<p>Hello world</p>');
	});

	QUnit.test("text style unnumbered list 3 list items, one to paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<ul><li>foo</li><li>Hello world</li><li>bar</li></ul>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelectorAll("li")[1], 2, 0);
		editor.actions['simply-text-blockstyle']('p');
		assert.equal(testContent.innerHTML, '<ul><li>foo</li></ul><p>Hello world</p><ul><li>bar</li></ul>');
	});

	QUnit.test("text style unnumbered list to numbered list", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<ul><li>foo</li><li>Hello world</li><li>bar</li></ul>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelectorAll("li")[1], 2, 0);
		editor.actions['simply-text-blockstyle']('ol');
		assert.equal(testContent.innerHTML, '<ol><li>foo</li><li>Hello world</li><li>bar</li></ol>');
	});

	QUnit.test("text split clean text to two lines", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent, 5, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, '<p>Hello</p><p>&nbsp;world</p>');
			done1();
		}, 100);
	});

	QUnit.test("text split paragraph to two lines", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent, 0, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, '<p><br></p><p>Hello world</p>');
			done1();
		}, 100);
	});
	QUnit.test("text split clean text to two lines", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent, 11, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, '<p>Hello world</p><p><br></p>');
			done1();
		}, 100);
	});

	QUnit.test("text split text within inline element to two lines", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<strong>Hello world</strong>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("strong"), 6, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, '<p><strong>Hello&nbsp;</strong></p><p><strong>world</strong></p>');
			done1();
		}, 100);
	});

	QUnit.test("text split text within inline element at end to two lines", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<strong>Hello world</strong>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("strong"), 11, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, '<p><strong>Hello world</strong></p><p><strong><br></strong></p>');
			done1();
		}, 100);
	});

	QUnit.test("text split text within inline element within paragraph to two lines", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p><strong>Hello world</strong></p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("strong"), 6, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, '<p><strong>Hello&nbsp;</strong></p><p><strong>world</strong></p>');
			done1();
		}, 100);
	});

	QUnit.test("text split text within inline element followed by paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<strong>Hello</strong><p><strong>world</strong></p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("strong"), 3, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, '<p><strong>Hel</strong></p><p><strong>lo</strong></p><p><strong>world</strong></p>');
			done1();
		}, 100);
	});

	QUnit.test("text split h1 to two lines", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h1>Hello world</h1>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("h1"), 5, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			// because H1 should only occur once on each level
			assert.equal(testContent.innerHTML, '<h1>Hello</h1><p>&nbsp;world</p>');
			done1();
		}, 100);
	});

	QUnit.test("text press return at end of h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h1>Hello world</h1>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("h1"), 11, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, '<h1>Hello world</h1><p><br></p>');
			done1();
		}, 100);
	});

	QUnit.test("text split h2 to two lines", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h2>Hello world</h2>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("h2"), 5, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, '<h2>Hello</h2><h2>&nbsp;world</h2>');
			done1();
		}, 100);
	});

	QUnit.test("text press return at end of h2", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h2>Hello world</h2>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("h2"), 11, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, '<h2>Hello world</h2><p><br></p>');
			done1();
		}, 100);
	});

	QUnit.test("text press return at end of h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h1 style='display: inline;'>Hello world</h1>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("h1"), 11, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, '<h1 style="display: inline;">Hello world</h1><p><br></p>');
			done1();
		}, 100);
	});

	QUnit.test("text press return at end of text nodes and inline tag", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello <em>little</em> world";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("em"), 3, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, '<p>Hello <em>lit</em></p><p><em>tle</em> world</p>');
			done1();
		}, 100);
	});

	QUnit.test("text press return at end of text nodes and inline tag in paragraph field", function(assert) {
		var testContent = document.querySelector("#testParagraph");
		testContent.innerHTML = "Hello <em>little</em> world";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("em"), 3, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, 'Hello <em>lit</em><br><em>tle</em> world');
			done1();
		}, 100);
	});

	QUnit.test("text press return in text node in header field", function(assert) {
		var testContent = document.querySelector("#testHeader");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent, 5, 0);
		simulateKeyDown(testContent, 13);
		document.execCommand('insertParagraph',false);
		simulateKeyUp(testContent, 13);
		var done1 = assert.async();
		setTimeout(function() {
			assert.equal(testContent.innerHTML, 'Hello<br>&nbsp;world');
			done1();
		}, 100);
	});


QUnit.module("editor text selection");
	QUnit.test("text set bold", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent, 2, 3);
		editor.actions['simply-text-bold']();

		assert.equal(testContent.innerHTML, 'He<strong>llo</strong> world', "Bold uses STRONG tag");
	});

	QUnit.test("text set bold in paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("p"), 2, 3);
		editor.actions['simply-text-bold']();

		assert.equal(testContent.innerHTML, '<p>He<strong>llo</strong> world</p>', "Bold uses STRONG tag");
	});

	QUnit.test("text style unset bold", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<strong>llo</strong> world</p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("strong"), 0, 3);
		editor.actions['simply-text-bold']();

		assert.equal(testContent.innerHTML, '<p>Hello world</p>', "STRONG tag removed");
	});

	QUnit.test("text set italic", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent, 2, 3);
		editor.actions['simply-text-italic']();

		assert.equal(testContent.innerHTML, 'He<em>llo</em> world', "Italic uses EM tag");
	});

	QUnit.test("text set italic after empty element", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "He<em></em>llo world";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.childNodes[2], 4, 3);
		editor.actions['simply-text-italic']();

		assert.equal(testContent.innerHTML, 'He<em></em>llo <em>wor</em>ld', "Italic uses EM tag");
	});


	QUnit.test("text set italic in paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("p"), 2, 3);
		editor.actions['simply-text-italic']();

		assert.equal(testContent.innerHTML, '<p>He<em>llo</em> world</p>', "Italic uses EM tag");
	});
	
	QUnit.test("text set h1 in paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("p"), 2, 3);
		editor.actions['simply-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<p>He</p><h1>llo</h1><p> world</p>', "Selection blockstyle creates block");
	});

	QUnit.test("text set h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent, 2, 3);
		editor.actions['simply-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, 'He<h1>llo</h1> world', "Selection blockstyle creates block");
	});

	QUnit.test("text style init italic", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<em>llo there</em> world</p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("em"), 0, 3);
		var targetButton = editor.toolbarsContainer.querySelector("#simply-text-selection button[data-simply-action='simply-text-inline'][data-value='em']");

		assert.ok(targetButton.classList.contains("simply-selected"), "text style is correctly updated");
	});

	QUnit.test("text style unset italic", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<em>llo there</em> world</p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("em"), 0, 9);
		editor.actions['simply-text-italic']();

		assert.equal(testContent.innerHTML, '<p>Hello there world</p>', "EM tag removed");
	});

	QUnit.test("text style init italic", function(assert) {
	// FIXME: In IE, als je klikt aan het begin van de <em> en dan naar rechts selecteerd is italic niet actief; Oorzaak is dat de range dan voor de <em> ligt in plaats van er binnen.
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<em>llo wor</em>ld</p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("em"), 1, 2);
		// setSelectionEnd(testContent.querySelector("em"),1);

		var targetButton = editor.toolbarsContainer.querySelector("#simply-text-selection button[data-simply-action='simply-text-inline'][data-value='em']");
		assert.ok(targetButton.classList.contains("simply-selected"), "text style is correctly updated");
	});

	QUnit.test("block style over multiple blocks", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello</p><p>world</p><p>Is it big out there?</p>";
		testContent.hopeEditor.parseHTML();
		setCaretPosition(testContent.querySelector("p"), 2);

		setSelectionEnd(testContent.querySelectorAll("p")[2].childNodes[0],5);

		editor.actions['simply-text-blockstyle']('h1');

		assert.equal(testContent.innerHTML, '<p>He</p><h1>llo</h1><h1>world</h1><h1>Is it</h1><p> big out there?</p>');
	});

	QUnit.test("block style over multiple blocks", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello</p>world<p>Is it still big out there?</p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("p"), 2);
		setSelectionEnd(testContent.querySelectorAll("p")[1].childNodes[0],5);
		editor.actions['simply-text-blockstyle']('h1');

		assert.equal(testContent.innerHTML, '<p>He</p><h1>llo</h1><h1>world</h1><h1>Is it</h1><p> still big out there?</p>');
	});

	QUnit.test("strong within multiple list items", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<ul><li>Hello</li><li>world</li></ul>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("li"), 0);
		setSelectionEnd(testContent.querySelectorAll("li")[1].childNodes[0],3);

		editor.actions['simply-text-bold']();

		assert.equal(testContent.innerHTML, '<ul><li><strong>Hello</strong></li><li><strong>wor</strong>ld</li></ul>');
	});

	QUnit.test("converting to unnumbered list adds list item", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("p"), 1,4);
		editor.actions['simply-text-blockstyle']('ul');
		assert.equal(testContent.innerHTML, "<p>H</p><ul><li><p>ello</p></li></ul><p> world</p>");
	});

	QUnit.test("converting to unnumbered list adds list item", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent, 1,4);
		editor.actions['simply-text-blockstyle']('ul');
		assert.equal(testContent.innerHTML, "H<ul><li>ello</li></ul> world");
	});

	QUnit.test("converting h2 to h3 on same line", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h2>Foo</h2><p>bar</p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent, 0, 0);
		editor.actions['simply-text-blockstyle']('h3');
		assert.equal(testContent.innerHTML, "<h3>Foo</h3><p>bar</p>");
	});

	QUnit.test("converting multiple unnumbered list items to paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<ul><li>foo</li><li>bar</li></ul>";
		testContent.hopeEditor.parseHTML();
		setCaretPosition(testContent.querySelector('li').childNodes[0], 0);
		setSelectionEnd(testContent.querySelector('li+li').childNodes[0], 3);

		editor.actions['simply-text-blockstyle']('p');
		assert.equal(testContent.innerHTML, "<p>foo</p><p>bar</p>");
	});

QUnit.module("custom text settings");
	QUnit.test("settings without p don't break", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world<p>";
		testContent.hopeEditor.parseHTML();
		var textSettings={
			'block': [
				{tag: 'h1', name: 'Heading 1'},
				{tag: 'h2', name: 'Test'}
			]
		};
		editor.toolbars['simply-text-cursor'].init(textSettings);
		editor.toolbars['simply-text-selection'].init(textSettings);

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		var currentStyle = editor.toolbarsContainer.querySelector("#simply-text-cursor select[data-simply-action='simply-text-blockstyle']").value;
		assert.equal(currentStyle, '');
	});

	QUnit.test("blockquote setting is found and selected", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<blockquote>Hello world<blockquote>";
		testContent.hopeEditor.parseHTML();
		var textSettings={
			'block': [
				{tag: 'h1', name: 'Heading 1'},
				{tag: 'blockquote', name: 'Blockquote'}
			]
		};
		editor.toolbars['simply-text-cursor'].init(textSettings);
		editor.toolbars['simply-text-selection'].init(textSettings);

		setCaretPosition(testContent.querySelector("blockquote"), 2, 0);
		var currentStyle = editor.toolbarsContainer.querySelector("#simply-text-cursor select[data-simply-action='simply-text-blockstyle']").value;
		assert.equal(currentStyle, 'blockquote');
	});
	QUnit.test("deprecated class config still works", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p class='red highlight'>Hello world<p>";
		testContent.hopeEditor.parseHTML();
		var textSettings={
			'block': [
				{tag: 'h1', name: 'Heading 1'},
				{tag: 'p', name: 'Paragraph'},
			],
			'class' : [
				[
					{class : 'highlight', name : 'Highlight', icon : 'fa-sun-o'},
					{class : 'lowlight', name : 'Lowlight', icon : 'fa-moon-o'}
				],
				[
					{class : 'red', name : 'Red', icon : 'fa-paint-brush'},
					{class : 'green', name : 'Green', icon : 'fa-paint-brush'},
					{class : 'blue', name : 'Blue', icon : 'fa-paint-brush'}
				]
			]
		};
		editor.toolbars['simply-text-cursor'].init(textSettings);

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		var redButton = editor.toolbarsContainer.querySelector("#simply-text-cursor button[data-simply-action='simply-text-class'][data-value='red']");
		assert.ok(redButton.className.indexOf("simply-selected") > -1, "red class button is pressed");
	});
/*
	// FIXME: Decide if this is breaking 'by design';
	QUnit.test("paragraph with class is found", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p class='test'>Hello world<p>";
		testContent.hopeEditor.parseHTML();
		var textSettings={
			'block': [
				{tag: 'h1', name: 'Heading 1'},
				{tag: 'p class="test"', name: 'Test'}
			]
		};
		editor.toolbars['simply-text-cursor'].init(textSettings);

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		var currentStyle = editor.toolbarsContainer.querySelector("#simply-text-cursor select[data-simply-action='simply-text-blockstyle']").value;
		assert.equal(currentStyle, 'p class="test"', "text style is correctly updated");
	});

	QUnit.test("paragraph with more specific class is found", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p class='test'>Hello world<p>";
		testContent.hopeEditor.parseHTML();
		var textSettings={
			'block': [
				{tag: 'h1', name: 'Heading 1'},
				{tag: 'p', name: 'Paragraph'},
				{tag: 'p class="test"', name: 'Test'}
			]
		};
		editor.toolbars['simply-text-cursor'].init(textSettings);

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		var currentStyle = editor.toolbarsContainer.querySelector("#simply-text-cursor select[data-simply-action='simply-text-blockstyle']").value;
		assert.equal(currentStyle, 'p class="test"', "text style is correctly updated");
	});
*/
QUnit.module("text hyperlinks");
	QUnit.test("text hyperlink", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='test/'>llo world</a></p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("a"), 3);

		assert.ok(editor.context.get(), "simply-hyperlink", "hyperlink context");
	});

	QUnit.test("change hyperlink", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='test/'>llo world</a></p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("a"), 3);
		editor.actions['simply-hyperlink-href']("http://www.muze.nl");

		var hyperlink = testContent.querySelector("A");
		
		assert.ok(hyperlink.href, "http://www.muze.nl", "hyperlink set");
		assert.ok(testContent.innerHTML, '<p>He<a href="http://www.muze.nl">llo world</a></p>', "hyperlink set");
	});

	QUnit.test("click hyperlink", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='#test'>llo world</a></p>";
		testContent.hopeEditor.parseHTML();

		editor.context.toolbar.hide = true;
		editor.context.update();
		editor.context.toolbar.hide = false;
		simulateClick(testContent.querySelector("a"), 5, 10);
		editor.context.update();
		assert.ok(document.location.hash.indexOf("simply-edit") > -1);
	});

	QUnit.test("set title hyperlink", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='test/'>llo world</a></p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("a"), 3);
		editor.actions['simply-hyperlink-title']("Hello");

		var hyperlink = testContent.querySelector("A");
		
		assert.ok(hyperlink.getAttribute("title"), "Hello", "hyperlink title set");
		assert.ok(testContent.innerHTML, '<p>He<a href="test/" title="Hello">llo world</a></p>', "hyperlink title set");
	});

	QUnit.test("create hyperlink href", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("P"), 0, 6);
		editor.actions['simply-hyperlink-href']("http://www.muze.nl/");
		var hyperlink = testContent.querySelector("A");
		assert.ok(hyperlink.getAttribute("href"), "http://www.muze.nl/", "hyperlink created");
		assert.ok(testContent.innerHTML, '<p><a href="http://www.muze.nl/">Hello </a>world</p>', "hyperlink created");
	});

	QUnit.test("hyperlink toolbar init", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='test/' title='mytitle' name='mylink' rel='nofollow'>llo world</a></p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("a"), 3);

		var targetInput = editor.toolbarsContainer.querySelector("#simply-text-selection #vdHyperlinkHref");
		assert.equal(targetInput.value, "test/", "href init done");

		targetInput = editor.toolbarsContainer.querySelector("#simply-text-selection #vdHyperlinkName");
		assert.equal(targetInput.value, "mylink", "name init done");

		targetInput = editor.toolbarsContainer.querySelector("#simply-text-selection #vdHyperlinkTitle");
		assert.equal(targetInput.value, "mytitle", "title init done");

		targetInput = editor.toolbarsContainer.querySelector("#simply-text-selection button[data-simply-action='simply-hyperlink-nofollow']");
		assert.ok(targetInput.classList.contains('simply-selected'), "nofollow init done");
	});

	QUnit.test("hyperlink toolbar init on linkless", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='test/' title='mytitle' name='mylink' rel='nofollow'>llo world</a></p>";
		testContent.hopeEditor.parseHTML();

		setCaretPosition(testContent.querySelector("a"), 3);
		editor.context.update();
		setCaretPosition(testContent.querySelector("p"), 0, 1);
		var targetInput = editor.toolbarsContainer.querySelector("#simply-text-selection #vdHyperlinkHref");
		assert.equal(targetInput.value, "", "href is emptied");

		targetInput = editor.toolbarsContainer.querySelector("#simply-text-selection #vdHyperlinkName");
		assert.equal(targetInput.value, "", "name is emptied");

		targetInput = editor.toolbarsContainer.querySelector("#simply-text-selection #vdHyperlinkTitle");
		assert.equal(targetInput.value, "", "title is emptied");
	});


QUnit.module("images");
	QUnit.test("insert image at end of paragraph stays at caret location", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>abcdef</p><p>world</p>";
		setCaretPosition(testContent.querySelector("p"), 6, 0);
		testContent.hopeEditor.parseHTML();
		editor.actions["simply-insert-image"]();
		
		assert.equal(testContent.querySelector("img").parentNode, testContent.querySelector("p"));
	});

	QUnit.test("insert image at start of paragraph stays at caret location", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>abcdef</p><p>world</p>";
		setCaretPosition(testContent.querySelector("p + p"), 0, 0);
		testContent.hopeEditor.parseHTML();
		editor.actions["simply-insert-image"]();
		
		assert.equal(testContent.querySelector("img").parentNode, testContent.querySelector("p + p"));
	});

	QUnit.test("select image works", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>abcdef</p><p>wo<a href='#'><img src='frop'></a>rld</p>";
		testContent.hopeEditor.parseHTML();
		selectImage(testContent.querySelector("img"));

		assert.equal(editor.context.get(), "simply-image");
	});

	QUnit.test("set image source for image within hyperlink works", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>abcdef</p><p><a href='#'><img src='frop'></a>rld</p>";
		testContent.hopeEditor.parseHTML();
		selectImage(testContent.querySelector("img"));
		editor.context.update();
		editor.actions["simply-image-src"]("HelloWorld");
		
		assert.equal(testContent.querySelector("img").getAttribute("src"), "HelloWorld");
	});

	QUnit.test("set image source for image at end of field", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>abcdef<img src='frop'></p>";
		testContent.hopeEditor.parseHTML();
		selectImage(testContent.querySelector("img"));
		editor.context.update();
		editor.actions["simply-image-src"]("HelloWorld");

		assert.equal(testContent.querySelector("img").getAttribute("src"), "HelloWorld");
	});

	QUnit.test("responsive image source gets set", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>abcdef</p><p><a href='#'><img src='frop'></a>rld</p>";
		testContent.hopeEditor.parseHTML();
		selectImage(testContent.querySelector("img"));
		editor.context.update();
		editor.actions["simply-image-src"]("HelloWorld");
		
		assert.equal(testContent.querySelector("img").getAttribute("src"), "HelloWorld");
		testContent.innerHTML = '';
	});

	QUnit.test("insert 2 images, get src in first image", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>ab<img src='a'><img src='b'>cdef</p>";
		testContent.hopeEditor.parseHTML();
		selectImage(testContent.querySelector("img"));
		editor.context.update();
		assert.equal(editor.toolbarsContainer.querySelector("#simply-image input.simply-image-src").value, "a");
		testContent.innerHTML = '';
	});

	QUnit.test("insert 2 images, get src in second image", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>ab<img src='a'><img src='b'>cdef</p>";
		testContent.hopeEditor.parseHTML();
		selectImage(testContent.querySelector("img + img"));
		editor.context.update();
		assert.equal(editor.toolbarsContainer.querySelector("#simply-image input.simply-image-src").value, "b");
		testContent.innerHTML = '';
	});

	QUnit.test("insert 2 images, set src in first image", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>ab<img src='a'><img src='b'>cdef</p>";
		testContent.hopeEditor.parseHTML();
		selectImage(testContent.querySelector("img"));
		editor.context.update();
		editor.actions["simply-image-src"]("HelloWorld");
		assert.equal(testContent.querySelector("img").getAttribute("src"), "HelloWorld");
		assert.equal(testContent.querySelector("img").getAttribute("src"), "HelloWorld");
		testContent.innerHTML = '';
	});

	QUnit.test("insert 2 images, set src in second image", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>ab<img src='a'><img src='b'>cdef</p>";
		testContent.hopeEditor.parseHTML();
		selectImage(testContent.querySelector("img + img"));
		editor.context.update();
		editor.actions["simply-image-src"]("HelloWorld");

		assert.equal(testContent.querySelector("img + img").getAttribute("data-simply-src"), "HelloWorld");
		assert.equal(testContent.querySelector("img + img").getAttribute("src"), "HelloWorld");

		testContent.innerHTML = '';
	});

QUnit.module("lists");
	QUnit.test("add list item", function(assert) {
		var testList = document.querySelector("#testList");
		currentList = testList;
		testList.innerHTML = '';

		var button = document.createElement("button");
		editor.actions["simply-list-add"](button);
		assert.equal(testList.querySelectorAll("[data-simply-list-item]").length, 1);
		editor.actions["simply-list-add"](button);
		assert.equal(testList.querySelectorAll("[data-simply-list-item]").length, 2);
		editor.actions["simply-list-add"](button);
		assert.equal(testList.querySelectorAll("[data-simply-list-item]").length, 3);
	});

	QUnit.test("list item becomes editable", function(assert) {
		var testList = document.querySelector("#testList");
		currentList = testList;
		testList.innerHTML = '';

		var button = document.createElement("button");
		editor.actions["simply-list-add"](button);
		assert.equal(testList.querySelectorAll("[contenteditable]").length, 1);
		editor.actions["simply-list-add"](button);
		assert.equal(testList.querySelectorAll("[contenteditable]").length, 2);
	});


	QUnit.test("click in text, text context wins", function(assert) {
		var testList = document.querySelector("#testList");
		currentList = testList;
		testList.innerHTML = '';

		var button = document.createElement("button");
		editor.actions["simply-list-add"](button);
		editor.actions["simply-list-add"](button);

		var target = testList.querySelectorAll("[data-simply-list-item]")[1];

		editor.context.toolbar.hide = true;
		editor.context.update();
		editor.context.toolbar.hide = false;
		simulateClick(target.querySelector("p"), 5, 5);
		var context = editor.context.get();
		assert.equal(context, "simply-text-cursor");
	});

	QUnit.test("click on list item marker, list item context wins", function(assert) {
		var testList = document.querySelector("#testList");
		currentList = testList;
		testList.innerHTML = '';

		var button = document.createElement("button");
		editor.actions["simply-list-add"](button);
		editor.actions["simply-list-add"](button);

		var target = testList.querySelectorAll("[data-simply-list-item]")[1];
		
		editor.context.toolbar.hide = true;
		editor.context.update();
		editor.context.toolbar.hide = false;
		simulateClick(target, -5, 50);
		var context = editor.context.get();
		assert.equal(context, "simply-list-item");
	});

	QUnit.test("add list item, databinding", function(assert) {
		var testList = document.querySelector("#testList");
		currentList = testList;
		testList.innerHTML = '';

		var button = document.createElement("button");
		editor.actions["simply-list-add"](button);
		assert.equal(testList.querySelectorAll("[data-simply-list-item]").length, 1);
		assert.equal(editor.pageData.testList[0].item, testList.querySelector("[data-simply-field=item]").innerHTML);
		assert.equal(testList.querySelector("[data-simply-field=item]").dataBinding.parentKey, "/testList/0/");
		assert.equal(editor.pageData.testList[0]._bindings_.item, testList.querySelector("[data-simply-field=item]").dataBinding);		
	});

	QUnit.test("add list item (list item is field), databinding", function(assert) {
		var testList2 = document.querySelector("#testList2");
		currentList = testList2;
		testList2.innerHTML = '';

		var button = document.createElement("button");
		editor.actions["simply-list-add"](button);
		assert.equal(testList2.querySelectorAll("[data-simply-list-item]").length, 1);
		assert.equal(editor.pageData.testList2[0].item, testList2.querySelector("[data-simply-field=item]").innerHTML);
		assert.equal(testList2.querySelector("[data-simply-field=item]").dataBinding.parentKey, "/testList2/0/");
		assert.equal(editor.pageData.testList2[0]._bindings_.item, testList2.querySelector("[data-simply-field=item]").dataBinding);
	});

	QUnit.test("add 2 list items, databinding", function(assert) {
		var testList = document.querySelector("#testList");
		currentList = testList;
		testList.innerHTML = '';

		var button = document.createElement("button");
		editor.actions["simply-list-add"](button);
		assert.equal(testList.querySelectorAll("[data-simply-list-item]").length, 1);
		assert.equal(editor.pageData.testList[0].item, testList.querySelector("[data-simply-field=item]").innerHTML);
		assert.equal(editor.pageData.testList[0]._bindings_.item, testList.querySelector("[data-simply-field=item]").dataBinding);		

		editor.actions["simply-list-add"](button);
		assert.equal(testList.querySelectorAll("[data-simply-list-item]").length, 2);
		assert.equal(editor.pageData.testList[0].item, testList.querySelector("[data-simply-field=item]").innerHTML);
		assert.equal(editor.pageData.testList[0]._bindings_.item, testList.querySelector("[data-simply-field=item]").dataBinding);		

		assert.equal(editor.pageData.testList[1].item, testList.querySelectorAll("[data-simply-field=item]")[1].innerHTML);
		assert.equal(editor.pageData.testList[1]._bindings_.item, testList.querySelectorAll("[data-simply-field=item]")[1].dataBinding);		
		assert.equal(testList.querySelectorAll("[data-simply-field=item]")[0].dataBinding.parentKey, "/testList/0/");
		assert.equal(testList.querySelectorAll("[data-simply-field=item]")[1].dataBinding.parentKey, "/testList/1/");
	});


	QUnit.test("databinding in list", function(assert) {
		var target = document.querySelector("#testContent");
		var list = document.createElement('div');
		list.innerHTML = '<div data-simply-list="menu" data-simply-path="/"><template><div><div data-simply-list="items"><template><span><span data-simply-field="item">Menu item</span></span></template></div></div></template></div>';
		target.parentNode.insertBefore(list, target);
		var data = {
			"/" : {
				"menu" : [
					{"items" : [
						{"item" : "Home"},
						{"item" : "Second item"}
					]},
					{"items" : [
						{"item" : "2Home"},
						{"item" : "2Second item"}
					]}
				]
			}
		};
		editor.currentData = data;
		editor.data.apply(data, document);
		assert.equal(editor.currentData['/'].menu[0].items[0]._bindings_.item, list.querySelector("[data-simply-field=item]").dataBinding);
	});
/* FIXME: Decide how this should work and make it so */
/*QUnit.module("static link with editable content");
	QUnit.test("click on link", function(assert) {
		var testLink = document.querySelector("#staticLink");

		editor.context.toolbar.hide = true;
		editor.context.update();
		editor.context.toolbar.hide = false;
		simulateClick(testLink, 5, 10);
		assert.ok(document.location.hash.indexOf("simply-edit") > -1);
		document.location.hash = "simply-edit";
	});
*/
QUnit.module("no context");
	QUnit.test("remove selection at end of tests", function(assert) {
		window.getSelection().removeAllRanges();
		vdSelectionState.remove();
		editor.context.update();
		assert.equal(editor.context.get(), "simply-no-context");
	});

QUnit.module("plugin buttons");
	QUnit.test("buttons have list item containers", function(assert) {
		var buttons = editor.toolbarsContainer.querySelectorAll("#simply-main-toolbar .simply-buttons > button");
		assert.equal(buttons.length, 0);
	});


QUnit.module("browse plugin");
	QUnit.test("sitemap button is added to main toolbar", function(assert) {
		var button = editor.toolbarsContainer.querySelectorAll('#simply-main-toolbar [data-simply-action="simply-browse-sitemap"]');
		assert.equal(button.length, 1);
	});

	QUnit.test("browse images button is added to image field toolbar", function(assert) {		
		var button = editor.toolbarsContainer.querySelectorAll('#simply-image-field [data-simply-action="simply-browse-images"]');
		assert.equal(button.length, 2);
	});

	QUnit.test("browse images button is added to image toolbar", function(assert) {		
		var button = editor.toolbarsContainer.querySelectorAll('#simply-image [data-simply-action="simply-browse-images"]');
		assert.equal(button.length, 2);
	});

	QUnit.test("browse files button is added to text/hyperlink toolbar", function(assert) {
		var button = editor.toolbarsContainer.querySelectorAll('#simply-text-selection [data-simply-action="simply-browse"]');
		assert.equal(button.length, 1);
	});

QUnit.module("symbol plugin");
	QUnit.test("insert euro sign (char 128) works", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();
		setCaretPosition(testContent, 5, 0);

		editor.actions['simply-symbol']();

		var button = document.createElement("button");
		button.setAttribute('data-value', 128);
		editor.actions['simply-symbol-insert'](button);
		assert.equal(testContent.innerHTML, 'Hello€ world', "Symbol was inserted");
	});

	QUnit.test("Cursor goes after inserted symbol", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();
		setCaretPosition(testContent, 5, 0);

		editor.actions['simply-symbol']();

		var button = document.createElement("button");
		button.setAttribute('data-value', 128);
		editor.actions['simply-symbol-insert'](button);
		var range = testContent.hopeEditor.selection.getRange();

		assert.equal(range.start, 6, "Range was updated correctly");
	});

	QUnit.test("Selection updates to the inserted character", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor.parseHTML();
		setCaretPosition(testContent, 5, 4);

		editor.actions['simply-symbol']();

		var button = document.createElement("button");
		button.setAttribute('data-value', 128);
		editor.actions['simply-symbol-insert'](button);
		var range = testContent.hopeEditor.selection.getRange();

		assert.equal(testContent.innerHTML, 'Hello€ld', 'Insert symbol replaced selected text');
		assert.equal(range.start, 5, "Selection was updated correctly");
		assert.equal(range.end, 6, "Selection was updated correctly");
	});


	QUnit.test("Insert symbol in empty list item", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<ol><li>Hello world</li><li></li></ol>";
		testContent.hopeEditor.parseHTML();
		setCaretPosition(testContent.querySelector("li + li"), 0, 0);

		editor.actions['simply-symbol']();

		var button = document.createElement("button");
		button.setAttribute('data-value', 65);
		editor.actions['simply-symbol-insert'](button);

		assert.equal(testContent.innerHTML, '<ol><li>Hello world</li><li>A</li></ol>', "Symbol was inserted in the empty list item");
	});

QUnit.module("scaler plugin");
	QUnit.test("load scaler plugin", function(assert) {
		editor.loadToolbar("../../simply/plugin.simply-scaler.html");
		assert.equal(true, true, "Loading scaler plugin for syntax check");
	});

QUnit.module("page template plugin");
	QUnit.test("load current page template in the dialog", function(assert) {
		editor.plugins.pageTemplate.dialog.open();
		assert.equal("index.html", editor.toolbarsContainer.getElementById("simply-page-template-list").value);
		editor.plugins.dialog.close();
	});
