'use strict';
var fs = require('fs');
var path = require('path');
exports = module.exports = fs.readdirSync(__dirname)
  .filter(function(fname) {
    return fname !== 'index.js';
  })
  .map(function(fname) {
    return require(path.join(__dirname, fname));
  });
