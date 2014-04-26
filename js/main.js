// scope holds constant and global values
var scope = {};

// for scrollspy - cache selectors (does this actually affect perf?)
scope.lastScrollDiv = "";
scope.navMenuItems = $("#nav-main a");
scope.navDivs = scope.navMenuItems.map(function(){
		var item = $($(this).attr("href"));
		if (item.length) { return item; }
	});

(function(window) {

	// scrollbar stuff
	var minScrollPos = 59;
	var maxScrollPos = $(window).height() - 40 - 25;

	// resize and scroll events
	onResize();
	$(window).resize(onResize);
	$(document).scroll(onScroll);

	// click events
	//
	// nav menu items scroll to sections
	scope.navMenuItems.click(function(e) {
		$('html, body').animate({ scrollTop:$($(this).attr("href")).offset().top + 1 }, 300);
		e.preventDefault();
	});

	// toggle settings menu
	$('#settings-tab').click(function() {
		$(this).parent().toggleClass('active');
	});

	// toggle light/dark color scheme
	$('#dark').click(function() {
		$('#dark').addClass('active');
		$('#light').removeClass('active');
		$('#page').animate({ backgroundColor:'#333', color:'#ddd' }, 500);
		$('#scrollbar').animate({ borderColor:'#333', backgroundColor:'#ddd' }, 500);
	});
	$('#light').click(function() {
		$('#light').addClass('active');
		$('#dark').removeClass('active');
		$('#page').animate({ backgroundColor:'#e0e0e0', color:'#484848' }, 500);
		$('#scrollbar').animate({ borderColor:'#e0e0e0', backgroundColor:'#484848' }, 500);
	});

	// toggle lowercase/uppercase headers
	$('#lower').click(function() {
		$('#lower').addClass('active');
		$('#upper').removeClass('active');
		$('#nav,#settings,h2,h3').css('text-transform', 'lowercase');
	});
	$('#upper').click(function() {
		$('#upper').addClass('active');
		$('#lower').removeClass('active');
		$('#nav,#settings,h2,h3').css('text-transform', 'uppercase');
	});

	// toggle normal/bold links on left side
	$('#weight-normal').click(function() {
		$('#weight-normal').addClass('active');
		$('#weight-bold').removeClass('active');
		$('#nav,#settings').css('font-weight', 'normal');
	});
	$('#weight-bold').click(function() {
		$('#weight-bold').addClass('active');
		$('#weight-normal').removeClass('active');
		$('#nav,#settings').css('font-weight', 'bold');
	});

	// toggle link colors
	$('#red').click({ divId:'#red', color:'red' }, setLinkColor);
	$('#blue').click({ divId:'#blue', color:'blue' }, setLinkColor);
	$('#green').click({ divId:'#green', color:'green' }, setLinkColor);

	// set font
	$('#open-sans').click({ divId:'#open-sans', font:'Open Sans' }, setFont);
	$('#lato').click({ divId:'#lato', font:'Lato' }, setFont);
	$('#droid-sans').click({ divId:'#droid-sans', font:'Droid Sans' }, setFont);
	$('#pt-sans-narrow').click({ divId:'#pt-sans-narrow', font:'PT Sans Narrow' }, setFont);
	$('#oxygen').click({ divId:'#oxygen', font:'Oxygen' }, setFont);

	//
	// end click events

	// left nav link hover
	var linkAnimateTime = 150;
	$('#nav a').hover(
		function() {
			var id = $(this).attr('id');
			var newColor = $('a.active').css('color');
			if (id == "email")
				newColor = "#F04C43";
			else if (id == "github")
				newColor = "#06C66B";
			else if (id == "facebook")
				newColor = "#44619D";
			$(this).parent().animate({
				color: newColor, "margin-left": "5px", borderBottomColor: newColor}, { duration: linkAnimateTime });
		},
		function() { $(this).parent().animate({
			color: "#888", "margin-left": "0", borderBottomColor: "#888"}, { duration: linkAnimateTime }); }
	);

	// make the scrollbar draggable (adapted from jquery.slimscroll)
	$('#scrollbar').bind("mousedown", function(e) {
		clickScrollPos = parseFloat($('#scrollbar').css('top'));
		clickY = e.screenY;

		$(document).bind("mousemove.scrolling", function(e){
			// calculate the new scroll percentage, based on the current mouse position relative to its
			// position at the beginning of the drag. constrain the scrollbar to the min/max positions
			var dragDelta = e.screenY - clickY;
			var newScrollPos = Math.min(Math.max(clickScrollPos + dragDelta, minScrollPos), maxScrollPos);
			var scrollPercent = (newScrollPos - minScrollPos) / (maxScrollPos - minScrollPos);
			// multiply the scroll percentage by the total scroll height, and scroll the document,
			// which triggers the scroll event listener
			var scrollHeight = $('#content').height() - $(window).height();
			$(document).scrollTop(scrollPercent * scrollHeight);

		});

		$(document).bind("mouseup.scrolling", function(e) {
			$(document).unbind('.scrolling');
		});
		return false;
	}).bind("selectstart.scrolling", function(e){
		e.stopPropagation();
		e.preventDefault();
		return false;
	});

})(window);


