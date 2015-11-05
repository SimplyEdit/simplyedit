QUnit.config.autostart = false;

localStorage.storageKey = "demo";
editor.storage.key = "demo";

document.location.hash = "#simply-edit";

var checkEditor = function() {
	if (editor && editor.plugins && editor.plugins.text) {
		QUnit.start();
	} else {
		window.setTimeout(checkEditor, 300);
	}
};

checkEditor();

function setCaretPosition(elem, start, length) {
	var range = document.createRange();

	range.setStart(elem.childNodes[0], start);
	if (length) {
		range.setEnd(elem.childNodes[0], start + length);
	}

	var sel = window.getSelection();
	sel.removeAllRanges();
	sel.addRange(range);
	elem.focus();
	editor.context.update();
}
function setSelectionEnd(elem, offset) {
	var range = window.getSelection().getRangeAt(0);
	range.setEnd(elem, offset);
	var sel = window.getSelection();

	sel.removeAllRanges();
	sel.addRange(range);
	elem.focus();
	editor.context.update();
}

QUnit.module("editor init");
	QUnit.test("editmode init", function(assert) {
		assert.ok(vdSelectionState, "vdSelectionState initialized");
	});

QUnit.module("hope editor behaviour");

	QUnit.test("seperate p stay seperated", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello</p><p>world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;
		assert.equal(testContent.innerHTML, "<p>Hello</p><p>world</p>", "innerHTML did not change");
	});

	QUnit.test("seperate br stay seperated", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello<br><br>world</p>";

		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;
		console.log(testContent.hopeEditor.refs.annotations.value);
		assert.equal(testContent.innerHTML, "<p>Hello<br><br>world</p>", "innerHTML did not change");
	});

	QUnit.test("seperate hr stay seperated", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "hello<hr><hr>world";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;
		assert.equal(testContent.innerHTML, "hello<hr><hr>world", "innerHTML did not change");
	});

	QUnit.test("seperate hr stay seperated", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>hello</p><hr><hr><p>world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;
		assert.equal(testContent.innerHTML, "<p>hello</p><hr><hr><p>world</p>", "innerHTML did not change");
	});

	QUnit.test("seperate divs stay seperated", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "hello<div></div><div></div>world";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;
		assert.equal(testContent.innerHTML, "hello<div></div><div></div>world", "innerHTML did not change");
	});
	QUnit.test("strong tag doesnt get extra p tags", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<strong>llo</strong> world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;
		setCaretPosition(testContent.querySelector("p"), 1, 0);
		assert.equal(testContent.innerHTML, "<p>He<strong>llo</strong> world</p>", "innerHTML did not change");
	});

	QUnit.test("code tag is not removed from div tag", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<div>test1</div><div><code>Hello</code></div>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;
		setCaretPosition(testContent.querySelector("div"), 1, 0);
		assert.equal(testContent.innerHTML, "<div>test1</div><div><code>Hello</code></div>", "innerHTML did not change");
	});

QUnit.module("editor context");
	QUnit.test("text context", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;
		setCaretPosition(testContent, 2, 0);
		var context = editor.context.get();
		assert.equal(context, "simply-text-cursor");
	});

	QUnit.test("text context", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;
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
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		editor.actions['simply-text-align-right']();

		assert.equal(testContent.innerHTML, '<p class="simply-text-align-right">Hello world</p>', "Found align class");
	});

	QUnit.test("text set align from right to left within paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<p class="simply-text-align-right">Hello world</p>';
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;
		
		setCaretPosition(testContent.querySelector("p"), 2, 0);
		editor.actions['simply-text-align-left']();

		assert.equal(testContent.innerHTML, '<p class="simply-text-align-left">Hello world</p>', "Found align class");
	});

	QUnit.test("text set align from right to none within paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<p class="simply-text-align-right">Hello world</p>';
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		editor.actions['simply-text-align-none']();

		assert.equal(testContent.innerHTML, '<p>Hello world</p>', "Found align class");
	});

	QUnit.test("text set align from center to justify within paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<p class="simply-text-align-center">Hello world</p>';
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		editor.actions['simply-text-align-justify']();

		assert.equal(testContent.innerHTML, '<p class="simply-text-align-justify">Hello world</p>', "Found align class");
	});

	QUnit.test("text style init paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		var currentStyle = document.querySelector("#simply-text-cursor select[name=textStyle]").value;
		assert.equal(currentStyle, "p", "text style is correctly updated");
	});

	QUnit.test("text style init h2", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h2>Hello world</h2>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("h2"), 2, 0);
		var currentStyle = document.querySelector("#simply-text-cursor select[name=textStyle]").value;
		assert.equal(currentStyle, "h2", "text style is correctly updated");
	});

	QUnit.test("text style set h2 to h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h2>Hello world</h2>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("h2"), 2, 0);

		editor.actions['simply-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<h1>Hello world</h1>');
	});

	QUnit.test("text style set h2 with multiple classes to h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<h2 class="hello world class">Hello world</h2>';
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("h2"), 2, 0);

		editor.actions['simply-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<h1 class="hello world class">Hello world</h1>');
	});

	QUnit.test("text style set h2 with anchor to h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<h2><a name="title">Hello world</a></h2>';
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		console.log(testContent.innerHTML);

		setCaretPosition(testContent.querySelector("a"), 2, 0);
		editor.actions['simply-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<h1><a name="title">Hello world</a></h1>');
	});

	QUnit.test("text style unset to h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent, 2, 0);
		editor.actions['simply-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<h1>Hello world</h1>');
	});

	QUnit.test("text in section style set h2 to h1", function(assert) {
		var testContent = document.querySelector("#testSection");
		testContent.innerHTML = "<h2>Hello world</h2>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("h2"), 2, 0);
		editor.actions['simply-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<h1>Hello world</h1>');
	});


