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

// Copyright 2017 Terrain Data, Inc.

import cmdLineArgs = require('command-line-args');
import cmdLineUsage = require('command-line-usage');
import { Config } from './Config';

const optionList = [
  {
    alias: 'c',
    defaultValue: 'config.json',
    name: 'config',
    type: String,
    typeLabel: 'file',
    description: 'Configuration file to use.',
  },
  {
    alias: 'p',
    defaultValue: 3001,
    name: 'port',
    type: Number,
    typeLabel: 'number',
    description: 'Port to listen on.',
  },
  {
    name: 'debug',
    type: Boolean,
    description: 'Turn on debug mode.',
  },
  {
    alias: 'h',
    name: 'help',
    type: Boolean,
    description: 'Show help and usage information.',
  },
  {
    alias: 'v',
    name: 'verbose',
    type: Boolean,
    description: 'Print verbose information.',
  },
  {
    alias: 'd',
    name: 'db',
    type: String,
    defaultValue: 'http://127.0.0.1:9200',
    description: 'Analytics datastore connection parameters',
  },
];

const sections = [
  {
    header: 'sigint 1.0',
    content: 'Terrain Analytics Server.',
  },
  {
    header: 'Options',
    optionList,
  },
];

export let CmdLineArgs: Config = cmdLineArgs(optionList,
  {
    partial: true,
  });

export const CmdLineUsage = cmdLineUsage(sections);
export default CmdLineArgs;
