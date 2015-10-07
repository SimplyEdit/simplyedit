QUnit.config.autostart = false;

localStorage.storageKey = "demo";
editor.storage.key = "demo";

document.location.hash = "#vedor-edit";

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

QUnit.module("editor context");
	QUnit.test("text context", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;
		setCaretPosition(testContent, 2, 0);
		var context = editor.context.get();
		assert.equal(context, "vedor-text-cursor");
	});

QUnit.module("editor context");
	QUnit.test("text context", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;
		setCaretPosition(testContent, 2, 3);
		var context = editor.context.get();
		assert.equal(context, "vedor-text-selection");
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
		editor.actions['vedor-text-align-right']();

		assert.equal(testContent.innerHTML, '<p class="vedor-text-align-right">Hello world</p>', "Found align class");
	});

	QUnit.test("text set align from right to left within paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<p class="vedor-text-align-right">Hello world</p>';
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;
		
		setCaretPosition(testContent.querySelector("p"), 2, 0);
		editor.actions['vedor-text-align-left']();

		assert.equal(testContent.innerHTML, '<p class="vedor-text-align-left">Hello world</p>', "Found align class");
	});

	QUnit.test("text set align from right to none within paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<p class="vedor-text-align-right">Hello world</p>';
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		editor.actions['vedor-text-align-none']();

		assert.equal(testContent.innerHTML, '<p>Hello world</p>', "Found align class");
	});

	QUnit.test("text set align from center to justify within paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<p class="vedor-text-align-center">Hello world</p>';
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		editor.actions['vedor-text-align-justify']();

		assert.equal(testContent.innerHTML, '<p class="vedor-text-align-justify">Hello world</p>', "Found align class");
	});

	QUnit.test("text style init paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("p"), 2, 0);
		var currentStyle = document.querySelector("#vedor-text-cursor select[name=textStyle]").value;
		assert.equal(currentStyle, "p", "text style is correctly updated");
	});

	QUnit.test("text style init h2", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h2>Hello world</h2>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("h2"), 2, 0);
		var currentStyle = document.querySelector("#vedor-text-cursor select[name=textStyle]").value;
		assert.equal(currentStyle, "h2", "text style is correctly updated");
	});

	QUnit.test("text style set h2 to h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<h2>Hello world</h2>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("h2"), 2, 0);

		editor.actions['vedor-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<h1>Hello world</h1>');
	});

	QUnit.test("text style set h2 with anchor to h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = '<h2><a name="title">Hello world</a></h2>';
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("a"), 2, 0);
		editor.actions['vedor-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<h1><a name="title">Hello world</a></h1>');
	});

	QUnit.test("text style unset to h1", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent, 2, 0);
		editor.actions['vedor-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<h1>Hello world</h1>');
	});

	QUnit.test("text in section style set h2 to h1", function(assert) {
		var testContent = document.querySelector("#testSection");
		testContent.innerHTML = "<h2>Hello world</h2>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("h2"), 2, 0);
		editor.actions['vedor-text-blockstyle']('h1');
		assert.equal(testContent.innerHTML, '<h1>Hello world</h1>');
	});


