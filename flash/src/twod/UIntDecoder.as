package twod 
{

	public class UIntDecoder 
	{
		private var lower: String = 'abcdefghijklmnopqrstuvwxyz';//26
		private var upper: String = lower.toUpperCase();//26
		private var numeric: String = '0123456789';//10
		private var other: String = '+-';
		private var chars: String = lower+upper+numeric+other;//64
		
		private var maxPerChar: int;
		private var numMap: Object;

		public function UIntDecoder(){
			
			this.maxPerChar = this.chars.length;
	
			var i: uint;
			this.numMap = {};
			for(i = 0; i < maxPerChar; ++i){
				var char: String = this.chars.charAt(i);
				this.numMap[char] = i;
			}
		}
		
		public function decode(str: String): uint
		{
			var numMap: Object = numMap;
			var value: uint = 0;
			var part: String;
			var partVal: uint;
			part = str.charAt(5);
			value = numMap[part];
			part = str.charAt(4);
			partVal = numMap[part];
			value = (value<<6) | partVal;
			part = str.charAt(3);
			partVal = numMap[part];
			value = (value<<6) | partVal;
			part = str.charAt(2);
			partVal = numMap[part];
			value = (value<<6) | partVal;
			part = str.charAt(1);
			partVal = numMap[part];
			value = (value<<6) | partVal;
			part = str.charAt(0);
			partVal = numMap[part];
			value = (value<<6) | partVal;
			
			return value;
		}
		public function getArrayStringLength(lengthChar: String): uint
		{
			var length: uint = this.numMap[lengthChar];
			return length*6;
		}

		public function decodeArray(str: String): Array
		{
			var result: Array = [];
			var length: uint = str.length;
			var offset: uint = 0;
			while(offset < length){
				var subStr: String = str.substr(offset, 6);
				var value: uint = this.decode(subStr);
				result.push(value);
				offset += 6;
			}
			
			return result; 
		}
	}
}
