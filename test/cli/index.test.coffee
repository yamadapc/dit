"use strict" # global describe, it
##
# Dependencies
##

Promise = require("bluebird")
makeStub = require("mocha-make-stub")
should = require("should")

cli = require("../../lib/cli")
Downloader = require('../../lib/downloader')
Reddit = require("../../lib/reddit")
sessions = require("../../lib/sessions")

info = {}

promptSuite = (type) ->
  name = type.toLowerCase()
  expected = "type" + Math.random()
  makeStub cli, "prompt", ->
    Promise.resolve(expected)

  it "prompts for the "+name+" if it wasn\'t in the argv object", () ->
    typeP = cli["_get" + type]({})

    should.exist(typeP)
    typeP.should.have.property("then")

    typeP
      .then((s) ->
        s.should.equal(expected)
      )

  it "returns argv."+type+" if it exists", () ->
    input = {}
    input[name] = "type" + Math.random()
    cli["_get" + type](input).then (result) ->
      result.should.equal(input[name])

describe "cli", ->
  makeStub sessions, "load", ->
    Promise.resolve({})

  describe "._getUser(program)", promptSuite.bind(null, "User")

  describe "._getPasswd(program)", promptSuite.bind(null, "Passwd")

  describe "._exit(err)", ->
    describe "if an error is passed in", ->
      makeStub process, 'exit', ->
      makeStub cli, '_logError', ->

      it "logs it and exits with a non-zero exit code", ->
        cli.exit new Error 'Hello'
        @_logError.calledOnce.should.be.ok
        @exit.calledOnce.should.be.ok
        @exit.getCall(0).args[0] .should.not.equal 0

    describe "if an error isn't passed in", ->
      makeStub process, 'exit', ->

      it "exits with 0", ->
        cli.exit()
        @exit.calledOnce.should.be.ok
        @exit.getCall(0).args[0].should.equal 0

  describe "._handleSaved(program, reddit)", ->
    describe "if `program.download` is falsy", ->
      makeStub Reddit::, "saved", ->
        @emit 'post.new', 'post1'
        @emit 'post.new', 'post2'
        @emit 'post.new', 'post3'
        Promise.resolve ['post1', 'post2', 'post3']

      makeStub cli, "_logInfo", ->

      it "logs the output of reddit `post.new` events", ->
        cli._handleSaved({
          download: false
        }, new Reddit)
          .then =>
            @saved.calledOnce.should.be.ok
            @_logInfo.calledThrice.should.be.ok

    describe "if `program.download` is truthy", ->
      makeStub Reddit::, "saved", ->
        posts = [
          { title: 'post1', url: 'https://gogole.com' },
          { title: 'post2', url: 'https://gogole.com' },
          { title: 'post3', url: 'https://gogole.com' },
        ]
        @emit 'post.new', posts[0]
        @emit 'post.new', posts[1]
        @emit 'post.new', posts[2]
        return Promise.resolve posts

      makeStub Downloader::, "download", ->

      it "calls `downloader.download` for each new post", ->
        cli._handleSaved({
          download: true
        }, new Reddit)
          .then =>
            @saved.calledOnce.should.be.ok
            @download.calledThrice.should.be.ok

  describe ".program(program)", ->
    # So we don't get output noise in the tests
    makeStub cli, "_logSuccess", ->

    describe "if `program.login` is truthy`", ->
      makeStub sessions, "save", -> Promise.fulfilled()
      makeStub Reddit::, "login", -> Promise.fulfilled()

      it "logs-in the user", ->
        cli.program(
          user: 'user'
          passwd: 'passwd'
          login: true
        ).then =>
          @save.calledOnce.should.be.ok
          @login.calledOnce.should.be.ok
          @login.getCall(0).args[0].should.eql
            user: 'user'
            passwd: 'passwd'

    describe "if `program.saved` is truthy", ->
      makeStub sessions, "save", (session) -> Promise.fulfilled()
      makeStub cli, "prompt", -> Promise.resolve 'n'
      makeStub Reddit::, "login", -> Promise.fulfilled()
      makeStub Reddit::, "saved", -> Promise.fulfilled()

      it "logs-in the user and fetches saved links", ->
        cli.program( # cli's reddit instance thinks it's logged-in
          user: 'user'
          passwd: 'passwd'
          saved: true
        ).then =>
          @save.calledOnce.should.not.be.ok
          @saved.calledOnce.should.be.ok

    describe "if there's nothing to do", ->
      it "outputs help", ->
        called = false
        cli.program(
          outputHelp: -> called = true
        )

        called.should.be.ok