QUnit.module("editor text selection");
	QUnit.test("text set bold", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent, 2, 3);
		editor.actions['simply-text-bold']();

		assert.equal(testContent.innerHTML, 'He<strong>llo</strong> world', "Bold uses STRONG tag");
	});

	QUnit.test("text set bold in paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("p"), 2, 3);
		editor.actions['simply-text-bold']();

		assert.equal(testContent.innerHTML, '<p>He<strong>llo</strong> world</p>', "Bold uses STRONG tag");
	});

	QUnit.test("text style unset bold", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<strong>llo</strong> world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("strong"), 0, 3);
		editor.actions['simply-text-bold']();

		assert.equal(testContent.innerHTML, '<p>Hello world</p>', "STRONG tag removed");
	});

	QUnit.test("text set italic", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent, 2, 3);
		editor.actions['simply-text-italic']();

		assert.equal(testContent.innerHTML, 'He<em>llo</em> world', "Italic uses EM tag");
	});

	QUnit.test("text set italic in paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("p"), 2, 3);
		editor.actions['simply-text-italic']();

		assert.equal(testContent.innerHTML, '<p>He<em>llo</em> world</p>', "Italic uses EM tag");
	});
	

	QUnit.test("text style init italic", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<em>llo there</em> world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("em"), 0, 3);
		var targetButton = document.querySelector("#simply-text-selection button[data-simply-action='simply-text-italic']");

		assert.ok(targetButton.classList.contains("simply-selected"), "text style is correctly updated");
	});

	QUnit.test("text style unset italic", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<em>llo there</em> world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("em"), 3);
		editor.actions['simply-text-italic']();

		assert.equal(testContent.innerHTML, '<p>Hello there world</p>', "EM tag removed");
	});

	QUnit.test("text style init italic", function(assert) {
	// FIXME: In IE, als je klikt aan het begin van de <em> en dan naar rechts selecteerd is italic niet actief; Oorzaak is dat de range dan voor de <em> ligt in plaats van er binnen.
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<em>llo</em> world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent, 2);
		setSelectionEnd(testContent.querySelector("em"),1);

		var targetButton = document.querySelector("#simply-text-selection button[data-simply-action='simply-text-italic']");
		assert.ok(targetButton.classList.contains("simply-selected"), "text style is correctly updated");
	});

QUnit.module("text hyperlinks");
	QUnit.test("text hyperlink", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='test/'>llo world</a></p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("a"), 3);

		assert.ok(editor.context.get(), "simply-hyperlink", "hyperlink context");
	});

	QUnit.test("change hyperlink", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='test/'>llo world</a></p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("a"), 3);
		editor.actions['simply-hyperlink-href']("http://www.muze.nl");

		var hyperlink = testContent.querySelector("A");
		
		assert.ok(hyperlink.href, "http://www.muze.nl", "hyperlink set");
		assert.ok(testContent.innerHTML, '<p>He<a href="http://www.muze.nl">llo world</a></p>', "hyperlink set");
	});

	QUnit.test("set title hyperlink", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='test/'>llo world</a></p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("a"), 3);
		editor.actions['simply-hyperlink-title']("Hello");

		var hyperlink = testContent.querySelector("A");
		
		assert.ok(hyperlink.getAttribute("title"), "Hello", "hyperlink title set");
		assert.ok(testContent.innerHTML, '<p>He<a href="test/" title="Hello">llo world</a></p>', "hyperlink title set");
	});

	QUnit.test("create hyperlink href", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("P"), 0, 6);
		editor.actions['simply-hyperlink-href']("http://www.muze.nl/");
		var hyperlink = testContent.querySelector("A");
		assert.ok(hyperlink.getAttribute("href"), "http://www.muze.nl/", "hyperlink created");
		assert.ok(testContent.innerHTML, '<p><a href="http://www.muze.nl/">Hello </a>world</p>', "hyperlink created");
	});

	QUnit.test("hyperlink toolbar init", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='test/' title='mytitle' name='mylink' rel='nofollow'>llo world</a></p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("a"), 3);

		var targetInput = document.querySelector("#simply-text-selection #vdHyperlinkHref");
		assert.equal(targetInput.value, "test/", "href init done");

		targetInput = document.querySelector("#simply-text-selection #vdHyperlinkName");
		assert.equal(targetInput.value, "mylink", "name init done");

		targetInput = document.querySelector("#simply-text-selection #vdHyperlinkTitle");
		assert.equal(targetInput.value, "mytitle", "title init done");

		targetInput = document.querySelector("#simply-text-selection button[data-simply-action='simply-hyperlink-nofollow']");
		assert.ok(targetInput.classList.contains('simply-selected'), "nofollow init done");
	});



QUnit.module("no context");
	QUnit.test("remove selection at end of tests", function(assert) {
		window.getSelection().removeAllRanges();
		editor.context.update();
		assert.equal(editor.context.get(), "simply-no-context");
	});

QUnit.module("plugin buttons");
	QUnit.test("buttons have list item containers", function(assert) {
		var buttons = document.querySelectorAll("#simply-main-toolbar .simply-buttons > button");
		assert.equal(buttons.length, 0);
	});
