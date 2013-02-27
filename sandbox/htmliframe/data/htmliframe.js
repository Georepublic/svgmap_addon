console.log("applied htmlframe.js");
replaceTagName("iframe", "g");
document.addEventListener("click", function(evt) { replaceTagName("g", "iframe"); }, false);

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