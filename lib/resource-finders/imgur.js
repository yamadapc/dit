'use strict';
var fs = require('fs');
var Promise = require('bluebird');

var cheerio = require('cheerio');
var tmp = require('tmp');

Promise.promisifyAll(fs);
Promise.promisifyAll(tmp);

exports._regexps = {
  isAlbum: /\/a\/([^.\/]+)/,
  isPhoto: /\.?imgur\.com\/([^.\/]+)/,
  isImgur: /^(https?:\/\/)?[^.]+.imgur.com\/[^?]+/
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
    return exports.handleAlbum(downloadImpl, url);
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

/**
 * Fetches the resources in an imgur album.
 *
 * @param {Function} downloadImpl The downloading function
 * @param {String} url The album's url
 * @return {Promise.<String>} A promise to the found resources
 */

exports.handleAlbum = function(downloadImpl, url) {
  if(url.indexOf('https') === 0) {
    url = url.replace(/https/, 'http');
  }

  return tmp
    .tmpNameAsync()
    .then(function(tmp_name) {
      return downloadImpl(tmp_name, url);
    })
    .then(function(pth) {
      var resultP = fs.readFileAsync(pth, 'utf-8')
        .then(function(data) {
          var $ = cheerio.load(data);
          return $('#image-container').find('.image').map(function(_, el) {
            return 'http://i.imgur.com/' + el.attribs.id + '.jpg';
          }).get();
        });

      resultP.then(function() {
        fs.unlinkAsync(pth).catch(function() {});
      });

      return resultP;
    });
};
