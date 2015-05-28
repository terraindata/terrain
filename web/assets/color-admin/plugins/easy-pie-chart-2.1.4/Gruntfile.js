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

	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		cfg: {
			filename: 'easypiechart'
		},

		dirs: {
			tmp: 'tmp',
			src: 'src',
			dest: 'dist',
			docs: 'docs',
			test: 'test',
			demo: 'demo'
		},

		clean: {
			all: ['<%= dirs.dest %>/', '<%= dirs.tmp %>/'],
			tmp: ['<%= dirs.tmp %>/']
		},

		concat: {
			vanilla: {
				src: [
					'<%= dirs.src %>/renderer/canvas.js',
					'<%= dirs.src %>/<%= cfg.filename %>.js'
				],
				dest: '<%= dirs.tmp %>/<%= cfg.filename %>.js'
			},
			jquery: {
				src: [
					'<%= dirs.src %>/renderer/canvas.js',
					'<%= dirs.src %>/<%= cfg.filename %>.js',
					'<%= dirs.src %>/jquery.plugin.js'
				],
				dest: '<%= dirs.tmp %>/jquery.<%= cfg.filename %>.js'
			},
			angular: {
				src: [
					'<%= dirs.src %>/angular.directive.js',
					'<%= dirs.src %>/renderer/canvas.js',
					'<%= dirs.src %>/<%= cfg.filename %>.js'
				],
				dest: '<%= dirs.tmp %>/angular.<%= cfg.filename %>.js'
			}
		},

		usebanner: {
			options: {
				position: 'top',
				banner: '/**!\n' +
						' * <%= pkg.name %>\n' +
						' * <%= pkg.description %>\n' +
						' *\n' +
						' * @license <%= pkg.license %>\n'+
						' * @author <%= pkg.author.name %> <<%= pkg.author.email %>> (<%= pkg.author.url %>)\n' +
						' * @version <%= pkg.version %>\n' +
						' **/\n'
			},
			files: {
				src: [
					'<%= dirs.dest %>/<%= cfg.filename %>.js',
					'<%= dirs.dest %>/jquery.<%= cfg.filename %>.js',
					'<%= dirs.dest %>/angular.<%= cfg.filename %>.js'
				]
			}
		},

		uglify: {
			dist: {
				options: {
					report: 'gzip',
					preserveComments: 'some'
				},
				files: {
					'dist/<%= cfg.filename %>.min.js': ['dist/<%= cfg.filename %>.js'],
					'dist/jquery.<%= cfg.filename %>.min.js': ['dist/jquery.<%= cfg.filename %>.js'],
					'dist/angular.<%= cfg.filename %>.min.js': ['dist/angular.<%= cfg.filename %>.js']
				}
			}
		},

		watch: {
			gruntfile: {
				files: ['Gruntfile.js']
			},
			scripts: {
				files: '<%= dirs.src %>/**/*.js',
				tasks: ['default'],
				options: {
					debounceDelay: 250
				}
			},
			less: {
				files: '<%= dirs.demo %>/*.less',
				tasks: ['less'],
				options: {
					debounceDelay: 250
				}
			},
			readme: {
				files: '<%= dirs.docs %>/**/*.md',
				tasks: ['readme'],
				options: {
					debounceDelay: 250
				}
			}
		},

		jshint: {
			files: [
				'<%= dirs.src %>/**/*.js',
				'<%= dirs.test %>/**/*.js'
			],
			options: {}
		},

		karma: {
			unit: {
				configFile: 'karma.conf.coffee'
			},
			ci: {
				configFile: 'karma.conf.coffee',
				singleRun: true,
				browsers: ['PhantomJS']
			}
		},

		less: {
			demo: {
				files: {
					'<%= dirs.demo %>/style.css': ['<%= dirs.demo %>/style.less']
				}
			}
		},

		umd: {
			vanilla: {
				src: '<%= dirs.tmp %>/<%= cfg.filename %>.js',
				dest: '<%= dirs.dest %>/<%= cfg.filename %>.js',
				objectToExport: '<%= cfg.amdname %>',
				globalAlias: '<%= cfg.amdname %>'
			},
			jquery: {
				src: '<%= dirs.tmp %>/jquery.<%= cfg.filename %>.js',
				dest: '<%= dirs.dest %>/jquery.<%= cfg.filename %>.js',
				deps: {
					'default': ['$'],
					amd: ['jquery'],
					cjs: ['jquery'],
					global: ['jQuery']
				}
			},
			angular: {
				src: '<%= dirs.tmp %>/angular.<%= cfg.filename %>.js',
				dest: '<%= dirs.dest %>/angular.<%= cfg.filename %>.js',
				deps: {
					'default': ['angular'],
					amd: ['angular'],
					cjs: ['angular'],
					global: ['angular']
				}
			}
		}
	});

	// load all installed grunt tasks
	require('load-grunt-tasks')(grunt);

	// task defiinitions
	grunt.registerTask('default', [
		'clean:all',
		'jshint',
		'concat',
		'umd',
		'usebanner',
		'uglify',
		'clean:tmp',
		'readme'
	]);

	grunt.registerTask('test', ['karma:unit']);
	grunt.registerTask('all', ['default', 'less']);
};
