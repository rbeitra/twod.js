package twod 
{

	public class FloatByteDecoder 
	{
		
		private var stringLength: uint;
		private var maxPerChar: uint = 256;
		private var valueDiv: Number;
		private var valueMul: Number;
		private var valueRange: Number;
		private var minValue: Number;
		private var maxValue: Number;
		
		
		public function FloatByteDecoder(minValue: Number, precision: Number, stringLength: uint){
			
			this.stringLength = stringLength;

			var maxI: uint = 1;
			var i: int;
			for(i= 0; i < stringLength; ++i){
				maxI *= maxPerChar;
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
				var valForChar: Number = string.charCodeAt(i);
				result = valForChar+result*maxPerChar;
			}
			return (result * valueDiv) + minValue;
		}
//		
	}
}
