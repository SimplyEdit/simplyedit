/*
	core javascript library for muze modules
	----------------------------------------

	object namespace(string module, function implementaion)
		This method checks if the namespace 'module' is available, and if not
		creates it and registers it. It returns the object the namespace points
		to, so you can create a shorthand for it.
		If you specify an implementation method, this method will be called with
		'this' pointing to the namespace object.
		examples:
			muze.namespace('muze.test');	
			
			var myMod = muze.namespace('muze.temp.my.module.with.a.long.name');
			
			muze.namespace('muze.test', function() { this.test = function() { alert 'test'; } }  );

	object require(mixed modules, function continuation) 
		This method checks if the given module is available (registered).
		If not, it will try to load the module, if it can or throw an error with the 
		missing module, and return false.
		If it is available, it will return the module object, for a single module.
		If a continuation function is supplied, that function will be called if and when the
		required namespaces are available. 
		If you require multiple modules, pass an array with all required modules or a string 
		with all modules seperated with a ','. Extra spaces will be trimmed of.
		You can specify a url for any given module instead of a module name or in addition of
		a module name by seperating them with a '|' character:
			muze.require('jquery|//ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js', ...)
			muze.require('//ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js', ...)
		
		muze.require('module.not.available');
		
		will throw an error, so you can do this:
		
		try {
			muze.require('muze.event');
			// do stuff
		} catch(e) {
			// module is not available
		}

		or:
		
		muze.require('muze.event, muze.env', function() {
			// do stuff, this function is called in the global scope
		});
		
	object include(string url, string namespace)
		This method checks whether the given namespace is already registered. If
		so it doesn't do anything.
		If the namespace is not registered (or not entered), it dynamically loads
		the url as a javascript object (script tag).
		In both cases the method returns the onload handler object. This object
		has one method 'onload', which allows you to specify a function that should
		be run when the javascript is loaded. This function is also run if the
		javascript was already loaded and include didn't actually do anything.
		examples:
			// this will only load muze.test.js if namespace muze.test isn't already
			// loaded and muze.test.js isn't already loaded
			muze.include('muze.test.js', 'muze.test').onload(function() {
				muze.test.run();
			});
			
			// this will load muze.test.js, even if muze.test is already available
			// if muze.test.js uses the muze.namespace() method correctly, it
			// can then extend muze.test
			muze.include('muze.test.js').onload(...);
			
			// this will load the script if the url isn't already loaded
			muze.include('random.script.js').onload(function() {
				// script is available but is not registered with a namespace
			})

	mixed load(string url, bool waitforme, bool cached)
		This method allows you to easily do ajax calls. If 'waitforme' is true,
		the ajax call is done synchronously, and load will return the responseText.
		Otherwise the call is done asynchronously, and load will return an onload
		handler object, just like include, only in this case the function you
		specify in onload will be called with one argument, namely the responseText.
		If you set 'cached' to true, the url won't be extended with a timestamp,
		allowing the browser to cache the response.
		examples:
			var response = muze.load('ajax.call.html', true);

			muze.load('ajax.call.html')
			.onload(function(response) {
				myDiv.innerHTML = response;
			})
			.ontimeout( 1000, function() {
				myDiv.innerHTML = 'timed out';
				this.clear();
			} );
			
	object loader(object)
		This method allows you to easily implement your own loader handler, with onload and
		ontimeout methods. If you pass an object to loader, the onload handler will be called
		with that object defined as this. The ontimeout handler won't, it will allways use the loader as this.
		You must keep an internal reference to the loader object and call loader.loaded() manually
		to trigger the onload. Any arguments passed to loaded() will be passed on to an onload handler
		set throught loader.onload.
		If a timeout handler is set through loader.ontimeout(timer, method) than it will be called if
		the loader.loaded() method isn't called before the timeout.
		example:
			function myAjaxyThing() {
				var loader = muze.loader();
				// do some stuff
				mything.onload = function() {
					loader.loaded(response);
				}
				return loader;
			}
		methods:
			onload(callback)
			ontimeout(timer, callback)
			loaded()
			clear()
*/

var muze = this.muze = {};
muze.global = this;
muze.url = (function() {
	var scripts = document.getElementsByTagName('script');
	var index = scripts.length - 1;
	var urlHelper = document.createElement('a');
	urlHelper.href = scripts[index].src;
	return urlHelper;
})();

(function() {

	/* private methods */

	function _getHTTPObject(cors) { //FIXME: check if rearranged thing work 
		var xmlhttp = null;
		if (typeof XMLHttpRequest == 'undefined') {
			if (typeof ActiveXObject != 'undefined') {
				try {
					xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
				} catch (e) {
					try {
						xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
					} catch (E)  {
						xmlhttp = null;
					}
				}
			}
		} else {
			try {
				if ( cors && typeof XDomainRequest != 'undefined' ) {
					xmlhttp = new XDomainRequest();
				} else {
					xmlhttp = new XMLHttpRequest();
				}
			} catch (e) {
				xmlhttp = null;
			}
		}
		return xmlhttp;
	}

	function _namespaceWalk( module, handler ) {
		var rest	= module.replace(/^\s+|\s+$/g, ''); //trim
		var name	= '';
		var temp	= muze.global;
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

	function _namespaceSet( module, object ) {
		var rest	= module.replace(/^\s+|\s+$/g, ''); //trim
		var name	= '';
		var temp	= muze.global;
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
			temp[rest] = object;
		}
	}
	
	/* private variables */

	var included	= {};
	var registered	= {};
	var dependencies= [];

	muze.namespace = function( module, implementation ) {
		var moduleInstance = _namespaceWalk( module, function(ob, name) {
			ob[name] = {};
			return ob;
		});
		registered[module]=true;
		if (typeof implementation == 'function') {
			var result = implementation.call(moduleInstance);
			if ( result ) {
				_namespaceSet( module, result );
				moduleInstance = result;
			}
		}
		// call other continuations that depend on this module 
		// only after remaining code in this module has had a chance to run
		// not all modules use an implementation callback method
		for ( p in moduleInstance ) {
			if ( moduleInstance.hasOwnProperty(p) ) {
				// module is initialized
				checkDependencies();
				return moduleInstance;
			}
		}
		// module not yet initialized, so give it time.
		muze.global.setTimeout(function() {
			checkDependencies();
		}, 1);
		return moduleInstance;
	};

	function _parseModuleInfo( moduleInfo ) {
		var pipePos = moduleInfo.indexOf('|');
		var slashPos = moduleInfo.indexOf('/');
		if ( pipePos != -1 ) {
			var module = moduleInfo.substring(0, pipePos);
			var url = moduleInfo.substring(pipePos+1);
		} else if ( slashPos != -1 ) {
			var module = false;
			var url = moduleInfo;
		} else {
			var module = moduleInfo;
			var url = document.createElement('a');
			url.href = muze.url.href;
			if ( url.search.match('muze') ) {
				url.search = '?'+module;
			} else if ( url.pathname.match('muze.js') ) {
				url.pathname = url.pathname.replace('muze.js', module.replace('.','/')+'.js' );
			} else {
				url.href = '';
			}
			url = url.href;
		}
		return {
			module: module,
			url: url
		};
	}

	function _parseModulesList( modules ) {
		// the continuation is a function which is only run if all requirements are met
		if (typeof modules == 'string') {
			var modulesList = (/,/.test(modules)) ? modules.split(',') : [ modules ];
		} else if (typeof modules.length != 'undefined') {
			var modulesList = modules;
		} else {
			throw('Incorrect argument 1 (required modules): '+modules);
			return false;
		}
		var scriptsToCheck = [];
		for ( var i=0; i<modulesList.length; i++ ) {
			scriptsToCheck[i] = _parseModuleInfo( modulesList[i] );
		}
		return scriptsToCheck;		
	}


	function checkDependencies() {
		for ( var i=dependencies.length-1; i>=0; i-- ) {
			if ( dependencies[i].continuation ) {
				for ( var ii=dependencies[i].scriptsToLoad.length-1; ii>=0; ii-- ) {
					var module = dependencies[i].scriptsToLoad[ii].module;
					if ( registered[module] ) {
						dependencies[i].scriptsToLoad.splice(ii, 1);
						// delete dependencies[i].scriptsToLoad[ii];
					}
				}
				if ( dependencies[i].scriptsToLoad.length == 0 ) {
					var continuation = dependencies[i].continuation;
					dependencies[i].continuation = false;
					continuation.call(muze.global);
				}
			}
		}
	}

	muze.require = function( modules, continuation ) {
		modules = _parseModulesList( modules );
		var scriptsToLoad = [];
		for (var i=0; i<modules.length; i++) {
			if ( modules[i].module ) {
				var moduleInstance = _namespaceWalk( modules[i].module, function(ob, name) {
					if (typeof continuation == 'undefined' || !modules[i].url ) {
						throw 'namespace ' + name + ' not found ';
					} else {
						scriptsToLoad[ scriptsToLoad.length ] = modules[i];
					}
				});
			} else if ( !included[ modules[i].url ] ) {
				if (typeof continuation == 'undefined' || !modules[i].url ) {
					throw 'namespace ' + name + ' not found ';
				} else {
					scriptsToLoad[ scriptsToLoad.length ] = modules[i];
				}
			}
		}
		dependencies[ dependencies.length ] = {
			'continuation' : continuation,
			'scriptsToLoad' : scriptsToLoad
		};
		if ( typeof continuation == 'function' ) {
			if ( scriptsToLoad.length ) {
				for ( var i = 0; i<scriptsToLoad.length; i++ ) {
					muze.include( scriptsToLoad[i].url, scriptsToLoad[i].module );
					// scripts must call muze.namespace to register that they have been loaded
					/*.onload( (function(module, url ) {
						return function() {
							if ( module ) { // FIXME: module may require other libs, so may not be initialized yet
								registered[module] = url;
							}
							checkDependencies();
						};
					})(scriptsToLoad[i].module, scriptsToLoad[i].url ) );*/
				}
			} else {
				continuation.call(muze.global);
			}
		}
		return moduleInstance;
	};

	muze.include = function(url, module) {
		var loader = muze.loader();
		if (!included[url] && (!module || !registered[module])) {
			dependencies[ dependencies.length ] = {
				'continuation' : loader.loaded,
				'scriptsToLoad' : [ { 'module' : module, 'url' : url } ]
			};

			var script = document.createElement('SCRIPT');
			script.src = url;
			if ( !module ) {
				// not a muze.* module, so muze.namespace won't be called, so we can only 
				// check if the script is loaded, not if it is initialized.
				var handleOnLoad = function() {
					included[url] = true;
					loader.loaded();
				};
				try {
					script.addEventListener('load', handleOnLoad, false);
				} catch(e) {
					script.onreadystatechange = function() { 
						if (script.readyState == 'loaded' || script.readyState == 'complete') {
							handleOnLoad();
							script.onreadystatechange = null;
						}
					};
				}
			}
			document.getElementsByTagName('HEAD')[0].appendChild(script); // FIXME: make this more cross browser
		} else {
			// url was already loaded
			// setTimeout is not optional here, since we have to return
			// (this) first, before the _onload method is called, otherwise
			// there is no way for a user to change 'onload_handler'.
			setTimeout(loader.loaded, 1);
		}
		return loader;
	};
	
	muze.load = function(url, waitforme, cached, method, arguments) {
		var _isCorsURL = function(url) {
			var urlHelper = document.createElement('a');
			urlHelper.href = url;
			var newHost = url.hostname;
			var currentHost = document.location.href.hostname;
			return ( newHost && newHost!=currentHost);
		}
		var loader = muze.loader();
		var timestamp = null;
		// get content from url
		if (!cached) {
			timestamp = new Date();
			if ( url.match( /\?/ ) ) {
				timestamp = '&t=' + timestamp.getTime();
			} else {
				timestamp = '?t=' + timestamp.getTime();
			}
		} else {
			timestamp = '';
		}

		var http = _getHTTPObject(_isCorsURL(url));
		var params = null;
		if ( method == 'POST' || method == 'post' ) {
			method = 'POST';
		} else {
			method = 'GET';
		}
		http.open( method, url + timestamp, !waitforme );
		if ( !waitforme ) {
			http.onreadystatechange = function() {
				if (http.readyState == 4) {
					loader.loaded( http.responseText );
				}
			};
		}
		if ( method=="POST" ) {
			if ( arguments ) {
				params = [];
				for ( var i in arguments ) {
					params.push( encodeURIComponent( i) + '=' + encodeURIComponent( arguments[i]) )
				}
				params = params.join('&');
				http.setRequestHeader( 'Content-type', 'application/x-www-form-urlencoded' );
				http.setRequestHeader( 'Content-length', params.length );
				http.setRequestHeader( 'Connection', 'close' );
			}
		}
		http.send( params );
		if ( waitforme ) {
			return http.responseText;
		} else {
			return loader;
		}
	};
	
	muze.loader = function() {
		var _continue = function( continuation ) {
			return function() {
				if (typeof continuation == 'function') {
					continuation.apply( this, arguments );
					continuation = null;
				}
			};
		};
		var loaded = false;
		var onload_handler = null;
		var ontimeout_handler = null;
		var loader = {};
		loader.onload = function(handler) {
			onload_handler = handler;
			return this;
		};
		loader.ontimeout = function( timer, handler ) {
			muze.global.setTimeout( function() {
				if (!loaded) {
					_continue(handler)();
				}
			}, timer );
			return this;
		};
		loader.loaded = function() {
			loaded = true;
			_continue(onload_handler).apply(this, arguments);
		};
		loader.clear = function() {
			onload_handler = null;
			ontimeout_handler = null;
		};
		return loader;
	};
	
	muze.throttle = function( callbackFunction, intervalTime ) {
		var eventId = 0;
		return function() {
			var myArguments = arguments;
			var me = this;
			if ( eventId ) {
				return;
			} else {
				eventId = window.setTimeout( function() {
					callbackFunction.apply(me, myArguments);
					eventId = 0;
				}, intervalTime );
			}
		}
	}

})();

