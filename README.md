# Installation
__Download__ the zip file and place it in your project's folder, or you can use `git clone` instead of manual download. After you complete one of those steps, just import the paint.js file. Don't forget that paint.js requires jQuery.js and JSColor.js
```html
<script type="text/javascript" src="paint.js/src/jscolor.js"></script>
<script type="text/javascript" src="paint.js/src/jquery.js"></script>
<script type="text/javascript" src="paint.js/src/paint.js"></script>
```
# Usage
After you import the library, you can create a ``<div>`` element and use PaintJS object to initialize inside that div.

```html
<div id="paint"></div>
...
<script type="text/javascript">
    var paint = new PaintJS({
        paint: "#paint" // or document.getElementById("paint")
    });
</script>
```
After user is done drawing, you can extract base64 contents using
```javascript
completeButton.onclick = function() {
    var base64 = paint.canvas.toDataURL();
    // $.ajax(...) upload using the base64 content
}
```

# Customization
you can initialize PaintJS object with custom options
```javascript
var paint = new PaintJS({
    paint: "#paint", // required key
    brushSize: 35, // 8 is default
    brushColor: "#ff0000", //  hexadecimal value, default #000
    paletteColors: [ // array of color shortcut, so that user does not have to use colorpicker for everything
    "#ffffff",
    "#000000",
    "#808080"
    ]
});
```
# Drawing on Images
you can initialize PaintJS to load from URL
```javascript
var paint = new PaintJS({
    paint: "#paint"
});
paint.fromURL("test.jpg").then(function(paintJS) {
    // act on paintJS
}).catch(function(err) {
    // probably link is invalid
    console.log(err);
});
```

# Creating brushes
```javascript
var brush = new PaintJSBrush({
    icon: "icons/brush.png", // icon to display in brushes section, required
    brushIcon: "icons/circle.png", // icon which will be displayed while mouse has entered the canvas
    documentMousedown: function(e) { // optional. event is fired on canvas mousedown
        var x = e.x;
        var y = e.y;
        var paintJS = this.paintJS; // referrence to PaintJS object
        var canvas  = paintJS.canvas;
        var ctx     = paintJS.ctx;
        var size    = paintJS.brushSize;
        var color   = paintJS.brushColor;
        ...
    }
    
});

var paint = new PaintJS({
    paint: "#paint",
    brush: brush // this will add this brush to initial brushes, and set it as active
});
```
# Todo
* Add support for transparency
* Add support for setting brushes and colors instead of only adding them
* Make selecting tool
* Undo and Redo

Contributions are VERY welcome!
===============================
