/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var self = require("self");
var pageMod = require("page-mod");
const tabs = require("sdk/tabs");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
//const windowUtils = require("sdk/deprecated/window-utils");
const { getTabContentWindow, getActiveTab } = require("sdk/tabs/utils");

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
		worker.port.on("startPan", function() {
			console.log("startPan on main.js");
			//console.log(worker.tab.getThumbnail());
			var window = getActiveWindow();
			if (window) {
				let canvas = getCapturedCanvasForWindow(window);
				//console.log(canvas.toDataURL());
				worker.port.emit("gotCapturedDataURL", canvas.toDataURL());
			}
		});
		worker.port.on("endPan", function() {
			//console.log("endPan on main.js");
		});
		worker.port.on("processPan", function() {
			//console.log("processPan on main.js");
		});
	}
});

console.log("The add on is running.");

function getActiveWindow() {
	let browserWindow = getMostRecentBrowserWindow();
	//let browserWindow = windowUtils.activeBrowserWindow; // 同じ
	console.log(browserWindow);
	let tab = getActiveTab(browserWindow);
	//console.log(tab);
	let window = getTabContentWindow(tab);
	//console.log(window);
	//console.log(window.content);
	//console.log(window.content.document);

	return window;
}

function getCapturedCanvasForWindow(window) {
	let canvas = AppShellService.hiddenDOMWindow.document.createElementNS(NS_HTML, 'canvas');
	console.log(canvas);
	canvas.mozOpaque = true;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	let context = canvas.getContext("2d");
	context.drawWindow(window, 0, 0, window.innerWidth, window.innerHeight, COLOR);
	return canvas;
}
