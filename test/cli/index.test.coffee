"use strict" # global describe, it
##
# Dependencies
##

cli      = require("../../lib/cli")
Promise  = require("bluebird")
should   = require("should")
sessions = require("../../lib/sessions")
sinon    = require("sinon")

info = {}
testing_creds = require("../testing_creds")

promptSuite = (type) ->
  name = type.toLowerCase()
  it "prompts for the "+name+" if it wasn\'t in the argv object", (done) ->
    expected = "type" + Math.random()
    fake_prompt = sinon.stub cli, "prompt", ->
      Promise.resolve(expected)

    typeP = cli["get" + type]({})

    should.exist(typeP)
    typeP.should.have.property("then")

    typeP
      .then((s) ->
        fake_prompt.calledOnce.should.be.ok
        s.should.equal(expected)
        cli.prompt.restore()
      )
      .catch((err) ->
        cli.prompt.restore()
        throw err
      )
      .nodeify(done)

  it "returns argv."+type+" if it exists", (done) ->
    input = {}
    input[name] = "type" + Math.random()
    cli["get" + type](input).then((result) ->
      result.should.equal(input[name])
    ).nodeify(done)

describe "cli", ->
  describe ".getUser(argv)", promptSuite.bind(null, "User")

  describe ".getPasswd(argv)", promptSuite.bind(null, "Passwd")

  describe ".getAction(argv)", ->
    it "returns the last element in the argv._ Array", ->
      cli.getAction({ _: ["something", "here"] }).should.equal("here")

  describe ".argv(argv)", ->
    describe "action = 'login'", ->
      before ->
        info.save_stub = sinon.stub sessions, "save", (session) ->
          info.ditconfig = session
          Promise.fulfilled()

      it "logs-in this user", (done) ->
        cli.argv({
          _: ["login"],
          user: testing_creds.user,
          passwd: testing_creds.passwd
        }).nodeify(done)

      it "saves this user's session", (done) ->
        cli.argv({
          _: ["login"],
          user: testing_creds.user,
          passwd: testing_creds.passwd
        }).then(->
            info.save_stub.called.should.be.ok
          ).nodeify(done)

      after ->
        info.save_stub.restore()
