package my.util 
{
	import flash.display.Sprite;
	import flash.events.Event;
	import flash.utils.Dictionary;
	import flash.utils.getTimer;

	public final class Btween {

		public static const ONCOMPLETE: String = 'onComplete';
		public static const ONCOMPLETEPARAMS: String = 'onCompleteParams';
		public static const ONUPDATE: String = 'onUpdate';
		public static const ONUPDATEPARAMS: String = 'onUpdateParams';
		public static const DELAY: String = 'delay';
		public static const EASE: String = 'ease';
		
		private static var head: Btween;
		private static var tail: Btween;
		private static var targets: Dictionary = new Dictionary();
		private static var timer: Sprite = new Sprite();
		private static function init(): void
		{
			timer.addEventListener(Event.ENTER_FRAME, loop);
		}
		init();
		
		private static function getParam(params: Object, name: String, def: *, del: Boolean = true): *
		{
			var result: * = def;
			if(params.hasOwnProperty(name)){
				result = params[name];
				if(del){
					delete params[name];
				}
			}
			return result;
		}
		
		public static function to(target: *, duration: Number, params: Object): void
		{
			var onComplete: Function = getParam(params, ONCOMPLETE, null, true);
			var onCompleteParams: Array = getParam(params, ONCOMPLETEPARAMS, null, true);
			var onUpdate: Function = getParam(params, ONUPDATE, null, true);
			var onUpdateParams: Array = getParam(params, ONUPDATEPARAMS, null, true);
			var delay: Number = 1000*getParam(params, DELAY, 0, true);
			var ease: Function = getParam(params, EASE, null, true);;
			
			duration *= 1000;
			
			var start: Number = getTimer() + delay;
			//trace(params.length);
			var property: String;
			var first: Boolean = true;
			for(property in params){
				if(first){
					first = false;
					//attach the onComplete to this tween... it will be pushed to the end of the list so should get updated last
					createTween(target, property, target[property], params[property], start, duration, ease, onComplete, onCompleteParams, onUpdate, onUpdateParams);
				} else {
					createTween(target, property, target[property], params[property], start, duration, ease, null, null, null, null);
				}
			}
		}
		public static function delayedCall(delay: Number, onComplete: Function, onCompleteParams: Array = null): void
		{
			to({a: 0}, delay, {a: 0, onComplete: onComplete, onCompleteParams: onCompleteParams});
		}
		
		public static function createTween(target: *, property: String, from: Number, to: Number, start: Number, duration: Number, ease: Function, onComplete: Function, onCompleteParams: Array, onUpdate: Function, onUpdateParams: Array): void
		{
			
			var tween: Btween;
			var targetTweens: Object;
			if(targets[target] != undefined){
				targetTweens = targets[target];
			} else {
				targetTweens = targets[target] = {};
			}
			
			if(targetTweens.hasOwnProperty(property)){
				tween = targetTweens[property];
			} else {
				tween = new Btween();
				if(head != null){
					tween.next = head;
				}
				head = tween;
				targetTweens[property] = tween;
			}

			tween.target = target;
			tween.property = property;
			tween.from = from;
			tween.to = to;
			tween.delta = to - from;
			tween.duration = duration;
			tween.start = start;
			tween.end = start + duration;
			tween.ease = (ease != null) ? ease : easeInOut;
			tween.onComplete = onComplete;
			tween.onCompleteParams = onCompleteParams;
			tween.onUpdate = onUpdate;
			tween.onUpdateParams = onUpdateParams;
		}
		
		private static function loop(e: Event): void
		{
			var tween: Btween = head;
			var prev: Btween;
			var property: String;
			var time: Number;
			var targetTweens: Object;
			var target: *;
			var clearTarget: Boolean;
			var onCompletes: Array = [];
			var onUpdates: Array = [];
			time = getTimer();
			while(tween != null) {
				//tween = tweens[i];
				if(time >= tween.start){
					property = tween.property;
					target = tween.target;
					if(tween.onUpdate != null){
						onUpdates.push(tween);
					}
					if(time >= tween.end){
						//finished
						target[property] = tween.to;
						
						if(prev != null){
							prev.next = tween.next;
						}
						if(tween == head){
							head = tween.next;
						}
						
						targetTweens = targets[target];
						delete targetTweens[property];
						
						clearTarget = true;
						for(property in targetTweens){
							clearTarget = false;
							break;
						}
						if(clearTarget){
							delete targets[target];
						}
						
						if(tween.onComplete != null){
							onCompletes.push(tween);
						}
					}  else {
						//active
						target[property] = tween.ease(time - tween.start, tween.from, tween.delta, tween.duration);
						prev = tween;
					}
				} else {
					prev = tween;
				}
				tween = tween.next;
			}
			tail = prev;

			for each(tween in onUpdates){
				tween.onUpdate.apply(tween.target, tween.onUpdateParams);
			}
			for each(tween in onCompletes){
				tween.onComplete.apply(tween.target, tween.onCompleteParams);
			}
		}
		
		public static function easeOut (t:Number, b:Number, c:Number, d:Number):Number {
			return -c *(t/=d)*(t-2) + b;
		}
		public static function easeInOut(t : Number, b : Number, c : Number, d : Number) : Number {
			var num:Number;
			if((t /= d / 2) < 1) num = c / 2 * Math.pow(t, 3) + b;
			else num = c / 2 * (Math.pow(t - 2, 3) + 2) + b;	
			return num;
		}
		public static function easeOutBack (t:Number, b:Number, c:Number, d:Number, p_params:Object = null):Number {
			var s:Number = !Boolean(p_params) || isNaN(p_params.overshoot) ? 1.70158 : p_params.overshoot;
			return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
		}
		public static function easeOutExpo(t:Number, b:Number, c:Number, d:Number):Number {
			return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
		}
		
		/*
		 * member variables for the tween
		 */
		public var target: *;
		public var property: String;
		public var from: Number;
		public var to: Number;
		public var delta: Number;
		public var duration: Number;
		public var start: Number;
		public var end: Number;
		public var ease: Function;
		public var onComplete: Function;
		public var onCompleteParams: Array;
		public var onUpdate: Function;
		public var onUpdateParams: Array;
		public var next: Btween;

	}
}
