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

import { List } from 'immutable';

import { visitHelper } from 'shared/transformations/TransformationEngineNodeVisitor';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import TransformationVisitError from 'shared/transformations/TransformationVisitError';
import TransformationVisitResult from 'shared/transformations/TransformationVisitResult';
import { KeyPath } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';
import TransformationNode from './TransformationNode';

import * as _ from 'lodash';

export default class GroupByTransformationNode extends TransformationNode
{
  public typeCode = TransformationNodeType.GroupByNode;

  public transform(doc: object)
  {
    const opts = this.meta as NodeOptionsType<TransformationNodeType.GroupByNode>;

    const mapper: {
      [k: string]: KeyPath,
    } = {};

    const outputs: {
      [k: string]: object[],
    } = {};

    for (let i = 0; i < opts.groupValues.length; i++)
    {
      mapper[opts.groupValues[i]] = opts.newFieldKeyPaths.get(i);
      outputs[opts.groupValues[i]] = [];
    }

    this.fields.forEach((field) =>
    {
      const el = yadeep.get(doc, field);
      if (Array.isArray(el))
      {
        // let count: number = 0;
        for (let i: number = 0; i < el.length; i++)
        {
          const objToGroup = el[i];
          const groupValue = objToGroup[opts.subkey];
          if (outputs[groupValue] !== undefined)
          {
            outputs[groupValue].push(_.cloneDeep(objToGroup));
          }
        }
        for (const key of Object.keys(mapper))
        {
          const kpi = mapper[key];
          const arr = outputs[key];
          yadeep.set(doc, kpi, arr, { create: true });
        }
      }
      else
      {
        return {
          errors: [
            {
              message: 'Attempted to group on a non-array (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }
}
