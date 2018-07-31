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

  const waypoint: WayPoint = path.get(0).toString();

  const keys: string[] = Object.keys(obj);

  // Handle the case of encountering a wildcard
  if (path.get(0) === -1)
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
  if (typeof waypoint === 'string' && options['create'] === true && !obj.hasOwnProperty(waypoint) && !isPrimitive(obj))
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

/*
 *  yayadeep!
 */

export interface ContextResult
{
  value: any;
  location: KeyPath;
}

function contains(obj: object | any[], key: number | string): boolean
{
  if (isPrimitive(obj))
  {
    return false;
  }
  if (Array.isArray(obj))
  {
    if (typeof key === 'number')
    {
      return obj.length > key;
    }
    else
    {
      return false;
    }
  }
  return typeof key === 'string' && obj.hasOwnProperty(key);
}

// can easily make this function be a generator/iterator instead. This way is faster though.
function searchRecurse(obj: object | any[], path: KeyPath, cb: (match: ContextResult) => void, index: number = 0)
{
  if (index === path.size) // even if obj is null or undefined, it is a property of its parent
  {
    return cb({
      value: obj,
      location: path,
    });
  }
  else if (index > path.size || isPrimitive(obj))
  {
    return;
  }

  const waypoint = path.get(index);

  if (waypoint === -1)
  {
    if (Array.isArray(obj))
    {
      for (let i = 0; i < obj.length; i++)
      {
        const elem = obj[i];
        const nextPath = path.set(index, i);
        searchRecurse(elem, nextPath, cb, index + 1);
      }
    }
    else
    {
      return;
    }
  }
  else
  {
    if (contains(obj, waypoint))
    {
      searchRecurse(obj[waypoint], path, cb, index + 1);
    }
  }
}

/**
 * Gets an array of all values and locations that
 * match `KeyPath` in the document `obj`
 * `KeyPath` in the document `obj`.
 *
 * @param obj  The deeply-nested doc to search.
 * @param path The path of value(s) to get.
 * @returns    An array of objects with fields 'location' and 'value'
 */
export function search(obj: object, path: KeyPath): ContextResult[]
{
  // return Array.from(searchDFS(obj, path));
  const results = [];
  searchRecurse(obj, path, (result) => results.push(result));
  return results;
}

/*
 *  A specialized set function that performs a set on non-wildcard keypaths
 */
export function setIn(obj: object, path: KeyPath, value): object
{
  if (path.size === 0)
  {
    return value;
  }
  if (typeof obj !== 'object' || obj == null)
  {
    return obj;
  }
  let curr = obj;
  for (let i = 0; i < path.size - 1; i++)
  {
    const waypoint = path.get(i);
    const nextWaypoint = path.get(i + 1);
    if (typeof nextWaypoint === 'number')
    {
      if (curr[waypoint] == null)
      {
        curr[waypoint] = [];
      }
      else if (!Array.isArray(curr[waypoint]))
      {
        return obj;
      }
    }
    else
    {
      if (curr[waypoint] == null)
      {
        curr[waypoint] = {};
      }
      else if (Array.isArray(curr[waypoint]))
      {
        return obj;
      }
    }
    curr = curr[waypoint];
  }
  curr[path.last()] = value;
  return obj;
}

/*
 *  A specialized delete function that performs a delete on non-wildcard keypaths
 */
export function deleteIn(obj: object, path: KeyPath)
{
  if (typeof obj !== 'object' || obj == null || path.size === 0)
  {
    return false;
  }
  let curr = obj;
  for (let i = 0; i < path.size - 1; i++)
  {
    const waypoint = path.get(i);
    if (curr[waypoint] == null)
    {
      return false;
    }
    curr = curr[waypoint];
  }
  if (curr.hasOwnProperty(path.last()))
  {
    delete curr[path.last()];
    return true;
  }
  else
  {
    return false;
  }
}

function* explore(obj: any, path: KeyPath, options: TraverseOptions): IterableIterator<ContextResult>
{
  if (isPrimitive(obj))
  {
    yield {
      location: path,
      value: obj,
    };
  }
  else if (Array.isArray(obj))
  {
    const limit = options.arrayLimit !== -1 ? Math.min(options.arrayLimit, obj.length) : obj.length;
    for (let i = 0; i < limit; i++)
    {
      yield* explore(obj[i], path.push(i), options);
    }
    if (!options.primitivesOnly)
    {
      yield {
        location: path,
        value: obj,
      };
    }
  }
  else
  {
    for (const key of Object.keys(obj))
    {
      yield* explore(obj[key], path.push(key), options);
    }
    if (!options.primitivesOnly)
    {
      yield {
        location: path,
        value: obj,
      };
    }
  }
}

export interface TraverseOptions
{
  primitivesOnly: boolean; // whether to yield only primitives
  arrayLimit: number; // limit exploration of arrays
}

/*
 *  Perform a postorder traversal of the fields of an object with some special abilities
 */
export function traverse(obj: any, opts: Partial<TraverseOptions> = {}): IterableIterator<ContextResult>
{
  const defaults: TraverseOptions = {
    primitivesOnly: false,
    arrayLimit: -1,
  };
  const options: TraverseOptions = _.extend({}, defaults, opts);
  return explore(obj, KeyPath([]), options);
}
