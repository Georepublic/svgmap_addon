var self = require("self");
var pageMod = require("page-mod");

pageMod.PageMod({
	include: ["*", "file://*"],
	contentScriptWhen: "ready",
	contentScriptFile: self.data.url("htmliframe.js")
});