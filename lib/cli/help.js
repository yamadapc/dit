// (borrowed from: http://michaelbrooks.ca/deck/jsconf2013/#/59)
'use strict';
/**
 * Dependencies
 * --------------------------------------------------------------------------*/

var Promise = require('bluebird'),
    fs      = Promise.promisifyAll(require('fs')),
    path    = require('path');

exports.help = function help$help(argv) {
  var basepath = path.join(__dirname, '..', '..', 'doc', 'cli'),
      filename = exports._getFilename(argv);

  var filepath = path.join(basepath, filename);

  var contentsP = fs.readFileAsync(filepath, 'utf-8');

  return contentsP.then(function(contents) {
    console.log('\n' + contents + '\n');
  });
};

exports._getFilename = function help$getFilename(argv) {
  if(argv && argv._) {
    // filename format: command.command.txt
    var filename = argv && argv._ && argv._.slice(0);
    filename.push('txt');
    filename = filename.join('.');
    return filename;
  } else return 'help.txt';
};
