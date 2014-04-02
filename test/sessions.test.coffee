"use strict" # global describe, it, before, after
##
# Dependencies
##

Promise  = require "bluebird"
_        = require "lodash"
jf       = require "jsonfile"
sessions = require "../lib/sessions"
sinon    = require "sinon"
should   = require "should"

info = {}

describe "sessions", ->
  describe ".save(config)", ->
    before ->
      info.read_file_stub = sinon.stub jf, "readFileAsync", (path) ->
        if path == "non-existent"
          Promise.reject(_.extend(new Error(), { errno: 34 }))
        else if path == "existent"
          Promise.resolve({ something: "asdf" })

      info.write_file_stub = sinon.stub jf, "writeFileAsync", (path, obj) ->
        return Promise.fulfilled()

    it "tries to save new configuration files", (done) ->
      obj = { testing: true }
      sessions.save(obj, "non-existent")
        .then(->
          info.write_file_stub.calledWithMatch("non-existent", obj).should.be.ok
        )
        .nodeify(done)

    it "extends the configuration file when it exists", (done) ->
      obj = { testing: true }
      expected = { testing: true, something: "asdf" }
      sessions.save(obj, "existent")
        .then(->
          info.write_file_stub.calledWithMatch("existent", expected).should.be.ok
        )
        .nodeify(done)

    after ->
      info.read_file_stub.restore()
      info.write_file_stub.restore()
