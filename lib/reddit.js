'use strict';
/**
 * Dependencies
 * --------------------------------------------------------------------------*/

var Promise = require('bluebird'),
    request = require('superagent');
Promise.promisifyAll(request.Request.prototype);

var Reddit = function(user_agent) {
  this._user_agent = user_agent;
  this._agent = request.agent();
  this._host = 'https://en.reddit.com/';
};

Reddit.prototype.login = function(creds) {
  creds.api_type = 'json';
  creds.rem = true;

  return this.post('api/login.json', creds)
    .endAsync()
    .bind(this)
    .then(this._checkErrors)
    .then(function(res) {
      this._cookie = res.body.json.data.cookie;
      this._modhash = res.body.json.data.modhash;
    });
};

Reddit.prototype._checkErrors = function(res) {
  var status = res.status,
      json   = res.body && (res.body.json || {});

  var errors = json.errors;

  if(errors && errors.length) {
    var err = new Error('API errored with: ' + errors.map(serializeError).join(', '));

    err.status = status;
    throw err;
  } else return res;
};

Reddit.prototype.saved = function(username) {
  return this.get('user/' + username+'/saved.json')
    .endAsync()
    .bind(this)
    .then(this._checkErrors);
};

Reddit.prototype.post = function(path, body) {
  return this._agent.post(this._host + path)
    .send(body)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('User-Agent', this._user_agent)
    .set('Cookie', 'reddit_session=' + encodeURIComponent(this._cookie));
};

Reddit.prototype.get = function(path, query) {
  return this._agent.get(this._host + path)
    .query(query)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('User-Agent', this._user_agent)
    .set('Cookie', 'reddit_session=' + encodeURIComponent(this._cookie));
};

function serializeError(err) {
  return err[0] + ': ' + err[1]; // CODE: MESSAGE
}

// expose the Reddit class
module.exports = Reddit;
