/*
self.port.on("getElement", function() {
    var elements = document.getElementsByTagName("svg");
    console.log(window.innerWidth);
    for (var i = 0; i < elements.length; i++) {
	//self.port.emit("gotElement", elements[i].width.baseVal.value);
	new SVGMapObject(location.pathname, elements[i], null, null);
    }
});
*/

var NS_SVG = "http://www.w3.org/2000/svg";
var NS_XLINK = "http://www.w3.org/1999/xlink";

var STATUS_FAILED = -1;
var STATUS_INITIALIZED = 0;
var STATUS_LOADING = 1;
var STATUS_LOADED = 2;

function SVGMapObject(docPath, svgElem, parentElem, rootObj)
{
    console.log("SVGMapObject");
    this.initialize(docPath, svgElem, parentElem, rootObj);
}

SVGMapObject.prototype = {
	initialize : function(docPath, svgElem, parentElem, rootObj) {
		console.log("initialize");
		//this.rootDocument = element;
		//this.mapx = 138;
		//this.mapy = 37;
		//this.zoomRatio = 1.41;
		//this.mapCanvas = null;
		this.mapCanvasSize = null;
		this.rootViewPort = null;
		this.rootCrs = null;
		//this.svgImages = new Array();
		//this.svgImagesPath = new Array();
		//this.svgImagesCRS = new Array();
		this.svgDoc = null;
		this.docPath = docPath;
		this.svgElem = svgElem;
		this.parentElem =  parentElem;
		this.rootObj = rootObj;
		this.svgObjects = new Object(); // 連想配列(key:path, value:SVGMapParser)
		this.status = STATUS_INITIALIZED;

		if (this.parentElem == null) {
			// ルート要素の場合
			this.svgDoc = document;
			this.rootObj = this;
			this.status = STATUS_LOADED
			this.crs = getCrs(this.svgElem);
			console.log("crs:", this.crs);
			if (this.crs == null) {
				// CRSがない場合はSVGMapでないので以降の処理を全てキャンセル
				return;
			}
			console.log("crs:", this.crs);
			this.rootCrs = this.crs;
			this.mapCanvasSize = this.getCanvasSize(this.svgElem);
			console.log("mapCanvasSize:", this.mapCanvasSize);
			this.createZoomButton(this.svgElem);
			var viewBox = getViewBox(this.svgElem);
			this.rootViewPort = getRootViewPortFromRootSVG( viewBox , this.mapCanvasSize );
			console.log("rootViewPort:", this.rootViewPort);
			//this.loadElement(element, docId, docPath);
			this.parseSVG(this.svgElem, false);
		} else {
			// インポートSVGの場合
			this.mapCanvasSize = rootObj.mapCanvasSize;
			this.rootViewPort = rootObj.rootViewPort;
			this.rootCrs = rootObj.rootCrs;
			loadSVG(this);
		}
		
		console.log("svgDoc:" + this.svgDoc);
		console.log("docPath:" + this.docPath);
		console.log("svgElem:" + this.svgElem);
		console.log("parentElem:" + this.parentElem);
		console.log("rootObj:" + this.rootObj);
	},

	loadElement : function(element, docId, docPath) {
		console.log("loadElement");
	},

	getCanvasSize : function(element) {
		//console.log("canvasSize");
		var w = element.width.baseVal.value;
		var h = element.height.baseVal.value;
		if (!w || [w == 1 && h == 1]) {
			w = window.innerWidth;
			h = window.innerHeight;
		}
		//console.log("w = " + w);
		//console.log("h = " + h);
		return {
			width: w,
			height: h
		}
	},

    createZoomButton : function(element) {
	var buttonGroup = document.createElementNS(NS_SVG, "g");
	var upButton = document.createElementNS(NS_SVG, "path");
	upButton.setAttribute("d", "M 0 4 L 4 0 L 8 4 L 6 4 L 6 8 L 2 8 L 2 4 z");
	upButton.setAttribute("stroke", "black");
	upButton.setAttribute("fill", "white");
	upButton.setAttribute("id", "zoomup");
	buttonGroup.appendChild(upButton);
	upButton.addEventListener("click", this.zoomup, false);
	var downButton = document.createElementNS(NS_SVG, "path");
	downButton.setAttribute("d", "M 0 14 L 4 18 L 8 14 L 6 14 L 6 10 L 2 10 L 2 14 z");
	downButton.setAttribute("stroke", "black");
	downButton.setAttribute("fill", "white");
	downButton.setAttribute("id", "zoomdown");
	element.appendChild(downButton);
	buttonGroup.addEventListener("click", this.zoomdown, false);
	element.appendChild(buttonGroup);
    },

    zoomup : function(event) {
	console.log("zoomup");
    },
    zoomdown : function(event) {
	console.log("zoomdown");
    },

	refreshWindowSize : function() {
		console.log("refreshViewPortSize()");//
		var prevS2C = getRootSvg2Canvas(this.rootViewPort , this.mapCanvasSize)
		var pervCenterX = this.rootViewPort.x + 0.5 * this.rootViewPort.width;
		var pervCenterY = this.rootViewPort.y + 0.5 * this.rootViewPort.height;
		
		this.mapCanvasSize = this.getCanvasSize(this.element);
		
		this.rootViewPort.width  = this.mapCanvasSize.width  / prevS2C.a;
		this.rootViewPort.height = this.mapCanvasSize.height / prevS2C.d;
		
		this.rootViewPort.x = pervCenterX - 0.5 * this.rootViewPort.width;
		this.rootViewPort.y = pervCenterY - 0.5 * this.rootViewPort.height;
		dynamicLoad( "root", mapCanvas);
	},
	
	parseSVG : function(svgElem , eraseAll) {
		var s2c = getRootSvg2Canvas(this.rootViewPort, this.mapCanvasSize);
		var zoom = getZoom(s2c);
		console.log("S2C.a:" + s2c.a + " S2C.d:" + s2c.d);//
		console.log(this.parentElem);//
		// svgElemは(初回は)svg文書のルート要素 , docPathはこのSVG文書のパス eraseAll==trueで対応要素を無条件消去	
		
		console.log(this.docPath);//
		var svgNodes = svgElem.childNodes;
		//var crs = this.crs;
		var docDir = this.docPath.substring(0, this.docPath.lastIndexOf("/")+1);
		for (var i = 0; i < svgNodes.length; i++) {
			//console.log("node:" + i + "/" + svgNodes.length + " : " +svgNodes[i].nodeName);
			var svgNode = svgNodes[i];
			if (svgNode.nodeType != 1) {
				continue;
			}
			if (svgNode.nodeName == "animation") {
				// animation要素の場合
				
				var ip = getAnimationProps(svgNode); // x,y,w,h,href読み込み
				
				var imageRect = ip;
				if (this.parentElem == null) {
					imageRect = ip;
				} else {
					imageRect = child2rootSVGrect(ip, this.rootCrs, this.crs);
				}
				
				console.log("--  " + this.docPath);
				console.log(ip);
				console.log(imageRect);
				console.log("--");
				
				var path = docDir + ip.href;
				var svgObj = this.svgObjects[path];

				if (!eraseAll && isIntersect(imageRect, this.rootViewPort)
					&& inZoomRange(ip, zoom)) {
					// ロードすべきイメージの場合
					
					var imgBox = getTransformedBox( imageRect , s2c );
					
					if (svgObj == null) { 
						// ロードされていないとき
						console.log("docPath:" + this.docPath + " docDir:" + docDir + " href:" + ip.href);
						console.log("load:"+ip.href);
						// g要素を生成し、animation要素の前に挿入
						var g = this.svgDoc.createElementNS(NS_SVG, "g");
						g.setAttribute("id", path);
						svgNode.parentNode.insertBefore(g, svgNode);
						// オブジェクト作成と同時にロード
						this.svgObjects[path] = new SVGMapObject(path, null, g, this.rootObj);
					} else if (svgObj.status == STATUS_LOADED) {
						// ロードされているとき
						console.log("AlreadyLoaded:" + path);
						svgObj.parseSVG(svgObj.svgElem, false);
					}
				} else {
					// ロードすべきでないイメージの場合
					if (svgObj) {
						// ロードされているとき
						// TODO:
						/*
						// 消す
	//					console.log("Remove id:" + imageId);
	//					console.log(parentElem);
	//					console.log(imgElem);
						parentElem.removeChild(imgElem);
						if ( animationChild ){ // animation要素の場合
	//						parseSVG(svgImages[imageId].documentElement , svgImages[imageId].docPath ,  true ); // 子文書の画像の明示的な全消去を実施
							svgImages[imageId] = null; // svgImages(svg子コンテナ文書)の連想配列を消去する　子・孫SVGdocumentの消去ができていない気がする・・・(2012/04/24)
						}
						*/
					}
				}
			} else if (svgNode.nodeName =="g") {
				for (var svgObj in this.svgObjects) {
					if (svgNode == svgObj.parentElem) {
						// 自分で追加したものの場合はスキップ
						continue;
					}
				}
				// g要素の場合は、子要素を再帰パースする
				if (svgNode.hasChildNodes) {
					this.parseSVG( svgNode , false );
				}
			}
		}
	},
};

