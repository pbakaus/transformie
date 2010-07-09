/*
 * jQuery UI Labs - Coverflow
 * - for experimental use only -
 *
 * Copyright (c) 2009 AUTHORS.txt (http://ui.jquery.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * Depends:
 *  ui.core.js
 *	effects.core.js
 */
(function($){

	var browserVersion = $.browser.version.replace(/^(\d+\.)(.*)$/, function() { return arguments[1] + arguments[2].replace(/\./g, ''); });
	var supportsTransforms = !($.browser.mozilla && (parseFloat(browserVersion) <= 1.9)) && !$.browser.opera;
	
	$.easing.easeOutQuint = function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t*t*t + 1) + b;
	};

	$.widget('ui.coverflow', {
		
		_init: function() {
			this.current = this.options.item; //Start item
			this.refresh();
		},
		
		select: function(item, noPropagation) {
			
			this.previous = this.current;
			this.current = !isNaN(parseInt(item,10)) ? parseInt(item,10) : this.items.index(item);
			
			//Add the current class to the item
			this.items.eq(this.previous).removeClass('current');
			this.items.eq(this.current).addClass('current');
			
			//Don't animate when clicking on the same item
			if(this.previous == this.current) return false; 
			
			//Overwrite $.fx.step.coverflow everytime again with custom scoped values for this specific animation
			var self = this, to = Math.abs(self.previous-self.current) <=1 ? self.previous : self.current+(self.previous < self.current ? -1 : 1);
			$.fx.step.coverflow = function(fx) { self._refresh(fx.now, to, self.current); };
			
			// 1. Stop the previous animation
			// 2. Animate the parent's left/top property so the current item is in the center
			// 3. Use our custom coverflow animation which animates the item
			var animation = { coverflow: 1 };
			animation[this.props[2]] = (
				(this.options.recenter ? -this.current * this.itemSize/2 : 0)
				+ (this.options.center ? this.element.parent()[0]['offset'+this.props[1]]/2 - this.itemSize/2 : 0) //Center the items container
				- (this.options.center ? parseInt(this.element.css('padding'+this.props[3]),10) || 0 : 0) //Subtract the padding of the items container
			);
			
			//Trigger the 'select' event/callback
			if(!noPropagation) this._trigger('select', null, this._uiHash());
			
			this.element.stop().animate(animation, {
				duration: 1000,
				easing: 'easeOutQuint'
			});
			
		},
		
		refresh: function() {
			
			var self = this, o = this.options;
			this.items = $(o.items, this.element);
			this.props = o.orientation == 'vertical' ? ['height', 'Height', 'top', 'Top'] : ['width', 'Width', 'left', 'Left'];
			this.itemSize = this.items['outer'+this.props[1]](1);
			this.itemWidth = this.items.width();
			this.itemHeight = this.items.height();
			
			this.items.eq(this.current).addClass('current');
			
			//Bind click events on individual items
			this.items.unbind(o.trigger).bind(o.trigger, function() {
				self.select(this);
			});

			//Determine opacity factor if set to auto
			this.opacityFactor = o.opacity == 'auto' ? Math.round(this.element.parent()[0]['offset'+this.props[1]]/this.itemSize) : o.opacity;
			
			//Center the actual parent's left side within it's parent
			this.element.css(this.props[2],
				(o.recenter ? -this.current * this.itemSize/2 : 0)
				+ (o.center ? this.element.parent()[0]['offset'+this.props[1]]/2 - this.itemSize/2 : 0) //Center the items container
				- (o.center ? parseInt(this.element.css('padding'+this.props[3]),10) || 0 : 0) //Subtract the padding of the items container
			);

			//Jump to the first item
			this._refresh(1, 0, this.current);
			
		},
		
		_refresh: function(state,from,to) {
			
			var self = this, offset = null;
			
			this.items.each(function(i) {
				
				var side = (i == to && from-to < 0 ) ||  i-to > 0 ? 'left' : 'right',
					mod = i == to ? (1-state) : ( i == from ? state : 1 ),
					before = (i > from && i != to),
					css = { zIndex: self.items.length + (side == "left" ? to-i : i-to) };

				css[($.browser.safari ? 'webkit' : 'Moz')+'Transform'] = self.options.transformation.call(self, mod, side);
				css[self.props[2]] = ( (-i * (self.itemSize/2)) + (side == 'right'? -self.itemSize/2 : self.itemSize/2) * mod );
				
				if(!supportsTransforms) {
					css.width = self.itemWidth * (1+((1-mod)*0.5));
					css.height = css.width * (self.itemHeight / self.itemWidth);
					css.top = -((css.height - self.itemHeight) / 2);
				}
				
				$(this).css(css);
				
				//Use the opacity effect only if IE isn't used, IE has problems with multiple filters
				if(!$.browser.msie && self.options.opacity) {
					if(self.options.opacityElement) {
						$(self.options.opacityElement, this).css('opacity', Math.abs((side == 'left' ? to-i : i-to)) / self.opacityFactor);
					} else {
						$(this).css('opacity', 1 - Math.abs((side == 'left' ? to-i : i-to)) / self.opacityFactor);
					}
				}
					

			});
			
			//This fixes Safari reflow issues
			this.element.parent().scrollTop(0);
			
		},
		
		_uiHash: function() {
			return {
				item: this.items[this.current],
				value: this.current
			};
		}
		
	});
	
	$.extend($.ui.coverflow, {
		defaults: {
			items: "> *",
			orientation: 'horizontal',
			item: 0,
			trigger: 'click',
			opacity: 'auto', //Can be set to a certain factor instead of auto, to finetune opacity settings
			center: true, //If set to false, the actual element's base position isn't touched in any way
			recenter: true, //If set to false, the parent element's position doesn't get animated while items change
			transformation: function(mod, side) {
				return 'matrix(1,'+(mod * (side == 'right' ? -0.5 : 0.5))+',0,1,0,0) scale('+(1+((1-mod)*0.5))+')'
				//return 'rotate('+(mod*(side == 'right' ? -1 : 1)*30)+'deg) scale('+(1+((1-mod)*0.5))+')';
			}
		}
	});
	
})(jQuery); 