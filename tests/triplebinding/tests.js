QUnit.config.reorder = false;
simplyApp = {};
if (!simplyApp.rdfStore) {
	simplyApp.rdfStore = new $rdf.graph();
}

QUnit.test( "hello test", function( assert ) {
	assert.ok( 1 == "1", "Passed!" );
});

QUnit.module("Blank turtle file");
	QUnit.test("RDF store is filled with values from HTML", function(assert) {
		simplyApp = {};
		if (!simplyApp.rdfStore) {
			simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
<div data-simply-field="books" typeof="http://www.w3.org/1999/02/22-rdf-syntax-ns#Seq" data-simply-content="attributes" data-simply-attributes="about">
	<h3 data-simply-field="name" property="https://schema.org/name">My books</h3>
</div>
`;
		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.books = "https://example.com";
		editor.data.apply(editor.currentData, document);

		let name = simplyApp.rdfStore.match($rdf.sym("https://example.com"), $rdf.sym("https://schema.org/name"))[0].object.value;
		assert.equal(name, "My books")

		let type = simplyApp.rdfStore.match($rdf.sym("https://example.com"), $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"))[0].object.value;
		assert.equal(type,  "http://www.w3.org/1999/02/22-rdf-syntax-ns#Seq")
	});

	QUnit.test("blank turtle filled with values from HTML. Check turtle result;", function(assert) {
		simplyApp = {};
		if (!simplyApp.rdfStore) {
			simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
<div data-simply-field="books" typeof="http://www.w3.org/1999/02/22-rdf-syntax-ns#Seq" data-simply-content="attributes" data-simply-attributes="about">
	<h3 data-simply-field="name" property="https://schema.org/name">My books</h3>
</div>
`;
		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.books = "https://example.com";
		editor.data.apply(editor.currentData, document);

		let turtle = $rdf.serialize(undefined, simplyApp.rdfStore, editor.pageData.books, "text/turtle");
		let expectedTurtle = `@prefix : <#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schem: <https://schema.org/>.

<> a rdf:Seq; schem:name "My books".

`;
		assert.equal(turtle, expectedTurtle);
	});

	QUnit.test("RDF store filled with namespaced values from HTML", function(assert) {
		simplyApp = {};
		if (!simplyApp.rdfStore) {
			simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
<div data-simply-field="books" typeof="rdf:Seq" data-simply-content="attributes" data-simply-attributes="about">
	<h3 data-simply-field="name" property="schema:name">My books</h3>
</div>
`;
		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.books = "https://example.com";
		editor.data.apply(editor.currentData, document);

		let name = simplyApp.rdfStore.match($rdf.sym("https://example.com"), $rdf.sym("https://schema.org/name"))[0].object.value;
		assert.equal(name, "My books")

		let type = simplyApp.rdfStore.match($rdf.sym("https://example.com"), $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"))[0].object.value;
		assert.equal(type,  "http://www.w3.org/1999/02/22-rdf-syntax-ns#Seq")
	});

	QUnit.test("RDF store values are set from data", function(assert) {
		simplyApp = {};
		if (!simplyApp.rdfStore) {
			simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
      <div data-simply-field="books" typeof="rdf:Seq" data-simply-content="attributes" data-simply-attributes="about">
      <h1 data-simply-field="name" property="schema:name">My books</h1>
      <div class="bookSection" data-simply-list="bookSection" property="rdfs:member">
        <template>
          <div class="book" data-simply-field="value" typeof="schema:Book" data-simply-content="attributes" data-simply-attributes="about">
            <h2 data-simply-field="title" property="schema:title"></h2>
          </div>
        </template>
      </div>
    </div>
`;
		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.books = "https://example.com";
		editor.pageData.name = "My bookshelf";
		editor.data.apply(editor.currentData, document);

		let name = simplyApp.rdfStore.match($rdf.sym("https://example.com"), $rdf.sym("https://schema.org/name"))[0].object.value;
		assert.equal(name, "My bookshelf")

		let type = simplyApp.rdfStore.match($rdf.sym("https://example.com"), $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"))[0].object.value;
		assert.equal(type,  "http://www.w3.org/1999/02/22-rdf-syntax-ns#Seq")
		
		assert.equal(type,  "http://www.w3.org/1999/02/22-rdf-syntax-ns#Seq")
	});


	QUnit.test("blank turtle, set nested values from data", function(assert) {
		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
      <div data-simply-field="books" typeof="rdf:Seq" data-simply-content="attributes" data-simply-attributes="about">
      <h1 data-simply-field="name" property="schema:name">My books</h1>
      <div class="bookSection" data-simply-list="bookSection" property="rdfs:member">
        <template>
          <div class="book" data-simply-field="value" typeof="schema:Book" data-simply-content="attributes" data-simply-attributes="about">
            <h2 data-simply-field="title" property="schema:title"></h2>
          </div>
        </template>
      </div>
    </div>
`;
		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.books = "https://example.com";
		editor.pageData.name = "My bookshelf";
		editor.pageData.bookSection = [
			{
				"title" : "A nice book"
			}
		];
		editor.data.apply(editor.currentData, document);

		let name = simplyApp.rdfStore.match($rdf.sym("https://example.com"), $rdf.sym("https://schema.org/name"))[0].object.value;
		assert.equal(name, "My bookshelf")

		let type = simplyApp.rdfStore.match($rdf.sym("https://example.com"), $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"))[0].object.value;
		assert.equal(type,  "http://www.w3.org/1999/02/22-rdf-syntax-ns#Seq")

		const done = assert.async();
		window.setTimeout(function() {
			assert.equal(simplyApp.rdfStore.statements.length, 5, "Expect triples for name, type, member, title");		
			let member = simplyApp.rdfStore.match($rdf.sym("https://example.com"), $rdf.sym("http://www.w3.org/2000/01/rdf-schema#member"))[0].object;
			assert.equal(member.termType, "Collection");
			assert.equal(member.elements.length, 1);
			assert.equal(member.elements[0].termType, "BlankNode");
			
			let bookType = simplyApp.rdfStore.match(member.elements[0], $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"))[0].object.value;
			assert.equal(bookType, "https://schema.org/Book");

			let bookTitle = simplyApp.rdfStore.match(member.elements[0], $rdf.sym("https://schema.org/title"))[0].object.value;
			assert.equal(bookTitle, "A nice book");
			done();
		}, 10);
	});

	QUnit.test("blank turtle, set nested values from data. check turtle result", function(assert) {
		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
      <div data-simply-field="books" typeof="rdf:Seq" data-simply-content="attributes" data-simply-attributes="about">
      <h1 data-simply-field="name" property="schema:name">My books</h1>
      <div class="bookSection" data-simply-list="bookSection" property="rdfs:member">
        <template>
          <div class="book" data-simply-field="value" typeof="schema:Book" data-simply-content="attributes" data-simply-attributes="about">
            <h2 data-simply-field="title" property="schema:title"></h2>
          </div>
        </template>
      </div>
    </div>
`;
		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.books = "https://example.com";
		editor.pageData.name = "My bookshelf";
		editor.pageData.bookSection = [
			{
				"title" : "A nice book"
			}
		];
		editor.data.apply(editor.currentData, document);

		const done = assert.async();
		window.setTimeout(function() {
			let turtle = $rdf.serialize(undefined, simplyApp.rdfStore, editor.pageData.books, "text/turtle");
			let expectedTurtle = `@prefix : <#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix schem: <https://schema.org/>.

<>
    a rdf:Seq;
    rdfs:member ( [ a schem:Book; schem:title \"A nice book\" ] );
    schem:name \"My bookshelf\".
`
			assert.equal(turtle, expectedTurtle);
			done();
		}, 10);
	});

QUnit.module("Read turtle file");
	QUnit.test("read turtle values, expect unchanged turtle", async function(assert) {
		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
<div data-simply-field="books" typeof="rdf:Seq" data-simply-content="attributes" data-simply-attributes="about">
  <h3 data-simply-field="name" property="schema:name">My books</h3>
</div>
`;
		let initialTurtle = `@prefix : <#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schem: <https://schema.org/>.

<> a rdf:Seq; schem:name "Hello world".
`;
		await $rdf.parse(
		    initialTurtle,
		    simplyApp.rdfStore,
		    "https://example.com",
		    "text/turtle"
		);

		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.books = "https://example.com";
		editor.data.apply(editor.currentData, document);

		let turtle = $rdf.serialize(undefined, simplyApp.rdfStore, editor.pageData.books, "text/turtle");
		let expectedTurtle = `@prefix : <#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schem: <https://schema.org/>.

<> a rdf:Seq; schem:name "Hello world".

`;
		assert.equal(turtle, expectedTurtle);
	});

	QUnit.test("turtle values are set in the HTML", async function(assert) {
		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
<div data-simply-field="books" typeof="rdf:Seq" data-simply-content="attributes" data-simply-attributes="about">
  <h3 data-simply-field="name" property="schema:name">My books</h3>
</div>
`;
		let initialTurtle = `@prefix : <#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix schem: <https://schema.org/>.

<> a rdf:Seq; schem:name "Hello world".
`;
		await $rdf.parse(
		    initialTurtle,
		    simplyApp.rdfStore,
		    "https://example.com",
		    "text/turtle"
		);

		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.books = "https://example.com";
		editor.data.apply(editor.currentData, document);

		const done = assert.async();
		window.setTimeout(function() {
			assert.equal(editor.pageData.name, "Hello world", "Value is set from turtle to data");
			assert.equal(document.querySelector("h3").innerHTML, "Hello world", "Value is set from turtle to HTML");
			done();
		}, 100);
	});

	QUnit.test("restaurant turtle with menusections, turtle is unmodified", async function(assert) {
		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}

		const done = assert.async();
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
<section typeof="https://schema.org/Restaurant" data-simply-field="restaurant" data-simply-content="attributes" data-simply-attributes="about">
  <h1>Edit a restaurant</h1>
  <p><span data-simply-field="restaurant"></span></p>
  <div class="field">
    <label>
      Restaurant name
      <input type="text" data-simply-field="name" property="https://schema.org/name">
    </label>
  </div>
  <div class="field">
    <label>
      Description, what kind of food to expect here
      <textarea data-simply-field="description" property="https://schema.org/description"></textarea>
    </label>
  </div>
  <div class="menu" data-simply-field="menu" property="https://schema.org/hasMenu" data-simply-content="attributes" data-simply-attributes="about">
    <h2>The menu</h2>
    <div data-simply-list="menuSections" property="https://schema.org/hasMenuSection">
      <template>
        <div class="menuSection" data-simply-field="value" typeof="https://schema.org/menuSection" data-simply-content="attributes" data-simply-attributes="about">
          <div class="field">
            <input data-simply-field="title" property="https://schema.org/name">
          </div>
        </div>
      </template>
    </div>
  </div>
</section>
`;
		target.appendChild(field);

		let initialTurtle = `@prefix : <#>.
@prefix schem: <https://schema.org/>.

<>
    a schem:Restaurant;
    schem:description "Lekkere broodjes";
    schem:hasMenu
            [
                a schem:Menu;
                schem:hasMenuSection
                [ a schem:MenuSection; schem:name "Broodjes" ]
            ];
    schem:name "Broodje Ben".
`;
		await $rdf.parse(
		    initialTurtle,
		    simplyApp.rdfStore,
		    "https://example.com",
		    "text/turtle"
		);

		editor.currentData = {};
		editor.pageData.restaurant = "https://example.com";
		editor.data.apply(editor.currentData, document);
		window.setTimeout(function() {
			let turtle = $rdf.serialize(undefined, simplyApp.rdfStore, editor.pageData.restaurant, "text/turtle");
			assert.equal(turtle, initialTurtle);
			done();
		}, 100);
	});

	QUnit.test("restaurant turtle with menusections, about is set on the 'menu'", async function(assert) {
		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}

		const done = assert.async();
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
<section typeof="https://schema.org/Restaurant" data-simply-field="restaurant" data-simply-content="attributes" data-simply-attributes="about">
  <h1>Edit a restaurant</h1>
  <p><span data-simply-field="restaurant"></span></p>
  <div class="field">
    <label>
      Restaurant name
      <input type="text" data-simply-field="name" property="https://schema.org/name">
    </label>
  </div>
  <div class="field">
    <label>
      Description, what kind of food to expect here
      <textarea data-simply-field="description" property="https://schema.org/description"></textarea>
    </label>
  </div>
  <div class="menu" data-simply-field="menu" property="https://schema.org/hasMenu" data-simply-content="attributes" data-simply-attributes="about">
    <h2>The menu</h2>
    <div data-simply-list="menuSections" property="https://schema.org/hasMenuSection">
      <template>
        <div class="menuSection" data-simply-field="value" typeof="https://schema.org/menuSection" data-simply-content="attributes" data-simply-attributes="about">
          <div class="field">
            <input data-simply-field="title" property="https://schema.org/name">
          </div>
        </div>
      </template>
    </div>
  </div>
</section>
`;
		target.appendChild(field);

		let initialTurtle = `@prefix : <#>.
@prefix schem: <https://schema.org/>.

<>
    a schem:Restaurant;
    schem:description "Lekkere broodjes";
    schem:hasMenu
            [
                a schem:Menu;
                schem:hasMenuSection
                [ a schem:MenuSection; schem:name "Broodjes" ]
            ];
    schem:name "Broodje Ben".
`;
		await $rdf.parse(
		    initialTurtle,
		    simplyApp.rdfStore,
		    "https://example.com",
		    "text/turtle"
		);

		editor.currentData = {};
		editor.pageData.restaurant = "https://example.com";
		editor.data.apply(editor.currentData, document);
		window.setTimeout(function() {
			let menuNode = simplyApp.rdfStore.match($rdf.sym("https://example.com"), $rdf.sym("https://schema.org/hasMenu"))[0].object.value;
			assert.equal("[_:" + menuNode + "]", editor.pageData.menu);
			assert.equal(editor.pageData.menu, document.querySelector(".menu").getAttribute("about"), "About is set on the menu");
			assert.equal(editor.pageData.menuSections[0].title, "Broodjes", "menuSection name is in the HTML");
			assert.equal(editor.pageData.menuSections[0].value, document.querySelector(".menuSection").getAttribute("about"), "About is set on the menuSection");
			done();
		}, 100);
	});

	QUnit.test("restaurant turtle with menusections and menuitems", async function(assert) {
		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}

		const done = assert.async();
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
<section typeof="https://schema.org/Restaurant" data-simply-field="restaurant" data-simply-content="attributes" data-simply-attributes="about">
  <h1>Edit a restaurant</h1>
  <p><span data-simply-field="restaurant"></span></p>
  <div class="field">
    <label>
      Restaurant name
      <input type="text" data-simply-field="name" property="https://schema.org/name">
    </label>
  </div>
  <div class="field">
    <label>
      Description, what kind of food to expect here
      <textarea data-simply-field="description" property="https://schema.org/description"></textarea>
    </label>
  </div>
  <div class="menu" data-simply-field="menu" property="https://schema.org/hasMenu" data-simply-content="attributes" data-simply-attributes="about">
    <h2>The menu</h2>
    <div data-simply-list="menuSections" property="https://schema.org/hasMenuSection">
      <template>
        <div class="menuSection" data-simply-field="value" typeof="https://schema.org/menuSection" data-simply-content="attributes" data-simply-attributes="about">
          <div class="field">
            <input data-simply-field="title" property="https://schema.org/name">
          </div>
          <div data-simply-list="products" property="https://schema.org/hasMenuItem">
            <template>
              <div class="menuItem field" data-simply-field="value" property="https://schema.org/hasMenuItem" typeof="https://schema.org/MenuItem" data-simply-content="attributes" data-simply-attributes="about">
                <input data-simply-field="title" property="https://schema.org/name">
                <!-- input data-simply-field="beschrijving" property="https://schema.org/description" -->
                <span data-simply-field="offer" typeof="https://schema.org/offer" property="https://schema.org/offers" data-simply-content="attributes" data-simply-attributes="about">
                  <input data-simply-field="prijs" property="https://schema.org/price">
                </span>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</section>
`;
		target.appendChild(field);

		let initialTurtle = `@prefix : <#>.
@prefix schem: <https://schema.org/>.

<>
    a schem:Restaurant;
    schem:description "Lekkere broodjes";
    schem:hasMenu
            [
                a schem:Menu;
                schem:hasMenuSection
                        [
                            a schem:MenuSection;
                            schem:hasMenuItem
                                    [
                                        a schem:MenuItem;
                                        schem:description "Kip en lekkers";
                                        schem:name "Broodje kip";
                                        schem:offers
                                        [ a schem:offer; schem:price "5" ]
                                    ],
                                    [
                                        a schem:MenuItem;
                                        schem:description "Vis en lekkers";
                                        schem:name "Broodje vis";
                                        schem:offers
                                        [ a schem:offer; schem:price "6" ]
                                    ],
                                    [
                                        a schem:MenuItem;
                                        schem:description "Vlees en lekkers";
                                        schem:name "Broodje vlees";
                                        schem:offers
                                        [ a schem:offer; schem:price "4" ]
                                    ];
                            schem:name "Broodjes"
                        ]
            ];
    schem:name "Broodje Ben".
`;
		await $rdf.parse(
		    initialTurtle,
		    simplyApp.rdfStore,
		    "https://example.com",
		    "text/turtle"
		);

		editor.currentData = {};
		editor.pageData.restaurant = "https://example.com";
		editor.data.apply(editor.currentData, document);
		window.setTimeout(function() {
			// FIXME: Get turtle contents and check it
			let turtle = $rdf.serialize(undefined, simplyApp.rdfStore, editor.pageData.restaurant, "text/turtle");
			assert.equal(turtle, initialTurtle);
			done();
		}, 100);
	});

	QUnit.test("restaurant turtle with menusections and menuitems", async function(assert) {
		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}

		const done = assert.async();
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
<section typeof="https://schema.org/Restaurant" data-simply-field="restaurant" data-simply-content="attributes" data-simply-attributes="about">
  <h1>Edit a restaurant</h1>
  <p><span data-simply-field="restaurant"></span></p>
  <div class="field">
    <label>
      Restaurant name
      <input type="text" data-simply-field="name" property="https://schema.org/name">
    </label>
  </div>
  <div class="field">
    <label>
      Description, what kind of food to expect here
      <textarea data-simply-field="description" property="https://schema.org/description"></textarea>
    </label>
  </div>
  <div class="menu" data-simply-field="menu" property="https://schema.org/hasMenu" data-simply-content="attributes" data-simply-attributes="about">
    <h2>The menu</h2>
    <div data-simply-list="menuSections" property="https://schema.org/hasMenuSection">
      <template>
        <div class="menuSection" data-simply-field="value" typeof="https://schema.org/menuSection" data-simply-content="attributes" data-simply-attributes="about">
          <div class="field">
            <input data-simply-field="title" property="https://schema.org/name">
          </div>
          <div data-simply-list="products" property="https://schema.org/hasMenuItem">
            <template>
              <div class="menuItem field" data-simply-field="value" property="https://schema.org/hasMenuItem" typeof="https://schema.org/MenuItem" data-simply-content="attributes" data-simply-attributes="about">
                <input data-simply-field="title" property="https://schema.org/name">
                <!-- input data-simply-field="beschrijving" property="https://schema.org/description" -->
                <span data-simply-field="offer" typeof="https://schema.org/offer" property="https://schema.org/offers" data-simply-content="attributes" data-simply-attributes="about">
                  <input data-simply-field="prijs" property="https://schema.org/price">
                </span>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</section>
`;
		target.appendChild(field);

		let initialTurtle = `@prefix : <#>.
@prefix schem: <https://schema.org/>.

<>
    a schem:Restaurant;
    schem:description "Lekkere broodjes";
    schem:hasMenu
            [
                a schem:Menu;
                schem:hasMenuSection
                        [
                            a schem:MenuSection;
                            schem:hasMenuItem
                                    [
                                        a schem:MenuItem;
                                        schem:description "Kip en lekkers";
                                        schem:name "Broodje kip";
                                        schem:offers
                                        [ a schem:offer; schem:price "5" ]
                                    ],
                                    [
                                        a schem:MenuItem;
                                        schem:description "Vis en lekkers";
                                        schem:name "Broodje vis";
                                        schem:offers
                                        [ a schem:offer; schem:price "6" ]
                                    ],
                                    [
                                        a schem:MenuItem;
                                        schem:description "Vlees en lekkers";
                                        schem:name "Broodje vlees";
                                        schem:offers
                                        [ a schem:offer; schem:price "4" ]
                                    ];
                            schem:name "Broodjes"
                        ]
            ];
    schem:name "Broodje Ben".
`;
		await $rdf.parse(
		    initialTurtle,
		    simplyApp.rdfStore,
		    "https://example.com",
		    "text/turtle"
		);

		editor.currentData = {};
		editor.pageData.restaurant = "https://example.com";
		editor.data.apply(editor.currentData, document);
		window.setTimeout(function() {
                        assert.equal(editor.pageData.menuSections[0].title, "Broodjes");
                        assert.equal(editor.pageData.menuSections[0].products[0].title, "Broodje kip");
                        assert.equal(editor.pageData.menuSections[0].products[0].prijs, "5");
                        assert.equal(editor.pageData.menuSections[0].products[1].title, "Broodje vis");
                        assert.equal(editor.pageData.menuSections[0].products[1].prijs, "6");
			done();
		}, 100);
	});

	QUnit.test("todo list example, set checkbox", async function(assert) {
		const done = assert.async();

		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
      <div data-simply-field="todo" typeof="rdf:Seq" data-simply-content="attributes" data-simply-attributes="about">
      <h3 data-simply-field="name" property="schema:name">My Todo List</h3>
      <div data-simply-list="todoItems" property="rdfs:member">
        <template>
          <div class="todoItem" data-simply-field="value" typeof="ical:Vtodo" data-simply-content="attributes" data-simply-attributes="about">
            <input data-simply-field="completed" type="checkbox" property="ical:completed" data-simply-transformer="dateNow">
            <input data-simply-field="name" property="schema:name">
          </div>
        </template>
      </div>
`;

                editor.transformers.dateNow = {
			render : function(data) {
				if (data) {
					return 1;
				} else {
					return 0;
				}
			},
			extract : function(data) {
				if (data == 1) {
				return $rdf.Literal.fromDate(new Date(1722023424604));
				} else {
					return;
				}
	        	}
	        };

		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.todo = "https://example.com";
		editor.pageData.todoItems = [
		    {
		        "name" : "Todo item 1"
                    },
                    {
                        "name" : "Todo item 2"
                    }
                ];
		editor.data.apply(editor.currentData, document);

		document.querySelector("#testContent input").checked = true 
       		editor.fireEvent("change", document.querySelector("#testContent input"));
		
		let expectedTurtle = `@prefix : <#>.
@prefix cal: <http://www.w3.org/2002/12/cal/ical#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix schem: <https://schema.org/>.

<>
    a rdf:Seq;
    rdfs:member
            (
                    [
                        a cal:Vtodo;
                        cal:completed "2024-07-26T19:50:24Z"^^xsd:dateTime;
                        schem:name "Todo item 1"
                    ]
            [ a cal:Vtodo; schem:name "Todo item 2" ] );
    schem:name "My Todo List".
`;
        	window.setTimeout(function() {
        		let turtle = $rdf.serialize(undefined, simplyApp.rdfStore, editor.pageData.todo, "text/turtle");
        		assert.equal(turtle, expectedTurtle);
			done();
		}, 100);
	});

	QUnit.test("todo list example, unset checkbox", async function(assert) {
		const done = assert.async();

		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
      <div data-simply-field="todo" typeof="rdf:Seq" data-simply-content="attributes" data-simply-attributes="about">
      <h3 data-simply-field="name" property="schema:name">My Todo List</h3>
      <div data-simply-list="todoItems" property="rdfs:member">
        <template>
          <div class="todoItem" data-simply-field="value" typeof="ical:Vtodo" data-simply-content="attributes" data-simply-attributes="about">
            <input data-simply-field="completed" type="checkbox" property="ical:completed" data-simply-transformer="dateNow">
            <input data-simply-field="name" property="schema:name">
          </div>
        </template>
      </div>
`;

                editor.transformers.dateNow = {
			render : function(data) {
				if (data) {
					return 1;
				} else {
					return 0;
				}
			},
			extract : function(data) {
				if (data == 1) {
				        return $rdf.Literal.fromDate(new Date(1722023424604));
				} else {
					return;
				}
	        	}
	        };

		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.todo = "https://example.com";
		editor.pageData.todoItems = [
		    {
		        "name" : "Todo item 1",
		        "completed" : 1
                    },
                    {
                        "name" : "Todo item 2"
                    }
                ];
		editor.data.apply(editor.currentData, document);

		
		let expectedTurtle = `@prefix : <#>.
@prefix cal: <http://www.w3.org/2002/12/cal/ical#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix schem: <https://schema.org/>.

<>
    a rdf:Seq;
    rdfs:member
            ( [ a cal:Vtodo; schem:name "Todo item 1" ]
            [ a cal:Vtodo; schem:name "Todo item 2" ] );
    schem:name "My Todo List".
`;
        	window.setTimeout(function() {
        		document.querySelector("#testContent input").checked = false;
        		editor.fireEvent("change", document.querySelector("#testContent input"));
        		window.setTimeout(function() {
                		let turtle = $rdf.serialize(undefined, simplyApp.rdfStore, editor.pageData.todo, "text/turtle");
                		assert.equal(turtle, expectedTurtle);
	               		done();
                        }, 500); // FIXME: going too early, at 100ms, will give a rdf:Seq as the type for the todoItem instead of ical:Vtodo
		}, 500);
	});

	QUnit.test("todo list example, reorder in HTML reflects in turtle", async function(assert) {
		const done = assert.async();

		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
      <div data-simply-field="todo" typeof="rdf:Seq" data-simply-content="attributes" data-simply-attributes="about">
      <h3 data-simply-field="name" property="schema:name">My Todo List</h3>
      <div data-simply-list="todoItems" property="rdfs:member">
        <template>
          <div class="todoItem" data-simply-field="value" typeof="ical:Vtodo" data-simply-content="attributes" data-simply-attributes="about">
            <input data-simply-field="completed" type="checkbox" property="ical:completed" data-simply-transformer="dateNow">
            <input data-simply-field="name" property="schema:name">
          </div>
        </template>
      </div>
`;

                editor.transformers.dateNow = {
			render : function(data) {
				if (data) {
					return 1;
				} else {
					return 0;
				}
			},
			extract : function(data) {
				if (data == 1) {
				        return $rdf.Literal.fromDate(new Date(1722023424604));
				} else {
					return;
				}
	        	}
	        };

		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.todo = "https://example.com";
		editor.pageData.todoItems = [
		    {
		        "name" : "Todo item 1",
                    },
                    {
                        "name" : "Todo item 2"
                    }
                ];
		editor.data.apply(editor.currentData, document);
		
		let expectedTurtle = `@prefix : <#>.
@prefix cal: <http://www.w3.org/2002/12/cal/ical#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix schem: <https://schema.org/>.

<>
    a rdf:Seq;
    rdfs:member
            ( [ a cal:Vtodo; schem:name "Todo item 2" ]
            [ a cal:Vtodo; schem:name "Todo item 1" ] );
    schem:name "My Todo List".
`;
        	window.setTimeout(function() {
        	        let firstItem = document.querySelector("#testContent .todoItem");
        	        firstItem.parentNode.appendChild(firstItem);
        		window.setTimeout(function() {
                		let turtle = $rdf.serialize(undefined, simplyApp.rdfStore, editor.pageData.todo, "text/turtle");
                		assert.equal(turtle, expectedTurtle);
	               		done();
                        }, 200);
		}, 200);
	});

	QUnit.test("todo list example, push todoItem to data reflects in turtle", async function(assert) {
		const done = assert.async();

		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
      <div data-simply-field="todo" typeof="rdf:Seq" data-simply-content="attributes" data-simply-attributes="about">
      <h3 data-simply-field="name" property="schema:name">My Todo List</h3>
      <div data-simply-list="todoItems" property="rdfs:member">
        <template>
          <div class="todoItem" data-simply-field="value" typeof="ical:Vtodo" data-simply-content="attributes" data-simply-attributes="about">
            <input data-simply-field="completed" type="checkbox" property="ical:completed" data-simply-transformer="dateNow">
            <input data-simply-field="name" property="schema:name">
          </div>
        </template>
      </div>
`;

                editor.transformers.dateNow = {
			render : function(data) {
				if (data) {
					return 1;
				} else {
					return 0;
				}
			},
			extract : function(data) {
				if (data == 1) {
				        return $rdf.Literal.fromDate(new Date(1722023424604));
				} else {
					return;
				}
	        	}
	        };

		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.todo = "https://example.com";
		editor.pageData.todoItems = [
		    {
		        "name" : "Todo item 1",
                    },
                    {
                        "name" : "Todo item 2"
                    }
                ];
		editor.data.apply(editor.currentData, document);
		
		let expectedTurtle = `@prefix : <#>.
@prefix cal: <http://www.w3.org/2002/12/cal/ical#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix schem: <https://schema.org/>.

<>
    a rdf:Seq;
    rdfs:member
            ( [ a cal:Vtodo; schem:name "Todo item 1" ]
            [ a cal:Vtodo; schem:name "Todo item 2" ]
            [ a cal:Vtodo; schem:name "Todo item 3" ] );
    schem:name "My Todo List".
`;
        	window.setTimeout(function() {
        		editor.pageData.todoItems.push({
        			"name" : "Todo item 3"
			});
        		window.setTimeout(function() {
                		let turtle = $rdf.serialize(undefined, simplyApp.rdfStore, editor.pageData.todo, "text/turtle");
                		assert.equal(turtle, expectedTurtle);
	               		done();
                        }, 500); // FIXME: This needs a big delay, can we get it faster?
		}, 500);
	});

	QUnit.test("todo list example, delete in HTML reflects in turtle", async function(assert) {
		const done = assert.async();

		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
      <div data-simply-field="todo" typeof="rdf:Seq" data-simply-content="attributes" data-simply-attributes="about">
      <h3 data-simply-field="name" property="schema:name">My Todo List</h3>
      <div data-simply-list="todoItems" property="rdfs:member">
        <template>
          <div class="todoItem" data-simply-field="value" typeof="ical:Vtodo" data-simply-content="attributes" data-simply-attributes="about">
            <input data-simply-field="completed" type="checkbox" property="ical:completed" data-simply-transformer="dateNow">
            <input data-simply-field="name" property="schema:name">
          </div>
        </template>
      </div>
`;

                editor.transformers.dateNow = {
			render : function(data) {
				if (data) {
					return 1;
				} else {
					return 0;
				}
			},
			extract : function(data) {
				if (data == 1) {
				        return $rdf.Literal.fromDate(new Date(1722023424604));
				} else {
					return;
				}
	        	}
	        };

		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.todo = "https://example.com";
		editor.pageData.todoItems = [
		    {
		        "name" : "Todo item 1",
                    },
                    {
                        "name" : "Todo item 2"
                    }
                ];
		editor.data.apply(editor.currentData, document);
		
		let expectedTurtle = `@prefix : <#>.
@prefix cal: <http://www.w3.org/2002/12/cal/ical#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix schem: <https://schema.org/>.

<>
    a rdf:Seq;
    rdfs:member ( [ a cal:Vtodo; schem:name "Todo item 2" ] );
    schem:name "My Todo List".
`;
        	window.setTimeout(function() {
        	        let firstItem = document.querySelector("#testContent .todoItem");
        	        firstItem.parentNode.removeChild(firstItem);
        		window.setTimeout(function() {
                		let turtle = $rdf.serialize(undefined, simplyApp.rdfStore, editor.pageData.todo, "text/turtle");
                		assert.equal(turtle, expectedTurtle);
	               		done();
                        }, 200);
		}, 200);
	});

	QUnit.test("todo list example, delete in data reflects in turtle", async function(assert) {
		const done = assert.async();

		simplyApp = {};
		if (!simplyApp.rdfStore) {
		  simplyApp.rdfStore = new $rdf.graph();
		}
		var target = document.querySelector("#testContent");
		target.innerHTML = '';

		var field = document.createElement("main");
		field.innerHTML = `
      <div data-simply-field="todo" typeof="rdf:Seq" data-simply-content="attributes" data-simply-attributes="about">
      <h3 data-simply-field="name" property="schema:name">My Todo List</h3>
      <div data-simply-list="todoItems" property="rdfs:member">
        <template>
          <div class="todoItem" data-simply-field="value" typeof="ical:Vtodo" data-simply-content="attributes" data-simply-attributes="about">
            <input data-simply-field="completed" type="checkbox" property="ical:completed" data-simply-transformer="dateNow">
            <input data-simply-field="name" property="schema:name">
          </div>
        </template>
      </div>
`;

                editor.transformers.dateNow = {
			render : function(data) {
				if (data) {
					return 1;
				} else {
					return 0;
				}
			},
			extract : function(data) {
				if (data == 1) {
				        return $rdf.Literal.fromDate(new Date(1722023424604));
				} else {
					return;
				}
	        	}
	        };

		target.appendChild(field);
		editor.currentData = {};
		editor.pageData.todo = "https://example.com";
		editor.pageData.todoItems = [
		    {
		        "name" : "Todo item 1",
                    },
                    {
                        "name" : "Todo item 2"
                    }
                ];
		editor.data.apply(editor.currentData, document);
		
		let expectedTurtle = `@prefix : <#>.
@prefix cal: <http://www.w3.org/2002/12/cal/ical#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix schem: <https://schema.org/>.

<>
    a rdf:Seq;
    rdfs:member ( [ a cal:Vtodo; schem:name "Todo item 2" ] );
    schem:name "My Todo List".
`;
        	window.setTimeout(function() {
        	        let firstItem = document.querySelector("#testContent .todoItem");
        	        editor.pageData.todoItems.shift();
        		window.setTimeout(function() {
                		let turtle = $rdf.serialize(undefined, simplyApp.rdfStore, editor.pageData.todo, "text/turtle");
                		assert.equal(turtle, expectedTurtle);
	               		done();
                        }, 200);
		}, 200);
	});

