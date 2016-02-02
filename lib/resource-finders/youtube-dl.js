'use strict';
var Promise = require('bluebird');
var child_process = require('child_process');

exports.test = function() { return false; };

//exports.test = function test(url) {
  //var realUrl = false;
  //try {
    //realUrl = child_process.execSync('youtube-dl -g ' + url);
  //} catch(err) {
  //}
  //console.log(realUrl.toString());
  //return realUrl;
//};

/**
 * Finds imgur resources in a given URL.
 *
 * @param {Function} downloadImpl The downloading function
 * @param {String} url The target url
 * @return {Promise} A promise to an array of results or a single result
 */

exports.find = function find(downloadImpl, url) {
  return Promise.resolve([
    child_process.execSync('youtube-dl -g ' + url).toString()
  ]);
};
