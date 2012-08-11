package my.loaders 
{
	import com.sociodox.utils.Base64;
	import flash.utils.ByteArray;
	import flash.display.Bitmap;
	import flash.display.Loader;
	import flash.events.Event;
	import flash.net.URLRequest;

	public class BitmapLoader extends FileLoader 
	{

		public var bitmap: Bitmap;

		private var loader: Loader;
		private static const dataURIPreambles: Array = ["data:image/gif;base64","data:image/jpeg;base64","data:image/png;base64"];

		public function BitmapLoader()
		{
		}
		
		private function getDataURIStart(url: String): int
		{
			var numPreambles: int = dataURIPreambles.length;
			for(var i: int = 0; i < numPreambles; ++i){
				var preamble: String = dataURIPreambles[i];
				var preambleLength: int = preamble.length;
				var uriSubstr: String = url.substr(0, preambleLength);
				if(uriSubstr == preamble){
					return preamble.length+1;
				}
			}
			return 0;
		}

		override public function load(url: String): void
		{
			loader = new Loader();
			loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onComplete);
			
			//check if is datauri
			var base64Start: int = getDataURIStart(url);
			if(base64Start>0) {
				var base64String: String = url.substr(base64Start); 
				var bytes: ByteArray = Base64.decode(base64String);
				loader.loadBytes(bytes);				
			} else {
				loader.load(new URLRequest(url));
			}
		}

		private function onComplete(event: Event): void
		{
			loader.contentLoaderInfo.removeEventListener(Event.COMPLETE, onComplete);
			processData(loader.content);
			complete.dispatch();
		}
		
		override protected function processData(data: *): void
		{
			bitmap = Bitmap(data);
		}
	}
}
