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

// MIDWAY head file
require('babel-core/register');
import * as Koa from 'koa';
import * as winston from 'winston';

import * as webpack from 'webpack';
const webpackConfig = require('../webpack.config.js');
const reqText = require('require-text');
import Util from './Util';


const app = new Koa();

import Router from './Router';

const optDefs = [
  {name: 'port', alias: 'p', type: Number, defaultValue: 3000},
  {name: 'db', alias: 'r', type: String, defaultValue: 'mysql'},
];

const cmdLineArgs = require('command-line-args');
const args = cmdLineArgs(optDefs);

Router.post('/oauth2', async function(ctx, next) {
  console.log(ctx, next);
});

Router.get('/bundle.js', async function(ctx, next) {
	// TODO render this if DEV, otherwise render compiled bundle.js
  let response = await Util.getRequest('http://localhost:8080/bundle.js');
  ctx.body = response;
});

const index = require('require-text')('../src/app/index.html', require);
Router.get('/', async function(ctx, next) {
  ctx.body = index.toString();
});

app.proxy = true;

const bodyParser = require('koa-bodyparser');
app.use(bodyParser());

const passport = require('koa-passport');
app.use(passport.initialize());
app.use(passport.session());

app.use(Router.routes());

app.listen(args.port);

// TODO list
// - import HTML rather than writing directly inline
// - kick off webpack dev server when in DEV mode (and kill it when server stops)
// - difference between prod and dev mode: prod references bundle.js static file
