'use strict';
var events = require('events'),
    fs = require('fs'),
    http = require('http'),
    path = require('path'),
    util = require('util'),
    Promise = require('bluebird'),
    mime = require('mime');

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
  if(!Downloader._dirExistsSync(target_dir)) {
    fs.mkdirSync(target_dir);
  }

  this.target_dir = target_dir;
  this.downloading = [];
  events.EventEmitter.call(this);
}
util.inherits(Downloader, events.EventEmitter);

/**
 * Starts downloading an posts and stores a promise to its result.
 *
 * @param {Object} post
 * @param {String} post.title The post's reddit title
 * @param {String} post.url The post's URL
 * @return {String} target_path The path the post will be downloaded to
 */

Downloader.prototype.download = function(post) {
  var _this = this;
  var target_path = path.join(this.target_dir, Downloader._slug(post.title));

  // Helper object for emitting download events
  var msg = { post: post, target_path: target_path, };

  // Start the download:
  _this.emit('download.new', msg);
  var downloadP = Downloader._downloadImpl(target_path, post.url)
    // Attach event listeners to the download's result
    .then(
      this.emit.bind(this, 'download.done', msg),
      // On a side note, we're preventing errors from being thrown here, so the
      // `done` function will deterministically end for all posts to finish,
      // regarless of whether a download fails along the way.
      function(err) {
        msg.err = err;
        _this.emit('download.error', msg);
      }
    );

  // Store a promise to the download so we can later wait for this to finish
  // execution:
  this.downloading.push(downloadP);

  return target_path;
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
 * Downloads a resource at `url` to `target_path`.
 *
 * @api private
 *
 * @param {String} target_path The destination path
 * @param {String} url The target URL
 * @return {Promise} A promise to the download's result
 */

Downloader._downloadImpl = function(target_path, url) {
  var targetP = Downloader._urlToDownloadTarget(url);

  return targetP.then(function(target) {
    return new Promise(function(resolve, reject) {
      http
        .get(
          target,
          Downloader._resToFile.bind(Downloader, resolve, reject, target_path)
        )
        .on('error', reject);
    });
  });
};

/**
 * Convert som post's URL into a downloadable resource's URL.
 *
 * @api private
 *
 * @param {String} url The post's url
 * @return {Promise.<String>} A promise to the found URL
 */

Downloader._urlToDownloadTarget = function(url) {
  return match(url);

  function match(url) {
    switch(true) {
      case /.+\.(jpe?g|gif|png|tiff)/.test(url):
        return Promise.resolve(url);
      default:
        return Promise.reject(new Error('Couldn\'t find a download target.'));
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
 * @param {String} target_path The path to pipe `res` into
 * @param {http.Response} res A `http.Response` instance (could be any readable
 * stream)
 */

Downloader._resToFile = function(resolve, reject, target_path, res) {
  var ext = mime.extensions[res.headers['content-type']];
  var writable = fs.createWriteStream(target_path + '.' + ext);
  writable.on('finish', resolve);
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
 * Returns whether a directory exists at file path `pth`.
 *
 * @param {String} pth The path to check for existence
 * @param {Boolean} Whether a directory exists at `pth`
 */

Downloader._dirExistsSync = function(pth) {
  return fs.existsSync(pth) && fs.statSync(pth).isDirectory();
};
