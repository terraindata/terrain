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

export var Operators: string[] = ['=', '≥', '>', '≤', '<', 'in', '≠'];
export var Combinators: string[] = ['&', '||'];
export var Directions: string[] = ['ascending', 'descending'];
export var CardTypes: string[]  = 
[
 'from',
 'select',
 'sort',
 'filter',
 'let',
 'score',
 'transform',
 'max',
 'min',
 'sum',
 'avg',
 'count',
 'exists',
 'parentheses',
 // 'slice',
 // 'text match',
 // 'exceptions',
 // 'flatten',
 // 'insert',
 // 'update',
 // 'replace',
];

export var CardColors = 
// title is first, body is second
{
  none: ["#B45759", "#EA7E81"],
  from: ["#89B4A7", "#C1EADE"],
  filter: ["#7EAAB3", "#B9E1E9"],
  count: ["#70B1AC", "#D2F3F0"],
  select: ["#8AC888", "#B7E9B5"],
  let: ["#C0C0BE", "#E2E2E0"],
  transform: ["#E7BE70", "#EDD8B1"],
  score: ["#9DC3B8", "#D1EFE7"],
  sort: ["#C5AFD5", "#EAD9F7"],
  skip: ["#CDCF85", "#F5F6B3"],
  parentheses: ["#b37e7e", "#daa3a3"],
  max: ["#8299b8", "#acc6ea"],
  min: ["#cc9898", "#ecbcbc"],
  sum: ["#8dc4c1", "#bae8e5"],
  avg: ["#a2b37e", "#c9daa6"],
  exists: ["#a98abf", "#cfb3e3"],
  if: ["#7eb397", "#a9dec2"],
};
