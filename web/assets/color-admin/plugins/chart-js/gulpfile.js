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

var gulp = require('gulp'),
	concat = require('gulp-concat'),
	uglify = require('gulp-uglify'),
	util = require('gulp-util'),
	jshint = require('gulp-jshint'),
	size = require('gulp-size'),
	connect = require('gulp-connect'),
	replace = require('gulp-replace'),
	htmlv = require('gulp-html-validator'),
	inquirer = require('inquirer'),
	semver = require('semver'),
	exec = require('child_process').exec,
	fs = require('fs'),
	package = require('./package.json'),
	bower = require('./bower.json');

var srcDir = './src/';
/*
 *	Usage : gulp build --types=Bar,Line,Doughnut
 *	Output: - A built Chart.js file with Core and types Bar, Line and Doughnut concatenated together
 *			- A minified version of this code, in Chart.min.js
 */

gulp.task('build', function(){

	// Default to all of the chart types, with Chart.Core first
	var srcFiles = [FileName('Core')],
		isCustom = !!(util.env.types),
		outputDir = (isCustom) ? 'custom' : '.';
	if (isCustom){
		util.env.types.split(',').forEach(function(type){ return srcFiles.push(FileName(type))});
	}
	else{
		// Seems gulp-concat remove duplicates - nice!
		// So we can use this to sort out dependency order - aka include Core first!
		srcFiles.push(srcDir+'*');
	}

	return gulp.src(srcFiles)
		.pipe(concat('Chart.js'))
		.pipe(replace('{{ version }}', package.version))
		.pipe(gulp.dest(outputDir))
		.pipe(uglify({preserveComments:'some'}))
		.pipe(concat('Chart.min.js'))
		.pipe(gulp.dest(outputDir));

	function FileName(moduleName){
		return srcDir+'Chart.'+moduleName+'.js';
	};
});

/*
 *	Usage : gulp bump
 *	Prompts: Version increment to bump
 *	Output: - New version number written into package.json & bower.json
 */

gulp.task('bump', function(complete){
	util.log('Current version:', util.colors.cyan(package.version));
	var choices = ['major', 'premajor', 'minor', 'preminor', 'patch', 'prepatch', 'prerelease'].map(function(versionType){
		return versionType + ' (v' + semver.inc(package.version, versionType) + ')';
	});
	inquirer.prompt({
		type: 'list',
		name: 'version',
		message: 'What version update would you like?',
		choices: choices
	}, function(res){
		var increment = res.version.split(' ')[0],
			newVersion = semver.inc(package.version, increment);

		// Set the new versions into the bower/package object
		package.version = newVersion;
		bower.version = newVersion;

		// Write these to their own files, then build the output
		fs.writeFileSync('package.json', JSON.stringify(package, null, 2));
		fs.writeFileSync('bower.json', JSON.stringify(bower, null, 2));

		complete();
	});
});

gulp.task('release', ['build'], function(){
	exec('git tag -a v' + package.version);
});

gulp.task('jshint', function(){
	return gulp.src(srcDir + '*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});

gulp.task('valid', function(){
	return gulp.src('samples/*.html')
    .pipe(htmlv());
});

gulp.task('library-size', function(){
	return gulp.src('Chart.min.js')
		.pipe(size({
			gzip: true
		}));
});

gulp.task('module-sizes', function(){
	return gulp.src(srcDir + '*.js')
	.pipe(uglify({preserveComments:'some'}))
	.pipe(size({
		showFiles: true,
		gzip: true
	}))
});

gulp.task('watch', function(){
	gulp.watch('./src/*', ['build']);
});

gulp.task('test', ['jshint', 'valid']);

gulp.task('size', ['library-size', 'module-sizes']);

gulp.task('default', ['build', 'watch']);

gulp.task('server', function(){
	connect.server({
		port: 8000,
	});
});

// Convenience task for opening the project straight from the command line
gulp.task('_open', function(){
	exec('open http://localhost:8000');
	exec('subl .');
});

gulp.task('dev', ['server', 'default']);
