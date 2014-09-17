'use strict';
/*!
 * Dependencies
 * --------------------------------------------------------------------------*/

var Promise = require('bluebird'),
    _       = require('lodash'),
    path    = require('path'),
    fs      = Promise.promisifyAll(require('fs'));

/**
 * Updates `dit`'s configuration file.
 * @param {Object} config An object representation of the configuration.
 * @param {String} [config_path=~/.ditconfig] The configuration file path.
 * @return {external:Promise} The results promise (yields undefined).
 */

exports.save = function(config, config_path) {
  config_path || (config_path = path.join(process.env.HOME, '.ditconfig'));

  var configP = fs.readFileAsync(config_path)
    .catch(function(err) {
      if(err.cause.errno === 34) return "{}"; // if the file doesn't exist
      else throw err;
    })
    .then(JSON.parse);

  var writeP = configP
    .then(function write(old_config) {
      var new_config = _.extend(old_config, config);
      return fs.writeFileAsync(config_path, JSON.stringify(new_config));
    });

  return writeP;
};
