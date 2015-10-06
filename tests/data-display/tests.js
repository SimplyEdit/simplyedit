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
		var data = {
			src : "http://www.muze.nl/logo.gif",
			test : "test"
		};

		editor.field.set(field, data);
		assert.equal(field.getAttribute("src"), data.src, "image src is set correctly");
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

QUnit.module("editor field get");

	QUnit.test("field get img data", function(assert) {
		var field = document.createElement("IMG");
		var data = {
			src : "http://www.muze.nl/logo.gif",
			title : "Title",
			alt : "Alt",
			"class" : "class test"
		};
		editor.field.set(field, data);
		var result = editor.field.get(field);

		assert.ok(result, "got result");
		assert.equal(result.src, data.src, "result is same as inserted data");
		assert.equal(result.title, data.title, "result is same as inserted data");
		assert.equal(result.alt, data.alt, "result is same as inserted data");
		assert.equal(result["class"], data["class"], "result is same as inserted data");
	});

	QUnit.test("field get img data", function(assert) {
		var field = document.createElement("IMG");
		var data = {
			src : "http://www.muze.nl/logo.gif",
			other : "other"
		};
		editor.field.set(field, data);
		var result = editor.field.get(field);

		assert.ok(result, "got result");
		assert.equal(result.src, data.src, "src is same as inserted data");
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

QUnit.module("editor data apply");

	QUnit.test("apply title", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-vedor-field='title'>Wrong content</div>";
		var data = {};
		data[location.pathname] = {
			"title" : "Test title"
		};
		editor.data.apply(data, target);

		assert.equal(document.querySelector("#testContent div").innerHTML, "Test title", "simple data vedor field set correctly");
	});

	QUnit.test("apply title with path", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-vedor-field='title' data-vedor-path='/'>Wrong content</div>";
		var data = {
			"/" : {
				"title" : "Test title"
			}
		};
		editor.data.apply(data, target);

		assert.equal(document.querySelector("#testContent div").innerHTML, "Test title", "simple data vedor field set correctly");
	});

	QUnit.test("apply list", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<ul data-vedor-list='menu' data-vedor-path='/'><template><li data-vedor-field='item'>Menu item</li></template></ul>";
		var data = {
			"/" : {
				"menu" : [
					{"item" : "Home"},
					{"item" : "Second item"}
				]
			}
		};
		editor.data.apply(data, target);
		assert.notOk(document.querySelector("#testContent ul").className.match(/vedor-empty/), "vedor-empty is set on empty list");
		assert.equal(document.querySelector("#testContent ul > li").innerHTML, "Home", "Home item was found");
		assert.equal(document.querySelector("#testContent ul > li + li").innerHTML, "Second item", "Second item was found");
	});

	QUnit.test("apply empty list", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<ul data-vedor-list='menu' data-vedor-path='/'><template><li data-vedor-field='item'>Menu item</li></template></ul>";
		var data = {
			"/" : {
				"menu" : [
				]
			}
		};
		editor.data.apply(data, target);

		assert.ok(document.querySelector("#testContent ul").className.match(/vedor-empty/), "vedor-empty is set on empty list");
	});

	QUnit.test("apply 2nd degree list", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<ul data-vedor-list="menu" data-vedor-path="/"><template><li data-vedor-list="items"><template><span data-vedor-field="item">Menu item</span></template></li></template></ul>';
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
		target.innerHTML = "<div data-vedor-field='title'>Test title</div>";
		var data = editor.data.get(target);

		assert.equal(data[location.pathname].title, "Test title", "title found in data");
	});

	QUnit.test("get data on document", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-vedor-field='title'>Test title</div>";
		var data = editor.data.get(document);

		assert.equal(data[location.pathname].title, "Test title", "title found in data");
	});

	QUnit.test("get title with path", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "<div data-vedor-field='title' data-vedor-path='/'>Test title</div>";
		var data = editor.data.get(target);

		assert.equal(data["/"].title, "Test title", "title for / found");
	});

	QUnit.test("get list", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<ul data-vedor-list="menu" data-vedor-path="/"><template><li data-vedor-field="item">Menu item</li></template></ul>';
		var data = {
			"/" : {
				"menu" : [
					{"item" : "Home"},
					{"item" : "Second item"}
				]
			}
		};
		editor.data.apply(data, target);
		var result = editor.data.get(target);

		assert.equal(JSON.stringify(result), JSON.stringify(data), "source and result data are the same");
	});

	QUnit.test("get 2nd degree list", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<ul data-vedor-list="menu" data-vedor-path="/"><template><li data-vedor-list="items"><template><span data-vedor-field="item">Menu item</span></template></li></template></ul>';
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

		var result = editor.data.get(target);
		assert.equal(JSON.stringify(result), JSON.stringify(data), "source and result data are the same");
	});

	QUnit.test("get 2nd degree list deeper structure", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = '<ul data-vedor-list="menu" data-vedor-path="/"><template><li data-vedor-list="items"><template><a><span data-vedor-field="item">Menu item</span></a></template></li></template></ul>';
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

		var result = editor.data.get(target);
		assert.equal(JSON.stringify(result), JSON.stringify(data), "source and result data are the same");
	});

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

QUnit.module("editor list fixFirstElementChild");
	QUnit.test("get title", function(assert) {
		var target = document.querySelector("#testContent");
		target.innerHTML = "Test 123 <div data-vedor-field='title'>Test title</div>";
		editor.data.list.fixFirstElementChild(target);
		
		assert.equal(target.firstElementChild.nodeType, 1, "First child is an element");
		assert.equal(target.firstElementChild.innerHTML, "Test title", "First child innerHTML found");
		assert.equal(target.firstElementChild.getAttribute("data-vedor-field"), "title", "First child getAttribute");
	});
