package twod 
{
	import flash.utils.ByteArray;
	import flash.display.Bitmap;
	import flash.display.BitmapData;
	import flash.display.Graphics;
	import flash.display.Sprite;
	import flash.display.Stage;
	import flash.geom.Matrix;
	import flash.geom.Point;
	import flash.geom.Rectangle;

	public class FlashCanvas extends Sprite 
	{
		
		private var newDataQueue: Array;//String;
		private var idDecoder: IntDecoder;
		private var positionDecoder: IntDecoder;
		private var sizeDecoder: IntDecoder;
		private var colorDecoder: UIntDecoder;
		private var matrixDecoder: FloatDecoder;
		
		private var mainSprite: Sprite;
		private var mainBMP: Bitmap;
		private var mainBMD: BitmapData;
		

		public var imageCache: ImageCache;
		public var images: Array;
//		public var bmds: Vector.<BitmapData>;
		public var bmds: Array;
		
		private var tempSprite: Sprite;
		private var tempMatrix: Matrix;
		private var ba: ByteArray;

		public function FlashCanvas(stage: Stage)
		{
			
			imageCache = new ImageCache();
			bmds = imageCache.subImagesArray;
			newDataQueue = [];
			
			mainSprite = new Sprite();
			mainBMD = new BitmapData(stage.stageWidth, stage.stageHeight, true, 0x00000000);
			mainBMP = new Bitmap(mainBMD);
			addChild(mainBMP);

			tempSprite = new Sprite();
			tempMatrix = new Matrix();
			
			idDecoder = new IntDecoder(-1, 2);
			positionDecoder = new IntDecoder(-64*64*32, 3);
			sizeDecoder = new IntDecoder(-64*64*32, 3);
			colorDecoder = new UIntDecoder();
			matrixDecoder = new FloatDecoder(-64*32, 1/4096, 4);
			ba = new ByteArray();
		}
    
        public function updateSize(stage: Stage): void
        {
            if(stage.stageWidth != mainBMD.width || stage.stageHeight != mainBMD.height){
                mainBMD = new BitmapData(stage.stageWidth, stage.stageHeight, true, 0x00000000);
                mainBMP.bitmapData = mainBMD;
            }
        }
		
		private function decode(currentData: String): void
		{
			var numChars: uint = currentData.length;
			
			var i: uint = 0;
			
			var imageID: int;
			var x: Number;
			var y: Number;
			var w: Number;
			var h: Number;
			var ox: Number;
			var oy: Number;
			var a: Number;
			var b: Number;
			var c: Number;
			var d: Number;
			var tempBMD: BitmapData;
			var maxImgId: uint = bmds.length;
			var sourceRect: Rectangle = new Rectangle();
			var targetPoint: Point = new Point();
			var tempG: Graphics = tempSprite.graphics;
			var bmdW: Number;
			var bmdH: Number;
			
			var clearRect: Rectangle = new Rectangle();
			
			
			var currentBMD: BitmapData = mainBMD;
			while(i < numChars){
				var command: String = currentData.substr(i, 1);
				++i;
				switch(command){
					case 'C'://Clear
						clearRect.width = currentBMD.width;
						clearRect.height = currentBMD.height;
						currentBMD.fillRect(clearRect, 0x00000000);
						break;
					case 'D'://DrawImage
						imageID = idDecoder.decode(currentData.substr(i, 2));
						if(imageID < maxImgId){
							tempBMD = bmds[imageID];
							targetPoint.x = positionDecoder.decode(currentData.substr(i+2, 3));
							targetPoint.y = positionDecoder.decode(currentData.substr(i+5, 3));
							sourceRect.width = tempBMD.width;
							sourceRect.height = tempBMD.height;
							

							currentBMD.copyPixels(tempBMD, sourceRect, targetPoint, null, null, true);
							
						}
						i+=8;
						break;
					case 'A'://DrawAffine
						imageID = idDecoder.decode(currentData.substr(i, 2));
						if(imageID < maxImgId){
							tempBMD = bmds[imageID];
							tempMatrix.a = matrixDecoder.decode(currentData.substr(i+2, 4));
							tempMatrix.b = matrixDecoder.decode(currentData.substr(i+6, 4));
							tempMatrix.c = matrixDecoder.decode(currentData.substr(i+10, 4));
							tempMatrix.d = matrixDecoder.decode(currentData.substr(i+14, 4));
							tempMatrix.tx = matrixDecoder.decode(currentData.substr(i+18, 4));
							tempMatrix.ty = matrixDecoder.decode(currentData.substr(i+22, 4));
							currentBMD.draw(tempBMD, tempMatrix);
						}
						
						i+=26;
						break;
					case 'L'://DrawScanline
						imageID = idDecoder.decode(currentData.substr(i, 2));
						if(imageID < maxImgId){
							tempBMD = bmds[imageID];
							w = currentBMD.width;
							y = positionDecoder.decode(currentData.substr(i+2, 3));
							a = matrixDecoder.decode(currentData.substr(i+5, 4));
							b = matrixDecoder.decode(currentData.substr(i+9, 4));
							c = matrixDecoder.decode(currentData.substr(i+13, 4));
							d = matrixDecoder.decode(currentData.substr(i+17, 4));
							ox = c-a;
							oy = d-b;
							x = w/Math.sqrt(ox*ox+oy*oy);
							tempMatrix.identity();
							tempMatrix.translate(-a, -b);
							tempMatrix.rotate(Math.atan2(b-d, c-a));
							tempMatrix.scale(x, x);
							tempG.clear();
							tempG.beginBitmapFill(tempBMD, tempMatrix);
							tempG.drawRect(0, 0, w, 1);
							tempG.endFill();
							tempMatrix.identity();
							tempMatrix.translate(0, y);
							currentBMD.draw(tempSprite, tempMatrix);
						}
						i+=21;
						break;
					case 'T':
						imageID = idDecoder.decode(currentData.substr(i, 2));
						if(imageID < maxImgId){
							tempBMD = bmds[imageID];
							bmdW = tempBMD.width;
							bmdH = tempBMD.height;	
					
							x = positionDecoder.decode(	currentData.substr(i+2, 3));
							y = positionDecoder.decode(	currentData.substr(i+5, 3));
							w = sizeDecoder.decode(		currentData.substr(i+8, 3));
							h = sizeDecoder.decode(		currentData.substr(i+11, 3));
							ox = positionDecoder.decode(currentData.substr(i+14, 3));
							oy = positionDecoder.decode(currentData.substr(i+17, 3));

							tempG.clear();
							tempMatrix.identity();
							tempMatrix.translate(ox, oy);
							tempG.beginBitmapFill(tempBMD, tempMatrix);
							tempG.drawRect(0, 0, w, h);
							tempG.endFill();
							tempMatrix.identity();
							tempMatrix.translate(x, y);
							currentBMD.draw(tempSprite, tempMatrix);
						}
						
						i += 20;
						break;
						
					case 'S'://SetDrawTarget
						imageID = idDecoder.decode(currentData.substr(i, 2));
						if(imageID < 0){
							currentBMD = mainBMD;
						} else if(imageID < maxImgId){
							currentBMD = bmds[imageID];
						}
						i += 2;
						break;
						
					case 'F'://Free Image
						imageID = idDecoder.decode(currentData.substr(i, 2));
						imageCache.removeImage(imageID);
						i += 2;
						break;
						
					case 'M'://Free Image
						imageID = idDecoder.decode(currentData.substr(i, 2));
						i += 2;
						var srcLenChar: String = currentData.substr(i, 1);
						var srcLen: Number = colorDecoder.getArrayStringLength(srcLenChar);
						++i;
						var srcColors: Array = colorDecoder.decodeArray(currentData.substr(i, srcLen));
						i+= srcLen;
						
						var tgtLenChar: String = currentData.substr(i, 1);
						var tgtLen: Number = colorDecoder.getArrayStringLength(tgtLenChar);
						++i;
						var tgtColors: Array = colorDecoder.decodeArray(currentData.substr(i, tgtLen));
						i += tgtLen;
						
						this.mapColors(bmds[imageID], currentBMD, srcColors, tgtColors);

						break;
				}
			}
		}

		public function render(): void
		{
			if(newDataQueue.length > 0){
				var queue: Array = newDataQueue;
				newDataQueue = [];
				var i: uint;
				for(i = 0; i < queue.length; ++i){
					decode(queue[i]);
				}
			}
		}
		
		public function setData(data: String): void
		{
			newDataQueue.push(data);
		}
		
		private function rgbaToArgb(rgba: uint): uint
		{
			
			var r: uint = (rgba>>24) & 0x000000ff;
			var g: uint = (rgba>>16) & 0x000000ff;
			var b: uint = (rgba>>8) & 0x000000ff;
			var a: uint = (rgba) & 0x000000ff;
			
			return (a << 24) | (r << 16) | (g << 8) | (b);
			
		}
		
		private function mapColors(sourceBMD: BitmapData, targetBMD: BitmapData, sourceColors: Array, targetColors: Array): void
		{
			var numColors: Number = Math.min(sourceColors.length, targetColors.length);
			if(numColors == 1){
				mapColorOne(sourceBMD, targetBMD, sourceColors[0], targetColors[0]);
			} else if(numColors > 1){
			
				var w: Number = Math.min(sourceBMD.width, targetBMD.width);
				var h: Number = Math.min(sourceBMD.height, targetBMD.height);
				var colorsMap: Object = {};
				
				for(var k: Number = 0; k < numColors; ++k){
					colorsMap[rgbaToArgb(sourceColors[k])] = rgbaToArgb(targetColors[k]);
				}
				
				for(var j: Number = 0; j < h; ++j){
					for(var i: Number = 0; i < w; ++i){
						var sourcePixel: uint = sourceBMD.getPixel32(i, j);
						if(colorsMap.hasOwnProperty(sourcePixel)){
							var targetColor: uint = colorsMap[sourcePixel];
							targetBMD.setPixel32(i, j, targetColor);
						}
					}
				}
			}
		}
		
		private function mapColorOne(sourceBMD: BitmapData, targetBMD: BitmapData, sourceColor: uint, targetColor: uint): void
		{
			var w: Number = Math.min(sourceBMD.width, targetBMD.width);
			var h: Number = Math.min(sourceBMD.height, targetBMD.height);
			
			sourceColor = rgbaToArgb(sourceColor);
			targetColor = rgbaToArgb(targetColor);
			
			for(var j: Number = 0; j < h; ++j){
				for(var i: Number = 0; i < w; ++i){
					var sourcePixel: uint = sourceBMD.getPixel32(i, j);
					if(sourcePixel == sourceColor){
						targetBMD.setPixel32(i, j, targetColor);
					}
				}
			}
		}
	}
}
