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

import sha1 = require('sha1');

export function getType(obj: object): string
{
  if (typeof obj === 'object')
  {
    if (obj === null)
    {
      return 'null';
    }
    if (obj instanceof Date)
    {
      return 'date';
    }
    if (Array.isArray(obj))
    {
      return 'array';
    }
    if (_.isEqual(obj, {}) || (Array.isArray(Object.keys(obj)) && Object.keys(obj).length !== 0))
    {
      return 'nested';
    }
  }
  if (typeof obj === 'string')
  {
    return 'text';
  }
  // handles "number", "boolean", "object", and "undefined" cases
  return typeof obj;
}

/* checks if all elements in the provided array are of the same type ; handles nested arrays */
export function isTypeConsistent(arr: object[]): boolean
{
  return _isTypeConsistentHelper(arr) !== 'inconsistent';
}

function _isTypeConsistentHelper(arr: object[]): string
{
  if (arr.length === 0)
  {
    return 'null';
  }
  const types: Set<string> = new Set();
  arr.forEach((obj) =>
  {
    types.add(getType(obj));
  });
  if (types.size > 1)
  {
    types.delete('null');
  }
  if (types.size !== 1)
  {
    return 'inconsistent';
  }
  const type: string = types.entries().next().value[0];
  if (type === 'array')
  {
    const innerTypes: Set<string> = new Set();
    arr.forEach((obj) =>
    {
      innerTypes.add(_isTypeConsistentHelper(obj as object[]));
    });
    if (innerTypes.size > 1)
    {
      innerTypes.delete('null');
    }
    if (innerTypes.size !== 1)
    {
      return 'inconsistent';
    }
    return innerTypes.entries().next().value[0];
  }
  return type;
}

function _getObjectStructureStr(obj: object): string
{
  let structStr: string = getType(obj);
  if (structStr === 'object')
  {
    structStr = Object.keys(obj).sort().reduce((res, item) =>
    {
      res += '|' + item + ':' + _getObjectStructureStr(obj[item]) + '|';
      return res;
    },
      structStr);
  }
  else if (structStr === 'array')
  {
    if (Object.keys(structStr).length > 0)
    {
      structStr += '-' + _getObjectStructureStr(obj[0]);
    }
    else
    {
      structStr += '-empty';
    }
  }
  return structStr;
}

/* returns a hash based on the object's field names and data types
  * handles object fields recursively ; only checks the type of
  * the first element of arrays */
 export function hashObjectStructure(obj: object): string
 {
   return sha1(_getObjectStructureStr(obj));
 }

 /* recursive helper to handle arrays */
function _buildDesiredHashHelper(typeObj: object): string
{
  const NUMERIC_TYPES: Set<string> = new Set(['byte', 'short', 'integer', 'long', 'half_float', 'float', 'double']);
  if (NUMERIC_TYPES.has(typeObj['type']))
  {
    return 'number';
  }
  if (typeObj['type'] === 'array')
  {
    return 'array-' + _buildDesiredHashHelper(typeObj['innerType']);
  }
  return typeObj['type'];
}

/* return the target hash an object with the specified field names and types should have
 * nameToType: maps field name (string) to object (contains "type" field (string)) */
export function buildDesiredHash(nameToType: object): string
{
  let strToHash: string = 'object';
  const nameToTypeArr: string[] = Object.keys(nameToType).sort();
  nameToTypeArr.forEach((name) =>
  {
    strToHash += '|' + name + ':' + _buildDesiredHashHelper(nameToType[name]) + '|';
  });
  return sha1(strToHash);
}
