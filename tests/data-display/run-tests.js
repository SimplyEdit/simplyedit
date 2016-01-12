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
        if (status !== 'success') {
            console.error('Unable to access network: ' + status);
            phantom.exit(1);
        } else {
            // Cannot do this verification with the 'DOMContentLoaded' handler because it
            // will be too late to attach it if a page does not have any script tags.
            var qunitMissing = page.evaluate(function() { return (typeof QUnit === 'undefined' || !QUnit); });
            if (qunitMissing) {
                console.error('The `QUnit` object is not present on this page.');
                phantom.exit(1);
            }
        }
});