function loadSVG(svgObj) {
	svgObj.status = STATUS_LOADING;
	var httpObj = createXMLHttpRequest(function() { handleResult(svgObj, this) } );
	if (httpObj) {
		console.log("docPath:" + svgObj.docPath);//
		httpObj.open("GET", svgObj.docPath, true);
		httpObj.send(null);
	}
}

function handleResult(svgObj, httpRes) {

	if (httpRes.readyState == 4) {
		if (httpRes.status == 200) {
			console.log("called HandleResult path:" + svgObj.docPath);//
			console.log("End loading");
			//var text = getAjaxFilter()(httpRes.responseText); // レスポンスの確認用です
			//console.log(text);
			if (httpRes.responseXML.documentElement) {
				svgObj.svgDoc = httpRes.responseXML;
			} else {
				svgObj.svgDoc = new DOMParser().parseFromString(httpRes.responseText, "image/svg+xml");
			}
			svgObj.svgElem = svgObj.svgDoc.documentElement;
			svgObj.crs = getCrs(svgObj.svgElem);
			if (svgObj.crs == null) {
				// ルートと同じにしておく
				svgObj.crs = svgObj.rootCrs;
			}
			svgObj.state = STATUS_LOADED;
			//console.log("docPath:" + svgObj.docPath);
			//console.log("docText:" + httpRes.responseText);
			svgObj.parseSVG(svgObj.svgElem, false);
		} else {
			svgObj.state = STATUS_FAILED;
		}
	}
}
	
