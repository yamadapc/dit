'use strict';
/**
 * Dependencies
 * --------------------------------------------------------------------------*/

var Promise = require('bluebird'),
    read    = require('read');

var cli = module.exports = {};

/**
 * cli.argv(argv)
 * Interprets parsed arguments and triggers necessary actions.
 */

cli.argv = function(/*argv*/) {}; // TODO


/**
 * cli.getUser :: Object argv -> Promise e user
 * Extracts `user` from the `argv` object or prompts for it.
 */

cli.getUser= function(argv) {
  if(!argv.user) {
    var userP = cli.prompt({ prompt: 'User: ' });
    return userP.then(function(user) {
      if(!user) throw new Error('Invalid user');
      else return user;
    });
  } else return Promise.resolve(argv.user);
};

/**
 * cli.getPasswd :: Object argv -> Promise e passwd
 */

cli.getPasswd = function(argv) {
  if(!argv.passwd) {
    var passwdP = cli.prompt({
      prompt: 'Password: ',
      silent: true,
      replace: '*'
    });

    return passwdP.then(function(passwd) {
      if(!passwd) throw new Error('Invalid password');
      else return passwd;
    });
  } else return Promise.resolve(argv.passwd);
};

/**
 * cli.exit :: Maybe Error
 */

cli.exit = function(err) {
  if(err) {
    console.error(err.message);
    process.exit(1 || err.code);
  } else process.exit(0);
};

/**
 * cli.prompt :: Object options -> String
 */

var readP = Promise.promisify(read);
cli.prompt = function(options) {
  return readP(options).spread(function(a) { return a; });
};
