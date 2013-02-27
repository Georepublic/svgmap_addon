/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var self = require("self");
var pageMod = require("page-mod");
const tabs = require("sdk/tabs");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { getTabContentWindow, getSelectedTab } = require("sdk/tabs/utils");

const { Cc, Ci } = require("chrome");
const AppShellService = Cc["@mozilla.org/appshell/appShellService;1"].getService(Ci.nsIAppShellService);
const NS_HTML = "http://www.w3.org/1999/xhtml";
const COLOR = "rgb(255,255,255)";

pageMod.PageMod({
		include: ["*", "file://*"],
		contentScriptWhen: "end",
		contentScriptFile: [
		self.data.url("svgmap.js")
	],
	onAttach: function(worker) {
		worker.port.emit("getElement");
		worker.port.on("gotElement", function(elementContent) {
			console.log(elementContent);
		});
		worker.port.on("getCapturedDataURL", function() {
			//console.log(worker.tab.getThumbnail());
			var window = getSelectedTabContentWindow();
			if (window) {
				let canvas = getCapturedCanvasForWindow(window);
				//console.log(canvas.toDataURL());
				worker.port.emit("gotCapturedDataURL", canvas.toDataURL());
			}
		});
	}
});

console.log("The add on is running.");

function getSelectedTabContentWindow() {
	//console.log("getSelectedTabContentWindow");
	let browserWindow = getMostRecentBrowserWindow();
	//console.log(browserWindow);
	//console.log("getSelectedTab");
	let tab = getSelectedTab(browserWindow);
	//console.log(tab);
	//console.log("getTabContentWindow");
	let window = getTabContentWindow(tab);
	//console.log(window);
	//console.log(window.content);
	//console.log(window.content.document);

	return window;
}

function getCapturedCanvasForWindow(window) {
	//console.log("getCapturedCanvasForWindow");
	let canvas = AppShellService.hiddenDOMWindow.document.createElementNS(NS_HTML, 'canvas');
	//console.log(canvas);
	canvas.mozOpaque = true;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	let context = canvas.getContext("2d");
	//console.log(context);
	//console.log("width:" + canvas.width.toString() + ", height:" + canvas.height.toString());
	context.drawWindow(window, 0, 0, window.innerWidth, window.innerHeight, COLOR);
	//console.log("drawWindow completed");
	return canvas;
}
