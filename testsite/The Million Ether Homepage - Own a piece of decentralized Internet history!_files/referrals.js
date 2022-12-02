var pathArray = window.location.pathname.split( '/' );
var referral = pathArray[1];

console.log(referral);

if (referral.length > 0) {
	document.getElementById('referral-id').innerHTML = referral;
}
else {
	document.getElementById('referral-id').innerHTML = "no referral, please find one.";
}

//var referral = document.getElementById('referral-id');
//referral.innerHTML('sdfadsfa');

