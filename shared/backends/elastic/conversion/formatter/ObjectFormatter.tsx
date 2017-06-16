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

import ElementInfo from './ElementInfo';
/**
 * Abstract class for classes that want to format query strings
 * When parsing objects, events handlers are called in a clarinet-like fashion with 2 main differences:
 * - parent/child/sibling information is available on each event
 * - ability to sort keys to display them in a different order
 * Potentially relevant about default traversal algorithm
 * - does not complain if root element is a primitive like a string or number
 */
abstract class ObjectFormatter
{
  /**
   * It might make sense to pass in query object here and parse it on construction,
   * but this could prevent child classes from doing construction-time setup since
   * inherited class constructors must call super() immediately.
   */
  // tslint:disable-next-line:no-empty
  constructor() { }

  /**
   * @param obj the query object
   * @returns If parsing was successful
   */
  public parseObject(obj: any): boolean
  {
    try
    {
      this.traverseObject(obj, new ElementInfo(0));
      this.onEnd();
      return true;
    }
    catch (e)
    {
      this.onError(e);
      return false;
    }
  }

  /**
   * @returns {string} the formatted query string
   */
  public abstract getResultText(): string;

  /**
   * All event handlers except for onEnd and onError are provided an ElementInfo when called.
   * Each ElementInfo gives information about the relationship between the handled element and its container
   */

  /**
   * Called on terminal values
   */
  protected abstract onValue(val: any, element?: ElementInfo): void;

  /**
   * Called on key names - keys are delivered in order that sortKeys returns
   */
  protected abstract onKey(key: string, element?: ElementInfo): void;

  /**
   * Called when object is encountered
   */
  protected abstract onOpenObject(obj?: object, element?: ElementInfo): void;

  /**
   * Called after traversing through object
   */
  protected abstract onCloseObject(obj?: object, element?: ElementInfo): void;

  /**
   * Called when array is encountered
   */
  protected abstract onOpenArray(arr?: any[], element?: ElementInfo): void;

  /**
   * Called after traversing through array
   */
  protected abstract onCloseArray(arr?: any[], element?: ElementInfo): void;

  /**
   * Called after traversing through root element
   */
  // tslint:disable-next-line:no-empty
  protected onEnd(): void { }

  /**
   * Called when errors are encountered. No information other than the error itself is given
   */
  // tslint:disable-next-line
  protected onError(err: Error): void { console.error(err); }

  /**
   * Called when an object is encountered. The returned array will be the order in which
   * the traversal algorithm goes through the obejct. By default, returns the keys as found.
   */
  protected sortKeys(keys: string[], element?: ElementInfo): string[] { return keys; } // traverse keys in order of returned array

  /**
   * This does not need to be overriden
   */
  protected traverseObject(obj: any, element: ElementInfo): void
  {
    switch (typeof obj)
    {
      case 'string':
      case 'number':
      case 'boolean':
        this.onValue(obj, element);
        break;
      case 'object':
        if (Array.isArray(obj))
        {
          this.onOpenArray(obj, element);
          for (let i = 0; i < obj.length; i++)
          {
            this.traverseObject(obj[i], new ElementInfo(i, obj));
          }
          this.onCloseArray(obj, element);
        }
        else if (obj === null)
        {
          this.onValue(null, element);
        }
        else
        {
          const keys = this.sortKeys(Object.keys(obj), element);
          this.onOpenObject(obj, element);
          for (let i = 0; i < keys.length; i++)
          {
            const innerElement: ElementInfo = new ElementInfo(i, obj, keys);
            this.onKey(keys[i], innerElement);
            this.traverseObject(obj[keys[i]], innerElement);
          }
          this.onCloseObject(obj, element);
        }
        break;
      default:
        throw new Error('Error while traversing object: "' + (typeof obj) + '" is not a valid type');
    }
  }
}
export default ObjectFormatter;
