QUnit.config.reorder = false;

QUnit.test( "hello test", function( assert ) {
  assert.ok( 1 == "1", "Passed!" );
});

QUnit.module("editor field set");
	QUnit.test("field set image", function(assert) {
		var field = document.createElement("IMG");
		var data = "http://www.muze.nl/logo.gif";

		editor.field.set(field, data);
		assert.equal(field.getAttribute("src"), data, "string image src is set correctly");
	});

	QUnit.test("field set image data", function(assert) {
		var field = document.createElement("IMG");
		var src = "http://www.muze.nl/logo.gif";
		var data = {
			src : src,
			test : "test"
		};

		editor.field.set(field, data);
		assert.equal(field.getAttribute("src"), src, "image src is set correctly");
		assert.equal(field.getAttribute("test"), data.test, "image test attribute is set correctly");
	});

	QUnit.test("field set iframe data", function(assert) {
		var field = document.createElement("IFRAME");
		var data = {
			src : "http://www.muze.nl/logo.gif",
			test : "test"
		};

		editor.field.set(field, data);
		assert.equal(field.getAttribute("src"), data.src, "iframe src is set correctly");
		assert.equal(field.getAttribute("test"), data.test, "iframe test attribute is set correctly");
	});

	QUnit.test("field set a data", function(assert) {
		var field = document.createElement("A");
		var data = {
			innerHTML : "text",
			href : "http://www.muze.nl/",
			test : "test"
		};

		editor.field.set(field, data);

		assert.equal(field.getAttribute("href"), data.href, "a href is set correctly");
		assert.equal(field.getAttribute("test"), data.test, "a test attribute is set correctly");
		assert.equal(field.innerHTML, data.innerHTML);
	});

	QUnit.test("field set meta data", function(assert) {
		var field = document.createElement("META");
		var data = {
			content : "description",
			test : "test"
		};

		editor.field.set(field, data);

		assert.equal(field.getAttribute("content"), data.content, "meta content is set correctly");
		assert.equal(field.getAttribute("test"), data.test, "meta test attribute is set correctly");
	});

	QUnit.test("field set div data", function(assert) {
		var field = document.createElement("DIV");
		var data = "Hello world";

		editor.field.set(field, data);

		assert.equal(field.innerHTML, data, "div content is set correctly");
	});

	QUnit.test("field set fixed field data", function(assert) {
		var field = document.createElement("A");
		field.setAttribute("data-simply-content", "fixed");

		field.innerHTML = "Hello world";

		var data = {
			href : "http://www.muze.nl/logo.gif",
			innerHTML : "Foo"
		};

		editor.field.set(field, data);
		assert.equal(field.getAttribute("href"), data.href, "a href is set correctly");
		assert.equal(field.innerHTML, "Hello world");
	});

	QUnit.test("field set fixed field data with child field", function(assert) {
		var field = document.createElement("A");
		field.setAttribute("data-simply-content", "fixed");

		field.innerHTML = "<span data-simply-field='span'>Hi there</span>";

		var data = {
			href : "http://www.muze.nl/logo.gif",
			innerHTML : "Foo"
		};

		var spandata = "Hello world";
		editor.field.set(field, data);
		editor.field.set(field.querySelector("span"), spandata);

		assert.equal(field.getAttribute("href"), data.href, "a href is set correctly");
		assert.equal(field.innerText, "Hello world");
	});

/*	QUnit.test("field set template", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-simply-field='title' data-simply-content='template'><template data-simply-template='hello'>Hello world</template</div>";

		var field = target.querySelector("div");

		editor.field.set(field, "hello");
		assert.equal(field.innerText, "Hello world");
	});
*/

	QUnit.test("field set template with fixed child", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-simply-field='title' data-simply-content='template'><template data-simply-template='hello'><a href='#' data-simply-field='link' data-simply-content='fixed'><span data-simply-field='span'>Hi</span></a></template</div>";

		var field = target.querySelector("div");
		editor.field.set(field, "hello");
		editor.field.set(field.querySelector('a'), {
			href: 'http://www.muze.nl/',
			innerHTML: "Foo"
		});
		editor.field.set(field.querySelector("span"), "Hello world");

		assert.equal(field.innerText, "Hello world");
	});


