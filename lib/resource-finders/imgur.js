'use strict';
var fs = require('fs');
var path = require('path');
var os = require('os');
var Promise = require('bluebird');
var Downloader = require('../downloader');

Promise.promisifyAll(fs);

exports = module.exports = find;

/**
 * Finds imgur resources in a given URL.
 *
 * @param {String} url The target url
 * @return {Promise} A promise to an array of results or a single result
 */

function find(url) {
  var tmp_dir = path.join(os.tmpdir(), (new Date()).getTime() + Math.random());
  var pageP = Downloader.downloadImpl(tmp_dir, url);

  return pageP
    .then(function() {
      return fs.readFileAsync(tmp_dir, 'utf-8');
    })
    // The `acc` argument doesn't get passed-in here
    .then(matchImgSrc);
}

/**
 * Finds HTML img tag urls in a string.
 *
 * @param {String} file
 * @return {Array.<String>} [acc] An accumulator for recursive searching
 */

function matchImgSrc(file, acc) {
  if(!acc) {
    acc = [];
  }

  var result = /<img src=([^\s]+) .+\/[^>]+>/gi.exec(file);

  if(result == null) {
    return acc;
  }

  acc.push(result[1]);

  return matchImgSrc(file, acc);
}
