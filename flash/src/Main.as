package
{

	import my.view.AppMain;

	import twod.FlashCanvas;

	import flash.display.StageAlign;
	import flash.display.StageQuality;
	import flash.display.StageScaleMode;
	import flash.external.ExternalInterface;
	import flash.geom.Rectangle;
	import flash.system.Security;

	public class Main extends AppMain
	{
		
		public var flashCanvas: FlashCanvas;
		public function Main()
		{
			addedToStage.addOnce(onAddedToStage);
		}
		
		
		private function onAddedToStage(): void
		{

			flashCanvas = new FlashCanvas(stage);
			addChild(flashCanvas);
			Security.allowDomain("*");

			stage.scaleMode = StageScaleMode.NO_SCALE;
			stage.align = StageAlign.TOP_LEFT;
			stage.quality = StageQuality.LOW;

			try{
				ExternalInterface.addCallback("processCommands", processCommands); 
				ExternalInterface.addCallback("createImage", createImage);
				ExternalInterface.addCallback("loadImage", loadImage); 
				ExternalInterface.addCallback("loadSubImage", loadSubImage);
				ExternalInterface.addCallback("setScale", setScale); 
			} catch (e: Error){
				
			}
			enterFramed.add(onEnterFrame);
		}

        private function processCommands(data: String): String
		{
			flashCanvas.setData(data);
			var ids: Array = flashCanvas.imageCache.getImageLoadCallbackIds();
			var callbackIDs: String = ids.join(','); 
			return callbackIDs;
		}

        private function createImage(width: String, height: String): String
		{
			var id: Number = flashCanvas.imageCache.createImage(Number(width), Number(height));
			return ''+id;
		}
        private function loadImage(imageID: String, url: String, callbackID: String): void
		{
			var id: Number = Number(imageID);
			flashCanvas.imageCache.loadSubImage(id, url, null, callbackID);
		}
        private function loadSubImage(imageID: String, url: String, x: String, y: String, w: String, h: String, callbackID: String): void
		{
			var id: Number = Number(imageID);
			flashCanvas.imageCache.loadSubImage(id, url, new Rectangle(Number(x), Number(y), Number(w), Number(h)), callbackID);
		}
		
		private function setScale(s: String): void
		{
			var scale: Number = Number(s);
			flashCanvas.scaleX = flashCanvas.scaleY = scale;
		}
		
		private function onEnterFrame(): void
		{
            flashCanvas.updateSize(stage)
			flashCanvas.render();
		}
	}
}
