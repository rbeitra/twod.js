package my.loaders 
{
	import my.reactive.Signal;

	import flash.events.Event;
	import flash.net.URLLoader;
	import flash.net.URLLoaderDataFormat;
	import flash.net.URLRequest;

	public class FileLoader 
	{
		public var urlLoader: URLLoader;
		public var complete: Signal = new Signal();
		protected var dataFormat: String = URLLoaderDataFormat.TEXT;

		public function FileLoader()
		{	
		}

		public function load(url: String): void
		{
			urlLoader = new URLLoader();
			urlLoader.dataFormat = dataFormat;
			urlLoader.addEventListener(Event.COMPLETE, onComplete);
			urlLoader.load(new URLRequest(url));
		}
		
		public function getProgress(): Number
		{
			if(urlLoader.bytesTotal == 0){
				return 0;
			} else {
				return urlLoader.bytesLoaded/urlLoader.bytesTotal;
			}
		}

		private function onComplete(event: Event): void
		{ 
			urlLoader.removeEventListener(Event.COMPLETE, onComplete);
			processData(event.target.data);
			complete.dispatch();
		}
		
		protected function processData(data: *): void
		{			
		}
	}
}
