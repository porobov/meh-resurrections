var ad_text="";
var top_margin = 71;

document.addEventListener("mousemove", cursor);

function on(area) {
	ad_text = area.title;
}

function out(area) {
	ad_text = "";
}

function cursor(e) {
	e = e || window.event;
	var left_margin = (document.body.offsetWidth - 1000)/2;
	var pageX = e.pageX;
	var pageY = e.pageY;
	if (pageX == null) {
		pageX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		pageY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	}
	
	document.getElementById('banner').style.left=pageX + 10;
	document.getElementById('banner').style.top=pageY;
	var block_x = Math.ceil((pageX - left_margin)/10);
	var block_y = Math.ceil((pageY - top_margin)/10);

	//Put ad text
	if ((block_y <= 0) || (block_y > 100) || (block_x <= 0) || (block_x > 100)){
		document.getElementById('banner').style.display = "none";
	} else {
		document.getElementById('banner').style.display = "";
		var coords = " [" + block_x + "," + block_y + "]";
		if (ad_text == "") {
			document.getElementById('ad-text').innerHTML = "Place your ad at coordinates " + coords + ". Details below.";
		} else {	
			document.getElementById('ad-text').innerHTML = ad_text + coords;
		}
	}
	
}

/*
if (document.all){}
//else document.captureEvents(Event.MOUSEMOVE);
else document.addEventListener("mousemove", mtrack);

//document.onmousemove=mtrack;
document.addEventListener("mousemove", mtrack);



function mtrack(e) {
	//Locate banner
	var lhs = (document.body.offsetWidth - 1000)/2;
	var xcurs = 0;
	var ycurs = 0;

	if (navigator.appName == 'Netscape'){
		xcurs = e.pageX;
		ycurs = e.pageY;
	} else {
		xcurs = event.clientX;
		ycurs = event.clientY;
	}

	var block_x;
	var block_y;

	if (navigator.appName == 'Netscape') {
		document.getElementById('banner').style.left=xcurs + 10;
		document.getElementById('banner').style.top=ycurs;
		block_x = Math.ceil((xcurs - lhs)/10);
		block_y = Math.ceil((ycurs - headerHeight)/10);
	} else {
		block_x = Math.ceil((xcurs - lhs)/10);
		block_y = Math.ceil((ycurs - headerHeight + document.body.scrollTop)/10);
		document.getElementById('banner').style.top=ycurs + document.body.scrollTop - 5;
		document.getElementById('banner').style.left=xcurs + 14 + document.body.scrollLeft;
	}

	//Put ad text
	if ((block_y <= 0) || (block_y > 100) || (block_x <= 0) || (block_x > 100)){
		document.getElementById('banner').style.display = "none";
	} else {
		document.getElementById('banner').style.display = "";
		var coords = " [" + block_x + "," + block_y + "]";
		if (ad_text == "") {
			document.getElementById('ad-text').innerHTML = "Place your ad at coordinates " + coords;
		} else {	
			document.getElementById('ad-text').innerHTML = ad_text + coords;
		}
	}
}
*/