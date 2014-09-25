'use strict';
var Promise = require('bluebird'),
    _ = require('lodash'),
    path = require('path'),
    fs = Promise.promisifyAll(require('fs'));

var HOME = process.env.HOME;

/**
 * Updates `dit`'s configuration file.
 *
 * @param {Object} config An object representation of the configuration
 * @param {String} [config_path=~/.ditconfig] The configuration file path
 * @return {external:Promise} The result's promise (yields undefined)
 */

exports.save = function(config, config_path) {
  config_path || (config_path = path.join(HOME, '.ditconfig'));

  var configP = exports.load(config_path);
  var writeP = configP
    .then(function write(old_config) {
      var new_config = exports._compactObject(_.extend(old_config, config));
      return fs.writeFileAsync(config_path, JSON.stringify(new_config));
    });

  return writeP;
};

/**
 * Loads a `dit's` configuration file.
 *
 * @param {String} [config_path=~/.ditconfig] THe configuration file path
 * @return {external:Promise.<Object>} The loaded configuration object
 */

exports.load = function(config_path) {
  config_path || (config_path = path.join(HOME, '.ditconfig'));
  return fs.readFileAsync(config_path)
    .then(
      function(config) {
        return JSON.parse(config);
      },
      function(err) {
        if(exports._isFileNotFoundError(err)) return {};
        else throw err;
      }
    );
};

/**
 * Helper for defining if an file read error was caused by it not existing in
 * disk.
 *
 * @param {Error} err The error to test against
 * @param {Error} err.cause
 * @param {Number} err.cause.errno
 * @return {Boolean}
 */

exports._isFileNotFoundError = function(err) {
  return err.cause.errno === 34;
};

/**
 * The equivalent of `_.compact` for objects. Removes all falsy properties from
 * an object. This is not a pure function.
 *
 * @param {Object} obj The target object
 * @return {Object} The input argument
 */

exports._compactObject = function(obj) {
  var keys = Object.keys(obj);
  for(var i = 0, len = keys.length; i < len; i++) {
    var key = keys[i];
    if(!obj[key]) {
      delete obj[key];
    }
  }
  return obj;
};
