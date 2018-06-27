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

import * as _ from 'lodash';
import { KeyPath } from '../util/KeyPath';
import * as yadeep from '../util/yadeep';

import TransformationNode from 'shared/transformations/TransformationNode';
import TransformationNodeType, { NodeOptionsType } from './TransformationNodeType';
import TransformationNodeVisitor, { VisitorLookupMap } from './TransformationNodeVisitor';
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';

export default class TransformationEngineNodeVisitor
  extends TransformationNodeVisitor<TransformationVisitResult, object>
{
  public visitorLookup: VisitorLookupMap<TransformationVisitResult, object> = {};

  public visitDefault(type: TransformationNodeType, node: TransformationNode, doc: object)
  {
    return node.transform(doc);
  }
}

/*
 * referenceKP can contain -1
 * matchKP should not contain -1
 */
export function createLocalMatcher(referenceKP: KeyPath, matchKP: KeyPath): (newKP: KeyPath) => KeyPath
{
  if (referenceKP.size !== matchKP.size || referenceKP.size === 0)
  {
    return null;
  }

  const replacements: {
    [k: number]: number;
  } = {};

  let maxIndex = -1;

  for (let i = 0; i < referenceKP.size; i++)
  {
    const searchIndex = referenceKP.get(i);
    const matchIndex = matchKP.get(i);
    if (searchIndex !== matchIndex)
    {
      if (typeof searchIndex !== 'number' || typeof matchIndex !== 'number')
      {
        return null;
      }
      else
      {
        replacements[i] = matchIndex;
        maxIndex = i;
      }
    }
  }

  const baseMatchPath = matchKP.slice(0, maxIndex + 1);

  return (newKP: KeyPath) =>
  {
    if (maxIndex === -1)
    {
      return newKP;
    }
    else
    {
      const toTransplant = newKP.slice(maxIndex + 1);
      return baseMatchPath.concat(toTransplant).toList();
    }

  };
}

export function visitHelper(fields: List<KeyPath>, doc: object, defaultResult: TransformationVisitResult,
  cb: (kp: KeyPath, el: any) => TransformationVisitResult | void,
  shouldTransform: (kp: KeyPath, el: any) => boolean = (kp, el) => true): TransformationVisitResult
{
  const reducedResult = fields.reduce((accumulator, field) =>
  {
    if (accumulator)
    {
      return accumulator;
    }
    const el = yadeep.get(doc, field);
    if (!shouldTransform(field, el))
    {
      return accumulator;
    }
    if (Array.isArray(el) && field.contains(-1))
    {
      for (let i: number = 0; i < el.length; i++)
      {
        let kp: KeyPath = field;
        if (kp.contains(-1))
        {
          kp = kp.set(kp.indexOf(-1), i.toString());
        }
        else
        {
          kp = kp.push(i.toString());
        }
        const result = cb(kp, yadeep.get(doc, kp));
        if (result !== undefined)
        {
          return result;
        }
      }
    }
    else
    {
      const result = cb(field, el);
      if (result !== undefined)
      {
        return result;
      }
    }
    return accumulator;
  }, undefined);
  if (reducedResult !== undefined)
  {
    return reducedResult;
  }
  else
  {
    return defaultResult;
  }
}
