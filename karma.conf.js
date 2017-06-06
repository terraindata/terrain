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

let webpack = require("webpack");
let tsconfig = require("./tsconfig.json");

let runFrontEnd = true;
let runBackEnd = true;
if (process.env.only === "front")
{
  runBackEnd = false;
}
if (process.env.only === "back")
{
  runFrontEnd = false;
}

let files = [];
if (runFrontEnd)
{
  files.push("src/test/TestSuite.tsx");
}
if (runBackEnd)
{
  files.push("midway/test/TestSuite.tsx");
}

// with help from http://rmurphey.com/blog/2015/07/20/karma-webpack-tape-code-coverage

module.exports = function(config) {
  config.set({
    plugins: [
      require("karma-webpack"),
      require("karma-tap"),
      require("karma-chrome-launcher"),
      require("karma-phantomjs-launcher"),
      require("karma-coverage"),
      require("karma-typescript"),
    ],

    basePath: "",
    frameworks: [ "tap", "karma-typescript" ],
    files: files,
    autoWatch: true,

    preprocessors: {
      "src/test/TestSuite.tsx": [ "webpack" ],
      "midway/**/*.tsx": [ "karma-typescript" ],
    },

    webpack: {
      node : {
        fs: "empty",
      },

      // Instrument code that isn't test or vendor code.
      module: {
        loaders: [
            { test: /\.css$/, loader: "style!css" },
            { test: /\.less$/, loader: "style!css!less?strictMath&noIeCompat" }, /* Note: strictMath enabled; noIeCompat also */
            { test: /\.js$/, exclude: /node_modules/, loader: 'babel"babel"          { test: /\.woff(2)?$/,   loader: "url?limit=10000&mimetype=application/font-woff" },
            { test: /\.ttf$/, loader: "file" },
            { test: /\.eot$/, loader: "file" },
            { test: /\.svg$/, loader: "file" },
            { test: require.resolve('jquer"jquery"der: "expose?jQuery" },
            { test: /\.tsx$/, loader: 'babel"babel!ts-loader"          { test: /\.json$/, loader: 'json'"json"          { test: /\.svg\?name=[a-zA-Z]+$/, loader: 'babel"babel!svg-react"  ,   ],

        postLoaders: [{
          test: /\.tsx$/,
          exclude: /(test|node_modules)\//,
          loader: 'istanbul-inst"istanbul-instrumenter",     },
    },

    webpackMiddleware: {
      noInfo: true
    },

    k,armaTypescriptConfig: tsconfig,

    reporters: [
      'dots',
      'cove"dots"
      '"coverage"script',"karma-typescript"ageReporter: {
      type: 'text',
      dir: 'cov"text"'
    },

   "coverage/",,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRu"Chrome"
  })
};
;,