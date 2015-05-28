/*
University of Illinois/NCSA Open Source License 

Copyright (c) 2018 Terrain Data, Inc. and the authors. All rights reserved.

Developed by: Terrain Data, Inc. and
              the individuals who committed the code in this file.
              https://github.com/terraindata/terrain
                  
Permission is hereby granted, free of charge, to any person 
obtaining a copy of this software and associated documentation files 
(the "Software"), to deal with the Software without restriction, 
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software, 
and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:

* Redistributions of source code must retain the above copyright notice, 
  this list of conditions and the following disclaimers.

* Redistributions in binary form must reproduce the above copyright 
  notice, this list of conditions and the following disclaimers in the 
  documentation and/or other materials provided with the distribution.

* Neither the names of Terrain Data, Inc., Terrain, nor the names of its 
  contributors may be used to endorse or promote products derived from
  this Software without specific prior written permission.

This license supersedes any copyright notice, license, or related statement
following this comment block.  All files in this repository are provided
under the same license, regardless of whether a corresponding comment block
appears in them.  This license also applies retroactively to any previous
state of the repository, including different branches and commits, which
were made public on or after December 8th, 2018.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
CONTRIBUTORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS WITH
THE SOFTWARE.
*/

module.exports = function(grunt) {
  'use strict';

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-exec');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      project: 'bootstrap-timepicker',
      version: '0.2.3'
    },
    exec: {
      dump: {
        command: 'grunt jshint; grunt uglify; grunt exec:deleteAssets; grunt less:production;'
      },
      copyAssets: {
        command: 'git checkout gh-pages -q; git checkout master css/bootstrap-timepicker.min.css; git checkout master js/bootstrap-timepicker.min.js;'
      },
      deleteAssets: {
        command: 'rm -rf css/bootstrap-timepicker.css; rm -rf css/bootstrap-timepicker.min.css; rm -rf js/bootstrap-timepicker.min.js;'
      }
    },
    jasmine: {
      build: {
        src : ['spec/js/libs/jquery/jquery.min.js', 'spec/js/libs/bootstrap/js/bootstrap.min.js', 'spec/js/libs/autotype/index.js', 'js/bootstrap-timepicker.js'],
        options: {
          specs : 'spec/js/*Spec.js',
          helpers : 'spec/js/helpers/*.js',
          timeout : 100
        }
      }
    },
    jshint: {
      options: {
        browser: true,
        camelcase: true,
        curly: true,
        eqeqeq: true,
        eqnull: true,
        immed: true,
        indent: 2,
        latedef: true,
        newcap: true,
        noarg: true,
        quotmark: true,
        sub: true,
        strict: true,
        trailing: true,
        undef: true,
        unused: true,
        white: false,
        globals: {
          jQuery: true,
          $: true,
          expect: true,
          it: true,
          beforeEach: true,
          afterEach: true,
          describe: true,
          loadFixtures: true,
          console: true,
          module: true
        }
      },
      files: ['js/bootstrap-timepicker.js', 'Gruntfile.js', 'package.json', 'spec/js/*Spec.js']
    },
    less: {
      development: {
        options: {
          paths: ['css']
        },
        files: {
          'css/bootstrap-timepicker.css': 'less/*.less'
        }
      },
      production: {
        options: {
          paths: ['css'],
          yuicompress: true
        },
        files: {
          'css/bootstrap-timepicker.min.css': ['less/*.less']
        }
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= meta.project %> v<%= meta.version %> \n' +
          '* http://jdewit.github.com/bootstrap-timepicker \n' +
          '* Copyright (c) <%= grunt.template.today("yyyy") %> Joris de Wit \n' +
          '* MIT License \n' +
          '*/'
      },
      build: {
        src: ['<banner:meta.banner>','js/<%= pkg.name %>.js'],
        dest: 'js/<%= pkg.name %>.min.js'
      }
    }
  });

  grunt.registerTask('default', ['jasmine','jshint','uglify','less:production']);
  grunt.registerTask('test', ['jasmine','lint']);
  grunt.registerTask('copy', ['exec:copyAssets']);
};
