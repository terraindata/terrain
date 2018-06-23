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
import * as Immutable from 'immutable';
import { List } from 'immutable';

import { visitHelper } from 'shared/transformations/TransformationEngineNodeVisitor';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import TransformationVisitError from 'shared/transformations/TransformationVisitError';
import TransformationVisitResult from 'shared/transformations/TransformationVisitResult';
import { KeyPath } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';
import TransformationNode from './TransformationNode';

export default class InsertTransformationNode extends TransformationNode
{
  public typeCode = TransformationNodeType.InsertNode;

  public transform(doc: object)
  {
    const opts = this.meta as NodeOptionsType<TransformationNodeType.InsertNode>;
    let result: TransformationVisitResult;
    this.fields.forEach((field) =>
    {
      const el: any = yadeep.get(doc, field);
      if (el === undefined || result !== undefined)
      {
        return;
      }
      if (typeof el !== 'string' && el.constructor !== Array)
      {
        result = {
          errors: [
            {
              message: 'Attempted to insert in a non-string field (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
        return;
      }

      let at: number = 0;
      if (typeof opts['at'] === 'number')
      {
        at = opts['at'];
        if (opts['at'] < 0)
        {
          at += (el.length as number) + 1;
        }
      }
      else if (opts['at'] === undefined)
      {
        at = el.length;
      }
      else
      {
        result = {
          errors: [
            {
              message: 'Insert node: "at" property is invalid',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
        return;
      }

      let value;
      if (Immutable.Iterable.isIterable(opts['value']) || opts['value'] instanceof KeyPath)
      {
        value = yadeep.get(doc, opts['value'] as KeyPath);
        if (typeof value !== 'string')
        {
          result = {
            errors: [
              {
                message: 'Insert: field denoted by "value" keypath is not a string',
              } as TransformationVisitError,
            ],
          } as TransformationVisitResult;
          return;
        }
      }
      else if (typeof opts['value'] === 'string')
      {
        value = opts['value'];
      }
      else
      {
        result = {
          errors: [
            {
              message: 'Insert: "value" property is missing or invalid',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
        return;
      }

      if (el.constructor === Array)
      {
        for (let i: number = 0; i < Object.keys(el).length; i++)
        {
          let kpi: KeyPath = field;
          if (kpi.contains(-1))
          {
            kpi = kpi.set(kpi.indexOf(-1), i.toString());
          }
          else
          {
            kpi = kpi.push(i.toString());
          }
          const eli: any = yadeep.get(doc, kpi);
          yadeep.set(doc, kpi, (eli.slice(0, at) as string) + String(value) + (eli.slice(at) as string), { create: true });
        }
      }
      else
      {
        // Currently assumes a single from and length for all fieldIDs
        yadeep.set(doc, field, (el.slice(0, at) as string) + String(value) + (el.slice(at) as string), { create: true });
      }
    });

    if (result !== undefined)
    {
      return result;
    }

    return {
      document: doc,
    } as TransformationVisitResult;
  }
}
