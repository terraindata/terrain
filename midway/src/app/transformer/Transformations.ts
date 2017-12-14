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

// =====================================================================

// put
function put<T, K extends keyof V, V extends T>(obj: T, name: K, value: V[K]): V
{
  (obj as V)[name] = value;
  return obj as V;
}

// get
function get<T, K extends keyof T>(obj: T, name: K): T[K] {
  return obj[name];
}

// =====================================================================

// put multiple
function putS<T, K extends keyof V, V extends T>(obj: T, names: K[], values: Array<V[K]>): V
{
  for (let i = 0; i < names.length && i < values.length; i++)
  {
    (obj as V)[names[i]] = values[i];
  }

  return obj as V;
}

// get multiple
function getS<T, K extends keyof T>(obj: T, names: K[]): Array<T[K]> {
  return names.map((n) => obj[n]);
}

// =====================================================================

// split
function split(str: string, splitText: string): string[]
{
  return str.split(splitText);
}

function splitObj<T, R extends T, S extends T>(obj: R, oldName: string, newNames: string[], splitText: string): S
{
  if (typeof obj[oldName] !== 'string')
  {
    throw new Error('Can only split columns of type string.');
  }

  const v = get(obj, oldName);
  const splits =   obj[oldName].split(splitText);
  const n = splits.length;

  for (let i = 0; i < splits.length && i < newNames.length; ++i)
  {
    obj[newNames[i]] = splits[i];
  }
  delete obj[oldName];
  return obj as T as S;
}

// join
function join<T, R extends T, S extends T>(obj: R, oldNames: string[], newName: string, joinText?: string): S
{
  if (oldNames === undefined || newName === undefined)
  {
    throw new Error('Join transformation must supply oldNames and newName arguments.');
  }

  const joins: string[] = oldNames.reduce((arr, n) =>
  {
    const v = obj[n];
    if (typeof v !== 'string')
    {
      throw new Error('Can only join Nameumns of type string.');
    }

    if (n !== newName)
    {
      delete obj[n];
    }

    arr.push(v);
    return arr;
  }, []);

  obj[newName] = joins.join(joinText);
  return obj as T as S;
}

// filter
function filter<T, R extends T>(obj: R, Name: string): T
{
  if (Name === undefined)
  {
    throw new Error('Filter transformation must supply Name argument.');
  }

  delete obj[Name];
  return obj as T;
}

// duplicate
function duplicate<T, R extends T>(obj: T, oldName: string, newName: string): R
{
  if (oldName === undefined || newName === undefined)
  {
    throw new Error('Duplicate transformation must supply oldName and newName arguments.');
  }

  if (oldName !== newName)
  {
    obj[newName] = obj[oldName];
  }

  return obj as R;
}

// rename
function rename<T, R extends T, S extends T>(obj: R, oldName: string, newName: string): S
{
  if (oldName === undefined || newName === undefined)
  {
    throw new Error('Rename transformation must supply oldName and newName arguments.');
  }

  duplicate(obj, oldName, newName);
  if (oldName !== newName)
  {
    filter(obj, oldName);
  }

  return obj as T as S;
}

// plus (monoid plus)
function plus<T>(obj: T, leftName: string, rightName: string): T
{
  if (leftName === undefined || rightName === undefined)
  {
    throw new Error('Plus transformation must supply leftName and rightName arguments.');
  }

}
