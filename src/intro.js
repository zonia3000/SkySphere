(function (factory) {
	if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else {
		window.SkySphere = factory();
	}
}(function () {
