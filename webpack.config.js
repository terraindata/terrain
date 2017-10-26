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


var webpack = require("webpack");
var path = require("path");
var ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports =
{
    entry: "./src/app/Root.tsx",
    devtool: "cheap-module-source-map",

    output:
    {
        path: __dirname,
        publicPath: "/assets/",
        filename: "bundle.js",
    },

    // NOTE: this should also be added to the production config
    devServer: {
        headers: {
            'Access-Control-Allow-Origin': '*'
        }
    },

    resolve:
    {
        // it is important that .tsx is before .less, so that it resolves first, so that files that share a name resolve correctly
        extensions: [ ".js", ".tsx", ".jsx", ".ts", ".css", ".less", ".json", ".svg" ],
        alias: {
            auth: path.resolve(__dirname, 'src/app/auth'),
            analytics: path.resolve(__dirname, 'src/app/analytics'),
            app: path.resolve(__dirname, 'src/app'),
            builder: path.resolve(__dirname, 'src/app/builder'),
            charts: path.resolve(__dirname, 'src/app/charts'),
            common: path.resolve(__dirname, 'src/app/common'),
            control: path.resolve(__dirname, 'src/app/control'),
            database: path.resolve(__dirname, 'src/database'),
            deploy: path.resolve(__dirname, 'src/app/deploy'),
            fileImport: path.resolve(__dirname, 'src/app/fileImport'),
            images: path.resolve(__dirname, 'src/images'),
            library: path.resolve(__dirname, 'src/app/library'),
            manual: path.resolve(__dirname, 'src/app/manual'),
            roles: path.resolve(__dirname, 'src/app/roles'),
            schema: path.resolve(__dirname, 'src/app/schema'),
            shared: path.resolve(__dirname, 'shared'),
            store: path.resolve(__dirname, 'src/app/store'),
            tql: path.resolve(__dirname, 'src/app/tql'),
            users: path.resolve(__dirname, 'src/app/users'),
            util: path.resolve(__dirname, 'src/app/util'),
            x: path.resolve(__dirname, 'src/app/x'),
        },
    },

    module:
    {
        rules:
        [
            // note: this first loader string gets updated in webpack.config.prod.js
            //  keep it first in this list
            {
                test: /\.ts(x?)$/,
                exclude: [/midway/, /analytics.js/, /node_modules/],
                loader:
                    "babel-loader!thread-loader!ts-loader?happyPackMode=true"
                    + JSON.stringify({
                        compilerOptions: {
                        },
                    }),
            },
            {
                test: /\.js(x?)$/,
                exclude: [/midway/, /analytics.js/, /node_modules/],
                loader: "babel-loader!thread-loader"
            },
            { test: /\.css$/, exclude: /midway/, loader: "style-loader!css-loader" },
            { test: /\.less$/, exclude: /midway/, loader: "style-loader!css-loader!less-loader?strictMath&noIeCompat" }, /* Note: strictMath enabled; noIeCompat also */
            { test: /\.woff(2?)$/, loader: "url-loader?limit=10000&mimetype=application/font-woff" },
            { test: /\.ttf$/, loader: "file-loader" },
            { test: /\.eot$/, loader: "file-loader" },
            { test: /\.jpg$/, loader: "file-loader" },
            { test: /\.gif$/, loader: "url-loader?limit=4000000" },
            { test: /\.png$/, loader: "url-loader?limit=4000000" },
            { test: require.resolve("jquery"), use: [{ loader: "expose-loader", options: "$" }]},
            {
                test: /\.svg(\?name=[a-zA-Z]*)*$/,
                exclude: [/midway/, /node_modules/],
                loader: "svg-react-loader",
            },
            { test: /\.txt$/, exclude: /midway/, loader: "raw-loader" },
        ],
    },

    plugins:
    [
        new webpack.DefinePlugin({
            MIDWAY_HOST: "'http://" + (process.env.MIDWAY_HOST || "localhost:3000") + "'",
            DEV: true,
        }),
        new ForkTsCheckerWebpackPlugin(),
    ],
};
