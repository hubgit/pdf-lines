// optimised CSS custom property getter/setter
var CustomStyle = (function CustomStyleClosure() {

  // As noted on: http://www.zachstronaut.com/posts/2009/02/17/
  //              animate-css-transforms-firefox-webkit.html
  // in some versions of IE9 it is critical that ms appear in this list
  // before Moz
  var prefixes = ['ms', 'Moz', 'Webkit', 'O'];
  var _cache = { };

  function CustomStyle() {}

  CustomStyle.getProp = function get(propName, element) {
	// check cache only when no element is given
	if (arguments.length == 1 && typeof _cache[propName] == 'string') {
	  return _cache[propName];
	}

	element = element || document.documentElement;
	var style = element.style, prefixed, uPropName;

	// test standard property first
	if (typeof style[propName] == 'string') {
	  return (_cache[propName] = propName);
	}

	// capitalize
	uPropName = propName.charAt(0).toUpperCase() + propName.slice(1);

	// test vendor specific properties
	for (var i = 0, l = prefixes.length; i < l; i++) {
	  prefixed = prefixes[i] + uPropName;
	  if (typeof style[prefixed] == 'string') {
		return (_cache[propName] = prefixed);
	  }
	}

	//if all fails then set to undefined
	return (_cache[propName] = 'undefined');
  };

  CustomStyle.setProp = function set(propName, element, str) {
	var prop = this.getProp(propName);
	if (prop != 'undefined')
	  element.style[prop] = str;
  };

  return CustomStyle;
})();

var TextLayerBuilder = function textLayerBuilder(textLayerDiv) {
  this.textLayerDiv = textLayerDiv;

  this.beginLayout = function textLayerBuilderBeginLayout() {
	this.textDivs = [];
	this.textLayerQueue = [];
  };

  this.endLayout = function textLayerBuilderEndLayout() {
	var self = this;
	var textDivs = this.textDivs;
	var textLayerDiv = this.textLayerDiv;
	var renderTimer = null;
	var renderingDone = false;
	var renderInterval = 0;

	var canvas = document.createElement('canvas');
	var ctx = canvas.getContext('2d');

	// Render the text layer, one div at a time
	function renderTextLayer() {
	  if (textDivs.length === 0) {
		clearInterval(renderTimer);
		renderingDone = true;
		self.textLayerDiv = textLayerDiv = canvas = ctx = null;
		return;
	  }
	  var textDiv = textDivs.shift();
	  if (textDiv.dataset.textLength > 0) {
		textLayerDiv.appendChild(textDiv);

		if (textDiv.dataset.textLength > 1) { // avoid div by zero
		  // Adjust div width to match canvas text

		  ctx.font = textDiv.style.fontSize + ' sans-serif';
		  var width = ctx.measureText(textDiv.textContent).width;

		  var textScale = textDiv.dataset.canvasWidth / width;

		  CustomStyle.setProp('transform' , textDiv,
			'scale(' + textScale + ', 1)');
		  CustomStyle.setProp('transformOrigin' , textDiv, '0% 0%');
		}
	  } // textLength > 0
	}
	renderTimer = setInterval(renderTextLayer, renderInterval);
  }; // endLayout

  this.appendText = function textLayerBuilderAppendText(text,
														fontName, fontSize) {
	var textDiv = document.createElement('div');

	// vScale and hScale already contain the scaling to pixel units
	var fontHeight = fontSize * text.geom.vScale;
	textDiv.dataset.canvasWidth = text.canvasWidth * text.geom.hScale;
	textDiv.dataset.fontName = fontName;

	textDiv.style.fontSize = fontHeight + 'px';
	textDiv.style.left = text.geom.x + 'px';
	textDiv.style.top = (text.geom.y - fontHeight) + 'px';
	textDiv.textContent = PDFJS.bidi(text, -1);
	textDiv.dir = text.direction;
	textDiv.dataset.textLength = text.length;
	this.textDivs.push(textDiv);
  };
};