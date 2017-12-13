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

// split
function split<T, R extends T, S extends T>(obj: R, oldCol: string, newCols: string[], splitText: string): S
{
  if (oldCol === undefined || newCols === undefined || splitText === undefined)
  {
    throw new Error('Split transformation must supply oldCol, newCols, and splitText arguments.');
  }

  if (typeof obj[oldCol] !== 'string')
  {
    throw new Error('Can only split columns of type string.');
  }

  const splits = obj[oldCol].split(splitText);
  const n = splits.length;

  for (let i = 0; i < splits.length && i < newCols.length; ++i)
  {
    obj[newCols[i]] = splits[i];
  }
  delete obj[oldCol];
  return obj as T as S;
}

// join
function join<T, R extends T, S extends T>(obj: R, oldCols: string[], newCol: string, joinText?: string): S
{
  if (oldCols === undefined || newCol === undefined)
  {
    throw new Error('Join transformation must supply oldCols and newCol arguments.');
  }

  const joins: string[] = oldCols.reduce((arr, n) =>
  {
    const v = obj[n];
    if (typeof v !== 'string')
    {
      throw new Error('Can only join columns of type string.');
    }

    if (n !== newCol)
    {
      delete obj[n];
    }

    arr.push(v);
    return arr;
  }, []);

  obj[newCol] = joins.join(joinText);
  return obj as T as S;
}

// filter
function filter<T, R extends T>(obj: R, col: string): T
{
  if (col === undefined)
  {
    throw new Error('Filter transformation must supply col argument.');
  }

  delete obj[col];
  return obj as T;
}

// duplicate
function duplicate<T, R extends T>(obj: T, oldCol: string, newCol: string): R
{
  if (oldCol === undefined || newCol === undefined)
  {
    throw new Error('Duplicate transformation must supply oldCol and newCol arguments.');
  }

  if (oldCol !== newCol)
  {
    obj[newCol] = obj[oldCol];
  }

  return obj as R;
}

// rename
function rename<T, R extends T, S extends T>(obj: R, oldCol: string, newCol: string): S
{
  if (oldCol === undefined || newCol === undefined)
  {
    throw new Error('Rename transformation must supply oldCol and newCol arguments.');
  }

  duplicate(obj, oldCol, newCol);
  if (oldCol !== newCol)
  {
    filter(obj, oldCol);
  }

  return obj as T as S;
}

// plus (monoid plus)
function plus<T>(obj: T, leftCol: string, rightCol: string): T
{
  if (leftCol === undefined || rightCol === undefined)
  {
    throw new Error('Plus transformation must supply leftCol and rightCol arguments.');
  }

}
