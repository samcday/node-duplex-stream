var stream = require("stream"),
	util = require("util");

var DuplexStream = module.exports = function(readable, writable) {
	if(!readable.readable) {
		throw new TypeError("Invalid readable stream provided.");
	}
	if(!writable.writable) {
		throw new TypeError("Invalid writable stream provided.");
	}

	stream.Stream.call(this);
};
util.inherits(DuplexStream, stream.Stream);