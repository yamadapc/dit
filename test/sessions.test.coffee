"use strict" # global describe, it, before, after
##
# Dependencies
##

fs       = require "fs"
Promise  = require "bluebird"
_        = require "lodash"
sessions = require "../lib/sessions"
sinon    = require "sinon"
should   = require "should"

info = {}

describe "sessions", ->
  describe ".save(config)", ->
    before ->
      info.read_file_stub = sinon.stub fs, "readFileAsync", (path) ->
        if path == "non-existent"
          Promise.reject(_.extend(new Error(), { cause: { errno: 34 } }))
        else if path == "existent"
          Promise.resolve(JSON.stringify({ something: "asdf" }))

      info.write_file_stub = sinon.stub fs, "writeFileAsync", (path, obj) ->
        return Promise.fulfilled()

    it "tries to save new configuration files", (done) ->
      obj = { testing: true }
      sessions.save(obj, "non-existent")
        .then(->
          call = info.write_file_stub.getCall(0)
          JSON.parse(call.args[1]).should.eql obj
        )
        .nodeify(done)

    it "extends the configuration file when it exists", (done) ->
      obj = { testing: true }
      expected = { testing: true, something: "asdf" }
      sessions.save(obj, "existent")
        .then(->
          call = info.write_file_stub.getCall(1)
          JSON.parse(call.args[1]).should.eql expected
        )
        .nodeify(done)

    after ->
      info.read_file_stub.restore()
      info.write_file_stub.restore()
