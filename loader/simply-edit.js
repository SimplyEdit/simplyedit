var scriptTag = document.querySelector("[data-api-key]");
var newTag = document.createElement("SCRIPT");
newTag.id  = 'SimplyEditScript';
newTag.src = scriptTag.src.replace("simply-edit.js", scriptTag.getAttribute("data-api-key") + "/js/simply-edit.js");
document.head.appendChild(newTag);

