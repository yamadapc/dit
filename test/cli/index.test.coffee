"use strict" # global describe, it
##
# Dependencies
##

Promise  = require("bluebird")
makeStub = require("mocha-make-stub")
should   = require("should")

cli      = require("../../lib/cli")
Reddit   = require("../../lib/reddit")
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
  describe "._getUser(program)", promptSuite.bind(null, "User")

  describe "._getPasswd(program)", promptSuite.bind(null, "Passwd")

  describe ".program(program)", ->
    describe "if `program.login` is truthy`", ->
      makeStub sessions, "save", (session) ->
        info.ditconfig = session
        Promise.fulfilled()

      makeStub Reddit::, "login", ->
        Promise.fulfilled()

      # So we don't get output noise in the tests
      makeStub cli, "_logSuccess", ->

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


