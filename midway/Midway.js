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
const Koa = require('koa');
const app = new Koa();
const winston = require('winston');
const cmdLineArgs = require('command-line-args');
const webpackMiddleware = require("koa-webpack-dev-middleware");
const webpack = require('webpack');
const webpackConfig = require('../webpack.config.js');
let index = "nope";
// require(['text!../src/app/index.html'], function(html) {
// 	console.log(html);
// 	index = html;
// });
const request = require('koa-request');

const optDefs = [
    {name: 'port', alias: 'p', type: Number, defaultValue: 3000},
    {name: 'db', alias: 'r', type: String, defaultValue: "mysql"},
];

const args = cmdLineArgs(optDefs);

// app.use(webpackMiddleware(
// 	webpack({
//     entry: "./src/app/App.tsx",
//     devtool: 'eval',
//     output: {
//         path: __dirname,
//         filename: "bundle.js"
//     },
//     resolve: {
//         // it is important that .tsx is before .less, so that it resolves first, so that files that share a name resolve correctly
//         extensions: [ '', '.js', '.tsx', '.jsx', '.ts', '.css', '.less', '.json', '.svg' ],
//     },
//     module: {
//         loaders: [
//             // note: this first loader string gets updated in webpack.config.prod.js
//             //  keep it first in this list
//             // { test: /\/[a-zA-Z]*$/, loader: 
//             //   'babel?presets[]=react&presets[]=latest!ts-loader' },
//             { test: /\.tsx?$/, loader: 
//               'babel?presets[]=react&presets[]=latest!ts-loader' },
//             { test: /\.css$/, loader: "style!css" },
//             { test: /\.less$/, loader: "style!css!less?strictMath&noIeCompat" }, /* Note: strictMath enabled; noIeCompat also */
//             { test: /\.jsx?$/, exclude: /node_modules/, loader: 'babel?presets[]=react&presets[]=latest' },
//             { test: /\.woff(2)?$/,   loader: "url?limit=10000&mimetype=application/font-woff" },
//             { test: /\.ttf$/, loader: "file" },
//             { test: /\.eot$/, loader: "file" },
//             { test: /\.jpg$/, loader: "file" },
//             { test: /\.gif$/, loader: "url?limit=4000000" },
//             { test: /\.png$/, loader: "url?limit=4000000" },
//             { test: require.resolve('jquery'), loader: "expose?jQuery" },
//             { test: /\.json$/, loader: 'json' },
//             { 
// 		      test: /\.svg(\?name=[a-zA-Z]*)*$/, loader: 'babel?presets[]=react&presets[]=latest!svg-react' + 
// 		              // removes data-name attributes
// 		              '!string-replace?search=%20data-name%3D%22%5B%5Cw%5Cs_-%5D*%22&replace=&flags=ig'
// 	        },
//             { test: /\.txt$/, loader: 'raw-loader' }, 
//         ]
//     },
//     plugins: [
//         new webpack.DefinePlugin({
//         'MIDWAY_HOST': "'//" + process.env.MIDWAY_HOST + ":40080'",
//         'TDB_HOST': "'//" + process.env.TDB_HOST + ":7344'",
//         'DEV': "true"
//         }),

//         // new CircularDependencyPlugin({
//         //   // exclude detection of files based on a RegExp 
//         //   exclude: /node_modules/,
//         //   // add errors to webpack instead of warnings 
//         //   failOnError: true
//         // })
//     ],
//     historyApiFallback: {
//       rewrites: [
//         // shows favicon
//         { from: /favicon.ico/, to: 'favicon.ico' },
//       ],
//     },
// }),
// 	{
// 		// publicPath is required, whereas all other options are optional

// 		noInfo: false,
// 		// display no info to console (only warnings and errors)

// 		quiet: false,
// 		// display nothing to the console

// 		lazy: true,
// 		// switch into lazy mode
// 		// that means no watching, but recompilation on every request

// 		watchOptions: {
// 			aggregateTimeout: 300,
// 			poll: true
// 		},
// 		// watch options (only lazy: false)

// 		publicPath: "/",
// 		// public path to bind the middleware to
// 		// use the same as in webpack
		
// 		index: "index.html",
// 		// the index path for web server

// 		headers: { "X-Custom-Header": "yes" },
// 		// custom headers

// 		stats: {
// 			colors: true
// 		},
// 		// options for formating the statistics

// 		reporter: null,
// 		// Provide a custom reporter to change the way how logs are shown.

// 		serverSideRender: false,
// 		// Turn off the server-side rendering mode. See Server-Side Rendering part for more info.
// 	}
// ));

app.use(function *()
{
	// console.log(ctx);
	
	if(this.url.indexOf('bundle.js') >= 0)
	{
		// serve bundle
		let response = yield request({
	    method: 'GET',
	    url: 'http://localhost:8080/bundle.js',
	    // headers: { 'content-type': 'application/json' },
	    // body: JSON.stringify({ param1: 'Hello World from A' })
	  });
		console.log('r', response.body.length);
	  this.body = response.body;
	}
	else
	{
		// serve index.html
		this.body = `<html>
    <head>
    		<title>Terraformer | Terrain | v0.1: Alfa Romeo</title>
    		<meta name="viewport" content="initial-scale=1, maximum-scale=1">
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css?family=Open+Sans" rel="stylesheet">
    </head>
    <body>
    	<div id="app"></div>
        <script type="text/javascript" src="bundle.js" charset="utf-8"></script>
    </body>
</html>
`;
	}
});

// console.log(app.use);
// app.get(function *() {
//   this.body = this.webpack.fileSystem.readFileSync('index.html');
// });

//app.get('/terraformer', function(req, res) { res.sendFile(__dirname+"/dist/"+"index.html"); });
//app.get('/terraformer/bundle.js', function(req, res) { res.sendFile(__dirname+"/dist/bundle.js"); });
//app.get('/terraformer/^(.+)$', function(req, res) { res.sendFile(__dirname+"/dist/"+req.params[0]); });

//app.use('/', express.static(__dirname + "/dist", { index: 'index.html' }));
app.listen(args.port);
