"use strict" # global describe, it
##
# Dependencies
##

fs = require("fs")
path = require("path")
makeStub = require("mocha-make-stub")
Promise = require("bluebird")
request = require("superagent")
should = require("should")

Downloader = require("../../lib/downloader")
imgur = require("../../lib/resource-finders/imgur")

noop = ->

describe "resource-finders/imgur", ->
  describe ".find", ->
    before ->
      @mockDownload = ->
        Promise.resolve path.join(__dirname, '../responses/imgur-album.html')

    # Stub removal so we don't have to keep readding the response page:
    makeStub fs, "unlinkAsync", -> Promise.fulfilled()

    it "returns all of an albums images if an album is passed in", ->
      imgur.find(@mockDownload, "https://imgur.com/a/2RY5K")
        .then (targets) ->
          targets.should.eql [
            'http://i.imgur.com/xbz5Gei.jpg',
            'http://i.imgur.com/UePDndj.jpg',
            'http://i.imgur.com/rsmmsho.jpg',
            'http://i.imgur.com/CxKF9LN.jpg',
            'http://i.imgur.com/rNZaJHB.jpg',
            'http://i.imgur.com/EJKG5dD.jpg',
            'http://i.imgur.com/J3vqXIz.jpg',
            'http://i.imgur.com/J83DBai.jpg'
          ]

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
