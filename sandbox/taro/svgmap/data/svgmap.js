self.port.on("getElement", function() {
    var elements = $("svg");
    console.log(window.innerWidth);
    for (var i = 0; i < elements.length; i++) {
	//self.port.emit("gotElement", elements[i].width.baseVal.value);
	new SVGMapParser(elements[i]);
    }
});

function SVGMapParser(element)
{
    console.log("SVGMapParser");
    this.load(element);
}

SVGMapParser.prototype = {
    load : function(element) {
	console.log("load");
	this.rootDocument = element;
	this.mapx = 138;
	this.mapy = 37;
	this.mapCanvas = null;
	this.mapCanvasSize = null;
	this.rootViewPort = null;
	this.rootCrs = null;
	this.svgImages = new Array();
	this.svgImagesPath = new Array();
	this.svgImagesCRS = new Array();
	
	this.mapCanvasSize = this.canvasSize(this.rootDocument);

	var docId = "root";
	var docPath = "/";
	this.loadElement(element, docId, docPath);
    },

    loadElement : function(element, docId, docPath) {
	console.log("loadElement");
    },

    canvasSize : function(element) {
	console.log("canvasSize");
	var w = element.width.baseVal.value;
	var h = element.height.baseVal.value;
	if (!w || [w == 1 && h == 1]) {
	    w = window.innerWidth;
	    h = window.innerHeight;
	}
	console.log("w = " + w);
	console.log("h = " + h);
	return {
	    width: w,
	    height: h
	}
    }
};
