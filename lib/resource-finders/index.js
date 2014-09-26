'use strict';
var fs = require('fs');
var path = require('path');
exports = module.exports = fs.readDirSync(__dirname)
  .filter(function(fname) {
    return fname !== 'index.js';
  })
  .reduce(function(memo, fname) {
    memo[path.basename(fname)] = require('./' + fname);
    return memo;
  }, {});
