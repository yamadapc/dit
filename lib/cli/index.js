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

var cli = module.exports = {};

/**
 * Interprets parsed arguments and triggers necessary actions.
 *
 * @api public
 *
 * @param {Object} argv The parsed command-line arguments
 * @return {Promise} resultP A promise to the execution result
 */

cli.argv = function(argv) {
  var action = cli._getAction(argv);

  // Display help and exit if the `help` action or no action is specified
  if(action === 'help' || !action) {
    return help.help(action ? argv : undefined);
  }

  // Load configuration from disk and instantiate the reddit object (logged-in)
  var redditP = cli._getReddit(argv, action === 'login');
  return redditP.then(function(reddit) {
    switch(action) {
      case 'login':
        return;
      case 'saved':
        return reddit.saved(argv.target)
          .then(function(saved_links) {
            console.log('Found ' + saved_links.length + ' links:');
            console.log('Title - URL');
            saved_links.forEach(function(link) {
              console.log(link.title + ' - ' + link.url);
            });
          });
      default:
        throw new Error('Unrecognized action: ' + action);
    }
  });
};

/**
 * Exits from this process.
 *
 * @api public
 *
 * @param {Error} [err] An error, if any.
 */

cli.exit = function(err) {
  if(err) {
    console.error(err.message);

    if(process.env.NODE_ENV === 'debug') {
      console.error(err.stack);
    }

    return process.exit(err.code || 1);
  }

  process.exit(0);
};

/**
 * Gets the reddit instance based on the passed-in arguments
 *
 * @api private
 *
 * @param {Object} argv
 * @param {String} [argv.config] The path to the configuration file
 * @param {Boolean} [force_login If true, will force reauthentication
 * @return {Promise.<Reddit>}
 */

cli._getReddit = function(argv, force_login) {
  var configP = sessions.load(argv.config);
  return configP
    .then(function(config) {
      return new Reddit('dit by @yamadapc', config);
    })
    .then(function(reddit) {
      // If the configuration doesn't contain a reddit cookie session,
      // prompt the user for credentials
      if(force_login || !reddit.isLoggedIn()) {
        return cli._login(argv, reddit, force_login);
      }

      console.log('Recovered session from disk, skipping log-in');
      return reddit;
    });
};

/**
 * Logs into reddit and asks the user to persist the session to disk.
 *
 * @api private
 *
 * @param {Object} argv
 * @param {Object} [config] The path to the configuration file
 * @param {Reddit} reddit A reddit instance
 * @param {Boolean} [force_login If true, will skip prompt
 * @return {Promise><Reddit>} A promise to the result
 */

cli._login = function(argv, reddit, force_login) {
  return cli._getCreds(argv)
    .then(reddit.login.bind(reddit))
    .then(function() {
      console.log('Logged-in.');
      if(force_login) {
        return;
      }

      return cli.prompt({
        prompt: 'Would you like to save the reddit session to disk?',
      });
    })
    .then(function(should_persist) {
      if(!should_persist || should_persist.toLowerCase().charAt(0) === 'y') {
        return sessions.save(reddit.config, argv.config)
          .then(function() {
            console.log('Persisted session to disk.');
            return reddit;
          });
      }

      return reddit;
    });
};

/**
 * Extracts reddit credentials from `argv` or prompts for it.
 *
 * @api private
 *
 * @param {Object} argv
 * @param {String} [argv.user]
 * @param {String} [argv.passwd]
 * @return {Promise.<Object>} A promise to the credentials
 */

cli._getCreds = function(argv) {
  console.log('Please enter your reddit credentials:');
  var userP = cli._getUser(argv);
  var passwdP = userP.then(cli._getPasswd.bind(cli, argv));

  // Not the fastest approach, but I thing this is clearest
  return Promise.props({
    user: userP,
    passwd: passwdP,
  });
};

/**
 * Extracts `user` from the `argv` object or prompts for it.
 *
 * @api private
 *
 * @param {Object} argv
 * @param {String} [argv.user]
 * @return {external:Promise}
 */

cli._getUser= function(argv) {
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
 *
 * @api private
 *
 * @param {Object} argv
 * @param {String} [argv.passwd]
 * @return {external:Promise}
 */

cli._getPasswd = function(argv) {
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