function getRootViewPortFromRootSVG( viewBox , mapCanvasSize_ ){
	var rVPx , rVPy , rVPwidth , rVPheight;
	if(viewBox){
		if ( mapCanvasSize_.height / mapCanvasSize_.width > viewBox.height / viewBox.width ){
			//キャンバスよりもviewBoxが横長の場合・・横をviewPortに充てる
			rVPwidth = viewBox.width;
			rVPheight = viewBox.width * mapCanvasSize_.height / mapCanvasSize_.width;
			rVPx = viewBox.x;
			rVPy = viewBox.y + viewBox.height / 2.0 - rVPheight / 2.0;
		} else {
			rVPheight = viewBox.height;
			rVPwidth = viewBox.height * mapCanvasSize_.width / mapCanvasSize_.height;
			rVPy = viewBox.y;
			rVPx = viewBox.x + viewBox.width / 2.0 - rVPwidth / 2.0;
		}
		
	} else {
		rVPx = 0;
		rVPy = 0;
		rVPwidth = mapCanvasSize_.width;
		rVPheight = mapCanvasSize_.height;
	}
	
	return {
		x : rVPx,
		y : rVPy,
		width : rVPwidth,
		height : rVPheight
	}
}

function getRootSvg2Canvas( rootViewPort , mapCanvasSize_ ){
	var s2cA , s2cD , s2cE , s2cF;
	
	s2cA = mapCanvasSize_.width / rootViewPort.width;
	s2cD = mapCanvasSize_.height / rootViewPort.height;
	
	s2cE = - s2cA * rootViewPort.x;
	s2cF = - s2cD * rootViewPort.y;
	
	return{
		a : s2cA,
		b : 0,
		c : 0,
		d : s2cD,
		e : s2cE,
		f : s2cF
	}
}

