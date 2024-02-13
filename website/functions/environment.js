export function onRequest(context) {
	if (context.env.ENVIRONMENT === 'development') {
		return new Response('This is a local environment!');
	} else {
		return new Response('This is a live environment');
	}
}