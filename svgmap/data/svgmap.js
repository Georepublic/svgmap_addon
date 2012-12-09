if (self.port) {
	// Firefox拡張機能からの呼び出し時
	self.port.on("getElement", function() {
		var elements = document.getElementsByTagName("svg");
		//console.log(window.innerWidth);
		for (var i = 0; i < elements.length; i++) {
			//self.port.emit("gotElement", elements[i].width.baseVal.value);
			new SVGMapObject(location.pathname, elements[i], null, null, null, null);
		}
	});
}

var NS_SVG = "http://www.w3.org/2000/svg";
var NS_XLINK = "http://www.w3.org/1999/xlink";

var STATUS_INITIALIZED = 0;
var STATUS_LOADING = 1;
var STATUS_LOADED = 2;
var STATUS_FAILED = 10;

function SVGMapImage(imgPath, imgElem, imgProps, parentElem)
{
	//console.log("SVGMapImage");
	this.initialize(imgPath, imgElem, imgProps, parentElem);
}

SVGMapImage.prototype = {
	initialize : function(imgPath, imgElem, imgProps, parentElem) {
		this.imgPath = imgPath;
		this.imgElem = imgElem;
		this.imgProps = imgProps;
		this.parentElem = parentElem;
	},
};

function SVGMapObject(docPath, svgElem, animProps, parentElem, parentCrs, rootParams)
{
	//console.log("SVGMapObject");
	this.initialize(docPath, svgElem, animProps, parentElem, parentCrs, rootParams);
}

