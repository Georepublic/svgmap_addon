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
		contentScriptWhen: "ready",
		contentScriptFile: [
		self.data.url("svgmap.js")
	],
	onAttach: function(worker) {
		worker.port.emit("getElement");
		worker.port.on("gotElement", function(elementContent) {
			console.log(elementContent);
		});
		worker.port.on("getCapturedDataURL", function(idx, x, y, width, height, isSP) {
			//console.log("getCapturedDataURL - x:" + x + ", y:" + y + ", width:" + width + ", height:" + height);
			//console.log(worker.tab.getThumbnail());
			//console.log(Date.now() + "\tMainProgram - getCapturedDataURL in");
			var window = getSelectedTabContentWindow();
			if (window) {
				//console.log(Date.now() + "\tMainProgram - getCapturedDataURL - before getCapturedCanvasForWindow");
				let canvas = getCapturedCanvasForWindow(window, x, y, width, height, isSP);
				//console.log(Date.now() + "\tMainProgram - getCapturedDataURL - after getCapturedCanvasForWindow");
				//console.log(canvas.toDataURL());
				worker.port.emit("gotCapturedDataURL", idx, canvas.toDataURL());
			}
			//console.log(Date.now() + "\tMainProgram - getCapturedDataURL out");
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

function getCapturedCanvasForWindow(window, x, y, width, height, isSP) {
	//console.log("getCapturedCanvasForWindow - x:" + x + ", y:" + y + ", width:" + width + ", height" + height);
	let canvas = AppShellService.hiddenDOMWindow.document.createElementNS(NS_HTML, 'canvas');
	//console.log(canvas);
	canvas.mozOpaque = true;
	var scale = 1.0;
	
	if (isSP && width > 480) {
		scale = 0.5;
	}
	canvas.width = width * scale;
	canvas.height = height * scale;
	let context = canvas.getContext("2d");
	context.scale(scale, scale);
	//console.log(context);
	//console.log("width:" + canvas.width + ", height:" + canvas.height);
	context.drawWindow(window, x, y, width, height, COLOR);
	//console.log("drawWindow completed");
	return canvas;
}
