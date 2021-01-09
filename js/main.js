// scope holds constant and global values
var scope = {};

// for scrollspy - cache selectors (does this actually affect perf?)
scope.lastScrollDiv = "";
scope.navMenuItems = $("#nav-main a");
scope.navDivs = scope.navMenuItems.map(function(){
	if ($(this).attr("href") !== "/") {
		var item = $($(this).attr("href"));
		if (item.length) { return item; }
	}
});

// scrollbar stuff
var minScrollPos = 65;
var maxScrollPos = $(window).height() - 65;

(function(window) {

	// resize and scroll events
	onResize();
	$(window).resize(onResize);
	$(document).scroll(onScroll);

	// click events
	//
	// nav menu items scroll to their sections
	scope.navMenuItems.click(function(e) {
		$('html, body').animate({ scrollTop:$($(this).attr("href")).offset().top + 1 }, 300);
		e.preventDefault();
	});

	// settings button toggles menu open/closed
	$('#settings-btn').click(function() { $(this).toggleClass('active').parent().toggleClass('active'); });

	// add active/inactive toggle to all links in the settings pane
	$('#settings-pane a').click(function() {
		$(this).addClass("active").siblings().removeClass("active");
	});

	// toggle light/dark color scheme
	$('#set-theme a').click(function(e) {
		$('#page, #scrollbar').removeClass("light dark").addClass(e.target.id.replace('#',''));
	});

	// toggle lowercase/uppercase headers
	$('#set-heading-case a').click(function(e) {
		$('#nav,#settings,h2,h3').removeClass('lowercase uppercase').addClass(e.target.id.replace('#', ''));
	});

	// toggle normal/bold font
	$('#set-font-weight a').click(function(e) {
		$('#nav,#settings').removeClass('weight-normal weight-bold').addClass(e.target.id.replace('#', ''));
	});

	// set link/button text color
	$('#set-link-color a').click(function(e) {
		$('#page').removeClass("red blue green").addClass(e.target.id.replace('#',''));
	});

	// set link/button text color
	$('#set-font a').click(function(e) {
		$('#page').removeClass("open-sans lato droid-sans oxygen").addClass(e.target.id.replace('#',''));
	});


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
		maxScrollPos = $(window).height() - 65;

		mediaQueries();
}

// during a resize event, perform js media queries
function mediaQueries()
{
	// mobile - default

	// left menu - click on it to open/close
	$("#nav").unbind("click").click(function() { $(this).toggleClass('active'); });

	// show cog icon for settings menu button
	$('#settings-link').html('&gt;');

	// middle size
	if (matchMedia("(min-width: 40.5em)").matches)
	{
		// nav menu - no click event
		$("#nav").unbind("click").removeClass('active');
	}

	// full size
	if (matchMedia("(min-width: 70em)").matches)
	{
		// show "settings" text for settings menu button
		$('#settings-link').html('settings');
	}
};

function onScroll(e)
{
	// set my scrollbar to the correct position
	var scrollPct = $(document).scrollTop() / ($('#content').height() - $(window).height());
	var trackHeight = $(window).height() - minScrollPos - 48;
	$('#scrollbar').css('top', (minScrollPos + trackHeight * scrollPct) + 'px');

	// update scrollspy on nav menu
	// get all nav divs above the current position
  var cur = scope.navDivs.map(function() {
    if ($(this).offset().top <= Math.max($(document).scrollTop(), 0))
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
