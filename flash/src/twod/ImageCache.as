package twod 
{
	import my.loaders.BitmapLoader;

	import flash.display.Bitmap;
	import flash.display.BitmapData;
	import flash.geom.Point;
	import flash.geom.Rectangle;

	public class ImageCache 
	{
		
		public var images: Object = {};//base bitmapdatas
		public var loading: Object = {};//bitmaploaders
		
//		public var subImagesArray: Vector.<BitmapData> = new Vector.<BitmapData>();//bitmapdatas
		public var subImagesArray: Array = [];//bitmapdatas
		
		private var tempBMD: BitmapData;
		private var tempBMP: Bitmap;
		
//		private var deletedIDS: Vector.<int> = new Vector.<int>();
		private var deletedIDS: Array = [];
		
		private var imageLoadCallbackIds: Array = [];
		private var imageLoadCallbackBMDs: Array = [];

		public function ImageCache(){
			tempBMD = new BitmapData(16, 16, true, 0x00ff0000);
			tempBMP = new Bitmap(tempBMD);
		}
        public function removeImage(id: int): void
        {
			if(id >= 0 && id < subImagesArray.length){
				if(subImagesArray[id] != null){
		            subImagesArray[id] = null;
    		        deletedIDS.push(id);
				}
			}
        }
        private function getNextID(): int
        {
            var id: int;
            if(deletedIDS.length > 0){
                id = deletedIDS.pop();
            } else {
                id = this.subImagesArray.length;
            }
            return id;
        }
		
		private function rectToString(rect: Rectangle): String
		{
			return '[' + [ rect.x, rect.y, rect.width, rect.height ].join(',') + ']';
		}
		
		public function getImageLoadCallbackIds(): Array
		{
			var result: Array = [];
			var ids: Array = this.imageLoadCallbackIds;
			var bmds: Array = this.imageLoadCallbackBMDs;
			this.imageLoadCallbackIds = [];
			this.imageLoadCallbackBMDs = [];
			
			var max: int = ids.length;
			for(var i: int = 0; i < max; ++i){
				var id: String = ids[i];
				var bmd: BitmapData = bmds[i];
				var resultString: String = id + ":" + bmd.width + ":" + bmd.height;
				result.push(resultString);
			}
			
			return result;
		}

		public function createImage(width: uint, height: uint): uint
		{
			var bmd: BitmapData = new BitmapData(width, height, true, 0x00000000);
			
            var id: uint = this.getNextID();
            if(id >= this.subImagesArray.length){
				this.subImagesArray.push(bmd);//it has to go on the end of the array
            } else {
            	this.subImagesArray[id] = bmd;//it goes in the middle of the array
            }
			return id;
		}
		
		private function getSubImage(image: BitmapData, rect: Rectangle = null): BitmapData
		{
			if(rect == null){
				return image;
			} else {
				var bmd: BitmapData = new BitmapData(rect.width, rect.height, true, 0x00000000);
				bmd.copyPixels(image, rect, new Point());
				return bmd;
			}
		}
		
		public function loadSubImage(imageID: uint, url: String, rect: Rectangle = null, callbackString: String = null): void
		{
			var bmd: BitmapData;
			var loader: BitmapLoader;
            if(this.images.hasOwnProperty(url)){
				bmd = getSubImage(this.images[url], rect);
				this.subImagesArray[imageID] = bmd;
				if(callbackString != null){
					this.imageLoadCallbackIds.push(callbackString);
					this.imageLoadCallbackBMDs.push(bmd);
				}
            }
            else if(this.loading[url]){

				loader = this.loading[url];
				var that: ImageCache = this;
				loader.complete.add(function():void{
                    bmd = getSubImage(loader.bitmap.bitmapData, rect);
					subImagesArray[imageID] = bmd; 
                    if(callbackString != null){
						that.imageLoadCallbackIds.push(callbackString);
						that.imageLoadCallbackBMDs.push(bmd);
					}
                });
            } else {
            	loader = new BitmapLoader();
				loading[url] = loader;
				loader.complete.add(function():void{
            		delete loading[url];
            		images[url] = loader.bitmap.bitmapData;
            	});
            	
            	loadSubImage(imageID, url, rect, callbackString);
            	
            	loader.load(url);

            } 
		}
		
		
	}
}
