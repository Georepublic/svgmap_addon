const pageMods = require("page-mod");

pageMods.PageMod({
	include: "*",
	contentScript: 	'self.postMessage(window.location.href);' +
							'var targets = document.getElementsByTagName("h2");' +
							'alert("target elements count:" + targets.length.toString());' +
							'for (i = 0; i < targets.length; i++) {' +
							'	var dummy = document.createElement("div");' +
							' 	dummy.innerHTML = "*** REPLACED ***";' +
							'	targets[i].parentNode.replaceChild(dummy, targets[i]);' +
							'}',
	contentScriptWhen: "ready",
	onAttach: function(worker) {
		worker.on("message", function(data) {
			console.log(data);
		});
	}
});
