'use strict';
var fs = require('fs');
var Promise = require('bluebird');

Promise.promisifyAll(fs);

exports._regexps = {
  isAlbum: /\/a\/([^.\/]+)/,
  isPhoto: /\.?imgur\.com\/([^.\/]+)/,
  isImgur: /^(https?:\/\/)?[^.]+.imgur./
};

/**
 * Finds imgur resources in a given URL.
 *
 * @param {Function} downloadImpl The downloading function
 * @param {String} url The target url
 * @return {Promise} A promise to an array of results or a single result
 */

exports.find = function find(downloadImpl, url) {
  var isAlbum = exports._regexps.isAlbum.exec(url);
  if(isAlbum) {
    return Promise.resolve([]);
  }

  var isPhoto = exports._regexps.isPhoto.exec(url);
  if(isPhoto) {
    // The extension doesn't matter, because imgur will either set the
    // content-type to a different image type or send an image of the specified
    // type.
    return Promise.resolve(['http://i.imgur.com/' + isPhoto[1] + '.jpg']);
  }

  return Promise.resolve([]);
};

/**
 * Tests if an URL is suitable for this resource finder.
 *
 * @param {String} url The target url
 * @return {Boolean} Whether it's an Imgur target
 */

exports.test = function test(url) {
  return exports._regexps.isImgur.test(url);
};
