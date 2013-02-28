console.log("applied htmlframe.js");
if (document.documentElement) {
	document.documentElement.setAttribute("display", "none");
}
document.addEventListener("DOMContentLoaded", function(evt) { onInit(); }, false);
document.addEventListener("click", function(evt) { onClick(); }, false);
window.addEventListener("load", function(evt) { console.log("window loaded - width:" + window.innerWidth + ", height:" + window.innerHeight); }, false);
window.addEventListener("resize", function(evt) { console.log("window resized - width:" + window.innerWidth + ", height:" + window.innerHeight); }, false);

function onInit() {
	replaceTagName("iframe", "g");
	logGCS(document);
	
	if (window.parent != window) {
		console.log("parent exists");
		logGCS(window.parent.document);
	}
}

function onClick() {
	if (document.documentElement) {
		document.documentElement.setAttribute("display", "block");
	}
	replaceTagName("g", "iframe");
}

function replaceTagName(fromName, toName) {
	var fromNodes = document.getElementsByTagName(fromName);
	for (var i = 0; i < fromNodes.length; i++) {
		var fromNode = fromNodes[i];
		var toNode = document.createElement(toName);
		if (fromNode.hasAttributes()) {
			for (var j = 0; j < fromNode.attributes.length; j++) {
				var attribute = fromNode.attributes[j];
				toNode.setAttribute(attribute.name, attribute.value);
			}
		}
		fromNode.parentNode.replaceChild(toNode, fromNode);
	}
}

function logGCS(doc) {
	var gcss = doc.getElementsByTagName("globalCoordinateSystem");
	if (gcss.length > 0) {
		var tr = gcss[0].getAttribute("transform");
		console.log(tr);
	}
}