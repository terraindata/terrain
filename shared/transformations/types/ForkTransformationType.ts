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

import { ETLFieldTypes, FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeInfo from 'shared/transformations/TransformationNodeInfo';
import EngineUtil from 'shared/transformations/util/EngineUtil';

import { List } from 'immutable';

import Topology from 'shared/transformations/util/TopologyUtil';
import TransformationNode from 'shared/transformations/TransformationNode';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import TransformationVisitError from 'shared/transformations/TransformationVisitError';
import TransformationVisitResult from 'shared/transformations/TransformationVisitResult';
import { KeyPath } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

export interface OutputField
{
  field: number;
  value: any;
}

/*
 *  Fork Transformations produce multiple synthetic field out of a single input field
 */
export default abstract class ForkTransformationType extends TransformationNode
{
  // override this to operate on null values
  public readonly skipNulls: boolean = true;

  public abstract split(val: any): OutputField[];

  public validate()
  {
    const opts = this.meta as NodeOptionsType<any>;
    if (opts.newFieldKeyPaths === undefined || opts.newFieldKeyPaths.size === 0)
    {
      return 'Transformation has no newFieldKeyPaths';
    }
    let valid = true;
    this.fields.forEach((field) =>
    {
      opts.newFieldKeyPaths.forEach((nfkp) =>
      {
        if (valid && !Topology.areFieldsLocal(field, nfkp))
        {
          valid = false;
        }
      });
    });
    if (!valid)
    {
      return 'Fields and newFieldKeyPaths are not local';
    }

    return super.validate();
  }

  protected transformDocument(doc: object): TransformationVisitResult
  {
    const errors = [];
    const opts = this.meta as NodeOptionsType<any>;

    const field = this.fields.get(0);
    const outputFields: List<KeyPath> = opts.newFieldKeyPaths;
    const matchCacheFn = _.memoize((newFieldIndex: number) => {
      return Topology.createOneToOneMatcher(field, outputFields.get(newFieldIndex));
    });
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

      const matcher = Topology.createLocalMatcher(field, location);
      if (matcher === null)
      {
        errors.push(`Error in ${this.typeCode}: Field and Match location are inconsistent`);
        return;
      }

      const newFields = this.split(value);

      for (const newField of newFields)
      {
        const newKP = matchCacheFn(newField.field)(location);
        yadeep.set(doc, newKP, newField.value, { create: true });
      }
    }
    // });

    return {
      document: doc,
      errors,
    } as TransformationVisitResult;
  }
}