SVGMapObject.prototype = {
	initialize : function(docPath, svgElem, animProps, parentElem, parentCrs, rootParams) {
		//console.log("initialize");
		//this.rootDocument = element;
		//this.mapx = 138;
		//this.mapy = 37;
		this.zoomRatio = 1.41;
		//this.mapCanvas = null;
		//this.mapCanvasSize = null;
		//this.rootViewPort = null;
		//this.rootCrs = null;
		//this.svgImages = new Array();
		//this.svgImagesPath = new Array();
		//this.svgImagesCRS = new Array();
		this.svgDoc = null;
		this.docPath = docPath;
		this.svgElem = svgElem;
		this.animProps = animProps;
		this.parentElem =  parentElem;
		this.parentCrs = parentCrs;
		this.rootParams = rootParams;
		this.svgObjects = new Array(); // animation要素リスト
		this.svgImages = new Array(); // image要素のリスト
		this.status = STATUS_INITIALIZED;
		this.panning = false;
		this.mouseX = 0;
		this.mouseY = 0;

		if (this.parentElem == null) {
			// ルート要素の場合
			this.svgDoc = document;
			this.status = STATUS_LOADED;
			this.crs = getCrs(this.svgElem);
			console.log("crs:", this.crs);
			if (this.crs == null) {
				// CRSがない場合はSVGMapでないので以降の処理を全てキャンセル
				return;
			}
			this.parentCrs = this.crs;
			this.rootParams = new Object();
			this.rootParams.rootCrs = this.crs;
			this.setPointerEvents();
			this.rootParams.mapCanvasSize = this.getCanvasSize(this.svgElem);
			//console.log("mapCanvasSize:", this.rootParams["mapCanvasSize"]);
			//this.createZoomButton(this.svgElem);
			var viewBox = getViewBox(this.svgElem);
			this.rootParams.rootViewPort = getRootViewPortFromRootSVG(viewBox, this.rootParams.mapCanvasSize);
			//console.log("rootViewPort:", this.rootParams.rootViewPort);
			this.updateRootViewBox();
			this.parseSVG(this.svgElem, false);
			this.dynamicLoad();
		} else {
			// インポートSVGの場合は読み込み指示があるまで待機
		}
	},
	
	setPointerEvents : function() {
		var that = this;
		this.svgElem.addEventListener("mousedown", function(evt) { return that.startPan(evt) }, false);
		this.svgElem.addEventListener("mouseup", function(evt) { that.endPan(evt) }, false);
		this.svgElem.addEventListener("mousemove", function(evt) { return that.processPan(evt) }, false);
		this.svgElem.addEventListener("resize", function(evt) { that.refreshWindowSize() }, false);
		this.svgElem.addEventListener("DOMMouseScroll", function(evt) { that.wheelZoom(evt) }, false);
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
	
	// <svg>要素のviewBox属性を更新
	updateRootViewBox : function() {
		var newViewBox = this.rootParams.rootViewPort.x.toString() + " "
								+ this.rootParams.rootViewPort.y.toString() + " "
								+ this.rootParams.rootViewPort.width.toString() + " "
								+ this.rootParams.rootViewPort.height.toString();
		this.svgElem.setAttribute("viewBox", newViewBox);
	},
	
	/*
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
		buttonGroup.appendChild(downButton);
		downButton.addEventListener("click", this.zoomdown, false);
		element.appendChild(buttonGroup);
	},
    */
    
	wheelZoom : function(evt) {
		//console.log("wheelZoom:" + evt.detail);
		if (evt.detail > 0) {
			this.zoomup();
		} else if (evt.detail < 0) {
			this.zoomdown();
		}
	},
    
	startPan : function(evt) {
		//console.log("startPan");
		this.panning = true;
		this.mouseX = evt.clientX;
		this.mouseY = evt.clientY;
		return false; // これは画像上のドラッグ動作処理を抑制するらしい
	},
	
	endPan : function(evt) {
		//console.log("endPan");
		this.panning = false;
		this.dynamicLoad();
	},
	
	processPan : function(evt) {
		if (this.panning) {
			//console.log("processPan");
			var difX = evt.clientX - this.mouseX;
			var difY = evt.clientY - this.mouseY;
			//console.log("dif:" + difX + "," + difY);
			this.shiftMap(difX , difY);
			this.mouseX += difX;
			this.mouseY += difY;
			return false;
		}
		return true;
	},
	
	shiftMap : function(x , y) {
		var s2c = getRootSvg2Canvas(this.rootParams.rootViewPort,
														this.rootParams.mapCanvasSize);
		this.rootParams.rootViewPort.x -= x / s2c.a;
		this.rootParams.rootViewPort.y -= y / s2c.d;
		this.updateRootViewBox();
	},
	
	zoom : function(pow) {
		var svgRootCenterX = this.rootParams.rootViewPort.x + 0.5 * this.rootParams.rootViewPort.width;
		var svgRootCenterY = this.rootParams.rootViewPort.y + 0.5 * this.rootParams.rootViewPort.height;
		
		this.rootParams.rootViewPort.width = this.rootParams.rootViewPort.width * pow;
		this.rootParams.rootViewPort.height = this.rootParams.rootViewPort.height * pow;
		
		this.rootParams.rootViewPort.x = svgRootCenterX - this.rootParams.rootViewPort.width / 2;
		this.rootParams.rootViewPort.y = svgRootCenterY - this.rootParams.rootViewPort.height / 2;
		
		this.updateRootViewBox();
		this.dynamicLoad();
	},
	
	zoomup : function(event) {
		//console.log("zoomup");
		this.zoom(1/this.zoomRatio);
	},
	
	zoomdown : function(event) {
		//console.log("zoomdown");
		this.zoom(this.zoomRatio);
	},

	refreshWindowSize : function() {
		//console.log("refreshViewPortSize()");
		var prevS2C = getRootSvg2Canvas(this.rootParams.rootViewPort , this.rootParams.mapCanvasSize)
		var pervCenterX = this.rootParams.rootViewPort.x + 0.5 * this.rootParams.rootViewPort.width;
		var pervCenterY = this.rootParams.rootViewPort.y + 0.5 * this.rootParams.rootViewPort.height;
		
		this.rootParams.mapCanvasSize = this.getCanvasSize(this.element);
		
		this.rootParams.rootViewPort.width  = this.rootParams.mapCanvasSize.width  / prevS2C.a;
		this.rootParams.rootViewPort.height = this.rootParams.mapCanvasSize.height / prevS2C.d;
		
		this.rootParams.rootViewPort.x = pervCenterX - 0.5 * this.rootParams.rootViewPort.width;
		this.rootParams.rootViewPort.y = pervCenterY - 0.5 * this.rootParams.rootViewPort.height;
		
		this.dynamicLoad();
	},
	
	dynamicLoad : function() {
		//console.log("dynamicLoad");
		
		var s2c = getRootSvg2Canvas(this.rootParams.rootViewPort, this.rootParams.mapCanvasSize);
		var zoom = getZoom(s2c);
		//console.log("S2C:", s2c);
		
		// image要素リストの動的ロード
		//console.log("svgImages.length:", this.svgImages.length);
		for (var i = 0; i < this.svgImages.length; i++) {
			var svgImage = this.svgImages[i];
			var inArea = isIntersect(svgImage.imgProps, this.rootParams.rootViewPort);
			var inZoom = inZoomRange(svgImage.imgProps, zoom);
			
			/*
			console.log("--  " + svgImage.imgProps.href);
			//console.log("imgProps:", svgImage.imgProps);
			console.log("zoom:", zoom);
			console.log("inArea:" + inArea);
			console.log("inZoom:" + inZoom);
			console.log("--");
			*/
			
			if (inArea && inZoom) {
				// ロードすべきイメージの場合
				if (!svgImage.parentElem.hasChildNodes()) {
					// 親にimage要素が追加されていない場合
					//console.log("appendChild:" + svgImage.imgProps.href);
					svgImage.parentElem.appendChild(svgImage.imgElem);
				}
			} else {
				// ロードすべきでないイメージの場合
				if (svgImage.parentElem.hasChildNodes()) {
					// 親にimage要素が追加済みの場合
					//console.log("removeChild:" + svgImage.imgProps.href);
					var imgElem = svgImage.parentElem.childNodes[0];
					svgImage.parentElem.removeChild(imgElem);
				}
			}
		}
		
		// animation要素リストの動的ロード
		//console.log("svgObjects.length:" + this.svgObjects.length);
		for (var i = 0; i < this.svgObjects.length; i++) {
			var svgObj = this.svgObjects[i];
			//console.log("svgObj:", svgObj);
			var inArea = isIntersect(this.svgObjects[i].animProps, this.rootParams.rootViewPort);
			var inZoom = inZoomRange(this.svgObjects[i].animProps, zoom);
			
			if (inArea && inZoom) {
				// ロードすべきインポートSVGの場合
				
				if (svgObj.status < STATUS_LOADING) {
					// ロードされていない場合
					//console.log("Loading:" + svgObj.docPath);
					loadSVG(svgObj);
				} else if (svgObj.status == STATUS_LOADED) {
					// ロードされている場合
					//console.log("Loaded:" + svgObj.docPath);
					svgObj.dynamicLoad();
				}
			} else {
				// ロードすべきでないインポートSVGの場合
				if (svgObj.status == STATUS_LOADED) {
					// ロードされている場合
					// 消す
					//console.log("Unloading:" + svgObj.docPath);
					this.unload(svgObj);
				}
			}
		}
	},
	
	// SVG文書のパースで、animation要素、image要素を
	// SVGMapObject, SVGMapImageとして読み込み、g要素に置換します。
	// (既存の動的ロード動作については、dynamicLoadメソッドに移行させます)
	parseSVG : function(svgElem , eraseAll) {
		//console.log(this.docPath);

		var svgNodes = svgElem.childNodes;
		//var crs = this.crs;
		var docDir = this.docPath.substring(0, this.docPath.lastIndexOf("/")+1);
		for (var i = 0; i < svgNodes.length; i++) {
			//console.log("node:" + i + "/" + svgNodes.length + " : " +svgNodes[i].nodeName);
			var svgNode = svgNodes[i];
			if (svgNode.nodeType != 1) {
				continue;
			}
			if (svgNode.nodeName == "image" || svgNode.nodeName == "animation") {
				// image||animation要素の場合
				
				var ip = getImageProps(svgNode); // x,y,w,h,href読み込み
				
				var imageRect = ip;
				if (this.parentElem == null) {
					imageRect = ip;
				} else {
					imageRect = child2rootSVGrect(ip, this.rootParams.rootCrs, this.crs);
					ip.x = imageRect.x;
					ip.y = imageRect.y;
					ip.width = imageRect.width;
					ip.height = imageRect.height;
				}
				
				var path;
				if (ip.href.indexOf("http://") == 0) {
					path = ip.href;
				} else {
					path = docDir + ip.href;
				}
				
				// g要素を生成
				var g = document.createElementNS(NS_SVG, "g");
				g.setAttribute("id", path);
				// image/animation要素をg要素に置換
				svgNode.parentNode.replaceChild(g, svgNode);
				
				// オブジェクトを生成し、連想配列として保持
				if (svgNode.nodeName == "animation") {
					this.svgObjects.push(new SVGMapObject(path, null, ip, g, this.crs, this.rootParams));
				} else {
					this.svgImages.push(new SVGMapImage(path, svgNode, ip, g));
				}
			} else if (svgNode.nodeName =="g") {
				// g要素の場合は、子要素を再帰パースする
				if (svgNode.hasChildNodes()) {
					this.parseSVG(svgNode, false);
				}
			}
		}
	},
	
	// 指定オブジェクト配下を再帰的にクリア
	unload : function(svgObj) {
		//console.log("unload");
		// image要素リストをクリア
		while (svgObj.svgImages.length > 0) {
			var svgImage = svgObj.svgImages.pop();
			if (svgImage.parentElem.hasChildNodes()) {
				svgImage.parentElem.removeChild(svgImage.imgElem);
			}
			svgImage = null;
		}
		// animation要素リストを子孫から順にクリア
		while (svgObj.svgObjects.length > 0) {
			var svgChildObj = svgObj.svgObjects.pop();
			this.unload(svgChildObj);
			svgChildObj = null;
		}
		// ルート要素のDOMツリーから削除
		if (svgObj.parentElem.hasChildNodes()) {
			var svgNodes = svgObj.parentElem.childNodes;
			for (var i = svgNodes.length - 1; i >= 0; i--) {
				svgObj.parentElem.removeChild(svgNodes[i]);
			}
		}
		// メンバオブジェクトをクリア
		svgObj.svgDoc = null;
		svgObj.svgElem = null;
		svgObj.svgObjects = new Array();
		svgObj.svgImages = new Array();
		svgObj.status = STATUS_INITIALIZED;
	}
};

function loadSVG(svgObj) {
	svgObj.status = STATUS_LOADING;
	var httpObj = createXMLHttpRequest(function() { handleResult(svgObj, this) } );
	if (httpObj) {
		//console.log("docPath:" + svgObj.docPath);
		httpObj.open("GET", svgObj.docPath, true);
		httpObj.send(null);
	}
}

function handleResult(svgObj, httpRes) {

	if (httpRes.readyState == 4) {
		if (httpRes.status == 200) {
			//console.log("called HandleResult path:" + svgObj.docPath);//
			//console.log("End loading");
			//var text = getAjaxFilter()(httpRes.responseText); // レスポンスの確認用です
			//console.log(text);
			if (httpRes.responseXML.documentElement) {
				svgObj.svgDoc = httpRes.responseXML;
			} else {
				svgObj.svgDoc = new DOMParser().parseFromString(httpRes.responseText, "text/xml");
			}
			svgObj.svgElem = svgObj.svgDoc.documentElement;
			svgObj.crs = getCrs(svgObj.svgElem);
			if (svgObj.crs == null) {
				// 地理座標変換パラメータがない場合=>親と同じにしておく
				svgObj.crs = svgObj.parentCrs;
			} else {
				if (svgObj.crs.a != svgObj.parentCrs.a
					|| svgObj.crs.b != svgObj.parentCrs.b
					|| svgObj.crs.c != svgObj.parentCrs.c
					|| svgObj.crs.d != svgObj.parentCrs.d
					|| svgObj.crs.e != svgObj.parentCrs.e
					|| svgObj.crs.f != svgObj.parentCrs.f) {
					// 地理座標変換パラメータが親と異なる場合
					var matrix = getMultiplyMatrix(svgObj.parentCrs, getInverseMatrix(svgObj.crs));
					// g要素のtransform属性を設定
					svgObj.parentElem.setAttribute("transform",
						"matrix("
						+ matrix.a + ","
						+ matrix.b + ","
						+ matrix.c + ","
						+ matrix.d + ","
						+ matrix.e + ","
						+ matrix.f + ")");
				}
			}
			
			// 範囲外のimage要素の不要なロードを避けるため、
			// 先にドキュメント内の要素を置換
			svgObj.parseSVG(svgObj.svgElem, false);
			
			// 子要素のクローンを追加
			var svgNodes = svgObj.svgElem.childNodes;
			for (var i = 0; i < svgNodes.length; i++) {
				var svgNode = svgNodes[i];
				if (svgNode.nodeType != 1) {
					continue;
				}
				if (svgNode.tagName == "metadata"
					|| svgNode.tagName.toLowerCase() == "globalcoordinatesystem") {
					continue;
				}
				
				svgObj.parentElem.appendChild(svgNode.cloneNode());
			}
			
			// クローンにより、親が参照できなくなってしまうので、
			// idを頼りに差し替え
			for (var i = 0; i < svgObj.svgImages.length; i++) {
				var svgImage = svgObj.svgImages[i];
				svgImage.parentElem = document.getElementById(svgImage.imgPath);
				//console.log("svgImage.parentElem:" + svgImage.parentElem);
			}
			for (var i = 0; i < svgObj.svgObjects.length; i++) {
				var svgChildObj = svgObj.svgObjects[i];
				svgChildObj.parentElem = document.getElementById(svgChildObj.docPath);
				//console.log("svgChildObj.parentElem:" + svgChildObj.parentElem);
			}
			
			svgObj.status = STATUS_LOADED;
			svgObj.dynamicLoad();
			//console.log("docPath:" + svgObj.docPath);
			//console.log("docText:" + httpRes.responseText);
		} else {
			svgObj.status = STATUS_FAILED;
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
		// tagNameは、HTMLDomでは小文字、SVGDomでは大小文字
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

// 行列の積を取得
function getMultiplyMatrix(matA, matB) {
	var a = matA.a * matB.a + matA.c * matB.b;
	var b = matA.b * matB.a + matA.d * matB.b;
	var c = matA.a * matB.c + matA.c * matB.d;
	var d = matA.b * matB.c + matA.d * matB.d;
	var e = matA.a * matB.e + matA.c * matB.f + matA.e;
	var f = matA.b * matB.e + matA.d * matB.f + matA.f;
	return {
		a : a,
		b : b,
		c : c,
		d : d,
		e : e,
		f : f
	}
}

function inZoomRange( ip , zoom ){
	if ( !ip.minZoom && !ip.maxZoom ){
		return ( true );
	} else {
		//console.log("EVAL ZOOM : zoom:" + zoom + " min:" + ip.minZoom + " max:" + ip.maxZoom);
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

function getImageProps(imgE) {
	var x = Number(imgE.getAttribute("x"));
	var y = Number(imgE.getAttribute("y"));
	var width = Number(imgE.getAttribute("width"));
	var height = Number(imgE.getAttribute("height"));
	var href = imgE.getAttribute("xlink:href");
	// visibleXXXZoom属性は、HTMLDomでは小文字、SVGDomでは大小文字
	var minZoom = 0;
	if (imgE.hasAttribute("visibleMinZoom")) {
		minZoom = Number(imgE.getAttribute("visibleMinZoom"))/100;
	} else if (imgE.hasAttribute("visibleminzoom")) {
		minZoom = Number(imgE.getAttribute("visibleminzoom"))/100;
	}
	var maxZoom = 0;
	if (imgE.hasAttribute("visibleMaxZoom")) {
		maxZoom = Number(imgE.getAttribute("visibleMaxZoom"))/100;
	} else if (imgE.hasAttribute("visiblemaxzoom")) {
		maxZoom = Number(imgE.getAttribute("visiblemaxzoom"))/100;
	}
	
	return {
		x : x,
		y : y,
		width : width,
		height : height,
		href : href,
		minZoom : minZoom,
		maxZoom : maxZoom
	}
}

function getAnimationElemByHref(svgElem, href) {
	var resElem = null;
	var svgNodes = svgElem.childNodes;
	for (var i = 0; i < svgNodes.length; i++) {
		var svgNode = svgNodes[i];
		if (svgNode.nodeType != 1) {
			continue;
		}
		if (svgNode.nodeName == "animation") {
			if (svgNode.getAttribute("xlink:href") == href) {
				resElem = svgNode;
				break;
			}
		} else if (svgNode.nodeName == "g") {
			resElem = getAnimationElemByHref(svgNode, href);
			if (resElem != null) {
				break;
			}
		}
	}
	return resElem;
}

// HTTP通信用、共通関数
function createXMLHttpRequest(cbFunc){
	//console.log("createXMLHttpRequest:" + cbFunc);
	var XMLhttpObject = null;
	try{
		XMLhttpObject = new XMLHttpRequest();
		//console.log("use standard ajax");//
	}catch(e){
		try{
			XMLhttpObject = new ActiveXObject("Msxml2.XMLHTTP");
			//console.log("use Msxml2 ajax");
		}catch(e){
			try{
				XMLhttpObject = new ActiveXObject("Microsoft.XMLHTTP");
				//console.log("use Microsoft ajax");
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
	//console.log( sec1 , sec2 );
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