function getCrs(svgElem) {
	var crs;
	for (var i = 0; i < svgElem.childNodes.length; i++) {
		var node = svgElem.childNodes[i];
		if (node.nodeType == 1 && node.tagName.toLowerCase() == "globalcoordinatesystem") {
			crs = node.getAttribute("transform").replace("matrix(","").replace(")","").split(",");
			break;
		}
	}
	if (crs) {
		return {
			a : Number(crs[0]),
			b : Number(crs[1]),
			c : Number(crs[2]),
			d : Number(crs[3]),
			e : Number(crs[4]),
			f : Number(crs[5])
		};
	} else {
		return null;
	}
}

function getViewBox( svgElem ){
	var vb;
	if (svgElem.hasAttribute("viewBox")) {
		vb = svgElem.getAttribute("viewBox").split(" ");
		if(vb.length !=4){
			vb = svgElem.getAttribute("viewBox").split(",");
		}
	}
	//console.log("viewBox:" , vb[0]+ "," +vb[1]+ "," +vb[2]+ "," +vb[3]);
	return {
		x : Number(vb[0]),
		y : Number(vb[1]),
		width : Number(vb[2]),
		height : Number(vb[3])
	}
}

function getTransformedBox( inBox , matrix ){
	// b,c==0のときのみの簡易関数・・
	if ( matrix.b == 0 && matrix.c == 0){
		var x , y , w , h;
		if ( matrix.a > 0 ){
			x = matrix.a * inBox.x + matrix.e;
			w = matrix.a * inBox.width;
		} else {
			x = matrix.a * (inBox.x + inBox.width) + matrix.e;
			w = - matrix.a * inBox.width;
		}
		
		if ( matrix.d > 0 ){
			y = matrix.d * inBox.y + matrix.f;
			h = matrix.d * inBox.height;
		} else {
			y = matrix.d * (inBox.y + inBox.height) + matrix.f;
			h = - matrix.d * inBox.height;
		}
		
		return {
			x : x ,
			y : y ,
			width : w ,
			height : h
		}
	} else {
		return ( null );
	}
}

function Geo2SVG( lat , lng , crs ){
	return {
		x : crs.a * lng + crs.c * lat + crs.e ,
		y : crs.b * lng + crs.d * lat + crs.f
	}
}

function SVG2Geo( svgX , svgY , crs ){
	var iCrs = getInverseMatrix(crs);
	if ( iCrs ){
		return {
			lng : iCrs.a * svgX + iCrs.c * svgY + iCrs.e ,
			lat : iCrs.b * svgX + iCrs.d * svgY + iCrs.f
		}
	} else {
		return ( null );
	}
}

function child2rootSVG( x , y , rootCrs , childCrs ){
	var geoPos = SVG2Geo( x , y , childCrs);
	var rootSvgPos = Geo2SVG( geoPos.lat , geoPos.lng , rootCrs );
	return {
		x : rootSvgPos.x ,
		y : rootSvgPos.y
	}
	
}

