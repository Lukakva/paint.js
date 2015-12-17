$.fn.prefixCSS = function(property, value) {
	var prefixes = ["-webkit-","-moz-", "-ms-", "-o-"];
	for (var i = 0; i < this.length; i++) {
		var node = this[i];
		for (var k = 0; k < prefixes.length; k++) {
			var cssProperty = prefixes[k] + property;
			$(node).css(cssProperty, value);
		}

		// set the property without prefix as well
		$(node).css(property, value);
	}

	return this;
}

function PaintJS(config) {
	if (!window.jQuery || jQuery == undefined) return {error: "Using PaintJS requires jQuery.js"};
	this.paintContainer = null;

	if (typeof config.paint == "string") {
		var node = document.querySelector(config.paint);
		if (node) this.paintContainer = node;
	} else if (typeof config.paint == "object") {
		this.paintContainer = config.paint;
	}

	if (config.brushSize)     this.brushSize     = config.brushSize;
	if (config.brushColor)    this.brushColor    = config.brushColor;
	if (config.paletteColors) this.paletteColors = config.paletteColors;
	if (config.brush)         this.brush         = config.brush;

	this.init();
}

PaintJS.prototype = {
	isBeingResized: false,
	resizingOptions: {
		x: 0, // x coordinate of point where the mouse was at the beginning of resizing
		y: 0, // y
		resizer: {
			width: 0, // how much width has to be removed from canvas on resize
			height: 0 // how much height has to be removed from canvas on resize
		},
		beforeResizing: {
			width: 0, // canvas width before resizing started
			height: 0
		}
	},
	defaultPaletteColors: [
		"#000000",
		"#0000FF",
		"#00FF00",
		"#00FFFF",
		"#800080",
		"#808080",
		"#ff0000",
		"#FF00FF",
		"#ffff00",
		"#ffffff"
	],
	// this canvas is used for resizing issues,
	// when resizing canvas it gets cleared so we have to keep track of canvas before it is being resized
	// and redraw it after it is done
	fakeCanvas: document.createElement("canvas"),
	createResizeButtons: function() {
		var width  = 8;
		var height = 8;

		var resizeRight       = document.createElement("div");
		var resizeBottom      = document.createElement("div");
		var resizeRightBottom = document.createElement("div");

		var buttons = [resizeRight, resizeBottom, resizeRightBottom];

		$(buttons).css({
			"position": "absolute",
			"height": "8px",
			"width": "8px",
			"background": "black",
			"border": "1px solid lightgrey",
			"left": "calc(50% - 10px)",
			"top": "calc(50% - 10px)"
		});

		$(resizeRight).css({
			"right": "-5px",
			"left": "auto",
			"cursor": "ew-resize"
		});
		$(resizeBottom).css({
			"bottom": "-5px",
			"top": "auto",
			"cursor": "ns-resize"
		});
		$(resizeRightBottom).css({
			"right": "-5px",
			"bottom": "-5px",
			"top": "auto",
			"left": "auto",
			"cursor": "nwse-resize"
		});

		for (var i = 0; i < buttons.length; i++) {
			buttons[i].isResizer = true; // it's just prettier to use it like this
		};

		resizeRight.resizerInfo = {
			x: 1,
			y: 0
		};

		resizeBottom.resizerInfo = {
			x: 0,
			y: 1
		};

		resizeRightBottom.resizerInfo = {
			x: 1,
			y: 1
		}

		return buttons;
	},
	fromURL: function(url) {
		var paintObject = this;
		return new Promise(function(resolve, reject) {
			if (!url) {
				reject("You have to provide URL argument for fromURL method");
				return;
			}

			var img = new Image();
			img.crossOrigin = "anonymous";

			img.onload = function() {
				// var contentType = xhr.getResponseHeader("Content-Type");
				paintObject.canvas.width = img.width;
				paintObject.canvas.height = img.height;
				paintObject.clear();
				paintObject.ctx.drawImage(this, 0, 0);
				resolve(paintObject);
			};

			img.onerror = function(err) {
				reject(err);
			}

			img.src = url;
		});
	},
	clear: function() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	},
	createPaletteButton: function(color) {
		var button = document.createElement("div");

		if (!this.isHexColor(color)) {
			console.error("Could not createColorButton() from given color - '" + color + "' since it is not a valid hexadecimal color value. It has to start from # and has to be 3 or 6 characters length");
			return false;
		}

		$(button).height(32).width(32).css({
			"background": color,
			"float": "left"
		});

		button.colorValue = color;
		button.paintJS    = this;
		button.onclick    = function() {
			this.paintJS.setColor(this);
		}

		return button;
	},
	isDarkColor: function(colorString) {
		var whatIsConsideredDark = 128;

		if (this.isHexColor(colorString)) {
			var value = colorString.slice(1);
			var colorValues = value.match(new RegExp(".{" + (value.length / 3) + "}", "g"));
			return parseInt(colorValues[0], 16) <= whatIsConsideredDark
			&& parseInt(colorValues[1], 16)     <= whatIsConsideredDark
			& parseInt(colorValues[2], 16)      <= whatIsConsideredDark;

		} else if (colorString.indexOf("rgb") > -1) {
			var rgb = colorString.replace("rgb(", "").replace(")", "").replace(/ /g, "");
			var colorValues = rgb.split(",");
			return (parseInt(colorValues[0]) <= whatIsConsideredDark)
			& (parseInt(colorValues[1])      <= whatIsConsideredDark)
			&& (parseInt(colorValues[2])     <= whatIsConsideredDark);

		}
	},
	setColor: function(button) {
		this.brushColor = button.colorValue;
		var children = button.parentElement.children;

		for (var i = 0; i < children.length; i++) {
			$(children[i]).css({
				"border": "none",
				"height": "32px",
				"width": "32px"
			})
		}

		button.style.border = "2px solid black";
		button.style.width  = "28px";
		button.style.height = "28px";
		if (this.isDarkColor(button.style.background)) button.style.border = "2px solid white";
	},
	setBrush: function(brush) {
		var brushObject = brush.paintJSBrush;
		this.brush = brushObject;

		$(this.brushesContainer.children).each(function(index, el) {
			$(el).css({
				"border": "none",
				"padding": "5px"
			});
		});

		$(brush).css({
			"border": "1px solid rgba(0, 0, 0, 0.2)",
			"padding": "4px"
		});
	},
	initialBrushes: function() {
		var defaultBrush = new PaintJSBrush({
			icon: "icons/paint-brush-icon.png",
			brushIcon: "icons/paint-brush.png",
			previous: {
				x: 0,
				y: 0
			},
			draw: function(x, y) {
				var ctx        = this.paintJS.ctx;
				var radius     = this.paintJS.brushSize / 2;
				var brushColor = this.paintJS.brushColor;

				ctx.beginPath();
				ctx.lineJoin    = "round";
				ctx.lineWidth   = radius;
				ctx.strokeStyle = brushColor;

				ctx.moveTo(this.previous.x, this.previous.y);
				ctx.lineTo(x, y);
				ctx.closePath();
				ctx.stroke();
			},
			documentMousedown: function(e) {
				this.previous = {
					x: e.x - 1,
					y: e.y - 1
				};

				this.draw(e.x, e.y);
				this.mousedown = true;
			},
			documentMousemove: function(e) {
				if (this.mousedown) {
					this.draw(e.x, e.y);

					this.previous = {
						x: e.x,
						y: e.y
					};
				}
			},
			documentMouseup: function(e) {
				this.mousedown = false;
			}
		});

		var fillBrush = new PaintJSBrush({
			icon: "icons/fill-brush.png",
			brushIcon: "icons/fill-brush.png",
			documentMousedown: function() {
				var paint = this.paintJS;

				paint.clear();
				paint.ctx.fillStyle = paint.brushColor;
				paint.ctx.fillRect(0, 0, paint.canvas.width, paint.canvas.height);
			}
		});

		var eraserBrush = new PaintJSBrush({
			icon: "icons/eraser-brush.png",
			brushIcon: "icons/eraser-brush.png",
			erase: function(x, y) {
				var ctx        = this.paintJS.ctx;
				var radius     = this.paintJS.brushSize / 2;

				ctx.beginPath();
				ctx.lineJoin  = "round";
				ctx.lineWidth = radius;

				ctx.moveTo(this.previous.x, this.previous.y);
				ctx.lineTo(x, y);
				ctx.closePath();
				ctx.strokeStyle = "#fff";
				ctx.stroke();
			},
			documentMousedown: function(e) {
				this.previous = {
					x: e.x - 1,
					y: e.y - 1
				};

				this.erase(e.x, e.y);
				this.mousedown = true;
			},
			documentMousemove: function(e) {
				if (this.mousedown) {
					this.erase(e.x, e.y);
					this.previous = {
						x: e.x,
						y: e.y
					}
				}
			},
			documentMouseup: function() {
				this.mousedown = false;
			}
		})

		return [defaultBrush, fillBrush, eraserBrush];
	},
	initBrushes: function() {
		var brushes = this.brushes;

		$(this.brushesContainer).remove();
		this.brushesContainer = document.createElement("div");

		var brushesContainer = this.brushesContainer;
		$(brushesContainer).empty().css({
			"margin": "0 10px",
			"flex-wrap": "wrap",
			"overflow": "hidden",
			"display": "flex",
			"border": "1px solid rgba(0, 0, 0, 0.2)"
		}).prependTo(this.navbar);

		for (var i = 0; i < brushes.length; i++) {
			var brushObject = this.brushes[i];
			brushObject.paintJS = this;

			var brushDiv = document.createElement("div");
			var brushIcon = new Image(32, 32);
			brushIcon.src = brushObject.icon;

			$(brushDiv).append(brushIcon).appendTo(brushesContainer).css({
				"margin": "5px",
				"padding": "5px"
			})

			brushDiv.paintJS = this;
			brushDiv.paintJSBrush = brushObject;

			brushDiv.onclick = function() {
				this.paintJS.setBrush(this);
			}

			if (i == 0) {
				brushDiv.click();
			}
		}
	},
	initCanvas: function() {
		if (this.canvas) {
			console.error("This PaintJS object is already initialized.");
			return false;
		}

		var paintContainer = this.paintContainer;
		if (!paintContainer) {
			console.error("Could not initCanvas() since canvas container is not set. Please set canvas using PaintJS.canvas = canvas (where canvas is node or selector string)");
			return false;
		}

		var canvasContainer = document.createElement("div");
		$(canvasContainer).css({
			"background": "gray",
			"width": "calc(100% - 40px)",
			"height": "calc(90% - 40px)", // 10 px padding from navbar + 10px padding from this one
			"padding": "20px",
			"min-height": "200px",
			"float": "left",
			"overflow": "auto"
		});

		var canvasWrapper = document.createElement("div");
		$(canvasWrapper).css({
			"position": "relative",
			"display": "inline-block",
			"cursor": "none"
		});
		var resizeButtons = this.createResizeButtons();
		$(canvasWrapper).append(resizeButtons);

		var brush = document.createElement("div");
		$(brush).css({
			"background": "url(" + this.brush.brushIcon + ")",
			"background-size": "cover",
			"height": (this.brushSize || 16) + "px",
			"width":  (this.brushSize || 16) + "px",
			"position": "absolute",
			"top": "0",
			"left": "0",
			"display": "none"
		});
		this.brushNode     = brush;
		brush.paintJSBrush = this.brush;
		brush.paintJS      = this; // just in case

		var canvas           = document.createElement("canvas");
		canvas.paintJS       = this;
		canvas.width         = $(paintContainer).width() / 2;
		canvas.height        = $(paintContainer).height() / 2;
		canvas.style.display = "block";

		this.canvas          = canvas;
		this.ctx             = canvas.getContext("2d");
		this.ctx.fillStyle   = "#fff";
		this.ctx.fillRect(0, 0, canvas.width, canvas.height);

		var navbar = document.createElement("div");
		$(navbar).css({
			"float": "left",
			"height": "calc(10% - 10px)",
			"padding": "5px",
			"width": "calc(100% - 10px)",
			"background": "rgb(213, 218, 214)",
			"display": "flex",
			"justify-content": "flex-end",
			"align-items": "center"
		});
		this.navbar = navbar;

		var palette = document.createElement("div");
		for (var i = 0; i < this.paletteColors.length; i++) {
			var paletteButton = this.createPaletteButton(this.paletteColors[i]);
			if (paletteButton) {
				palette.appendChild(paletteButton);
				if (i == 0) {
					// if this is first button, set current color to this one
					this.setColor(paletteButton);
				}
			}
		}

		this.paletteContainer = palette;

		// if the count of palette colors is odd, the last piece gets wrapped
		var paletteWidth = palette.children.length % 2 === 0 ? palette.children.length * 16 : (palette.children.length + 1) * 16;
		$(palette).css({
			"width": paletteWidth + "px",
			"height": "64px",
			"overflow": "overlay",
			"margin": "0 10px"
		}).appendTo(navbar);

		this.initBrushes();

		$(canvasWrapper).append(canvas, brush);
		$(canvasContainer).append(canvasWrapper);
		$(paintContainer).append(navbar, canvasContainer);
	},
	init: function() {
		if (!this.paintContainer) {
			var paintContainer = document.createElement("div");
			document.body.appendChild(paintContainer);
			this.paintContainer = paintContainer;
		}

		$(this.paintContainer).prefixCSS("user-select", "none");
		this.paintContainer.paintJS = this;

		this.brushSize     = this.brushSize     || 8;
		this.brushColor    = this.brushColor    || "#000000";
		this.paletteColors = this.paletteColors || this.defaultPaletteColors;
		this.brushes       = this.initialBrushes();

		if (this.brush) {
			this.brushes.unshift(brush);
		} else {
			this.brush = this.brushes[0];
		}

		this.initCanvas();

		var object = this;

		$(document).mousedown(function(e) {
			object.documentMousedown(e);
		});

		$(document).mousemove(function(e) {
			object.documentMousemove(e);
		});

		$(document).mouseup(function(e) {
			object.documentMouseup(e);
		});

		$(document).on("contextmenu", function(e) {
			e.preventDefault();
		})
	},
	isHexColor: function(hex) {
		return hex.indexOf("#") === 0 // starts with #
		&& (hex.length === 4 || hex.length === 7) // is #fff or #ffffff
		&& !isNaN(parseInt(hex.slice(1), 16)); // the content without # has to be valid hexadecimal number
	},
	documentMousedown: function(e) {
		var target = e.target;
		if (target.isResizer) {
			this.isBeingResized = true;
			this.resizingOptions = {
				x: e.pageX,
				y: e.pageY,
				resizer: target.resizerInfo,
				beforeResizing: {
					width: this.canvas.width,
					height: this.canvas.height
				}
			};

			this.fakeCanvas.width  = this.canvas.width;
			this.fakeCanvas.height = this.canvas.height;
			var ctx = this.fakeCanvas.getContext("2d");
			ctx.drawImage(this.canvas, 0, 0);
		} else {
			if (target == this.brushNode) {
				var offset = $(this.brushNode.parentElement).offset();
				var y = e.pageY - offset.top;
				var x = e.pageX - offset.left;

				this.brushNode.paintJS.brush.documentMousedown({
					x: x,
					y: y
				});
			}
		}
	},
	documentMousemove: function(e) {
		if (this.isBeingResized) {
			var resizingOptions = this.resizingOptions;

			var prevX = resizingOptions.x;
			var prevY = resizingOptions.y;

			var currX = e.pageX;
			var currY = e.pageY;

			var resizeH = (currY - prevY) * resizingOptions.resizer.y; // if y == 0, it wont resize canvas in height
			var resizeW = (currX - prevX) * resizingOptions.resizer.x;

			canvas = this.canvas;

			var newWidth = resizingOptions.beforeResizing.width + resizeW;
			var newHeight = resizingOptions.beforeResizing.height + resizeH;

			if (newHeight <= 100) newHeight = 100;
			if (newWidth <= 100) newWidth = 100;

			canvas.width  = newWidth;
			canvas.height = newHeight;

			this.ctx.fillStyle = "#888";
			this.ctx.fillRect(0, 0, canvas.width, canvas.height);
		} else {
			if (e.target.parentElement == this.brushNode.parentElement && !e.target.isResizer) {
				var isInCanvas =
				   e.pageX >= $(this.canvas).offset().left
				&& e.pageX <= $(this.canvas).offset().left + this.canvas.width
				&& e.pageY >= $(this.canvas).offset().top
				&& e.pageY <= $(this.canvas).offset().top + this.canvas.height;

				if (isInCanvas) {
					var offset = $(this.brushNode.parentElement).position();
					var top    = e.pageY - offset.top;
					var left   = e.pageX - offset.left;

					$(this.brushNode).show().css({
						"top": (top - $(this.brushNode).height() / 2) + "px",
						"left": (left - $(this.brushNode).width() / 2) + "px"
					});

					this.brush.documentMousemove({
						x: left,
						y: top
					});

					offset = null;
					top    = null;
					left   = null;
				} else {
					$(this.brushNode).hide();
					isInCanvas = null;
				}
			} else {
				$(this.brushNode).hide();
			}
		}
	},
	documentMouseup: function(e) {
		if (this.isBeingResized) {
			this.isBeingResized = false;
			this.clear();
			if (this.canvas.width > this.fakeCanvas.width || this.canvas.height > this.fakeCanvas.height) {
				// if the canvas was resized so that it increased in height or width, we have to fill it with white first
				this.ctx.fillStyle = "#fff";
				this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
			}
			this.ctx.drawImage(this.fakeCanvas, 0, 0);
		}

		if (e.target.parentElement == this.brushNode.parentElement) {
			this.brush.documentMouseup({
				x: e.pageX - $(this.brushNode.parentElement).offset().left,
				y: e.pageY - $(this.brushNode.parentElement).offset().top
			});
		}
	}
}