/*
 * Capabilities testing, verbatim from:
 * Env - v0.1
 * Copyright (c) 2009 Ryan Morr (ryanmorr.com)
 * Some techniques and content inspired and derived from:
 * John Resig and jQuery (ejohn.org, jquery.com), Juriy Zaytsev (thinkweb2.com/projects/prototype), Andrea Giammarchi (webreflection.blogspot.com), 
 * Peter Michaux (peter.michaux.ca), and Diego Perini (iport.it)
 * Licensed under the MIT license.
 */

 muze.namespace('muze.env');
 
 muze.env = (function() {
	//define the global Env object
	var Env = {};
	//define the bugs object
	Env.bugs = {};
	//define the support object
	Env.support = {};

	//isHostMethod, isHostCollection, and isHostObject are courtesy of Peter Michaux and his exellecent post on
	//feature detection (http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting)

	
	//Is the member a callable method of its host (element.hasAttribute)
	Env.isHostMethod = function(o, prop){
		return Env.isHostCollection(o, prop) || typeof o[prop] === "unknown";
	};
	
	//Is the member a collection object of its host (element.childNodes)
	Env.isHostCollection = function(o, prop){
		return Env.isHostObject(o, prop) || Env.isFunction(o[prop]);
	};
	
	//Is the member a non-callable property of its host (element.offsetWidth)
	Env.isHostObject = function(o, prop){
		return !!(Env.isObject(o[prop]) && o[prop]);
	};
	
	//Is the object defined
	Env.isUndefined = function(o){
		return typeof o === 'undefined';
	};
	
	//Is the object a boolean (true/false)
	Env.isBoolean = function(o){
		return typeof o === 'boolean';
	};
	
	//Is the object a number
	Env.isNumber = function(o){
		return typeof o === 'number' && isFinite(o);
	};
	
	//Is the object a string
	Env.isString = function(o){
		return typeof o === 'string';
	};
	
	//Is the object null
	Env.isNull = function(o){
		return o === null;
	};
	
	//Is the object a native method/function of the browser environment
	//Modified version of Diego Perini's implementation (http://github.com/dperini/nwevents/blob/ac33e52c1ed1c1c3a1bb1612384ca5b2f7a9b3ef/src/nwmatcher.js#L41)
	Env.isNative = function(o){		
		return (/\{\s*\[native code\]\s*\}|^\[function\]$/).test(String(o));
	};
	
	//Is the object a function or method
	Env.isFunction = function(o){
		return Object.prototype.toString.call(o) === "[object Function]";
	};
	
	//Is the obect an array
	Env.isArray = function(o){ 
		return Object.prototype.toString.call(o) === "[object Array]";
	};
	
	//Is the object a date object
	Env.isDate = function(o){
		return Object.prototype.toString.call(o) === "[object Date]";
	};

	//Is the object a regular expression
	Env.isRegExp = function(o){
		return Object.prototype.toString.call(o) === "[object RegExp]";
	};

	//Is the object an element of an HTML/XHTML document (div)
	Env.isElement = function(o){
		return (window.Element && o instanceof window.Element) || (!!o.htmlElement || (o.nodeName && o.nodeType === 1));
	};
	
	//Is the object a document object
	Env.isDocument = function(o){
		return Object.prototype.toString.call(o) === '[object HTMLDocument]' || o.nodeType === 9;
	};
	
	//Is the object an event object (click)
	Env.isEvent = function(o){
		return Object.prototype.toString.call(o) === '[object Event]' || (Env.isObject(o) && Env.isUndefined(o.constructor) && (window.event && o.clientX && o.clientX === window.event.clientX));
	};
	
	//Is the object a window
	Env.isWindow = function(o){
		var type = Object.prototype.toString.call(o);
		if(type === "[object Window]" || type === "[object DOMWindow]" || type === "[object global]"){
			return true;
		}else if(Env.isObject(o) && !!(o.Array && o.String)){
			return true;
		}else{
			return false;
		}
	};
	
	//Is the object a node of any kind (document, comment node, element, etc...)
	Env.isNode = function(o){
		return (o.nodeName && o.nodeType && (/1|2|3|4|5|6|7|8|9|10|11|12/).test(o.nodeType));
	};
	
	//Is the object a nodelist (anything return by getElementsByTagName)
	Env.isNodeList = function(o){
		var type = Object.prototype.toString.call(o);
		if(type === "[object NodeList]" || type === "[object HTMLCollection]"){
			return true;
		}else if(Env.isArrayLike(o) && o.item){
			for(var i=0, length = o.length; i < length; i++){
				if(!Env.isNode(o[i])){
					return false;
				}
			}
			return true;
		}else{
			return false;
		}
	};
	
	//Does the object share many of the same characteristics as an array (nodelist, arguments)
	Env.isArrayLike = function(o){
		return (Env.isNumber(o.length) && !Env.isFunction(o) && !Env.isString(o)) || Env.isArray(o);
	};
	
	//Is the object alien to the browser (unknown, undefinable)
	Env.isAlien = function(o){
		return o && (!Env.isFunction(o) && Env.isNative(o)) || (Env.isObject(o) && !Env.isFunction(o.constructor));
	};
	
	//Is the object a object
	Env.isObject = function(o){
		return typeof o === 'object';
	};
	
	//Is the object empty, will return true if it is undefined, null, an empty string (no characters), number 0, 
	//array or nodelist with no indexed values, and an object with no key/value pairs
	Env.isEmpty = function(o){
		switch(Env.type(o)){
			case 'undefined':
				return true;
			case 'null':
				return true;
			case 'boolean':
				return o === false;
			case 'string':
				return (/^\s*$/).test(o);
			case 'number':
				return o === 0;
			case 'array':
			case 'nodelist':
			case 'arraylike':
				return o.length === 0;
			case 'object':
				for(var prop in o){ 
					return false;
				}
 				return true;
		}
	};
	
	//Improved version of typeof - returns exactly what the object is (array, nodelist, event, etc...)
	Env.type = function(o){
		for(var method in Env){
			//Loop through each method with a name that starts with is (isArray) but not isHost (isHostMethod)
			//Each method was ordered specifically to prevent false positives (an array recognized as an object)
			if((/^is(?!Host|Empty)/).test(method)){
				if(Env[method](o)){
					//string the first to letters (is) of the method and lowercase it, that is the name of the object (isArray = array)
					return method.substr(2).toLowerCase();
				}
			}
		}
		//If all else fails, default to typeof
		return typeof o;
	};
		
	//Does the browser support a specific event of a specific node (div, iframe, img, input, document, window, etc...)
	//Some of the techniques utilized in this method are courtesy of Juriy Zaytsev and his recent article of the very same method
	//(http://thinkweb2.com/projects/prototype/detecting-event-support-without-browser-sniffing/)
	Env.support.event = (function(){
		//Cached results
		var cache = {};
		//Get a tokenized string unique to the node and event type
		var getKey = function(type, el){
			return (el ? (Env.isElement(el) ? el.tagName.toLowerCase() : Env.type(el)) : 'div') + ':' + type;
		};
		//The first parameter is the event type(click, mouseenter, load, abort, change, etc...);
		//The second parameter is optional and can either be a raw node (div, document, window, iframe, img) or a 
		//tag name that will be create via document.createElement
		return function(type, source){
			//Get the key to compare against the cache
			var key = getKey(type, source || false);
			if(key in cache){
				//If the key exists within the cache return the result and avoid the full test sequence to improve performance
				return cache[key];
			}else if(type in Env.support){
				//Test to see if any of the mutation events (tested for outside the context of this method) exist within the Env.support cache
				//and return the result - if none is found the test will run and will fail as these tests are not optimized for mutation events.
				//Currently the only known detect for mutation events is to acutally try them as you will see below
				//Also element inference for mutation events is not supported
				return Env.support[type];
			}else{
				//If the second parameter was provided - determine what it is and return either the raw node or a new element
				var el = !!source && !Env.isString(source) ? source : document.createElement(source || 'div');
				//first perform a simple "in" check to see if the event is pre-defined
				var supported = ("on"+type in el);
				//Next try using setAttribute to create a new event which will only work for supported events in some browsers such as Firefox
				if(!supported && el.setAttribute){
					el.setAttribute("on"+type, 'return;');
					//If the attribute is a function, it must be a supported event
					supported = Env.isFunction(el["on"+type]);
					//Remove the attribute for a node that exists outside this methods context
					if(!Env.isString(source)){
						el.removeAttribute("on"+type);
					}
				}
				//in a test only supported by IE, we try to actually fire the specified event which only works for supported events of that node
				//Caution! this will actually fire the event if the node exists outside the context of this method and there is a handler listening to this event!!
				if(!supported && document.createEventObject){
					//First create an event object
					var evt = document.createEventObject();
					try{
						//Fire the event
						el.fireEvent("on"+type, evt);
						supported = true;
					}catch(e){}
				}
				//Finally, for any browsers that support the global Event object we check to see if the event is a property
				//We keep this technique for last because it does not allow for node inference, it merely tests whether the 
				//browser supports the specified event in some capacity
				if(!supported && window.Event){
					supported = !!window.Event[type.toUpperCase()];
				}
				//Get the key and cache the result for future tests
				cache[getKey(type, el)] = supported;
				//If the node is unique to this execution context, null it out and save the memory
				el = !!source ? (Env.isString(source) ? null : source) : null;
				//Return the result
				return supported;
			}
		}
	})();
	
	//Does the browser support a specific CSS style and/or style value
	Env.support.style = (function(){
		//To improve performance against multiple tests of the same parameters, we employ caching
		var cache = {};
		//Create the element that will be used for all testing within this method
		var el = document.createElement('div');
		//Get the unique key for this style/value pair for caching
		var getKey = function(style, value){
			return style + ":" + value || "null";
		};
		
		//Convert a CSS style string to camel case so it can be used in JavaScript
		var toCamelCase = (function(){
			//Create a cache to hold the camel-cased strings and improve performance
			var cache = {};
			return function(str){
				//If the style doesn't exists within the cache, do it
				if(!cache[str]){
					//We use our own feature testing to see if strings will accept functions as a second argument (Safari 2.0.2)
					if(Env.support.stringReplaceFunction){
						//If functions are supported, make the new string, cache it, and return it
						return cache[str] = str.replace(/-([a-z])/g, function(word, letter){
							return letter.toUpperCase();
						});
					}else{
						//Fallback to generic code that should work on any browser
						var parts = str.split('-'), camel = parts[0];
						//If there is only one part to the split, than the style must not need to be converted to camel case (width)
						if(parts.length > 1){
							for(var i=1, len=parts.length; i < len; i++){
									camel += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);
							}
						}
						//Cache it and return it
						return cache[str] = camel;
					}
				}else{
					//If the string exists within the cache, return the cached value
					return cache[str];
				}
			}
		})();
		
		//First argument is the style to be tested (opacity, minHeight, etc.)
		//The second argument is an optional argument to test support for a style value (position: fixed)
		return function(style, value){
			//get the key that will be used for caching
			var key = getKey(style, value);
			if(key in cache){
				//If the key exists within the cache, return the held value
				return cache[key];
			}else{
				//Default to false, support must be proven
				var supported = false;
				//Camel-case the style for use against raw objects
				var camel = toCamelCase(style);
				//If the native runtime style exists than proceed (IE)
				if(el.runtimeStyle){
					//We use a try-catch block because IE will throw an error on unsupported style values
					try{
						//We set the style against the elements style object and if the value is not supplied we 
						//default to an empty string (works against all styles)
						el.style[camel] = value || "";
						//Unsupported styles and style values will always return undefined
						supported = !Env.isUndefined(el.runtimeStyle[camel]);
					}catch(e){};
				}else{
					//Must be a standards compliant browser (FF, Opera, Safari, Chrome, etc.)
					//Set the elements style, if value is not supplied we default to inherit which is supported
					//by all standards compliant browsers
					el.style[style] = value || "inherit";
					//Get the view for a little short form
					var view = document.defaultView;
					//If the browser supportes document.defaultView and its getComputedStyle method than proceed
					//Currently there is not fallback for this
					if(view && view.getComputedStyle){
						//Get the computed style
						var cs = view.getComputedStyle(el, "")[camel];
						//Unsupported styles always return undefined
						supported = !Env.isUndefined(cs);
						//If a value was supplied than we have to test it separately because the getComputedStyle method will often parse the value into
						//something much harder to detect i.e. (color: 1px returns rgb(0,0,0))
						if(value){
							//We create a new div as the innerHTML within our main element
							//Any hyphenated styles must be supplied in that fashion for these tests(vertical-align not verticalAlign)
							//a little syntastic sugar too
							el.innerHTML = '<div style="'+style+':'+value+'"></div>';
							//Unsupported style values will always return an empty string
							supported = supported && el.firstChild.style[camel] !== "";
						}
					}
				}
				//Cache the value and return it
				return cache[key] = supported;
			}
		}
	})();
	
	//Does the browser support cookies
	//Env.support.cookies = !!navigator.cookieEnabled && navigator.cookieEnabled;
	//The above check generates a security violation in IE when used inside a Modal Dialog, hence the adjusted check below
	Env.support.cookies = false;
	try {
		document.cookie="muzeEnvTestCookie=1; path=/";
		Env.support.cookies = (document.cookie.indexOf("muzeEnvTestCookie") != -1) ? true : false;
	} catch(e) {
		// ipad security error weirdness
	}

	//Is the browser in standards mode or quirks mode
	Env.support.strict = !!document.compatMode && document.compatMode == "CSS1Compat";
	//Is the current page hosted on a secure server
	Env.support.secure = !!window.location.href && window.location.href.toLowerCase().indexOf("https") === 0;	
	//Does the browser support canvas
	Env.support.canvas = !!document.createElement("canvas").getContext;
	//Does the browser support SVG
	Env.support.svg = !!(document.createElementNS && document.createElementNS('http://www.w3.org/2000/svg', 'svg').width);
	//Does the browser XPath queries on the HTML/XHTML document
	Env.support.xpath = !!document.evaluate;
	
	//Default to false, their support must be proved
	//Mutation event fired when an attribute is changed
	Env.support.DOMAttrModified = false;
	//Mutation event fired when a node is inserted into the DOM
	Env.support.DOMNodeInserted = false;
	//Mutation event fired when a node is removed from the DOM
	Env.support.DOMNodeRemoved = false;
	//Mutation event fired when something changes to one of the elements descendents
	Env.support.DOMSubtreeModified = false;
	
	//Does the browser support VML (vector graphics)
	//Inspired by Google Maps (http://maps.google.com/intl/en_ALL/mapfiles/73/maps2.api/main.js)
	Env.support.vml = (function(){
		//Create an element to act as a container
		var el = document.createElement('div');
		//Try adding a VML object via element's innerHTML
		el.innerHTML = '<v:shape adj="1" />';
		//Get the VML object
		var vml = el.firstChild;
		//Declare VML bevaviour 
		vml.style.behavior = "url(#default#VML)";
		//If the VML object exists and the attribute is an object than VML is supported
		return vml && Env.isObject(vml.adj);
	})();
	
	//Does the browser support flash
	Env.support.flash = (function(){
		//Check for ActiveX first because some versions of IE support navigator.plugins, just not the same as other browsers
		if(window.ActiveXObject){
			try{
				//try to create a flash instance
				new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
				return true;
			}catch(e){};
			//If the try-catch fails, return false
			return false;
		}else if(navigator.plugins){
			//Loop through all the plugins
			for(var i=0, length = navigator.plugins.length; i < length; i++){
				//test to see if any plugin names contain the word flash, if so it must support it - return true
				if((/flash/gi).test(navigator.plugins[i].name)){
					return true;
				}
			}
			//return false if no plugins match
			return false;
		}
		//Return false if ActiveX and nagivator.plugins are not supported
		return false;
	})();
	
	//Can the browser convert array-like objects (nodelist, arguments) to an array using native methods
	Env.support.nativeArrayConversion = (function(){
		try{
			//get the child nodes of the html element
			var children = document.documentElement.childNodes;
			//hijack the slice and use it for the conversion - make sure the result is an array
			return Env.isArray(Array.prototype.slice.call(children));
		}catch(e){}
		//return false if the try-catch block fails
		return false;
	})();
	
	//Does the string replace method support functions as a second argument (Safari 2.0.2)
	Env.support.stringReplaceFunction = (function(){
		var str = "";
		if(str.replace){
			//If the string equals success as returned by the function, then the replace method of strings must 
			//accept functions as second parameters, otherwise it is false
			return str.replace(str, function(){return 'success';}) === 'success';
		}else{
			//Return false if the strings to not support a replace method
			return false;
		}
	})();
	
	//Does the browser allow textnode appending, and eval the text
	Env.support.scriptEval = (function(){
		//Create a script element
		var script = document.createElement("script");
		try{
			//Try to append a textnode that will hopefully be evaluated and create a new property on the Env namespace
			script.appendChild(document.createTextNode("muze.env.test = true;"));
		}catch(e){
			//If an exception is caught, it must be IE and not supported
			return false;
		};
		//Append the script to the root element (<html>) to allow an eval
		document.documentElement.appendChild(script);
		//Quickly remove the script
		document.documentElement.removeChild(script);
		//We are done with the script so we null it out to save memory
		script = null;
		//Was the eval successful? Does the property exist
		var supported = !!Env.test;
		//Delete the property
		delete Env.test;
		//Return the supported value
		return supported;
	})();
	
	//Does the browser allow DOM manipulation of tables via innerHTML
	Env.bugs.tableInnerHTML = (function(){
		//Create the table
		var el = document.createElement("table");
		try{
			//Use a try catch block because IE throws errors
			//Append a row to the innerHTML of the table
			el.innerHTML = "<tr><td>test</td></tr>";
			//Query the table for a td element to check if the insert worked
			return el.getElementsByTagName('td').length === 0;
		}catch(e){};
		//The try-catch block fails, there must be a bug
		return true;
	})();
	
	//Does the browser allow DOM manipulation of selects via innerHTML
	Env.bugs.selectInnerHTML = (function(){
		 //Create the select
		var el = document.createElement("select");
		//Try appending to the innerHTML
		el.innerHTML = '<option value="test">test</option>';
		if(el.options && el.options[0]){
			//Does the option exist within the select, if not there is a bug
			return el.options[0].nodeName.toUpperCase() !== "OPTION";
		}else{
			//If no options are found, the insert must have failed
			return true;
		}
	})();
	
	Env.bugs.getElementById = (function(){
		//Create a container for everything
		var el = document.createElement('div');
		//Create a unique ID for the input we are about to create
		var id = "input" + new Date().getTime();
		//Add an input to test a bug with getElementById
		el.innerHTML = '<form><input type="hidden" name="'+ id +'" /></form>';
		//Get the head element
		var head = document.getElementsByTagName('head')[0];
		//append the container element to the head
		head.appendChild(el);
		//Does getElementById return elements with the same defined name
		var supported = !Env.isNull(document.getElementById(id));
		//remove the el from the head
		head.removeChild(el);
		//we are done with the test, null out the element and save memory
		el = null;
		//return the supported value
		return supported;
	})();
	
	//Create an element to perform various DOM and CSS related capabilities tests against
	var el = document.createElement("div");
	//Add an attribute which will later be changed to trigger a mutation event
	el.id = new Date().getTime() + Math.random();
	//Quickly create a child node that will be used to test various CSS styles
	el.innerHTML = '<div class="TEST unique" style="width:2px ; height:2px ; padding:1px;"></div><div class="random"></div>';
	//Add a comment node to the element
	el.appendChild(document.createComment('test'));
	
	//Test support for these various mutation events
	//Does the browser support DOMAttrModified
	addEvent(el, 'DOMAttrModified', handler);
	//Does the browser support DOMNodeInserted
	addEvent(el, 'DOMNodeInserted', handler);
	//Does the browser support DOMNodeRemoved
	addEvent(el, 'DOMNodeRemoved', handler);
	//Does the browser support DOMSubtreeModified
	addEvent(el, 'DOMSubtreeModified', handler);
			
	//Does the browser support cssFloat as the proxy for CSS float
	Env.support.cssFloat = "cssFloat" in el.style;
	//Does the browser support CSS transforms
	Env.support.cssTransform = "WebkitTransform" in el.style || "MozTransform" in el.style;

	
	//Change the id to trigger the DOMAttrModified and DOMSubtreeModified (except in Safari) event if it is supported
	el.id = new Date().getTime() + Math.random();	
	//Create a form element to test a bug in IE
	//Alternatively, appending a new element will trigger the DOMSubtreeModified event is it is supported (Safari);
	var form = el.appendChild(document.createElement('form'));
	//Add an input to test a bug with setting the name attribute
	form.innerHTML = '<input type="hidden" />';
	//Get the input element for testing
	var input = el.getElementsByTagName('input')[0];
	//try to set the name of the input via setAttribute
	input.setAttribute('name', 'test');
	
	
	//Does getElementsByTagName return comment nodes (IE)
	Env.bugs.getElementsByTagName = (function(){
		//Get all descending elements of the root element via "*"
		var elements = el.getElementsByTagName('*');
		//Loop the elements and look for comment nodes
		for(var i=0, length = elements.length; i < length; i++){
			if(elements[i].nodeType == 8){
				//If a comment node is found, its a bug
				return true;
			}
		}
		//If the loop completes without finding any comment nodes then no bug
		return false;
	})();
	
	Env.bugs.querySelectorAll = (function(){
		//Does this browser support querySelectorAll
		if(el.querySelectorAll){
			//Safari sometimes doesn't respond to case sensitivity
			return el.querySelectorAll(".TEST").length === 0;
		}else{
			//If querySelectorAll isn't supported return false for no bug
			return false;
		}
	})();
	
	Env.bugs.getElementsByClassName = (function(){
		//Does this browser support getElementsByClassName
		if(el.getElementsByClassName){
			//Opera 9.6 doesn't find elements by their second class name
			return el.getElementsByClassName("unique").length === 0;
		}else{
			//if getElementsByClassName isn't supported return false for no bug
			return false;
		}
	})();
	
	Env.bugs.cachedClassNames = (function(){
		//Does this browser support getElementsByClassName				  
		if(el.getElementsByClassName){
			//change the class name of the last element to test 
			el.firstChild.className = "random";
			//Safari 3.2 caches class names
			return el.getElementsByClassName("random").length === 1;
		}else{
			//If getElementsByClassName isn't supported return false for no bug
			return false;
		}
	})();

	
	//These tests can only be determined once they are included in the DOM and rendered
	//For now we just set them to false, they must be proven
	
	Env.support.boxModel = false;
	Env.bugs.setNameAttribute = false;
		
	//Env is not ready until a few tests involving insertion into the DOM are performed	
	Env.ready = false;
	//Certain properties need to be added to the DOM and rendered to be tested accurately	
	//This method can be called manually in your scripts once the DOM has finished loading or it can be left up to the automatic polling for DOM completion
	//The option is available because in some cases where the DOM is small (low bytes and less to load time), the poll will not trigger the method and complete 
	//the tests until, in some cases, after window.onload is fired, so we provide this method to manually invoke the method as a last resort in such a case
	Env.onReady = function(){
		if(!Env.ready){
			//Query the DOM for the body
			var body = document.getElementsByTagName('body')[0];
			//If the body and appendChild and removeChild methods are recognized, than proceed
			if(body && body.appendChild && body.removeChild){
				//append the element to the DOM
				body.appendChild(el);
				//Is the box model support 
				Env.support.boxModel = el.firstChild.offsetWidth === 4;
				//Query for the input based on the name to see if setAttribute on the name worked
				Env.bugs.setNameAttribute = form.elements ? Env.isUndefined(form.elements.test) : false;
				//Remove the element from the dom
				body.removeChild(el);
				//clear the interval
				clearTimeout(poll);
				//make the elements and the interval null to save memory
				el = poll = null;
				//All tests are done and Env is ready to be used
				Env.ready = true;
			}
		}
	};
	
	//poll Env.ready
	var poll = setTimeout(Env.onReady, 1);

	//Helper functions purely for testing support of the mutation events
	function handler(e){
		Env.support[e.type] = true;
		removeEvent(e.target, e.type, arguments.callee);
	};
	
	function addEvent(el, type, fn){
		if(el.addEventListener){
			el.addEventListener(type, fn, false);
		}else if(el.attachEvent){
			el.attachEvent("on" + type, fn);
		}else{
			el["on"+type] = fn;
		}
	};
	
	function removeEvent(el, type, fn){
		if(el.removeEventListener){
			el.removeEventListener(type, fn, false);
		}else if(el.detachEvent){
			el.detachEvent('on' + type, fn);
		}else{
			el["on"+type] = null;
			delete el["on"+type];
		}
	};
	return Env;
})();
/*
	FIXME: event add/remove via array index laten werken, geen directe functie pointers, alleen indexes in handles array
	op die manier krijg je geen circulaire referenties via closures
	
	javascript events library for muze modules
	----------------------------------------

	object get(object evt)
		This method returns the event object cross browser. You only need this if you don't
		use muze.event.attach() to attach your event handler, since it already does this for
		you.

		examples:
			function myEventHandler(evt) {
				evt = muze.event.get(evt);
				....
			}

	bool cancel(object evt)
		This method cancels the event, stops propagation, prevents default, in short it kills
		the event dead. Cross browser. It also returns false, so you may assign it directly
		to events you want killed.

		examples:
			function myEventHandler(evt) {
				...
				if (killEvent == true) {
					return muze.event.cancel(evt);
				}
				...
			}

			document.body.onMouseDown = muze.event.cancel;


	bool pass(object evt)
		This method returns true. So you may use it to make explicit that you don't cancel an event.

	mixed attach(object obj, string event, object handler, bool useCapture)
		This method attaches an event handler to an event on an object. It makes sure the event
		gets cleaned on unload, so you won't get memory leaks. It makes sure that 'this' points
		to the object the event is defined on. Important: Returns the handler required for detaching
		the event. This is not the same handler as passed to the attach function!
		arguments:
			obj		DOM object on which to catch the event
			event		name of the event to catch, e.g. 'load', 'click', etc.
			handler		function that handles the event.
			useCapture	Mozilla's useCapture option to addEventListener
		examples:

			...
			var detachHandler = muze.event.attach(document.body, 'load', function() { alert(this.innerHTML); });
			...

	bool detach(object obj, string event, object, handler, bool useCapture)
		This method detaches an event handler from an event on an object.
		arguments:
			obj		DOM objeect on which the event handler was attached
			event		name of the event to remove, e.g. 'load', 'click', etc.
			handler		handler to detach.
			useCapture	Mozilla's useCapture option to addEventListener
		examples:
		
			...
			var detachHandler = muze.event.attach(document.body, 'click', function() { alert('we have a click'); });
			...
			muze.event.detach(document.body, 'click', detachHandler);
			...


	void clean() 
		This method cleans/removes all attached event handlers. It is automatically run on unload of document, if needed.

	TODO:
		custom events met trigger en bind achtige functie, misschien in eigen namespace
		
*/

