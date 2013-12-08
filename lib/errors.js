var Err = require('binford-err').Err;

module.exports = {
	CONFIG_FILE_TOO_LARGE : function(filename){
		return new Err(
			413,
			"BINFORD:CONFIG:FILE_TOO_LARGE",
			filename,
			undefined
		);
	},

	CONFIG_FILE_EXT_NOT_SUPPORTED : function(filename){
		return new Err(
			415,
			"BINFORD:CONFIG:FILE_NOT_SUPPORTED",
			options.message,
			options.innerErr
		);
	},

	CONFIG_READ_ONLY : function(){
		return new Err(
			500,
			"BINFORD:CONFIG:READ_ONLY",
			"binford-config only supports read only",
			undefined
		);
	},

	MISSING_DIRNAME : function(){
		return new Err(
			400,
			"BINFORD:CONFIG:MISSING_DIRNAME",
			"the binford convention requires the caller to provide the dirname since __dirname is based on the library file and not your code",
			undefined
		);
	}
};