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
// tslint:disable:max-classes-per-file
import { List } from 'immutable';

import { visitHelper } from 'shared/transformations/TransformationEngineNodeVisitor';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import TransformationVisitError from 'shared/transformations/TransformationVisitError';
import TransformationVisitResult from 'shared/transformations/TransformationVisitResult';
import { KeyPath } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';
import TransformationNode from './TransformationNode';

import TransformationNodeInfo from './info/TransformationNodeInfo';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import EngineUtil from 'shared/transformations/util/EngineUtil';

const TYPECODE = TransformationNodeType.SplitNode;

export class SplitTransformationNode extends TransformationNode
{
  public readonly typeCode = TYPECODE;

  public transform(doc: object)
  {
    const opts = this.meta as NodeOptionsType<TransformationNodeType.SplitNode>;

    if (this.fields.size > 1)
    {
      return {
        errors: [
          {
            message: 'Attempted to split multiple fields at once (this is not supported)',
          } as TransformationVisitError,
        ],
      } as TransformationVisitResult;
    }

    this.fields.forEach((field) =>
    {
      const el: any = yadeep.get(doc, field);
      if (el === undefined)
      {
        return;
      }
      let split: string[];
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

          split = splitHelper(yadeep.get(doc, kpi), opts);

          for (let j: number = 0; j < split.length; j++)
          {
            let newkpi: KeyPath = opts.newFieldKeyPaths.get(j);
            if (newkpi.contains(-1))
            {
              newkpi = newkpi.set(newkpi.indexOf(-1), i.toString());
            }
            else
            {
              newkpi = newkpi.push(i.toString());
            }
            yadeep.set(doc, newkpi, split[j], { create: true });
          }
        }
      }
      if (typeof el !== 'string')
      {
        return {
          errors: [
            {
              message: 'Attempted to split a non-string field (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }

      split = splitHelper(el, opts);
      if (split.length > opts.newFieldKeyPaths.size)
      {
        split[opts.newFieldKeyPaths.size - 1] = split.slice(opts.newFieldKeyPaths.size - 1).join(String(opts.delimiter));
      }
      for (let i: number = 0; i < opts.newFieldKeyPaths.size; i++)
      {
        yadeep.set(doc, opts.newFieldKeyPaths.get(i), split[i], { create: true });
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }
}

class SplitTransformationInfoC extends TransformationNodeInfo
{
  public readonly typeCode = TYPECODE;
  public humanName = 'Split Field';
  public description = 'Split this field into 2 or more fields';
  public nodeClass = SplitTransformationNode;

  public editable = true;
  public creatable = true;
  public newFieldType = 'string';

  public isAvailable(engine: TransformationEngine, fieldId: number)
  {
    return (
      EngineUtil.getRepresentedType(fieldId, engine) === 'string' &&
      EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
    );
  }

  public shortSummary(meta: NodeOptionsType<typeof TYPECODE>)
  {
    const names = meta.newFieldKeyPaths.map((value) => value.last());
    return `Split on ${meta.delimiter} into ${names.toJS()}`;
  }
}

export const SplitTransformationInfo = new SplitTransformationInfoC();

function splitHelper(el: any, opts: NodeOptionsType<TransformationNodeType.SplitNode>): string[]
{
  let split: string[];
  if (typeof opts.delimiter === 'number')
  {
    split = [
      (el as string).slice(0, opts.delimiter as number),
      (el as string).slice(opts.delimiter as number),
    ];
  }
  else if (opts.regex === true)
  {
    split = (el as string).split(RegExp(opts.delimiter as string));
  }
  else
  {
    split = (el as string).split(opts.delimiter as string);
  }
  return split;
}
