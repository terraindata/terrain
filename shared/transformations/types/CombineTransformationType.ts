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

import { FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeInfo from 'shared/transformations/TransformationNodeInfo';

import { List } from 'immutable';
import * as _ from 'lodash';

import TransformationNode from 'shared/transformations/TransformationNode';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import Topology from 'shared/transformations/util/TopologyUtil';
import TransformationVisitError from 'shared/transformations/visitors/TransformationVisitError';
import TransformationVisitResult from 'shared/transformations/visitors/TransformationVisitResult';
import { KeyPath } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

export interface InputField
{
  field: KeyPath;
  matchField: KeyPath;
  value: any;
}

/*
 *  Combine Transformations produce a synthetic field out of multiple input fields
 */
export default abstract class CombineTransformationType extends TransformationNode
{
  // override this to operate on null values
  public readonly skipNulls: boolean = true;

  public abstract combine(vals: any[]): any;

  // todo make validate check to make sure all the input fields are local to eachother

  // override this to customize how the values that get passed to combine appear
  // values in the array should always match the order of this.fields; however there may be values missing
  protected processMatchSet(matchSet: InputField[]): any[]
  {
    return matchSet.map((inputField) => inputField.value);
  }

  protected transformDocument(doc: object): TransformationVisitResult
  {
    const errors = [];
    const matchSets: {
      [k: string]: InputField[],
    } = {};

    this.fields.forEach((fieldObj) =>
    {
      const field = fieldObj.path;
      for (const match of yadeep.search(doc, field))
      {
        const { value, location } = match;
        if (value === null && this.skipNulls)
        {
          return;
        }
        if (!this.checkType(value))
        {
          errors.push(`Error in ${this.typeCode}: Expected type ${this.acceptedType}. Got ${typeof value}.`);
          return;
        }

        const hash = hashMatchToLocale(field, location);
        const inputs: InputField[] = _.get(matchSets, hash, []);
        inputs.push({
          field,
          value,
          matchField: location,
        });
        matchSets[hash] = inputs;
      }
    });
    // each item in matchSets is guaranteed to be at least length 1

    const opts = this.meta as NodeOptionsType<any>;
    const newFieldKeyPath = opts.newFieldKeyPaths.get(0);

    const matchFn = Topology.createBasePathMatcher(this.fields.get(0).path, newFieldKeyPath);

    for (const locale of Object.keys(matchSets))
    {
      const matchSet = matchSets[locale];
      const newValue = this.combine(this.processMatchSet(matchSet));

      const destKP = matchFn(matchSet[0].matchField);
      yadeep.setIn(doc, destKP, newValue);
    }

    return {
      document: doc,
      errors,
    } as TransformationVisitResult;
  }
}

function hashMatchToLocale(searchKP: KeyPath, matchKP: KeyPath): string
{
  let hash = '';
  if (searchKP.size !== matchKP.size)
  {
    return null;
  }
  for (let i = 0; i < searchKP.size; i++)
  {
    const searchIndex = searchKP.get(i);
    const matchIndex = matchKP.get(i);
    if (searchIndex !== matchIndex)
    {
      if (typeof searchIndex !== 'number' || typeof matchIndex !== 'number')
      {
        return null;
      }
      else
      {
        hash = `.${i}:${matchIndex}`;
      }
    }
  }
  return hash;
}