QUnit.module("editor field get");

	QUnit.test("field get img data", function(assert) {
		var field = document.createElement("IMG");
		var src = "http://www.muze.nl/logo.gif";
		var data = {
			src : src,
			title : "Title",
			alt : "Alt",
			"class" : "class test"
		};
		editor.field.set(field, data);
		var result = editor.field.get(field);

		assert.ok(result, "got result");
		assert.equal(result.src, src, "result is same as inserted data");
		assert.equal(result.title, data.title, "result is same as inserted data");
		assert.equal(result.alt, data.alt, "result is same as inserted data");
		assert.equal(result["class"], data["class"], "result is same as inserted data");
	});

	QUnit.test("field get img data", function(assert) {
		var field = document.createElement("IMG");
		var src = "http://www.muze.nl/logo.gif";

		var data = {
			src : src,
			other : "other"
		};
		editor.field.set(field, data);
		var result = editor.field.get(field);

		assert.ok(result, "got result");
		assert.equal(result.src, src, "src is same as inserted data");
		assert.notOk(result.other, "other data should not be returned");
	});

	QUnit.test("field get a data", function(assert) {
		var field = document.createElement("A");
		var data = {
			href : "http://www.muze.nl/logo.gif",
			title : "Title",
			alt : "Alt",
			"class" : "class test",
			innerHTML : "Hello"
		};
		editor.field.set(field, data);
		var result = editor.field.get(field);

		assert.ok(result, "got result");
		assert.equal(result.href, data.href, "result is same as inserted data");
		assert.equal(result.title, data.title, "result is same as inserted data");
		assert.equal(result.alt, data.alt, "result is same as inserted data");
		assert.equal(result['class'], data['class'], "result is same as inserted data");
		assert.equal(result.innerHTML, data.innerHTML, "result is same as inserted data");
	});

	QUnit.test("field get a data", function(assert) {
		var field = document.createElement("A");
		var data = {
			href : "http://www.muze.nl/logo.gif",
			other : "other"
		};
		editor.field.set(field, data);
		var result = editor.field.get(field);

		assert.ok(result, "got result");
		assert.equal(result.href, data.href, "href is same as inserted data");
		assert.notOk(result.other, "other data should not be returned");
	});

	QUnit.test("field get meta data", function(assert) {
		var field = document.createElement("META");
		var data = {
			content : "http://www.muze.nl/logo.gif",
			other : "other"
		};
		editor.field.set(field, data);
		var result = editor.field.get(field);

		assert.ok(result, "got result");
		assert.equal(result.content, data.content, "content is same as inserted data");
		assert.notOk(result.other, "other data should not be returned");
	});

	QUnit.test("field get div data", function(assert) {
		var field = document.createElement("DIV");
		field.innerHTML = "Test me!";

		var result = editor.field.get(field);
		assert.ok(result, "got result");
		assert.equal(result, "Test me!", "content is same as inserted data");
	});

	QUnit.test("field get iframe data", function(assert) {
		var field = document.createElement("IFRAME");
		field.src = "Test me!";
		field.setAttribute("test", "test");

		var result = editor.field.get(field);
		assert.ok(result, "got result");
		assert.equal(result.src, "Test me!", "content is same as inserted data");
		assert.notOk(result.test, "test attribute should not be returned");
	});

	QUnit.test("field get fixed field data", function(assert) {
		var field = document.createElement("A");
		field.setAttribute("data-simply-content", "fixed");

		field.innerHTML = "Hello world";

		var data = {
			href : "http://www.muze.nl/logo.gif",
			innerHTML : "Foo"
		};

		editor.field.set(field, data);
		var result = editor.field.get(field);
		assert.ok(result, "got result");
		assert.notOk(result.innerHTML, "innerHTML should not be returned");
	});

	QUnit.test("field get attributes data", function(assert) {
		var field = document.createElement("DIV");
		field.setAttribute("data-simply-content", "attributes");
		field.setAttribute("hello", "world");
		field.setAttribute("color", "blue");
		field.setAttribute("data-simply-selectable", "true");
		field.innerHTML = "Hello world";

		var data = {
			hello : "world",
			color : "blue"
		};
		var result = editor.field.get(field);
		assert.ok(result, "got result");
		assert.equal(data.hello, result.hello, "Returned data matches expected data");
		assert.equal(data.color, result.color, "Returned data matches expected data");
		assert.notOk(result['data-simply-selectable'], "data-simply-selectable is not returned");
	});

	QUnit.test("field get attributes data after setting", function(assert) {
		var field = document.createElement("DIV");
		field.setAttribute("data-simply-content", "attributes");
		field.setAttribute("hello", "world");
		field.setAttribute("color", "blue");
		field.setAttribute("data-simply-selectable", "true");
		field.innerHTML = "Hello world";

		var data = {
			hello : "worlds",
			color : "pink"
		};
		editor.field.set(field, data);

		var result = editor.field.get(field);
		assert.ok(result, "got result");
		assert.equal(data.hello, result.hello, "Returned data matches expected data");
		assert.equal(data.color, result.color, "Returned data matches expected data");
		assert.notOk(result['data-simply-selectable'], "data-simply-selectable is not returned");
	});

	QUnit.test("field get attributes data", function(assert) {
		var field = document.createElement("DIV");
		field.setAttribute("data-simply-content", "attributes");
		field.setAttribute("data-simply-attributes", "hello color");
		field.setAttribute("hello", "world");
		field.setAttribute("color", "blue");
		field.setAttribute("another", "dummy");

		field.setAttribute("data-simply-selectable", "true");
		field.innerHTML = "Hello world";

		var data = {
			hello : "world",
			color : "blue"
		};
		var result = editor.field.get(field);
		assert.ok(result, "got result");
		assert.equal(data.hello, result.hello, "Returned data matches expected data");
		assert.equal(data.color, result.color, "Returned data matches expected data");
		assert.notOk(result['data-simply-selectable'], "data-simply-selectable is not returned");
		assert.notOk(result.another, "another attribute is not returned");
	});

