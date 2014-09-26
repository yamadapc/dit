'use strict';
var events = require('events');
var fs = require('fs');
var http = require('http');
var path = require('path');
var util = require('util');
var Promise = require('bluebird');
var _ = require('lodash');
var mime = require('mime');

var resourceFinders = require('./resource-finders');

Promise.promisifyAll(fs);

exports = module.exports = Downloader;

/**
 * A representation of the post downloader. It'll start downloading posts as
 * they're added and emit events for new and completed downloads, while
 * providing an API for waiting for all downloads to finish. It inherits from
 * `EventEmitter`
 *
 * @api public
 * @constructor
 *
 * @param {String} target_dir The directory to download posts into
 */

function Downloader(target_dir) {
  this.target_dirP = Downloader._mkdirP(target_dir)
    .then(function() {
      return target_dir;
    });

  this.downloading = [];

  events.EventEmitter.call(this);
}
util.inherits(Downloader, events.EventEmitter);

Downloader.resourceFinders = resourceFinders;

/**
 * Starts downloading an posts and stores a promise to its result.
 *
 * @param {Object} post
 * @param {String} post.title The post's reddit title
 * @param {String} post.url The post's URL
 */

Downloader.prototype.download = function(post) {
  var _this = this;
  var title_slug = Downloader._slug(post.title);

  // Get the resources to download:
  var targetsP = Downloader._urlToDownloadTargets(post.url)
    .catch(function(err) {
      _this.emit('download.error', {
        post: post,
        err: err,
      });
      return [];
    });

  // Start the download:
  var downloadP = Promise.join(targetsP, this.target_dirP)
    .spread(function(targets, target_dir) {
      return Promise.map(targets, function(target, i) {
        var basename = targets.length < 2 ? title_slug : title_slug + i;
        var destination = path.join(target_dir, basename);

        _this.emit('download.new', {
          post: post,
          target: target,
        });

        return Downloader.downloadImpl(destination, target)
          // Attach event listeners to the download's result
          .then(
            function(target_path) {
              _this.emit('download.done', {
                post: post,
                target: target,
                target_path: target_path,
              });
            },
            // On a side note, we're preventing errors from being thrown here, so
            // the `done` function will deterministically end for all posts to
            // finish, regarless of whether a download fails along the way.
            function(err) {
              _this.emit('download.error', {
                post: post,
                target: target,
                err: err,
              });
            }
          );
      });
    });

  // Store a promise to the download so we can later wait for this to finish
  // execution:
  this.downloading.push(downloadP);
};

/**
 * A shorthand to wait for all downloads to finish. Returns a promise to
 * downloads completion.
 *
 * @api public
 *
 * @return {Promise} A promise to the downloads' result
 */

Downloader.prototype.done = function() {
  return Promise.all(this.downloading);
};

/**
 * Downloads resources at `url` to `target_path`.
 *
 * @param {String} target_path The destination path
 * @param {String} url The target URL
 * @return {Promise} A promise to the download result
 */

Downloader.downloadImpl = function(target_path, url) {
  return new Promise(function(resolve, reject) {
    http
      .get(
        url,
        Downloader._resToFile.bind(Downloader, resolve, reject, target_path)
      )
      .on('error', reject);
  });
};

/**
 * Convert som post's URL into a downloadable resource's URL.
 *
 * @api private
 *
 * @param {String} url The post's url
 * @return {Promise.<Array>} A promise to the found URLs
 */

Downloader._urlToDownloadTargets = function(url) {
  return match(url);

  function match(url) {
    switch(true) {
      case /.+\.(jpe?g|gif|png|tiff)/.test(url):
        return Promise.resolve([url]);
      default:
        var resourceFinder = _.find(
          Downloader.resourceFinders,
          function(resourceFinder) {
            return resourceFinder.test(url);
          }
        );

        if(resourceFinder) {
          return resourceFinder.find(Downloader.downloadImpl, url);
        }

        return Promise.reject(
          new Error('Couldn\'t find a download target for ' + url)
        );
    }
  }
};

/**
 * Takes a promises's `resolve` and `reject` functions, a target path and a
 * `http.Response` object and pipes it into a file at the provided path.
 *
 * @api private
 *
 * @param {Function} resolve A promise's fulfillment handler
 * @param {Function} reject A promise's rejection handler
 * @param {String} base_path The path to pipe `res` into (the extension will be
 * chosen based on the response's content-type
 * @param {http.Response} res A `http.Response` instance (could be any readable
 * stream)
 */

Downloader._resToFile = function(resolve, reject, base_path, res) {
  var ext = mime.extensions[res.headers['content-type']];
  var target_path = base_path + '.' + ext;
  var writable = fs.createWriteStream(target_path);
  writable.on('finish', function() { resolve(target_path); });
  writable.on('error', reject);
  res.pipe(writable);
};

/**
 * Slugs a string, replacing non-alphanumeric characters with a dash (`-`).
 *
 * @api private
 *
 * @param {String} str The string generate a slug from
 * @return {String} The slugged string
 */

Downloader._slug = function(str) {
  var ret = str.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if(ret[0] === '-') ret = ret.slice(1);
  if(ret[ret.length - 1] === '-') ret = ret.slice(0, -1);
  return ret;
};

/**
 * Creates a directory at path if it doesn't already exist 
 *
 * @param {String} pth The path to create a directory in
 * @param {Promise} A promise to the result
 */

Downloader._mkdirP = function(pth) {
  return Downloader._dirExists(pth)
    .then(function(dexists) {
      if(!dexists) {
        return fs.mkdirAsync(pth);
      }

      return Promise.fulfilled();
    });
};

/**
 * Returns whether a directory exists at file path `pth`.
 *
 * @param {String} pth The path to check for existence
 * @param {Promise.<Boolean>} Whether a directory exists at `pth`
 */

Downloader._dirExists = function(pth) {
  return Downloader._exists(pth)
    .then(function(exists) {
      if(exists) {
        return fs.statAsync(pth)
          .then(function(stat) {
            return stat.isDirectory();
          }, function(err) { console.error(err.stack); });
      }

      return false;
    });
};

/**
 * A promise wrapper around the `fs.exists` function. (It can't be promisified
 * automatically because it doesn't follow the `cb(err, res)` pattern.
 *
 * @param {String} pth A path to check for existence
 * @return {Promise.<Boolean> Whether some file or directory exists at `pth`
 */

Downloader._exists = function(pth) {
  return new Promise(function(resolve) {
    fs.exists(pth, function(exists) {
      return resolve(exists);
    });
  });
};
