var page = require('webpage').create();
var url = 'http://localhost/tests/data-display/';
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

