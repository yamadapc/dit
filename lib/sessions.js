'use strict';
/**
 * Dependencies
 * --------------------------------------------------------------------------*/

var Promise = require('bluebird'),
    _       = require('lodash'),
    path    = require('path'),
    jf      = Promise.promisifyAll(require('jsonfile'));

/**
 * Updates `dit`'s configuration file.
 * @param {Object} config An object representation of the configuration.
 * @param {String} [config_path=~/.ditconfig] The configuration file path.
 * @return {external:Promise} The results promise (yields undefined).
 */

exports.save = function(config, config_path) {
  config_path || (config_path = path.join(process.env.HOME, '.ditconfig'));

  var configP = jf.readFileAsync(config_path).catch(function(err) {
    if(err /* file doesn't exist*/) return {};
    else throw err;
  });

  var writeP = configP
    .then(function write(old_config) {
      var new_config = _.extend(old_config, config);
      return jf.writeFileAsync(config_path, new_config);
    });

  return writeP;
};
