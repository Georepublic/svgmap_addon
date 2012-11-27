self.port.on("getElement", function() {
    var elements = $("svg");
    console.log(window.innerWidth);
    for (var i = 0; i < elements.length; i++) {
	//self.port.emit("gotElement", elements[i].width.baseVal.value);
	new SVGMapParser(elements[i], true);
    }
});

function SVGMapParser(element, isRoot)
{
    console.log("SVGMapParser");
    this.load(element, isRoot);
}

SVGMapParser.prototype = {
    load : function(element, isRoot) {
	console.log("load");
	this.rootDocument = element;
	this.mapx = 138;
	this.mapy = 37;
	this.zoomRatio = 1.41;
	this.mapCanvas = null;
	this.mapCanvasSize = null;
	this.rootViewPort = null;
	this.rootCrs = null;
	this.svgImages = new Array();
	this.svgImagesPath = new Array();
	this.svgImagesCRS = new Array();
	
	this.mapCanvasSize = this.canvasSize(this.rootDocument);
	this.createZoomButton(this.rootDocument);
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
    },

    createZoomButton : function(element) {
	var upButton = document.createElementNS("http://www.w3.org/2000/svg", "path");
	upButton.setAttribute("d", "M 0 4 L 4 0 L 8 4 L 6 4 L 6 8 L 2 8 L 2 4 z");
	upButton.setAttribute("stroke", "black");
	upButton.setAttribute("fill", "white");
	upButton.setAttribute("id", "zoomup");
	element.appendChild(upButton);
	upButton.addEventListener("click", this.zoomup, false);
	var downButton = document.createElementNS("http://www.w3.org/2000/svg", "path");
	downButton.setAttribute("d", "M 0 14 L 4 18 L 8 14 L 6 14 L 6 10 L 2 10 L 2 14 z");
	downButton.setAttribute("stroke", "black");
	downButton.setAttribute("fill", "white");
	downButton.setAttribute("id", "zoomdown");
	element.appendChild(downButton);
	downButton.addEventListener("click", this.zoomdown, false);
    },

    zoomup : function(event) {
	console.log("zoomup");
    },
    zoomdown : function(event) {
	console.log("zoomdown");
    },
};