QUnit.module("editor data apply");

	QUnit.test("apply title", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-simply-field='title'>Wrong content</div>";
		var data = {};
		data[location.pathname] = {
			"title" : "Test title"
		};
		editor.data.apply(data, target);

		assert.equal(document.querySelector("#testContent div").innerHTML, "Test title", "simple data simply field set correctly");
	});

	QUnit.test("apply title from a subkey", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-simply-field='page.title'>Wrong content</div>";
		var data = {};
		data[location.pathname] = {
			"page" : {
				"title" : "Test title"
			}
		};
		editor.data.apply(data, target);

		assert.equal(document.querySelector("#testContent div").innerHTML, "Test title", "simple data simply field set correctly");
	});

	QUnit.test("apply title with path", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-simply-field='title' data-simply-path='/'>Wrong content</div>";
		var data = {
			"/" : {
				"title" : "Test title"
			}
		};
		editor.data.apply(data, target);

		assert.equal(document.querySelector("#testContent div").innerHTML, "Test title", "simple data simply field set correctly");
	});

	QUnit.test("incompatible field types don't error out", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-simply-field='title'>Test title</div><a data-simply-field='title' href='#'>Foo</a>";
		var data = {};
		data[location.pathname] = {
			"title" : "Test title"
		};
		editor.data.apply(data, target);

		assert.equal(document.querySelector("#testContent div").innerHTML, "Test title", "simple data simply field set correctly");
	});

	QUnit.test("apply title with path and subkey", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-simply-field='page.title' data-simply-path='/'>Wrong content</div>";
		var data = {
			"/" : {
				"page" : {
					"title" : "Test title"
				}
			}
		};
		editor.data.apply(data, target);

		assert.equal(document.querySelector("#testContent div").innerHTML, "Test title", "simple data simply field set correctly");
	});

	QUnit.test("apply list", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<ul data-simply-list='menu' data-simply-path='/'><template><li data-simply-field='item'>Menu item</li></template></ul>";
		var data = {
			"/" : {
				"menu" : [
					{"item" : "Home"},
					{"item" : "Second item"}
				]
			}
		};
		editor.data.apply(data, target);
		assert.notOk(document.querySelector("#testContent ul").className.match(/simply-empty/), "simply-empty is set on empty list");
		assert.equal(document.querySelector("#testContent ul > li").innerHTML, "Home", "Home item was found");
		assert.equal(document.querySelector("#testContent ul > li + li").innerHTML, "Second item", "Second item was found");
	});

	QUnit.test("apply list from subkey", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<ul data-simply-list='page.menu' data-simply-path='/'><template><li data-simply-field='item'>Menu item</li></template></ul>";
		var data = {
			"/" : {
				"page" : {
					"menu" : [
						{"item" : "Home"},
						{"item" : "Second item"}
					]
				}
			}
		};
		editor.data.apply(data, target);
		assert.notOk(document.querySelector("#testContent ul").className.match(/simply-empty/), "simply-empty is set on empty list");
		assert.equal(document.querySelector("#testContent ul > li").innerHTML, "Home", "Home item was found");
		assert.equal(document.querySelector("#testContent ul > li + li").innerHTML, "Second item", "Second item was found");
	});

	QUnit.test("apply empty list", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<ul data-simply-list='menu' data-simply-path='/'><template><li data-simply-field='item'>Menu item</li></template></ul>";
		var data = {
			"/" : {
				"menu" : [
				]
			}
		};
		editor.data.apply(data, target);

		assert.ok(document.querySelector("#testContent ul").className.match(/simply-empty/), "simply-empty is set on empty list");
	});

	QUnit.test("apply 2nd degree list", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<ul data-simply-list="menu" data-simply-path="/"><template><li data-simply-list="items"><template><span data-simply-field="item">Menu item</span></template></li></template></ul>';
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
		editor.data.apply(data, target);

		assert.equal(document.querySelector("#testContent ul > li > span").innerHTML, "Home", "Home item was found");
		assert.equal(document.querySelector("#testContent ul > li > span + span").innerHTML, "Second item", "Second item was found");

		assert.equal(document.querySelector("#testContent ul > li + li > span").innerHTML, "2Home", "Home item was found");
		assert.equal(document.querySelector("#testContent ul > li + li > span + span").innerHTML, "2Second item", "Second item was found");
	});

QUnit.module("editor data get");

	QUnit.test("get title", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-simply-field='title'>Test title</div>";
		var data = editor.data.get(target);

		assert.equal(data[location.pathname].title, "Test title", "title found in data");
	});

	QUnit.test("get data on document", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-simply-field='title'>Test title</div>";
		var data = editor.data.get(document);

		assert.equal(data[location.pathname].title, "Test title", "title found in data");
	});

	QUnit.test("get title with path", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-simply-field='title' data-simply-path='/'>Test title</div>";
		var data = editor.data.get(target);

		assert.equal(data["/"].title, "Test title", "title for / found");
	});

	QUnit.test("get list", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<ul data-simply-list="menu" data-simply-path="/"><template><li data-simply-field="item">Menu item</li></template></ul>';
		var data = {
			"/" : {
				"menu" : [
					{"item" : "Home"},
					{"item" : "Second item"}
				]
			}
		};
		var expected = JSON.stringify(data);
		editor.data.apply(data, target);
		var result = editor.data.get(target);

		assert.equal(JSON.stringify(result), expected, "source and result data are the same");
	});

	QUnit.test("get 2nd degree list", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<ul data-simply-list="menu" data-simply-path="/"><template><li data-simply-list="items"><template><span data-simply-field="item">Menu item</span></template></li></template></ul>';
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
		var expected = JSON.stringify(data);
		editor.data.apply(data, target);

		var result = editor.data.get(target);
		assert.equal(JSON.stringify(result), expected, "source and result data are the same");
	});

	QUnit.test("get 2nd degree list deeper structure", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<ul data-simply-list="menu" data-simply-path="/"><template><li data-simply-list="items"><template><a><span data-simply-field="item">Menu item</span></a></template></li></template></ul>';
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
		var expected = JSON.stringify(data);
		editor.data.apply(data, target);

		var result = editor.data.get(target);
		assert.equal(JSON.stringify(result), expected, "source and result data are the same");
	});
