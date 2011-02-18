var vows = require("vows"),
	assert = require("assert"),
	DuplexStream = require("../lib/duplexstream"),
	stream = require("stream"),
	streamBuffers = require("stream-buffers");

var testStr = "Hello!";

var createDuplexStreamTopic = function(additional) {
	return function() {
		var readable = new streamBuffers.ReadableStreamBuffer();
		var writable = new streamBuffers.WritableStreamBuffer();
		var instance = new DuplexStream(readable, writable);
		instance._readableStream = readable;
		instance._writableStream = writable;
		var result = additional.call(this, instance);
		if(result !== undefined) return result;
	}
};

vows.describe("DuplexStream").addBatch({
	"A default DuplexStream": {
		topic: new DuplexStream(process.stdin, process.stdout),

		"is a Stream": function(instance) {
			assert.instanceOf(instance, stream.Stream);
		},

		"is readable": function(instance) {
			assert.isTrue(instance.readable);
		},

		"is writable": function(instance) {
			assert.isTrue(instance.writable);
		}
	},
	
	"A default DuplexStream passed a non-readable input": {
		topic: function() {
			return function() { return new DuplexStream(new streamBuffers.WritableStreamBuffer(), process.stdout); };
		},
	
		"will throw an Error": function(constructor) {
			assert.throws(constructor, TypeError);
		}
	},
	
	"A default DuplexStream passed a non-writable input": {
		topic: function() {
			return function() { return new DuplexStream(process.stdin, new streamBuffers.ReadableStreamBuffer()); };
		},
	
		"will throw an Error": function(constructor) {
			assert.throws(constructor, TypeError);
		}
	}
})
.addBatch({
	"When underlying readable has data": {
		topic: createDuplexStreamTopic(function(instance) {
			instance.on("data", this.callback.bind(this, null, instance));
			instance._readableStream.put(testStr);
		}),
		
		"data event triggers with data Buffer": function(instance, data) {
			assert.instanceOf(data, Buffer);
		},
		
		"with correct data": function(instance, data) {
			assert.equal(data.toString(), testStr);
		}
	},
	
	"When DuplexStream is paused/resumed": {
		topic: createDuplexStreamTopic(function(instance) {
			var actualPause = instance._readableStream.pause;
			instance._readableStream.pause = function() {
				this.pauseCalled = true;
				actualPause.apply(this);
			}.bind(instance._readableStream);
			
			var actualResume = instance._readableStream.resume;
			instance._readableStream.resume = function() {
				this.resumeCalled = true;
				actualResume.apply(this);
			}.bind(instance._readableStream);
			
			instance.pause();
			instance.resume();
			
			return instance;
		}),
		
		"pause is called on underlying stream": function(instance) {
			assert.isTrue(instance._readableStream.pausedCalled);
		},
		
		"resume is called on underlying stream": function(instance) {
			assert.isTrue(instance._readableStream.resumeCalled);
		}
	},
	
	"When DuplexStream has encoding set on it": {
		topic: createDuplexStreamTopic(function(instance) {
			var actualSetEncoding = instance._readableStream.setEncoding;
			instance._readableStream.setEncoding = function(encoding) {
				instance._readableStream._encodingCalled = encoding;
				actualSetEncoding.call(this);
			}.bind(instance._readableStream);
			
			instance.setEncoding("ascii");
			return instance;
		}),
		
		"encoding is called on underlying readable": function(instance) {
			assert.isString(instance._readableStream._encodingCalled);
		},
		
		"with correct encoding identifier": function(instance) {
			assert.equal(instance._readableStream._encodingCalled, "ascii");
		}
	},
	
	"When drain is emitted on underlying writable": {
		topic: createDuplexStreamTopic(function(instance) {
			instance.on("drain", this.callback.bind(this, null, instance));
			instance._writableStream.emit("drain");
		}),

		"drain is emitted on DuplexStream": function() {
			assert.isTrue(true)
		}
	},
	
	"When DuplexStream is piped *to*": {
		topic: createDuplexStreamTopic(function(instance) {
			var that = this;
			var anotherReadable = new streamBuffers.ReadableStreamBuffer();
			instance._anotherReadable = anotherReadable;
			instance.on("pipe", function(src) {that.callback(null, instance, src);});			
			anotherReadable.pipe(instance);
		}),
		
		"source is correct": function(instance, src) {
			assert.equal(src, instance._anotherReadable);
		}
	},
	
	"When piped *from* DuplexStream": {
		topic: createDuplexStreamTopic(function(instance) {
			var anotherWritable = new streamBuffers.WritableStreamBuffer();
			anotherWritable.on("pipe", function() { anotherWritable.pipeCalled = true; });
			instance._anotherWritable = anotherWritable;
			instance.pipe(anotherWritable);
			return instance;
		}),
		
		"pipe event is emitted on target": function(instance) {
			assert.isTrue(instance._anotherWritable)
		}
	},
	
	/*"When underlying writable ends": {
		topic: createDuplexStreamTopic(function(instance) {
			instance._writableStream.end();
			return instance;
		}),
	}*/
}).export(module);
