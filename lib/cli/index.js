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
  if(program.login) {
    // Load configuration from disk and instantiate the reddit object (logged-in)
    return cli._getReddit(program);
  }

  if(program.saved || program.download) {
    return cli._getReddit(program)
      .then(cli._handleSaved.bind(cli, program));
  }

  return program.outputHelp();
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
    cli._logError('fatal.error', err.message);

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

      cli._logSuccess(
        'session.new',
        'Recovered session from disk, skipping log-in'
      );
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
      cli._logSuccess('session.new', 'Logged-in.');
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
            cli._logSuccess('session.save', 'Persisted session to disk.');
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
    // If the flag was supplied without a value, set it to the default target
    // directory:
    if(program.download === true) {
      program.download = './saved';
    }

    var downloader = new Downloader(program.download);

    if(program.verbose) {
      downloader.on('download.new', function(msg) {
        cli._logInfo('download.new', msg.post.title + ' (' + msg.target + ')');
      });

      reddit.on('post.new', function(post) {
        cli._logInfo('post.new', post.title + ' (' + post.url + ')');
      });
    }

    // I'm explicitly ignoring `download.new` events, though in the future we
    // could use them for something
    downloader.on('download.error', function(msg) {
      cli._logError('download.error', msg.err.message);
    });

    downloader.on('download.done', function(msg) {
      cli._logSuccess('download.done', msg.post.title + ' -> ' + msg.target_path);
    });

    reddit.on('post.new', function(post) {
      if(post.url) {
        downloader.download(post);
      }
    });

    return reddit.saved().then(downloader.done.bind(downloader));
  }

  // If we're not downloading links, we'll just log them:
  reddit.on('post.new', function(post) {
    cli._logInfo('post.new', post.title + ' - ' + post.url);
  });

  return reddit.saved();
};

cli._log = function(color, evt, msg) {
  process.stdout.write(
    clc[color].bold('[ ' + evt + ' ] ') +
    msg + '\n'
  );
};

cli._logError = cli._log.bind(cli, 'red');
cli._logInfo = cli._log.bind(cli, 'blue');
cli._logSuccess = cli._log.bind(cli, 'green');

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
