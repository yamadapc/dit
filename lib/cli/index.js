'use strict';
/**
 * Dependencies
 * --------------------------------------------------------------------------*/

var Promise = require('bluebird'),
    read    = require('read');

/**
 * @external Promise
 * @see {@link https://github.com/petkaantonov/bluebird/blob/master/API.md#core Promise}
 */

var cli = module.exports = {};

/**
 * Interprets parsed arguments and triggers necessary actions.
 * @param argv
 */

cli.argv = function(/*argv*/) {}; // TODO


/**
 * Extracts `user` from the `argv` object or prompts for it.
 * @param {Object} argv
 * @param {String} [argv.user]
 * @return {external:Promise}
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
 * Extracts `passwd` from the `argv` object or prompts for it.
 * @param {Object} argv
 * @param {String} [argv.passwd]
 * @return {external:Promise}
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
 * Exits from this process.
 * @param {Error} [err] An error, if any.
 */

cli.exit = function(err) {
  if(err) {
    console.error(err.message);
    process.exit(err.code || 1);
  } else process.exit(0);
};

/**
 * Prompts the user for some input.
 * @param {Object} options - Options object passed to the `read` module
 * @return {external:Promise} inputP - A promise to the user's input
 */

var readP = Promise.promisify(read);
cli.prompt = function(options) {
  return readP(options).spread(function(a) { return a; });
};
