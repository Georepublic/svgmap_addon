self.port.on("getElement", function() {
    var elements = $("svg");
    for (var i = 0; i < elements.length; i++) {
	self.port.emit("gotElement", i);
    }
});


