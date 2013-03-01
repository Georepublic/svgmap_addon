"use strict";

var self = require("self");
var pageMod = require("page-mod");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { getTabContentWindow, getSelectedTab } = require("sdk/tabs/utils");

const { Cc, Ci } = require("chrome");
const AppShellService = Cc["@mozilla.org/appshell/appShellService;1"].getService(Ci.nsIAppShellService);
const NS_HTML = "http://www.w3.org/1999/xhtml";
const COLOR = "rgb(255,255,255)";

pageMod.PageMod({
	include: ["*", "file://*"],
	contentScriptWhen: "end",
	contentScript:	'self.port.on("gotCapturedDataURL", function(dataURL) {'
						+ '	console.log("gotCapturedDataURL - in");'
						+ '	var img = new Image();'
						+ '	img.width = window.innerWidth / 4;'
						+ '	img.height = window.innerWidth / 4;'
						+ '	img.border = 2;'
						+ '	img.src = dataURL;'
						+ '	document.body.insertBefore(img, document.body.firstChild);'
						+ '	console.log("gotCapturedDataURL - out");'
						+ '});'
						+ 'document.addEventListener("click", function(evt) {'
						+ '	self.port.emit("getCapturedDataURL", 0, 0, window.innerWidth / 4, window.innerHeight / 4);'
						+ '});',
	onAttach: function(worker) {
		worker.port.on("getCapturedDataURL", function(x, y, width, height) {
			var window = getSelectedTabContentWindow();
			if (window) {
				let canvas = getCapturedCanvasForWindow(window, x, y, width, height);
				console.log("gotCapturedDataURL - before");
				worker.port.emit("gotCapturedDataURL", canvas.toDataURL());
				console.log("gotCapturedDataURL - after");
			}
		});
	}
});

console.log("The add on is running.");

function getSelectedTabContentWindow() {
	let browserWindow = getMostRecentBrowserWindow();
	let tab = getSelectedTab(browserWindow);
	let window = getTabContentWindow(tab);
	return window;
}

function getCapturedCanvasForWindow(window, x, y, width, height) {
	let canvas = AppShellService.hiddenDOMWindow.document.createElementNS(NS_HTML, 'canvas');
	canvas.mozOpaque = true;
	canvas.width = width;
	canvas.height = height;
	let context = canvas.getContext("2d");
	console.log("drawWindow - before");
	context.drawWindow(window, x, y, width, height, COLOR);
	console.log("drawWindow - after");
	return canvas;
}