muze.require('muze.env', function() {

muze.namespace('muze.event', function() {

	/* private methods */

	/* private variables */
	var event = this;

	

	if (muze.env.isHostMethod(document, 'createEvent')) {
		event.create = function( name, maskEvt, win ) {
			if (!win) {
				win = muze.global;
			}
			var type = 'HTMLEvents';
			var init = function(evt, mask) {
				evt.initEvent(name, mask ? mask.bubbles : true, mask ? mask.cancelable : true);
			}
			switch (name) {
				case 'click' :
				case 'dblclick':
				case 'mousedown':
				case 'mousemove':
				case 'mouseout':
				case 'mouseover':
				case 'mouseup':
				case 'mousewheel':
				case 'contextmenu':
				case 'DOMMouseScroll':
				case 'drag':
				case 'dragdrop':
				case 'dragend':
				case 'dragenter':
				case 'dragover':
				case 'dragexit':
				case 'dragleave':
				case 'dragstart':
				case 'drop':				
					type = 'MouseEvents';
					init = function(evt, mask) {
						if (mask) {
							evt.initMouseEvent(name, mask.bubbles, mask.cancelable, mask.view, mask.detail, mask.screenX, mask.screenY, mask.clientX, mask.clientY, mask.ctrlKey, mask.altKey, mask.shiftKey, mask.metaKey, mask.button, mask.relatedTarget);
						} else {
							evt.initMouseEvent(name, true, true, win, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
						}						
					}
				break;
				case 'DOMFocusIn':
				case 'DOMFocusOut':
				case 'DOMActivate':
					type = 'UIEvents';
					init = function(evt, mask) {
						if (mask) {
							evt.initUIEvent(name, mask.bubbles, mask.cancelable, mask.view, mask.detail);
						} else {
							evt.initUIEvent(name, true, true, win, 1);
						}
					}
				break;
				case 'keypress':
				case 'keydown':
				case 'keyup':
					type = 'KeyboardEvents';
					var evt = win.document.createEvent( type );
					if (muze.env.isHostMethod(evt, 'initKeyboardEvent')) {
						init = function(evt, mask) {
							if (mask) {
								var modifiers = '';
								if (mask.altKey) {
									modifiers += 'Alt ';
								}
								if (mask.ctrlKey) {
									modifiers += 'Control ';
								}
								if (mask.shiftKey) {
									modifiers += 'Shift ';
								}
								if (mask.metaKey) {
									modifiers += 'Meta ';
								}
								evt.initKeyboardEvent(name, !!mask.bubbles, !!mask.cancelable, mask.view, mask.keyIdentifier, mask.keyLocation, modifiers);
							} else {
								evt.initKeyboardEvent(name, true, true, win, '', 0, '');
							}
						}
					} else if (muze.env.isHostMethod(evt, 'initKeyEvent')) {
						init = function(evt, mask) {
							if (mask) {
								evt.initKeyEvent(name, !!mask.bubbles, !!mask.cancelable, mask.view, mask.ctrlKey, mask.altKey, mask.shiftKey, mask.metaKey, mask.keyCode, mask.charCode);
							} else {
								evt.initKeyEvent(name, true, true, win, false, false, false, false, 0, 0);
							}
						}
					}
				break;
				case 'message':
					type = 'MessageEvent';
					init = function(evt, mask) {
						if (mask) {
							evt.initMessageEvent(name, mask.bubbles, mask.cancelable, mask.data, mask.origin, mask.lastEventId, mask.source, mask.ports);
						} else {
							evt.initMessageEvent(name, true, true, '', '', '', '', null);
						}
					}
				break;
			}
			var evt =  win.document.createEvent(type);
			init(evt, maskEvt);
			return evt;
		}
	} else if (muze.env.isHostMethod(document, 'createEventObject') ) {
		event.create = function( name, evt, win ) {
			if (!win) {
				win = muze.global;
			}
			var evt = win.document.createEventObject(name, evt);
			return evt;
		};
	} else {
		event.create = false;
	}

	if (muze.env.isHostMethod(document, 'dispatchEvent')) {
		event.fire = function(el, name, evt) {
			var win = muze.global;
			if (el.ownerDocument && el.ownerDocument.defaultView) {
				win = el.ownerDocument.defaultView;
			} else if (el.ownerDocument && el.ownerDocument.parentWindow) {
				win = el.ownerDocument.parentWindow;
			}
			evt = muze.event.create(name, evt, win);
			el.dispatchEvent(evt);
		}
	} else if (muze.env.isHostMethod(document, 'fireEvent')) {
		event.fire = function(el, name, evt) {
			if (name.substr(0,3)!=='DOM') {
				name = 'on'+name;
			}
			el.fireEvent(name, evt);
		}
	} else {
		event.fire = false;
	}
	
	event.get = function(evt, win) {
		if ( !win ) {
			win = muze.global;
		}
		if ( !evt ) {
			evt = win.event;
		}
		return evt;
	};

	event.cancel = function(evt) {
		event.preventDefault(evt);
		event.stopPropagation(evt);
		return false;
	};
	
	event.stopPropagation = function(evt) {
		evt = event.get(evt);
		if (muze.env.isHostMethod(evt, 'stopPropagation')) {
			evt.stopPropagation();
		} else {
			evt.cancelBubble = true;
		}
	};

	event.preventDefault = function(evt) {
		evt = event.get(evt);
		if (muze.env.isHostMethod(evt, 'preventDefault')) {
			evt.preventDefault();
		} else {
			evt.returnValue=false;
		} 
	};
	
	event.pass = function(evt) {
		return true;
	};

	event.target = function(evt) {
		evt = event.get(evt);
		if (muze.env.isHostObject(evt, 'target') ) {
			return evt.target;
		} else if (muze.env.isHostObject(evt, 'srcElement') ) {
			return evt.srcElement;
		} else {
			return null;
		}
	}

	event.getCharCode = function(evt) {
		evt = event.get(evt);
		if (evt.type=='keypress' || evt.type=='onkeypress') {
			return (evt.charCode ? evt.charCode : ((evt.keyCode) ? evt.keyCode : evt.which));
		} else {
			return false;
		}
	}

	var docEl = document.documentElement;
	var listeners = [];

	var getWrapper = function( id ) {
		return function(evt) {
			var o = listeners[id].el;
			if (o.ownerDocument) {
				var win = o.ownerDocument.defaultView ? o.ownerDocument.defaultView : o.ownerDocument.parentWindow;
			} else if (o.defaultView) {
				var win = o.defaultView;
			} else if (o.parentWindow) {
				var win = o.parentWindow;
			} else if (o.document) {
				var win = o;
			} else {
				var win = muze.global;
			}
			evt = event.get(evt, win);
			var f = listeners[id].listener;
			f.call(o, evt);
		}
	}

	if (muze.env.isHostMethod(docEl, 'addEventListener')) {
		event.attach = function(o, sEvent, fListener, useCapture) {
			if ( !muze.env.isFunction(fListener) ) {
				throw {
					el : o,
					message : 'listener is not a method',
					event : sEvent
				};
			}
			var listenerID = listeners.push( {
				el : o,
				listener : fListener
			} ) - 1;
			var wrapped = getWrapper(listenerID);
			o.addEventListener(sEvent, wrapped, !!useCapture);
			return wrapped;
		};
	} else if (muze.env.isHostMethod(docEl, 'attachEvent')) {
		event.attach = function(o, sEvent, fListener, useCapture) {
			if (!muze.env.isFunction(fListener)) {
				throw {
					el : o,
					message : 'listener is not a method',
					event : sEvent
				};
			}
			var listenerID = listeners.push( {
				el : o,
				listener : fListener
			} ) - 1;
			if (sEvent.substr(0,3)!='DOM') {
				sEvent = 'on' + sEvent;
			}
			var wrapped = getWrapper(listenerID);
			o.attachEvent(sEvent, wrapped);
			return wrapped;
		};
	} else {
		event.attach = false;
	}


	if (muze.env.isHostMethod(docEl, 'removeEventListener') ) {
		event.detach = function(o, sEvent, handle, useCapture) {	
			if (o && sEvent) {
				var result = o.removeEventListener(sEvent, handle, !!useCapture);
				return result;
			} else {
				return false;
			}
		};
	} else if (muze.env.isHostMethod(docEl, 'detachEvent') ) {
		event.detach = function(o, sEvent, handle, useCapture) {	
			if (o && sEvent) {
				var result = o.detachEvent('on'+sEvent, handle);
				return result;
			} else {
				return false;
			}
		}
	} else {
		event.detach = false;
	}
	
	event.clean = function() { }

});

});
muze.require('muze.event', function() {
	muze.namespace('muze.form.calendar', function() {
		return {
			target : null,
			calendar : null,
			attach: function() {
				inputs = document.getElementsByTagName("INPUT");
				for (i=0; i<inputs.length; i++) {
					if (inputs[i] && inputs[i].className && inputs[i].className.indexOf("muze_form_calendar") != -1) {
						muze.event.attach(inputs[i], "focus", muze.form.calendar.execute);
					}
				}
			},
			execute : function() {
				muze.form.calendar.target = this;
				if (muze.form.calendar.calendar) {
					muze.form.calendar.calendar.show();
				} else {
					tomorrow = new Date();
					tomorrow.setTime(tomorrow.getTime() + (1000*3600*24)); // Add one day to today.

					muze.form.calendar.calendar = new YAHOO.widget.Calendar("calendar", "senddate_calendar", {mindate:tomorrow});
					// FIXME: NLS
					muze.form.calendar.calendar.cfg.setProperty("MONTHS_SHORT",   ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]);   
					muze.form.calendar.calendar.cfg.setProperty("MONTHS_LONG",    ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"]);
					muze.form.calendar.calendar.cfg.setProperty("WEEKDAYS_1CHAR", ["Z", "M", "D", "W", "D", "V", "Z"]);   
					muze.form.calendar.calendar.cfg.setProperty("WEEKDAYS_SHORT", ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"]);   
					muze.form.calendar.calendar.cfg.setProperty("WEEKDAYS_MEDIUM",["Zon", "Maa", "Din", "Woe", "Don", "Vri", "Zat"]);   
					muze.form.calendar.calendar.cfg.setProperty("WEEKDAYS_LONG",  ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"]);   

					muze.form.calendar.calendar.render();
					muze.form.calendar.calendar.selectEvent.subscribe(muze.form.calendar.selectEvent, muze.form.calendar.calendar, true);  
				}
			},
			selectEvent : function() {
				if (muze.form.calendar.calendar.getSelectedDates().length > 0) {
					var selDate = muze.form.calendar.calendar.getSelectedDates()[0];

					// Pretty Date Output, using Calendar's Locale values: Friday, 8 February 2008
					var dStr = selDate.getDate();
					dStr = (dStr < 10 ? '0' : '') + dStr;

					var mStr = selDate.getMonth() + 1;
					mStr = (mStr < 10 ? '0' : '') + mStr;

					var yStr = selDate.getFullYear();
					muze.form.calendar.target.value = dStr + "-" + mStr + "-" + yStr;
				} else {
					muze.form.calendar.target.value = "";
				}
				muze.form.calendar.calendar.hide();
			}
		}
	});
});

muze.namespace( 'muze.form.cancelEnter', function() {
	return {
		attach : function() {
			forms = document.getElementsByTagName("FORM");
			for (i=0; i<forms.length; i++) {
				if (forms[i] && forms[i].className && forms[i].className.indexOf("muze_form_cancelenter") != -1) {
					inputs = forms[i].getElementsByTagName("INPUT");
					for (j=0; j<inputs.length; j++) {
						inputelm = inputs[j];
						muze.event.attach(inputelm, "keypress", muze.form.cancelenter.execute);
					}
				}
			}
		},
		execute : function(evt) {
			var keyCode = evt.keyCode ? evt.keyCode : evt.which ? evt.which : evt.charCode;
			if (keyCode == 13) {
				muze.event.cancel(evt);
				return false;
				this.tabIndex
			}
		}
	}
});

muze.namespace( 'muze.form.clearOnFocus', function() {
	return {
		attach : function() {
			inputs = document.getElementsByTagName("INPUT");
			for (i=0; i<inputs.length; i++) {
				if (inputs[i] && inputs[i].className && inputs[i].className.indexOf("muze_form_clearOnFocus") != -1) {
					inputelm = inputs[i];
					inputelm.initialvalue = inputelm.value;
					muze.event.attach(inputelm, "focus", muze.form.clearOnFocus.execute);
				}
			}
			divs = document.getElementsByTagName("DIV");
			for (i=0; i<divs.length; i++) {
				if (divs[i] && divs[i].className && divs[i].className.indexOf("muze_form_clearOnFocus") != -1) {
					inputs = divs[i].getElementsByTagName("INPUT");
					for (j=0; j<inputs .length; j++) {
						if (inputs [j]) {
							inputelm = inputs[j];
							inputelm.initialvalue = inputelm.value;
							muze.event.attach(inputelm, "focus", muze.form.clearOnFocus.execute);
						}
					}
				}
			}
					
		},
		execute : function() {
			if (this.value == this.initialvalue) {
				this.value = '';
			}
		}
	}
});

muze.namespace( 'muze.form.keyboardNumbers', function() {
	return {
		attach : function() {
			inputs = document.getElementsByTagName("INPUT");
			for (i=0; i<inputs.length; i++) {
				if (inputs[i] && inputs[i].className && inputs[i].className.indexOf("muze_form_keyboardNumbers") != -1) {
					inputelm = inputs[i];
					muze.event.attach(inputelm, "keydown", muze.form.keyboardNumbers.execute); // IE does not fire keypress event for arrows.
				}
			}
		},
		execute : function(evt) {
			var keyCode = evt.keyCode ? evt.keyCode : evt.which ? evt.which : evt.charCode;
			if (!isNaN(this.value)) {
				myvalue = parseInt(this.value);
				if (isNaN(myvalue)) {
					myvalue = 0;
				}
				if (keyCode == 38) { // keyboard arrow up
					myvalue++;
					this.value = myvalue;
					muze.event.fire(this, "change");
				}
				if (keyCode == 40) { // keyboard arrow down
					myvalue--;
					this.value = myvalue;
					muze.event.fire(this, "change");
				}
			}
		}
	}
});

muze.namespace( 'muze.form.numbersOnly', function() {
	return {
		attach: function() {
			inputs = document.getElementsByTagName("INPUT");
			for (i=0; i<inputs.length; i++) {
				if (inputs[i] && inputs[i].className && inputs[i].className.indexOf("muze_form_numbersonly") != -1) {
					muze.event.attach(inputs[i], "keypress", muze.form.numbersOnly.execute);
				}
			}
		},
		execute : function(evt) {
			var keyCode = evt.keyCode ? evt.keyCode : evt.which ? evt.which : evt.charCode;
			if (
				keyCode == 8 || 	// backspace
				keyCode == 9 || 	// tab
				keyCode == 46 ||	// keypad del
				(keyCode > 36 && keyCode < 41) // arrow keys
			) {
				return true;
			}
			if (keyCode<48 || keyCode > 57) { // if the key is not a number
				muze.event.cancel(evt);
				return false;
			}
		}
	}
});

muze.namespace( 'muze.form.subselection', function() {
	return {
		attach : function() {
			inputs = document.getElementsByTagName("DIV");
			for (i=0; i<inputs.length; i++) {
				if (inputs[i] && inputs[i].className && inputs[i].className.indexOf("muze_form_show_subselection") != -1) {
					inputelm = inputs[i].getElementsByTagName("SELECT")[0];
					if (inputelm) {
						muze.event.attach(inputelm, "change", muze.form.subselection.execute);
					}
					radiooptions = inputs[i].getElementsByTagName("INPUT");
					for (j=0; j<radiooptions.length; j++) {
						if (radiooptions[j]) {
							muze.event.attach(radiooptions[j], "click", muze.form.subselection.execute);
							muze.event.attach(radiooptions[j], "change", muze.form.subselection.execute);
						}
					}
				}
			}			
		},
		execute : function() {
			inputs = this.form.getElementsByTagName("DIV");
			for (i=0; i<inputs.length; i++) {
				if (inputs[i] && inputs[i].className && inputs[i].className.indexOf("muze_form_subselection") != -1) {
					inputelm = inputs[i];
					inputelm.style.display = "none";
				}
				if (inputs[i] && inputs[i].className && inputs[i].className.indexOf(this.value+"_subselection") != -1) {
					inputelm = inputs[i];
					inputelm.style.display = "block";
				}
			}
		}
	}
});

muze.namespace( 'muze.form.textareaMaxLength', function() {
	return {
		attach : function() {
			inputs = document.getElementsByTagName("TEXTAREA");
			for (i=0; i<inputs.length; i++) {
				if (inputs[i] && inputs[i].className && inputs[i].className.indexOf("muze_form_textareaMaxLength") != -1) {
					inputelm = inputs[i];
					muze.event.attach(inputelm, "keypress", muze.form.textareaMaxLength.execute);
				}
			}			
		},
		execute : function(evt) {
			// FIXME: This requires invalid HTML, because maxlength attribute does not exist for textarea.
			var maxLength = parseInt(this.getAttribute("maxlength"));
			var keyCode = evt.keyCode ? evt.keyCode : evt.which ? evt.which : evt.charCode;

			if (maxLength && (this.value.length >= maxLength) && (keyCode == 13 || keyCode >= 33)) {
				muze.event.cancel(evt);
				return false;
			}
		}
	}
});


muze.namespace('muze.html', function() {
	var getType = function(obj) {
		return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase()
	}
	
	var setAttr = function(el, name, value) {
		if ( name == 'style' ) {
			for (var ii in value ) {
				el.style[ii] = value[ii];
			}
		} else {
			switch(name) {
				case 'class': 
					name = 'className';
				break;
				case 'for':
					name = 'htmlFor';
				break;
			}
			el[ name ] = value;
		}
	}
	
	this.el = function(tagName) { //, attributes, children) {
		var el = muze.global.document.createElement(tagName);
		var next = 1;
		var attributes = arguments[1];
		if (attributes && getType(attributes)=='object') {
			next = 2;
			try {
				for (var i in attributes ) {
					setAttr(el, i, attributes[i]);
				}
			} catch(e) {
				if ( /input/i.test(tagName) ) {
					var elString = '<'+tagName;
					for ( var i in attributes ) {
						if ( getType(attributes[i])=='string' ) {
							elString += ' '+i+'="'+escape(attributes[i])+'"';
						}
					}
					elString += '>';
					el = muze.global.document.createElement(elString);
					for ( var i in attributes ) {
						if ( getType(attributes[i])!='string' ) {
							setAttr(el, i, attributes[i]);
						}
					}
				}
			}
		}
		for (var i=next, l=arguments.length; i<l; i++) {
			var subEl = arguments[i];
			if (getType(subEl)=='string') {
				subEl = muze.global.document.createTextNode(subEl);
			}
			el.appendChild( subEl );
		}
		return el;
	}

	this.element = this.el;

});/*
	FIXME:
		+ needs support for calling callbacks multiple times - some dialogs dont close e.g. the new dialog.
			so make the purge explicit.
		+ closing the dialog is the task of the script that opened it, so should be done in this code, not in the dialog itself
		+ let op: gebruik GEEN showModalDialog, teveel bugs in Chrome en ook in IE.


	in your application:

		muze.dialog.open( url, 'browse', { windowFeatures: 'width=600,height=450', createNewWindow: false })
		.on('submit', function( args ) {
			// browse to args['path']
		})
		.onUndefined( function( action, args ) {
			alert('action '+action+' is not handled');
		})
		.always( function( action, args, result ) { 
			this.close();
		});

	in the browse dialog:
	
		openButton.onClick= function() {
			window.opener.muze.dialog.callback( window.name, 'submit', { 'path': path } )
		}
*/
muze.require('muze.event', function() {

	muze.namespace('muze.dialog', function() {
		var self = {};
		var callbackRegistry = {};
		var optionsRegistry = {};
		var windowRegistry = {};

		/* 
			This object contains the methods to chain all the different handlers for the actions from the dialog.
			It only needs a unique id linked to the specific dialog - the window.name in muze.dialog.open
		*/
		var callbackHandler = function( id ) {
			this.id = id;
			this.dialog = windowRegistry[ id ];
			var handler = this;

			/*
				This method adds a callback for the given action. The callback function is called with just one argument.
				The result of the callback function is returned by muze.dialog.callback()
			*/
			this.on = function( action, callback ) {
				callbackRegistry[id][action] = function( args ) {
					callback.call( handler, args );
				};
				return this;
			};

			/*
				This method adds a callback function for all actions which have no specific callback specified.
				The callback has an extra first argument which specifies which action was called from the dialog.
			*/
			this.onUndefined = function( callback ) {
				callbackRegistry[id]['_default'] = function( action, args ) {
					callback.call( handler, action, args );
				};
				return this;
			};

			/*
				This method removes all callback functions for this dialog.
			*/
			this.remove = function() {
				delete callbackRegistry[this.id];
			};

			/*
				This method closes the dialog and removes all callback functions for it.
			*/
			this.close = function() {
				self.close( this.id );
			};

			/*
				This method adds a callback function that is called for each action, after any matching callback
				functions are called. The callback function is passed three arguments, the action, the argument for
				that action and the result - if any - of the previous handler. The result is returned by muze.dialog.callback()
			*/
			this.always = function( callback ) {
				callbackRegistry[id]['_always'] = function( action, args, result ) {
					callback.call( handler, action, args, result );
				};
				return this;
			}
		};
		
		/*
			This method opens a dialog window or loads a dialog in a frame. It returns a new callbackHandler for this dialog.
		*/
		self.open = function( url, name, options ) {
			if ( options['frame'] ) {
				// use an existing frame - e.g. for a lightbox
				options['frame'].src = url;
				options['frame'].contentWindow.name = name;
			} else {
				if ( options['createNewWindow'] ) {
					do {
						var id = '_'+Math.floor((Math.random() * 100000)+1);
					} while ( callbackRegistry[name+id] );
					name = name + id;
				}
				if ( options['windowFeatures'] && !options['openInTab'] ) {
					var dialogWindow = window.open( url, name, options['windowFeatures'] );
				} else {
					var dialogWindow = window.open( url, name );
				}
				dialogWindow.focus();
				windowRegistry[name] = dialogWindow;
			}
			callbackRegistry[name] = {};
			optionsRegistry[name] = options;
			return new callbackHandler( name );
		};
		
		/*
			This method is meant to be used by the dialog's own javascript. It will call any registered callback functions
			for this dialog and the given action.
			e.g.: window.opener.muze.dialog.callback( window.name, 'cancel' ); 
		*/
		self.callback = function( windowName, action, args ) {
			if ( callbackRegistry[windowName] ) {
				var callbackList = callbackRegistry[windowName];
				if ( callbackList[action] ) {
					var result = callbackList[action].call( callbackList, args );
				} else if ( callbackList['_default'] ) {
					var result = callbackList['_default'].call( callbackList, action, args );
				}
				if ( callbackList['_always'] ) {
					result = callbackList['_always'].call( callbackList, action, args, result );
				}
				return result;
			}
		};

		/*
			This method can be used by the child window to check if the parent has a callback expected by the child.
			e.g.: window.opener.muze.dialog.hasCallback( window.name, 'submit' );
		*/

		self.hasCallback = function( windowName, action) {
			if ( callbackRegistry[windowName] ) {
				var callbackList = callbackRegistry[windowName];
				if (action) {
					if ( callbackList[action] ) {
						return true;
					}
				} else {
					return true;
				}
			}
			return false;
		}

		/* 
			This method is meant to be run from inside the dialog window. 
			It will trigger the callback in the opener
			It will return the result from the callback if it succeeded, null otherwise.
		*/
		self.return = function( action, values ) {
			if (window.opener && window.opener.muze && window.opener.muze.dialog) {
				return window.opener.muze.dialog.callback( window.name, action, values );
			} else if ( window.parent && window.parent.muze && window.parent.muze.dialog) {
				return window.parent.muze.dialog.callback( window.name, action, values );
			}
			return null;
		}

		/*
			This method is meant to be run from inside the dialog window. It will return a parameter passed
			by the opener to muze.dialog.open.
		*/
		self.getvar = function( name ) {
			if (window.opener && window.opener.muze && window.opener.muze.dialog ) {
				return window.opener.muze.dialog.getOption(window.name, name);
			} else {
				var p = window.parent;
				while ( p ) {
					if ( p.muze && p.muze.dialog ) {
						var option = p.muze.dialog.getOption(window.name, name);
						if ( typeof option != 'undefined' ) {
							return option;
						}
					}
					p = p.parent;
				}
			}
		}


		/*
			This method is used by a dialog, through the muze.dialog.getvar() method.
		*/
		self.getOption = function( windowName, name ) {
			if ( typeof optionsRegistry[ windowName ] != 'undefined' ) {
				return optionsRegistry[ windowName ][ name ];
			}
		}

		/*
			This method allows you to check whether a dialog exists.
		*/
		self.exists = function( windowName ) {
			return ( windowName in callbackRegistry );
		};

		/*
			This method tries to close the dialog window and removes all callback functions for it.
		*/
		self.close = function( windowName ) {
			if ( typeof windowRegistry[ windowName ] == 'object' ) {
				try {
					windowRegistry[ windowName ].close();
				} catch( e ) {
				}
			}
			delete windowRegistry[ windowName ];
			delete callbackRegistry[ windowName ];
		};

		return self;

	});

});muze.namespace("muze.ariadne.cookie", function() {
	return {
		set : function(name, value) {
			var today = new Date();
			var expiry = new Date(today.getTime() + 365 * 24 * 60 * 60 * 10000);
			var s = '';
			s += escape(name) + '=' + escape(value) + ';'
			s += 'path=/;';
			s += 'expires='+expiry.toGMTString();
			document.cookie = s;
		},
		get : function(name) {
			var result;
			var cookie = muze.ariadne.cookie.getarray();
			if (cookie[name]) {
				result=cookie[name];
			} else {
				result=0;
			}
			return result;
		},
		getarray : function() {
			var cookies = document.cookie.split(";");
			var result = { }
			for( i=0; i<cookies.length; i++) {
				var cookie = cookies[i];
				cookie = cookie.replace(/^\s+/, '');
				var cookie_array = cookie.split('=');
				result[unescape(cookie_array[0])] = unescape(cookie_array[1]);
			}
/*
			var s = '';
			for( n in result ) {
				s += n + '='+result[n] + '\n';
			}
			alert(s);
*/
			return result;
		}
	}
});
muze.namespace("muze.util.pngfix", function() {
	return function() {
		var arVersion = navigator.appVersion.split("MSIE")
		var version = parseFloat(arVersion[1])

		if ((version >= 5.5) && (version < 7) && (document.body.filters)) {
			for(var i=0; i<document.images.length; i++) {
				var img = document.images[i]
				var imgName = img.src.toUpperCase()
				if (imgName.substring(imgName.length-3, imgName.length) == "PNG" || imgName.substring(imgName.length-4, imgName.length) == "PNG/") {
					var imgID = (img.id) ? "id='" + img.id + "' " : "";
					var imgClass = (img.className) ? "class='" + img.className + "' " : "";
					var imgTitle = (img.title) ? "title='" + img.title + "' " : "title='" + img.alt + "' ";
					var imgStyle = "display:inline-block;" + img.style.cssText;
					if (img.align == "left") imgStyle = "float:left;" + imgStyle;
					if (img.align == "right") imgStyle = "float:right;" + imgStyle;
					if (img.parentElement.href) imgStyle = "cursor:hand;" + imgStyle;
					var strNewHTML = "<span " + imgID + imgClass + imgTitle
					+ " style=\"" + "width:" + img.width + "px; height:" + img.height + "px;" + imgStyle + ";"
					+ "filter:progid:DXImageTransform.Microsoft.AlphaImageLoader"
					+ "(src=\'" + img.src + "\', sizingMethod='crop');\"></span>";
					img.outerHTML = strNewHTML;
					i = i-1;
				}
			}
		}
	}
});
muze.namespace("muze.util.splitpane", function() {
	return { 
		getHorizSplitPane : function(sBGElId, sHandleEId, iLeft, iRight, leftContainer, rightContainer) {
			var slider = YAHOO.widget.Slider.getHorizSlider(sBGElId, sHandleEId, iLeft, iRight);
			var leftContainer = document.getElementById(leftContainer);
			var rightContainer = document.getElementById(rightContainer);
			var oriLeftWidth = parseInt(YAHOO.util.Dom.getStyle(leftContainer, "width"));
			var oriRightWidth = parseInt(YAHOO.util.Dom.getStyle(rightContainer, "width"));

			var oriRightLeft = parseInt(YAHOO.util.Dom.getStyle(rightContainer, "left"));

			var handleChange = function(x) {
				var x = this.getXValue();
					
				var leftWidth = oriLeftWidth + x;
				YAHOO.util.Dom.setStyle(leftContainer, "width", leftWidth + "px");
				YAHOO.util.Dom.setStyle(document.getElementById("treeDiv"), "width", leftWidth-24 + "px");
				
				//var rightWidth = oriRightWidth + (x * -1);
				//YAHOO.util.Dom.setStyle(rightContainer, "width", rightWidth + "px");

				var rightLeft = oriRightLeft + x;
				YAHOO.util.Dom.setStyle(rightContainer, "left", rightLeft + "px");
			} 
			slider.subscribe("change", handleChange);
			return slider;
		},
		getVertSplitPane : function(sBGElId, sHandleEId, iUp, iDown, topContainer, bottomContainer) {
			var slider = YAHOO.widget.Slider.getVertSlider(sBGElId, sHandleEId, iUp, iDown);
			var topContainer = document.getElementById(topContainer);
			var bottomContainer = document.getElementById(bottomContainer);
			var oriTopHeight = parseInt(YAHOO.util.Dom.getStyle(topContainer, "height"));
			var oriBottomHeight = parseInt(YAHOO.util.Dom.getStyle(bottomContainer, "height"));
				
			var handleChange = function(offsetFromStart) {
				var y = this.getYValue();
				var topHeight = oriTopHeight + y;

				YAHOO.util.Dom.setStyle(topContainer, "height", topHeight + "px");
				var bottomHeight = oriBottomHeight + (y * -1);

				YAHOO.util.Dom.setStyle(bottomContainer, "height", bottomHeight + "px");
			} 
			slider.subscribe("change", handleChange);
			return slider;
		}
	}
});
muze.namespace("muze.ariadne.registry", function() {
	var	ARregistry = { };
	return {
		set : function(name, value) {
			//alert('set ' + name + ":" + value);
			ARregistry[name] = new String(value);
		},
		get : function(name) {
			var result;
			if (ARregistry[name]) {
				result=ARregistry[name];
			} else {
				result=0;
			}
			return result;
		}
	}
});
//muze.namespace("muze.util");

muze.require("muze.ariadne.registry,muze.ariadne.cookie,muze.dialog,muze.util.pngfix,muze.util.splitpane", function() {

muze.namespace("muze.ariadne.explore", function() {
	var windowprops_common = 'resizable';
	var windowprops_full = 'directories,location,menubar,status,toolbar,resizable,scrollbars';
	var windowsize_small = ",height=300,width=550";
	var windowsize_large = ",height=495,width=550";

	return {
		// Array to store YAHOO.Util.Connect objects.
		loaders : Array(),
		authenticate_panel : null,
		windowprops : {
			'dialog_edit' 			: windowprops_common + windowsize_large,
			'dialog_edit_shortcut'		: windowprops_common + windowsize_large,
			'dialog_rename'			: windowprops_common + windowsize_small,
                        'dialog_move'                   : windowprops_common + windowsize_small,
			'dialog_copy'			: windowprops_common + windowsize_small,
			'dialog_link'			: windowprops_common + windowsize_small,
			'dialog_delete'			: windowprops_common + windowsize_small,
			'dialog_mogrify'		: windowprops_common + windowsize_small,
			'dialog_import'			: windowprops_common + windowsize_large,
			'dialog_export'			: windowprops_common + windowsize_large,
			'dialog_apkg'			: windowprops_common + windowsize_large,

			'dialog_svn_tree_info'		: windowprops_common + windowsize_large,
			'dialog_svn_tree_diff'		: windowprops_common + windowsize_large,
			'dialog_svn_tree_commit'	: windowprops_common + windowsize_large,
			'dialog_svn_tree_revert'	: windowprops_common + windowsize_large,
			'dialog_svn_tree_update'	: windowprops_common + windowsize_large,
			'dialog_svn_tree_unsvn'		: windowprops_common + windowsize_large,
			'dialog_svn_tree_checkout'	: windowprops_common + windowsize_large,
			'dialog_svn_tree_import'	: windowprops_common + windowsize_large,
			
			'dialog_svn_templates_resolved'	: windowprops_common + windowsize_large,
			'dialog_svn_templates_diff'	: windowprops_common + windowsize_large,
			'dialog_svn_templates_serverdiff'	: windowprops_common + windowsize_large,
			'dialog_svn_templates_commit'	: windowprops_common + windowsize_large,
			'dialog_svn_templates_revert'	: windowprops_common + windowsize_large,
			'dialog_svn_templates_update'	: windowprops_common + windowsize_large,
			'dialog_svn_templates_delete'	: windowprops_common + windowsize_large,
			'dialog_svn_templates_unsvn'	: windowprops_common + windowsize_large,
			'dialog_svn_templates_checkout'	: windowprops_common + windowsize_large,
			'dialog_svn_templates_import'	: windowprops_common + windowsize_large,

			'dialog_priority'		: windowprops_common + windowsize_small,

			// FIXME: The dialog sizes should be as consistent as possible, not all different sizes.
			'dialog_add' 			: windowprops_common + ',height=600,width=550',
			'dialog_cache'			: windowprops_common + ',height=660,width=500',
			'dialog_templates'		: windowprops_common + ',height=500,width=800',
			'dialog_custom'			: windowprops_common + windowsize_large, //',height=300,width=625',
			'dialog_language'		: windowprops_common + ',height=350,width=450',
			'dialog_grants'			: windowprops_common + ',height=570,width=950',
			'dialog_owner'			: windowprops_common + windowsize_small, //',height=260,width=400',
			'dialog_grantkey'		: windowprops_common + ',height=330,width=400',
			'dialog_preferences'		: windowprops_common + ',height=400,width=500',
			'dialog_search'			: windowprops_common + ',height=500,width=700',
			'help_about'			: windowprops_common + ',height=375,width=600',
			'dialog_browse'			: windowprops_common + ',height=550,width=780',
			'help'				: windowprops_full,
			'_new'				: windowprops_full,

			// Deprecated window names.
			'edit.find'				: windowprops_common + ',height=500,width=700',
			'edit.preferences'		: windowprops_common + ',height=400,width=500',
			'edit.object.data'		: windowprops_common + ',height=475,width=550',
			'edit.object.layout'	: windowprops_common + ',height=400,width=700',
			'edit.object.custom'	: windowprops_common + ',height=300,width=625',
			'edit.object.shortcut'	: windowprops_common + ',height=475,width=550',
			'edit.object.grants'	: windowprops_common + ',height=570,width=950',
			'edit.object.types'		: windowprops_common + ',height=300,width=500',
			'edit.object.nls'		: windowprops_common + ',height=350,width=450',
			'edit.priority'			: windowprops_common + ',height=220,width=400',
			'edit.object.grantkey'	: windowprops_common + ',height=330,width=400',
			'edit.object.mogrify'	: windowprops_common + ',height=250,width=400',
			'edit.object.owner'		: windowprops_common + ',height=260,width=400',
			'view.fonts'			: windowprops_common + ',height=300,width=450',
			'help.about'			: windowprops_common + ',height=375,width=600',
			'svn.object.info'		: windowprops_common + ',height=475,width=550',
			'svn.object.diff'		: windowprops_common + ',height=475,width=550',
			'svn.object.commit'		: windowprops_common + ',height=475,width=550',
			'svn.object.revert'		: windowprops_common + ',height=475,width=550',
			'svn.object.update'		: windowprops_common + ',height=475,width=550',
			'svn.object.unsvn'		: windowprops_common + ',height=475,width=550',
			'svn.object.checkout'		: windowprops_common + ',height=475,width=550',
			'svn.object.import'		: windowprops_common + ',height=475,width=550'
		},
		store_root : muze.ariadne.registry.get('store_root'), // FIXME: deze wordt te vroeg gedaan, dus is leeg.
		authenticate_loaders : Array(),
		authenticate : function(callback, message) {
			muze.ariadne.explore.authenticate_loaders.push(callback); // Store the original loaders to fire when authentication is done;
			if (muze.ariadne.explore.authenticate_panel == null) {
				// Check if the panel exists, if not create one. If it does, we already popped up a login screen.
				muze.ariadne.explore.authenticate_panel = new YAHOO.widget.Panel("login_panel", { 
					// not needed, panel sizes to fit the contents. width: "540px", 
					//height: "300px",
					fixedcenter: true,
					close: false,
					draggable: false,
					zindex: 10,
					modal: true,
					visible: false
				});

				var login_path = muze.ariadne.registry.get('path');
				if (!login_path) {
					login_path = '/';
				}

				// FIXME: Find the login form in login_form and insert that into the body;
				var login_url = muze.ariadne.registry.get('store_root') + muze.ariadne.registry.get('path') + 'user.login.form.html';
				if (message) {
					login_url += '?arLoginMessage='+escape(message);
				}
				var login_form = muze.load(login_url, true); // Load the url and wait for the result.

				muze.ariadne.explore.authenticate_panel.setBody(login_form);
				muze.ariadne.explore.authenticate_panel.render(document.body);

				var form = muze.ariadne.explore.authenticate_panel.body.getElementsByTagName('FORM')[0];
				muze.event.attach( form, 'submit', function(evt) {
					evt = muze.event.get(evt);
					var ARLogin = document.getElementById("ARLogin").value;
					var ARPassword = document.getElementById("ARPassword").value;
					muze.ariadne.explore.authenticate_panel.hide();
					muze.ariadne.explore.authenticate_panel.destroy();
					muze.ariadne.explore.authenticate_panel = null;
					// Fire the original loaders again, and reset the stack afterwards;
					for (i=0; i<muze.ariadne.explore.authenticate_loaders.length; i++) {
						muze.ariadne.explore.authenticate_loaders[i](ARLogin, ARPassword); // Fire the original loader.
					}
					ARLogin = '';
					ARPassword = '';
					muze.ariadne.explore.authenticate_loaders = Array();
					return muze.event.cancel( evt );
				});
				muze.ariadne.explore.authenticate_panel.show();
				document.getElementById("ARLogin").focus();
			}
		},
		load : function(url, target, callback, postvars) {
			if (!callback) {
				callback = function(){};
			}
			// Load the contents of given path into the target element
			var load_callback = {
				success : function(result) {
					if (result.responseText !== undefined) {
						// FIXME: do we need to check result.status == 200 as well?
						if (result.getResponseHeader["X-Ariadne-401"]) {
							muze.ariadne.explore.authenticate(
								function(ARLogin, ARPassword) {
									var postvars = "ARLogin=" + ARLogin + "&ARPassword=" + ARPassword;
									muze.ariadne.explore.load(url, target, callback, postvars)
								},
								result.getResponseHeader["X-Ariadne-401"]
							);
						} else {
							target.innerHTML = result.responseText;
							muze.util.pngfix();
							callback();
						}
						delete muze.ariadne.explore.loaders[target.id];
					}
				},

				failure : function(result) {
					if(muze.ariadne.explore.loaders[target.id] && !muze.ariadne.explore.loaders[target.id].ariadneIgnoreErrors) {
						alert(muze.ariadne.nls["notfoundpath"]);
						for (loader_id in muze.ariadne.explore.loaders) {
							// YAHOO.util.Connect.abort(muze.ariadne.explore.loaders[loader_id]);
							// delete muze.ariadne.explore.loaders[loader_id];
							muze.ariadne.explore.loaders[loader_id].ariadneIgnoreErrors = true;
						}
					}
					callback();
				}
			}
			
			// Cancel previous request if there is one.
			if (muze.ariadne.explore.loaders[target.id]) {
				YAHOO.util.Connect.abort(muze.ariadne.explore.loaders[target.id]);
			}
			if (!postvars) {
				muze.ariadne.explore.loaders[target.id] = YAHOO.util.Connect.asyncRequest('GET', url, load_callback); 
			} else {
				muze.ariadne.explore.loaders[target.id] = YAHOO.util.Connect.asyncRequest('POST', url, load_callback, postvars);
			}
		},
		view : function(target) {
			var node;
			var path;
			if (target.path) {
				node = target;
				path = target.path;
			} else {
				path = target;
			}

			// Contain in dialog root.
			if (!muze.ariadne.explore.viewable(path)) { return }

			if (node) {
				muze.ariadne.explore.tree.view(node);
			} else {
				muze.ariadne.explore.tree.view(path);
			}
			muze.ariadne.explore.viewpane.view(path); // viewpane before sidebar to allow unselect to happen first.
			muze.ariadne.explore.sidebar.view(path);
			muze.ariadne.explore.browseheader.view(path);
			muze.ariadne.explore.toolbar.view(path);
			muze.ariadne.registry.set('path', path);
		},
		setnls : function(nls) {
			muze.ariadne.registry.set('store_root', muze.ariadne.registry.get('ARRoot')+'/-'+muze.ariadne.registry.get('SessionID')+'-/'+nls);
			muze.ariadne.explore.objectadded();
		},
		objectadded : function() {
			var path = muze.ariadne.registry.get('path', path);
			muze.ariadne.explore.tree.view(path);
			if (muze.ariadne.explore.sidebar.currentpath) {
				muze.ariadne.explore.sidebar.view(muze.ariadne.explore.sidebar.currentpath);
			} else {
				muze.ariadne.explore.sidebar.view(path);
			}
			if (muze.ariadne.explore.viewpane.selectedPath) {
				muze.ariadne.explore.viewpane.view(muze.ariadne.explore.viewpane.path);
				muze.ariadne.explore.viewpane.saved_load_handler = muze.ariadne.explore.viewpane.load_handler;
				muze.ariadne.explore.viewpane.load_handler = function() {
					muze.ariadne.explore.viewpane.saved_load_handler();
					muze.ariadne.explore.viewpane.load_handler = muze.ariadne.explore.viewpane.saved_load_handler;
					muze.ariadne.explore.viewpane.reselect();
				};
			} else {
				muze.ariadne.explore.viewpane.view(path);
			}
			if (muze.ariadne.explore.browseheader.currentpath) {
				muze.ariadne.explore.browseheader.view(muze.ariadne.explore.browseheader.currentpath);
			} else {
				muze.ariadne.explore.browseheader.view(path);
			}
		},
		arEdit : function(object, arguments) {
			muze.ariadne.explore.arshow('dialog_edit',this.store_root+object+'dialog.edit.php', arguments);
		},
		arshow : function (windowname, link, arguments) {
			windowname = windowname.replace(/\./g, "_");
			var properties = muze.ariadne.explore.windowprops[windowname];
			var myNewWindow = 0;
			if( windowname == 'dialog_templates' && muze.ariadne.registry.get('window_new_layout')) {
				myNewWindow = 1;
			}

			if( windowname == 'dialog_grants' && muze.ariadne.registry.get('window_new_grants')) {
				myNewWindow = 1;
			}
			
			if( myNewWindow ) {
				// append a timestamp to allow multiple template windows
				var myDate = new Date();
				windowname = myDate.getTime() + windowname;
			}
			// get the SessionID from the top so we can uniquely name windows
			var sessionid = muze.ariadne.registry.get("SessionID");

			/* FIXME: doesn't work without frames on mozilla*/ 
			var windowsize=muze.ariadne.registry.get(windowname);
			if (windowsize) {
				// alert('windowsize='+windowsize);
				properties=properties+','+windowsize;
			}
			if (!arguments || arguments=='undefined') {
				arguments='';
			}
			arguments = window.location.search+arguments;
			if ( properties ) {
				var workwindow = window.open(link+arguments, windowname, properties);
			} else {
				var workwindow = window.open(link+arguments, windowname );
			}
			workwindow.focus();
		},
		viewable : function(path) {
			// Contain in dialog jail
			var jail = muze.ariadne.registry.get('jail');
			if ( !jail ) {
				jail = '/';
			}
			if ( path.indexOf(jail)==0 ) {
				return true;
			}
			return false;
		},
		getparent : function(path) {
			var parent = path.substring(0, path.length - 1); // strip last slash;
			var lastslash = parent.lastIndexOf('/');
			if ( lastslash != -1 ) {
				parent = parent.substring(0, lastslash);
			}
			parent = parent + "/";
			return parent;
		},
		dateParser : function(date) {
			var dateInfo = date.split("-");
			// javascript is braindead: day and year are 1 based, month is 0 based, so Y:2014 M:0 D:1 results in Y-M-D '2014-01-01' 
			return new Date(dateInfo[2], dateInfo[1]-1, dateInfo[0]);
		},
		dateFormatter : function(container, record, column, data) {
			container.innerHTML = YAHOO.util.Date.format(data, {format:"%d-%m-%Y"});
		}
	}
});

muze.namespace("muze.ariadne.explore.tree", function() {
	var tree;

	function getNodeHTML(node) {
		// Creates the html for displaying in the node, adding icon, path, flag etc.
		var nodeHTML =  "<a href=\"" +
				"javascript:muze.ariadne.explore.view('" + escape(node.path) + "')" +
				"\">";
		if (node.icon) {
			nodeHTML += "<img class='tree_icon' align=\"left\" src=\"" + node.icon + "\">";
		}
		if( node.overlay_icon) {
			nodeHTML += "<img class='tree_overlay_icon' align=\"left\" src=\"" + node.overlay_icon + "\">";
		}

		if (node.svn_icon) {
			nodeHTML += "<img class='tree_svn_icon' align=\"left\" src=\"" + node.svn_icon + "\">";
		}

		nodeHTML += 	"<span class='tree_nodename'>";
		if (node.pre) {
			nodeHTML += node.pre;
		}
		var myname = node.name;
		if (!myname) {
			myname = '';
		}	
		myname = myname.replace("&", "&amp;");
		myname = myname.replace("<", "&lt;");
		myname = myname.replace(">", "&gt;");
		nodeHTML +=	myname + "</span>" +
				"</a>";	
		return nodeHTML;
	}

	function getNodeData(node) {
		var nodeHTML = getNodeHTML(node);
		var result = {html: nodeHTML, path: node.path};
		return result;
	}

	function loadNodeData(node, fnLoadComplete, postvars) {
		//Get the node's path and urlencode it; this is the path we will search for.
		var nodePath = encodeURI(node.path);
		
		//prepare URL for XHR request:
		var time = new Date();
		var sUrl = muze.ariadne.explore.tree.loaderUrl + nodePath + "system.list.folders.json.php?sanity=true&" + time.getTime();

		var order = muze.ariadne.registry.get('order');
		var direction = muze.ariadne.registry.get('direction');

		if (order) {
			sUrl += "&order=" + order;
		}
		if (direction) {
			sUrl += "&direction=" + direction;
		}

		//prepare our callback object
		var callback = {
			//if our XHR call is successful, we want to make use
			//of the returned data and create child nodes.
			success: function(oResponse) {
				//YAHOO.log(oResponse.responseText);
				if (oResponse.getResponseHeader["X-Ariadne-401"]) {
					muze.ariadne.explore.authenticate(
						function(ARLogin, ARPassword) {
							//muze.ariadne.explore.tree.view(node.path);
							var postvars = "ARLogin=" + ARLogin + "&ARPassword=" + ARPassword;
							loadNodeData(node, fnLoadComplete, postvars);
						}
					);
				} else {
					var oResults = eval("(" + oResponse.responseText + ")");

					var treeNodes = oResults.objects;

					if(treeNodes && treeNodes.length) {
						//Result is an array if more than one result, string otherwise
						if(YAHOO.lang.isArray(treeNodes)) {
							for (var i=0, j=treeNodes.length; i<j; i++) {
								var nodeData = getNodeData(treeNodes[i]);
								var tempNode = new YAHOO.widget.HTMLNode(nodeData, node, false, 1);
								tempNode.path = treeNodes[i].path;
							}
						}
					}
					
					//When we're done creating child nodes, we execute the node's
					//loadComplete callback method which comes in via the argument
					//in the response object (we could also access it at node.loadComplete,
					//if necessary):
					oResponse.argument.fnLoadComplete();
					muze.util.pngfix();
				}
			},
			
			//if our XHR call is not successful, we want to
			//fire the TreeView callback and let the Tree
			//proceed with its business.
			failure: function(oResponse) {
				YAHOO.log("Failed to process XHR transaction.", "info", "example");
				oResponse.argument.fnLoadComplete();
			},
			
			//our handlers for the XHR response will need the same
			//argument information we got to loadNodeData, so
			//we'll pass those along:
			argument: {
				"node": node,
				"fnLoadComplete": fnLoadComplete
			},
			
			//timeout -- if more than 7 seconds go by, we'll abort
			//the transaction and assume there are no children:
			timeout: 15000
		};
		
		//With our callback object ready, it's now time to 
		//make our XHR call using Connection Manager's
		//asyncRequest method:
		if (!postvars) {
			YAHOO.util.Connect.asyncRequest('GET', sUrl, callback);
		} else {
			YAHOO.util.Connect.asyncRequest('POST', sUrl, callback, postvars);
		}
	}

	function buildTree(nodes) {
		//create a new tree:
		tree = new YAHOO.widget.TreeView("treeDiv");
		//turn dynamic loading on for entire tree:
		tree.setDynamicLoad(loadNodeData);

		//get root node for tree:
		var root = tree.getRoot();
		var firstNode;
		for (i in nodes) {
			var node = nodes[i];
			var nodeData = getNodeData(node);
			var tempNode = new YAHOO.widget.HTMLNode(nodeData, root, false, 1);
			tempNode.path = node.path;
			if (!firstNode) {
				firstNode = tempNode;
			}
		}

		//render tree with these toplevel nodes; all descendants of these nodes
		//will be generated as needed by the dynamic loader.
		tree.draw();

		tree.subscribe('clickEvent', function(target) {muze.ariadne.explore.view(target.node);});
		tree.subscribe('enterKeyPressed', function(node) {muze.ariadne.explore.view(node);});
		firstNode.expand();
		muze.ariadne.explore.tree.view(muze.ariadne.registry.get("path"));
	}

	var status = 'visible';
	var lastloaded;

	return {
		treewidth: "220px",
		init : function() {
			var baseNodes = muze.ariadne.explore.tree.baseNodes;
			buildTree(baseNodes);
		},
		setpath : function(target) {
			if (!tree) { return; }
			var node;
			if (target.path) {
				node = target;
				path = target.path;
			} else {
				path = target;
				node = tree.getNodeByProperty("path", path);
			}

			if (!tree) { return }

			// Contain in dialog root.
			if (!muze.ariadne.explore.viewable(path)) { return }

			tree.unsubscribe('expandComplete');
			var parent = path;
			while (!node && parent) {
				parent = parent.substring(0, parent.length-1);
				parent = parent.substring(0, parent.lastIndexOf('/')+1);
				node = tree.getNodeByProperty("path", parent);
			}

			
			if (parent != path) {
				tree.subscribe('expandComplete', function(node) {
					tree.unsubscribe('expandComplete');
					if (lastloaded != node.path) { // Prevent looping if the object does not show up in the tree.
						lastloaded = node.path;
						muze.ariadne.explore.tree.setpath(path);
					}
				});
			}
			if(node) {
				tree.removeChildren(node);
				document.getElementById(node.contentElId).scrollIntoView(false);
				node.expand();
			} else {
				tree.unsubscribe('expandComplete');
			}
		},
		refresh : function(path) {
			if (!tree) { return; }
			var node = tree.getNodeByProperty("path", path);
			if (node && node.parent) {
				if (path != tree.getRoot().children[0].path) {
					tree.removeChildren(node.parent);
				}
				muze.ariadne.explore.tree.setpath(path);
			}
		},
		view : function(path) {
			muze.ariadne.explore.tree.setpath(path);
		},
		toggle : function() {
			if (muze.ariadne.explore.tree.status == 'hidden') {
				muze.ariadne.explore.tree.show();
			} else {
				muze.ariadne.explore.tree.hide();
			}
			return status;
		},
		hide : function() {
			if (document.getElementById("explore_managediv").style.left) {
				muze.ariadne.explore.tree.treewidth = document.getElementById("explore_managediv").style.left;
			}
			var animation = new YAHOO.util.Motion('explore_managediv', { left: {to: 0}}, 0.1);
			animation.animate();

			muze.ariadne.explore.tree.status = "hidden";
		},
		show : function() {
			var animation = new YAHOO.util.Motion('explore_managediv', { left: {to: parseInt(muze.ariadne.explore.tree.treewidth)}}, 0.1);
			animation.animate();
			muze.ariadne.explore.tree.status = "visible";
		},
		getstatus : function() {
			return muze.ariadne.tree.status;
		}
	}
});

muze.namespace( 'muze.ariadne.explore.toolbar', function() {
	return {
		init : function() {
			var menuBar = new YAHOO.widget.MenuBar("explore_menubar", { autosubmenudisplay: true, hidedelay: 750, showdelay: 0, lazyload: true });
			menuBar.render();
			muze.ariadne.explore.toolbar.view(document.getElementById("searchpath").value);
		},
		view : function(path) {
			var searchPath = document.getElementById("searchpath");
			if (searchPath.value == path) {
				return;
			}
			searchPath.value = path;
			muze.event.fire(window, "searchPathUpdated");
			var parent = muze.ariadne.explore.getparent(path);
			if (!muze.ariadne.explore.viewable(parent)) {
				document.getElementById("viewparent").style.opacity = '0.3';
			} else {
				document.getElementById("viewparent").style.opacity = '1';
			}
			muze.ariadne.explore.searchbar.init();
		},
		viewparent : function() {
			if( muze.ariadne.explore.viewpane.selectedPath ) {
				var path = muze.ariadne.explore.viewpane.selectedPath;
			} else {
				var path = muze.ariadne.registry.get('path');
			}
			var parent = muze.ariadne.explore.getparent(path);
			muze.ariadne.explore.view(parent);
		},
		searchsubmit : function(path) {
			// Check for trailing slash, add if needed.
			if ((path != '/') && (path.substring(path.length - 1, path.length) != '/')) {
				path = path + "/";
			}
			muze.ariadne.explore.view(path);
		},
		searchwindow : function() {
			muze.ariadne.explore.arshow('dialog_search', muze.ariadne.registry.get('store_root')+muze.ariadne.registry.get('path')+'dialog.search.php');
		},
		load : function(path) {
			var sUrl = muze.ariadne.registry.get('store_root')+path+'explore.toolbar.php';
			var fadeOut = new YAHOO.util.Anim("explore_top", { opacity: {to: 0.3}}, 0.1);
			fadeOut.animate();
			var fadeIn = function() {
				var fadeIn = new YAHOO.util.Anim("explore_top", { opacity: {to: 1}}, 0.1);
				fadeIn.animate();

				// Fix for PNG filters in IE6 that break while using another filter;
				fadeIn.onComplete.subscribe(function() {
					document.getElementById("explore_top").style.filter = '';
				});
			};

			muze.ariadne.explore.load(sUrl, document.getElementById("explore_top"), fadeIn, false);
		}
	}
});


muze.namespace( 'muze.ariadne.explore.searchbar', function() {
	var oAC;

	return {
		init : function() {
			return; // 	FIXME: temporarly disabeled - use of return false here will prevent the other onDOMReady inits.

			// Use an XHRDataSource
			var nodePath = encodeURI(muze.ariadne.registry.get('path'));

			var oDS = new YAHOO.util.XHRDataSource(''); // muze.ariadne.explore.tree.loaderUrl + nodePath + "system.search.json");
			
			// Set the responseType
			oDS.responseType = YAHOO.util.XHRDataSource.TYPE_TEXT;
			// Define the schema of the delimited results
			// oDS.responseSchema = {
			//	recordDelim: "\n",
			//	fieldDelim: "\t"
			//};

			oDS.responseType = YAHOO.util.XHRDataSource.TYPE_JSON;
			// Define the schema of the delimited results
			oDS.responseSchema = {
				resultsList:"entries",
				fields: ["path","name", "icons", "overlay_icons"]
			};

			// Enable caching
			oDS.maxCacheEntries = 5;
			// Instantiate the AutoComplete
			if (typeof(oAC) == 'undefined') {
				oAC = new YAHOO.widget.AutoComplete("searchpath", "resultscontainer", oDS);
			} else {
				// FIXME: reset is undefined
				//oAC.reset();
			}
			oAC.generateRequest = function(sQuery) {
				return muze.ariadne.explore.tree.loaderUrl + muze.ariadne.registry.get('path') +  "system.search.json?query=" + sQuery;
			};

			oAC.formatResult = function(oResultItem, sQuery) { 
				// This was defined by the schema array of the data source
				var image = "<img src='" + oResultItem[2].medium + "'>";
				if (oResultItem[3] && oResultItem[3].medium) {
					image += "<img class='icon_overlay' src='" + oResultItem[3].medium + "'>";
				}

				return image + " <span>" + oResultItem[0] + "<br>" + oResultItem[1] + "</span>";
			};

			oAC.maxResultsDisplayed = 20;

			return {
				oDS: oDS,
				oAC: oAC
			};
		}
	}
});

muze.namespace( 'muze.ariadne.explore.splitpane', function() {
	return {
		init : function() {
			muze.util.splitpane.getHorizSplitPane("splitpane_slider", "splitpane_thumb", 0, 9999, "explore_tree", "explore_managediv");
		}
	}
});

muze.namespace( 'muze.ariadne.explore.sidebar', function() {
	return {
		currentpath : null,
		invisibleSections : new Object(),
		exists : function() {
			if (document.getElementById("sidebar")) {
				return true;
			} else {
				return false;
			}
		},
		objectadded : function() {
			var fileListFrame=parent.document.getElementById('archildren');
			if (fileListFrame) {
				fileListFrame.src=fileListFrame.src;
			} else {
				parent.archildren.src=parent.archildren.src;
			}
		},
		arEdit : function(object, arguments) {
			muze.ariadne.explore.arshow('dialog_edit',muze.ariadne.registry.get("store_root")+object+'dialog.edit.php', arguments);
		},
		removeFromCookie : function(section){
			if (muze.ariadne.explore.sidebar.invisibleSections[section]) {
				delete muze.ariadne.explore.sidebar.invisibleSections[section];
				muze.ariadne.explore.sidebar.setInvisiblesCookie();
			}
		},
		addToCookie : function(section) {
			muze.ariadne.explore.sidebar.invisibleSections[section] = 1;
			muze.ariadne.explore.sidebar.setInvisiblesCookie();
		},
		setInvisiblesCookie : function() {
			var value = '';
			for (section in muze.ariadne.explore.sidebar.invisibleSections) {
				value += section + ";";
			}
			muze.ariadne.cookie.set('invisibleSections', value);
		},
		getInvisiblesCookie : function() {
			var value = muze.ariadne.cookie.get('invisibleSections');
			if ( value != 0 ) {
				cookie = unescape(value);
				cookie = cookie.substring(0, cookie.length - 1);
				cookie = cookie.split(';');
				for (j=0; j < cookie.length; j++ ) {
					var section = cookie[j];
					muze.ariadne.explore.sidebar.invisibleSections[section] = 1;
				}
			}
		},
		removefilter: function() {
			if (muze.ariadne.explore.sidebar.exists()) {
				document.getElementById("sidebar").style.filter = '';
			}
		},
		load : function(path) {
			// Contain in dialog root.
			if (!muze.ariadne.explore.viewable(path)) { return }

			muze.ariadne.explore.sidebar.currentpath = path;
			var template = 'explore.sidebar.php';
			
			var selected = YAHOO.util.Dom.getElementsByClassName("selectable-selected", "*", "archildren");
			if (selected.length > 1) {
				template = 'explore.sidebar.multiple.php';
			}
			
			var sUrl = muze.ariadne.registry.get('store_root')+path+template;

			var fadeOut = new YAHOO.util.Anim("sidebar", { opacity: {to: 0.3}}, 0.1);
			fadeOut.animate();
			var fadeIn = function() {
				var fadeIn = new YAHOO.util.Anim("sidebar", { opacity: {to: 1}}, 0.1);
				fadeIn.animate();

				if (document.getElementById("workspace_body")) {
					document.getElementById("explore_managediv").className = "managediv workspaced";
				} else {
					document.getElementById("explore_managediv").className = "managediv";
				}

				// Fix for PNG filters in IE6 that break while using another filter;
				fadeIn.onComplete.subscribe(function() {
					document.getElementById("sidebar").style.filter = '';
				});
			};

			muze.ariadne.explore.load(sUrl, document.getElementById("sidebar"), fadeIn, false);
		},
		view : function(path) {
			if (muze.ariadne.explore.sidebar.exists()) {
				muze.ariadne.explore.sidebar.load(path);
			}
		}
	}
});

muze.namespace( 'muze.ariadne.explore.sidebar.section', function() {
	return {
		isCollapsed : function(section) {
			var sectiondiv = document.getElementById(section + '_body').parentNode;
			if (YAHOO.util.Dom.hasClass(sectiondiv, 'collapsed')) {
				return true;
			} else {
				return false;
			}
		},
		collapse : function(section) {
			var sectiondiv = document.getElementById(section + '_body').parentNode;

			var animation = new YAHOO.util.Motion(section + '_body', { height: {to: 0}}, 0.05);
			animation.onComplete.subscribe(function() {
				YAHOO.util.Dom.removeClass(sectiondiv, 'expanded');
				YAHOO.util.Dom.addClass(sectiondiv, 'collapsed');
			});
			animation.animate();

			muze.ariadne.explore.sidebar.addToCookie(section);
		},
		expand : function(section) {
			var sectiondiv = document.getElementById(section + '_body').parentNode;


			document.getElementById(section + "_body").style.height = "auto";
			var myheight = parseInt(document.getElementById(section + "_body").offsetHeight);
			document.getElementById(section + "_body").style.height = "0px";
			
			YAHOO.util.Dom.removeClass(sectiondiv, 'collapsed');
			YAHOO.util.Dom.addClass(sectiondiv, 'expanded');

			var animation = new YAHOO.util.Motion(section + '_body', { height: {to: myheight}}, 0.05);
			animation.animate();
			muze.ariadne.explore.sidebar.removeFromCookie(section);
		},
		toggle : function(section) {
			if (muze.ariadne.explore.sidebar.section.isCollapsed(section)) {
				muze.ariadne.explore.sidebar.section.expand(section);
			} else {
				muze.ariadne.explore.sidebar.section.collapse(section);
			}
		}
	}
});

muze.namespace( 'muze.ariadne.explore.viewpane', function() {
	return {
		saved_load_handler : null,
		selectedItem : null,
		selectedPath : null,
		path : null,
		typefilter : null,
		exists : function() {
			if (document.getElementById("viewpane")) {
				return true;
			} else {
				return false;
			}
		},
		removefilter: function() {
			if (muze.ariadne.explore.viewpane.exists()) {
				document.getElementById("viewpane").style.filter = '';
			}
		},
		filter : function(type) {
			muze.ariadne.explore.viewpane.typefilter = type;
			muze.ariadne.explore.viewpane.view(muze.ariadne.explore.viewpane.path);
		},
		setitempath : function(item) {
			if (!item.path) {
				if (item.tagName == "TR") {
					var record = muze.ariadne.explore.viewpane.dataTable.getRecord(item);
					item.path = record.getData("path");
				} else {
					var href = item.getElementsByTagName("A")[0].href;
					href = decodeURI(href);

					var store_root = muze.ariadne.registry.get('store_root');

					// Find the location of the store root, and take everything behind it.
					var store_root_pos = href.indexOf(store_root);

					// If not found, remove the language
					if (store_root_pos < 0) {
						store_root = store_root.substring(0, store_root.lastIndexOf("/")); 
						store_root_pos = href.indexOf(store_root);
					}

					// If still not found, remove the session
					if (store_root_pos < 0) {
						store_root = store_root.substring(-1);
						store_root = store_root.substring(0, store_root.lastIndexOf("/"));

						store_root_pos = href.indexOf(store_root);
					}

					var path = href.substring(store_root_pos + store_root.length, href.length);
					// Remove "explore.html from the end, and all other trailing stuff.
					var explore_pos = path.indexOf('explore.html'); // FIXME: configbaar maken.
					if (explore_pos == -1) {
						explore_pos = path.indexOf('dialog.browse.php');
					}

					if (explore_pos != -1) {
						item.path = path.substring(0, explore_pos);
					}
				}
			}
		},
		reselect : function() {
			var viewmode=muze.ariadne.registry.get('viewmode');
			if (!viewmode) {
				viewmode = 'list';
			}

			if (muze.ariadne.explore.viewpane.selectedItem && muze.ariadne.explore.viewpane.selectedItem.path) {
				var path = muze.ariadne.explore.viewpane.selectedItem.path;
				if (viewmode != 'details') {
					var items = document.getElementById("viewpane").getElementsByTagName("LI");
					for (i=0; i<items.length; i++) {
						muze.ariadne.explore.viewpane.setitempath(items[i]);
						if (items[i].path == path) {
							YAHOO.util.Dom.addClass(items[i], 'selected');
							muze.ariadne.explore.viewpane.selectedItem = items[i];
							break;
						}
					}
				} else {
					if (muze.ariadne.explore.viewpane.dataTable) {
						var records = muze.ariadne.explore.viewpane.dataTable.getRecordSet().getRecords();
						for (i=0; i<records.length; i++) {
							if (records[i].getData("path") == path) {
								records[i].path = records[i].getData("path");
								muze.ariadne.explore.viewpane.selectedItem = records[i];
								muze.ariadne.explore.viewpane.dataTable.selectRow(records[i]);
								break;
							}
						}
					}
				}
			}
		},
		selectItem : function(item) {
			YAHOO.util.Dom.addClass(item, 'selected');
			if (item != muze.ariadne.explore.viewpane.selectedItem){
				muze.ariadne.explore.viewpane.selectedItem = item;
				muze.ariadne.explore.viewpane.onSelectItem(item);
			}
		},
		unselectItem : function() {
			if (muze.ariadne.explore.viewpane.selectedItem) {
				YAHOO.util.Dom.removeClass(muze.ariadne.explore.viewpane.selectedItem, 'selected');
				muze.ariadne.explore.viewpane.selectedItem = null;
			}
			if (muze.ariadne.explore.viewpane.dataTable) {
				muze.ariadne.explore.viewpane.dataTable.unselectAllRows();
			}

			var items = YAHOO.util.Dom.getElementsByClassName("selected", "li", "viewpane");
			for (var i=0; i<items.length; i++) {
				YAHOO.util.Dom.removeClass(items[i], "selected");
			}

			var items = YAHOO.util.Dom.getElementsByClassName("selectable-selected", "*", "archildren");
			for (var i=0; i<items.length; i++) {
				YAHOO.util.Dom.removeClass(items[i], "selectable-selected");
			}
		},
		hideRows : function() {
			var priorities = document.querySelectorAll("td.yui-dt-col-priority");
			for (var i=0; i<priorities.length; i++) {
				var prio = parseInt(priorities[i].innerText);
				if (prio < 0) {
					priorities[i].parentNode.classList.add("explore_item_hidden");
				}
			}
		},
		rowClick : function(args) {
			var event = args.event;
			YAHOO.util.Event.stopEvent(event);

			return;

			if (!event.ctrlKey) {
				this.unselectAllRows();
			}

			var data = this.getRecord(args.target);

			var path = data.getData("path");
			args.target.path = path;

			//var filename = data.getData("filename");
			//args.target.path = muze.ariadne.explore.viewpane.path + filename + '/';

			this.selectRow(args.target);
			muze.ariadne.explore.viewpane.selectedItem = args.target;
			muze.ariadne.explore.viewpane.onSelectItem(args.target);
			// FIXME: with the regular onClick not in place, we need a way to unselect a row.
		},
		rowDoubleClick : function(args) {
			var event = args.event;
			YAHOO.util.Event.stopEvent(event);

			var path = this.getRecord(args.target).getData('path');

			//var path = muze.ariadne.explore.viewpane.path + this.getRecord(args.target).getData('filename') + '/';
			muze.ariadne.explore.view(path);
		},
		onEventHighlightRow : function(event) {
			YAHOO.util.Dom.addClass(event.target, "highlight");
		},
		onEventUnhighlightRow : function(event) {
			YAHOO.util.Dom.removeClass(event.target, "highlight");
		},
		onEventSortColumn : function(event, dir) {
			if (event.dir == 'yui-dt-asc') {
				event.dir = 'asc';
			}
			if (event.dir == 'yui-dt-desc') {
				event.dir = 'desc';
			}

			muze.ariadne.registry.set('order', event.column.key);
			muze.ariadne.registry.set('direction', event.dir);
		},
		onClick : function(event) {
			target = event.target;
			while ( target && target.tagName != 'A' ) {
				target = target.parentElement;
			}
			if ( target && target.classList.contains('explore_link') ) {
				YAHOO.util.Event.preventDefault(event);
			}
		},
		setviewmode : function(viewmode) {
			muze.ariadne.registry.set('viewmode', viewmode);
			muze.ariadne.cookie.set('viewmode', viewmode);
			var path = muze.ariadne.registry.get('path');
			muze.ariadne.explore.viewpane.view(path);
			muze.ariadne.explore.browseheader.view(path);
			muze.ariadne.explore.sidebar.view(path);
		},
		setselect : function(select) {
			muze.ariadne.registry.set('select', select);
			muze.ariadne.cookie.set('select', select);
			var path = muze.ariadne.registry.get('path');
			muze.ariadne.explore.viewpane.view(path);
			muze.ariadne.explore.browseheader.view(path);
			muze.ariadne.explore.sidebar.view(path);
		},
		setfilter : function(filter) {
			var path = muze.ariadne.registry.get('path');
			muze.ariadne.registry.set('filter' + path, filter);
			muze.ariadne.explore.viewpane.view(path);
			muze.ariadne.explore.browseheader.view(path);
			muze.ariadne.explore.sidebar.view(path);
		},
		update : function(qs) {
			var browse_template = muze.ariadne.registry.get('browse_template');
			var viewmode=muze.ariadne.registry.get('viewmode');
			if (!viewmode) {
				viewmode='list';
			}
			var url = browse_template+viewmode+'.php?'+qs+'&'+document.location.search;
			muze.ariadne.explore.viewpane.browseto(url);
		},
		browseto : function(url) {
			muze.ariadne.explore.viewpane.unselectItem();

			var archildren = document.getElementById("archildren");

			var fadeOut = new YAHOO.util.Anim("archildren", { opacity: {to: 0.3}}, 0.1);
			fadeOut.animate();
			var fadeIn = function() {
				var fadeIn = new YAHOO.util.Anim("archildren", { opacity: {to: 1}}, 0.1);

				// Fix for PNG filters in IE6 that break while using another filter;
				fadeIn.onComplete.subscribe(function() {
					muze.ariadne.explore.viewpane.removefilter();
				});
				fadeIn.animate();
				YAHOO.util.Event.removeListener('archildren', 'click', muze.ariadne.explore.viewpane.onClick);
				YAHOO.util.Event.addListener('archildren', 'click', muze.ariadne.explore.viewpane.onClick);
				YAHOO.util.Event.removeListener('archildren', 'selected', muze.ariadne.explore.viewpane.onSelected);
				YAHOO.util.Event.addListener('archildren', 'selected', muze.ariadne.explore.viewpane.onSelected);
				YAHOO.util.Event.removeListener('archildren', 'clearselection', muze.ariadne.explore.viewpane.unselectItem);
				YAHOO.util.Event.addListener('archildren', 'clearselection', muze.ariadne.explore.viewpane.unselectItem);

				muze.ariadne.explore.viewpane.load_handler();

				muze.event.fire(document.body, "viewpaneLoaded");
			};
			muze.ariadne.explore.load(url, archildren, fadeIn);
		},
		onSelected : function(event) {
			// FIXME: Add correct handling for row selection for details view.

			var items = YAHOO.util.Dom.getElementsByClassName("selectable-selected", "*", "archildren");
			if (items.length == 0) {
				muze.ariadne.explore.viewpane.unselectItem();
			} else if (items.length == 1) {
				if (items[0].tagName == "TR") {
					muze.ariadne.explore.viewpane.dataTable.selectRow(items[0]);
				} else {
					muze.ariadne.explore.viewpane.selectItem(items[0]);
				}
			}

			for (var i=0; i< items.length; i++) {
				if (items[i].tagName == "TR") {
					muze.ariadne.explore.viewpane.dataTable.selectRow(items[i]);
				} else {
					YAHOO.util.Dom.addClass(items[i],"selected");
				}
			}

			var unselectitems = YAHOO.util.Dom.getElementsByClassName("yui-dt-selected", "*", "archildren");
			for (var j=0; j<unselectitems.length; j++) {
				if (YAHOO.util.Dom.hasClass(unselectitems[j], "selectable-selected")) {
				} else {
					console.log("unselecting " + unselectitems[j]);
					muze.ariadne.explore.viewpane.dataTable.unselectRow(unselectitems[j]);
				}
			}


			var unselectitems = YAHOO.util.Dom.getElementsByClassName("selected", "*", "archildren");
			for (var j=0; j<unselectitems.length; j++) {
				if (YAHOO.util.Dom.hasClass(unselectitems[j], "selectable-selected")) {
				} else {
					YAHOO.util.Dom.removeClass(unselectitems[j], "selected");
				}
			}

			if (items.length != 1) {
				// Select the parent object.
				var item = new Object();
				item.path = muze.ariadne.explore.viewpane.path;
				muze.ariadne.explore.viewpane.onSelectItem(item);
			} else {
				muze.ariadne.explore.viewpane.onSelectItem(items[0]);
			}
		},
		onSelectItem : function(item) {
			muze.ariadne.explore.viewpane.setitempath(item);
			muze.ariadne.explore.sidebar.view(item.path);
			muze.ariadne.explore.browseheader.view(item.path);
			muze.ariadne.explore.viewpane.selectedPath = item.path;
			muze.ariadne.explore.toolbar.view(item.path);
		},
		view : function(path, page) {
			// Contain in dialog root.
			if (!muze.ariadne.explore.viewable(path)) { return }

			if (!muze.ariadne.explore.viewpane.exists()) { return }
			if (!page) {
				page = 1;
			}
			var browse_template = muze.ariadne.registry.get('browse_template');
			var viewmode = muze.ariadne.cookie.get('viewmode');
			var filter = muze.ariadne.registry.get('filter' + path);

			var order = muze.ariadne.registry.get('order');
			var direction = muze.ariadne.registry.get('direction');
			var store_root = muze.ariadne.registry.get('store_root');

			if( viewmode == 0 ) {
				viewmode = muze.ariadne.registry.get('viewmode');
			} else {
				muze.ariadne.registry.set('viewmode', viewmode);
			}
			var order = muze.ariadne.registry.get('order');
			var direction = muze.ariadne.registry.get('direction');
			
			var store_root = muze.ariadne.registry.get('store_root');

			var url = store_root + path + browse_template + viewmode + '.php?';
			if (muze.ariadne.explore.viewpane.typefilter) {
				url = url + 'type=' + muze.ariadne.explore.viewpane.typefilter;
			}
			if (page) {
				url = url + 'page=' + page;
			}
			if (order) {
				url = url + '&order=' + order;
			}
			if (direction) {
				url = url + '&direction=' + direction;
			}
			if (muze.ariadne.explore.viewpane.typefilter) {
				url = url + '&type=' + muze.ariadne.explore.viewpane.typefilter;
			}
			if (page) {
				url = url + '&page=' + page;
			}
			if (filter) {
				url = url + '&filter=' + filter;
			}

			muze.ariadne.explore.viewpane.browseto(url);

			muze.ariadne.explore.toolbar.view(path);
			muze.ariadne.explore.viewpane.path = path;
			muze.ariadne.explore.viewpane.selectedPath = path;
		}
	}
});

muze.namespace( 'muze.ariadne.explore.browseheader', function() {
	return {
		currentpath : null,
		exists : function() {
			if (document.getElementById("browseheader")) {
				return true;
			} else {
				return false;
			}
		},
		removefilter: function() {
			if (muze.ariadne.explore.viewpane.exists()) {
				document.getElementById("browseheader").style.filter = '';
			}
		},
		load : function(path) {
			muze.ariadne.explore.browseheader.currentpath = path;
			var sUrl = muze.ariadne.registry.get('store_root')+path+'explore.browse.header.php';

			var fadeOut = new YAHOO.util.Anim("browseheader", { opacity: {to: 0.3}}, 0.1);
			fadeOut.animate();
			var fadeIn = function() {
				var fadeIn = new YAHOO.util.Anim("browseheader", { opacity: {to: 1}}, 0.1);
				fadeIn.animate();

				// Fix for PNG filters in IE6 that break while using another filter;
				fadeIn.onComplete.subscribe(function() {
					document.getElementById("browseheader").style.filter = '';
				});
			};

			muze.ariadne.explore.load(sUrl, document.getElementById("browseheader"), fadeIn, false);
		},
		view : function(path) {
			if (muze.ariadne.explore.browseheader.exists()) {
				muze.ariadne.explore.browseheader.load(path);
			}
		}

	}
});

muze.namespace( 'muze.ariadne.explore.dialog', function () {
	return {
		'getTargets' : function(varname) { //builds string of paths for the dialog when multiple items are selected.
            var selected = YAHOO.util.Dom.getElementsByClassName("selectable-selected", "*", "archildren");
			var target = '?';
			for (i=0; i<selected.length; i++) {
				var targetpath = selected[i].getAttribute("data-path");
				if (selected[i].tagName == "TR") {
					var record = muze.ariadne.explore.viewpane.dataTable.getRecord(selected[i]);
					targetpath = record.getData("path");
				}
				target += varname + '[]=' + targetpath + '&';
			}
			return target;
		},
		'add': function(href) {
			muze.dialog.open(href, 'dialog_add', { windowFeatures: muze.ariadne.explore.windowprops['dialog_add'] } )
			.on('submit', function( args ) {
				muze.ariadne.explore.objectadded();
			})
		},
		'edit': function(href) {
			muze.dialog.open(href, 'dialog_edit', { windowFeatures: muze.ariadne.explore.windowprops['dialog_edit'] } )
			.on('submit', function( args ) {
				muze.ariadne.explore.tree.refresh(args['path']);
				muze.ariadne.explore.view(args['path']);
			})
			.always( function() {
				this.close();
			});
		},
		'rename': function(href) {
			var pathmode = '?pathmode=filename';
			muze.dialog.open(href + pathmode, 'dialog_rename', { windowFeatures: muze.ariadne.explore.windowprops['dialog_rename'] } )
			.on('renamed', function( args ) {
				muze.ariadne.explore.tree.refresh(args['path']);
				muze.ariadne.explore.objectadded(); // Objectadded to refresh the view instead of browsing to the renamed object.
			})
			.always( function() {
				this.close();
			});
		},
		'moveselected' : function(href) {
			var target = muze.ariadne.explore.dialog.getTargets("sources");
			var origin = 'origin=move'; //No & or ? needed since var is after var target
			muze.dialog.open(href + target + origin, 'dialog_move', { windowFeatures: muze.ariadne.explore.windowprops['dialog_move'] } )
			.on('renamed', function( args ) {
				muze.ariadne.explore.tree.refresh(args['path']);
				muze.ariadne.explore.view(args['path']);
			})
			.always( function() {
				this.close();
			});
		},
		'move': function(href) {
                        var pathmode = '?pathmode=parent';
			muze.dialog.open(href + pathmode, 'dialog_move', { windowFeatures: muze.ariadne.explore.windowprops['dialog_move'] } )
			.on('renamed', function( args ) { //renamed because .save dialog is shared with rename
				muze.ariadne.explore.tree.refresh(args['path']);
				muze.ariadne.explore.view(args['path']);
			})
			.always( function() {
				this.close();
			});
		},
		'copyselected' : function(href) {
			var target = muze.ariadne.explore.dialog.getTargets("sources");
			var origin = 'origin=copy'; //No & or ? needed since var is after var target
			muze.dialog.open(href + target + origin, 'dialog_copy', { windowFeatures: muze.ariadne.explore.windowprops['dialog_copy'] } )
			.on('copied', function( args ) {
				if (args['path'] == args['copyTarget'] ) {
					muze.ariadne.explore.objectadded();
				} else {
					muze.ariadne.explore.tree.view(args['copyTarget']);
				}
			})
			.always( function() {
				this.close();
			});
		},
		'copy': function(href) {
			muze.dialog.open(href, 'dialog_copy', { windowFeatures: muze.ariadne.explore.windowprops['dialog_copy'] } )
			.on('copied', function( args ) {
				if (args['path'] == args['copyTarget'] ) {
					muze.ariadne.explore.objectadded();
				} else {
					muze.ariadne.explore.tree.view(args['copyTarget']);
				}
			})
			.always( function() {
				this.close();
			});
		},
		'deleteselected': function(href) {
			var target = muze.ariadne.explore.dialog.getTargets("targets");
			muze.dialog.open(href + target, 'dialog_delete', { windowFeatures: muze.ariadne.explore.windowprops['dialog_delete'] } )
			.on('deleted', function( args ) {
				muze.ariadne.explore.view(args['showPath']);
				window.setTimeout(function() {
					muze.ariadne.explore.view(args['showPath']);
				}, 250);
			})
			.always( function() {
				this.close();
			});
		},
		'delete': function(href) {
			muze.dialog.open(href, 'dialog_delete', { windowFeatures: muze.ariadne.explore.windowprops['dialog_delete'] } )
			.on('deleted', function( args ) {
				muze.ariadne.explore.view(args['showPath']);
			})
			.always( function() {
				this.close();
			});
		},
		'mogrifyselected' : function(href) {
			var target = muze.ariadne.explore.dialog.getTargets("targets");
			muze.dialog.open(href + target, 'dialog_mogrify', { windowFeatures: muze.ariadne.explore.windowprops['dialog_mogrify'] } )
			.on('mogrified', function( args ) {
				muze.ariadne.explore.tree.refresh(args['path'])
				muze.ariadne.explore.view(args['path']);
			})
			.always(function() {
				this.close();
			});
		},
		'mogrify': function(href) {
			muze.dialog.open(href, 'dialog_mogrify', { windowFeatures: muze.ariadne.explore.windowprops['dialog_mogrify'] } )
			.on('mogrified', function( args ) {
				muze.ariadne.explore.tree.refresh(args['path'])
				muze.ariadne.explore.view(args['path']);
			})
			.always( function() {
				this.close();
			});
		},
		'import': function(href) {
			muze.dialog.open(href, 'dialog_import', { windowFeatures: muze.ariadne.explore.windowprops['dialog_import'] } )
			.on('imported', function( args ) {
				muze.ariadne.explore.view(args['showPath']);
			})
			.always( function() {
				this.close();
			});
		},
		'exportselected' : function(href) {
			var target = muze.ariadne.explore.dialog.getTargets("sources");
			muze.dialog.open(href + target, 'dialog_export', { windowFeatures: muze.ariadne.explore.windowprops['dialog_export'] } )
			.always(function() {
			        this.close();
			});
		},
		'export': function(href) {
			muze.dialog.open(href, 'dialog_export', { windowFeatures: muze.ariadne.explore.windowprops['dialog_export'] } )
			.always( function() {
				this.close();
			});
		},
		'su': function(href) {
			muze.dialog.open(href, 'dialog_su', { windowFeatures: muze.ariadne.explore.windowprops['dialog_su'] } );
		}
	};
});

});muze.namespace('simply');

simply = ( function() {
	var self = {
	}
	return self;
})();
muze.namespace('simply.dom');

simply.dom= ( function() { 
	var dom = {
	}
	return dom;
})();
muze.namespace('simply.dom.selection');

simply.dom.selection = ( function() {

	var win = window;
	var w3c = window.getSelection ? true : false;

	var self = { // lets name ourselves self to not conflict that easy with range or selection
		get : function( useWin ) {
			if( !useWin ) {
				useWin = win;
			}
			if( w3c ) {
				if( useWin.getSelection().rangeCount > 0 ) {
					return useWin.getSelection().getRangeAt(0);
				} else {
					return useWin.document.createRange();
				}
			} else {
				return useWin.document.selection.createRange();
			}
		},
		backwards : function( useWin ) {
			if ( !useWin ) {
				useWin = win;
			}
			if (w3c) {
				var sel = useWin.getSelection();
				if (!sel.anchorNode) {
					return false;
				}
				var position = sel.anchorNode.compareDocumentPosition(sel.focusNode);
				if (position == 0) {
					return (sel.anchorOffset > sel.focusOffset);
				} else if (position == 4) { // Node.DOCUMENT_POSITION_PRECEDING) {
					return false;
				} else {
					return true;
				}
			} else {
				// FIXME: Old IE compat goes here;
				return false;
			}
		},
		collapse : function(range, left) {
			if (left!==false) {
				left=true;
			}
			range.collapse(left);
			return range;
		},

		clone : function(range) {
			if (w3c) {
				return range.cloneRange();
			} else {
				return range.duplicate();
			}
		},

		select : function(range) { 
			if( w3c ) {
				var node = self.getNode(range);
				if (node && node.ownerDocument) {
					var sel = node.ownerDocument.defaultView.getSelection();
					sel.removeAllRanges();
					sel.addRange(range);
				}
			} else {
				try { 
					range.select(); // IE is sometimes buggy and likes to barf on you
				} catch( e ) { }
			}
			return range;
		},
		
		selectNode : function(range, el, select) {
			if( w3c ) {
				range.selectNodeContents(el);
			} else {
				range.moveToElementText(el);
			}
			if( select ) {
				self.select(range);
			}
			return range;
		},

		selectRange : function(range, left, right, select) {
			if( w3c ) {
				range.setStart(left.startContainer, left.startOffset);
				if(!right) {
					range.setEnd(left.endContainer, left.endOffset);
				} else {
					range.setEnd(right.startContainer, right.startOffset);
				}
			} else {
				range.setEndPoint('StartToStart', left);
				if (!right) {
					range.setEndPoint('EndToEnd', left);
				} else {
					range.setEndPoint('EndToStart', right);
				}
			}
			if( select ) {
				self.select(range);
			}
			return range;
		},
		
		parentNode : function(range) {
			if( w3c ) {
				var parent = false;
				if( range.collapsed || range.startContainer == range.endContainer ) {
					parent = range.startContainer;
				} else {
					parent = range.commonAncestorContainer;
				}	
				while( parent.nodeType == 3 ) { // text node
					parent = parent.parentNode;
				}
				return parent; 
			} else {
				return range.item ? range.item(0) : range.parentElement();
			}
		},
		
		getNode : function(range) {
			if( w3c ) {
				var node = range.commonAncestorContainer;
				if( !range.collapsed ) {
					/*
						|    <textnode><selected node><textnode>    |
						|    Beide textnodes zijn optioneel, die hoeven er niet te staan.
					*/

					if( range.startContainer == range.endContainer && range.startOffset - range.endOffset < 2 && range.startContainer.hasChildNodes() ) {
						// Case 1: geen tekstnodes.
						// start en eind punt van selectie zitten in dezelfde node en de node heeft kinderen - dus geen text node - en de offset verschillen
						// precies 1 - dus er is exact 1 node geselecteerd.
						node = range.startContainer.childNodes[range.startOffset]; // image achtige control selections.
					} else if ( range.startContainer.nodeType == 3 && range.startOffset == range.startContainer.data.length && 
						range.endContainer.nodeType != 3 && range.endContainer == range.startContainer.parentNode ) 
					{
						// Case 2: tekstnode er voor, niet er achter.
						// start punt zit in een tekst node maar wel helemaal aan het eind. eindpunt zit in dezelfde container waar de textnode ook in zit.
						node = range.endContainer.childNodes[ range.endOffset - 1 ];
					} else if ( range.endContainer.nodeType == 3 && range.endOffset == 0 && 
						range.startContainer.nodeType != 3 && range.startContainer == range.endContainer.parentNode ) 
					{
						// Case 3: tekstnode er achter, niet er voor;
						// Eindpunt zit in een textnode helemaal aan het begin. Startpunt zit in dezelfde container waar de eindpunt-textnode ook in zit
						node = range.startContainer.childNodes[ range.startOffset ];
					} else if ( range.startContainer.nodeType == 3 && range.endContainer.nodeType == 3 
						&& range.startOffset == range.startContainer.data.length && range.endOffset == 0 &&
						range.startContainer.nextSibling == range.endContainer.previousSibling ) 
					{
						// Case 4: tekstnode voor en achter
						// start zit in een tekstnode helemaal aan het eind. eind zit in een tekstnode helemaal aan het begin.
						node = range.startContainer.nextSibling;
					} else if( range.startContainer == range.endContainer ) { 
						// Case 5: bijv. 1 tekstnode met geselecteerde tekst - hierna wordt dan de parentNode als node gezet
						node = range.startContainer;
					}
				}
				while( node && node.nodeType == 3 ) {
					node = node.parentNode;
				}
				return node;
			} else {
				var node = range.item ? range.item(0) : range.parentElement();
				while (node && node.nodeType == 3) {
					node = node.parentNode;
				}
				return node;
			}
		},

		isEmpty : function(range) {
			return self.getHTMLText(range) == '';
		},
		
		getHTMLText : function(range) {
			if( w3c ) {
				var frag = range.cloneContents();
				var div = range.startContainer.ownerDocument.createElement('div');
				div.appendChild(frag);
				var result = div.innerHTML;
				div = null;
				return result;
			} else {
				if( range.item ) {
					var control = range.item(0);
					var textrange = control.ownerDocument.body.createTextRange();
					textrange.moveToElementText(control);
					return textrange.htmlText;
				} else {
					return range.htmlText;
				}
			}
		},

		setHTMLText : function(range, htmltext) {
			if( w3c ) {
				var div = range.startContainer.ownerDocument.createElement('div');
				div.innerHTML = htmltext;
				var frag = range.startContainer.ownerDocument.createDocumentFragment();
				for (var i=0; i < div.childNodes.length; i++) {
					var node = div.childNodes[i].cloneNode(true);
					frag.appendChild(node);
				}
				div = null;
				range = self.replace(range, frag);
			} else {
				if( range.item ) { // control range 
					var control = range.item(0);
					var textrange = control.ownerDocument.body.createTextRange();
					textrange.moveToElementText(control);
					range.execCommand('delete', false);
					range = textrange;
				}
				range.pasteHTML(htmltext);
			}
			return range;
		},

		replace : function(range, el) {
			if( w3c ) {
				range.deleteContents();
				range.insertNode(el);
				// FIXME: definately betere check gebruiken waar de cursor moet komen, gaat mis als je over meer dan 1 textnode een selectie hebt
				if( range.startContainer && range.startContainer.nextSibling ) { // ie behaviour simulatie
					range.selectNode(range.startContainer.nextSibling);
				}
				range.collapse(false);
			} else {
				self.setHTMLText(range, el.outerHTML);
			}
			return range;
		}

	}
	return self;

})();

/* random documentatie





full selectie onder ie ff en chrome shizzle

var range = document.body.createTextRange();
range.moveToElementText(myDiv);
range.select();


Firefox, Opera, WebKit nightlies:

var selection = window.getSelection();
var range = document.createRange();
range.selectNodeContents(myDiv);
selection.removeAllRanges();
selection.addRange(range);


Safari:

var selection = window.getSelection();
selection.setBaseAndExtent(myDiv, 0, myDiv, 1);

*/

muze.namespace('simply.dom.nesting');

simply.dom.nesting = ( function() {

	function isArray( arr ) {
		return ( arr instanceof Array );
	}

	function inArray(arr, el) {
		for (var i=0; i<arr.length; i++) {
			if (arr[i]==el) {
				return true;
			}
		}
		return false;
	}

	var TEXT_NODE = 3;
	var ELEMENT_NODE = 1;

	var nesting_sets = {
		'inline'	: [ 'TT', 'I', 'B', 'U', 'S', 'STRIKE', 'BIG', 'SMALL', 'FONT', 'EM', 'STRONG', 'DFN', 'CODE', 'SAMP', 'KBD', 'VAR', 'CITE', 'ABBR', 'ACRONYM', 'SUB', 'SUP', 'Q', 'SPAN', 'BDO', 'A', 'OBJECT', 'APPLET', 'IMG', 'BASEFONT', 'BR', 'SCRIPT', 'MAP', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'BUTTON', 'INS', 'DEL'],
		'inline2'	: [ 'TT', 'I', 'B', 'U', 'S', 'STRIKE', 'EM', 'STRONG', 'DFN', 'CODE', 'SAMP', 'KBD', 'VAR', 'CITE', 'ABBR', 'ACRONYM', 'Q', 'SPAN', 'BDO', 'A', 'BR', 'SCRIPT', 'MAP', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'BUTTON', 'INS', 'DEL'],
		'inline3'	: [ 'TT', 'I', 'B', 'U', 'S', 'STRIKE', 'BIG', 'SMALL', 'FONT', 'EM', 'STRONG', 'DFN', 'CODE', 'SAMP', 'KBD', 'VAR', 'CITE', 'ABBR', 'ACRONYM', 'SUB', 'SUP', 'Q', 'SPAN', 'BDO', 'OBJECT', 'APPLET', 'IMG', 'BASEFONT', 'BR', 'SCRIPT', 'MAP', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'BUTTON', 'INS', 'DEL'],
		'inline4'	: [ 'TT', 'I', 'B', 'U', 'S', 'STRIKE', 'BIG', 'SMALL', 'FONT', 'EM', 'STRONG', 'DFN', 'CODE', 'SAMP', 'KBD', 'VAR', 'CITE', 'ABBR', 'ACRONYM', 'SUB', 'SUP', 'Q', 'SPAN', 'BDO', 'A', 'OBJECT', 'APPLET', 'IMG', 'BASEFONT', 'BR', 'SCRIPT', 'MAP', 'INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'INS', 'DEL'],
		'block'		: [ 'ADDRESS', 'DIR', 'MENU', 'ISINDEX', 'HR', 'TABLE', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'UL', 'OL', 'DL', 'DIV', 'CENTER', 'BLOCKQUOTE', 'IFRAME', 'NOSCRIPT', 'NOFRAMES', 'FORM', 'FIELDSET', 'INS', 'DEL' ],
		'block2'	: [ 'ADDRESS', 'DIR', 'MENU', 'ISINDEX', 'HR', 'TABLE', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'UL', 'OL', 'DL', 'DIV', 'CENTER', 'BLOCKQUOTE', 'IFRAME', 'NOSCRIPT', 'NOFRAMES', 'FIELDSET', 'INS', 'DEL' ],
		'block3'	: [ 'ADDRESS', 'DIR', 'MENU', 'HR', 'TABLE', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'UL', 'OL', 'DL', 'DIV', 'CENTER', 'BLOCKQUOTE', 'INS', 'DEL' ],
		'block4'	: [ 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'UL', 'OL', 'DL', 'DIV', 'CENTER', 'BLOCKQUOTE', 'INS', 'DEL' ]
	}

	var nesting_rules = {
		'ADDRESS'	: [ 'P', nesting_sets['inline']],
		'PRE'		: nesting_sets['inline2'],
		'UL'		: [ 'LI' ],
		'OL'		: [ 'LI' ],
		'LI'		: [ nesting_sets['inline'], 'OL', 'UL' ], // , nesting_sets['block'] ],
		'DIR'		: [ 'LI' ],
		'MENU'		: [ 'LI' ],
		'TABLE'		: [ 'CAPTION', 'COLGROUP', 'COL', 'THEAD', 'TBODY' ],
		'TBODY'		: [ 'TR' ],
		'COLGROUP'	: [ 'COL' ],
		'TR'		: [ 'TH', 'TD' ],
		'TH'		: [ nesting_sets['block'], nesting_sets['inline'] ],
		'TD'		: [ nesting_sets['block'], nesting_sets['inline'] ],
		'P'		: nesting_sets['inline'],
		'H1'		: nesting_sets['inline'],
		'H2'		: nesting_sets['inline'],
		'H3'		: nesting_sets['inline'],
		'H4'		: nesting_sets['inline'],
		'H5'		: nesting_sets['inline'],
		'H6'		: nesting_sets['inline'],
		'DL'		: [ 'DT', 'DD' ],
		'DT'		: nesting_sets['inline'],
		'DD'		: [ nesting_sets['block'], nesting_sets['inline'] ],
		'DIV'		: [ nesting_sets['block'], nesting_sets['inline'] ],
		'CENTER'	: [ nesting_sets['block'], nesting_sets['inline'] ],
		'BLOCKQUOTE'	: [ nesting_sets['block'], nesting_sets['inline'] ],
		'IFRAME'	: [ nesting_sets['block'], nesting_sets['inline'] ],
		'NOSCRIPT'	: [ nesting_sets['block'], nesting_sets['inline'] ],
		'NOFRAMES'	: [ nesting_sets['block'], nesting_sets['inline'] ],
		'FORM'		: [ nesting_sets['block2'], nesting_sets['inline'] ],
		'ISINDEX'	: [],
		'HR'		: [],
		'CAPTION'	: nesting_sets['inline'],
		'COL'		: [],
		'THEAD'		: [ 'TR' ],
		'FIELDSET'	: [ nesting_sets['block'], nesting_sets['inline'], 'LEGEND' ],
		'LEGEND'	: nesting_sets['inline'],
		// inline elements
		'TT'		: nesting_sets['inline'],
		'I'		: nesting_sets['inline'],
		'B'		: nesting_sets['inline'],
		'U'		: nesting_sets['inline'],
		'S'		: nesting_sets['inline'],
		'STRIKE'	: nesting_sets['inline'],
		'BIG'		: nesting_sets['inline'],
		'SMALL'		: nesting_sets['inline'],
		'FONT'		: nesting_sets['inline'],
		'EM'		: nesting_sets['inline'],
		'STRONG'	: nesting_sets['inline'],
		'DFN'		: nesting_sets['inline'],
		'CODE'		: nesting_sets['inline'],
		'SAMP'		: nesting_sets['inline'],
		'KBD'		: nesting_sets['inline'],
		'VAR'		: nesting_sets['inline'],
		'CITE'		: nesting_sets['inline'],
		'ABBR'		: nesting_sets['inline'],
		'ACRONYM'	: nesting_sets['inline'],
		'SUB'		: nesting_sets['inline'],
		'SUP'		: nesting_sets['inline'],
		'Q'		: nesting_sets['inline'],
		'SPAN'		: nesting_sets['inline'],
		'BDO'		: nesting_sets['inline'],
		'A'		: nesting_sets['inline3'],
		'OBJECT'	: [ 'PARAM', nesting_sets['block'], nesting_sets['inline'] ],
		'APPLET'	: [ 'PARAM', nesting_sets['block'], nesting_sets['inline'] ],
		'IMG'		: [],
		'BASEFONT'	: [],
		'BR'		: [],
		'SCRIPT'	: [],
		'MAP'		: [ 'AREA', nesting_sets['block'], nesting_sets['inline'] ],
		'INPUT'		: [],
		'SELECT'	: [ 'OPTGROUP', 'OPTION' ],
		'OPTGROUP'	: [ 'OPTION' ],
		'TEXTAREA'	: [],
		'LABEL'		: nesting_sets['inline4'],
		'BUTTON'	: [ nesting_sets['block3'], nesting_sets['inline3']],
		'DEL'		: [ nesting_sets['block'], nesting_sets['inline'] ],
		'INS'		: [ nesting_sets['block'], nesting_sets['inline'] ],
		'SECTION'	: [ nesting_sets['block'], nesting_sets['inline'] ]
	}

	var auto_closed = {
		'ISINDEX' 	: true,
		'HR'		: true,
		'COL'		: true,
		'IMG'		: true,
		'BASEFONT'	: true,
		'BR'		: true,
		'INPUT'		: true
	}

	var oblig_child = { /* always add the child tag when setting this tagName */
		'OL'		: 'LI',
		'UL'		: 'LI',
		'ol'		: 'li',
		'ul'		: 'li'
	}

	var oblig_parent = { /* always add this parent when setting this tagName */
		'DT'		: 'DL',
		'DD'		: 'DL',
		'dt'		: 'dl',
		'dd'		: 'dl'
	}

	return {
		allowChild : function(parent, child) {
			if (parent.nodeType) {
				parent = new String(parent.tagName);
			}
			if (child.nodeType) {
				child = new String(child.tagName);
			}
			var list = nesting_rules[parent.toUpperCase()];
			if (list) {
				for (var i=0; i<list.length; i++) {
					if (isArray(list[i])) {
						var found = inArray(list[i], child.toUpperCase());
						if (found) {
							return true;
						}
					} else {
						if (list[i]==child.toUpperCase()) {
							return true;
						}
					}
				}
			}
			return false;
		},
		canHaveChildren : function(name) {
			if (name.tagName) {
				name = name.tagName;
			}
			return nesting_rules[name.toUpperCase()].length>0;
		},
		canHaveContent : function(name) {
			if (name.tagName) {
				name = name.tagName;
			}
			return !auto_closed[name.toUpperCase()];
		},
		isBlock : function(name) {
			if (name.tagName) {
				name = name.tagName;
			}
			return name.match(/^(P|H[1-6]|UL|OL|DIR|MENU|DL|PRE|DIV|CENTER|BLOCKQUOTE|ADDRESS|LI|TD|TH|SECTION)$/i);
		},
		isEmpty : function(el) {
			// el != null and if nodeType text and contains only whitespace, return true
			var result = false;
			if (el && el.nodeType==TEXT_NODE) {
				var content = new String(el.nodeValue);
				result = content.match(/^[\n\r]*$/m);
			}
			return result;
		},
		isTextNode : function(el) {
			return el && el.nodeType==TEXT_NODE;
		},
		obligatoryChild : function(name) {
			if (name.tagName) {
				name = name.tagName;
			}
			return oblig_child[name.toUpperCase()];
		}
	}
})();muze.namespace('simply.dom.cleaner');

simply.dom.cleaner = ( function() {

	var self = {

		check:function(str) {
			if (str.indexOf("; mso-")>=0 
				|| str.indexOf("<v:")>=0 
				|| str.indexOf("class=Mso")>=0 
				|| str.match(/<p[^>]*style=/gi) 
				|| str.match(/<\/?(\?XML|ST1|FONT|SHAPE|V:|O:|F:|F|PATH|LOCK|IMAGEDATA|STROKE|FORMULAS)[^>]*>/gi)) 
			{
				return true;
			}
		},

		clean:function(str, mode) {
			switch(mode) {
				case 'none':
					break;
				case 'text':
					str = str.replace(/<\/?[^>]*>/gi, "")
						.replace(/[–]/g,'-') //long –
						.replace(/[‘’]/g, "'") //single smartquotes ‘’ 
						.replace(/[“”]/g, '"') //double smartquotes “”
						.replace(/&nbsp;/g, ' ') // soft spaces
						.replace(/  /g, ' ') // replace multiple spaces
						.replace(/ +\r?\n/g, "\n")
						.replace(/\r?\n(\r?\n)+/g, "<p>")
						.replace(/\n/g, "<br>\n");
					break;
				case 'full':
					str = str.replace(/<\/?(SPAN|DEL|INS|U|DIR)(\s[^>]*)?>/gi, "")
						.replace(/\b(CLASS|STYLE)=\"[^\"]*\"/gi, "")
						.replace(/\b(CLASS|STYLE)=\w+/gi, "");
				case 'word':
				default:
					str = str.replace(/<\/?(\?XML|ST1|FONT|SHAPE|V:|O:|F:|F |PATH|LOCK|IMAGEDATA|STROKE|FORMULAS)[^>]*>/gi, "")
				        .replace(/\bCLASS=\"?MSO\w*\"?/gi, "")
						.replace(/[–]/g,'-') //long –
						.replace(/[‘’]/g, "'") //single smartquotes ‘’ 
						.replace(/[“”]/g, '"') //double smartquotes “”
				        .replace(/align="?justify"?/gi, "") //justify sends some browsers mad
				        .replace(/<(TABLE|TD|TH)(.*)(WIDTH|HEIGHT)[^A-Za-z>]*/gi, "<$1$2") //no fixed size tables
				        .replace(/<([^>]+)>\s*<\/\1>/gi, "") //empty tag
				        .replace(/<p[^>]*>(<br>|&nbsp;)<\/p[^>]*>/gi, "") // remove empty paragraphs
						.replace(/<p[^>]*>(<span[^>]*>)*<span\s+style=["'][^"']*mso-list:[^>]*>.*?<\/span>(.*?)<\/p[^>]*>/gi, "<li>$2</li>") // change list items back to real list items
						.replace(/<li>(\s*<\/span>)+/gi, "<li>"); // eat possible extra closing span tags
			}
		    return str;
		}
	}
	return self;

})();
muze.namespace('simply.util');

simply.util = ( function() { 
	var util = {
	}
	return util;
})();
muze.namespace('simply.util.base64');

simply.util.base64 = ( function() { 

	/**
	*
	*  Base64 encode / decode
	*  http://www.webtoolkit.info/
	*
	**/

	var base64 = {

		// private property
		_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

		// public method for encoding
		encode : function (input) {
			var output = "";
			var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
			var i = 0;

			input = base64._utf8_encode(input);

			while (i < input.length) {

				chr1 = input.charCodeAt(i++);
				chr2 = input.charCodeAt(i++);
				chr3 = input.charCodeAt(i++);

				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;

				if (isNaN(chr2)) {
					enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
					enc4 = 64;
				}

				output = output +
				this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
				this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

			}

			return output;
		},

		// public method for decoding
		decode : function (input) {
			var output = "";
			var chr1, chr2, chr3;
			var enc1, enc2, enc3, enc4;
			var i = 0;

			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

			while (i < input.length) {

				enc1 = this._keyStr.indexOf(input.charAt(i++));
				enc2 = this._keyStr.indexOf(input.charAt(i++));
				enc3 = this._keyStr.indexOf(input.charAt(i++));
				enc4 = this._keyStr.indexOf(input.charAt(i++));

				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;

				output = output + String.fromCharCode(chr1);

				if (enc3 != 64) {
					output = output + String.fromCharCode(chr2);
				}
				if (enc4 != 64) {
					output = output + String.fromCharCode(chr3);
				}

			}

			output = base64._utf8_decode(output);

			return output;

		},

		// private method for UTF-8 encoding
		_utf8_encode : function (string) {
			string = string.replace(/\r\n/g,"\n");
			var utftext = "";

			for (var n = 0; n < string.length; n++) {

				var c = string.charCodeAt(n);

				if (c < 128) {
					utftext += String.fromCharCode(c);
				}
				else if((c > 127) && (c < 2048)) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				}
				else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}

			}

			return utftext;
		},

		// private method for UTF-8 decoding
		_utf8_decode : function (utftext) {
			var string = "";
			var i = 0;
			var c = c1 = c2 = 0;

			while ( i < utftext.length ) {

				c = utftext.charCodeAt(i);

				if (c < 128) {
					string += String.fromCharCode(c);
					i++;
				}
				else if((c > 191) && (c < 224)) {
					c2 = utftext.charCodeAt(i+1);
					string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
					i += 2;
				}
				else {
					c2 = utftext.charCodeAt(i+1);
					c3 = utftext.charCodeAt(i+2);
					string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
					i += 3;
				}

			}

			return string;
		}

	}

	return base64;
})();
muze.namespace('simply.widgets');

simply.widgets = ( function() { 
	var widgets = {
	}
	return widgets;
})();
muze.namespace('simply.widgets.fieldsets');

muze.require('muze.event');

simply.widgets.fieldsets = ( function() { 

	var event = muze.event;

	var fieldsets = {

		show : function( fs ) {
			if( document.all ) {
				fs.style.height = '';
			} else {
				fs.style.height = '';
				fs.style.marginBottom = '';
			}
			fs.className = 'open';
			fieldsets.hideHandle(fs);
			fieldsets.showHandle(fs);
		},

		hide : function( fs ) {
			if( document.all ) {
				fs.style.height = '16px';
			} else {
				fs.style.marginBottom = '-11px';
				fs.style.height = '0px';
			}
			fs.style.overflow = 'hidden';
			fs.className = 'closed';
			fieldsets.hideHandle(fs);
			fieldsets.showHandle(fs);
		},

		showHandle : function( fs ) {
			if (fs.style.height) {
				if( !fs.closeImage ) {
					image = fieldsets.getCloseHandle(fs);
					fs.closeImage = image;
					fs.openImage = null;
				} else{
					image = fs.closeImage;
				}
			} else {
				if( !fs.openImage ) {
					image = fieldsets.getOpenHandle(fs);
					fs.openImage = image;
					fs.closeImage = null;
				} else {
					image = fs.openImage;
				}
				fs.style.overflow = 'hidden';
			}
			image.unselectable='on';
			fs.insertBefore(image, fs.firstChild);
		},

		hideHandle : function( fs ) {
			var el = fs.firstChild;
			while (el && el.className=='vdOpenClose') {
				fs.removeChild(el);
				el = fs.firstChild;
			}
			fs.openImage = null;
			fs.closeImage = null;
		},

		getOpenHandle : function( fs ) { // FIXME: should not be using an im, but a div with a background via css
			var image = fs.ownerDocument.createElement('IMG');
			image.src = fs.upImgSrc;
			image.title = 'Hide'; // FIXME: nls
			image.className = 'vdOpenClose';
			image.onclick = function() { 
				fieldsets.hide(fs); 
			}
			return image;
		},

		getCloseHandle : function( fs ) { // FIXME: should not be using an img, but a div with background via css
			var image = fs.ownerDocument.createElement('IMG');
			image.src = fs.downImgSrc;
			image.title = 'Show'; // FIXME: nls
			image.className = 'vdOpenClose';
			image.onclick = function() { 
				fieldsets.show(fs); 
			}
			return image;
		},


		init : function( doc, upImgSrc, downImgSrc ) {
			// add hide/show buttons to all fieldsets
			var fslist = doc.getElementsByTagName('FIELDSET');
			var legend = null;
			for (var i=fslist.length-1; i>=0; i--) {
				var fs = fslist[i];
				if (!fs.className.match(/\bvdFixed\b/)) {
					var hiding = [];
					var showing = [];
					fs.upImgSrc = upImgSrc;
					fs.downImgSrc = downImgSrc;
					event.attach(fs, 'mouseover', function(fs, i) {
						return function() {
							showing[i] = true;
							hiding[i] = false;
							window.setTimeout(function() {
								if (showing[i]) {
									fieldsets.showHandle(fs);
									showing[i] = false;
								}
							}, 500);
						}
					}(fs, i));
					event.attach(fs, 'mouseout', function(fs, i) {
						return function() {
							if (!fs.style.height) {
								hiding[i] = true;
								showing[i] = false;
								window.setTimeout(function() {
									if (hiding[i]) {
										fieldsets.hideHandle(fs);
										hiding[i] = false;
									}
								}, 500);
							}
						}
					}(fs, i));
					try {
						legend = fs.getElementsByTagName('LEGEND')[0];
						event.attach(legend, 'click', function(fs, i) {
							return function(evt) {
								if (!fs.style.height) {
									fieldsets.hide(fs);
								} else {
									fieldsets.show(fs);
								}
								return event.cancel(evt);
							}
						}(fs, i));
						legend.style.cursor = 'pointer';
					} catch(e) {
					}
				}
			}
		}

	}
	return fieldsets;
})();
/*
	Vedor Resize and Drag Library
	Copyright Vedor 2005, All rights reserved

	usage
		<script src="muze.js">
		<script src="muze/event.js">
		<script src="simply/widgets/handles.js">
		<script>
			function init() {
				var handles=simply.widgets.init(window, document.body, 'images/');
				handles.attachTags(relResize.getHandles(), 'TD', 'TH', 'TABLE');
				handles.attach(absResize.getHandles(), document.getElementById('absoluteDiv'));
				handles.attach({e:myResizeMethod}, document.getElementById('myElement'));
			}
		</script>

	public methods

		attach(handlesList, element)

			attaches the handles and antlines to the given element.
			handlesList is an object with one or more of the following function pointers:
				nw, n, ne, w, e, sw, s, se, drag
			if set, each of these will make a handle appear in the corresponding corner,
			except for 'drag', which will make the element draggable. 

		attachTags(handlesList, tag1, tag2, ...)

			see above, except for all tags with the given tagNames

	The methods below should not be needed often, except for remove and insert, when
	saving the html source.

		insert()

			inserts the needed handle divs in the source document

		remove()

			removes the handle divs from the source document. Do this before saving the
			source html.

		show()

			show the handles on the current element, if any is selected.

		hide()

			hide the handles

		select(element, handlesList)

			select an element, showing the handles and antlines, using the given handlesList
			to see which handles must be shown and which callback functions to use.
			Only use this if for some reason attach isn't good enough.

		mark(handleId)

			marks the current element for resizing or dragging

		stop(hideFlag)

			stops resizing or dragging the current element, if hideFlag is true, the handles
			are hidden.

		resize(handleId)

			called on mousemove, if the current element is marked for resizing or dragging,
			it will call the corresponding callback function in the handlesList.
*/


muze.namespace("simply.widgets.handles");

muze.require("muze.event");

simply.widgets.handles = ( function() {

function handles(vdWindow, vdElement, vdImageDir, vdUpdateFunc) {
	var antlines={		// pointers to antlines divs
		left:false,
		right:false,
		top:false,
		bottom:false
	}
	var handle={		// pointers to handle divs
		nw:false,
		n:false,
		ne:false,
		w:false,
		e:false,
		sw:false,
		s:false,
		se:false,
		drag:false
	}
	var handlesDiv=false;				// pointer to handles container div
	var startPos=false;					// x/y offset of vdElement
	var cellPos=false;					// x/y offset of current element, relative to startPos
	var dragStart=false;				// x/y offset of mousecursor on mousedown
	var hoverDiv=false;					// pointer to hover div, which aids selection
	var hoverHandles=false;				// pointer to handleslist for the current hover div
	var hoverObj=false;
	var resizeObj=false;				// current element
	var resizing=false;					// resize/drag on mousemove boolean flag
	var fnResizeHandler=null;			// resize function pointer for detachEvent
	var tempSelectStartFunction=null;	// temp function pointer to re attach after resizing/dragging

	var attachList=new Array();

	function getOffset(el, elTop, skipScrollbar) {

		function getBorderSize(b) {
			if (isNaN(b)) {
				switch(b) {
					case 'thin' : return 1;
					break;
					case 'thick' : return 4; // guess
					break;
					case 'medium' : return 2;
					break;
					default : result = parseInt(b);
				}
			} else {
				result = parseInt(b);
			}
			if (!result) {
				result = 0;
			}
			return result;
		}

		function isFrameBorderDisabled(el) {
			try {
				var f = el.ownerDocument.parentWindow.frameElement;
				if (f.frameBorder=='no' || f.frameBorder==="0") {
					return true;
				}
			} catch(e) {
			}
			return false;
		}			

		function getScrollOffset(el) {
			try {
				var xScroll = Math.max(el.ownerDocument.documentElement.scrollLeft, el.ownerDocument.body.scrollLeft);
				var yScroll = Math.max(el.ownerDocument.documentElement.scrollTop, el.ownerDocument.body.scrollTop);
			} catch(e) {
				var xScroll = el.ownerDocument.body.scrollLeft;
				var yScroll = el.ownerDocument.body.scrollTop;
			}
			return { x: xScroll, y: yScroll }
		}

		var offset			= { x:0, y:0 }
		var isIE 			= el.ownerDocument.compatMode; //
		var isNonIE			= el.ownerDocument.defaultView && el.ownerDocument.defaultView.getComputedStyle
		var isIE8 			= el.ownerDocument.documentMode;
		var isIE8Standard 	= (el.ownerDocument.documentMode==8);

		if (el && el.getBoundingClientRect) {
			var rect = el.getBoundingClientRect();
			offset.x = rect.left;
			offset.y = rect.top;
			var d = { x: 0, y: 0 }
			var docCheck = el.parentNode;
			while (docCheck && docCheck!=elTop) {
				if (docCheck.tagName=='BODY') {
					break;
				}
				docCheck = docCheck.parentNode;
			}
			if (docCheck && docCheck.tagName=='BODY') { // document body is part of the offset stack, so check scrollOffset and borderBug 
				if (!skipScrollbar) {
					d = getScrollOffset(el);
				}
				if (isIE && !isNonIE && !isIE8Standard && !isFrameBorderDisabled(el)) {
					d.x -= getBorderSize(el.ownerDocument.body.currentStyle.borderLeftWidth);
					d.y -= getBorderSize(el.ownerDocument.body.currentStyle.borderTopWidth);
				}
				if (!d.x) {
					d.x = 0;
				}
				if (!d.y) {
					d.y = 0;
				}
			}
			offset.x += d.x;
			offset.y += d.y;
		} else {
			while (el && el.offsetParent && el!=elTop) {
				if ( !isNaN( el.offsetLeft ) ) {
					offset.x += el.offsetLeft;
				}
				if ( !isNaN( el.offsetTop ) ) {
					offset.y += el.offsetTop;
				}
				el = el.offsetParent;
				if (el) {
					if (el!=elTop) {
						if (!isNaN( el.scrollTop)) {
							offset.y -= el.scrollTop;
						}
						if (!isNaN(el.scrollLeft)) {
							offset.x -= el.scrollLeft;
						}
					}
				}
			}
		}
		return offset;				
	}


	function initDragStart(evt) {
		var click=getClickPos(evt);
		var offset=getOffset(resizeObj, vdWindow.document.body, true);
		// difference between mouse cursor position and topleft corner
		var diffX=(click.x)-(offset.x);
		var diffY=(click.y)-(offset.y);
		dragStart={x:diffX, y:diffY}
	}


	function getClickPos(evt) {
		evt = getLocalEvent(evt);
		return { x:evt.clientX, y:evt.clientY };
	}

	function getLocalEvent(evt) {
		return (evt) ? evt : ((vdWindow.event) ? vdWindow.event : null);
	}

/*
    // define prototype methods only once
	if (typeof(_handles_prototype_called) == 'undefined') {
        _handles_prototype_called = true;
*/

		this.insert=function() {
			var tempHandles=this;

			handlesDiv = vdWindow.document.createElement("DIV");
			handlesDiv.setAttribute("unselectable", "on");
			handlesDiv.id = "vd_handles";
			handlesDiv.style.display = "none";
			handlesDiv.style.zIndex = 10;
			vdWindow.document.body.appendChild(handlesDiv);

			function createAntline(id, image) {
				var temp = vdWindow.document.createElement("DIV");
				temp.setAttribute("unselectable", "on");
				temp.className = "vd_antline";
				temp.id = id;
				temp.innerHTML = '<img style="display: block;" unselectable="on" src="'+vdImageDir+image+'">';
				handlesDiv.appendChild(temp);

				return vdWindow.document.getElementById(id);
			}

			antlines.left=createAntline('vd_antline_left','vertical.ants.gif');		
			antlines.right=createAntline('vd_antline_right','vertical.ants.gif');
			antlines.top=createAntline('vd_antline_top','horizontal.ants.gif');
			antlines.bottom=createAntline('vd_antline_bottom','horizontal.ants.gif');

			function createHandle(id, title, cursor) {
				var temp = vdWindow.document.createElement("DIV");
				temp.id = id;
				temp.setAttribute("unselectable", "on");
				temp.setAttribute("title", title);
				temp.style.top = "10px";
				temp.style.left = "10px";
				temp.style.width = "7px";
				temp.style.height = "7px";
				temp.style.overflow = "hidden";
				temp.style.backgroundColor = "white";
				temp.style.margin = "0px";
				temp.style.padding = "0px";
				temp.style.border = "1px solid black";
				temp.style.position = "absolute";
				temp.style.cursor = cursor;
				temp.style.zIndex = 1001;

				handlesDiv.appendChild(temp);
				var handle=vdWindow.document.getElementById(id);
				muze.event.attach(handle, 'mousedown', function(evt) { 
					evt = muze.event.get(evt);
					tempHandles.mark(handle.id, evt); 
					return muze.event.cancel(evt);
				} );
				return handle;
			}

			handle.nw=createHandle('vd_handle_topleft', '', 'se-resize');
			handle.n=createHandle('vd_handle_top', '', 's-resize');
			handle.ne=createHandle('vd_handle_topright', '', 'sw-resize');
			handle.w=createHandle('vd_handle_left', '', 'e-resize');
			handle.e=createHandle('vd_handle_right', '', 'w-resize');
			handle.sw=createHandle('vd_handle_bottomleft', '', 'ne-resize');
			handle.s=createHandle('vd_handle_bottom', '', 'n-resize');
			handle.se=createHandle('vd_handle_bottomright', '', 'nw-resize');

			handle.drag = vdWindow.document.createElement("DIV");
			handle.drag.setAttribute("unselectable", "on");
			handle.drag.id = "vd_handle_drag";
			handle.drag.style.position = "absolute";
			handle.drag.style.display = "none";
			handle.drag.style.cursor = "move";
			handle.drag.style.backgroundImage = "url(/simply/widgets/simply/images/transparant.gif)";
			handle.drag.style.zIndex = 3;

			handlesDiv.appendChild(handle.drag);
			muze.event.attach(handle.drag, 'mousedown', function(evt) { evt=muze.event.get(evt); tempHandles.mark(handle.drag.id, evt); return muze.event.cancel(evt); } );

			hoverDiv = vdWindow.document.createElement("DIV");
			hoverDiv.setAttribute("unselectable", "on");
			hoverDiv.id = "vd_hover";
			hoverDiv.style.position = "absolute";
			hoverDiv.style.zIndex = 2;
			hoverDiv.style.backgroundImage = "url(/simply/widgets/simply/images/transparant.gif)";

			vdWindow.document.body.appendChild(hoverDiv);
			hoverDiv.onclick=function(evt) { evt=getLocalEvent(evt); tempHandles.selectcurrent(); return vdCancelEvent(evt); }

			muze.event.attach(vdWindow.document.body, 'mouseup', function() { tempHandles.stop(false) } );
			muze.event.attach(vdWindow.document.body, 'mousedown', function(evt) { 
				if (resizeObj) {
					evt = muze.event.get(evt);
					// resizeObj moet parent zijn van evt.srcElement
					var el = muze.event.target(evt);
					while (el && el!=vdWindow.document.body) {
						if (el==resizeObj) {
							return;
						}
						if (el.id=='vd_handles' || el.id=='vd_hover') {
							return;
						}
						el = el.parentNode;
					}
					tempHandles.hide(); 
				}
			} );
			muze.event.attach(vdWindow.document.body, 'keydown', function() {
				if (resizeObj) {
					window.setTimeout(function() { tempHandles.show(); }, 10);
				}
			} );
			muze.event.attach(vdWindow.document, 'mousewheel', function() {
				if (resizeObj) {
					window.setTimeout(function() { tempHandles.show(); }, 10);
				}
			} );
		}

		this.hide=function() {
			var temp = resizeObj;
			resizeObj=null;
			handlesDiv.style.display='none';
			if( vdUpdateFunc ) {
				vdUpdateFunc(temp, 'hide');
			}
			temp = null;
			return true;
		}

		this.show=function(action) {
			if (vdElement!=vdWindow.document.body) {
				startPos = getOffset(vdElement, vdWindow.document.body); 
			} else {
				startPos = { x: 0, y:0 };
			}
			if (resizeObj) {
				cellPos = getOffset(resizeObj, vdElement);
				cellPos.w=resizeObj.offsetWidth;
				cellPos.h=resizeObj.offsetHeight;
				if (!cellPos.h || cellPos.h<=0) {
					cellPos.h=1;
				}
				if (!cellPos.w || cellPos.w<=0) {
					cellPos.w=1;
				}

				antlines.top.style.top=(startPos.y+cellPos.y)+'px';
				antlines.top.style.left=(startPos.x+cellPos.x)+'px';
				antlines.top.style.height='1px';
				antlines.top.style.width=cellPos.w+'px';
				antlines.top.style.overflow='hidden';
				antlines.top.style.position='absolute';
				antlines.top.style.zIndex=20;

				antlines.left.style.top=(startPos.y+cellPos.y)+'px';
				antlines.left.style.left=(startPos.x+cellPos.x)+'px';
				antlines.left.style.height=cellPos.h+'px';
				antlines.left.style.width='1px';
				antlines.left.style.overflow='hidden';
				antlines.left.style.position='absolute';
				antlines.left.style.zIndex=20;

				antlines.right.style.top=(startPos.y+cellPos.y)+'px';
				antlines.right.style.left=(startPos.x+cellPos.x+cellPos.w-1)+'px';	
				antlines.right.style.width='1px';
				antlines.right.style.height=cellPos.h+'px';
				antlines.right.style.overflow='hidden';
				antlines.right.style.position='absolute';
				antlines.right.style.zIndex=20;
				
				antlines.bottom.style.top=(startPos.y+cellPos.y+cellPos.h-1)+'px';
				antlines.bottom.style.left=(startPos.x+cellPos.x)+'px';
				antlines.bottom.style.width=cellPos.w+'px';
				antlines.bottom.style.height='1px';
				antlines.bottom.style.overflow='hidden';
				antlines.bottom.style.position='absolute';
				antlines.bottom.style.zIndex=20;

				if (this.handles) {
					if (this.handles.nw) {
						handle.nw.style.top=(startPos.y+cellPos.y-3)+'px';
						handle.nw.style.left=(startPos.x+cellPos.x-3)+'px';
						handle.nw.style.display='block';
					} else {
						handle.nw.style.display='none';
					}
					if (this.handles.n) {
						handle.n.style.top=(startPos.y+cellPos.y-3)+'px';
						handle.n.style.left=(startPos.x+cellPos.x+(Math.round(cellPos.w/2))-3)+'px';
						handle.n.style.display='block';
					} else {
						handle.n.style.display='none';
					}
					if (this.handles.ne) {
						handle.ne.style.top=(startPos.y+cellPos.y-3)+'px';
						handle.ne.style.left=(startPos.x+cellPos.x+cellPos.w-4)+'px';
						handle.ne.style.display='block';
					} else {
						handle.ne.style.display='none';
					}
					if (this.handles.w) {
						handle.w.style.top=(startPos.y+cellPos.y+(Math.round(cellPos.h/2))-3)+'px';
						handle.w.style.left=(startPos.x+cellPos.x-3)+'px';
						handle.w.style.display='block';
					} else {
						handle.w.style.display='none';
					}
					if (this.handles.e) {
						handle.e.style.top=(startPos.y+cellPos.y+(Math.round(cellPos.h/2))-3)+'px';
						handle.e.style.left=(startPos.x+cellPos.x+cellPos.w-4)+'px';
						handle.e.style.display='block';
					} else {
						handle.e.style.display='none';
					}
					if (this.handles.sw) {
						handle.sw.style.top=(startPos.y+cellPos.y+cellPos.h-4)+'px';
						handle.sw.style.left=(startPos.x+cellPos.x-3)+'px';
						handle.sw.style.display='block';
					} else {
						handle.sw.style.display='none';
					}
					if (this.handles.s) {
						handle.s.style.top=(startPos.y+cellPos.y+cellPos.h-4)+'px';
						handle.s.style.left=(startPos.x+cellPos.x+(Math.round(cellPos.w/2))-3)+'px';
						handle.s.style.display='block';
					} else {
						handle.s.style.display='none';
					}
					if (this.handles.se) {
						handle.se.style.top=(startPos.y+cellPos.y+cellPos.h-4)+'px';
						handle.se.style.left=(startPos.x+cellPos.x+cellPos.w-4)+'px';
						handle.se.style.display='block';
					} else {
						handle.se.style.display='none';
					}
					if (this.handles.drag) {
						handle.drag.style.top=(startPos.y+cellPos.y+1)+'px';
						handle.drag.style.left=(startPos.x+cellPos.x+1)+'px';
						handle.drag.style.height=(cellPos.h-1)+'px';
						handle.drag.style.width=(cellPos.w-1)+'px';
						handle.drag.style.display='block';
					} else {
						handle.drag.style.display='none';
						handle.drag.style.height='0px';
						handle.drag.style.width='0px';
					}
				} else {
					for (var i in handle) {
						handle[i].style.display='none';
					}
				}

				handlesDiv.style.display='block';
				// check for callback method
				if( vdUpdateFunc  ) {
					vdUpdateFunc(resizeObj, action);
				} 
			}
			return true;
		}

		this.remove=function() {
			vdWindow.document.body.removeChild(handlesDiv);
			vdWindow.document.body.removeChild(hoverDiv);
		}

		this.mark=function(handleId, evt) {
			resizing=true;
			tempHandles = this;
			if (tempSelectStartFunction==null) {
				// remember old onselectstart handler
				tempSelectStartFunction=vdWindow.document.onselectstart;
			}
			if (handleId=='vd_handle_drag') {
				initDragStart(evt);
			}
			// replace onselectstart handler with an empty one to
			// prevent selections while dragging
			vdWindow.document.onselectstart = function() { return false; }
			if (fnResizeHandler) {
				muze.event.detach(vdWindow.document.body, 'mousemove', this.fnResizeHandlerCancel);
			}
			fnResizeHandler=function(evt) { tempHandles.resize(handleId, evt); }
			this.fnResizeHandlerCancel = muze.event.attach(vdWindow.document.body, 'mousemove', fnResizeHandler);
		}

		this.stop=function(hide) {
			if (resizing) {
				resizing = false;
				// re-attach old onselectstart handler
				vdWindow.document.onselectstart=tempSelectStartFunction;
				muze.event.detach(vdWindow.document.body, 'mousemove', this.fnResizeHandlerCancel);
				fnResizeHandler = null;
				if (hide) {
					this.hide();
				}
				// check for callback method
				if( vdUpdateFunc ) {
					vdUpdateFunc(resizeObj, 'dragstop');
				}
			}
		}

		this.select=function(el, handlesList) {
			// select el, show antlines and optionally handles
			resizeObj=el;
			this.handles=handlesList;
			this.show('select');
			// this.mark('vd_handle_drag');
		}

		this.getElement=function() {
			if (resizeObj) {
				return resizeObj;
			}
		}

		this.resize=function(handleId, evt) {
			if (resizing && resizeObj) {
				var click = getClickPos(evt);
				var offset = getOffset(resizeObj, vdWindow.document.body, true); //ignore scrollbar
				// difference between mouse cursor position and topleft corner
				var diffX=(click.x)-(offset.x);
				var diffY=(click.y)-(offset.y);
				if (this.handles) {
					switch(handleId) {
						case 'vd_handle_topleft':
							if (this.handles.nw) {
								this.handles.nw(resizeObj, diffX, diffY);
							}
							break;
						case 'vd_handle_top':
							if (this.handles.n) {
								this.handles.n(resizeObj, diffX, diffY);
							}
							break;
						case 'vd_handle_topright':
							if (this.handles.ne) {
								this.handles.ne(resizeObj, diffX, diffY);
							}
							break;
						case 'vd_handle_left':
							if (this.handles.w) {
								this.handles.w(resizeObj, diffX, diffY);
							}
							break;
						case 'vd_handle_right':
							if (this.handles.e) {
								this.handles.e(resizeObj, diffX, diffY);
							}
							break;
						case 'vd_handle_bottomleft':
							if (this.handles.sw) {
								this.handles.sw(resizeObj, diffX, diffY);
							}
							break;
						case 'vd_handle_bottom':
							if (this.handles.s) {
								this.handles.s(resizeObj, diffX, diffY);
							}
							break;
						case 'vd_handle_bottomright':
							if (this.handles.se) {
								this.handles.se(resizeObj, diffX, diffY);
							}
							break;
						case 'vd_handle_drag':
							if (this.handles.drag) {
								this.handles.drag(resizeObj, diffX-dragStart.x, diffY-dragStart.y);
							}
							break;
					}
				}
				this.show('resize');
			}
		}

		this.hover=function(el, handles) {
			if (el) {
				hoverObj=el;
				hoverHandles=handles;
				startPos = getOffset(vdElement, vdWindow.document.body); 
				cellPos = getOffset(hoverObj, vdElement);
				if (cellPos) {
					cellPos.w=hoverObj.offsetWidth;
					cellPos.h=hoverObj.offsetHeight;

					hoverDiv.style.display='block';
//					window.status+='sp:'+startPos.y+' cp:'+cellPos.y;
					hoverDiv.style.top=(startPos.y+cellPos.y)+'px';
					hoverDiv.style.left=(startPos.x+cellPos.x)+'px';
					hoverDiv.style.width=cellPos.w+'px';
					hoverDiv.style.height=cellPos.h+'px';
					hoverDiv.style.zIndex=1;
				}
			}
		}

		this.selectcurrent=function() {
			this.select(hoverObj, hoverHandles);
		}

		this.attach=function(handlesList, el) 
		{
			//	handles={ nw:function, n:function, ...
			var tempHandles=this;
			if (el.vdHover) {
				muze.event.detach(el, 'mouseover',el.vdHoverCancel);
				if (hoverObj==el) {
					hoverHandles=handlesList;
				}
				if (resizeObj==el) {
					this.handles=handlesList;
					this.show('select');
				}
			}
			el.vdHover=function(evt) { evt=muze.event.get(evt); tempHandles.hover(el, handlesList); if (evt) { evt.cancelBubble=true; } }
			el.vdHoverCancel = muze.event.attach(el, 'mouseover', el.vdHover);
		}

		this.detach=function(el) 
		{
			if (el.vdHover) {
				muze.event.detach(el, 'mouseover',el.vdHoverCancel);
				el.vdHover=null;
			}
		}

		this.attachTags=function() 
		{
			var tempHandles=this;

			function attachTag(handlesList, tagName) 
			{
				var tagList=document.getElementsByTagName(tagName);
				for (var i=0; i<tagList.length; i++) 
				{
					if (!(tagList[i].unselectable=='on')) 
					{
						tempHandles.attach(handlesList, tagList[i]);
					}
				}
			}

			for (var i=1; i<arguments.length; i++) 
			{
				attachTag(arguments[0], arguments[i]);
			}
		}
//	}
	this.insert();
}


var absResize = {
	setWidth : function( el, width ) {
		if ( width < 0 ) {
			width = 0;
		}
		el.style.width = width + 'px';
	},
	setHeight : function( el, height ) {
		if ( height < 0 ) {
			height = 0;
		}
		el.style.height = height + 'px';
	},
	changeLeftPos : function( el, diffX ) {
		var start     = el.offsetLeft;
		el.style.left = ( start + diffX ) + 'px';
	},
	changeTopPos : function( el, diffY ) {
		var start    = el.offsetTop;
		el.style.top = ( start + diffY ) + 'px';
	},
	changeHeight : function( el, diffY ) {
		var start       = el.offsetHeight;
		el.style.height = Math.max( start + diffY, 0 ) + 'px';
	},
	changeWidth : function( el, diffX ) {
		var start      = el.offsetWidth;
		el.style.width = Math.max( start + diffX, 0 ) + 'px';
	},
	nw : function( el, diffX, diffY ) {
		absResize.changeLeftPos( el, diffX );
		absResize.changeTopPos( el, diffY );
		absResize.changeWidth( el, -diffX );
		absResize.changeHeight( el, -diffY );
	},
	n : function( el, diffX, diffY ) {
		absResize.changeTopPos( el, diffY );
		absResize.changeHeight( el, -diffY );
	},
	w : function( el, diffX, diffY ) {
		absResize.changeLeftPos( el, diffX );
		absResize.changeWidth( el, -diffX );
	},
	ne : function( el, diffX, diffY ) {
		absResize.changeTopPos( el, diffY );
		absResize.changeHeight( el, -diffY );
		absResize.setWidth( el, diffX );
	},
	e : function( el, diffX, diffY ) {
		absResize.setWidth( el, diffX );
	},
	sw : function( el, diffX, diffY ) {
		absResize.changeLeftPos( el, diffX );
		absResize.changeWidth( el, -diffX );
		absResize.setHeight( el, diffY );
	},
	s : function( el, diffX, diffY ) {
		absResize.setHeight( el, diffY );
	},
	se : function( el, diffX, diffY ) {
		absResize.setWidth( el, diffX );
		absResize.setHeight( el, diffY );
	},
	drag : function( el, diffX, diffY ) {
		absResize.changeLeftPos( el, diffX );
		absResize.changeTopPos( el, diffY );
	},
	getHandles : function() {
		return {
			nw   : absResize.nw,
			n    : absResize.n,
			ne   : absResize.ne,
			e    : absResize.e,
			se   : absResize.se,
			s    : absResize.s,
			sw   : absResize.sw,
			w    : absResize.w,
			drag : absResize.drag 
		}
	}
}

var relResize={
	setWidth:function(el, width) {
		if (width<0) {
			width=0;
		}
		el.style.width=width;
	},
	setHeight:function(el, height) {
		if (height<0) {
			height=0;
		}
		el.style.height=height;
	},
	e:function(el, diffX, diffY) {
		relResize.setWidth(el, diffX);
	},
	s:function(el, diffX, diffY) {
		relResize.setHeight(el, diffY);
	},
	se:function(el, diffX, diffY) {
		relResize.setWidth(el, diffX);
		relResize.setHeight(el, diffY);
	},
	getHandles:function() {
		return {
			e:relResize.e,
			se:relResize.se,
			s:relResize.s
		}
	}
}

var self = {

	init : function(vdWindow, vdElement, vdImageDir, vdUpdateFunc) {
		return new handles(vdWindow, vdElement, vdImageDir, vdUpdateFunc);
	}
}

return self;

})();
muze.namespace('simply.widgets.properties');

simply.widgets.properties = ( function() { 

	var self = {
		get : function( id ) {
			var value='';
			var input;
			if ((typeof id == "string") || (typeof id == "text") ) {
				input = document.getElementById(id);
			} else {
				input = id;
			}

			if (input) {
				if (!input.type && input.getAttribute("data-type")) {
					input.type = input.getAttribute("data-type");
				}

				switch (input.type) {
					case 'checkbox' :
						if (input.checked) {
							value=input.value;
						}
						break;
					case 'radio' :
						var radio=input.form[input.name];
						if (radio) { 
							for (var i=0; i<radio.length; i++) {
								if (radio[i].checked) {
									value=radio[i].value;
									break;
								}
							}
						}
						break;
					case 'hidden' :
					case 'password' :
					case 'text' :
						value=input.value;
						break;
					case 'select-one' :
						value=input.options[input.selectedIndex].value;
						break;
					case 'select-multiple' :
						value=new Array();
						for (var i=0; i<input.length; i++) {
							if (input.options[i].selected) {
								value[value.length]=input.options[i].value;
							}
						}
						break;
					case 'simply-buttongroup-radio' : 
						var values = input.querySelectorAll("button.simply-selected");
						for (var i=0; i<values.length; i++) {
							value = values[i].getAttribute("data-value");
						}
						break;
					case null :
						value=input.innerHTML;
						break;
					default :
						value=input.value;
						break;
				}
				return value;
			} else {
				return '';
			}

		},

		set : function( id, value ) {
			var input;

			if ((typeof id == "string") || (typeof id == "text") ) {
				input = document.getElementById(id);
			} else {
				input = id;
			}
			if (input) {
				if (!input.type && input.getAttribute("data-type")) {
					input.type = input.getAttribute("data-type");
				}
				self.enable(id);
				switch (input.type) {
					case 'checkbox' :
						if (input.value==value) {
							input.checked=true;
						} else {
							input.checked=false;
						}
						break;
					case 'radio' :
						var radio=input.form[input.name];
						if (radio) { 
							for (var i=0; i<radio.length; i++) {
								radio[i].checked=false;
							}
							for (var i=0; i<radio.length; i++) {
								if (radio[i].value==value) {
									radio[i].checked=true;
									break;
								}
							}
						}
						break;
					case 'hidden' :
					case 'password' :
					case 'text' :
						input.value = value;
						break;
					case 'select-one' :
						for (var i=0; i<input.length; i++) {
							if (input.options[i].value==value) {
								input.options[i].selected=true;
								break;
							}
						}
						break;
					case 'select-multiple' :
						for (var i=0; i<input.length; i++) {
							input.options[i].selected=false;
						}
						for (var i=0; i<value.length; i++) {
							for (var ii=0; ii<input.length; ii++) {
								if (input.options[ii].value==value[i]) {
									input.options[ii].selected=true;
								}
							}
						}
						break;
					case 'simply-buttongroup-radio':
						var values = input.querySelectorAll("button");
						for (var i=0; i<values.length; i++) {
							values[i].className = values[i].className.replace(/\bsimply-selected\b/, '');
							if (values[i].getAttribute("data-value") == value) {
								values[i].className += " simply-selected";
							}
						}
						break;
					default :
						input.value = value;
						break;
				}
			}		
		},

		enable : function() {
			for( var i = 0; i < arguments.length; i++ ) {
				var input = document.getElementById( arguments[i] );
				if (input) {
					input.className = input.className.replace(/\bvdDisabled\b/g, '');
					input.disabled = false;
				}
			}
		},

		disable : function() {
			for( var i = 0; i < arguments.length; i++ ) {
				var input = document.getElementById( arguments[i] );
				if (input) {
					input.className += ' vdDisabled';
					input.disabled = true;
				}
			}
		},
		
		isEnabled : function( id ) {
			var input=document.getElementById(id);
			if (input) {
				return !input.className.match(/\bvdDisabled\b/);
			}
		}
	}


	return self;

})();
muze.namespace('simply.editor');

simply.editor = ( function() {
	var editor = {
		
	}
	return editor;
})();
// polyfill to add :scope selector for IE
(function() {
  if (!HTMLElement.prototype.querySelectorAll) {
    throw new Error('rootedQuerySelectorAll: This polyfill can only be used with browsers that support querySelectorAll');
  }

  // A temporary element to query against for elements not currently in the DOM
  // We'll also use this element to test for :scope support
  var container = document.createElement('div');

  // Check if the browser supports :scope
  try {
    // Browser supports :scope, do nothing
    container.querySelectorAll(':scope *');
  }
  catch (e) {
    // Match usage of scope
    var scopeRE = /^\s*:scope/gi;

    // Overrides
    function overrideNodeMethod(prototype, methodName) {
      // Store the old method for use later
      var oldMethod = prototype[methodName];

      // Override the method
      prototype[methodName] = function(query) {
        var nodeList,
            gaveId = false,
            gaveContainer = false;

        if (query.match(scopeRE)) {
          // Remove :scope
          query = query.replace(scopeRE, '');

          if (!this.parentNode) {
            // Add to temporary container
            container.appendChild(this);
            gaveContainer = true;
          }

          parentNode = this.parentNode;

          if (!this.id) {
            // Give temporary ID
            this.id = 'rootedQuerySelector_id_'+(new Date()).getTime();
            gaveId = true;
          }

          // Find elements against parent node
          nodeList = oldMethod.call(parentNode, '#'+this.id+' '+query);

          // Reset the ID
          if (gaveId) {
            this.id = '';
          }

          // Remove from temporary container
          if (gaveContainer) {
            container.removeChild(this);
          }

          return nodeList;
        }
        else {
          // No immediate child selector used
          return oldMethod.call(this, query);
        }
      };
    }

    // Browser doesn't support :scope, add polyfill
    overrideNodeMethod(HTMLElement.prototype, 'querySelector');
    overrideNodeMethod(HTMLElement.prototype, 'querySelectorAll');
  }
}());// github.com/2is10/selectionchange-polyfill

var selectionchange = (function (undefined) {

  var MAC = /^Mac/.test(navigator.platform);
  var MAC_MOVE_KEYS = [65, 66, 69, 70, 78, 80]; // A, B, E, F, P, N from support.apple.com/en-ie/HT201236
  var SELECT_ALL_MODIFIER = MAC ? 'metaKey' : 'ctrlKey';
  var RANGE_PROPS = ['startContainer', 'startOffset', 'endContainer', 'endOffset'];
  var HAS_OWN_SELECTION = {INPUT: 1, TEXTAREA: 1};

  var ranges;

  return {
    start: function (doc) {
      var d = doc || document;
      if (ranges || !hasNativeSupport(d) && (ranges = newWeakMap())) {
        if (!ranges.has(d)) {
          ranges.set(d, getSelectionRange(d));
          on(d, 'input', onInput);
          on(d, 'keydown', onKeyDown);
          on(d, 'mousedown', onMouseDown);
          on(d, 'mousemove', onMouseMove);
          on(d, 'mouseup', onMouseUp);
          on(d.defaultView, 'focus', onFocus);
        }
      }
    },
    stop: function (doc) {
      var d = doc || document;
      if (ranges && ranges.has(d)) {
        ranges['delete'](d);
        off(d, 'input', onInput);
        off(d, 'keydown', onKeyDown);
        off(d, 'mousedown', onMouseDown);
        off(d, 'mousemove', onMouseMove);
        off(d, 'mouseup', onMouseUp);
        off(d.defaultView, 'focus', onFocus);
      }
    }
  };

  function hasNativeSupport(doc) {
    var osc = doc.onselectionchange;
    if (osc !== undefined) {
      try {
        doc.onselectionchange = 0;
        return doc.onselectionchange === null;
      } catch (e) {
      } finally {
        doc.onselectionchange = osc;
      }
    }
    return false;
  }

  function newWeakMap() {
    if (typeof WeakMap !== 'undefined') {
      return new WeakMap();
    } else {
      console.error('selectionchange: WeakMap not supported');
      return null;
    }
  }

  function getSelectionRange(doc) {
    var s = doc.getSelection();
    return s.rangeCount ? s.getRangeAt(0) : null;
  }

  function on(el, eventType, handler) {
    el.addEventListener(eventType, handler, true);
  }

  function off(el, eventType, handler) {
    el.removeEventListener(eventType, handler, true);
  }

  function onInput(e) {
    if (!HAS_OWN_SELECTION[e.target.tagName]) {
      dispatchIfChanged(this, true);
    }
  }

  function onKeyDown(e) {
    var code = e.keyCode;
    if (code === 65 && e[SELECT_ALL_MODIFIER] && !e.shiftKey && !e.altKey || // Ctrl-A or Cmd-A
        code >= 37 && code <= 40 || // arrow key
        e.ctrlKey && MAC && MAC_MOVE_KEYS.indexOf(code) >= 0) {
      if (!HAS_OWN_SELECTION[e.target.tagName]) {
        setTimeout(dispatchIfChanged.bind(null, this), 0);
      }
    }
  }

  function onMouseDown(e) {
    if (e.button === 0) {
      on(this, 'mousemove', onMouseMove);
      setTimeout(dispatchIfChanged.bind(null, this), 0);
    }
  }

  function onMouseMove(e) {  // only needed while primary button is down
    if (e.buttons & 1) {
      dispatchIfChanged(this);
    } else {
      off(this, 'mousemove', onMouseMove);
    }
  }

  function onMouseUp(e) {
    if (e.button === 0) {
      setTimeout(dispatchIfChanged.bind(null, this), 0);
    } else {
      off(this, 'mousemove', onMouseMove);
    }
  }

  function onFocus() {
    setTimeout(dispatchIfChanged.bind(null, this.document), 0);
  }

  function dispatchIfChanged(doc, force) {
    var r = getSelectionRange(doc);
    if (force || !sameRange(r, ranges.get(doc))) {
      ranges.set(doc, r);
      setTimeout(doc.dispatchEvent.bind(doc, new Event('selectionchange')), 0);
    }
  }

  function sameRange(r1, r2) {
    return r1 === r2 || r1 && r2 && RANGE_PROPS.every(function (prop) {
      return r1[prop] === r2[prop];
    });
  }
})();
muze.namespace('simply.editor.selection');

muze.require('simply.dom.selection');

simply.editor.selection = ( function() {
	
	var win = window;
	var savedRange = null;
	var domSelection = simply.dom.selection;

	var controlTags = {
		IMG : true,
		OBJECT : true,
		EMBED : true
	}

	function isUneditable( node ) {
		return node.getAttribute('contentEditable') == 'false';
	}

	function isControlTag( node ) {
		var tag = node.tagName.toUpperCase();
		return ( controlTags[tag] ? true : false );
	}

	var self = {
		init : function( useWin ) {
			win = useWin;
		},
		save : function( range ) {
			if( !range ) {
				range = domSelection.get(win);
			}
			savedRange = range;
		},
		restore : function( range ) {
			if( !range ) {
				range = savedRange;
			}
			if( range ) {
				domSelection.select(range);
			}
		},
		get : function() {
			return savedRange ? savedRange : domSelection.get(win);
		},
		getControlNode : function( range ) {
			if( !range ) {
				range = self.get();
			}
			if( range ) {
				var node = domSelection.getNode(range);
				if( isControlTag(node) || isUneditable(node) ) { // this could use a lot more probably
					return node;
				}
			}
			return false;
		},
		remove : function() {
			savedRange = null;
		}
	}

	return self;

})();
muze.namespace('simply.editor.bookmarks');

muze.require('simply.dom.selection');
muze.require('simply.dom.nesting');

simply.editor.bookmarks = ( function() {

	var win = window;
	var doc = window.document;
	var selection = simply.dom.selection;
	var nesting = simply.dom.nesting;

	var TEXT_NODE = 3;
	var ELEMENT_NODE = 1;
	
	var bookmarks = {
		backwards : false,
		init : function( useWin ) {
			win = useWin;
			doc = useWin.document;
		},
	
		normalize : function(bookmark, side) {
			// this method moves the left and right bookmarks so that they best enclose the selection
			function moveLeft() {
				do {
					movedDown = false;
					while (nesting.isEmpty(bookmark.previousSibling)) {
						bookmark.swapNode(bookmark.previousSibling);
					}
					if (bookmark.previousSibling
						&& bookmark.previousSibling.nodeType==ELEMENT_NODE
						&& nesting.canHaveContent(bookmark.previousSibling.tagName)) {
				
						bookmark.previousSibling.appendChild(bookmark);
						movedDown = true;
					}
				} while (movedDown);
			}

			function moveRight() {
				do {
					movedDown = false;
					while (nesting.isEmpty(bookmark.nextSibling)) {
						bookmark.swapNode(bookmark.nextSibling);
					}
					if (bookmark.nextSibling 
						&& bookmark.nextSibling.nodeType==ELEMENT_NODE 
						&& nesting.canHaveContent(bookmark.nextSibling.tagName)) {
						
						bookmark.nextSibling.insertBefore(bookmark, bookmark.nextSibling.firstChild);
						movedDown = true;
					} else if (!bookmark.nextSibling && bookmark.parentNode && bookmark.parentNode.parentNode ) {
						if (bookmark.parentNode.nextSibling) {
							bookmark.parentNode.parentNode.insertBefore(bookmark, bookmark.parentNode.nextSibling);
						} else {
							bookmark.parentNode.parentNode.appendChild(bookmark);
						}
						movedDown = true;
					}
				} while (movedDown);
			}
			
			if (side=='left') {
				moveRight();
			} else {
				moveLeft();
			}
		},
		getTag : function(side) {
			var span = doc.createElement('SPAN');
			if (side=='right') {
				span.id='vdBookmarkRight';
			} else {
				span.id='vdBookmarkLeft';
			}
			return span;
		},
		findTag : function(side) {
			if (side=='right') {
				return doc.getElementById('vdBookmarkRight');
			} else {
				return doc.getElementById('vdBookmarkLeft');
			}
		},
		set : function(sel) {
			bookmarks.backwards = selection.backwards(win);

			// this method inserts the left and right bookmarks based on the given selection.
			var left = selection.clone(sel);
			var right = selection.clone(sel);
			// now remove any stray bookmarks left from an interrupted script
			bookmarks.remove();

			selection.collapse(right, false);
			var rightTag = bookmarks.getTag('right');
			selection.replace(right, rightTag);

			selection.collapse(left);
			var leftTag = bookmarks.getTag('left');
			selection.replace(left, leftTag);

			//FIXME: this is an IE only fix, check behaviour of other browsers, we may need to add extra cases
			if( !win.getSelection ) {		
				bookmarks.normalize(leftTag, 'left');
				bookmarks.normalize(rightTag, 'right');
			}
		},
		select : function(el) {
			// this method turns the bookmarks back into a selection
			// FIXME: When returning the bookmarks to a selection, the selection 'direction' always goes from left to right; It should return the selection in the original direction.
			if (!el) {
				el = doc;
			}
			var leftTag = bookmarks.findTag('left');
			var rightTag = bookmarks.findTag('right');
			var leftSel = selection.clone(selection.get(win));
			var rightSel = selection.clone(selection.get(win));
			var leftRange = selection.collapse(selection.selectNode(leftSel, leftTag, true));
			var rightRange = selection.collapse(selection.selectNode(rightSel, rightTag, true), true);
			var totalSel = selection.clone(selection.get(win));
			if (bookmarks.backwards) {
				return selection.selectRange(totalSel, rightRange, leftRange, true);
			} else {
				return selection.selectRange(totalSel, leftRange, rightRange, true);
			}
		},
		remove : function() {
			bookmarks.backwards = false;
			var leftTag = bookmarks.findTag('left');
			while (leftTag) {
				while (leftTag.firstChild) {
					leftTag.parentNode.insertBefore(leftTag.firstChild, leftTag);
				}
				leftTag.parentNode.removeChild(leftTag);
				leftTag = bookmarks.findTag('left');
			}
			var rightTag = bookmarks.findTag('right');
			while (rightTag) {
				while (rightTag.firstChild) {
					rightTag.parentNode.insertBefore(rightTag.firstChild, rightTag);
				}
				rightTag.parentNode.removeChild(rightTag);
				rightTag = bookmarks.findTag('right');
			}
		}
	}
	return bookmarks;
})();muze.namespace('simply.editor.styles');

muze.require('simply.dom.selection');
muze.require('simply.dom.nesting');
muze.require('simply.editor.bookmarks');

simply.editor.styles = ( function() {

	var win = window;
	var doc = window.document;
	var selection = simply.dom.selection;
	var nesting = simply.dom.nesting;
	var bookmarks = simply.editor.bookmarks;

	function isArray( arr ) {
		return ( arr instanceof Array );
	}

	var TEXT_NODE = 3;
	var ELEMENT_NODE = 1;

	function TreeWalker(root, start, end, tagName) {
		// start must be a valid child of tagName for now
		this.root = root;
		this.start = start;
		this.end = end;
		this.currentNode = start;
		this.tagName = tagName;
		var obligChild = nesting.obligatoryChild(tagName); // check for LI instead of OL/UL with allowChild
		if (obligChild) {
			this.tagName = obligChild;
		}
		this.containsEndNode = function(el) {
			if (el==end) {
				return true;
			} else {
				var current = this.end;
				while (current && current!=el && current!=this.root) {
					current = current.parentNode;
				}
				return current==el;
			}
		},
		this.next = function() {
			var nodeBag = new Array();
			var lastNode = null;
			while (this.currentNode && !this.containsEndNode(this.currentNode) && 
					( nesting.isTextNode(this.currentNode) || 
					  nesting.allowChild(this.tagName, this.currentNode) ) ) {
				nodeBag.push(this.currentNode);
				lastNode = this.currentNode;
				this.currentNode = this.currentNode.nextSibling;
			}
			if (!this.currentNode && lastNode) {
				this.currentNode = this.findNextParentSibling(lastNode);
			}
			if (this.currentNode && this.containsEndNode(this.currentNode)) {
				// if the currentNode is allowed as a child of the new tag, split the node 
				// otherwise, simply move the currentNode inside it and return the nodeBag.
				if (!nesting.allowChild(this.tagName, this.currentNode)) {
					this.currentNode = this.findValidChildNode(this.currentNode)
				} else {
					var parent = this.end.parentNode;
					var split = this.end;
					while (parent!=this.currentNode.parentNode) {
						DOM.split(parent, 'after', split);
						split = parent;
						parent = parent.parentNode;
					}
					nodeBag.push(this.currentNode);
					this.currentNode = null;
				}
			} else if (this.currentNode) {
				this.currentNode = this.findNextValidNode(this.currentNode);
			}
			if (nodeBag.length) {
				return nodeBag;
			} else {
				return null;
			}
		}
		this.findNextParentSibling = function(el) {
			var currentNode = el;
			var parent = el.parentNode;
			while (parent && parent != this.root && !parent.nextSibling) {
				parent = parent.parentNode;
			}
			if (parent && parent != this.root ) {
				return parent.nextSibling;
			} else {
				return null;
			}
		}
		this.findValidNode = function(el) {
			var currentNode = el;
			var nextNode = this.findValidChildNode(currentNode);
			while (currentNode && !nextNode ) {
				if (currentNode!=this.root) {
					currentNode = currentNode.parentNode;
					nextNode = this.findValidChildNode(currentNode);
				}
			}
			return nextNode;
		}
		this.findNextValidNode = function(el) {
			var currentNode = el;
			var nextNode = this.findValidChildNode(currentNode);
			while (currentNode && !nextNode ) {
				if (currentNode!=this.root) {
					currentNode = this.findNextParentSibling(currentNode);
					if (currentNode) {
						nextNode = this.findValidChildNode(currentNode);
					}
				}
			}
			return nextNode;
		}
		this.findValidChildNode = function(el) {
			var currentNode = el;
			var validNode = null;
			if (el && el != this.end) {
				if (nesting.isTextNode(currentNode) || nesting.allowChild(this.tagName, currentNode.tagName)) {
					validNode = currentNode;
				} else if (currentNode.firstChild) {
					validNode = this.findValidChildNode(currentNode.firstChild);
				}
				if (!validNode && currentNode.nextSibling) {
					validNode = this.findValidChildNode(currentNode.nextSibling);
				}
			}
			return validNode;
		}
	}


	var DOM = function() {
		return {
			walk : function(root, start, end, tagName) {
				return new TreeWalker(root, start, end, tagName);
			},
			split : function(parent, direction, referenceChild) {
				// Bij direction = 'before' een nieuwe parent toevoegen voor de huidige
				// bij direction='after' een nieuwe toevoegen na de huidige. Hiermee wordt de 'huidige' parent nooit direct leeg
				
				var newParent = parent.cloneNode(false); // shallow copy
				if (direction=='after') {
					while(referenceChild.nextSibling) {
						newParent.appendChild(referenceChild.nextSibling);
					}
					if (newParent.firstChild) { // only add the new parent to the DOM if it has content
						if (parent.nextSibling) {
							parent.parentNode.insertBefore(newParent, parent.nextSibling);
						} else {
							parent.parentNode.appendChild(newParent);
						}
					} else {
						newParent = null;
					}
				} else { // before
					while (referenceChild.previousSibling) {
						newParent.insertBefore(referenceChild.previousSibling, newParent.firstChild);
					}
					if (newParent.firstChild && !nesting.isEmpty(newParent.firstChild)) { // only add the new parent to the DOM if it has content
						parent.parentNode.insertBefore(newParent, parent);
					} else {
						newParent = null;
					}
				}
				return newParent;
			},
			wrap : function(nodes, wrapper, root) {
				if (!root) {
					root = doc.body;
				}
				var clonedWrapper = wrapper.cloneNode(false);
				var obligChild = nesting.obligatoryChild(clonedWrapper);
				if (obligChild) {
					// special case, we must wrap the nodes in two tags, e.g. <oL><li>
					var obligChildEl = doc.createElement(obligChild);
					clonedWrapper.appendChild(obligChildEl);
					var newParent = obligChildEl;
				} else {
					var newParent = clonedWrapper;
				}
				if (!isArray(nodes)) {
					nodes = new Array(nodes);
				}
				var firstNode = nodes[0];
				var firstParentNode = firstNode.parentNode;
				var currentParentNode = firstParentNode;
				while (!nesting.allowChild(currentParentNode, wrapper) && currentParentNode!=root) {
					// split the parent if needed
					if (currentParentNode.firstChild!=firstNode) {
						DOM.split(currentParentNode, 'before', firstNode);
					}
					firstNode = currentParentNode;
					currentParentNode = currentParentNode.parentNode;
				}
				if (nesting.allowChild(currentParentNode, wrapper)) {
					// insert the wrapper
					currentParentNode.insertBefore(clonedWrapper, firstNode);
					// move the nodes to the wrapper
					for (var i=0; i<nodes.length; i++) {
						newParent.appendChild(nodes[i]);
					}
					// remove any empty elements caused by moving all child nodes out of parent nodes
					var tempNode = null;
					// FIXME: firstChild isEmpty checken is niet goed genoeg, hij moet ook geen nextSiblings hebben die niet empty zijn
					// FIXME: dit geld voor webkit browsers
					while (firstParentNode!=root && (!firstParentNode.firstChild || nesting.isEmpty(firstParentNode.firstChild))) {
						if ( !firstParentNode.firstChild ) {
							if ( firstParentNode.tagName!='TD' && firstParentNode.tagName!='TH' ) {
								tempNode = firstParentNode;
								firstParentNode = firstParentNode.parentNode;
								firstParentNode.removeChild(tempNode);
							} else {
								break;
							}
						} else if ( nesting.isEmpty(firstParentNode.firstChild ) ) {
							firstParentNode.removeChild(firstParentNode.firstChild );
						}
					}
				}
				// if we added an obligatory child (li), check if the previous sibling is the same tagName+className as the current wrapper
				// if so, the li should probably be appended to it instead of our new wrapper.
				if (obligChild) {
					var previousEl = clonedWrapper.previousSibling;
					if (previousEl && previousEl.tagName==clonedWrapper.tagName && 
						clonedWrapper.className==previousEl.className) {
						previousEl.appendChild(newParent);
						clonedWrapper.parentNode.removeChild(clonedWrapper);
					}
				}
			},
			unwrap : function(root, start, end, wrapper) {
				// TODO: remove all occurances of the wrapper tag inside the root, between the start and end nodes
			}
		}
	}();


	function setFormat(styleInfo, root) {
		function getFittingParent(sel, tagName, root) {
			var parent = selection.parentNode(sel);
			if (nesting.isBlock(tagName)) {
				while (!nesting.isBlock(parent.tagName) && parent!=root) {
					parent = parent.parentElement;
				}
			}
			return parent;
		}
		
		if (styleInfo=='.') { // clear all styles
			var sel = selection.get(win);
			sel.execCommand('RemoveFormat');
		} else {
			var tagName = styleInfo.split('.')[0];
			var className = styleInfo.split('.')[1];
			var sel = selection.clone(selection.get(win));
			if (selection.isEmpty(sel)) {
				var parent = getFittingParent(sel, tagName, root);
				if (!tagName || tagName=='*') {
					tagName = parent.tagName;
				}
				sel = selection.selectNode(selection.clone(sel), parent, true);
			}
			if (!tagName || tagName=='*') {
				tagName = 'span';
			}
			bookmarks.set(sel);
			applyStyle(tagName, className, root);
			bookmarks.select();
			bookmarks.remove();
		}
	}

	function applyStyle(tagName, className, root) {
		var leftTag = bookmarks.findTag('left', root);
		var rightTag = bookmarks.findTag('right', root);
		var treeWalker = DOM.walk(root, leftTag, rightTag, tagName);
		var wrapper = doc.createElement(tagName);
		if (className) {
			wrapper.className = className;
		}
		DOM.unwrap(root, wrapper); // make sure we don't nest the same tagName/className tags
	//	alert( 'BEFORE: ' + root.parentNode.innerHTML );
		
		var nodeBag = null;
		while (nodeBag = treeWalker.next()) {
			DOM.wrap(nodeBag, wrapper, root);
		}
	}
	
	return {
		format : function(styleInfo, root) {
			return setFormat(styleInfo, root);
		},
		init : function( useWin ) {
			win = useWin;
			doc = useWin.document;
			bookmarks.init(useWin);
		}
	}

})();muze.namespace('simply.editor.paste');

muze.require('simply.dom.cleaner');
muze.require('simply.dom.selection');
muze.require('muze.event');


simply.editor.paste = ( function() {

	var cleaner = simply.dom.cleaner;
	var event = muze.event;
	var selection = simply.dom.selection;
	var win = window;

	var w3c = window.getSelection ? true : false;
	var beforeCopy = false; 

	var paste = {
		init : function(useWin) {
			win = useWin;
		},
		attach : function(el, callback) {
			if( w3c ) { // only IE has beforepaste
				return;
			}

			// this trick with beforeCopy is because it fires upon rightclick but no actual paste is done.
			event.attach(el, 'beforecopy', function() {
				beforeCopy = true;
			});

			event.attach(el, 'copy', function() {
				beforeCopy = false;
			});

			event.attach(el, 'beforepaste', function() {
				if( beforeCopy ) {
					beforeCopy = false;
					return;
				}
				var inDiv=document.createElement('div');
				inDiv.style.width='1px';
				inDiv.style.height='1px';
				inDiv.style.overflow='hidden';
				inDiv.style.position='absolute';
				inDiv.style.top='0px';
				inDiv.setAttribute('contentEditable',true);
				document.body.appendChild(inDiv);
				var range = selection.get(win);
				inDiv.focus();
				window.setTimeout( function() {
					var inHtml=inDiv.innerHTML;
					if( inHtml == "" ) {
						selection.select(range);
						return;
					}
					if (cleaner.check(inHtml)) {
						inHtml = cleaner.clean(inHtml, 'full');
					}
					selection.select(range);
					selection.setHTMLText(range, inHtml);
					inDiv.parentNode.removeChild(inDiv);
					if (callback) {
						callback();
					}
				}, 200);
			});
		}
	}

	return paste;
})();
muze.namespace('simply.editor.keepalive');

muze.require('muze');

simply.editor.keepalive = ( function() {
	var keepaliveTimer = null;
	var keepalive = {
		start : function() {
			this.keepaliveTimer = window.setInterval(this.keepalive, 30*60*1000);
		},
		stop : function() {
			clearInterval(this.keepaliveTimer);
		},
		keepalive : function() {
			var result = muze.load(objectURL + 'show.html', true, false);
		}
	}

	return keepalive;
})();
function vdOpenContextBar() {
	document.getElementById('vdContextBarClosed').style.display='none';
	vdContextBar=document.getElementById('vdContextBar');
	document.getElementById('vdContextBarOpen').style.display='block';
	document.getElementById('vdContextBar').style.height='100%';
	window_onresize();
}

function vdCloseContextBar() {
	vdContextBar=false;
	document.getElementById('vdContextBarClosed').style.display='block';
	document.getElementById('vdContextBarOpen').style.display='none';
	document.getElementById('vdContextBar').style.height='52px';
	window_onresize();
}

function vdGetProperty(input_id) {
	return simply.widgets.properties.get(input_id);
}
function vdSetProperty(input_id, value) {
	return simply.widgets.properties.set(input_id, value);
}
function vdEnableProperty(input_id) {
	return simply.widgets.properties.enable(input_id); // FIXME: this func supports vararg.
}

function vdDisableProperty(input_id) {
	return simply.widgets.properties.disable(input_id); // FIXME: this func supports vararg.
}

function vdPropertyIsEnabled(input_id) {
	return simply.widgets.properties.isEnabled(input_id); 
}	function vdDisableButton(id) {
		document.getElementById(id).style.backgroundPositionY = '-36px';
		document.getElementById(id).style.color = '#9A9A9A';
		document.getElementById(id).style.borderColor = '#D5D6D7';
		document.getElementById(id).style.cursor = 'default';
		document.getElementById(id).style.backgroundColor = 'transparent';
	}

	function vdEnableButton(id) {
		document.getElementById(id).style.backgroundPositionY = '0px';
		document.getElementById(id).style.color = '#000000';
		document.getElementById(id).style.borderColor = '#8F8F8F';
		document.getElementById(id).style.cursor = 'pointer';
		try {
			document.getElementById(id).style.backgroundColor = 'inherit';
		} catch (e) {
			document.getElementById(id).style.backgroundColor = '';
		}
	}

	function vdHideButton(id) {
		document.getElementById(id).style.display = 'none';
	}
	function vdShowButton(id) {
		document.getElementById(id).style.display = 'block';
	}
	function vdIsButtonHidden(id) {
		return (document.getElementById(id).style.display!='block');
	}
	function vdIsButtonEnabled(id) {
		return (document.getElementById(id).style.color!='#9A9A9A');
	}

	function vdPressButton(id) {
		if (vdIsButtonEnabled(id)) {
			document.getElementById(id).style.backgroundPositionY = '-18px';
		}
	}	

	function vdDePressButton(id) {
		if (vdIsButtonEnabled(id)) {
			document.getElementById(id).style.backgroundPositionY = '0px';
		}
	}
