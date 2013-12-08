var config = require('../lib/binford-config.js');
var should = require('should');

describe('synopsis', function(){

	before(function(done){
		config.should.not.be.empty;
		config.clear();
		done();
	});

	it('should support the binford convention', function(){
		config.binfordConvention(__dirname);

		config.get("database:username").should.be.eql("tim");
		config.get("database:password").should.be.eql("more-power");
		should.strictEqual(undefined, config.get("database:connection"));

		config.get("systemv").should.be.eql({
			"isreal" : {
				"yes" : "yes",
				"no" : "yes"
			},
			"couples" : true
		});
	})

	it('should support different environments following the binford convention', function(){

		config.binfordConvention(__dirname);
		config.get("database:username").should.be.eql("tim");
		config.get("database:password").should.be.eql("more-power");
		should.strictEqual(undefined, config.get("database:connection"));

		config.clear();
		// simulate switching into production
		process.env.NODE_ENV = 'production';

		config.binfordConvention(__dirname);
		config.get("database:username").should.be.eql("tim");
		config.get("database:password").should.be.eql("al's mom");
		config.get("database:connection").should.be.eql("on-air");
	});
})