<?php
	$json = file_get_contents("http://yvo.muze.nl/ariadne/loader.php/system/users/yvo/simply-store/data.json");
	$data = json_decode($json, true);

	if (isset($data[$_SERVER["REQUEST_URI"]])) {
		header("HTTP/1.1 200 OK");

		$template = "index.html";
		$pageTemplate = $data[$_SERVER["REQUEST_URI"]]['data-simply-page-template']['content'];
		if (file_exists($pageTemplate) && preg_match("/\.html$/", $pageTemplate)) {
			$template = $pageTemplate;
		}
		include($template);
	} else {
		header("HTTP/1.1 404 Not Found");
		echo "<h1>Page not found (error: 404)</h1>";
	}
?>
