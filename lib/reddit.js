'use strict';
var events = require('events');
var util = require('util');
var Promise = require('bluebird');
var _ = require('lodash');
var request = require('superagent');

Promise.promisifyAll(request.Request.prototype);

/**
 * @external Promise
 * @see {@link https://github.com/petkaantonov/bluebird/blob/master/API.md#core Promise}
 */

/**
 * Represents a reddit API session.
 *
 * @constructor Reddit
 *
 * @param {String} user_agent The API client's user agent
 * @param {Object} [config] An optional configuration object
 */

var Reddit = function(user_agent, config) {
  this._user_agent = user_agent;
  this._agent = request.agent();
  this._host = 'https://en.reddit.com/';

  /**
   * The current configuration object. The necessary values for
   * persisting/loading a session from disk.
   *
   * @property {Object} config
   */

  if(config) {
    this.config = config;
  } else {
    this.config = {};
  }

  events.EventEmitter.call(this);
};
util.inherits(Reddit, events.EventEmitter);

/**
 * Logs-in a user into Reddit
 *
 * @param {Object} creds Reddit credentials
 * @param {String} creds.user
 * @param {String} creds.passwd
 * @return {external:Promise} loginP
 */

Reddit.prototype.login = function(creds) {
  creds.api_type = 'json';
  creds.rem = true;

  return this.post('api/login.json', creds)
    .endAsync()
    .bind(this)
    .then(this._checkErrors)
    .then(function(res) {
      this.config.cookie = res.body.json.data.cookie;
      this.config.modhash = res.body.json.data.modhash;
      this.config.user = creds.user;
      return this.config;
    });
};

/**
 * Returns true if the reddit contains a valid session cookie and false
 * otherwise.
 *
 * @return {Boolean}
 */

Reddit.prototype.isLoggedIn = function() {
  return this.config && this.config.cookie && this.config.modhash &&
         this.config.user;
  // TODO && this.config.cookie_expiry > new Date()
};

/**
 * Checks a reddit api response for errors and throws them if so.
 *
 * @param {Object} res - The reddit API's response object
 * @throws Will throw an error if the response has erroed.
 * @return {Object} res
 */

Reddit.prototype._checkErrors = function(res) {
  var json   = res.body && (res.body.json || {}),
      errors = json.errors;

  if(errors && errors.length) {
    throw new Error(
      'API errored with: ' + errors.map(serializeError).join(', ')
    );
  } else if(res.body.error) {
    throw Error('API erroed with: ' + res.body.error);
  } else return res;
};

/**
 * Gets an user's saved reddit links.
 *
 * @api public
 *
 * @param {String} [after] A reddit link id. If provided, will query the reddit
 * API for links after it
 * @return {Promise} A promise to the result of fetching all saved posts
 * recursively
 */

Reddit.prototype.saved = function(after, saved_links) {
  if(!saved_links) {
    saved_links = [];
  }

  var req = this.get('user/' + this.config.user + '/saved.json');

  if(after) {
    req = req
      .query({
        after: after
      });
  }

  var _this = this;

  return req
    .endAsync()
    .then(this._checkErrors)
    .then(function(res) {
      var posts = _.map(res.body.data.children, function(child) {
        var post = {
          url: child.data.url,
          title: child.data.title || child.data.name,
        };

        _this.emit('post.new', post);

        return post;
      });

      saved_links = saved_links.concat(posts);

      if(!res.body.data.after) {
        return saved_links;
      }

      return _this.saved(res.body.data.after, saved_links);
    });
};

/**
 * Posts some json `body` to the reddit API's `path`.
 * @param {String} path - The path to POST to, under the reddit API's host
 * @param {Object} body - The JSON body to POST
 * @return {external:Promise} resP - A promise to the reddit API's response
 */

Reddit.prototype.post = function(path, body) {
  var req = this._agent.post(this._host + path)
    .send(body)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('User-Agent', this._user_agent)
    .set('X-Modhash', this.config.modhash || '');
  return req;
};

/**
 * Gets a JSON response to the reddit API's `path`, passing `query` as a
 * querystring.
 * @param {String} path - The path to GET, under the reddit API's host
 * @param {Object} [query] - A 'querystringable' object to send as query
 * @return {external:Promise} resP - A promise to the reddit API's response
 */

Reddit.prototype.get = function(path, query) {
  var req = this._agent.get(this._host + path)
    .query(query)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('Cookie', 'reddit_session=' + this.config.cookie)
    .set('X-Modhash', this.config.modhash || '')
    .set('User-Agent', this._user_agent);
  return req;
};

/**
 * Serializes an errors Array into an error message of format: 'CODE: MESSAGE'.
 * @param {Array} err
 * @param {{String|Number}} err[0] - The error code
 * @param {String} err[1] - The error message
 */

function serializeError(err) {
  return err[0] + ': ' + err[1]; // CODE: MESSAGE
}

// expose the Reddit class
module.exports = Reddit;