QUnit.module("editor text selection");
	QUnit.test("text set bold", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent, 2, 3);
		editor.actions['vedor-text-bold']();

		assert.equal(testContent.innerHTML, 'He<strong>llo</strong> world', "Bold uses STRONG tag");
	});

	QUnit.test("text set bold in paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("p"), 2, 3);
		editor.actions['vedor-text-bold']();

		assert.equal(testContent.innerHTML, '<p>He<strong>llo</strong> world</p>', "Bold uses STRONG tag");
	});

	QUnit.test("text style unset bold", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<strong>llo</strong> world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("strong"), 0, 3);
		editor.actions['vedor-text-bold']();

		assert.equal(testContent.innerHTML, '<p>Hello world</p>', "STRONG tag removed");
	});

	QUnit.test("text set italic", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "Hello world";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent, 2, 3);
		editor.actions['vedor-text-italic']();

		assert.equal(testContent.innerHTML, 'He<em>llo</em> world', "Italic uses EM tag");
	});

	QUnit.test("text set italic in paragraph", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("p"), 2, 3);
		editor.actions['vedor-text-italic']();

		assert.equal(testContent.innerHTML, '<p>He<em>llo</em> world</p>', "Italic uses EM tag");
	});
	

	QUnit.test("text style init italic", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<em>llo</em> world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("em"), 0, 3);
		var targetButton = document.querySelector("#vedor-text-selection button[data-vedor-action='vedor-text-italic']");

		assert.ok(targetButton.classList.contains("vedor-selected"), "text style is correctly updated");
	});

	QUnit.test("text style unset italic", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<em>llo</em> world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("em"), 0, 3);
		editor.actions['vedor-text-italic']();

		assert.equal(testContent.innerHTML, '<p>Hello world</p>', "EM tag removed");
	});

	QUnit.test("text style init italic", function(assert) {
	// FIXME: In IE, als je klikt aan het begin van de <em> en dan naar rechts selecteerd is italic niet actief; Oorzaak is dat de range dan voor de <em> ligt in plaats van er binnen.
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<em>llo</em> world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent, 2);
		setSelectionEnd(testContent.querySelector("em"),1);

		var targetButton = document.querySelector("#vedor-text-selection button[data-vedor-action='vedor-text-italic']");
		assert.ok(targetButton.classList.contains("vedor-selected"), "text style is correctly updated");
	});

QUnit.module("text hyperlinks");
	QUnit.test("text hyperlink", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='test/'>llo world</a></p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("a"), 3);

		assert.ok(editor.context.get(), "vedor-hyperlink", "hyperlink context");
	});

	QUnit.test("change hyperlink", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='test/'>llo world</a></p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("a"), 3);
		editor.actions['vedor-hyperlink-href']("http://www.muze.nl");

		var hyperlink = testContent.querySelector("A");
		
		assert.ok(hyperlink.href, "http://www.muze.nl", "hyperlink set");
		assert.ok(testContent.innerHTML, '<p>He<a href="http://www.muze.nl">llo world</a></p>', "hyperlink set");
	});

	QUnit.test("set title hyperlink", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='test/'>llo world</a></p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("a"), 3);
		editor.actions['vedor-hyperlink-title']("Hello");

		var hyperlink = testContent.querySelector("A");
		
		assert.ok(hyperlink.getAttribute("title"), "Hello", "hyperlink title set");
		assert.ok(testContent.innerHTML, '<p>He<a href="test/" title="Hello">llo world</a></p>', "hyperlink title set");
	});

	QUnit.test("create hyperlink href", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>Hello world</p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("P"), 0, 6);
		editor.actions['vedor-hyperlink-href']("http://www.muze.nl/");
		var hyperlink = testContent.querySelector("A");
		assert.ok(hyperlink.getAttribute("href"), "http://www.muze.nl/", "hyperlink created");
		assert.ok(testContent.innerHTML, '<p><a href="http://www.muze.nl/">Hello </a>world</p>', "hyperlink created");
	});

	QUnit.test("hyperlink toolbar init", function(assert) {
		var testContent = document.querySelector("#testContent");
		testContent.innerHTML = "<p>He<a href='test/' title='mytitle' name='mylink' rel='nofollow'>llo world</a></p>";
		testContent.hopeEditor ? testContent.hopeEditor.parseHTML() : false;

		setCaretPosition(testContent.querySelector("a"), 3);

		var targetInput = document.querySelector("#vedor-text-selection #vdHyperlinkHref");
		assert.equal(targetInput.value, "test/", "href init done");

		targetInput = document.querySelector("#vedor-text-selection #vdHyperlinkName");
		assert.equal(targetInput.value, "mylink", "name init done");

		targetInput = document.querySelector("#vedor-text-selection #vdHyperlinkTitle");
		assert.equal(targetInput.value, "mytitle", "title init done");

		targetInput = document.querySelector("#vedor-text-selection button[data-vedor-action='vedor-hyperlink-nofollow']");
		assert.ok(targetInput.classList.contains('vedor-selected'), "nofollow init done");
	});



QUnit.module("no context");
	QUnit.test("remove selection at end of tests", function(assert) {
		window.getSelection().removeAllRanges();
		editor.context.update();
		assert.equal(editor.context.get(), "vedor-no-context");
	});
