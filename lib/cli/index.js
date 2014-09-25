'use strict';
var Promise = require('bluebird'),
    Reddit = require('../reddit'),
    sessions = require('../sessions'),
    help = require('./help'),
    read = require('read');

var readAsync = Promise.promisify(read);

/**
 * @external Promise
 * @see {@link https://github.com/petkaantonov/bluebird/blob/master/API.md#core Promise}
 */

var cli = module.exports = {
  reddit: new Reddit('dit by /u/adam_ay')
};

/**
 * Interprets parsed arguments and triggers necessary actions.
 * @param argv
 */

cli.argv = function(argv) {
  var action = cli.getAction(argv),
      resultP = Promise.fulfilled();

  if(action === 'help' || !action) {
    resultP = help.help(action ? argv : undefined);
  } else {
    var userP = cli.getUser(argv);
    var passwdP = userP.then(function() {
      return cli.getPasswd(argv);
    });

    var loginP = Promise
      .props({
        user: userP,
        passwd: passwdP,
      })
      .then(cli.reddit.login.bind(cli.reddit))
      .then(function() {
        console.log('Logged-in successfully');
        return sessions.save({
          cookie: cli.reddit._cookie,
        });
      });

    if(action === 'login') {
      resultP = loginP;
    } else if(action === 'saved') {
      resultP = loginP
        .then(function() {
          var itemsP = cli.reddit.saved();
          return Promise.map(
            itemsP,
            function(item) {
              console.log(item.title, ':', item.url);
            }
          );
        });
    }
  }

  return resultP.done(
    cli.exit.bind(cli, null),
    cli.exit
  );
};


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
 * Extracts the main `action` from the `argv` object
 *
 * @api private
 *
 * @param {Object} argv
 * @param {Array} argv._
 * @return {String} action
 */

cli._getAction = function(argv) {
  return argv._[argv._.length - 1];
};

/**
 * Prompts the user for some input.
 *
 * @api private
 *
 * @param {Object} options - Options object passed to the `read` module
 * @return {external:Promise} inputP - A promise to the user's input
 */

cli.prompt = function(options) {
  return readAsync(options)
    .spread(function(a) {
      return a;
    });
};
