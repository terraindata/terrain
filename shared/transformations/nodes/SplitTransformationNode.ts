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

import * as _ from 'lodash';

import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeInfo from 'shared/transformations/TransformationNodeInfo';
import EngineUtil from 'shared/transformations/util/EngineUtil';

import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';

import ForkTransformationType, { OutputField } from 'shared/transformations/types/ForkTransformationType';

const TYPECODE = TransformationNodeType.SplitNode;

export class SplitTransformationNode extends ForkTransformationType
{
  public readonly typeCode = TYPECODE;
  public readonly acceptedType = 'string';

  public split(el: string): OutputField[]
  {
    const opts = this.meta as NodeOptionsType<typeof TYPECODE>;

    const expectedSize = opts.newFieldKeyPaths.size;
    const split = trimHelper(splitHelper(el, opts, expectedSize), expectedSize);
    const outputFields = [];

    for (let i = 0; i < opts.newFieldKeyPaths.size; i++)
    {
      const value = split[i];
      outputFields.push({
        value,
        field: i,
      });
    }
    return outputFields;
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

function trimHelper(splits: string[], size: number, defaultValue = ''): string[]
{
  const newSplits = splits.slice();
  for (let i = newSplits.length; i < size; i++)
  {
    newSplits[i] = defaultValue;
  }
  return newSplits;
}

function splitHelper(el: string, opts: NodeOptionsType<TransformationNodeType.SplitNode>, size: number)
{
  let split: string[] = [];

  if (typeof opts.delimiter === 'number')
  {
    split = [
      (el as string).slice(0, opts.delimiter as number),
      (el as string).slice(opts.delimiter as number),
    ];
  }
  else
  {
    const searcher = opts.regex ? RegExp(opts.delimiter) : RegExp(_.escapeRegExp(opts.delimiter));
    let str = el;
    let i;
    for (i = 0; i < size - 1; i++)
    {
      const match = str.match(searcher);
      if (match === null)
      {
        break;
      }
      else
      {
        const matchPosition = match.index;
        const matchLength = match[0].length;
        const newValue = str.slice(0, matchPosition);
        str = str.slice(matchPosition + matchLength);
        split[i] = newValue;
      }
    }
    split[i] = str;
  }
  return split;
}
