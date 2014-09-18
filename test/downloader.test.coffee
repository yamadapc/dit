"use strict" # global describe, it
##
# Dependencies
##

assert = require("assert")
makeStub = require("mocha-make-stub")
Promise = require("bluebird")
fs = require("fs")
path = require("path")
request = require("superagent")
should = require("should")

Downloader = require "../lib/downloader"

describe "Downloader", ->
  describe "._slug(str)", ->
    it "slugs a string", ->
      Downloader._slug("Something Something here @ weird!!!")
        .should.equal "something-something-here-weird"

  describe ".prototype.download", ->
    beforeEach ->
      @downloader = new Downloader path.join(__dirname, "tmp")

    it "starts to download an item", ->
      @downloader
        .on(
          'download.error',
          (msg) -> assert(false, "Downloader threw: " + msg.err)
        )

      target_path = @downloader
        .download(
          url: "http://i.imgur.com/iCRmqJM.gif"
          title: "Brenda's transformation back to human form was always messy"
        )

      target_path.should.equal(
        path.join(
          __dirname,
          "tmp",
          "brenda-s-transformation-back-to-human-form-was-always-messy"
        )
      )

      @downloader.done()
        .then =>
          pth = target_path + '.gif'
          fs.existsSync(pth).should.be.ok
          stat = fs.statSync pth
          (stat.size > 0).should.be.ok
