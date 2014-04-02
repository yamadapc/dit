'use strict';

module.exports = function (grunt) {
  // Show elapsed time at the end
  require('time-grunt')(grunt);

  // Project configuration.
  grunt.initConfig({
    jshint: {
      options:   { jshintrc: '.jshintrc', },
      gruntfile: { src: 'Gruntfile.js'    },
      lib:       { src: ['lib/**/*.js']   },
      bin:       { src: ['bin/**/*.js']   },
      test:      { src: ['test/**/*.coffee']  }
    },

    simplemocha: {
      options: {
        ignoreLeaks: false,
        ui: 'bdd',
        reporter: 'spec',
        timeout: 5000,
        compilers: 'coffee:coffee-script'
      },
      all: 'test/**/*.coffee'
    },

    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib: {
        files: '<%= jshint.lib.src %>',
        tasks: ['jshint:lib', 'test']
      },
      test: {
        files: '<%= jshint.test.src %>',
        tasks: ['jshint:test', 'test']
      }
    }
  });

  // Aliases
  grunt.registerTask('lint', 'jshint');
  grunt.registerTask('test', 'simplemocha');
  grunt.registerTask('default', ['lint', 'test']);

  // Tasks
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-simple-mocha');
};