function onResize(e)
{
		// vertically center settings widget
		$("#settings").css('top', ($(window).height()-$("#settings").height())/2 + 'px');

		// update scrollbar position
		$(document).trigger('scroll');
		maxScrollPos = $(window).height() - 40 - 25;

		mediaQueries();
}

// during a resize event, perform js media queries
function mediaQueries()
{
	// mobile - default

	// left menu - click on it to open/close
	$("#nav").unbind("click").bind("click", toggleNav);

	// settings menu - anchor shows small cog icon
	$('#settings-tab').html('<a><span class="icon-cog"></span></a>');

	// middle size
	if (matchMedia("(min-width: 40.5em)").matches)
	{
		// left menu - remove click event and styles it may have applied
		$("#nav").unbind("click").removeClass('active').removeAttr('style');
	}

	// full size
	if (matchMedia("(min-width: 64.5em)").matches)
	{
		// settings menu - anchor shows full "settings" text
		$('#settings-tab').html('<a>settings</a>');
	}
};

function onScroll(e)
{
	var top = $(document).scrollTop();
	var maxtop = $('#content').height() - $(window).height();

	// set my scrollbar to the correct position
	//
	var barheight = $(window).height() - 40 - 59 - 10 - 15;
	$('#scrollbar').css('top', (59 + barheight * top / maxtop) + 'px');


	// update scrollspy on nav menu
	//
	// get all nav divs above the current position
  var cur = scope.navDivs.map(function() {
    if ($(this).offset().top <= Math.max(top, 0))
      return this;
  });
  // get the last div above the current position
  cur = cur[cur.length-1];
  var id = cur && cur.length ? cur[0].id : "";
  // if we changed divs, set/unset the "active" class
  if (scope.lastScrollDiv !== id) {
    scope.lastScrollDiv = id;
    scope.navMenuItems.removeClass("active").filter("[href=#"+id+"]").addClass("active");
  }
};

// slide the left nav pane in or out
function toggleNav()
{
	var distInEM = 10.875;
	var duration = 200;
	var isNavOpen = $("#nav").hasClass('active');

	$("#nav")
		.animate({ left: isNavOpen ? -distInEM + 'em' : '0' }, duration)
		.toggleClass('active');
}

function setFont(e)
{
		$('.set-font a').removeClass('active');
		$(e.data.divId).addClass('active');
		$('#page').css('font-family', e.data.font);
};

function setLinkColor(e)
{
		$('.set-link-color a').removeClass('active');
		$(e.data.divId).addClass('active');
		$('#page').removeClass("red blue green");
		$('#page').addClass(e.data.color);
};
