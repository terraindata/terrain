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

import * as _ from 'lodash';

export interface DSNConfig
{
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
}

export function parseDSNConfig(dsnString: string): DSNConfig
{
  const idx0 = dsnString.lastIndexOf('@');
  const idx1 = dsnString.lastIndexOf('/');
  const end = idx1 > 0 ? idx1 : dsnString.length;
  const h0 = dsnString.substr(0, idx0);
  const h1 = dsnString.substr(idx0 + 1, end);
  const h2 = (idx1 > 0) ? dsnString.substr(idx1 + 1, dsnString.length - idx1) : undefined;
  const q1 = h0 !== '' ? h0.split(':') : [];
  const q2 = h1 !== '' ? h1.split(':') : [];

  const user: string = q1.length > 0 ? q1[0] : undefined;
  const password: string = q1.length > 1 ? q1[1] : undefined;
  const host: string = q2.length > 0 ? q2[0] : undefined;
  const port: number = q2.length > 1 ? parseInt(q2[1], 10) : undefined;
  const database: string = (h2 !== undefined && h2 !== '') ? h2 : undefined;

  return {
    user,
    password,
    host,
    port,
    database,
  };
}
