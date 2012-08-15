(function(scope){
    function loadModule(value, moduleName){
        if (!value && (typeof require !== 'undefined')) { value = require(moduleName); }
        return value;
    }
    var document = scope.document;
    var _ = loadModule(scope._, 'underscore');
    var $ = loadModule(scope.$, 'jquery');
    var Canvas = loadModule(scope.HTMLCanvasElement, 'Canvas');//only needed serverside
    var Image = scope.Image || Canvas.Image;

    var twod = scope.twod || {};
    scope.twod = twod;

    twod.Pool = function(factory, maxLength, disposer){
        this.poolFactory = factory;
        this.poolDisposer = disposer;
        this.pool = [];
        this.maxLength = maxLength || 0;
    };
    twod.Pool.prototype = {
        pop: function(){
            var pool = this.pool;
            if(pool.length > 0){
                return pool.pop();
            } else {
                return this.poolFactory();
            }
        },
        push: function(item){
            if(this.maxLength && this.pool.length > this.maxLength){
                //too many items in pool
                if(this.poolDisposer){
                    this.poolDisposer(item);
                }
            } else {
                this.pool.push(item);
            }
        }
    };


    twod.Signal = function(){
        this.listeners = [];
        this.addQueue = [];
        this.removeQueue = [];
    };
    twod.Signal.prototype = {
        add: function(listener){
            this.addQueue.push(listener);
        },
        remove: function(listener){
            this.removeQueue.push(listener);
        },
        trigger: function(){
            var args = Array.prototype.slice.call(arguments);
            if(this.removeQueue.length > 0){
                var listeners = this.listeners;
                _.each(this.removeQueue, function(listener){
                    var index = _.indexOf(listeners, listener);
                    if(index != -1){
                        listeners.splice(index, 1);
                    }
                });
                this.removeQueue = [];
            }
            if(this.addQueue.length > 0){
                this.listeners = this.listeners.concat(this.addQueue);
                this.addQueue = [];
            }
            _.each(this.listeners, function(listener){
                listener.apply(null, args);
            });
        }
    };
    twod.ColorUtils = {
        uintToObj: function(rgba){
            rgba = rgba&0xFFFFFFFF;
            var r = (rgba>>24)&0xff;//avoid bit cycling
            var g = (rgba>>16)&0xff;
            var b = (rgba>>8)&0xff;
            var a = (rgba)&0xff;
            return {r: r, g: g, b: b, a: a};
        },
        objToHex: function(obj){
            var r = obj.r;
            var g = obj.g;
            var b = obj.b;
            return twod.ColorUtils.hexString(r, 2)+twod.ColorUtils.hexString(g, 2)+twod.ColorUtils.hexString(b, 2);
        },
        objToFloatObj: function(obj){
            var result = {};
            var div = 1/255;
            for(var s in obj){
                result[s] = obj[s]*div;
            }
            return result;
        },
        padString: function(string, minLength, padChar){
            padChar = padChar || "0";
            while(string.length < minLength){
                string = padChar + string;
            }
            return string;
        },
        hexString: function(h, minLength){
            return twod.ColorUtils.padString(Math.floor(h).toString(16), minLength);
        }
    };



    twod.Rectangle = function(x, y, w, h){
        this.x = x||0;
        this.y = y||0;
        this.w = w||0;
        this.h = h||0;
    };
    twod.Rectangle.prototype = {
        getVec2Points: function(){
            return [
                vec2.create([this.x, this.y]),
                vec2.create([this.x+this.w, this.y]),
                vec2.create([this.x+this.w, this.y+this.h]),
                vec2.create([this.x, this.y+this.h])
            ];
        },
        toString: function(){
            return '['+[this.x, this.y, this.w, this.h].join(',')+']';
        },
        fromString: function(str){
            if(str.charAt(0) == '[' && str.charAt(str.length-1) == ']'){
                str = str.substring(1, str.length-2);
            }
            var parts = str.split(',');
            if(parts.length == 4){
                this.x = parts[0];
                this.y = parts[1];
                this.w = parts[2];
                this.h = parts[3];
            }
        },
        contains: function(x, y){
            return x >= this.x && x <= this.x+this.w && y >= this.y && y <= this.y+this.h;
        }
    };


    twod.Point = function(x, y){
        this.x = x||0;
        this.y = y||0;
    };



    twod.ImageUtil = {
        getSubImage: function(image, rectangle){
            if(!rectangle){
                return image;
            }
            var canvas = twod.ImageUtil.getEmptyImage(rectangle.w, rectangle.h);
            var context = canvas.getContext('2d');
            context.save();
            context.translate(-rectangle.x, -rectangle.y);
            context.drawImage(image, 0, 0);
            context.restore();
            return canvas;
        },
        getCheckerImage: function(size, frequency){
            var canvas = twod.ImageUtil.getEmptyImage(size, size);
            var w = size;
            var h = size;
            var context = canvas.getContext('2d');
            var imageData = context.createImageData(w, h);
            var pixels = imageData.data;
            for(var i = 0; i < w; ++i){
                var iSign = i%frequency < frequency/2;
                for(var j = 0; j < h; ++j){
                    var jSign = j%frequency < frequency/2;
                    var val = jSign ^ iSign ? 255 : 0;
                    var alpha = 255;
                    var index = (i+j*w)*4;
                    pixels[index] = val;
                    pixels[index+1] = val;
                    pixels[index+2] = val;
                    pixels[index+3] = alpha;
                }
            }

            context.putImageData(imageData, 0, 0);

            return canvas;
        },
        getEmptyImage: function(width, height){
            var canvas = twod.ImageUtil.getCanvasPool().pop();
            canvas.width = width;
            canvas.height = height;
            return canvas;
        },
        freeEmptyImage: function(image){
            image.width = 1;
            image.height = 1;
            twod.ImageUtil.getCanvasPool().push(image);
        },
        createCanvas: function(){
            if(document){
                return document.createElement('canvas');
            } else {
                return new Canvas(1, 1);
            }
        },
        getCanvasPool: function(){
            var pool = twod.ImageUtil._canvasPool;
            if(!pool){
                 twod.ImageUtil._canvasPool = pool = new twod.Pool(twod.ImageUtil.createCanvas, 16);
            }
            return pool;
        },
        getBase64Canvas: function(canvas){
            var dataURL = canvas.toDataURL("image/png");
            return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
        },
        getBase64Image: function(image) {
           var canvas = twod.ImageUtil.getEmptyImage(image.width, image.height);
           var context = canvas.getContext("2d");
           context.drawImage(image, 0, 0);
           return twod.ImageUtil.getBase64Canvas(canvas);
        },
        getImageFromCanvas: function(canvas){
            var image = new Image();
            image.src = canvas.toDataURL("image/png");
            return image;
        },
        getCanvasFromImage: function(image){
            var rect = new twod.Rectangle(0, 0, image.width, image.height);
            return twod.ImageUtil.getSubImage(image, rect);
        },
        isImage: function(image){
            var constructor = image.constructor;
            return constructor === Image || constructor === window.HTMLImageElement;
        }
    };


    twod.ImageCache = function(useAtlas){
        this.useAtlas = useAtlas||false;
        this.allImagesArray = [];

        this.deletedIDs = [];
        this.images = {};
        this.loading = {};
        this.nextID = 0;
        if(this.useAtlas){
            this.atlas = new twod.Atlas(2048, 2048);
        }
    };
    twod.ImageCache.prototype = {
        registerImage: function(image){
            image.id = this.getNextID();
            this.allImagesArray.push(image);
            this.insertInAtlas(image);
        },
        removeImage: function(image){
            var id = image.id;
            image.id = undefined;
            this.allImagesArray[id] = null;
            this.deletedIDs.push(id);
            this.removeFromAtlas(image);
        },
        insertInAtlas: function(image){
            if(this.useAtlas){
                var node = this.atlas.insert(image);

                if(!node){
                    //couldn't fit! try repacking
                    console.log('repacking');
                    this.atlas.repack(this.atlas.width, this.atlas.width);
                    node = this.atlas.insert(image);
                }
//                if(!node){
                    //still doesn't fit
//                    console.log("we still can't fit it. sad.");
//                }
                //TODO: allocate larger atlas?

                if(node){
                    image._atlasNode = node;
//                    console.log(node);
                } else {
                    image._atlasNode = undefined;
                }
//                this.atlasNeedsRedraw = true;
                return node;
            }
        },
        removeFromAtlas: function(image){
            if(this.useAtlas){
                var node = image._atlasNode;
                image._atlasNode = undefined;
                return this.atlas.remove(image, node);
            }
        },
        setImageSubImage: function(image, parentImage, rect){
            var content = twod.ImageUtil.getSubImage(parentImage, rect);
            var oldW = image.getWidth();
            var oldH = image.getHeight();
            image.setImage(content);
            if(this.useAtlas){
                var newW = image.getWidth();
                var newH = image.getHeight();
                if(newW != oldH || newH !== oldH){
                    var oldNode = this.removeFromAtlas(image);
                    var newNode = this.insertInAtlas(image);
                }
            }
        },
        getNextID: function(){
            var deletedIDs = this.deletedIDs;
            var id;
            if(deletedIDs.length > 0){
                id = deletedIDs.pop();
            } else {
                id = this.nextID++;
            }
            return id;
        },
        loadSubImage: function(image, url, rect, onComplete){
            if(this.images[url]){
                this.setImageSubImage(image, this.images[url], rect);
                if(onComplete){
                    onComplete(image);
                }
            }
            else if(this.loading[url]){
                this.loading[url].push(_.bind(function(parentImage){
                    this.setImageSubImage(image, parentImage, rect);
                    image._url = url;
                    if(onComplete){
                        onComplete(image);
                    }
                }, this));
                return image;
            } else {
                var loading = this.loading;
                var callbacks = loading[url] = [];
                var parentImage = new Image();
                var images = this.images;
                parentImage.onload = function(){
                    delete loading[url];
                    images[url] = parentImage;
                    var max = callbacks.length;
                    for(var i = 0; i < max; ++i){
                        var callback = callbacks[i];
                        callback(parentImage);
                    }
                };

                this.loadSubImage(image, url, rect, onComplete);//prepare the subimage. It will set up the callback

                parentImage.src = url;//start the load
                return image;
            }
        }
    };


    twod.Image = function(){
    };
    twod.Image.prototype = {
        url: '',
        id: 0,
        rectangle: null,
        setImage: function(image){
            this.image = image;
            delete this.pattern;
            delete this.imageData;
        },
        buildCanvas: function(width, height){
            this.setImage(twod.ImageUtil.getEmptyImage(width, height));
        },
        destroyCanvas: function(){
            //need to do this to avoid fugly memory leak because dom objects are not cleared
            twod.ImageUtil.freeEmptyImage(this.image);
            delete this.image;
        },
        transformToImage: function(){
            if(twod.ImageUtil.isImage(this.image)){
                //already an image
            } else {
//                console.log('is not an image!, making imagelike');
                this.setImage(twod.ImageUtil.getImageFromCanvas(this.image));
            }
        },
        transformToCanvas: function(){
            if(twod.ImageUtil.isImage(this.image)){
//                console.log('transforming to canvas');
                var canvas = twod.ImageUtil.getCanvasFromImage(this.image);
                this.setImage(canvas);
            } else {
                //already a canvas?
            }
        },
        makeImageData: function(){
            var canvas = twod.ImageUtil.getCanvasFromImage(this.image);
            var context = canvas.getContext('2d');

            this.imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        },
        getWidth: function(){
            return this.image.width;
        },
        getHeight: function(){
            return this.image.height;
        }
    };


    twod.Font = function(renderContext, path, onComplete){
        this.context = renderContext;
        this.path = path;
        this.jsonURL = path+'/font.json';
        this.imgURL = path+'/font.png';

        this.spacingX = 0;
        this.spacingY = 0;
        this.offsetX = 0;
        this.offsetY = 0;

        this.charImages = [];
        this.charMap = {};
        this._loaded = false;
        this.loaded = new twod.Signal();

        if(onComplete){
            this.loaded.add(onComplete);
        }

        var setup = {
            url: this.jsonURL,
            dataType: 'json',
//            data: this.params,
//            timeout: this.timeout,
            success: _.bind(this._jsonLoaded, this)
//            failure: _.bind(this._failure, this)
        };

        $.ajax(setup);
    };
    twod.Font.prototype = {
        _jsonLoaded: function(result){
            var characters = result.characters;
            var spacingX = this.spacingX = result.spacingX;
            var spacingY = this.spacingY = result.spacingY;
            var offsetX = this.offsetX = result.offsetX;
            var offsetY = this.offsetY = result.offsetY;
            var columns = result.columns;

            var numChars = characters.length;

            var rects = [];
            for(var i = 0; i < numChars; ++i){
                var x = i%columns;
                var y = Math.floor(i/columns);
                var ox = x*spacingX;
                var oy = y*spacingY;

                var rect = new twod.Rectangle(ox, oy, spacingX, spacingY);
                rects.push(rect);
            }
            var images = this.context.loadImageRects(this.imgURL, rects, _.bind(this._onLoadComplete, this));
            for(var i = 0; i < numChars; ++i){
                var chr = characters.charAt(i);
                var image = images[i];
                this.charMap[chr] = image;
                this.charImages.push(image);
            }
        },
        _onLoadComplete: function(){
//            console.log('font load complete');
            this._loaded = true;
            this.loaded.trigger(this);
        },
        isLoaded: function(){
            return this._loaded;
        }
    };


    twod.ImageLoader = function(){};
    twod.ImageLoader.loadImages = function(srcs, callback, rootURL){
        var loader = new twod.ImageLoader();
        loader.loadImages(srcs, callback, rootURL);
    };
    twod.ImageLoader.prototype = {
        loadImages: function(srcs, callback, rootURL){
            this.callback = callback;
            rootURL = rootURL || "";
            var loaders = this.loaders = {};
            var that = this;
            this.loaded = {};
            _.each(srcs, function (src) {
                loaders[src] = new Image();
                loaders[src].onload = function(){
                    that.imageLoaded(src);
                };
            });
            //start them loading
            _.each(loaders, function(loader, src){
                loader.src = rootURL+src;
            });
        },
        imageLoaded: function(src){
            this.loaded[src] = this.loaders[src];
            delete this.loaders[src];
            var someLeft = false;
            for(var s in this.loaders){
                someLeft = true;
                break;
            }
            if(!someLeft){
                if(this.callback){
                    this.callback();
                }
            }
        }
    };




    twod.Item = function(){
    };
    twod.Item.prototype = {
        _x: 0,
        _y: 0,
        setPosition: function(x, y){
            this._x = x<<0;
            this._y = y<<0;
        },
        setX: function(x){
            this._x = x<<0;
        },
        setY: function(y){
            this._y = y<<0;
        },
        draw: function(renderContext){},
        getGlobalPosition: function(){
            var result = {x: this._x, y: this._y};
            if(this._parent){
                var offset = this._parent.getGlobalPosition();
                result.x += offset.x;
                result.y += offset.y;
            }
            return result;
        }
    };


    twod.Sprite = function(image){
        this.setImage(image);
    };
    twod.Sprite.prototype = _.extend(new twod.Item(), {
        setImage: function(image){
            this._image = image;
        },
        getImage: function(){
            return this._image;
        },
        draw: function(renderContext){
            var image = this._image;
            renderContext.drawImage(image, this._x, this._y);
        }
    });

    twod.OffsetSprite = function(image){
        this.setImage(image);
    };
    twod.OffsetSprite.prototype = _.extend(new twod.Item(), {
        _ox: 0,
        _oy: 0,
        setOffset: function(x, y){
            this._ox = x<<0;
            this._oy = y<<0;
        },
        setOffsetCenter: function(){
            this.setOffset(-this._image.getWidth()/2, -this._image.getHeight()/2);
        },
        setImage: function(image){
            this._image = image;
        },
        getImage: function(){
            return this._image;
        },
        draw: function(renderContext){
            var image = this._image;
            renderContext.drawImage(image, this._x + this._ox, this._y + this._oy);
        }
    });


    twod.FillSprite = function(image){
        this.setImage(image);
    };
    twod.FillSprite.prototype = _.extend(new twod.Item(), {
        _w: 0, _h: 0, _ox: 0, _oy: 0,
        setImage: function(image){
            this._image = image;
        },
        getImage: function(){
            return this._image;
        },
        setSize: function(w, h){
            this._w = w;
            this._h = h;
        },
        setTextureOffset: function(ox, oy){
            this._ox = ox;
            this._oy = oy;
        },
        draw: function(renderContext){
            var image = this._image;
            renderContext.drawTexture(image, this._x, this._y, this._w, this._h, this._ox, this._oy);
        }
    });


    twod.AnimSprite = function(frames){
        frames = frames || [];
        this.setPlayback(0, 0);
        this.setFrames(frames);
    };
    twod.AnimSprite.prototype = _.extend(new twod.Item(), {

        setPlayback: function(start, speed){
            this._frameNum = start;
            this._speed = speed;
        },
        setSpeed: function(speed){
            this._speed = speed;
        },
        setFrames: function(frames){
            this._frames = frames;
            if(this._frameNum >= frames.length){
                this._frameNum = 0;
            }
        },
        draw: function(renderContext){
            var frameNum = this._frameNum;
            var frames = this._frames;
            var floorFrame = frameNum|0;
            var image = frames[floorFrame];
            renderContext.drawImage(image, this._x, this._y);
            this._frameNum = (frameNum + this._speed)%frames.length;
        }
    });


    twod.TextField = function(font){
        this.setFont(font);
        this.setText('');
        this.setAlignment("left");
        this.setRecolor(null, null);
        this._dirty = true;
        this._cache = null;
    };
    twod.TextField.prototype = _.extend(new twod.Item(), {
        setText: function(text){
            if(text !== this._text){
                this._text = text;
                this._dirty = true;
            }
        },
        setTextWrapped: function(text, maxWidth){
            var words = text.split(' ');
            var lines = [];
            var currentLine = "";
            var i = 0;
            var numWords = words.length;
            while(i < numWords){
                var word = words[i];
                if(currentLine.length > 0){
                    currentLine += ' ';
                }
                currentLine += word;
                ++i;
                if(i < words.length){
                    var remainingSpace = maxWidth - currentLine.length;
                    if(words[i].length > remainingSpace){
                        //the next word wouldn't fit. start a new line
                        lines.push(currentLine);
                        currentLine = "";
                    }
                }
            }
            if(currentLine !== ""){
                lines.push(currentLine);
            }
            text = lines.join("\n");
            this.setText(text);
        },
        setRecolor: function(oldColor, newColor){
            if(this._oldColor !== oldColor || this._newColor !== newColor){
                this._oldColor = oldColor;
                this._newColor = newColor;
                this._dirty = true;
            }
        },
        setFont: function(font){
            if(font !== this._font){
                this._font = font;
                this._dirty = true;
                if(!font.isLoaded()){
//                    console.log('adding listener');
                    font.loaded.add(_.bind(function(){
//                        console.log('listener called');
                        this._dirty = true;
                    }, this));
                }
            }
        },
        setAlignment: function(alignment){
            if(alignment !== this._alignment){
                this._alignment = alignment;
                this._alignmentOffsetX = 0;
                this._dirty = true;
            }
        },
        getBounds: function(){
            var text = this._text;
            var length = text.length;
            var x = 0;
            var y = 0;
            var maxX = 0;

            for(var i = 0; i < length; ++i){
                var chr = text.charAt(i);
                if(chr == '\n'){
                    x = 0;
                    ++y;
                } else {
                    ++x;
                }
                maxX = Math.max(x, maxX);
            }
            maxX += 1;//need space for the rightmost character
            y += 1;
            return new twod.Rectangle(0, 0, maxX*this._font.spacingX, y*this._font.spacingY);
        },
        renderText: function(renderContext, shouldOffset){
            var bounds = this.getBounds();

            var font = this._font;
            var spacingX = font.spacingX;
            var spacingY = font.spacingY;
            var charMap = font.charMap;
            var text = this._text;
            var length = text.length;
            var x = 0;
            var y = 0;
            var offsetX = shouldOffset?this._x:0;
            var offsetY = shouldOffset?this._y:0;
            var alignment = this._alignment;

            if(alignment == "right"){
                this.alignmentOffsetX =  bounds.w;
            } else if(alignment == "center"){
                this.alignmentOffsetX = ((bounds.w*0.5))<<0;
            } else {
                this.alignmentOffsetX = 0;
            }

            var numInLine = 0;
            var alignmentOffset = 0;
            for(var i = 0; i < length; ++i){
                var chr = text.charAt(i);
                if(x === 0){
                    if(alignment == "left"){
                        alignmentOffset = 0;
                    } else {
                        var nextBR = text.indexOf("\n", i);
                        if(nextBR == -1){
                            nextBR = length;
                        }
                        numInLine = nextBR - i;

                        if(alignment == "right"){
                            alignmentOffset =  bounds.w - (numInLine+1)*spacingX;
                        } else if(alignment == "center"){
                            alignmentOffset = ((bounds.w*0.5 - (numInLine+1)*spacingX*0.5)/spacingX)<<0;
                            alignmentOffset *= spacingX;
                        } else {
                            alignmentOffset = 0;
                        }

                    }
                }
                if(chr == '\n'){
                    x = 0;
                    ++y;
                } else {
                    ++x;
                }
                var image = charMap[chr];
                if(image){
                    renderContext.drawImage(image, offsetX + (x)*spacingX + alignmentOffset, offsetY + y*spacingY);
                }
            }
        },
        draw: function(renderContext){
            var useCaching = true;
            if(useCaching){

                var needsRedraw = this._dirty || !this._cache;
                if(needsRedraw){
                    var bounds = this.getBounds();
                    var cacheWidth = bounds.w + this._font.spacingX;
                    var cacheHeight = bounds.h;

                    if(this._cache){
                        var _cache = this._cache;
                        if(_cache.getWidth() != cacheWidth || _cache.getHeight() != cacheHeight){
                            renderContext.freeImage(_cache);
                            this._cache = null;
                        }
                    }

                    if(!this._cache){
                        this._cache = renderContext.createImage(cacheWidth, cacheHeight);
                    }

                    var oldDrawTarget = renderContext.getDrawTarget();
                    renderContext.setDrawTarget(this._cache);
                    renderContext.save();
                    renderContext.identity();

                    renderContext.clear();
                    this.renderText(renderContext, false);


                    if(this._oldColor != this._newColor){
                        if(this._colorCache){
                            var _cache = this._colorCache;
                            if(_cache.getWidth() != cacheWidth || _cache.getHeight() != cacheHeight){
                                renderContext.freeImage(_cache);
                                this._colorCache = null;
                            }
                        }

                        if(!this._colorCache){
                            this._colorCache = renderContext.createImage(cacheWidth, cacheHeight);
                        }
                        renderContext.setDrawTarget(this._colorCache);
                        renderContext.clear();
                        renderContext.drawColorMap(this._cache, [this._oldColor], [this._newColor]);
                        var tmp = this._cache;
                        this._cache = this._colorCache;
                        this._colorCache = tmp;
                    }


                    renderContext.restore();
                    renderContext.setDrawTarget(oldDrawTarget);
                    this._dirty = false;
                }


                renderContext.drawImage(this._cache, this._x - this.alignmentOffsetX + this._font.offsetX, this._y + this._font.offsetY);


            } else {
                //just draw the slow way
                renderContext.save();
                renderContext.translate(-this.alignmentOffsetX + this._font.offsetX, this._font.offsetY);
                this.renderText(renderContext, true);
                renderContext.restore();
            }
        }
    });


    twod.Container = function(){
        this.children = [];
    };
    twod.Container.prototype = _.extend(new twod.Item(), {
        addChild: function(child){
            this.children.push(child);
            child._parent = this;
        },
        removeChildren: function(){
            this.children = [];
        },
        removeChild: function(child){
            if(child._parent === this){
                child._parent = null;
                this.children = _.filter(this.children, function(c){return c !== child;});
            }
        },
        children: null,
        draw: function(renderContext){
            renderContext.save();
            renderContext.translate(this._x, this._y);

            var children = this.children;
            var max = children.length;
            for(var i = 0; i < max; ++i){
                var child = children[i];
                child.draw(renderContext);
            }

            renderContext.restore();
        }
    });




    twod.Stage = function(){
    };
    twod.Stage.prototype = {
        init: function($el, options){

            options = options || {};

            var mode = options.mode || 'auto';
            options.width = options.width || 256;
            options.height = options.height || 192;
            options.scaling = options.scaling || 1;
            options.bgColor = options.bgColor || 0xffffffff;

            this._prepareCallback = options.readyCallback;
            this._width = options.width;
            this._height = options.height;
            this.options = options;

            this.$el = $el;
            this.container = new twod.Container();

            var modes;
            if(mode == 'auto'){
                modes = this.getModePriorities();
            } else {
                if(_.isArray(mode)){
                    modes = mode;
                } else {
                    modes = [mode];
                }
            }

            this.modePriorities = modes;
            this.prepareContext();
        },
        renderContext: null,
        draw: function(){
            this.renderContext.identity();
            this.renderContext.clear();
            this.container.draw(this.renderContext);

            this.renderContext.flush();
        },
        getWidth: function(){
            return this._width;
        },
        getHeight: function(){
            return this._height;
        },
        getScaling: function(){
            return this._scaling;
        },
        setWidth: function(width){
            this._width = width;
            this.renderContext.setWidth(width);
        },
        setHeight: function(height){
            this._height = height;
            this.renderContext.setHeight(height);
        },
        setScaling: function(scaling){
            this._scaling = scaling;
            this.renderContext.setScaling(scaling);
        },
        prepareContext: function(){
            if(this.modePriorities.length > 0){
                var mode = this.modePriorities.splice(0, 1)[0];
//                console.log(mode, this.modePriorities.toString());
                this.priorityMode = mode;

                switch(mode){
                    case 'webgl':
                        this.renderContext = new twod.WebGLContext();
                        break;
                    case 'flash':
                        this.renderContext = new twod.BufferedFlashContext();
                        break;
//            case 'bufferedcanvas':
//                this.renderContext = new twod.BufferedCanvasContext(this.$el);
//                break;
                    case 'canvas':
                    default:
                        this.renderContext = new twod.CanvasContext();
                        break;
                }
                this.renderContext.buildComplete.add(_.bind(this.prepareContextComplete, this));
                this.renderContext.buildFailed.add(_.bind(this.prepareContextFailed, this));
                var options = this.options;//{width: this._width, height: this._height, scaling: this._scaling, bgColor: this._bgColor};
                this.renderContext.init(this.$el, options);
            }
        },
        prepareContextFailed: function(){
            //try next mode;
//            console.log('failure', this.priorityMode);
            this.prepareContext();
        },
        prepareContextComplete: function(){
//            console.log('success', this.priorityMode);
            if(this._prepareCallback){
                this._prepareCallback();
            }
        },
        getModePriorities: function(){
            var hasCanvas = Modernizr.canvas;
            var hasFlash = (swfobject.getFlashPlayerVersion().major >= 9);
//            alert(swfobject.getFlashPlayerVersion().major);
            var hasWebGL = twod.WebGLContext.hasWebGL();
            var priorities = [];
            if(hasWebGL){
                priorities.push('webgl');
            }
            if(hasCanvas){
                priorities.push('canvas');
            }
            if(hasFlash){
                priorities.push('flash');
            }
            return priorities;
        }
    };




    twod.RenderContext = function(){
        this.buildComplete = new twod.Signal();
        this.buildFailed= new twod.Signal();
    };
    twod.RenderContext.mixin = {

        //IMMEDIATE MODE OPERATIONS. THESE HAVE IMMEDIATE EFFECT AND DO NOT RETURN ANY VALUE.
        clear: function(){console.log('clear() not implemented');},//clear the context for redrawing
        save: function(){console.log('save() not implemented');},//save the current transformstate
        restore: function(){console.log('restore() not implemented');},//restore previous transform state
        translate: function(x, y){console.log('translate() not implemented');},//translate coordinates
        identity: function(x, y){console.log('identity() not implemented');},//reset translation
        setDrawTarget: function(image){console.log('setDrawTarget() not implemented');},//sets current drawing target(or main output if image==null
        drawImage: function(image, x, y){console.log('drawImage() not implemented');},//draw an image
        drawTexture: function(image, x, y, w, h, ox, oy){console.log('drawTexture() not implemented');},//draw a textured rectangle
        drawColorMap: function(image, sourceRGBAs, targetRGBAs){console.log('drawColorMap() not implemented');},//draw image with selected colors remapped. no translation
        drawAffine: function(image, matrix){console.log('drawAffine() not implemented');},//draw an image with an affine transform.
        drawScanline: function(image, y, sx1, sy1, sx2, sy2){console.log('drawScanline() not implemented');},//draw a scan line.
//        drawScanlines: function(image, data){console.log('drawScanline() not implemented')},//draw a scan line. data is an interleaved array of x,y,w,sx1,sy1,sx2,sy2
//        drawAffineTexture: function(image, x, y, w, h, a, b, c, d, tx, ty){},//draw a texture with an affine transform. for mode7 etc
        freeImage: function(image){console.log('freeImage() not implemented');},//forget this image, perhaps free up the memory for later use

        getDrawTarget: function(){console.log('getDrawTarget() not implemented');},//gets current drawing target(or null if main output)
        flush: function(){console.log('flush() not implemented');},//flush the current buffer


        //ASYNCHRONOUS OPERATIONS. THESE DO NOT NECESSARILY HAVE IMMEDATE EFFECT. USE CALLBACKS TO DETECT COMPLETION
        createImage: function(width, height){console.log('createImage() not implemented');},//creates a new empty image with this size
        loadImage: function(image, url, rectangle, onComplete){console.log('loadImage() not implemented');},//loads rectangle subimage from a url into supplied image asynchronously
        loadFrames: function(json, rootURL, onComplete){
            rootURL = rootURL || '';

            var imageURL = json.images[0];
            var frameX = json.frames.regX;
            var frameY = json.frames.regY;
            var frameWidth = json.frames.width;
            var frameHeight = json.frames.height;
            var numFrames = json.frames.count;
            var url = rootURL + imageURL;
            var rects = [];
            var urls = [];

            for(var i = 0; i < numFrames; ++i){
                var x = i*frameWidth;
                var rect = new twod.Rectangle(x, frameY, frameWidth, frameHeight);
                rects.push(rect);
                urls.push(url);
            }
            return this.loadImageRects(url, rects, onComplete);
        },
        loadPack: function(json, rootURL, onComplete){
            rootURL = rootURL || '';

            var imageMap = {};
            var that = this;
//            console.log(json);

            if(_.isString(json)){
                //we have a url. load it then handle the result
                var setup = {
                    url: json,
                    dataType: 'json',
                    success: function(result){
//                        console.log(result);
                        handleJson(result);
                    }
                };
                $.ajax(setup);
            } else {
                //we have a pack structure. handle that instead
                handleJson(json);
            }
            function handleJson(json){
                var imageURL = json.img;
                var parts = json.parts;
                var numParts = parts.length;
                var url = rootURL + imageURL;
                var rects = [];
                var urls = [];

                for(var i = 0; i < numParts; ++i){
                    var part = parts[i];
                    var rect = new twod.Rectangle(part.x, part.y, part.w, part.h);
                    rects.push(rect);
                    urls.push(url);
                }

                var images = that.loadImageRects(url, rects, function(){
                    if(onComplete){
                        onComplete(imageMap);
                    }
                });
                for(var i = 0; i < numParts; ++i){
                    var image = images[i];
                    image._name = parts[i].n;
                    image._packRect = rects[i];
                    imageMap[image._name] = image;
                }

            }
            return imageMap;
        },
        loadImageRects: function(urls, rectangles, onComplete){
            rectangles = rectangles || [null];
            var numFrames = _.isString(urls)?rectangles.length:urls.length;
            var stillLoadingMap = {};
            var images = [];

            for(var i = 0; i < numFrames; ++i){
                var rect = rectangles[i];
                var image;
                if(rect){
                    image = this.createImage(rect.width, rect.height);
                } else {
                    image = this.createImage();
                }
                
                var id = ''+i;
                stillLoadingMap[id] = image;
                image._batchLoadID = id;
                images.push(image);
            }

            var completeFunction = function(image){
                var id = image._batchLoadID;
                delete stillLoadingMap[id];
                delete image._batchLoadID;
                var stillLoading = false;
                //check if there are still images left to load
                for(var s in stillLoadingMap){
                    stillLoading = true;
                    break;
                }

                //fire the callback if we have finished
                if(!stillLoading){
                    if(onComplete){
//                        console.log('all loaded, firing callback');
                        onComplete(images);
                    }
                }
            };


            for(var i = 0; i < numFrames; ++i){
                var image = images[i];
                var url;
                if(_.isString(urls)){
                    url = urls;
                } else {
                    url = urls[i];
                }
                var rect = rectangles[i];
                this.loadImage(image, url, rect, completeFunction);
            }
            return images;
        },//creates an image for each rectangle and loads a subimage into it from the url


        //SOME UTILITIES FOR DEALING WITH THE DOM
        register$Element: function($el){
            this.$els = this.$els || [];
            this.$els.push($el);
        },
        clear$Elements: function($el){
            this.$els = this.$els || [];
//            console.log('clear $elements');
            _.each(this.$els, function($el){
                $el.remove();
            });
        },
        createCanvas: function($el, id){
            var options = {};
            if(id){
                options.id = id;
            }

            var $canvas = $el.create('canvas', '', options);
            $canvas.css("image-rendering", "optimizeSpeed");
            $canvas.css("image-rendering", "-moz-crisp-edges");
            $canvas.css("image-rendering", "-o-crisp-edges");
            $canvas.css("image-rendering", "-webkit-optimize-contrast");
            $canvas.css("image-rendering", "optimize-contrast");
            $canvas.css("-ms-interpolation-mode", "nearest-neighbor");

            var canvas = $canvas[0];
            canvas.width = $el.width();
            canvas.height = $el.height();
            this.register$Element($canvas);
            return canvas;
        },
        createDiv: function($el, id){
            var options = {};
            if(id){
                options.id = id;
            }
            var $div = $el.create('div', '', options);
            $div.css({width: $el.width(), height: $el.height()});
            var div = $div[0];
            this.register$Element($div);
            return div;
        },
        setScaling: function(scaling){},
        setWidth: function(width){},
        setHeight: function(height){}
    };
    twod.RenderContext.prototype = twod.RenderContext.mixin;


    twod.TransformStackContext = function(){
        twod.RenderContext.apply(this);
        this.translationStack = [];
        this.translation = new twod.Point();
        this.identity();
    };
    twod.TransformStackContext.mixin = {
        save: function(){
            this.translationStack.push(this.translation);
            this.translation = new twod.Point(this.translation.x, this.translation.y);
        },
        restore: function(){
            this.translation = this.translationStack.pop();
        },
        translate: function(x, y){
            this.translation.x += x;
            this.translation.y += y;
        },
        identity: function(){
            this.translation.x = 0;
            this.translation.y = 0;
        }
    };
    twod.TransformStackContext.prototype = twod.TransformStackContext.mixin;


    twod.CanvasContext = function(){
        twod.RenderContext.apply(this);
        twod.TransformStackContext.apply(this);
    };
    twod.CanvasContext.mixin = {
        init: function($el, options){
            var success = false;
            try{

                var width = options.width;
                var height = options.height;
                var scaling = options.scaling;
                var bgColor = options.bgColor;

                this.imageCache = new twod.ImageCache(false);
                var bgDiv;
                var canvas;
                if($el){
                    bgDiv = this.createDiv($el, 'twodBGDiv');

                    canvas = this.createCanvas($el, 'twodCanvas');
                } else {
                    canvas = twod.ImageUtil.createCanvas();
                }
                this.canvas = canvas;

                this.doPixelScaling = false;
                this._scaling = scaling;
                this._width = width;
                this._height = height;

                if(!this.doPixelScaling && scaling != 1){
                    canvas.width = width;
                    canvas.height = height;

                    $(canvas).css({
                        width: width*scaling,
                        height: height*scaling
                    });
                } else {
                    canvas.width = width*scaling;
                    canvas.height = height*scaling;
                }
                $(canvas).css({position: 'absolute'});

                if(bgDiv){
                    bgColor = bgColor = twod.ColorUtils.objToHex(twod.ColorUtils.uintToObj(bgColor));

                    setTimeout(_.bind(function()
                    {
                        $(bgDiv).css({position: 'absolute', width: width*scaling, height: height*scaling, 'background-color': "#"+bgColor});
                    }, this), 0);

                }

                this.context = canvas.getContext('2d');

                this.drawTarget = null;
                this.drawTargetCanvas = this.canvas;
                this.drawTargetContext = this.context;

                success = true;

            } catch (e){
                //there was an error preparing!
                success = false;
            }

            if(success){
                this.buildComplete.trigger();
            } else {
                this.clear$Elements();
                this.buildFailed.trigger();
            }
        },
        setWidth: function(width){
            this.canvas.width = width;
        },
        setHeight: function(height){
            this.canvas.height = height;
        },
        clear: function(){
            this.drawTargetContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
        },
        flush: function(){

            if(this.doPixelScaling){
                var w = this._width;
                var h = this._height;
                var s = this._scaling;

                var sw = w*s;
                var sh = h*s;
                if(!this.pixelScalingOutputData || this.pixelScalingOutputData.width != sw || this.pixelScalingOutputData.height != sh){
                    this.pixelScalingOutputData = this.context.getImageData(0, 0, w*s, h*s);
                }
                var outputData = this.pixelScalingOutputData;
                var inputData = this.context.getImageData(0, 0, w, h);
                var inputPixels = inputData.data;
                var outputPixels = outputData.data;

//                for(var y = h-1; y >= 0; --y){
//                    for(var x = w-1; x >= 0; --x){
                for(var y = 0; y < h; ++y){
                    var ys = y*s;
                    for(var x = 0; x < w; ++x){
                        var xs = x*s;
                        var i = (x+y*w)*4;
                        var r = inputPixels[i];
                        var g = inputPixels[i+1];
                        var b = inputPixels[i+2];
                        var a = inputPixels[i+3];
                        var p = 0;
                        var q = 0;
                        for(var p = 0; p < s; ++p){
                            for(var q = 0; q < s; ++q){
//                        for(var p = s-1; p >= 0; --p){
//                            for(var q = s-1; q >= 0; --q){
//                                var o = (x)*4;
                                var o = (xs+p + (ys+q)*sw)*4;
                                outputPixels[o] = r;
                                outputPixels[o+1] = g;
                                outputPixels[o+2] = b;
                                outputPixels[o+3] = a;
                            }
                        }
                    }
                }
                this.context.putImageData(outputData, 0, 0);
            }
        },//this does nothing because we do everything immediately

        drawImage: function(image, x, y){
            var i = image.image;
            var translation = this.translation;
            this.drawTargetContext.drawImage(i, translation.x+x, translation.y+y, i.width, i.height);
        },

        //draw a textured rectangle
        drawTexture: function(image, x, y, w, h, ox, oy){
            var context = this.drawTargetContext;
            var im = image.image;
            if(!image.pattern){
                image.pattern = context.createPattern(im, 'repeat');
            }

            var iw = im.width;
            var ih = im.height;

            //fix offset so tile normally starts drawing in top left corner
            var mx = this.niceMod(x, iw);
            var my = this.niceMod(y, ih);
            ox += mx;
            oy += my;

            var translation = this.translation;


            context.save();
            context.fillStyle = image.pattern;
            context.translate(ox+translation.x, oy+translation.y);
            context.fillRect(x - ox, y - oy, w, h);
            context.restore();
        },
        drawColorMap: function(image, sourceRGBAs, targetRGBAs){

            var numMaps = Math.min(sourceRGBAs.length, targetRGBAs.length);
            if(numMaps === 0){
                return;
            }

            var makeCanvas = twod.ImageUtil.isImage(image.image);
            if(makeCanvas){
//                console.log('needs transform');
                image.transformToCanvas();
            }

            var sourceImage = image.image;
            var sourceContext = sourceImage.getContext('2d');
            var sourceWidth = sourceImage.width;
            var sourceHeight = sourceImage.height;
            var sourceData = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight);
            var sourcePixels = sourceData.data;

            var targetImage = this.drawTargetCanvas;
            var targetContext = this.drawTargetContext;
            var targetWidth = targetImage.width;
            var targetHeight = targetImage.height;
            var targetData = targetContext.getImageData(0, 0, targetWidth, targetHeight);
            var targetPixels = targetData.data;

            var width = Math.min(sourceWidth, targetWidth);
            var height = Math.min(sourceHeight, targetHeight);

            for(var i = 0; i < numMaps; ++i){
                sourceRGBAs[i] = sourceRGBAs[i]&0xFFFFFFFF;//force input numbers to be uints
            }
            if(numMaps === 1){
                this.drawColorMapOne(sourcePixels, targetPixels, width, height, sourceRGBAs, targetRGBAs);
            } else {
                this.drawColorMapMany(sourcePixels, targetPixels, width, height, numMaps, sourceRGBAs, targetRGBAs);
            }

            targetContext.putImageData(targetData, 0, 0);

//            if(makeCanvas){
//                image.transformToImage();//transform back!
//            }
        },
        drawColorMapMany: function(sourcePixels, targetPixels, width, height, numMaps, sourceRGBAs, targetRGBAs){
            var colorMap = {};
            for(var i = 0; i < numMaps; ++i){
                colorMap[sourceRGBAs[i]] = targetRGBAs[i];
            }
            for(var j = 0; j < height; ++j){
                for(var i = 0; i < width; ++i){
                    var index = (i+j*width)*4;
                    var r = sourcePixels[index];
                    var g = sourcePixels[index+1];
                    var b = sourcePixels[index+2];
                    var a = sourcePixels[index+3];
                    var sourceRGBA = (r << 24) | (g << 16) | (b << 8) | (a);
                    if(colorMap.hasOwnProperty(sourceRGBA)){
                        var targetRGBA = colorMap[sourceRGBA];
                        var tr = (targetRGBA>>24)&0xff;//avoid bit cycling
                        var tg = (targetRGBA>>16)&0xff;
                        var tb = (targetRGBA>>8)&0xff;
                        var ta = (targetRGBA)&0xff;
                        targetPixels[index] = tr;
                        targetPixels[index+1] = tg;
                        targetPixels[index+2] = tb;
                        targetPixels[index+3] = ta;
                    }
                }
            }

        },
        drawColorMapOne: function(sourcePixels, targetPixels, width, height, sourceRGBAs, targetRGBAs){
            var sourceColor = sourceRGBAs[0];
            var targetRGBA = targetRGBAs[0];
//            sourceColor = sourceColor&0xFFFFFFFF;//fix the input
            var tr = (targetRGBA>>24)&0xff;//avoid bit cycling
            var tg = (targetRGBA>>16)&0xff;
            var tb = (targetRGBA>>8)&0xff;
            var ta = (targetRGBA)&0xff;
            for(var j = 0; j < height; ++j){
                for(var i = 0; i < width; ++i){
                    var index = (i+j*width)*4;
                    var r = sourcePixels[index];
                    var g = sourcePixels[index+1];
                    var b = sourcePixels[index+2];
                    var a = sourcePixels[index+3];
                    var sourceRGBA = (r << 24) + (g << 16) + (b << 8) + (a);
                    if(sourceRGBA === sourceColor){
                        targetPixels[index] = tr;
                        targetPixels[index+1] = tg;
                        targetPixels[index+2] = tb;
                        targetPixels[index+3] = ta;
                    }
                }
            }

        },

        drawAffine: function(image, mx){
            var i = image.image;
            var translation = this.translation;
            this.drawTargetContext.save();
            this.drawTargetContext.transform(mx[0], mx[1], mx[2], mx[3], mx[4]+translation.x, mx[5]+translation.y);
            this.drawTargetContext.drawImage(i, 0, 0, i.width, i.height);
            this.drawTargetContext.restore();
        },

        drawScanline: function(image, y, sx1, sy1, sx2, sy2){
            var x = 0;
            var width = this.drawTargetCanvas.width;
            var dataWidth = width*4;
            var imageWidth = image.getWidth();
            var imageHeight = image.getHeight();

            if(this.scanlineData && this.scanlineData.data.length != dataWidth){
                this.scanlineData = null;
            }
            if(!this.scanlineData){
                this.scanlineData = this.drawTargetContext.createImageData(width, 1);
            }

            if(this.scanlineSourceImage != image){
                this.scanlineSourceImage = image;
                if(twod.ImageUtil.isImage(image.image)){
                    image.transformToCanvas();
                }
                this.scanlineSourceContext = image.image.getContext('2d');
                this.scanlineSourceData = this.scanlineSourceContext.getImageData(0, 0, imageWidth, imageHeight);
            }
            var sourceImageData = this.scanlineSourceData;
            var sourceData = sourceImageData.data;

            var targetImageData = this.scanlineData;
            var targetData = targetImageData.data;


            var startX = Math.min(sx1, sx2);
            var startY = Math.min(sy1, sy2);
            var shiftX = Math.floor(startX/imageWidth)*imageWidth;
            var shiftY = Math.floor(startY/imageHeight)*imageHeight;

            sx1 -= shiftX;
            sx2 -= shiftX;
            sy1 -= shiftY;
            sy2 -= shiftY;

            var iWidth = 1/width;
            var dx = (sx2 - sx1)*iWidth;
            var dy = (sy2 - sy1)*iWidth;

            for(var i = 0; i < width; ++i){
                var px = (i*dx + sx1)%imageWidth;
                var py = (i*dy + sy1)%imageHeight;

                px = px|0;
                py = py|0;

                var sourceIndex = (px+py*imageWidth)*4;
                var targetIndex = i*4;
                targetData[targetIndex] = sourceData[sourceIndex];
                targetData[targetIndex+1] = sourceData[sourceIndex+1];
                targetData[targetIndex+2] = sourceData[sourceIndex+2];
                targetData[targetIndex+3] = sourceData[sourceIndex+3];
            }
            this.drawTargetContext.putImageData(targetImageData, x, y);

        },

//        drawScanlines: function(image, data){
//            var dataLength = data.length;
//            var itemsPerLine = 7;
//            var numLines = dataLength/itemsPerLine;
//            var x = 0;
//            var width = this.drawTargetCanvas.width;
//            var dataWidth = width*4;
//            var imageWidth = image.getWidth();
//            var imageHeight = image.getHeight();
//
//            if(this.scanlineData && this.scanlineData.data.length != dataWidth){// || this.scanlineDataTargetContext !== this.drawTargetContext){
//                this.scanlineData = null;
//            }
//            if(!this.scanlineData){
//                this.scanlineData = this.drawTargetContext.createImageData(width, 1);
////                this.scanlineDataTargetContext = this.drawTargetContext;
////                console.log(this.scanlineData);
//            }
//
//            if(this.scanlineSourceImage != image){
//                this.scanlineSourceImage = image;
//                if(twod.ImageUtil.isImage(image.image)){
//                    image.transformToCanvas();
//                }
//                this.scanlineSourceContext = image.image.getContext('2d');
//                this.scanlineSourceData = this.scanlineSourceContext.getImageData(0, 0, imageWidth, imageHeight);
//            }
//            var sourceImageData = this.scanlineSourceData;
//            var sourceData = sourceImageData.data;
//
//            var targetImageData = this.scanlineData;
//            var targetData = targetImageData.data;
//
//            var k = 0;
//            for(var line = 0; line < numLines; ++line){
//                var x = data[k];
//                var y = data[k+1];
//                var w = data[k+2];
//                var sx1 = data[k+3];
//                var sy1 = data[k+4];
//                var sx2 = data[k+5];
//                var sy2 = data[k+6];
//                var x2 = x+w;
//
//                var startX = Math.min(sx1, sx2);
//                var startY = Math.min(sy1, sy2);
//                var shiftX = Math.floor(startX/imageWidth)*imageWidth;
//                var shiftY = Math.floor(startY/imageHeight)*imageHeight;
//
//                sx1 -= shiftX;
//                sx2 -= shiftX;
//                sy1 -= shiftY;
//                sy2 -= shiftY;
//
//                var iWidth = 1/width;
//                var dx = (sx2 - sx1)*iWidth;
//                var dy = (sy2 - sy1)*iWidth;
//
//                //copy original pixels
//                for(var i = 0; i < x; ++i){
//                    var sourceIndex = i*4;
//                    var targetIndex = sourceIndex;
//                    targetData[targetIndex] = sourceData[sourceIndex];
//                    targetData[targetIndex+1] = sourceData[sourceIndex+1];
//                    targetData[targetIndex+2] = sourceData[sourceIndex+2];
//                    targetData[targetIndex+3] = sourceData[sourceIndex+3];
//                }
//                //copy new pixels
//                for(var i = x; i < x2; ++i){
//                    var px = (i*dx + sx1)%imageWidth;
//                    var py = (i*dy + sy1)%imageHeight;
//
//                    px = px|0;
//                    py = py|0;
//
//                    var sourceIndex = (px+py*imageWidth)*4;
//                    var targetIndex = i*4;
//                    targetData[targetIndex] = sourceData[sourceIndex];
//                    targetData[targetIndex+1] = sourceData[sourceIndex+1];
//                    targetData[targetIndex+2] = sourceData[sourceIndex+2];
//                    targetData[targetIndex+3] = sourceData[sourceIndex+3];
//                }
//                //copy original pixels
//                for(var i = x2; i < w; ++i){
//                    var sourceIndex = i*4;
//                    var targetIndex = sourceIndex;
//                    targetData[targetIndex] = sourceData[sourceIndex];
//                    targetData[targetIndex+1] = sourceData[sourceIndex+1];
//                    targetData[targetIndex+2] = sourceData[sourceIndex+2];
//                    targetData[targetIndex+3] = sourceData[sourceIndex+3];
//                }
//
//                this.drawTargetContext.putImageData(targetImageData, 0, y);
//
//                k += itemsPerLine;
//            }
//
//        },


        setDrawTarget: function(image){
            if(this.drawTarget){
                this.drawTarget.setImage(this.drawTarget.image);//reset current images pattern/pixeldata now we have finished drawing to it
                this.scanlineSourceImage = null;
            }
            if(image){
                image.transformToCanvas();//make sure it is a canvas so we can draw to it
                this.drawTarget = image;
                this.drawTargetCanvas = image.image;
                this.drawTargetContext = image.image.getContext('2d');
            } else {
                this.drawTarget = null;
                this.drawTargetCanvas = this.canvas;
                this.drawTargetContext = this.context;
            }
        },
        getDrawTarget: function(){
            return this.drawTarget;
        },
        niceMod: function(n, m){
            var r = n/m;
            r = r - (r|0);
            return r*m;
        },
        createImage: function(width, height){
            width = width || 1;
            height = height || 1;
            var image = new twod.Image();
            image.buildCanvas(width, height);
            this.imageCache.registerImage(image);
            return image;
        },//creates a new empty image with this size
        freeImage: function(image){
            this.imageCache.removeImage(image);
            image.destroyCanvas();
        },
        loadImage: function(image, url, rectangle, onComplete){
            this.imageCache.loadSubImage(image, url, rectangle, onComplete);
            return image;
        }//loads rectangle subimage from a url
    };
    twod.CanvasContext.prototype = _.extend( new twod.RenderContext(), _.clone(twod.TransformStackContext.mixin), twod.CanvasContext.mixin);


    twod.BufferedImageDrawCommand = function(){};
    twod.BufferedImageDrawCommand.prototype = {
        setupClear: function(){
            this.type = 'C';
        },
        setupDrawImage: function(image, x, y){
            this.type = 'D';
            this.image = image;
            this.x = x;
            this.y = y;
        },
        setupDrawTexture: function(image, x, y, w, h, ox, oy){
            this.type = 'T';
            this.image = image;
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
            this.ox = ox;
            this.oy = oy;
        },
        setupDrawAffine: function(image, a, b, c, d, x, y){
            this.type = 'A';
            this.image = image;
            this.a = a;
            this.b = b;
            this.c = c;
            this.d = d;
            this.x = x;
            this.y = y;
        },
        setupDrawScanline: function(image, y, sx1, sy1, sx2, sy2){
            this.type = 'L';
            this.image = image;
            this.y = y;
            this.sx1 = sx1;
            this.sy1 = sy1;
            this.sx2 = sx2;
            this.sy2 = sy2;
        },
        setupDrawColorMap: function(image, sourceRGBAs, targetRGBAs){
            this.type = 'M';
            this.image = image;
            this.sourceRGBAs = sourceRGBAs;
            this.targetRGBAs = targetRGBAs;
        },
        setupSetDrawTarget: function(image){
            this.type = 'S';
            this.image = image;
        },
        setupFreeImage: function(image){
            this.type = 'F';
            this.image = image;
        }
    };


    twod.BufferedContext = function(){
        twod.RenderContext.apply(this, []);
        twod.TransformStackContext.apply(this, []);
        this.commandStack = [];
        this.commandPointer = 0;
        this.currentDrawTarget = null;
    };
    twod.BufferedContext.mixin = {
        clear: function(){
            this.getNextDrawCommand().setupClear();
        },
        drawImage: function(image, x, y){
            var translation = this.translation;
            this.getNextDrawCommand().setupDrawImage(image, translation.x + x, translation.y + y);
        },
        drawTexture: function(image, x, y, w, h, ox, oy){
            var translation = this.translation;
            this.getNextDrawCommand().setupDrawTexture(image, translation.x + x, translation.y + y, w, h, ox, oy);
        },
        drawAffine: function(image, mx){
            var translation = this.translation;
            this.getNextDrawCommand().setupDrawAffine(image, mx[0], mx[1], mx[2], mx[3], mx[4]+translation.x, mx[5]+translation.y);
        },
        drawScanline: function(image, y, sx1, sy1, sx2, sy2){
            var translation = this.translation;
            this.getNextDrawCommand().setupDrawScanline(image, y, sx1, sy1, sx2, sy2);
        },
        drawColorMap: function(image, sourceRGBAs, targetRGBAs){
            var translation = this.translation;
            this.getNextDrawCommand().setupDrawColorMap(image, sourceRGBAs, targetRGBAs);
        },
        setDrawTarget: function(image){
            this.currentDrawTarget = image;
            this.getNextDrawCommand().setupSetDrawTarget(image);
        },
        getDrawTarget: function(){
            return this.currentDrawTarget;
        },
        freeImage: function(image){
            this.getNextDrawCommand().setupFreeImage(image);
        },
        getNextDrawCommand: function(){
            var commandStack = this.commandStack;
            if(this.commandPointer >= commandStack.length){
                commandStack.push(new twod.BufferedImageDrawCommand());
            }
            var command = commandStack[this.commandPointer];
            this.commandPointer += 1;
            return command;
        },
        clearCommandQueue: function(){
            this.commandPointer = 0;
        },
        flush: function(){
            var commands = this.commandStack;
            var max = this.commandPointer;
            for(var i = 0; i < max; ++i){
                var command = commands[i];
                this.processCommand(command);
            }
            this.clearCommandQueue();
        },
        processCommand: function(drawCommand){}
    };
    twod.BufferedContext.prototype = _.extend( new twod.RenderContext(), _.clone(twod.TransformStackContext.mixin), twod.BufferedContext.mixin);


    twod.BufferedCanvasContext = function(){
        twod.CanvasContext.apply(this);
        twod.BufferedContext.apply(this);
    };
    twod.BufferedCanvasContext.mixin = {
        processCommand: function(command){
            switch(command.type){
                case 'C':
                    twod.CanvasContext.prototype.clear.apply(this);
                    break;
                case 'D':
                    twod.CanvasContext.prototype.drawImage.apply(this, [command.image, command.x, command.y]);
                    break;
                case 'T':
                    twod.CanvasContext.prototype.drawTexture.apply(this, [command.image, command.x, command.y, command.w, command.h, command.ox, command.oy]);
                    break;
                case 'A':
                    twod.CanvasContext.prototype.drawAffine.apply(this, [command.image, command.mx]);
                    break;
                case 'L':
                    twod.CanvasContext.prototype.drawScanline.apply(this, [command.image, command.sx1, command.sy1, command.sx2, command.sy2]);
                    break;
                case 'M':
                    twod.CanvasContext.prototype.drawColorMap.apply(this, [command.image, command.sourceRGBAs, command.targetRGBAs]);
                    break;
                case 'S':
                    twod.CanvasContext.prototype.setDrawTarget.apply(this, [command.image]);
                    break;
                case 'F':
                    twod.CanvasContext.prototype.freeImage.apply(this, [command.image]);
                    break;
            }
        }
    };
    twod.BufferedCanvasContext.prototype = _.extend(
        _.clone(twod.RenderContext.mixin),
        _.clone(twod.CanvasContext.mixin),
        _.clone(twod.BufferedContext.mixin),
        twod.BufferedCanvasContext.mixin);

    twod.BufferedFlashContext = function(){
        twod.BufferedContext.apply(this)
;
    };
    twod.BufferedFlashContext.mixin = {
        init: function($el, options){
            var success = false;
            try{

                var width = options.width;
                var height = options.height;
                var scaling = options.scaling;
                var bgColor = options.bgColor;
                var swfURL = options.swfURL || "assets/swf/twod.swf";
                var expressInstallURL = options.upgradeFlashURL || "assets/swf/expressinstall.swf";

                var uniq = new Date().getTime();
                this.containerid = 'flashcanvas'+uniq;

                this.container = this.createDiv($el, this.containerid);

                bgColor = twod.ColorUtils.objToHex(twod.ColorUtils.uintToObj(bgColor));


                var flashvars = {};
                var params = { menu: "false", allowFullScreen: "false", allowScriptAccess: "always", wmode: "opaque", bgColor: bgColor};
                var attributes = {};

                width = ''+scaling*width+'px';
                height = ''+scaling*height+'px';

                swfobject.embedSWF(swfURL, this.containerid, width, height, "9", expressInstallURL, flashvars, params, attributes);

                this.flushQueue = [];
                this.imageEncoder = new twod.IntEncoder(-1, 2);//allow -1 for null
                this.positionEncoder = new twod.IntEncoder(-64*64*32, 3);
                this.sizeEncoder = new twod.IntEncoder(-64*64*32, 3);
                this.matrixEncoder = new twod.FloatEncoder(-64*32, 1/4096, 4);
                this.colorEncoder = new twod.UIntEncoder();
                this.nullImageID = this.imageEncoder.encode(-1);

                this.imageCreateQueue = [];
                this.imageLoadQueue = [];
                this.imageLoadCallbackMap = {};
                this.nextCallbackID = 0;
                this.swfScale = scaling;
                this.swfScaleDirty = true;
                success = true;

            } catch (e){
                //there was an error preparing!
                success = false;
            }

            if(success){
                this.shouldWatchForFlash = true;
                this.watchForFlashObject();
            } else {
                this.handleBuildFailure();
            }
        },
        watchForFlashObject: function(){
            //todo: after some timeout we assume failure
            if(!this.shouldWatchForFlash){
                //we have cancelled loading
                return;
            }
            var flashObject = this.getFlashObject();
            if(flashObject){
                this.buildComplete.trigger();
            } else {
                setTimeout(_.bind(this.watchForFlashObject, this), 50);
            }
        },
        handleBuildFailure: function(){
            this.shouldWatchForFlash = false;
            this.clear$Elements();
            $('#'+this.containerid).remove();
            this.buildFailed.trigger();
        },
        loadImage: function(image, url, rectangle, onComplete){
            image._flashurl = url;
            image._flashrect = rectangle;
            image._flashcomplete = onComplete;
            image._flashcompleteid = ''+(this.nextCallbackID++);
            this.imageLoadCallbackMap[image._flashcompleteid] = image;
            var flashObject = this.getFlashObject();
            if(flashObject){
                //process load queue if needed
                this.processImageQueue(flashObject);
                this.loadImageFromFlashObject(image, flashObject);
            } else {
//                console.log('pushing to queue');
                this.imageLoadQueue.push(image);
            }
            return image;
        },//loads rectangle subimage from a url into supplied image asynchronously
        createImage: function(width, height){
            width = width || 1;
            height = height || 1;
            var image = new twod.Image();
            image.image = {width: width, height: height};
            image._flashw = width;
            image._flashh = height;

            var flashObject = this.getFlashObject();
            if(flashObject){
                //process load queue if needed
                this.processImageQueue(flashObject);
                this.createImageFromFlashObject(image, flashObject);
            } else {
//                console.log('pushing to queue');
                image.id = this.imageCreateQueue.length;//guess at the id
                image._shortID = this.imageEncoder.encode(image.id);
                this.imageCreateQueue.push(image);
            }
            return image;
        },//loads rectangle subimage from a url

        processImageQueue: function(flashObject){
            if(flashObject){
                var q;
                q = this.imageCreateQueue;
                if(q.length > 0){
                    var max = q.length;
                    for(var i = 0; i < max; ++i){
                        var image = q[i];
                        this.createImageFromFlashObject(image, flashObject);
                    }
                    this.imageCreateQueue = [];
                }

                q = this.imageLoadQueue;
                if(q.length > 0){
                    var max = q.length;
                    for(var i = 0; i < max; ++i){
                        var image = q[i];
                        this.loadImageFromFlashObject(image, flashObject);
                    }
                    this.imageLoadQueue = [];
                }
                if(this.swfScaleDirty){
                    this.swfScaleDirty = false;
                    flashObject.setScale(this.swfScale);
                }
            }
        },
        createImageFromFlashObject: function(image, flashObject){
            var id = flashObject.createImage(image._flashw, image._flashh);
            image.id = Number(id);
            image._shortID = this.imageEncoder.encode(image.id);
            delete image._flashw;
            delete image._flashh;
            return image;
        },
        loadImageFromFlashObject: function(image, flashObject){
            //load the image
            var rectangle = image._flashrect;
            var url = image._flashurl;
            delete image._flashrect;
            delete image._flashurl;
            var callbackId = image._flashcompleteid;
            if(rectangle){
                flashObject.loadSubImage(image.id, url, ''+rectangle.x, ''+rectangle.y, ''+rectangle.w, ''+rectangle.h, callbackId);
            } else {
                flashObject.loadImage(image.id, url, callbackId);
            }
        },
        processImageLoadCallbacks: function(callbacksString){
            if(callbacksString.length > 0){

                var callbackIDs = callbacksString.split(',');
                var max = callbackIDs.length;
                for(var i = 0; i < max; ++i){
                    var callbackID = callbackIDs[i];
                    var parts = callbackID.split(":");
                    var id = parts[0];
                    var w = Number(parts[1]);
                    var h = Number(parts[2]);
                    var image = this.imageLoadCallbackMap[id];
                    image.image = {width: w, height: h};
                    delete this.imageLoadCallbackMap[id];
                    if(image && image._flashcomplete){
                        var callback = image._flashcomplete;
                        delete image._flashcomplete;
                        delete image._flashcompleteid;
                        callback(image);
                    }
                }
            }
        },

        flush: function(){

            var flashObject = this.getFlashObject();
            if(flashObject){

                this.processImageQueue(flashObject);

                var positionEncoder = this.positionEncoder;
                var sizeEncoder = this.sizeEncoder;
                var colorEncoder = this.colorEncoder;
                var matrixEncoder = this.matrixEncoder;
                var commands = this.commandStack;
                var max = this.commandPointer;
                var commandsString = '';

                for(var i = 0; i < max; ++i){
                    var command = commands[i];
                    switch(command.type){
                        case 'C':
                            commandString = 'C';
                            break;
                        case 'D':
                            commandString =
                                'D' +
                                    command.image._shortID +
                                    positionEncoder.encode(command.x) + positionEncoder.encode(command.y);
                            break;
                        case 'T':
                            commandString =
                                'T' +
                                    command.image._shortID +
                                    positionEncoder.encode(command.x) + positionEncoder.encode(command.y) +
                                    sizeEncoder.encode(command.w) + sizeEncoder.encode(command.h) +
                                    positionEncoder.encode(command.ox) + positionEncoder.encode(command.oy);
                            break;
                        case 'S':
                            commandString =
                                'S' +
                                    (command.image?command.image._shortID:this.nullImageID);

                            break;
                        case 'F':
                            commandString =
                                'F' +
                                command.image._shortID;
                            break;
                        case 'A':
                            commandString =
                                'A' +
                                    command.image._shortID +
                                    matrixEncoder.encode(command.a) + matrixEncoder.encode(command.b) +
                                    matrixEncoder.encode(command.c) + matrixEncoder.encode(command.d) +
                                    matrixEncoder.encode(command.x) + matrixEncoder.encode(command.y);
                            break;
                        case 'L':
                            commandString =
                                'L' +
                                    command.image._shortID +
                                    positionEncoder.encode(command.y) +
                                    matrixEncoder.encode(command.sx1) + matrixEncoder.encode(command.sy1) +
                                    matrixEncoder.encode(command.sx2) + matrixEncoder.encode(command.sy2);
                            break;
                        case 'M':
                            commandString =
                                'M' +
                                    command.image._shortID +
                                    colorEncoder.encodeArray(command.sourceRGBAs) +
                                    colorEncoder.encodeArray(command.targetRGBAs);
                            break;
                    }
                    commandsString += commandString;

                }
                this.clearCommandQueue();
                var response = flashObject.processCommands(commandsString);
                this.processImageLoadCallbacks(response);
//                console.log(response);
//                console.log(commandsString.length);
//                console.log(''+ commandsString.length + ": " + (commandsString.length < 100?commandsString:''));
//                if(commandsString.length < 100){
//                    console.log(commandsString);
//                }
            } else {

            }

        },
        getFlashObject: function(){
            if(this.flashObjectFinal){
                return this.flashObjectFinal;
            }
            if(this.flashObject){
                if(this.flashObject.processCommands && this.flashObject.loadImage && this.flashObject.loadSubImage && this.flashObject.createImage){
                    this.flashObjectFinal = this.flashObject;
                    return this.flashObjectFinal;
                }
            }
            //we haven't got it yet. try to get it
            var flashObject;
            flashObject = $('#'+this.containerid)[0];//document.getElementById(this.containerid);
            this.flashObject = flashObject;
//            console.log(flashObject);
            return null;
        },
        setSwfScaling: function(scale){
            this.swfScale = scale;
            this.swfScaleDirty = true;
//            var flashObject = this.getFlashObject();
//            if(flashObject){
//                flashObject.setScale(this.swfScaling);
//            }
        }
    };
    twod.BufferedFlashContext.prototype = _.extend(
        _.clone(twod.BufferedContext.prototype),
        twod.BufferedFlashContext.mixin);





    twod.FloatEncoder = function(minValue, precision, stringLength){
        var lower = 'abcdefghijklmnopqrstuvwxyz';//26
        var upper = lower.toUpperCase();//26
        var numeric = '0123456789';//10
        var other = '+-';
        var all = lower+upper+numeric+other;//64

        this.charString = all;
        this.charMap = {};
        this.chars = [];
        for(var i = 0; i < this.charString.length; ++i){
            var character = this.charString.charAt(i);
            this.chars.push(character);
            this.charMap[character] = i;
        }

        var maxPerChar = this.chars.length;

        var maxI = 1;
        for(var i = 0; i < stringLength; ++i){
            maxI *= maxPerChar;
        }

        if(stringLength > 2){
            this.encode = this.encodeLong;
        } else {
            this.charStrings = [];
            for(var i = 0; i < maxI; ++i){
                var c = i;
                var s = '';
                for(var j = 0; j < stringLength; ++j){
                    var charid = c%maxPerChar;
                    s += this.chars[charid];
                    c = (c/maxPerChar)<<0;
                }
                this.charStrings.push(s);
            }
//            this.encodeFloat = this.encodeFloatLong;
        }
        this.valueDiv = precision;
        this.valueMul = 1/this.valueDiv;
        this.valueRange = maxI*this.valueDiv;
        this.minValue = minValue;
        this.maxValue = this.minValue + this.valueRange - 1;
        this.stringLength = stringLength;
        this.maxPerChar = maxPerChar;
        this.iMaxPerChar = 1/maxPerChar;
    };
    twod.FloatEncoder.prototype = {
        encode: function(value){
            var min = this.minValue;
            var max = this.maxValue;
            value = value < min ? min : value;
            value = value > max ? max : value;
            value = ((value - min)*this.valueMul)<<0;
            var str = this.charStrings[value];
            return str;
        },
        encodeLong: function(value){
            var min = this.minValue;
            var max = this.maxValue;
            value = value < min ? min : value;
            value = value > max ? max : value;
            value = ((value - min)*this.valueMul)<<0;
            var s = '';
            var max = this.stringLength;
            var maxPerChar = this.maxPerChar;
            var iMaxPerChar = this.iMaxPerChar;
            var chars = this.chars;
            for(var i = 0; i < max; ++i){
                var m = value%maxPerChar;
                value = Math.floor(value*iMaxPerChar);
                s += chars[m];
            }
            return s;
        }
    };

    twod.IntEncoder = function(minValue, stringLength){
        var lower = 'abcdefghijklmnopqrstuvwxyz';//26
        var upper = lower.toUpperCase();//26
        var numeric = '0123456789';//10
        var other = '+-';
        var all = lower+upper+numeric+other;//64

        this.charString = all;
        this.charMap = {};
        this.chars = [];
        for(var i = 0; i < this.charString.length; ++i){
            var character = this.charString.charAt(i);
            this.chars.push(character);
            this.charMap[character] = i;
        }

        var maxPerChar = this.chars.length;

        var maxI = 1;
        for(var i = 0; i < stringLength; ++i){
            maxI *= maxPerChar;
        }

        if(stringLength > 2){
            this.encode = this.encodeLong;
        } else {
            this.charStrings = [];
            for(var i = 0; i < maxI; ++i){
                var c = i;
                var s = '';
                for(var j = 0; j < stringLength; ++j){
                    var charid = c%maxPerChar;
                    s += this.chars[charid];
                    c = (c/maxPerChar)<<0;
                }
                this.charStrings.push(s);
            }
//            this.encodeFloat = this.encodeFloatLong;
        }
        this.valueRange = maxI;
        this.minValue = minValue;
        this.maxValue = this.minValue + this.valueRange - 1;
        this.stringLength = stringLength;
        this.maxPerChar = maxPerChar;
        this.iMaxPerChar = 1/maxPerChar;
    };
    twod.IntEncoder.prototype = {
        encode: function(value){
            var min = this.minValue;
            var max = this.maxValue;
            value = value < min ? min : value;
            value = value > max ? max : value;
            value = (value - min)|0;
            var str = this.charStrings[value];
            return str;
        },
        encodeLong: function(value){
            var min = this.minValue;
            var max = this.maxValue;
            value = value < min ? min : value;
            value = value > max ? max : value;
            value = (value - min)|0;
            var s = '';
            var max = this.stringLength;
            var maxPerChar = this.maxPerChar;
            var iMaxPerChar = this.iMaxPerChar;
            var chars = this.chars;
            for(var i = 0; i < max; ++i){
                var m = value%maxPerChar;
                value = Math.floor(value*iMaxPerChar);
                s += chars[m];
            }
            return s;
        }
    };


    twod.UIntEncoder = function(){
        var lower = 'abcdefghijklmnopqrstuvwxyz';//26
        var upper = lower.toUpperCase();//26
        var numeric = '0123456789';//10
        var other = '+-';
        var all = lower+upper+numeric+other;//64

        this.charString = all;
        this.charMap = {};
        this.chars = [];
        for(var i = 0; i < this.charString.length; ++i){
            var character = this.charString.charAt(i);
            this.chars.push(character);
            this.charMap[character] = i;
        }
    };
    twod.UIntEncoder.prototype = {
        encode: function(value){
            var chars = this.chars;
            var str = '';

            var part;
            part = value&0x3f;
            str += chars[part];
            value = value >>> 6;
            part = value&0x3f;
            str += chars[part];
            value = value >>> 6;
            part = value&0x3f;
            str += chars[part];
            value = value >>> 6;
            part = value&0x3f;
            str += chars[part];
            value = value >>> 6;
            part = value&0x3f;
            str += chars[part];
            value = value >>> 6;
            part = value&0x3f;
            str += chars[part];

            return str;
        },
        encodeArray: function(array){
            var length = Math.min(63, array.length);
            var str = this.chars[length];
            for(var i = 0; i < length; ++i){
                str += this.encode(array[i]);
            }
            return str;
        }
    };






    twod.WebGLContext = function(){
        twod.BufferedContext.apply(this);
    };
    twod.WebGLContext.hasWebGL = function(){
//        return false;
        try {
//            var hasGlRenderer = !!window.WebGLRenderingContext;//we could be able to render
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('experimental-webgl');//we can actually do it?
            // console.log('webgl context:');
            // console.log(context);
            var hasContext = !!context;
            if(hasContext){
                var floatExtension = context.getExtension("OES_texture_float");//we use this for float textures
//                console.log(floatExtension);
//                if(context.getShaderPrecisionFormat){
//                    var precision = context.getShaderPrecisionFormat();
//                    console.log(precision);
//                }
                var paramRequirements = {
                    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 3,
                    MAX_CUBE_MAP_TEXTURE_SIZE: 0,
                    MAX_FRAGMENT_UNIFORM_VECTORS: 2,
                    MAX_RENDERBUFFER_SIZE: 2048,
                    MAX_TEXTURE_IMAGE_UNITS: 1,
                    MAX_TEXTURE_SIZE: 4096,
                    MAX_VARYING_VECTORS: 3,
                    MAX_VERTEX_ATTRIBS: 3,
                    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 2,
                    MAX_VERTEX_UNIFORM_VECTORS: 2,
                    MAX_VIEWPORT_DIMS: 2048
                };
                var allSatisfied = true;
                for(var paramName in paramRequirements){
                    var value = context.getParameter(context[paramName]);
                    var required = paramRequirements[paramName];
                    if(_.isNumber(value)){
                        value = [value];
                    }
                    if(_.isNumber(required)){
                        required = [required];
                    }
                    var max = Math.max(required.length, value.length);
                    var satisfied = true;
                    for(var i = 0; i < max; ++i){
                        var v = value[Math.min(i, value.length-1)];
                        var r = required[Math.min(i, required.length-1)];
                        if(v < r){
                            satisfied = false;
                        }
                    }
                    if(!satisfied){
                        //the requirements are not satisfied :(
                        allSatisfied = false;
                    }
//                    console.log(paramName, value, required, satisfied);
                }
                var hasFloatExtension = !!floatExtension;
                return hasFloatExtension && allSatisfied;
            }
        } catch( e ) {
            //some issue. we can't do it
//            console.log(e);
        }
        return false;//some requirement was not met. no webgl. sorry
    };
    twod.WebGLContext.mixin = {
        init: function($el, options){
            var success = false;
            try{
                this._width = options.width;
                this._height = options.height;
                this._scaling = options.scaling;
                this._bgColor = options.bgColor;

                var canvas = this.canvas = this.createCanvas($el);
                canvas.width = this._width*this._scaling;
                canvas.height = this._height*this._scaling;

                this.drawAtlas = false;

                this.mvMatrixPool = new twod.Pool(mat4.create, 64);
                this.mvMatrix = this.mvMatrixPool.pop();
                this.mvMatrixStack = [];
                this.pMatrix = mat4.create();

                this.blockSize = 1024;
                this.bgColor = twod.ColorUtils.objToFloatObj(twod.ColorUtils.uintToObj(this._bgColor));//{r: 0.0, g: 1.0, b: 0.0};

                this.translateX = 0;
                this.translateY = 0;
                this.scale = this._scaling;

                this.currentDrawTarget = null;//draw to stage//stores current target while buffering
                this._currentDrawTarget = null;//this is used internally while processing the buffer
                this._currentDrawTargetWidth = this._width;

                this.imageCache = new twod.ImageCache(true);
                this.imageFreeBuffer = [];

                var copyFShader = ""+
                "#ifdef GL_ES\n"+
                "precision mediump float;\n"+
                "#endif\n"+
                "varying vec2 vTextureCoord;\n"+
                "uniform sampler2D uSampler;\n"+
                "void main(void) {\n"+
                "    gl_FragColor = texture2D(uSampler, vTextureCoord);\n"+
                "}\n";

                var copyVShader = ""+
                "attribute vec3 aVertexPosition;\n"+
                "attribute vec2 aTextureCoord;\n"+
                "uniform mat4 uMVMatrix;\n"+
                "uniform mat4 uPMatrix;\n"+
                "varying vec2 vTextureCoord;\n"+
                "void main(void) {\n"+
                "    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\n"+
                "    vTextureCoord = aTextureCoord;\n"+
                "}\n";


                var fragmentShader = ""+
                "#ifdef GL_ES\n"+
                "precision mediump float;\n"+
                "#endif\n"+
                "varying vec2 vTextureCoord;\n"+
                "varying vec4 vTextureDetails;\n"+
                "varying vec4 vDrawParams;\n"+
                "uniform vec4 uColorMapSource;\n"+
                "uniform vec4 uColorMapTarget;\n"+
                "uniform sampler2D uSampler;\n"+

                "void main(void) {\n"+
                "    float texMode = vDrawParams.y;\n"+
                "    vec2 translation = vTextureCoord.xy;\n"+
                "    translation -= floor(translation);\n"+
                //"    if(texMode == 1.0){\n"+
                //"        translation -= floor(translation);\n"+
                //"    }\n"+
                "    translation = translation*vTextureDetails.zw + vTextureDetails.xy;\n"+
                "    vec4 texColor = texture2D(uSampler, translation);\n"+
                "    if(texMode == 2.0){\n"+
                "        vec4 colorDiff = abs(texColor - uColorMapSource);\n"+
                "        if(texColor == uColorMapSource){\n"+
                "            texColor = uColorMapTarget;\n"+
                "        } else {\n"+
                "            discard;\n"+
                "        }\n"+
                "    }\n"+
                "    gl_FragColor = texColor;\n"+
                "}\n";


                //TODO: improve atlasDataTexture data structure
                var vertexShader = ''+
                "attribute vec3 aVertexPosition;\n"+
                "attribute vec2 aTextureCoord;\n"+
                "attribute float aID;\n"+
                "uniform mat4 uMVMatrix;\n"+
                "uniform mat4 uPMatrix;\n"+
                "uniform sampler2D uDrawCommands;\n"+
                "uniform sampler2D uAtlas;\n"+
                "varying vec2 vTextureCoord;\n"+
                "varying vec4 vTextureDetails;\n"+
                "varying vec4 vDrawParams;\n"+

                "void main(void) {\n"+
                "    vec4 param = texture2D(uDrawCommands, vec2(aID, 0.0));\n"+
                "    vec4 param2 = texture2D(uDrawCommands, vec2(aID, 0.5));\n"+
                "    float texID = param.x;\n"+
                "    float texMode= param.y;\n"+
                "    vec4 texDetails = texture2D(uAtlas, vec2(texID, 0.0));\n"+
                "    vec4 texDetails2 = texture2D(uAtlas, vec2(texID, 0.5));\n"+
                "    float texPixelsW = texDetails2.x;\n"+
                "    float texPixelsH = texDetails2.y;\n"+
                "    float itexPixelsW = texDetails2.z;\n"+
                "    float itexPixelsH = texDetails2.w;\n"+
                "    float tx = param.z;\n"+
                "    if(texMode == 4.0){tx = 0.0;}\n"+
                "    float ty = param.w;\n"+
                "    float sx;\n"+
                "    float sy;\n"+
                "    if(texMode == 0.0){\n"+
                "        sx = texPixelsW;\n"+
                "        sy = texPixelsH;\n"+
                "    } else if(texMode == 3.0){\n"+
                "        sx = texPixelsW;\n"+
                "        sy = texPixelsH;\n"+
                "    } else if(texMode == 4.0){\n"+
                "        sx = param.z;\n"+
                "        sy = 1.0;\n"+
                "    } else {\n"+
                "        sx = param2.z;\n"+
                "        sy = param2.w;\n"+
                "    }\n"+
                "    vec3 scale = vec3(sx, sy, 1.0);\n"+
                "    vec3 position = aVertexPosition*scale;\n"+
                "    if(texMode == 3.0){\n"+
                "        float a = param2.x;\n"+
                "        float b = param2.y;\n"+
                "        float c = param2.z;\n"+
                "        float d = param2.w;\n"+
                "        mat3 affine = mat3(a, c, 0, b, d, 0, 0, 0, 1);\n"+
                "        position = position * affine;\n"+
                "    }\n"+
                "    gl_Position = uPMatrix * uMVMatrix * vec4(position + vec3(tx, ty, 0), 1.0);\n"+
                "    vTextureCoord = (aTextureCoord*vec2(sx, sy));\n"+
                "    if(texMode == 1.0){\n"+
                "        float ox = param2.x;\n"+
                "        float oy = param2.y;\n"+
                "        vTextureCoord = vTextureCoord - vec2(ox, oy);\n"+
                "    }\n"+
                "    if(texMode == 4.0){\n"+
                "        vec2 s1 = param2.xy;\n"+
                "        vec2 s2 = param2.zw;\n"+
                "        vTextureCoord = (aTextureCoord.xx*(s2-s1)+s1+vec2(0.0,0.0));\n"+
                "    }\n"+
                "    vTextureCoord = vTextureCoord*vec2(itexPixelsW, itexPixelsH);\n"+
                "    vTextureDetails = texDetails;\n"+
                "    vDrawParams = param;\n"+
                "}\n";


                // this.initGL(this.canvas);
                var glu = this.glu = new GLU.Context();
                glu.initGL(this.canvas);
                this.gl = glu.gl;
                var gl = this.gl;
                this.updateSize();

                this.atlasProgram = glu.Program(
                    [glu.Shader(null, fragmentShader, false), glu.Shader(null, vertexShader, true)],//shaders
                    ['aVertexPosition', 'aTextureCoord', 'aID'],//attributes
                    ['uMVMatrix', 'uPMatrix', 'uColorMapSource', 'uColorMapTarget', 'uDrawCommands', 'uAtlas', 'uSampler']//uniforms//'uScale', 'uTranslate',
                );
                this.atlasProgram.unbind();



                this.copyProgram = glu.Program(
                    [glu.Shader(null, copyFShader, false), glu.Shader(null, copyVShader, true)],//shaders
                    ['aVertexPosition', 'aTextureCoord'],//attributes
                    ['uMVMatrix', 'uPMatrix', 'uSampler']//uniforms
                );
                this.copyProgram.unbind();

                this.debugProgram = glu.Program(
                    [glu.Shader(null, copyFShader, false), glu.Shader(null, copyVShader, true)],//shaders
                    ['aVertexPosition', 'aTextureCoord'],//attributes
                    ['uMVMatrix', 'uPMatrix', 'uSampler']//uniforms
                );
                this.debugProgram.unbind();


                this.initBuffers();
                this.initCopyPlane();

                this.uMVMatrix = glu.Uniform('uMVMatrix', 'Matrix4fv', {matrix: this.mvMatrix, transpose: false}, ['transpose', 'matrix']);
                this.uPMatrix = glu.Uniform('uPMatrix', 'Matrix4fv', {matrix: this.pMatrix, transpose: false}, ['transpose', 'matrix']);
                this.uColorMapSource = glu.Uniform('uColorMapSource', '4fv', {color: new Float32Array([1.0, 1.0, 1.0, 1.0])});
                this.uColorMapTarget = glu.Uniform('uColorMapTarget', '4fv', {color: new Float32Array([1.0, 0.0, 1.0, 1.0])});


                this.atlasFBO = glu.Framebuffer();
                this.atlasFBO.setSize(this.imageCache.atlas.width, this.imageCache.atlas.height);
                this.atlasTexture = this.atlasFBO.texture;
                this.atlasMaterial = glu.Material(this.atlasProgram, {uDrawCommands: this.drawCommandsTexture, uAtlas: this.atlasDataTexture, uSampler: this.atlasTexture});
                this.atlasMaterial.blendFunction = this.atlasMaterial.blendingParticles;


                this.atlasObject = glu.Object(this.atlasGeometry, this.atlasMaterial, [this.uMVMatrix, this.uPMatrix, this.uColorMapSource, this.uColorMapTarget]);//, this.uScale, this.uTranslate


                this.copyFBO = glu.Framebuffer();
                this.copyFBO.setSize(256, 256);
                this.copyCanvas = twod.ImageUtil.createCanvas();
                this.copyCanvasContext = this.copyCanvas.getContext('2d');
                this.copyCanvas.width = this.copyFBO.texture.width;
                this.copyCanvas.height = this.copyFBO.texture.height;
                this.copyFBO.texture.setImage(this.copyCanvas);
                this.copyMaterial = glu.Material(this.copyProgram, {uSampler: this.copyFBO.texture});
                this.copyMaterial.blendFunction = function(){
                    this.gl.disable(this.gl.BLEND);
                    this.gl.disable(this.gl.DEPTH_TEST);
//                this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);
                    this.gl.disable(this.gl.CULL_FACE);
                };
                this.copyObject = glu.Object(this.copyGeometry, this.copyMaterial, [this.uMVMatrix, this.uPMatrix]);


                this.debugMaterial = glu.Material(this.debugProgram, {uSampler: this.atlasFBO.texture});
                this.debugMaterial.blendFunction = this.debugMaterial.blendingParticles;
                this.debugGeometry = glu.Geometry();
                this.debugGeometry.makeRect(64, 64, null, 'aVertexPosition', 'aTextureCoord');
                this.debugObject = glu.Object(this.debugGeometry, this.debugMaterial, [this.uMVMatrix, this.uPMatrix]);



//                this.mainImage = this.createImage(this._width, this._height);

                var checkRunning = this.checkRunningStatus();
                if(!checkRunning){
                    throw {
                        name: "WebGLRendererError",
                        message: "WebGL is initialised but drawing is not working somehow"
                    };
                }

                success = true;

            } catch (e){
                //there was an error preparing!
               console.log(e);
               console.log(e.stack);
                success = false;
            }

            if(success){
                this.buildComplete.trigger();
            } else {
                this.clear$Elements();
                this.buildFailed.trigger();
            }

        },
        initGL: function (canvas) {
            var gl;
            try {
                gl = canvas.getContext("experimental-webgl", {antialias: false, preserveDrawingBuffer: true});
//                gl = WebGLDebugUtils.makeDebugContext();
                var getExt = gl.getExtension("OES_texture_float");//we use this for float textures
                gl.clearColor(0.0, 0.0, 0.0, 0.0);
                gl.enable(gl.DEPTH_TEST);
                this.gl = gl;

            } catch (e) {
                throw {
                    name: "WebGLRendererError",
                    message: 'Could not create WebGL context'
                };
            }
            if (!this.gl) {
                throw {
                    name: "WebGLRendererError",
                    message: "Could not initialise WebGL, sorry :-("
                };
            }
        },
        initBuffers: function() {
            var gl = this.gl;
            var glu = this.glu;
            var atlasGeometry = this.atlasGeometry = glu.Geometry();

            var blockSize = this.blockSize;
            var vertices = [];
            for(var i = 0; i < blockSize; ++i){
                vertices.push(
                    0.0, 0.0,  0,
                    1.0, 0.0,  0,
                    1.0,  1.0,  0,
                    0.0, 0.0,  0,
                    1.0,  1.0,  0,
                    0.0,  1.0,  0
                );
            }
            var vertexBuffer = glu.Buffer(gl.ARRAY_BUFFER, gl.FLOAT, 3, gl.STATIC_DRAW);
            vertexBuffer.setArray(vertices);
            atlasGeometry.buffers.aVertexPosition = vertexBuffer;


            var textureCoords = [];
            var subTexSize = 1;
            for(var i = 0; i < blockSize; ++i){
                textureCoords.push(
                    0.0, 0.0,
                    subTexSize, 0.0,
                    subTexSize, subTexSize,
                    0.0, 0.0,
                    subTexSize, subTexSize,
                    0.0, subTexSize
                );
            }
            var texBuffer = glu.Buffer(gl.ARRAY_BUFFER, gl.FLOAT, 2, gl.STATIC_DRAW);
            texBuffer.setArray(textureCoords);
            atlasGeometry.buffers.aTextureCoord = texBuffer;


            var ids = [];
            for(var i = 0; i < blockSize; ++i){
                for(var j = 0; j < 6; ++j){
                    ids.push(i/blockSize);
                }
            }
            var idBuffer = glu.Buffer(gl.ARRAY_BUFFER, gl.FLOAT, 1, gl.STATIC_DRAW);
            idBuffer.setArray(ids);
            atlasGeometry.buffers.aID = idBuffer;


            var indices = [];
            for(var i = 0; i < blockSize; ++i){
                var j = i*6;
                indices.push(j+0, j+1, j+2, j+3, j+4, j+5);
            }
            var indexBuffer = glu.Buffer(gl.ELEMENT_ARRAY_BUFFER, gl.UNSIGNED_SHORT, 1, gl.STATIC_DRAW);
            indexBuffer.setArray(indices);
            atlasGeometry.indices = indexBuffer;


            //TODO. 4096 is a bit wide for some users webgl. perhaps wrap atlasDataTexture into multiple rows instead of being so very wide
            var numTextures = 4096;
            this.numTexIDs = 4096;
            var atlas = [];
            var texW = 64;
            var texH = 64;
            var atlasW = this.imageCache.atlas.width;
            var atlasH = this.imageCache.atlas.height;
            for(var i = 0; i < numTextures; ++i){
                var texX = 0;
                var texY = 0;
                atlas.push(texX, texY, -texW/atlasW, -texH/atlasH);
            }
            for(var i = 0; i < numTextures; ++i){
                atlas.push(texW, texH, 1/texW, 1/texH);
            }
            var atlasDataArray = new Float32Array(atlas);
            var atlasDataTexture = this.atlasDataTexture = glu.Texture();
            atlasDataTexture.array = atlasDataArray;
            atlasDataTexture.width = numTextures;
            atlasDataTexture.height = 2;
            this.updateAtlasDataTexture();


            var drawCommands = [];
            for(var i = 0; i < blockSize; ++i){
                drawCommands.push(0, 0, 0, 0);
            }
            for(var i = 0; i < blockSize; ++i){
                drawCommands.push(0, 0, 0, 0);
            }
            var drawCommandsArray = new Float32Array(drawCommands);
            var drawCommandsTexture = this.drawCommandsTexture = glu.Texture();
            drawCommandsTexture.array = drawCommandsArray;
            drawCommandsTexture.width = blockSize;
            drawCommandsTexture.height = 2;
            this.updateDrawCommandsTexture();

        },
        updateDrawCommandsTexture: function (){
            var drawCommandsTexture = this.drawCommandsTexture;
            drawCommandsTexture.setFloatData(drawCommandsTexture.array, drawCommandsTexture.width, drawCommandsTexture.height);
        },
        updateAtlasDataTexture: function (){
            var drawCommandsTexture = this.atlasDataTexture;
            drawCommandsTexture.setFloatData(drawCommandsTexture.array, drawCommandsTexture.width, drawCommandsTexture.height);
        },
        updateColorMapUniform: function(rgba, uniform){
            rgba = rgba&0xFFFFFFFF;
            var sr = (rgba>>24)&0xff;//avoid bit cycling
            var sg = (rgba>>16)&0xff;
            var sb = (rgba>>8)&0xff;
            var sa = (rgba)&0xff;
            var colorArray = uniform.color;
            colorArray[0] = sr/255;
            colorArray[1] = sg/255;
            colorArray[2] = sb/255;
            colorArray[3] = sa/255;
        },
        initCopyPlane: function(){
            var glu = this.glu;
            var gl = this.gl;
            var geom = glu.Geometry();
            geom.makeRect(1, 1);

            var vertexBuffer = glu.Buffer(gl.ARRAY_BUFFER, gl.FLOAT, 3, gl.STATIC_DRAW);
            var vertexArray = [
                0, 0, 0,
                1, 0, 0,
                1, 1, 0,
                0, 1, 0
            ];
            vertexBuffer.setArray(vertexArray);
            vertexBuffer.array = vertexArray;
            geom.buffers.aVertexPosition = vertexBuffer;

            var texBuffer = glu.Buffer(gl.ARRAY_BUFFER, gl.FLOAT, 2, gl.STATIC_DRAW);
            var texArray = [
                0.0, 0.0,
                1.0, 0.0,
                1.0, 1.0,
                0.0, 1.0
            ];
            texBuffer.setArray(texArray);
            texBuffer.array = texArray;
            geom.buffers.aTextureCoord = texBuffer;

            var indexBuffer = glu.Buffer(gl.ELEMENT_ARRAY_BUFFER, gl.UNSIGNED_SHORT, 1, gl.STATIC_DRAW);
            var indexArray = [
                0, 1, 2,
                0, 2, 3
            ];
            indexBuffer.setArray(indexArray);
            indexBuffer.array = indexArray;
            geom.indices = indexBuffer;
            this.copyGeometry = geom;
        },
        updateCopyPlane: function(sourceRect, targetRect){
            var geom = this.copyGeometry;

            var vertexBuffer = geom.buffers.aVertexPosition;
            var vertexArray = vertexBuffer.array;

            var texBuffer = geom.buffers.aTextureCoord;
            var texArray = texBuffer.array;

            var sourcePoints = sourceRect.getVec2Points();
            var targetPoints = targetRect.getVec2Points();

            for(var i = 0; i < 4; ++i){
                texArray[i*2] = sourcePoints[i][0];
                texArray[i*2+1] = sourcePoints[i][1];
                vertexArray[i*3] = targetPoints[i][0];
                vertexArray[i*3+1] = targetPoints[i][1];
            }

            vertexBuffer.setArray(vertexArray);
            texBuffer.setArray(texArray);
        },
        updateSize: function (){
            this.gl.viewportWidth = this.canvas.width;
            this.gl.viewportHeight = this.canvas.height;
        },
        mvPushMatrix: function () {
            var copy = this.mvMatrixPool.pop();
            mat4.set(this.mvMatrix, copy);
            this.mvMatrixStack.push(copy);
        },
        mvPopMatrix: function () {
            if (this.mvMatrixStack.length === 0) {
                throw "Invalid popMatrix!";
            }
            this.mvMatrixPool.push(this.mvMatrix);
            this.mvMatrix = this.mvMatrixStack.pop();
        },
//        mvClearMatrixStack: function(){
//            this.mvMatrixStack = [];
//        },
        updateAtlas: function(){
            if(this.imageCache.atlas.hasNewImageNodes()){
                var newNodes = this.imageCache.atlas.getNewImageNodes();
                var numNew = newNodes.length;
                if(numNew > 0){
                    if(this.currentDrawTarget){
                        console.log('draw target is set. whats going on?');
                    }
                    for(var i = 0; i < numNew; ++i){
                        var node = newNodes[i];
                        this.copyToAtlas(node);
                    }
                    this.updateAtlasDataTexture();
                }
                this.imageCache.atlas.clearNewImageNodes();
            }
        },
        copyToAtlas: function(node){
            var context = this.copyCanvasContext;
            var rect = node.rectangle;
            var copyW = this.copyCanvas.width;
            var copyH = this.copyCanvas.height;
            var imageW = node.rectangle.w;
            var imageH = node.rectangle.h;
            if(imageW <= copyW && imageH <= copyH){
                context.clearRect(0, 0, imageW, imageH);
                context.drawImage(node.image.image, 0, 0);
                this.copyFBO.texture.setImage(this.copyCanvas);
                this.copyRectToAtlas(rect);
            } else {
                //copy in several chunks!
                var chunkRect = new twod.Rectangle(0, 0, 0, 0);
                for(var i = 0; i < imageW; i+= copyW){
                    for(var j = 0; j < imageH; j += copyH){
                        var chunkW = Math.min(imageW - i, copyW);
                        var chunkH = Math.min(imageH - j, copyH);
                        context.clearRect(0, 0, chunkW, chunkH);
                        context.drawImage(node.image.image, -i, -j);
                        this.copyFBO.texture.setImage(this.copyCanvas);
                        chunkRect.x = rect.x+i;
                        chunkRect.y = rect.y+j;
                        chunkRect.w = chunkW;
                        chunkRect.h = chunkH;
                        this.copyRectToAtlas(chunkRect);
                    }
                }
            }
            this.updateAtlasNode(node);
        },
        copyRectToAtlas: function(atlasRect){
            this.mvPushMatrix();
            this.atlasFBO.bind();
            this.setupViewPort(this.atlasFBO.texture.width, this.atlasFBO.texture.height, 1);

            var sourceRect = new twod.Rectangle(0, 1, atlasRect.w/this.copyFBO.texture.width, -atlasRect.h/this.copyFBO.texture.height);
            var targetRect = new twod.Rectangle(atlasRect.x, atlasRect.y, atlasRect.w, atlasRect.h);
            this.updateCopyPlane(sourceRect, targetRect);
            this.copyObject.bind();
            this.copyObject.draw();
            this.copyObject.unbind();

            this.atlasFBO.unbind();
            this.mvPopMatrix();
        },
        updateAtlasNode: function(node){
            var offset = node.image.id*4;
            var rect = node.rectangle;
            var tw = this.atlasTexture.width;
            var th = this.atlasTexture.height;
            var atlasArray = this.atlasDataTexture.array;
            atlasArray[offset+0] = rect.x/tw;
            atlasArray[offset+1] = 1-rect.y/th;
            atlasArray[offset+2] = rect.w/tw;
            atlasArray[offset+3] = -rect.h/th;

            offset += this.numTexIDs*4;

            atlasArray[offset+0] = rect.w;
            atlasArray[offset+1] = rect.h;
            atlasArray[offset+2] = 1/rect.w;
            atlasArray[offset+3] = 1/rect.h;
        },
        processCommandQueue: function(){
            var blockSize = this.blockSize;
            var drawCommandsTexture = this.drawCommandsTexture;
            var drawCommandsArray = drawCommandsTexture.array;
            var row1 = drawCommandsTexture.width*4;
            var commands = this.commandStack;

            //label this so switch can break it
            commandloop:
            while(this.bufferCount < blockSize && this.processCommand < this.commandPointer){
                var j = this.bufferCount*4;
                var command = commands[this.processCommand];
                ++this.processCommand;
                switch(command.type){
                    case 'D':
                        drawCommandsArray[j] = command.image._texID;
                        drawCommandsArray[j+1] = 0;
                        drawCommandsArray[j+2] = command.x;
                        drawCommandsArray[j+3] = command.y;
                        ++this.bufferCount;
                        break;
                    case 'A':
                        drawCommandsArray[j] = command.image._texID;
                        drawCommandsArray[j+1] = 3;
                        drawCommandsArray[j+2] = command.x;
                        drawCommandsArray[j+3] = command.y;
                        drawCommandsArray[j+row1] = command.a;
                        drawCommandsArray[j+row1+1] = command.b;
                        drawCommandsArray[j+row1+2] = command.c;
                        drawCommandsArray[j+row1+3] = command.d;
                        ++this.bufferCount;
                        break;
                    case 'T':
                        drawCommandsArray[j] = command.image._texID;
                        drawCommandsArray[j+1] = 1;
                        drawCommandsArray[j+2] = command.x;
                        drawCommandsArray[j+3] = command.y;
                        drawCommandsArray[j+row1] = command.ox;
                        drawCommandsArray[j+row1+1] = command.oy;
                        drawCommandsArray[j+row1+2] = command.w;
                        drawCommandsArray[j+row1+3] = command.h;
                        ++this.bufferCount;
                        break;
                    case 'L':
                        drawCommandsArray[j] = command.image._texID;
                        drawCommandsArray[j+1] = 4;
                        drawCommandsArray[j+2] = this._currentDrawTargetWidth;
                        drawCommandsArray[j+3] = command.y;
                        drawCommandsArray[j+row1] = command.sx1;
                        drawCommandsArray[j+row1+1] = command.sy1;
                        drawCommandsArray[j+row1+2] = command.sx2;
                        drawCommandsArray[j+row1+3] = command.sy2;
                        ++this.bufferCount;
                        break;
                    case 'M':
                        this.flushDrawBuffer();
                        this.processColorMapDraw(command);
                        break commandloop;
                    case 'S':
                        //need to flush before this!
                        this.flushDrawBuffer();
                        this.handleSetDrawTarget(command.image);
                        //copy old contents into copy fbo!
                        if(command.image){
                            j = 0;
                            drawCommandsArray[j] = command.image._texID;
                            drawCommandsArray[j+1] = 0;
                            drawCommandsArray[j+2] = 0;
                            drawCommandsArray[j+3] = 0;
                            ++this.bufferCount;
                        }
                        break commandloop;
                    case 'F':
                        this.imageFreeBuffer.push(command.image);
                        break;
                    case 'C':
                        this.flushDrawBuffer();
                        this.handleClear();
                        break commandloop;
                }

            }
            this.flushDrawBuffer();
        },
        processColorMapDraw: function(command){
            var blockSize = this.blockSize;
            var drawCommandsTexture = this.drawCommandsTexture;
            var drawCommandsArray = drawCommandsTexture.array;
            var row1 = drawCommandsTexture.width*4;
            var sourceRGBAs = command.sourceRGBAs;
            var targetRGBAs = command.targetRGBAs;
            var numMaps = Math.min(sourceRGBAs.length, targetRGBAs.length);
            if(numMaps > 0){

                var j = 0;
                drawCommandsArray[j] = command.image._texID;
                drawCommandsArray[j+1] = 2;
                drawCommandsArray[j+2] = 0;
                drawCommandsArray[j+3] = 0;
                drawCommandsArray[j+row1+2] = command.image.image.width;
                drawCommandsArray[j+row1+3] = command.image.image.height;

                this.updateDrawCommandsTexture();
                this.bufferCount = 1;
                for(var i = 0; i < numMaps; ++i){
                    this.updateColorMapUniform(sourceRGBAs[i], this.uColorMapSource);
                    this.updateColorMapUniform(targetRGBAs[i], this.uColorMapTarget);
                    this.atlasObject.bind();
                    this.atlasObject.drawNum(this.bufferCount*6);
                }
                this.atlasObject.unbind();
                this.bufferCount = 0;
            }
         },
        handleSetDrawTarget: function(target){
            if(target != this._currentDrawTarget){
                //draw target has changed!

                if(this._currentDrawTarget != null){
                    this.endDrawingToTarget();
                }

                if(target != null){
                    this.beginDrawingToTarget(target);
                }
            }
        },
        beginDrawingToTarget: function(target){
            //we need to prepare fbo drawing for a new target
            //                    console.log('bind');
            //need to draw old atlas contents into copyfbo!
//            var actualTarget = target||this.mainImage;
            this.mvPushMatrix();
            this.copyFBO.bind();
            this.setupViewPort(this.copyFBO.texture.width, this.copyFBO.texture.height, 1);
            this._currentDrawTarget = target;
            this._currentDrawTargetWidth = target.getWidth();
            this.handleClear();
        },
        endDrawingToTarget: function(){
            //we need to flush the current target
//                    console.log('unbind');
//            var actualTarget = this._currentDrawTarget||this.mainImage;
            this.copyFBO.unbind();
            this.mvPopMatrix();

            var atlasRect = this._currentDrawTarget._atlasNode.rectangle;
            this.copyRectToAtlas(atlasRect);

            this._currentDrawTarget = null;
            this._currentDrawTargetWidth = this._width;
            this.setupViewPort();
        },
        handleClear: function(){
            if(this._currentDrawTarget !== null){
                this.gl.clearColor(0, 0, 0, 0);
            } else {
                var c = this.bgColor;
                this.gl.clearColor(c.r, c.g, c.b, c.a);
            }
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        },
        flushDrawBuffer: function(){
            if(this.bufferCount > 0){
                this.updateDrawCommandsTexture();
                this.atlasObject.bind();
                this.atlasObject.drawNum(this.bufferCount*6);
                this.atlasObject.unbind();
                this.bufferCount = 0;
            }
        },
        setupViewPort: function(viewportWidth, viewportHeight, viewportScale){
            var gl = this.gl;
            viewportScale = viewportScale || this.scale;
            viewportWidth = viewportWidth|| gl.viewportWidth;
            viewportHeight = viewportHeight|| gl.viewportHeight;

            gl.viewport(0, 0, viewportWidth, viewportHeight);

            var fovY = 90;

            var aspect = viewportWidth / viewportHeight;
            mat4.perspective(fovY, aspect, 0.1, 100.0, this.pMatrix);
            mat4.identity(this.mvMatrix);
            mat4.translate(this.mvMatrix, [0, 0, -1]);

            var scale = 2/viewportHeight;

            mat4.scale(this.mvMatrix, [scale, -scale, 1]);
            mat4.translate(this.mvMatrix, [-viewportWidth*0.5, -viewportHeight*0.5, 0]);


            mat4.translate(this.mvMatrix, [this.translateX, this.translateY, 0]);
            mat4.scale(this.mvMatrix, [viewportScale, viewportScale, 1]);

            this.uMVMatrix.matrix = this.mvMatrix;
            this.uPMatrix.matrix = this.pMatrix;
        },
        flush: function () {
//            if(!enable){
//                this.clearCommandQueue();
//                return;
//            }
            if(this.atlasTexture.width === 0){
                //don't draw until the texture is loaded!
                return;
            }
            this.updateSize();
            this.updateAtlas();
            var gl = this.gl;
            this.mvPushMatrix();
            this.setupViewPort();
//            this.handleClear();
//            this.beginDrawingToTarget(null);


            this.processCommand = 0;
            this.bufferCount = 0;
            while(this.processCommand < this.commandPointer){
                this.processCommandQueue();
            }
            this.clearCommandQueue();
            this.processImageFreeBuffer();


//            this.endDrawingToTarget();
            //copy old contents into copy fbo!
//            if(command.image){
//            var drawCommandsTexture = this.drawCommandsTexture;
//            var drawCommandsArray = drawCommandsTexture.array;
//            drawCommandsArray[0] = this.mainImage._texID;
//            drawCommandsArray[1] = 0;
//            drawCommandsArray[2] = 0;
//            drawCommandsArray[3] = 0;
//            ++this.bufferCount;
//            this.flushDrawBuffer();


//            this.updateCopyPlane(new twod.Rectangle(0, 0, 1, 1), new twod.Rectangle(this._width/2, this._height/2, this._width/2, this._height/2));
//            this.copyObject.bind();
//            this.copyObject.draw();
//            this.copyObject.unbind();
//
//            var drawAtlas = false;
            if(this.drawAtlas){
                this.setupViewPort();
                this.mvPushMatrix();
                mat4.translate(this.mvMatrix, [this._width/2, this._height/2, 0]);
                mat4.scale(this.mvMatrix, [1, -1, 0]);
                mat4.scale(this.mvMatrix, [this._width/64, this._height/64, 0]);
                this.debugObject.bind();
                this.debugObject.draw();
                this.debugObject.unbind();
                this.mvPopMatrix();
            }

            this.mvPopMatrix();

        },
        createImage: function(width, height){
            width = width||1;
            height = height||1;
            var image = new twod.Image();
            image.buildCanvas(width, height);
            this.imageCache.registerImage(image);
            image._texID = image.id/this.numTexIDs;
            return image;
        },
        loadImage: function(image, url, rectangle, onComplete){
            var loaded = function(){
                if(onComplete){
                    onComplete(image);
                }
            };
            this.imageCache.loadSubImage(image, url, rectangle, loaded);
            return image;
        },
        processImageFreeBuffer: function(){
            var buffer = this.imageFreeBuffer;
            var max = buffer.length;
            for(var i = 0; i < max; ++i){
                var image = buffer[i];
                this.imageCache.removeImage(image);
                image.destroyCanvas();
                image._texID = undefined;
            }
            this.imageFreeBuffer = [];
        },
        checkRunningStatus: function(){
            //attempt to check all drawing operations are working

            var oldScaling = this.scale;
            this.scale = 1;


            //draw some horizontal stripes r, g, b, black
            var imported = this.createImage(4, 4);
            imported.transformToCanvas();
            var importedContext = imported.image.getContext('2d');
            importedContext.fillStyle = '#ff0000';
            importedContext.fillRect(0, 0, 4, 1);
            importedContext.fillStyle = '#00ff00';
            importedContext.fillRect(0, 1, 4, 1);
            importedContext.fillStyle = '#0000ff';
            importedContext.fillRect(0, 2, 4, 1);
            importedContext.fillStyle = '#000000';
            importedContext.fillRect(0, 3, 4, 1);

            //flip along the diagonal to make vertical stripes
            var transformed = this.createImage(4, 4);
            this.setDrawTarget(transformed);
            this.drawAffine(imported, [0, 1, 1, 0, 0, 0]);

            //map colors
            var colorMapped = this.createImage(4, 4);
            this.setDrawTarget(colorMapped);
            this.drawImage(transformed, 0, 0);
            this.drawColorMap(transformed, [0xff0000ff, 0x00ff00ff, 0x0000ffff, 0x000000ff], [0xffff00ff, 0x00ffffff, 0xff00ffff, 0x808080ff]);

            //draw offset as a repeating pattern
            var textured = this.createImage(4, 4);
            this.setDrawTarget(textured);
            this.drawTexture(colorMapped, -2, -2, 8, 8, 1, 1);

            //draw to output
            this.setDrawTarget(null);
            this.drawImage(textured, 0, 0);
            this.flush();
            this.freeImage(textured);
            this.freeImage(colorMapped);
            this.freeImage(transformed);
            this.freeImage(imported);

            //draw into a canvas and check the pixels match what we expected
            var checkCanvas = twod.ImageUtil.createCanvas();
            checkCanvas.width = 4;
            checkCanvas.height = 4;
            var checkContext = checkCanvas.getContext('2d');
            checkContext.drawImage(this.canvas, 0, 0);
            var checkImageData = checkContext.getImageData(0, 0, checkCanvas.width, checkCanvas.height);
            var checkImagePixels = checkImageData.data;
            var expected = [
                0, 255, 255, 255,
                255, 0, 255, 255,
                128, 128, 128, 255,
                255, 255, 0, 255
            ];

            var match = true;
            for(var i = 0; i < expected.length; ++i){
                if(checkImagePixels[i] !== expected[i]){
                    match = false;
                    break;
                }
            }

            this.clear();//clear away the mess we made
            this.flush(true);

            this.scale = oldScaling;
            return match;
        }
//        setWidth: function(width){
//            console.log('setwidth', width);
//            this.canvas.width = width;
//        },
//        setHeight: function(height){
//            console.log('setHeight', height);
//            this.canvas.height = height;
//        }
    };

    twod.WebGLContext.prototype = _.extend(
        _.clone(twod.RenderContext.mixin),
        _.clone(twod.BufferedContext.mixin),
        _.clone(twod.TransformStackContext.mixin),
        twod.WebGLContext.mixin);





    twod.AtlasNode = function(rectangle){
        this.rectangle = rectangle;
    };
    twod.AtlasNode.prototype = {
        rectangle: null,
        childA: null,
        childB: null,
        image: null,
        parent: null,
        remove: function(img){
            if(this.image !== null){
                if(this.image === img){
                    this.image = null;
                    if(this.parent){
                        this.parent.childRemoved();
                    }
                    return this;
                }
            }
            if(this.childA){
                return this.childA.remove(img) || this.childB.remove(img);
            }
            return null;
        },
        childRemoved: function(){
            //a child was just removed. if both children are null
            if(this.childA.isEmpty() && this.childB.isEmpty()){
                this.childA.parent = null;
                this.childB.parent = null;
                this.childA = null;
                this.childB = null;

                if(this.parent){
                    this.parent.childRemoved();
                }
            }
        },
        insert: function(img){
            if(this.childA){
//                console.log('trying to insert into children');
                var newNode = this.childA.insert(img) || this.childB.insert(img);
                return newNode;
            } else if(this.image !== null){
//                console.log('we already have an image');
                return null;
            }

            var rectWidth = this.rectangle.w;
            var rectHeight = this.rectangle.h;
            var imageWidth = img.getWidth();
            var imageHeight = img.getHeight();
            if(imageWidth > rectWidth || imageHeight > rectHeight){
//                console.log('image will not fit');
                return null;
            }

            if(imageWidth === rectWidth && imageHeight === rectHeight){
                this.image = img;
                return this;
            }
            var rectA;
            var rectB;

            var dw = rectWidth - imageWidth;
            var dh = rectHeight - imageHeight;
            var rectX = this.rectangle.x;
            var rectY = this.rectangle.y;

            if(dw > dh){
                rectA = new twod.Rectangle(rectX, rectY, imageWidth, rectHeight);
                rectB = new twod.Rectangle(rectX+imageWidth, rectY, rectWidth-imageWidth, rectHeight);
            } else {
                rectA = new twod.Rectangle(rectX, rectY, rectWidth, imageHeight);
                rectB = new twod.Rectangle(rectX, rectY+imageHeight, rectWidth, rectHeight-imageHeight);
            }
            this.childA = new twod.AtlasNode(rectA);
            this.childB = new twod.AtlasNode(rectB);
            this.childA.parent = this;
            this.childB.parent = this;

            return this.childA.insert(img);
        },
        isEmpty: function(){
            return !this.childA && !this.image;
        },
        getImageNodes: function(){
            var result = [];
            if(this.childA){
                result = result.concat(this.childA.getImageNodes());
                result = result.concat(this.childB.getImageNodes());
            } else if(this.image !== null){
                result.push(this);
            }
            return result;
        }
    };

    twod.Atlas = function(width, height){
        this.width = width;
        this.height = height;
        this.reset();
        this.newNodes = [];
    };
    twod.Atlas.prototype = {
        reset: function(){
            this.node = new twod.AtlasNode(new twod.Rectangle(0, 0, this.width, this.height));
        },
        insert: function(image){
            var node = this.node.insert(image);
            if(node){
                this.newNodes.push(node);
            }
            return node;
        },
        remove: function(image, node){
            if(node){
                node.remove(image);
            }
        },
        getImageNodes: function(){
            return this.node.getImageNodes();
        },
        hasNewImageNodes: function(){
            var currentNodes = this.newNodes;
            var numNodes = currentNodes.length;
            for(var i = 0; i < numNodes; ++i){
                var node = currentNodes[i];
                if(node.image){
                    return true;
                }
            }
            return false;
        },
        getNewImageNodes: function(){
            var currentNodes = this.newNodes;
            var result = [];
            var numNodes = currentNodes.length;
            for(var i = 0; i < numNodes; ++i){
                var node = currentNodes[i];
                if(node.image){
                    result.push(node);
                }
            }
            return result;
        },
        clearNewImageNodes: function(){
            this.newNodes = [];
        },
        drawToCanvasContext: function(context, specificNodes){
            var nodes = specificNodes || this.getImageNodes();
            for(var i = 0; i < nodes.length; ++i){
                var node = nodes[i];
                if(!node.image){
                } else {
                    context.clearRect(node.rectangle.x, node.rectangle.y, node.rectangle.w, node.rectangle.h);
                    context.drawImage(node.image.image, node.rectangle.x, node.rectangle.y);
                }
            }
        },
        drawToRenderContext: function(context, onlyNew){
            var nodes = onlyNew?this.getNewImageNodes():this.getImageNodes();
            for(var i = 0; i < nodes.length; ++i){
                var node = nodes[i];
                context.drawImage(node.image, node.rectangle.x, node.rectangle.y);
            }
        },
        getFilledPixels: function(){
            var imageNodes = this.getImageNodes();
            var sum = 0;
            _.each(imageNodes, function(imageNode){
               sum += imageNode.image.getWidth()*imageNode.image.getHeight();
            });
            return sum;
        },
        getFillRatio: function(){
            var totalPixels = this.width*this.height;
            return this.getFilledPixels()/totalPixels;
        },
        repack: function(minSize, maxSize){
            var imageNodes = this.getImageNodes();
            this.clearNewImageNodes();
            var images = [];
            _.each(imageNodes, function(imageNode){
                //some images are in the atlas still waiting to be removed. ignore these?!
                if(imageNode.image && imageNode.image.image){
                    images.push(imageNode.image);
                }
            });
            var repacked = this.packImages(images, minSize, maxSize);
            console.log(repacked);
            this.node = repacked;
//            images = images.sort(this.sortFunctionMinSize);
//            this.reset();
//            _.each(images, function(image){this.insert(image)}, this);
        },
        sortFunctionMaxSize: function(b, a){
            return Math.max(a.getWidth(), a.getHeight()) - Math.max(b.getHeight(), b.getWidth());
        },
        sortFunctionMinSize: function(b, a){
            return Math.min(a.getWidth(), a.getHeight()) - Math.min(b.getHeight(), b.getWidth());
        },
        sortFunctionPerimeter: function(b, a){
            return (a.getWidth() + a.getHeight()) - (b.getHeight() + b.getWidth());
        },
        sortFunctionArea: function(b, a){
            return (a.getWidth()*a.getHeight()) - (b.getHeight()*b.getWidth());
        },
        sortFunctionHeight: function(b, a){
            return (a.getHeight()) - (b.getHeight());
        },
        sortFunctionWidth: function(b, a){
            return (a.getWidth()) - (b.getWidth());
        },
        sortFunctionWidthHeight: function(b, a){
            var dw = (a.getWidth()) - (b.getWidth());
            if(dw === 0){
                return a.getHeight() - b.getHeight();
            } else {
                return dw;
            }
        },
        packImages: function(images, minSize, maxSize){
            var sortFunctions = [
                this.sortFunctionMinSize,
                this.sortFunctionMaxSize,
                this.sortFunctionPerimeter,
                this.sortFunctionArea,
                this.sortFunctionHeight,
                this.sortFunctionWidth,
                this.sortFunctionWidthHeight,
                null
            ];

            var width = minSize;
            var height = minSize;
            var atlasNode;
            var working = true;
            var sortFunction = 0;
            var success;
            while(working){
                console.log(sortFunction, width, height);
                atlasNode = new twod.AtlasNode(new twod.Rectangle(0, 0, width, height));
                var sorted;
                if(sortFunctions[sortFunction]){
                    sorted = images.sort(sortFunctions[sortFunction]);
                } else {
                    sorted = images;
                }
                success = true;
                for(var i = 0; i < sorted.length; ++i){
                    var node = atlasNode.insert(sorted[i]);
                    if(!node){
                        //we couldn't fit the images!
                        success = false;
                        break;
                    }
                }

                if(success){
                    //ok all images inserted!
                    working = false;
                } else {
                    ++sortFunction;
                    if(sortFunction >= sortFunctions.length){

                        //we can't fit in at this size
                        sortFunction = 0;
                        if(width >= maxSize && height >= maxSize){
                            working = false;
                        }

                        if(width == height){
                            //try taller first
                            height *= 2;
                        } else if(width < height){
                            //then width tall
                            width *= 2;
                            height /= 2;
                        } else {
                            //finally try a larger square
                            height *= 2;
                        }
                    } else {
                        //we will try again with a new sorting
                    }
                }
            }

            if(success){
                return atlasNode;
            } else {
                return null;
            }
        }
    };



    twod.FontPacker = function(){
    };

    twod.FontPacker.prototype = {
        getCharBlockSize: function(fontSetup){

            var numChars = fontSetup.characters.length;
            var cols = fontSetup.columns;
            var rows = Math.ceil(numChars/cols);
            var sx = fontSetup.spacingX;
            var sy = fontSetup.spacingY;

            return new twod.Rectangle(0, 0, sx*cols, sy*rows);
        },
        drawCharBlock: function(canvas, context, fontSetup, sharpenLevel){
            var fontSize = fontSetup.fontSize;
            var fontFamily = fontSetup.fontFamily;
            var ox = fontSetup.offsetX;
            var oy = fontSetup.offsetY;
            var sx = fontSetup.spacingX;
            var sy = fontSetup.spacingY;
            var cols = fontSetup.columns;
            var all = fontSetup.characters;

            var imageSize = this.getCharBlockSize(fontSetup);

            var numChars = all.length;
            canvas.width = imageSize.w;
            canvas.height = imageSize.h;

            for(var i = 0; i < numChars; ++i){
                var x = i%cols;
                var y = Math.floor(i/cols);
                var chr = all.charAt(i);

                context.font = ''+fontSize+'pt '+fontFamily;
                context.fillText(chr, ox + sx*x, oy + sy*y);

            }

            //sharpen!
            if(sharpenLevel > 0){
                var w = canvas.width;
                var h = canvas.height;
                var imageData = context.getImageData(0, 0, w, h);
                var pixels = imageData.data;
                var max = pixels.length;
                for(var i = 0; i < max; ++i){
                    var val = pixels[i];
                    val = val < sharpenLevel? 0 : 255;
                    pixels[i] = val;
                }
                context.putImageData(imageData, 0, 0);
            }
        }

    };


    twod.TexturePacker = function(){
        // //run headless
        this.stage = new twod.Stage();
        this.stage.init(null, {
            mode: 'canvas',
            width: 16,
            height: 16,
            scaling: 1,
            bgColor: "ff00ff"
        });
    };

    twod.TexturePacker.prototype = {
        loadImages: function(urls, onComplete){
            var renderContext = this.stage.renderContext;
            var rects = [];
            rects.length = urls.length;
            renderContext.loadImageRects(urls, rects, onComplete);
        },
        packImages: function(images){
            var sortFunctions = [
                twod.Atlas.sortFunctionMinSize,
                twod.Atlas.sortFunctionMaxSize,
                twod.Atlas.sortFunctionPerimeter,
                twod.Atlas.sortFunctionArea,
                twod.Atlas.sortFunctionHeight,
                twod.Atlas.sortFunctionWidth,
                twod.Atlas.sortFunctionWidthHeight,
                null
            ];

            var maxSize = 4096;
            var width = 256;
            var height = 256;
            var atlas;
            var working = true;
            var sortFunction = 0;
            var success;
            while(working){
                // console.log(sortFunction, width, height);
                atlas = new twod.Atlas(width, height);
                var sorted;
                if(sortFunctions[sortFunction]){
                    sorted = images.sort(sortFunctions[sortFunction]);
                } else {
                    sorted = images;
                }
                success = true;
                for(var i = 0; i < sorted.length; ++i){
                    var node = atlas.insert(sorted[i]);
                    if(!node){
                        //we couldn't fit the images!
                        success = false;
                        break;
                    }
                }

                if(success){
                    //ok all images inserted!
                    working = false;
                } else {
                    ++sortFunction;
                    if(sortFunction >= sortFunctions.length){

                        //we can't fit in at this size
                        sortFunction = 0;
                        if(width >= maxSize && height >= maxSize){
                            working = false;
                        }

                        if(width == height){
                            //try taller first
                            height *= 2;
                        } else if(width < height){
                            //then width tall
                            width *= 2;
                            height /= 2;
                        } else {
                            //finally try a larger square
                            height *= 2;
                        }
                    } else {
                        //we will try again with a new sorting
                    }
                }
            }

            if(success){
                return atlas;
            } else {
                return null;
            }
        },
        getImageDataURL: function(atlas){
            this.stage.setWidth(atlas.width);
            this.stage.setHeight(atlas.height);
            var context = this.stage.renderContext;
            atlas.drawToCanvasContext(context.canvas.getContext('2d'));
            return twod.ImageUtil.getBase64Canvas(context.canvas);
        },
        getAtlasJSON: function(atlas){
            var imageNodes = atlas.getImageNodes();
        
            var partsArray = [];
            for(var i = 0; i < imageNodes.length; ++i){
                var imageNode = imageNodes[i];
                var image = imageNode.image;
                var url = image._url;
                var urlParts = url.split("/");
                //take only file name
                if(urlParts.length > 1){
                    url = urlParts[urlParts.length-1];
                }
                //take only base name, not extension
                urlParts = url.split(".");
                if(urlParts.length > 1){
                    urlParts.pop();
                    url = urlParts.join(".");
                }
                var rect = imageNode.rectangle;
                partsArray.push({n: url, x: rect.x, y: rect.y, w: rect.w, h: rect.h});
                
            }
            var json = {
                img: "pack.png", parts: partsArray
            };
            var jsonString = JSON.stringify(json);
            return jsonString;
        }
    };

}(this));