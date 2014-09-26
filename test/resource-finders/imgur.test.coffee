"use strict" # global describe, it
##
# Dependencies
##

makeStub = require("mocha-make-stub")
Promise = require("bluebird")
request = require("superagent")
should = require("should")

imgur = require("../../lib/resource-finders/imgur")

noop = ->

describe "resource-finders/imgur", ->
  describe ".find", ->
    it "returns a raw image link if an image is passed in", ->
      imgur.find(noop, "https://imgur.com/asdf")
        .then (targets) ->
          targets.should.eql(["http://i.imgur.com/asdf.jpg"])

  describe ".test", ->
    it "returns true for imgur images' links", ->
      imgur.test("https://i.imgur.com/asdf.jpg").should.be.ok
      imgur.test("https://imgur.com/asdf").should.be.ok
      imgur.test("https://imgur.com/a/asdf").should.be.ok

    it "returns false for non-imgur links", ->
      imgur.test("https://imgur.com/").should.be.not.ok
      imgur.test("asdfasdf").should.be.not.ok
      imgur.test("https://google.com/?q=imgur.com").should.be.not.ok
