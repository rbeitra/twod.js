package twod 
{

	public class ColorDecoder
	{
		private var hexes: String = '0123456789abcdef';
		private var ihexes: Object;
		private function makeIHexes(): Object
		{
			var result: Object = {};
			for(var i: int = 0;i < hexes.length; ++i) {
				var c: String = hexes.charAt(i);
				result[c] = i;
				c = c.toUpperCase();
				result[c] = i;
			}
			return result;
		}

		public function ColorDecoder(){
			ihexes = makeIHexes();
		}

		public function decode(string: String): uint
		{
			var result: uint = 0;
			for(var i: Number = 0; i < 6; ++i){
				result = (result << 4) + ihexes[string.charAt(i)];
			}
			return result;
		}
	}
}
