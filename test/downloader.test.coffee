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
  beforeEach ->
    @downloader = new Downloader path.join(__dirname, "tmp")

  describe "._slug(str)", ->
    it "slugs a string", ->
      Downloader._slug("Something Something here @ weird!!!")
        .should.equal "something-something-here-weird"

  describe "._urlToDownloadTargets(url)", ->
    it "delegates URL to a matching `resource-finder`", ->
      Downloader.resourceFinders = [
        {
          test: (url) ->
            url != 'imgur.com'
          find: (url) ->
            throw new Error('Shouldn\'t have been called')
        },
        {
          test: (url) ->
            url == 'imgur.com'
          find: (url) ->
            Promise.resolve ['some found resource URL']
        }
      ]

      Downloader._urlToDownloadTargets('imgur.com')

  describe ".downloadImpl(target_path, url)", ->
    it "is there", -> Downloader.downloadImpl.should.be.instanceof(Function)

  describe ".prototype.download(target_dir)", ->
    it "starts to download an item", ->
      # noop function
      noop = ->

      @downloader
        .download(
          url: "http://i.imgur.com/iCRmqJM.gif"
          title: "Brenda's transformation back to human form was always messy"
        )

      @downloader.downloading.should.have.length(1)
      @downloader.downloading[0].should.be.instanceof(Promise)
      @downloader.downloading[0]
        .then(noop, noop)
      return

  describe ".prototype.done", ->
    it "waits for all promises in the `downloading` array to resolve", ->
      # a promise wrapper around `setTimeout`
      wait = (t) ->
        new Promise (resolve, reject) ->
          setTimeout resolve, t

      @downloader.downloading = [
        wait 10
        wait 20
      ]

      @downloader.done()
        .then (rs) =>
          rs.should.have.length(2)

  describe
