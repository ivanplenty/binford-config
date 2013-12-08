Binford Configuration
=======================

A read-only key-value and hierarchical runtime config API.  The configuration comes from three places:

* command line arguments
* environment variables
* environment-specific json and yml files
* environment-agnostic json and yml files

You load the config once at runtime, typically next to other initialization code, and then throughout your code
you simply call get() with the specified key.  Configuration is merged together and follows the precedence set
by the order you load the configuration.

The get() method will not throw an exception, and instead prefers to return undefined if a key isn't found.

Synopsis
========
var config = require('binford-config');

config.binfordConvention(__dirname);
// many people prefer this as well
// config.binfordConvention(__dirname + "/conf");

var database = require('database').connect(
	config.get("database:username"),
	config.get("database:password")
);

var isProduction = (config.get("NODE_ENV") == 'production');

// That's it.

Binford Convention
==================
The binford precendence is roughly implemented using this logic:

// load values from the specific fil
config.loadFile(path.join(__dirname, ".binford.json"));
config.loadFile(path.join(__dirname, ".binford.yml"));
// checks the environment variables set at runtime
config.loadFile(path.join(__dirname, ".binford.production.json"));
config.loadFile(path.join(__dirname, ".binford.production.yml"));
// load any values stored in the system environment variables
config.loadEnv();
// load any arguments passed in via the command-line
config.loadArgv();

// That's it!