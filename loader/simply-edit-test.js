var scriptTag = document.querySelector("[data-api-key]");
var src = scriptTag.src.replace("simply-edit.js", scriptTag.getAttribute("data-api-key") + "/js/simply-edit.js");
document.write('<script src="'+src+'" id="SimplyEditScript"></'+'script>';
