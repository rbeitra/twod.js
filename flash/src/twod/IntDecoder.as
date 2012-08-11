package twod 
{
	import flash.utils.ByteArray;

	public class IntDecoder 
	{
		private var lower: String = 'abcdefghijklmnopqrstuvwxyz';//26
		private var upper: String = lower.toUpperCase();//26
		private var numeric: String = '0123456789';//10
		private var other: String = '+-';
		private var chars: String = lower+upper+numeric+other;//64
		
		
		private var stringLength: Number;
		private var valueRange: int;
		private var minValue: int;
		private var maxValue: int;
		private var maxPerChar: int;
		
		private var numMap: Object;

		public function IntDecoder(minValue: int, stringLength: uint){
			
			this.stringLength = stringLength;
			this.maxPerChar = this.chars.length;
	
			var maxI: uint = 1;
			var i: int;
			for(i= 0; i < stringLength; ++i){
				maxI *= maxPerChar;
			}
			
			this.numMap = {};
			for(i = 0; i < maxPerChar; ++i){
				var char: String = this.chars.charAt(i);
				this.numMap[char] = i;
			}
			
			
			this.valueRange = maxI;
			this.minValue = minValue;
			this.maxValue = this.minValue + this.valueRange - 1;
			
			

		}
		
		public function decode(string: String): int
		{
			var result: int = 0;
			for(var i: Number = stringLength - 1; i >= 0; --i){
				var char: String = string.charAt(i);
				var valForChar: int = numMap[char];
				result = valForChar+result*maxPerChar;
			}
			return (result) + minValue;
		}
		public function decodeBA(ba: ByteArray): int
		{
			var result: int = 0;
			var mul: int = 1;
			for(var i: Number = stringLength - 1; i >= 0; --i){
				var char: String = ba.readUTFBytes(1);
				var valForChar: int = numMap[char];
				result += valForChar*mul;
				mul *= maxPerChar;
			}
			return (result) + minValue;
		}
	}
}