/*
QUnit.module("data merge");
	QUnit.test("simply data merge", function(assert) {
		var data1 = {
			"/" : {
				"menu" : [
					{"items" : [
						{"item" : "Home"},
						{"item" : "Second item"}
					]},
					{"items" : [
						{"item" : "2Home"},
						{"item" : "2Second item"}
					]},
					{"items" : [
						{"item" : "3Home"},
						{"item" : "3Second item"}
					]}
				]
			}
		};
		var data2 = {
			"/test/" : {
				"menu-test" : [
					{"items-test" : [
						{"item-test" : "Home test"},
						{"item-test" : "Second item test"}
					]},
					{"items-test" : [
						{"item-test" : "2Home test"},
						{"item-test" : "2Second item test"}
					]}
				]
			}
		};

		var result = editor.data.merge(data1, data2);
		assert.ok(result['/'], "base set found");
		assert.ok(result['/test/'], "extra set found");
		assert.equal(result['/test/']['menu-test'].length, 2, "test menu has 2 items");
		assert.equal(result['/'].menu.length, 3, "base menu has 3 items");
	});

	QUnit.test("merge siblings", function(assert) {
		var data1 = {
			"/" : {
				"menu" : [
					{"items" : [
						{"item" : "Home"},
						{"item" : "Second item"}
					]},
					{"items" : [
						{"item" : "2Home"},
						{"item" : "2Second item"}
					]},
					{"items" : [
						{"item" : "3Home"},
						{"item" : "3Second item"}
					]}
				]
			}
		};
		var data2 = {
			"/" : {
				"menu-test" : [
					{"items-test" : [
						{"item-test" : "Home test"},
						{"item-test" : "Second item test"}
					]},
					{"items-test" : [
						{"item-test" : "2Home test"},
						{"item-test" : "2Second item test"}
					]}
				]
			}
		};
		var result = editor.data.merge(data1, data2);
		assert.ok(result['/'], "base set found");
		assert.equal(result['/']['menu-test'].length, 2, "test menu has 2 items");
		assert.equal(result['/'].menu.length, 3, "base menu has 3 items");
	});


	QUnit.test("merge with overwrite", function(assert) {
		var data1 = {
			"/" : {
				"menu" : [
					{"items" : [
						{"item" : "Home"},
						{"item" : "Second item"}
					]},
					{"items" : [
						{"item" : "2Home"},
						{"item" : "2Second item"}
					]},
					{"items" : [
						{"item" : "3Home"},
						{"item" : "3Second item"}
					]}
				]
			}
		};
		var data2 = {
			"/" : {
				"menu" : [
					{"items-test" : [
						{"item-test" : "Home test"},
						{"item-test" : "Second item test"}
					]},
					{"items-test" : [
						{"item-test" : "2Home test"},
						{"item-test" : "2Second item test"}
					]}
				]
			}
		};
		var result = editor.data.merge(data1, data2);
		assert.ok(result['/'], "base set found");
		assert.equal(result['/'].menu.length, 2, "test menu has 2 items");
	});
*/

QUnit.module("editor list fixFirstElementChild");
	QUnit.test("get title", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "Test 123 <div data-simply-field='title'>Test title</div>";
		editor.list.fixFirstElementChild(target);
		
		assert.equal(target.firstElementChild.nodeType, 1, "First child is an element");
		assert.equal(target.firstElementChild.innerHTML, "Test title", "First child innerHTML found");
		assert.equal(target.firstElementChild.getAttribute("data-simply-field"), "title", "First child getAttribute");
	});

QUnit.module("github storage");
	QUnit.test("get repo info", function(assert) {
		var url = "http://github.com/ylebre/simply-edit/data.json";
		var repoInfo = editor.storageConnectors.github.getRepoInfo(url);
		assert.equal(repoInfo.repoName, "simply-edit");
		assert.equal(repoInfo.repoBranch, "master");
		assert.equal(repoInfo.repoPath, "data.json");
		assert.equal(repoInfo.repoUser, "ylebre");
	});

	QUnit.test("get repo info for gh-pages", function(assert) {
		var url = "http://ylebre.github.io/simply-edit/data.json";
		var repoInfo = editor.storageConnectors.github.getRepoInfo(url);
		assert.equal(repoInfo.repoName, "simply-edit");
		assert.equal(repoInfo.repoBranch, "gh-pages");
		assert.equal(repoInfo.repoPath, "data.json");
		assert.equal(repoInfo.repoUser, "ylebre");
	});

	QUnit.test("get repo info with explicit branch", function(assert) {
		document.body.setAttribute("data-simply-repo-branch", "foo");
		var url = "http://github.com/ylebre/simply-edit/data.json";
		var repoInfo = editor.storageConnectors.github.getRepoInfo(url);
		assert.equal(repoInfo.repoName, "simply-edit");
		assert.equal(repoInfo.repoBranch, "foo");
		assert.equal(repoInfo.repoPath, "data.json");
		assert.equal(repoInfo.repoUser, "ylebre");
		document.body.removeAttribute("data-simply-repo-branch");
	});

	QUnit.test("get repo info for gh-pages with explicit branch", function(assert) {
		document.body.setAttribute("data-simply-repo-branch", "foo");
		var url = "http://ylebre.github.io/simply-edit/data.json";
		var repoInfo = editor.storageConnectors.github.getRepoInfo(url);
		assert.equal(repoInfo.repoName, "simply-edit");
		assert.equal(repoInfo.repoBranch, "foo");
		assert.equal(repoInfo.repoPath, "data.json");
		assert.equal(repoInfo.repoUser, "ylebre");
		document.body.removeAttribute("data-simply-repo-branch");
	});

