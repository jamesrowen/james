window.matchMedia||(window.matchMedia=function(){"use strict";var a=(window.styleMedia||window.media);if(!a){var b=document.createElement('style'),c=document.getElementsByTagName('script')[0],info=null;b.type='text/css';b.id='matchmediajs-test';c.parentNode.insertBefore(b,c);info=('getComputedStyle' in window) && window.getComputedStyle(b,null)||b.currentStyle;a={matchMedium:function(media){var text='@media '+media+'{#matchmediajs-test{width:1px;}}';if(b.styleSheet){b.styleSheet.cssText=text;}else{b.textContent=text;}return info.width==='1px';}};}return function(media){return {matches:a.matchMedium(media||'all'),media:media||'all'};};}());