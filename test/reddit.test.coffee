"use strict" # global describe, it
##
# Dependencies
##

makeStub = require("mocha-make-stub")
Promise = require("bluebird")
request = require("superagent")
should = require("should")

Reddit = require("../lib/reddit")
info = {}

# you have to include this in the project
testing_creds = require("./testing_creds")

describe "Reddit", ->
  describe "new (constructor)", ->
    it "returns a Reddit instance", ->
      info.reddit = new Reddit("dit tests by /u/adam_ay")
      should.exist info.reddit
      info.reddit.should.have.property "_host"
      info.reddit.should.have.property "_user_agent"
      info.reddit.should.have.property "_agent"

  describe ".prototype.login({ user, passwd })", ->
    makeStub "endAsync", request.Request::, "endAsync", ->
      Promise.resolve require "./responses/login.json"

    it "resolves successfully returning the session's properties", ->
      info.reddit.login(testing_creds)
        .then((session) ->
          should.exist session
          should.exist session.cookie
          should.exist session.cookie_expiry
          should.exist session.modhash
        )

    it "correctly sets this instance's session properties", ->
      info.reddit.should.have.property "_cookie"
      info.reddit.should.have.property "_modhash"

  describe ".prototype.saved(user)", ->
    makeStub "endAsync", request.Request::, "endAsync", ->
      Promise.resolve require "./responses/saved.json"

    it "resolves successfully", ->
      info.reddit.saved(testing_creds.user).then (saved) ->
        saved.should.be.instanceof(Array)
        saved.forEach (item) ->
          item.should.have.properties ["url", "title"]
        info.saved_res = saved
