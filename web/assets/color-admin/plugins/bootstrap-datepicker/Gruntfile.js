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

/* global module, require */
module.exports = function(grunt){
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        qunit: {
            all: ['tests/tests.html']
        },
        jshint: {
            options: {
                jshintrc: true
            },
            gruntfile: ['Gruntfile.js'],
            main: ['js/bootstrap-datepicker.js'],
            locales: ['js/locales/*js']
        },
        jscs: {
            /* grunt-contrib-jscs notes:
                0.1.2 works
                0.1.3 infinite loops on postinstall
                0.1.4 doesn't seem to hit all targets when run via "grunt jscs"
            */
            gruntfile: ['Gruntfile.js'],
            main: ['js/bootstrap-datepicker.js'],
            locales: ['js/locales/*js']
        },
        less: {
            standalone: {
                files: {
                    '_build/datepicker.standalone.css': 'build/build_standalone.less',
                    '_build/datepicker3.standalone.css': 'build/build_standalone3.less'
                }
            },
            css: {
                files: {
                    '_build/datepicker.css': 'build/build.less',
                    '_build/datepicker3.css': 'build/build3.less'
                }
            },
            repo: {
                files: {
                    'css/datepicker.css': 'build/build_standalone.less',
                    'css/datepicker3.css': 'build/build_standalone3.less'
                }
            }
        },
        uglify: {
            options: {
                compress: true,
                mangle: true
            },
            main: {
                options: {
                    sourceMap: function(dest){
                        return dest.replace('.min.js', '.js.map');
                    }
                },
                files: {
                    '_build/bootstrap-datepicker.min.js': 'js/bootstrap-datepicker.js',
                    '_build/bootstrap-datepicker.locales.min.js': 'js/locales/*.js'
                }
            },
            locales: {
                files: [{
                    expand: true,
                    cwd: 'js/locales/',
                    src: ['*.js', '!*.min.js'],
                    dest: '_build/locales/',
                    rename: function(dest, name){
                        return dest + name.replace(/\.js$/, '.min.js');
                    }
                }]
            }
        },
        cssmin: {
            all: {
                files: {
                    '_build/datepicker.standalone.min.css': '_build/datepicker.standalone.css',
                    '_build/datepicker.min.css': '_build/datepicker.css',
                    '_build/datepicker3.standalone.min.css': '_build/datepicker3.standalone.css',
                    '_build/datepicker3.min.css': '_build/datepicker3.css'
                }
            }
        },
        clean: ['_build']
    });

    grunt.registerTask('lint', 'Lint all js files with jshint and jscs', ['jshint', 'jscs']);
    grunt.registerTask('test', 'Lint files and run unit tests', ['lint', 'qunit']);
    grunt.registerTask('finish', 'Prepares repo for commit [test, less:repo, screenshots]', ['test', 'less:repo', 'screenshots']);
    grunt.registerTask('dist', 'Builds minified files', ['less:css', 'less:standalone', 'cssmin', 'uglify']);

    grunt.registerTask('screenshots', 'Rebuilds automated docs screenshots', function(){
        var phantomjs = require('phantomjs').path;

        grunt.file.recurse('docs/_static/screenshots/', function(abspath){
            grunt.file.delete(abspath);
        });

        grunt.file.recurse('docs/_screenshots/', function(abspath, root, subdir, filename){
            if (!/.html$/.test(filename))
                return;
            subdir = subdir || '';

            var outdir = "docs/_static/screenshots/" + subdir,
                outfile = outdir + filename.replace(/.html$/, '.png');

            if (!grunt.file.exists(outdir))
                grunt.file.mkdir(outdir);

            grunt.util.spawn({
                cmd: phantomjs,
                args: ['docs/_screenshots/script/screenshot.js', abspath, outfile]
            });
        });
    });
};
