var fs 			= require('fs'),
	path 		= require('path'),
	logger 		= require('binford-slf4j').getLogger('binford/config'),
	errors 		= require('./errors.js'),
	_	 		= require('lodash'),
	jsyaml 		= require('js-yaml'),
	optimist 	= require('optimist');


var MAX_FILE_SIZE = 2097152; // 2MB in bytes.  Config files should be small...
var DEFAULT_BINFORD_FILE = ".binford";
var EXT_YAML = ".yml";
var EXT_JSON = ".json";
var EXT_NODEJS = ".js";


// This module is designed to store a few things in memory.
// It is a read-only configuration store
// It also is designed to favor speed over memory
var configStore = {};

module.exports.gracefullyLoadFile = function(filename, namespace){
	if(fs.existsSync(filename)){
		module.exports.loadFile(filename);
	}
	else
	{
		logger.debug("Asked to load config file '{0}', but it does not exist.  Gracefully failing.", filename);
	}
}

module.exports.loadDefaults = function(callback, namespace){
	if(callback && _.isFunction(callback)){
		logger.debug("Loading defaults via callback");
		var defaults = {};
		callback(defaults);

		accept(namespace, defaults);
	}
	else if(callback && _.isObject(callback))
	{
		logger.debug("Loading defaults.  It seems we were given an object to accept");
		// assume that the callback is an object
		accept(namespace, callback);
	}
	else
	{
		logger.debug("Would have loaded defaults, but no defaults were provided");
		// do nothing
	}
}

module.exports.loadFile = function(filepath, namespace){
	var loadedVars = selectFileLoader(filepath)(filepath);

	accept(namespace, loadedVars);
}

module.exports.loadEnv = function(namespace){
	logger.debug("Loading {0} environment variables", process.env.length);
	accept(namespace, process.env);
}

module.exports.loadArgv = function(callback, namespace){
	if(callback && _.isFunction(callback))
	{
		callback(optimist);
	}
	var argv = optimist.argv;
	accept(namespace, argv);
}

module.exports.binfordConvention = function(dir){
	if(!dir || !_.isString(dir))
		throw errors.MISSING_DIRNAME();
	logger.debug("Loading the binford convention of configuration");
	// load the general binford files first
	module.exports.gracefullyLoadFile(path.join(dir, DEFAULT_BINFORD_FILE + EXT_JSON));
	module.exports.gracefullyLoadFile(path.join(dir, DEFAULT_BINFORD_FILE + EXT_YAML));

	// load the 
	var currentEnv = undefined;
	if(process.env.ENV)
	{
		currentEnv = process.env.ENV;
	}
	else if(process.env.NODE_ENV)
	{
		currentEnv = process.env.NODE_ENV;
	}
	var peekArgv = optimist.argv;
	if(peekArgv.env)
	{
		currentEnv = peekArgv.env;
	}
	else if (peekArgv.ENV)
	{
		currentEnv = peekArgv.ENV;
	}
	else if (peekArgv.NODE_ENV)
	{
		currentEnv = peekArgv.NODE_ENV;
	}

	if(currentEnv && _.isString(currentEnv))
	{
		module.exports.gracefullyLoadFile(
			path.join(
				dir,
				DEFAULT_BINFORD_FILE + "." + currentEnv + EXT_JSON
			)
		);
		module.exports.gracefullyLoadFile(
			path.join(
				dir,
				DEFAULT_BINFORD_FILE + "." + currentEnv + EXT_YAML
			)
		);
	}

	// load the environment variables
	module.exports.loadEnv();
	// load the command-line arguments
	module.exports.loadArgv();

	logger.debug("binford convention loaded.  This is the internal state:");
	logger.debug(configStore);
}

// shorthand...
module.exports.bincon = module.exports.binfordConvention;

