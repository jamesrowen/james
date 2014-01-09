(function(window) {

	// scrollbar stuff
	var minScrollPos = 59;
	var maxScrollPos = $(window).height() - 40 - 25;

	// window resize
	$(window).resize(function() {
		$("#settings").css('top', ($(window).height()-$("#settings").height())/2 + 'px');
		// update scrollbar
		$(document).trigger('scroll');
		maxScrollPos = $(window).height() - 40 - 25;
	});

	// if we're on a project - start with the list open
	if(window.location.pathname.indexOf("projects") > -1) {
		$(".projects").show();
	}

	// toggle showing a list with a slide in/out
	$(".list-toggle").bind("click", function(e) {
		e.preventDefault();
		$(this).next().slideToggle();
	});

	// jump to links
	$('#home-link').click(function() { 
		$('html, body').animate({ scrollTop:$('#home').offset().top }, 600, function(){});
	});
	$('#resume-link').click(function() { 
		$('html, body').animate({ scrollTop:$('#resume').offset().top }, 600, function(){});
	});

	// vertically center the settings menu
	$("#settings").css('top', ($(window).height()-$("#settings").height())/2 + 'px');

	// toggle settings menu
	$('#settings-tab').click(function() { 
		$(this).parent().animate({ right:$(this).hasClass('active') ? '-130px' : '0' }, 400, function(){});
		$(this).toggleClass('active');
	});

	// toggle light/dark color scheme
	$('#dark').click(function() { 
		$('#dark').addClass('active');
		$('#light').removeClass('active');
		$('body').animate({ backgroundColor:'#333', color:'#ddd' }, 500, function(){});
		$('#scrollbar').animate({ borderColor:'#333', backgroundColor:'#ddd' }, 500, function(){});
	});
	$('#light').click(function() { 
		$('#light').addClass('active');
		$('#dark').removeClass('active');
		$('body').animate({ backgroundColor:'#e0e0e0', color:'#484848' }, 500, function(){});
		$('#scrollbar').animate({ borderColor:'#e0e0e0', backgroundColor:'#484848' }, 500, function(){});
	});

	// toggle lowercase/uppercase headers
	$('#lower').click(function() { 
		$('#lower').addClass('active');
		$('#upper').removeClass('active');
		$('#left,#settings,h2,h3').css('text-transform', 'lowercase');
	});
	$('#upper').click(function() { 
		$('#upper').addClass('active');
		$('#lower').removeClass('active');
		$('#left,#settings,h2,h3').css('text-transform', 'uppercase');
	});

	// toggle normal/bold links on left side
	$('#weight-normal').click(function() { 
		$('#weight-normal').addClass('active');
		$('#weight-bold').removeClass('active');
		$('#left,#settings').css('font-weight', 'normal');
	});
	$('#weight-bold').click(function() { 
		$('#weight-bold').addClass('active');
		$('#weight-normal').removeClass('active');
		$('#left,#settings').css('font-weight', 'bold');
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

	// left nav link hover
	var linkAnimateTime = 150;
	$('#left a').hover(
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

	// event listener for any scrolling
	$(document).scroll(onScroll);

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
			var scrollHeight = $('#right').height() - $(window).height();
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


function setFont(e) 
{
		$('.set-font a').removeClass('active');
		$(e.data.divId).addClass('active');
		$('body').css('font-family', e.data.font);
};

function setLinkColor(e) 
{
		$('.set-link-color a').removeClass('active');
		$(e.data.divId).addClass('active');
		$('body').removeClass("red blue green");
		$('body').addClass(e.data.color);
};

function onScroll(e) 
{
	for (var i=0; i<document.styleSheets.length;i++) {}
	var top = $(document).scrollTop();
	var maxtop = $('#right').height() - $(window).height();
	var barheight = $(window).height() - 40 - 59 - 10 - 15;
	$('#scrollbar').css('top', (59 + barheight * top / maxtop) + 'px');
};