QUnit.module("custom field types");
	QUnit.test("custom getter", function(assert) {
		var stubGetter = function() {return "foo";};
		editor.field.registerType("google-map", stubGetter, null, null);
		var target = document.querySelector("#testContent");
		target.innerHTML = "<google-map>frop</google-map>";
		var fieldData = editor.field.get(target.querySelector("google-map"));

		assert.equal(editor.field.get(target.querySelector("google-map")), "foo");
	});

	QUnit.test("custom setter", function(assert) {
		var stubGetter = function() {return "foo";};
		var stubSetter = function(field, data) {
			for (var i in data) {
				field.setAttribute(i, data[i]);
			}
		};

		editor.field.registerType("google-map", stubGetter, stubSetter, null);
		var target = document.querySelector("#testContent");
		target.innerHTML = "<google-map data-simply-field='map'>frop</google-map>";
		editor.field.set(target.querySelector("google-map"), {latitude: 52, longitude: 6, zoom: 10});

		
		assert.equal(target.querySelector("google-map").getAttribute("latitude"), 52);
		assert.equal(target.querySelector("google-map").getAttribute("longitude"), 6);
		assert.equal(target.querySelector("google-map").getAttribute("zoom"), 10);
	});

QUnit.module("databinding");
	QUnit.test("databinding a div", function(assert) {
		var field = document.createElement("DIV");
		field.setAttribute("data-simply-field", "hello");
		field.innerHTML = "Hello world";
		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);
		
		editor.currentData = {};
		editor.data.apply(editor.currentData, document);
		editor.pageData = editor.currentData[document.location.pathname];
		
		assert.equal(editor.pageData._bindings_.hello.elements[0], field);
	});

	QUnit.test("databinding set div data", function(assert) {
		var field = document.createElement("DIV");
		field.setAttribute("data-simply-field", "hello");
		field.innerHTML = "Hello world";
		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);
		
		editor.currentData = {};
		editor.data.apply(editor.currentData, document);
		editor.pageData = editor.currentData[document.location.pathname];

		assert.equal(field.innerHTML, "Hello world", "initial content remains in div");
		field.dataBinding.resolve(true);
		assert.equal(editor.pageData.hello, "Hello world", "editor pagedata gets set correctly");
	});

	QUnit.test("databinding set div data with subkey", function(assert) {
		var field = document.createElement("DIV");
		field.setAttribute("data-simply-field", "page.hello");
		field.innerHTML = "Hello world";
		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);

		editor.currentData = {};
		editor.data.apply(editor.currentData, document);
		editor.pageData = editor.currentData[document.location.pathname];

		assert.equal(field.innerHTML, "Hello world", "initial content remains in div");
		field.dataBinding.resolve(true);
		assert.equal(editor.pageData.page.hello, "Hello world", "editor pagedata gets set correctly");
	});

	QUnit.test("databinding change div data from DOM", function(assert) {
		var field = document.createElement("DIV");
		field.setAttribute("data-simply-field", "hello");
		field.innerHTML = "Hello world";
		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);

		editor.currentData = {};
		editor.data.apply(editor.currentData, document);
		editor.pageData = editor.currentData[document.location.pathname];

		field.innerHTML = "Hi world!";
		stop();
		window.setTimeout(function() {
			field.dataBinding.resolve(true);
			assert.equal(field.innerHTML, "Hi world!", "new content remains in div");
			assert.equal(editor.pageData.hello, "Hi world!", "new content is found in pagedata");
			start();
		}, 150);
	});

	QUnit.test("databinding change div data from data", function(assert) {
		var field = document.createElement("DIV");
		field.setAttribute("data-simply-field", "hello");
		field.innerHTML = "Hello world";
		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);

		editor.currentData = {};
		editor.data.apply(editor.currentData, document);
		editor.pageData = editor.currentData[document.location.pathname];

		editor.pageData.hello = "Hey world!";
		assert.equal(field.innerHTML, "Hey world!", "data is set in div");
		assert.equal(editor.pageData.hello, "Hey world!", "new content is found in pagedata");
	});

	QUnit.test("databinding list", function(assert) {
		var field = document.createElement("ul");
		field.setAttribute("data-simply-list", "hello");
		field.innerHTML = "<template><li><div data-simply-field='item'>Hello world</div></li></template>";
		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);

		editor.currentData = {};
		editor.data.apply(editor.currentData, document);
		editor.pageData = editor.currentData[document.location.pathname];

		assert.equal(JSON.stringify(editor.pageData.hello), "[]", "list starts out empty");
	});

	QUnit.test("databinding list with subkey", function(assert) {
		var field = document.createElement("ul");
		field.setAttribute("data-simply-list", "page.hello");
		field.innerHTML = "<template><li><div data-simply-field='item'>Hello world</div></li></template>";
		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);

		editor.currentData = {};
		editor.data.apply(editor.currentData, document);
		editor.pageData = editor.currentData[document.location.pathname];

		assert.equal(JSON.stringify(editor.pageData.page.hello), "[]", "list starts out empty");
	});

	QUnit.test("databinding list push item", function(assert) {
		var field = document.createElement("ul");
		field.setAttribute("data-simply-list", "hello");
		field.innerHTML = "<template><li><div data-simply-field='item'>Hello world</div></li></template>";
		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);

		editor.currentData = {};
		editor.data.apply(editor.currentData, document);
		editor.pageData = editor.currentData[document.location.pathname];

		editor.pageData.hello.push({item : "Hi world!"});
		field.dataBinding.resolve(true);
		assert.equal(JSON.stringify(editor.pageData.hello), JSON.stringify([{item:"Hi world!"}]), "added item is found in data");
		assert.equal(field.querySelector("div").innerHTML, "Hi world!", "added item is found in DOM");
	});

	QUnit.test("databinding list push item, then modify in data", function(assert) {
		var field = document.createElement("ul");
		field.setAttribute("data-simply-list", "hello");
		field.innerHTML = "<template><li><div data-simply-field='item'>Hello world</div></li></template>";
		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);

		editor.currentData = {};
		editor.data.apply(editor.currentData, document);
		editor.pageData = editor.currentData[document.location.pathname];

		editor.pageData.hello.push({item : "Hi world!"});
		editor.pageData.hello[0].item = "Hey world!";
		field.dataBinding.resolve(true);
		assert.equal(JSON.stringify(editor.pageData.hello), JSON.stringify([{item:"Hey world!"}]), "modified item is modified in data");
		assert.equal(field.querySelector("div").innerHTML, "Hey world!", "modified item is modified in DOM");
	});

	QUnit.test("databinding list push item, then modify in DOM", function(assert) {
		var field = document.createElement("ul");
		field.setAttribute("data-simply-list", "hello");
		field.innerHTML = "<template><li><div data-simply-field='item'>Hello world</div></li></template>";
		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);

		editor.currentData = {};
		editor.data.apply(editor.currentData, document);
		editor.pageData = editor.currentData[document.location.pathname];

		editor.pageData.hello.push({item : "Hi world!"});
		field.dataBinding.resolve(true);

		assert.equal(JSON.stringify(editor.pageData.hello), JSON.stringify([{item:"Hi world!"}]), "added item is found in data");
		assert.equal(field.querySelector("div").innerHTML, "Hi world!", "added item is found in DOM");

		field.querySelector("DIV").innerHTML = "Way out there";
		stop();
		window.setTimeout(function() {
			field.querySelector("DIV").dataBinding.resolve(true);
			assert.equal(editor.pageData.hello[0].item, "Way out there", "setting innerHTML does it");
			assert.equal(field.querySelector("div").innerHTML, "Way out there", "modified item is modified in DOM");
			start();
		}, 150);
	});

	QUnit.test("databinding list push item, clone and append it to the list", function(assert) {
		var field = document.createElement("ul");
		field.setAttribute("data-simply-list", "hello");
		field.innerHTML = "<template><li><div data-simply-field='item'>Hello world</div></li></template>";
		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);

		editor.currentData = {};
		editor.data.apply(editor.currentData, document);
		editor.pageData = editor.currentData[document.location.pathname];

		editor.pageData.hello.push({item : "Hi world!"});
		field.dataBinding.resolve(true);

		assert.equal(JSON.stringify(editor.pageData.hello), JSON.stringify([{item:"Hi world!"}]), "added item is found in data");
		assert.equal(field.querySelector("div").innerHTML, "Hi world!", "added item is found in DOM");

		var extraNode = field.querySelector("li").cloneNode(true);
		field.appendChild(extraNode);

		stop();
		window.setTimeout(function() {
			assert.equal(JSON.stringify(editor.pageData.hello), JSON.stringify([{item:"Hi world!"},{item:"Hi world!"}]), "cloned item is found in data");
			start();
		}, 300);
	});

	QUnit.test("databinding change div data from DOM", function(assert) {
		var field = document.createElement("DIV");
		field.setAttribute("data-simply-field", "hello");
		field.innerHTML = "Hello world";
		var field2 = field.cloneNode(true);

		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);
		target.appendChild(field2);

		editor.currentData = {};
		editor.data.apply(editor.currentData, document);

		stop();
		field.addEventListener("databind:domchanged", function() { 
			field.dataBinding.resolve(true);
			assert.equal(field.innerHTML, "Hi world!", "new content is set in div");
			assert.equal(field2.innerHTML, "Hi world!", "new content is set in second div");
			assert.equal(editor.pageData.hello, "Hi world!", "new content is found in pagedata");
			start();
		});

		field.innerHTML = "Hi world!";
	});

	QUnit.test("databinding list push 2 items", function(assert) {
		var field = document.createElement("ul");
		field.setAttribute("data-simply-list", "hello");
		field.innerHTML = "<template><li><div data-simply-field='item'>Hello world</div></li></template>";
		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);

		editor.currentData = {};
		editor.data.apply(editor.currentData, document);
		editor.pageData = editor.currentData[document.location.pathname];

		editor.pageData.hello.push({item : "Hi world!"});
		editor.pageData.hello.push({item : "Hi world 2!"});
		field.dataBinding.resolve(true);

		assert.equal(JSON.stringify(editor.pageData.hello), JSON.stringify([{item:"Hi world!"}, {item:"Hi world 2!"}]), "added item is found in data");
		assert.equal(field.querySelector("div").innerHTML, "Hi world!", "added item is found in DOM");
		assert.equal(field.querySelector("li + li div").innerHTML, "Hi world 2!", "added item is found in DOM");
	});

	QUnit.test("databinding push 2 items, reorder items in dom", function(assert) {
		var field = document.createElement("ul");
		field.setAttribute("data-simply-list", "hello");
		field.innerHTML = "<template><li><div data-simply-field='item'>Hello world</div></li></template>";
		var target = document.querySelector("#testContent");
		target.innerHTML = '';
		target.appendChild(field);

		editor.currentData = {};
		editor.data.apply(editor.currentData, document);
		editor.pageData = editor.currentData[document.location.pathname];

		editor.pageData.hello.push({item : "Hi world!"});
		editor.pageData.hello.push({item : "Hi world 2!"});
		field.dataBinding.resolve(true);
		field.appendChild(field.querySelector("li"));
		stop();
		window.setTimeout(function() {
			assert.equal(JSON.stringify(editor.pageData.hello), JSON.stringify([{item:"Hi world 2!"}, {item:"Hi world!"}]), "added item is found in data");
			assert.equal(field.querySelector("div").innerHTML, "Hi world 2!", "added item is found in DOM");
			assert.equal(field.querySelector("li + li div").innerHTML, "Hi world!", "added item is found in DOM");
			start();
		}, 5);
	});

	QUnit.test("databinding in 2nd degree list", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<ul data-simply-list="menu" data-simply-path="/"><template><li data-simply-list="items"><template><span data-simply-field="item">Menu item</span></template></li></template></ul>';
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
		var field = target.querySelector("ul");

		editor.currentData = data;
		editor.data.apply(data, document);
		editor.pageData = editor.currentData[document.location.pathname];
		field.dataBinding.resolve(true);

		assert.ok(document.querySelector("#testContent ul").dataBinding === editor.currentData['/']._bindings_.menu);
		assert.ok(document.querySelector("#testContent li").dataBinding === editor.currentData['/'].menu[0]._bindings_.items);
		assert.ok(document.querySelector("#testContent li > span").dataBinding === editor.currentData['/'].menu[0].items[0]._bindings_.item);

		assert.equal(document.querySelector("#testContent li > span").dataBinding.parentKey, "/menu/0/items/0/");
		assert.equal(document.querySelector("#testContent li + li > span").dataBinding.parentKey, "/menu/1/items/0/");
		assert.equal(document.querySelector("#testContent li > span + span").dataBinding.parentKey, "/menu/0/items/1/");
		assert.equal(document.querySelector("#testContent li + li > span + span").dataBinding.parentKey, "/menu/1/items/1/");
	});

	QUnit.test("databinding in 2nd degree list, reorder 2-depth items", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<ul data-simply-list="menu" data-simply-path="/"><template><li data-simply-list="items"><template><span data-simply-field="item">Menu item</span></template></li></template></ul>';
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
		var field = target.querySelector("ul");

		editor.data.apply(data, document);
		field.dataBinding.resolve(true);

		// reorder the 2-depth list items;
		field.querySelector("li").appendChild(field.querySelector("li > span"));
		field.querySelector("li+li").appendChild(field.querySelector("li + li > span"));

		assert.equal(document.querySelector("#testContent li > span").dataBinding.parentKey, "/menu/0/items/0/");
		assert.equal(document.querySelector("#testContent li + li > span").dataBinding.parentKey, "/menu/1/items/0/");
		assert.equal(document.querySelector("#testContent li > span + span").dataBinding.parentKey, "/menu/0/items/1/");
		assert.equal(document.querySelector("#testContent li + li > span + span").dataBinding.parentKey, "/menu/1/items/1/");
	});


	QUnit.test("databinding in 2nd degree list, reorder 1-depth items", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<ul data-simply-list="menu" data-simply-path="/"><template><li data-simply-list="items"><template><span data-simply-field="item">Menu item</span></template></li></template></ul>';
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
		var field = target.querySelector("ul");

		editor.currentData = data;
		editor.data.apply(data, document);
		field.dataBinding.resolve(true);

		// reorder the 1-depth list items;
		field.appendChild(field.querySelector("li"));
		assert.equal(document.querySelector("#testContent li").dataBinding.parentKey, "/menu/0/");
		assert.equal(document.querySelector("#testContent li + li").dataBinding.parentKey, "/menu/1/");
	});


	QUnit.test("databinding in 2nd degree list, reorder 1-depth with children", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<ul data-simply-list="menu" data-simply-path="/"><template><li data-simply-list="items"><template><span data-simply-field="item">Menu item</span></template></li></template></ul>';
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
		var field = target.querySelector("ul");

		editor.currentData = data;
		editor.data.apply(data, document);
		field.dataBinding.resolve(true);

		// reorder the 1-depth list items;
		field.appendChild(field.querySelector("li"));
		assert.equal(document.querySelector("#testContent li > span").dataBinding.parentKey, "/menu/0/items/0/");
		assert.equal(document.querySelector("#testContent li + li > span").dataBinding.parentKey, "/menu/1/items/0/");
		assert.equal(document.querySelector("#testContent li > span + span").dataBinding.parentKey, "/menu/0/items/1/");
		assert.equal(document.querySelector("#testContent li + li > span + span").dataBinding.parentKey, "/menu/1/items/1/");
	});

	QUnit.test("databinding for subkeys", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<div data-simply-path="/" data-simply-field="item.one"></div><div data-simply-path="/" data-simply-field="item.two"></div>';
		var data = {
			"/" : {}
		};
		editor.currentData = data;
		editor.data.apply(data, document);
		editor.currentData['/'].item = {
			one : "One",
			two : "Two"
		};
		document.querySelector("#testContent div").dataBinding.resolve(true);
		document.querySelector("#testContent div + div").dataBinding.resolve(true);

		assert.equal(document.querySelector("#testContent div").innerHTML, "One");
		assert.equal(document.querySelector("#testContent div + div").innerHTML, "Two");
	});

	QUnit.test("databinding for subkeyed lists", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<div data-simply-path="/" data-simply-list="item.one"><template><div data-simply-field="name"></div></template></div><div data-simply-path="/" data-simply-list="item.two"><template><div data-simply-field="name"></div></template></div>';
		var data = {
			"/" : {}
		};
		editor.currentData = data;
		editor.data.apply(data, document);
		editor.currentData['/'].item = {
			one : [{name : "One.1"}, {name : "One.2"}],
			two : [{name : "Two.1"}, {name : "Two.2"}],
		};
		document.querySelector("#testContent div[data-simply-list='item.one']").dataBinding.resolve(true);
		document.querySelector("#testContent div[data-simply-list='item.two']").dataBinding.resolve(true);

		assert.equal(document.querySelector("#testContent div[data-simply-list='item.one'] > div").innerHTML, "One.1");
		assert.equal(document.querySelector("#testContent div[data-simply-list='item.two'] > div").innerHTML, "Two.1");
	});

	QUnit.test("databinding for subkeys with preset data", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<div data-simply-path="/" data-simply-field="item.one"></div><div data-simply-path="/" data-simply-field="item.two"></div>';
		var data = {
			"/" : {
				item : {
					one : "1",
					two : "2"
				}
			}
		};
		editor.currentData = data;
		editor.data.apply(data, document);
		editor.currentData['/'].item = {
			one : "One",
			two : "Two"
		};
		document.querySelector("#testContent div").dataBinding.resolve(true);
		document.querySelector("#testContent div + div").dataBinding.resolve(true);

		assert.equal(document.querySelector("#testContent div").innerHTML, "One");
		assert.equal(document.querySelector("#testContent div + div").innerHTML, "Two");
	});