// Get is optimized for selecting a specific key without a bunch of checks
// or nulls getting percolated up
module.exports.get = function(selectKey){
	// this method should not throw an exception
	selectKey = selectKey || "";
	logger.debug("Retrieving config value for key '{0}'", selectKey);
	if(configStore[selectKey])
	{
		return configStore[selectKey];
	}

	return _.reduce(configStore, function(accumulator, value, key){
		if(key.indexOf(selectKey) == 0){
			if(key.length == selectKey.length)
			{
				// in this reduce algorithm, the same lengths mean an exact match
				return value;
			}
			else
			{
				if(selectKey.length == 0 || key.charAt(selectKey.length) == ':')
				{
					// this is a child key
					// need to determine what is underneath
					// and then re-construct a JavaScript object
					var remaining = key.substring(
						selectKey.length == 0
						? 0
						: selectKey.length + 1
					);
					var parts = remaining.split(':');
					accumulator = accumulator || {};
					if(parts.length == 1)
					{
						// handle the special cases of "global" and "namespace:"
						accumulator[remaining] = value;
					}
					else
					{
						var root = accumulator || {};
						_.forEach(parts, function(partV, partI){
							root[partV] = root[partV] || {};
							
							if(partI == parts.length - 1)
							{
								root[partV] = value;
							}
							else
							{
								root = root[partV];
							}
						});
					}
					return accumulator;
				}
				else
				{
					// discard since this is a similar but differet key
					return accumulator;
				}
			}
		}
		else
		{
			return accumulator;
		}
	}, undefined);
}

module.exports.clear = function(){
	logger.debug("Clearing all config keys");
	configStore = {};
}

// some habits die hard, and we think this is the best way to preserve intent
module.exports.set = function(){
	logger.error("Binford config is a read-only config module");
	throw errors.CONFIG_READ_ONLY();
}

var accept = function(namespace, vars){
	if(namespace)
	{
		traverse(namespace, vars);
	}
	else
	{
		traverse(null, vars);
	}
}

var traverse = function(parent, vars){
	// order matters since Object is a broad catch
	// and, unfortunately parent can be null
	if(parent && _.isArray(vars)){
		configStore[parent] = vars;
	}
	else if (parent && _.isString(vars)){
		configStore[parent] = vars;
	}
	else if (parent && _.isDate(vars)){
		configStore[parent] = vars;
	}
	else if (parent && _.isEmpty(vars)){
		configStore[parent] = vars;
	}
	else if (_.isPlainObject(vars)){
		_.forEach(vars, function(value, key){
			if(parent){
				traverse(parent + ":" + key, value);	
			}
			else
			{
				traverse(key, value);
			}
		});
	}
	else {
		if(parent)
		{
			if(configStore[parent])
				configStore[parent] = _.merge(configStore[parent], vars);
			else
				configStore[parent] = vars;
		}
		else
		{
			configStore = _.merge(configStore, vars);
		}
	}
}

var selectFileLoader = function(filepath){
	var ext = path.extname(filepath);
	logger.debug("We detect that file '{0}' has ext '{1}'", filepath, ext);

	if(ext == EXT_YAML){
		return module.exports.loadYamlFile;
	}
	else if (ext == EXT_JSON){
		return module.exports.loadJsonFile;
	}
	else if (ext == EXT_NODEJS){
		return module.exports.loadNodeJsFile;
	}
	else{
		logger.warn("File '{0}' is not one of the supported filetypes.", filepath);
		throw errors.CONFIG_FILE_EXT_NOT_SUPPORTED(filepath);
	}
}

var ensureFileIsSafe = function(filepath){
	var stats = fs.statSync(filepath);
	if(stats.isFile())
	{
		if(stats.size <= MAX_FILE_SIZE)
		{
			return true;
		}
		else
		{
			logger.warn("File '{0}' has size '{1}', which exceeds max supported size '{2}'",
				filepath,
				stats.size,
				MAX_FILE_SIZE
			);
			throw errors.CONFIG_FILE_TOO_LARGE(filepath);
		}
	}
	else
	{
		logger.warn("File '{0}' is not a traditional OS file and is not supported", filepath);
		throw errors.CONFIG_FILE_EXT_NOT_SUPPORTED(filepath);
	}
}

// these helper methods are exported since they may be useful
// in their own rights
module.exports.loadYamlFile = function(filepath){
	logger.debug("Loading YAML config file '{0}'", filepath);
	ensureFileIsSafe(filepath);
	
	var ymlString = fs.readFileSync(filepath, {encoding: "utf8"});
	var ymlVars = jsyaml.safeLoad(ymlString);

	return ymlVars;
}

module.exports.loadJsonFile = function(filepath){
	logger.debug("Loading JSON config file '{0}'", filepath);
	ensureFileIsSafe(filepath);

	var jsonString = fs.readFileSync(filepath, {encoding: "utf8"});
	var jsonVars = JSON.parse(jsonString);

	return jsonVars;
}

module.exports.loadNodeJsFile = function(filepath){
	logger.debug("Loading Node.JS config file '{0}'", filepath);
	var jsVars = require(filepath);

	return jsVars;
}