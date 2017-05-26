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

// Production build configuration for webpack.

var webpack = require('webpack');
var conf = require('./webpack.config');

// Disable source map.
delete conf.devtool;

conf.plugins = [
  new webpack.DefinePlugin({
    // Signal to React not to include detailed checks.
    'process.env': {
      'NODE_ENV': "'production'"
    },
    
    DEV: "false",
    
    // The server simultaneously serves the client and the client's requests.
    MIDWAY_HOST: "'//" + process.env.MIDWAY_HOST + ":40080'",
    TDB_HOST: "'//" + process.env.TDB_HOST + ":7344'"
  }),

  // Minify code.
  new webpack.optimize.UglifyJsPlugin()
];

// enable babel plugins on tsx loader
if(conf.module.rules[0].loader !== 'babel-loader?presets[]=react&presets[]=latest!ts-loader?{"compilerOptions":{}}')
{
  throw new Error('Expected first loader to be babel-loader?presets[]=react&presets[]=latest!ts-loader?{"compilerOptions":{}} but found '
    + conf.module.rules[0].loader);
}
conf.module.rules[0].loader =
  'babel-loader?presets[]=react&plugins[]=transform-react-inline-elements&plugins[]=transform-react-constant-elements&minified=true!ts-loader?{"compilerOptions":{}}';

module.exports = conf;
