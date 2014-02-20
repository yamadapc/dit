'use strict'; /* global describe, it */
/**
 * Dependencies
 * --------------------------------------------------------------------------*/

var cli     = require('../../lib/cli'),
    Promise = require('bluebird'),
    should  = require('should'),
    sinon   = require('sinon');

describe('cli', function() {
  describe('.getUser(argv)', promptSuite.bind(null, 'User'));

  describe('.getPasswd(argv)', promptSuite.bind(null, 'Passwd'));
});

function promptSuite(type) {
  var name = type.toLowerCase();
  it('prompts for the '+name+' if it wasn\'t in the argv object', function(done) {
    var expected;
    var fake_prompt = sinon.stub(cli, 'prompt', function() {
      expected = 'type' + Math.random();
      return Promise.resolve(expected);
    });

    var typeP = cli['get' + type]({});

    should.exist(typeP);
    typeP.should.have.property('then');

    typeP
      .then(function(s) {
        fake_prompt.calledOnce.should.be.ok;
        s.should.equal(expected);
        cli.prompt.restore();
      })
      .catch(function(err) { cli.prompt.restore(); throw err; })
      .nodeify(done);
  });

  it('returns argv.'+type+' if it exists', function(done) {
    var input = {};
    input[name] = 'type' + Math.random();
    cli['get' + type](input).then(function(result) {
      result.should.equal(input[name]);
    }).nodeify(done);
  });
}
