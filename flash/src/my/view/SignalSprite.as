package my.view 
{
	import my.reactive.Signal;

	import flash.display.MovieClip;
	import flash.events.Event;

	public class SignalSprite extends MovieClip 
	{

		public var enterFramed: Signal;
		public var addedToStage: Signal;
		public var removedFromStage: Signal;

		public function SignalSprite()
		{
			enterFramed = Signal.listener(this, Event.ENTER_FRAME);
			addedToStage = Signal.listener(this, Event.ADDED_TO_STAGE);
			removedFromStage = Signal.listener(this, Event.REMOVED_FROM_STAGE);
		}
	}
}
