// this file allows you to test different configurations from the command line
// just call
// node simple-cli.js
// NODE_ENV=production node simple-cli.js
/*
// Add an appender to see the logging output
var slf4j = require('binford-slf4j');
var binfordLogger = require('binford-logger');
slf4j.loadConfig({
	level: 5,
	appenders:
		[{
			appender: binfordLogger.getDefaultAppender()
		}]
});
*/
var config = require('../lib/binford-config.js');

config.binfordConvention(__dirname);

console.log("Environment = " + config.get("NODE_ENV"));
console.log("Database = ");
console.log(config.get("database"));
console.log("systemv");
console.log(config.get("systemv"));
console.log("Database.username = " + config.get("database:username"));
console.log("Database.password = " + config.get("database:password"));
console.log("Database.connection = " + config.get("database:connection"));
// print the entire configuration
//console.log("All config:");
//console.log(config.get(""));