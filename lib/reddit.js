'use strict';
var _ = require('lodash'),
    Promise = require('bluebird'),
    request = require('superagent');

Promise.promisifyAll(request.Request.prototype);

/**
 * @external Promise
 * @see {@link https://github.com/petkaantonov/bluebird/blob/master/API.md#core Promise}
 */

/**
 * Represents a reddit API session.
 * @constructor Reddit
 * @param {String} user_agent - The API client's user agent
 */

var Reddit = function(user_agent) {
  this._user_agent = user_agent;
  this._agent = request.agent();
  this._host = 'https://en.reddit.com/';
};

/**
 * Logs-in a user into Reddit
 * @param {{user: String, passwd: String}} creds - Reddit credentials
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
      this.user = creds.user;
      this._cookie = res.body.json.data.cookie;
      this._modhash = res.body.json.data.modhash;
      this._cookie_expiry = this._getCookieExpiry(res.headers['set-cookie']);
      return {
        cookie:        this._cookie,
        modhash:       this._modhash,
        cookie_expiry: this._cookie_expiry
      };
    });
};

/**
 * Checks a reddit api response for errors and throws them if so.
 * @param {Object} res - The reddit API's response object
 * @throws Will throw an error if the response has erroed.
 * @return {Object} res
 */

Reddit.prototype._checkErrors = function(res) {
  var json   = res.body && (res.body.json || {}),
      errors = json.errors;

  if(errors && errors.length) {
    var err = new Error('API errored with: ' + errors.map(serializeError).join(', '));

    throw err;
  } else return res;
};

/**
 * Parses out a cookie's expiration.
 * @param {Array} set_cookie - A 'set-cookie' header.
 * @return {Number} expiry - This cookie's 'Max-Age' value
 */

var max_cookie_regexp = /Max-Age=/;
Reddit.prototype._getCookieExpiry = function(set_cookie) {
  return set_cookie.reduce(function(memo, curr) {
    if(memo !== 0) return memo;
    else return max_cookie_regexp.test(curr) ? curr.split('=')[0] : memo;
  }, 0);
};

/**
 * Gets an user's saved reddit links.
 * @param {String} [username=this.user] - The target reddit user to query for
 * @return {external:Promise} savedP - A promise to the reddit API's response
 */

Reddit.prototype.saved = function(username) {
  if(!username) {
    if(this.user) username = this.user;
    else throw new TypeError('No username or `user` session available.');
  }

  return this.get('user/' + username+'/saved.json')
    .endAsync()
    .bind(this)
    .then(this._checkErrors)
    .then(function(res) {
      return _.map(
        res.body.data.children,
        function(child) {
          return { url: child.data.url, title: child.data.title, };
        }
      );
    });
};

/**
 * Posts some json `body` to the reddit API's `path`.
 * @param {String} path - The path to POST to, under the reddit API's host
 * @param {Object} body - The JSON body to POST
 * @return {external:Promise} resP - A promise to the reddit API's response
 */

Reddit.prototype.post = function(path, body) {
  return this._agent.post(this._host + path)
    .send(body)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('User-Agent', this._user_agent)
    .set('Cookie', 'reddit_session=' + encodeURIComponent(this._cookie));
};

/**
 * Gets a JSON response to the reddit API's `path`, passing `query` as a
 * querystring.
 * @param {String} path - The path to GET, under the reddit API's host
 * @param {Object} [query] - A 'querystringable' object to send as query
 * @return {external:Promise} resP - A promise to the reddit API's response
 */

Reddit.prototype.get = function(path, query) {
  return this._agent.get(this._host + path)
    .query(query)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('User-Agent', this._user_agent)
    .set('Cookie', 'reddit_session=' + encodeURIComponent(this._cookie));
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
