package my.reactive 
{
	import my.util.Btween;

	import flash.events.Event;
	import flash.events.EventDispatcher;

	final public class Signal
	{
		
		public var listeners: Array;
		private var queue: Array;
		
		public function Signal()
		{
			listeners = [];//new Vector.<Function>();
			queue = [];//new Vector.<SignalQueueAction>();
		}
		
		public function add(...funs): void
		{
			var max: int = funs.length;
			for(var i: int = 0; i < max; ++i){
				queue.push(new SignalQueueAction(SignalQueueAction.ADD, funs[i]));
			}
		}
		
		public function remove(...funs): void
		{
			var max: int = funs.length;
			for(var i: int = 0; i < max; ++i){
				queue.push(new SignalQueueAction(SignalQueueAction.REMOVE, funs[i]));
			}
		}
		
		public function removeAll(): void
		{
			queue.push(new SignalQueueAction(SignalQueueAction.REMOVE_ALL));
		}
		
				
		public function dispatch(...args): void
		{
			var i: uint;
			var max: uint;
			
			//process the queues;
			max = queue.length;
			for(i = 0; i < max; ++i){
				var action: SignalQueueAction = queue[i];
				switch(action.action){
					case SignalQueueAction.ADD:
						listeners.push(action.listener);
					break;
					case SignalQueueAction.REMOVE:
						var index: int = listeners.indexOf(action.listener);
						if(index != -1){
							listeners.splice(index, 1);
						}
					break;
					case SignalQueueAction.REMOVE_ALL:
						listeners.length = 0;
					break;
				}
			}
			queue.length = 0;
			
			max = listeners.length;
			for(i = 0; i < max; ++i){
				var listener: Function = listeners[i];
				listener.apply(null, args);
			}
		}
		
		

		/*
		 * delays events by interval ms
		 */
		public function delay(seconds: Number): Signal
		{
			var result: Signal = new Signal();

			var f: Function = function(...args): void
			{
				Btween.delayedCall(seconds, result.dispatch, args);
			};
			add(f);
			return result;
		}
		

		/*
		 * creates a source that fires only once
		 */
		public function once(): Signal
		{
			var result: Signal = new Signal();
			
			var t: Signal = this;
			var f: Function;
			var g: Function = function(...args): void
			{
				result.dispatch.apply(null, args);
				t.remove(f);
			};
			f = g;
			
			add(f);
			return result;
		}
		
		public function addOnce(fun: Function): void
		{
			once().add(fun);
		}

		public static function listener(target: EventDispatcher, type: String): Signal
		{
			var result: Signal = new Signal();
			target.addEventListener(type, function(e: Event = null): void
			{
				result.dispatch();
			});
			return result;
		}
		
	}

}

final class SignalQueueAction
{
	public static const ADD: int = 0;
	public static const REMOVE: int = 1;
	public static const REMOVE_ALL: int = 2;

	public var action: int;
	public var listener: Function;
	public function SignalQueueAction(action: int, listener: Function = null){
		this.action = action;
		this.listener = listener;
	}
}

final class SignalDelayListItem
{
	public var args: Array;
	public var time: int;
	public var next: SignalDelayListItem = null;
	public function SignalDelayListItem(a: Array, t: int)
	{
		this.args = a;
		this.time = t;
	}
}
