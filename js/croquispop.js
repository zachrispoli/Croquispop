//canvas
var canvas = document.getElementById("croquispopCanvas");
var context = canvas.getContext("2d");
context.fillStyle = "#FFFFFF";
context.fillRect(0, 0, canvas.width, canvas.height);
//drawer
var drawer = new Drawer;
drawer.drawInterval = 5;
//brush
var brush = new Brush(context);
brush.size = 50;
brush.interval = 0.3;
brush.color = new Color(0, 0, 0, 1);
var brushImage = document.getElementById("kkeumBrush");
brushImage.addEventListener("load", brushLoaded);
function brushLoaded()
{
	brush.image = brushImage;
}
canvas.addEventListener("mousedown", onMouseDown);
document.addEventListener("mouseup", onMouseUp);
function tabletPressure()
{
	var plugin = document.getElementById("tabletPlugin");
	return plugin && plugin.penAPI && plugin.penAPI.pressure || 1;
}
function onMouseDown(e)
{
	drawer.addDrawData(new DrawData(brush, brush.down, [e.clientX, e.clientY, tabletPressure()]));
	canvas.addEventListener("mousemove", onMouseMove);
}
function onMouseMove(e)
{
	drawer.addDrawData(new DrawData(brush, brush.move, [e.clientX, e.clientY, tabletPressure()]));
}
function onMouseUp(e)
{
	canvas.removeEventListener("mousemove", onMouseMove);
}
function DrawData(tool, command, arguments)
{
	this.tool = tool;
	//function
	this.command = command;
	//array
	this.arguments = arguments;
}
function Drawer()
{
	var drawInterval = 5;
	Object.defineProperty(this, "drawInterval",{
		get: function(){return drawInterval;},
		set: function(value){drawInterval = value;}
	});
	var queue = [];
	var isDead = false;
	draw();
	function draw()
	{
		if(queue.length != 0)
		{
			var drawData = queue.shift();
			drawData.command.apply(drawData.tool, drawData.arguments);
		}
		if(!isDead)
			window.setTimeout(draw, drawInterval);
	}
	this.addDrawData = function(drawData)
	{
		queue.push(drawData);
	}
	this.killMe = function()
	{
		isDead = true;
	}
}
function Color(r, g, b, a)
{
	this.r = r;
	this.g = g;
	this.b = b;
	this.a = a;
	this.clone = function()
	{
		return new Color(this.r, this.g, this.b, this.a);
	}
	this.toString = function()
	{
		return "rgba(" +
			Math.round(this.r * 0xFF) + "," +
			Math.round(this.g * 0xFF) + "," +
			Math.round(this.b * 0xFF) + "," +
			this.a + ")";
	}
}
function Brush(canvasRenderingContext)
{
	var context = canvasRenderingContext;
	Object.defineProperty(this, "context",{
		get: function(){return context;},
		set: function(value){context = value;}
	});
	var color = new Color(0, 0, 0, 1);
	Object.defineProperty(this, "color",{
		get: function(){return color;},
		set: function(value)
		{
			color = value;
			if(image && coloredImage)
			{
				var brushContext = coloredImage.getContext("2d");
				brushContext.clearRect(0, 0, coloredImage.width, coloredImage.height);
				brushContext.globalCompositeOperation = "source-over";
				brushContext.drawImage(image, 0, 0, coloredImage.width, coloredImage.height);
				brushContext.globalCompositeOperation = "source-in";
				brushContext.fillStyle = color.toString();
				brushContext.fillRect(0, 0, coloredImage.width, coloredImage.height);
			}
		}
	});
	var size = 10;
	Object.defineProperty(this, "size", {
		get: function(){return size;},
		set: function(value){size = value < 1 ? 1 : value;}
	});
	var interval = 0.05;
	Object.defineProperty(this, "interval", {
		get: function(){return interval;},
		set: function(value){interval = value < 0.01 ? 0.01 : value;}
	});
	var image = null;
	var coloredImage = null;
	Object.defineProperty(this, "image", {
		get: function(){return image;},
		set: function(value)
		{
			if(value == null)
			{
				coloredImage = image = null;
				drawFunction = drawCircle;
			}
			else
			{
				image = value;
				coloredImage = document.createElement("canvas");
				coloredImage.width = image.width;
				coloredImage.height = image.height;
				var brushContext = coloredImage.getContext("2d");
				brushContext.drawImage(image, 0, 0, coloredImage.width, coloredImage.height);
				brushContext.globalCompositeOperation = "source-in";
				brushContext.fillStyle = color.toString();
				brushContext.fillRect(0, 0, coloredImage.width, coloredImage.height);
				drawFunction = drawImage;
			}
		}
	});
	var delta = 0;
	var prevX = 0;
	var prevY = 0;
	var prevScale = 0;
	var drawFunction = drawCircle;
	function drawCircle(size)
	{
		var halfSize = size * 0.5;
		context.fillStyle = color.toString();
		context.beginPath();
		context.arc(halfSize, halfSize, halfSize, 0, Math.PI * 2);
		context.closePath();
		context.fill();
	}
	function drawImage(size)
	{
		//assume: image is square
		context.drawImage(coloredImage, 0, 0, size, size);
	}
	this.down = function(x, y, scale)
	{
		var halfSize = size * scale * 0.5;
		this.delta = 0;
		if(scale != 0)
		{
			this.context.save();
			this.context.translate(Math.floor(x - halfSize), Math.floor(y - halfSize));
			drawFunction(halfSize + halfSize);
			this.context.restore();
		}
		prevX = x;
		prevY = y;
		prevScale = scale;
	}
	this.move = function(x, y, scale)
	{
		if(scale > 0)
		{
			var dx = x - prevX;
			var dy = y - prevY;
			delta += Math.sqrt(dx * dx + dy * dy);
			if(delta == 0)
				return;
			var drawInterval = size * interval * ( prevScale + scale ) * 0.5;
			if(drawInterval < 0.5)
				drawInterval = 0.5;
			var drawStep = drawInterval / delta;
			var xInterval = dx * drawStep;
			var yInterval = dy * drawStep;
			var scaleInterval = (scale - prevScale) * drawStep;
			while(delta > drawInterval)
			{
				prevScale += scaleInterval;
				prevX += xInterval;
				prevY += yInterval;
				this.context.save();
				var halfSize = size * prevScale * 0.5;
				this.context.translate(Math.floor(prevX - halfSize), Math.floor(prevY - halfSize));
				drawFunction(halfSize + halfSize);
				this.context.restore();
				delta -= drawInterval;
			}
		}
		else
		{
			delta = 0;
			prevX = x;
			prevY = y;
			prevScale = scale;
		}
	}
}