var tag = "svg";
var self = require("self");
var pageMod = require("page-mod");
var baseWindow = require("windows").browserWindow;


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
    }
});

console.log("The add on is running.");