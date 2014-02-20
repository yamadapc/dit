'use strict'; /* global describe, it */
/**
 * Dependencies
 * --------------------------------------------------------------------------*/

var help   = require('../../lib/cli/help'),
    should = require('should'),
    sinon  = require('sinon');

var info = {};

describe('help', function() {
  describe('.help(argv)', function() {
    it('outputs main help, with no arguments', function(done) {
      info.fake_log = sinon.stub(console, 'log');
      var p = help.help();
      should.exist(p);
      p.should.have.property('then');
      p
        .then(function() {
          info.fake_log.calledOnce.should.be.ok;
          console.log.restore();
        })
        .catch(function(err) {
          console.log.restore();
          throw err;
        })
        .nodeify(done);
    });
  });

  describe('._getFilename', function() {
    it('returns the doc\'s filename based on an argv argument', function() {
      help._getFilename().should.equal('help.txt');

      var argv =  { _: ['command'] };
      help._getFilename(argv).should.equal('command.txt');

      argv._.push('other_command');
      help._getFilename(argv).should.equal('command.other_command.txt');
    });
  });
});