function child2rootSVGrect( rect ,  rootCrs , childCrs ){
	var pos1 = child2rootSVG( rect.x , rect.y , rootCrs , childCrs );
	var pos2 = child2rootSVG( rect.x + rect.width , rect.y + rect.height , rootCrs , childCrs );
	var x , y , width , height;
	if ( pos1.x > pos2.x ){
		x = pos2.x;
		width = pos1.x - pos2.x;
	} else {
		x = pos1.x;
		width = pos2.x - pos1.x;
	}
	if ( pos1.y > pos2.y ){
		y = pos2.y;
		height = pos1.y - pos2.y;
	} else {
		y = pos1.y;
		height = pos2.y - pos1.y;
	}
	
	return {
		x : x ,
		y : y ,
		width : width ,
		height : height
	}
}

function getInverseMatrix( matrix ){
	var det = matrix.a * matrix.d - matrix.b * matrix.c;
	if ( det != 0 ){
		return{
			a :  matrix.d / det ,
			b : -matrix.b / det ,
			c : -matrix.c / det ,
			d :  matrix.a / det ,
			e : (- matrix.d * matrix.e + matrix.c * matrix.f )/ det ,
			f : (  matrix.b * matrix.e - matrix.a * matrix.f )/ det
		}
	} else {
		return ( null );
	}
}

function inZoomRange( ip , zoom ){
	if ( !ip.minZoom && !ip.maxZoom ){
		return ( true );
	} else {
		console.log("EVAL ZOOM : zoom:" + zoom + " min:" + ip.minZoom + " max:" + ip.maxZoom);
		if ( ip.minZoom && zoom < ip.minZoom ){
			return(false);
		}
		if ( ip.maxZoom && zoom > ip.maxZoom ){
			return(false);
		}
	}
	return ( true );
}

// まだrootSVGにのみ対応している・・
function getZoom( s2c ){
		return ( ( Math.abs(s2c.a) + Math.abs(s2c.d) ) / 2.0 );
}

function getAnimationProps( animE ){
	var x = Number(animE.getAttribute("x"));
	var y = Number(animE.getAttribute("y"));
	var width = Number(animE.getAttribute("width"));
	var height = Number(animE.getAttribute("height"));
	var href = animE.getAttribute("xlink:href");
	var minZoom = Number(animE.getAttribute("visibleMinZoom"))/100;
	var maxZoom = Number(animE.getAttribute("visibleMaxZoom"))/100;
	
	return {
		x : x ,
		y : y ,
		width : width ,
		height : height ,
		href : href ,
		minZoom : minZoom ,
		maxZoom : maxZoom
	}
}

// HTTP通信用、共通関数
function createXMLHttpRequest(cbFunc){
	console.log("createXMLHttpRequest:" + cbFunc);//
	var XMLhttpObject = null;
	try{
		XMLhttpObject = new XMLHttpRequest();
		console.log("use standard ajax");//
	}catch(e){
		try{
			XMLhttpObject = new ActiveXObject("Msxml2.XMLHTTP");
//			console.log("use Msxml2 ajax");
		}catch(e){
			try{
				XMLhttpObject = new ActiveXObject("Microsoft.XMLHTTP");
//				console.log("use Microsoft ajax");
			}catch(e){
				return null;
			}
		}
	}
	if (XMLhttpObject) XMLhttpObject.onreadystatechange = cbFunc;
	return XMLhttpObject;
}

function getAjaxFilter() {
	if (navigator.appVersion.indexOf("KHTML") > -1) {
		return function(t) {
			var esc = escape(t);
			return (esc.indexOf("%u") < 0 && esc.indexOf("%") > -1) ? decodeURIComponent(esc) : t
		}
	} else {
		return function(t) {
			return t
		}
	}
}

function isIntersect( sec1 , sec2 ){
	console.log( sec1 , sec2 );
	var ans = false;
	if ( sec1.x > sec2.x + sec2.width || sec2.x > sec1.x + sec1.width 
	 || sec1.y > sec2.y + sec2.height || sec2.y > sec1.y + sec1.height ){
		return ( false );
	} else {
		return ( true );
	}
}

function getBBox( x , y , width , height ){
	return {
		x: x,
		y: y,
		width: width,
		height: height
	}
}