Object.defineProperties(PaintJS.prototype, {
	"brushColor": {
		get: function() {
			return this._brushColor;
		},
		set: function(brushColor) {
			if (this.isHexColor(brushColor)) {
				this._brushColor = brushColor;
			} else {
				console.log("Please use hexadecimal value (#ffffff or #fff) while setting brushColor");
			}
		}
	},
	"brushSize": {
		get: function() {
			return this._brushSize;
		},
		set: function(brushSize) {
			brushSize = parseInt(brushSize) || 8; // to prevent brushSize from being 0 or any other thing
			this._brushSize = brushSize;

			$(this.brushNode).css({
				"height": brushSize + "px",
				"width":  brushSize + "px"
			});
		}
	},
	"paletteColors": {
		get: function() {
			return this._paletteColors;
		},
		set: function(paletteColors) {
			// at least 1 color has to be present
			var atLeastOne = false;

			for (var i = 0; i < paletteColors.length; i++) {
				if (this.isHexColor(paletteColors[i])) {
					atLeastOne = true;
					break;
				}
			}

			if (atLeastOne) {
				this._paletteColors = paletteColors;
			}
		}
	},
	"brush": {
		get: function() {
			return this._brush;
		},
		set: function(brush) {
			if (brush instanceof PaintJSBrush) {
				this._brush = brush;
				$(this.brushNode).css("background-image", "url(" + brush.brushIcon + ")");
				this.brushSize = this.brushSize; // just to resize the brush again
			}
		}
	}
});

function PaintJSBrush(config) {
	config = config || {};
	if (!config.icon) return {};
	if (!config.brushIcon) return {};

	for (var conf in config) {
		this[conf] = config[conf];
	}

	this.documentMousedown = config.documentMousedown || function() {};
	this.documentMousemove = config.documentMousemove || function() {};
	this.documentMouseup   = config.documentMouseup   || function() {};
};



