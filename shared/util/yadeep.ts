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

/**
 * Yet another deep JSON getter/setter module.
 * The point of the module is to allow getting and
 * setting values in a deeply nested object via
 * `KeyPath`s, including wildcards for operating
 * on all children.
 */

import isPrimitive = require('is-primitive');
import { KeyPath, WayPoint } from './KeyPath';

/**
 * Generic traversal method for a deeply-nested object.
 * A stand-out feature is that it supports wildcards in
 * paths, so the traversal may split into many branches
 * of sub-traversals and operate on a number of leaves.
 * The method is designed to take a callback that operates
 * on any target values (e.g. get or set those values).
 *
 * NOTE that this is tested primarily against objectified
 * documents (see `deepObjectify`).  Deeply nested objects
 * with true arrays may result in undesired behavior sometimes.
 * This function is much simpler not having to worry about
 * processing true arrays.
 *
 * @param obj     The object to traverse / on which to operate.
 * @param path    The path specifying which elements of `obj`
 *                need to be acted upon.
 * @param next    A callback function that specifies what to
 *                do once a target element in `obj` has been
 *                found.  Could return void (think get)
 *                or a value (think set).
 * @param options Any options for the traversal.  Currently
 *                only `create` (bool) is used: whether to
 *                create a target path in the doc if it
 *                doesn't already exist.
 */
export function find(obj: object, path: KeyPath, next: (found) => any, options: object = {}): void
{
  if (path.size === 0 || obj === null || obj === undefined)
  {
    // In all these kinds of statements, if next returns void, obj isn't modified
    obj = next(obj);
    return;
  }

  const waypoint: WayPoint = path.get(0);

  const keys: string[] = Object.keys(obj);

  // Handle the case of encountering a wildcard
  if (waypoint === '*')
  {
    const results: any[] = [];
    for (let j: number = 0; j < keys.length; j++)
    {
      if (!isPrimitive(obj[keys[j]]))
      {
        find(obj[keys[j]], path.shift(), (found) =>
        {
          results[j] = found;
          return next(found);
        }, options);
      }
      else if (path.size === 1)
      {
        // else push undefined?
        results[j] = obj[keys[j]];
      }
    }
    obj = next(results);
    return;
  }

  // Create a field if it doesn't exist
  if (options['create'] === true && !obj.hasOwnProperty(waypoint) && !isPrimitive(obj))
  {
    obj[waypoint] = {};
    keys.push(waypoint);
  }

  for (let i: number = 0; i < keys.length; ++i)
  {
    if (keys[i] === waypoint)
    {
      // Don't be fooled, this is the real base case...
      if (path.size === 1)
      {
        if (options['delete'] === true)
        {
          delete obj[keys[i]];
        }
        else
        {
          obj[keys[i]] = next(obj[keys[i]]);
        }
        return;
      } else
      {
        // Recursively search down the document...
        return find(obj[keys[i]], path.shift(), next, options);
      }
    }
  }

  return next(undefined);
}

/**
 * Gets the value(s) specified by the provided
 * `KeyPath` in the document `obj`.
 *
 * @param obj  The deeply-nested doc to search.
 * @param path The path of value(s) to get.
 * @returns    The value(s) of `obj` at `path`.
 */
export function get(obj: object, path: KeyPath): any
{
  let result: any;
  find(obj, path, (found) =>
  {
    result = found;
    return found;
  });
  return result;
}

/**
 * Sets the value(s) specified by the provided
 * `KeyPath` in the document `obj`.
 *
 * NOTE: this modifies `obj`.
 *
 * @param obj     The object to modify.
 * @param path    The path of the value(s) to set.
 * @param value   The value to assign to all elements matching `path`.
 * @param options Any options.  Currently supports only `create` (bool)
 *                which specifies whether to create a field if it doesn't exist.
 */
export function set(obj: object, path: KeyPath, value: any, options: object = {}): void
{
  find(obj, path, (found) =>
  {
    return value;
  }, options);
}

/**
 * Deletes the value(s) specified by the provided
 * `KeyPath` from the document `obj`.
 *
 * NOTE: this modifies `obj`.
 *
 * @param obj  The object to modify.
 * @param path The path of the value(s) to delete.
 */
export function remove(obj: object, path: KeyPath): void
{
  set(obj, path, undefined, { delete: true });
}
