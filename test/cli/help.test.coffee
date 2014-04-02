"use strict" # global describe, it
##
# Dependencies
##

help   = require("../../lib/cli/help")
should = require("should")
sinon  = require("sinon")

info = {}

describe "help", ->
  describe ".help(argv)", ->
    it "outputs main help, with no arguments", (done) ->
      info.fake_log = sinon.stub(console, "log")
      p = help.help()
      should.exist(p)
      p.should.have.property("then")
      p
        .then(->
          info.fake_log.calledOnce.should.be.ok
          console.log.restore()
        )
        .catch((err) ->
          console.log.restore()
          throw err
        )
        .nodeify(done)

  describe "._getFilename", ->
    it "returns the doc's filename based on an argv argument", ->
      help._getFilename().should.equal("help.txt")

      argv =  { _: ["command"] }
      help._getFilename(argv).should.equal("command.txt")

      argv._.push("other_command")
      help._getFilename(argv).should.equal("command.other_command.txt")
