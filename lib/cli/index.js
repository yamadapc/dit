'use strict';
var Promise = require('bluebird');
var clc = require('cli-color');
var read = require('read');
var Downloader = require('../downloader');
var Reddit = require('../reddit');
var sessions = require('../sessions');

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
 * @param {Object} program The parsed command-line arguments
 * @return {Promise} resultP A promise to the execution result
 */

cli.program = function(program) {
  // Load configuration from disk and instantiate the reddit object (logged-in)
  var redditP = cli._getReddit(program);

  if(program.saved) {
    return redditP.then(cli._handleSaved.bind(cli, program))
      .then(function() { return null; });
  }

  program.outputHelp();
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
 * @param {Object} program
 * @param {String} [program.config] The path to the configuration file
 * @param {Boolean} [program.login] The login flag
 * @return {Promise.<Reddit>}
 */

cli._getReddit = function(program) {
  var force_login = program.login;

  var configP = sessions.load(program.config);
  return configP
    .then(function(config) {
      return new Reddit('dit by @yamadapc', config);
    })
    .then(function(reddit) {
      // If the configuration doesn't contain a reddit cookie session,
      // prompt the user for credentials
      if(program.login || !reddit.isLoggedIn()) {
        return cli._login(program, reddit, force_login);
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
 * @param {Object} program
 * @param {Object} [config] The path to the configuration file
 * @param {Reddit} reddit A reddit instance
 * @param {Boolean} [force_login If true, will skip prompt
 * @return {Promise><Reddit>} A promise to the result
 */

cli._login = function(program, reddit, force_login) {
  return cli._getCreds(program)
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
        return sessions.save(reddit.config, program.config)
          .then(function() {
            console.log('Persisted session to disk.');
            return reddit;
          });
      }

      return reddit;
    });
};

/**
 * Handles the save action, fetching the user's saved links and downloading them
 * if specified.
 *
 * @param {Object} program
 * @param {Reddit} reddit A reddit instance
 */

cli._handleSaved = function(program, reddit) {
  if(program.download) {
    var downloader = new Downloader(program.download);

    // I'm explicitly ignoring `download.new` events, though in the future we
    // could use them for something
    downloader.on('download.error', function(msg) {
      cli._logError('download.error', msg.post.title + ' -> ' + msg.target_path);
    });

    downloader.on('download.done', function(msg) {
      cli._logSuccess('download.done', msg.post.title + ' -> ' + msg.target_path);
    });

    reddit.on('post.new', function(post) {
      downloader.download(post);
    });

    return Promise.join(reddit.saved(), downloader.done());
  }

  return reddit.saved();
};

cli._log = function(evt, msg) {
  process.stdout.write('[ ' + evt + ' ] ' + msg + '\n');
};

cli._logError = function(evt, msg) {
  process.stdout.write(
    clc.red.bold('[ ' + evt + ' ]') +
    ' ' + msg + '\n'
  );
};

cli._logSuccess = function(evt, msg) {
  process.stdout.write(
    clc.green.bold('[ ' + evt + ' ]') +
    ' ' + msg + '\n'
  );
};

/**
 * Extracts reddit credentials from `program` or prompts for it.
 *
 * @api private
 *
 * @param {Object} program
 * @param {String} [program.user]
 * @param {String} [program.passwd]
 * @return {Promise.<Object>} A promise to the credentials
 */

cli._getCreds = function(program) {
  console.log('Please enter your reddit credentials:');
  var userP = cli._getUser(program);
  var passwdP = userP.then(cli._getPasswd.bind(cli, program));

  // Not the fastest approach, but I thing this is clearest
  return Promise.props({
    user: userP,
    passwd: passwdP,
  });
};

/**
 * Extracts `user` from the `program` object or prompts for it.
 *
 * @api private
 *
 * @param {Object} program
 * @param {String} [program.user]
 * @return {external:Promise}
 */

cli._getUser= function(program) {
  if(!program.user) {
    var userP = cli.prompt({ prompt: 'User: ' });
    return userP.then(function(user) {
      if(!user) throw new Error('Invalid user');
      else return user;
    });
  } else return Promise.resolve(program.user);
};

/**
 * Extracts `passwd` from the `program` object or prompts for it.
 *
 * @api private
 *
 * @param {Object} program
 * @param {String} [program.passwd]
 * @return {external:Promise}
 */

cli._getPasswd = function(program) {
  if(!program.passwd) {
    var passwdP = cli.prompt({
      prompt: 'Password: ',
      silent: true,
      replace: '*'
    });

    return passwdP.then(function(passwd) {
      if(!passwd) throw new Error('Invalid password');
      else return passwd;
    });
  } else return Promise.resolve(program.passwd);
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
