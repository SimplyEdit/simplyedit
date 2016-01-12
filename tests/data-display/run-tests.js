var page = require('webpage').create();
var url = 'http://localhost/tests/data-display/';

function setupCallbacks() {
	window.document.addEventListener('DOMContentLoaded', function() {
		// Setup Error Handling
		var qunit_error = window.onerror;

		window.onerror = function ( error, filePath, linerNr ) {
			qunit_error(error, filePath, linerNr);
			if (typeof window.callPhantom === 'function') {
				window.callPhantom({
					'name': 'Window.error',
					'error': error,
					'filePath': filePath,
					'linerNr': linerNr
				});
			}
		};

		var callback = function(name) {
			return function(details) {
				if (typeof window.callPhantom === 'function') {
					window.callPhantom({
						'name': 'QUnit.' + name,
						'details': details
					});
				}
			};
		};

		var i, callbacks = [
			'begin', 'done', 'log',
			'moduleStart', 'moduleDone',
			'testStart', 'testDone'
		];
		for (i=0; i<callbacks.length;i+=1) {
			QUnit[callbacks[i]](callback(callbacks[i]));
		}

	}, false);
}


// Route `console.log()` calls from within the Page context to the main Phantom context (i.e. current `this`)
page.onConsoleMessage = function(msg) {
	console.log(msg);
};

page.onInitialized = function() {
	page.evaluate(setupCallbacks);
};

page.onError = function(msg, trace) {
	console.error(color('error message', msg));
	trace.forEach(function(item) {
		console.error(color('error stack', '  ' + item.file + ':' + item.line));
	});
	console.error('');
	phantom.exit(1);
};

page.open(url, function (status) {
	//Page is loaded!
	var testsDone = function() {
		console.log("checking if tests are done");
		var result = page.evaluate(function() {
			if (document.querySelector("#qunit-testresult")) {
				return true;
			}
		});

		if (result) {
			var passed = page.evaluate(function() {
				return document.querySelectorAll("#qunit-banner.qunit-pass");
			});

			if (passed.length === 0) {
				var status = page.evaluate(function() {
					return document.querySelector("#qunit-testresult").innerText;
				});
				console.log(status);
			} else {
				console.log("OK");
			}
			phantom.exit();
		} else {
			setTimeout(testsDone, 200);
		}
	};
	testsDone();
});

