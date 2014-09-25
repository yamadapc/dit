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
testing_creds =
  user: "someuser - this is irrelevant"
  passwd: "super*secret*chicken"

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
        .then((config) ->
          should.exist config
          should.exist config.cookie
          should.exist config.modhash
        )

    it "correctly sets this instance's session properties", ->
      info.reddit.should.have.property "config"
      info.reddit.config.should.have.property "cookie"
      info.reddit.config.should.have.property "modhash"

  describe ".prototype.saved(user)", ->
    makeStub "endAsync", request.Request::, "endAsync", ->
      Promise.resolve require "./responses/saved.json"

    it "resolves successfully", ->
      info.reddit.saved(testing_creds.user).then (saved) ->
        saved.should.be.instanceof(Array)
        saved.forEach (item) ->
          item.should.have.properties ["url", "title"]
        info.saved_res = saved

  describe ".prototype._getCookieExpiry(set_cookie)", ->
    it "parses out a cookie's expiration and returns it as a date", ->
      set_cookie = [
        "__cfduid=d096ae850cede5cfa21a4035bba5242301410953921488; expires=Mon, 23-Dec-2019 23:50:00 GMT; path=/; domain=.reddit.com; HttpOnly",
        "secure_session=; Domain=reddit.com; Max-Age=-1410953921; Path=/; expires=Thu, 01-Jan-1970 00:00:01 GMT; HttpOnly",
        "reddit_session=30799313%2C2014-09-17T04%3A38%3A41%2Ca5be464e7e73fdfbd34e0b33a3af26cdc3dda188; Domain=reddit.com; Max-Age=734962877; Path=/; expires=Thu, 31-Dec-2037 23:59:59 GMT; HttpOnly"
      ]
