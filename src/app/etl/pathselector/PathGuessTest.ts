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

// Copyright 2018 Terrain Data, Inc.

// const Earthquakes = require('./earthquakes.json');
// const Movies = require('./movies.json');
// const UsersRomance = require('./Users_Romance.json');
// const Waduhek = require('./waduhekmovies.json');

export default class PathUtil
{
  public static isArray(object)
  {
    const isArrayType = Array.isArray(object);
    return isArrayType;
  }

  public static renderFields(objectItem: object)
  {
    const keyFields = [];
    if (objectItem === undefined || objectItem === null)
    {
      return keyFields;
    }
    for (const key of Object.keys(objectItem))
    {
      keyFields.push(key);
    }
    return keyFields;
  }

  public static matchingFields(object) // check that objects in the json have the same key fields (consistent)
  {
    if (typeof object !== 'object')
    {
      return false; // the object cant be iterated through
    }

    let comparedKeys;
    for (const key of Object.keys(object))
    {
      const keyFields = PathUtil.renderFields(object.key);
      if (comparedKeys !== undefined && keyFields !== comparedKeys)
      {
        return false;
      }
      comparedKeys = keyFields;
    }
    return true;
  }

  public static matchingFieldLength(object) // check that objects in the json have the same number of key fields
  {
    let comparedLength;
    for (const itemKey of Object.keys(object))
    {
      const itemLength = (object[itemKey] !== undefined) ? object[itemKey].length : 0;
      if (comparedLength !== undefined && itemLength !== comparedLength)
      {
        return false;
      }
      comparedLength = itemLength;
    }
    return true;
  }

  public static containsAllObjects(array: object)
  {
    for (let i = 0; i < array.length; i++)
    {
      if (typeof array[i] !== 'object')
      {
        return false;
      }
    }
    return true;
  }

  public static isPossiblePath(json: object, key)
  {
    const object = json[key];
    if (object === undefined || object === null)
    {
      return false;
    }
    if (typeof object === 'string' || typeof object === 'number')
    {
      return false;
    }
    if (object.length === 0 || object.length === 1)
    {
      return false;
    }
    if (PathUtil.isArray(object))
    {
      if (!PathUtil.containsAllObjects(object))
      {
        return false;
      }
      if (PathUtil.matchingFieldLength(object) || PathUtil.matchingFields(object))
      {
        return true;
      }
    }
    else
    {
      return false;
    }
  }

  public static guessPath(json: object, possiblePaths, depth: number)
  {
    if (depth > 5) // threshold for recusive calls
    {
      return possiblePaths;
    }
    if (json === undefined || json === null)
    {
      return possiblePaths;
    }

    const isArrayType = PathUtil.isArray(json);
    if (isArrayType)
    {
      return possiblePaths; // proper path already
    }
    for (const key of Object.keys(json))
    {
      if (PathUtil.isPossiblePath(json, key))
      {
        possiblePaths.push(key);
      }
      PathUtil.guessPath(json[key], possiblePaths, depth + 1);
    }
    return possiblePaths;
  }

  public static guessFilePaths(json)
  {
    return PathUtil.guessPath(json, [], 0);
  }
}
