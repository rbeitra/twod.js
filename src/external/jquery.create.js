(function( $ ){
	
	$.fn.attributes = function(attributes){
		attributes = attributes || {};
		return this.each(function(){
			var target = $(this);
			if(attributes.className){
				target.addClass(attributes.className);
			}
			for(var name in attributes){
				if(name != 'className'){
					target.attr(name, attributes[name]);
				}
			}
		});
	};
	$.fn.create = function(tagName, content, attributes){
		content = content || '';
		var result = [];
		this.each(function(){
			var target = $(this);
			//console.log(target.get().length);
			var child = $('<'+tagName+' ></'+tagName+'>');
			if(content){
				child.html(content);
			}
			child.attributes(attributes);
			result.push(child.get(0));
			target.append(child);
		});
		return $(result);
	};
})( jQuery );