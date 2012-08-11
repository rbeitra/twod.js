package twod 
{

	public class FloatDecoder 
	{
		private var lower: String = 'abcdefghijklmnopqrstuvwxyz';//26
		private var upper: String = lower.toUpperCase();//26
		private var numeric: String = '0123456789';//10
		private var other: String = '+-';
		private var chars: String = lower+upper+numeric+other;//64
		
		
		private var stringLength: Number;
		private var valueDiv: Number;
		private var valueMul: Number;
		private var valueRange: Number;
		private var minValue: Number;
		private var maxValue: Number;
		private var maxPerChar: Number;
		
		private var numMap: Object;

		public function FloatDecoder(minValue: Number, precision: Number, stringLength: uint){
			
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
			
			
			this.valueDiv = precision;
			this.valueMul = 1/this.valueDiv;
			this.valueRange = maxI*this.valueDiv;
			this.minValue = minValue;
			this.maxValue = this.minValue + this.valueRange - 1;

		}

		public function decode(string: String): Number
		{
			var result: Number = 0;
			for(var i: Number = stringLength - 1; i >= 0; --i){
				var char: String = string.charAt(i);
				var valForChar: Number = numMap[char];
				result = valForChar+result*maxPerChar;
			}
			return (result * valueDiv) + minValue;
		}
		
	}
}
