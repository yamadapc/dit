"use strict" # global describe, it, before, after
##
# Dependencies
##

fs       = require "fs"
Promise  = require "bluebird"
_        = require "lodash"
makeStub = require "mocha-make-stub"
sessions = require "../lib/sessions"
should   = require "should"

describe "sessions", ->
  makeStub "fs.readFileAsync", fs, "readFileAsync", (path) ->
    if path == "non-existent"
      Promise.reject(_.extend(new Error(), cause: errno: 34))
    else if path == "existent"
      Promise.resolve(JSON.stringify({ something: "asdf" }))

  describe ".save(config[, config_path])", ->
    makeStub "fs.writeFileAsync", fs, "writeFileAsync", (path, obj) ->
      return Promise.fulfilled()

    it "tries to save new configuration files", ->
      obj = testing: true
      sessions.save(obj, "non-existent")
        .then =>
          call = @['fs.writeFileAsync'].getCall(0)
          JSON.parse(call.args[1]).should.eql obj

    it "extends the configuration file when it exists", ->
      obj = testing: true
      expected = testing: true, something: "asdf"
      sessions.save(obj, "existent")
        .then =>
          call = @['fs.writeFileAsync'].getCall(1)
          JSON.parse(call.args[1]).should.eql expected
