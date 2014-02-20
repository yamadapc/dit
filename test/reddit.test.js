'use strict'; /* global describe, it */
/**
 * Dependencies
 * --------------------------------------------------------------------------*/

var should = require('should'),
    Reddit = require('../lib/reddit'),
    info = {};

// you have to include this in the project
var testing_creds = require('./testing_creds');

describe('Reddit', function() {
  describe('new (constructor)', function() {
    it('returns a Reddit instance', function() {
      info.reddit = new Reddit('dit tests by /u/adam_ay');
      should.exist(info.reddit);
      info.reddit.should.have.property('_host');
      info.reddit.should.have.property('_user_agent');
      info.reddit.should.have.property('_agent');
    });
  });

  describe('.prototype.login({ user, passwd })', function() {
    it('resolves successfully', function(done) {
      info.reddit.login(testing_creds)
        .nodeify(done);
    });

    it('correctly sets this instance\'s session properties', function() {
      info.reddit.should.have.property('_cookie');
      info.reddit.should.have.property('_modhash');
    });
  });

  describe('.prototype.saved(user)', function() {
    it('resolves successfully', function(done) {
      info.reddit.saved(testing_creds.user)
        .then(function(res) {
          info.saved_res = res;
        })
        .nodeify(done);
    });
  });
});