QUnit.module("responsive images");
	QUnit.test("responsive image width from ALT tag is ignored", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<img data-simply-src="bogus" alt="This is an alt tag">';
		assert.equal(editor.responsiveImages.getSizeRatio(document.querySelector("#testContent img")), 0);
	});


QUnit.module("data path");
	QUnit.test("unset data path", function(assert) {
		document.body.removeAttribute("data-simply-path");
		assert.equal(editor.data.getDataPath(document.querySelector("#testContent")), location.pathname);
	});

	QUnit.test("data path root", function(assert) {
		var basePath = location.pathname.replace(/(.*)\/.*?$/, "$1/");
		document.body.setAttribute("data-simply-path", "/");
		assert.equal(editor.data.getDataPath(document.querySelector("#testContent")), "/"); 
		document.body.removeAttribute("data-simply-path");
	});

	QUnit.test("relative data path", function(assert) {
		var basePath = location.pathname.replace(/(.*)\/.*?$/, "$1/");
		document.body.setAttribute("data-simply-path", "foo/");
		assert.equal(editor.data.getDataPath(document.querySelector("#testContent")), basePath + "foo/"); 
		document.body.removeAttribute("data-simply-path");
	});

	QUnit.test("relative data path decend one step", function(assert) {
		var basePath = location.pathname.replace(/(.*)\/.*?$/, "$1/");
		document.body.setAttribute("data-simply-path", "bar/../foo/");
		assert.equal(editor.data.getDataPath(document.querySelector("#testContent")), basePath + "foo/"); 
		document.body.removeAttribute("data-simply-path");
	});

	QUnit.test("relative data path from current, two deep", function(assert) {
		var basePath = location.pathname.replace(/(.*)\/.*?$/, "$1/");
		document.body.setAttribute("data-simply-path", "./foo/bar/");
		assert.equal(editor.data.getDataPath(document.querySelector("#testContent")), basePath + "foo/bar/"); 
		document.body.removeAttribute("data-simply-path");
	});

	QUnit.test("relative data path from current, two deep and back up", function(assert) {
		var basePath = location.pathname.replace(/(.*)\/.*?$/, "$1/");
		document.body.setAttribute("data-simply-path", "./foo/bar/../../");
		assert.equal(editor.data.getDataPath(document.querySelector("#testContent")), basePath); 
		document.body.removeAttribute("data-simply-path");
	});

	QUnit.test("relative data path with subkey", function(assert) {
		var basePath = location.pathname.replace(/(.*)\/.*?$/, "$1/");
		document.body.setAttribute("data-simply-path", "/bar/foo/");
		assert.equal(editor.data.getDataPath(document.querySelector("#testContent")), "/bar/foo/"); 
		document.body.removeAttribute("data-simply-path");
	});

	QUnit.test("not resolving when path has a slash", function(assert) {
		var basePath = location.pathname.replace(/(.*)\/.*?$/, "$1/");
		document.body.setAttribute("data-simply-path", "/bar/../foo/");
		assert.equal(editor.data.getDataPath(document.querySelector("#testContent")), "/bar/../foo/"); 
		document.body.removeAttribute("data-simply-path");
	});
