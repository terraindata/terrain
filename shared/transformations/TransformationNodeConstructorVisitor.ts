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
import * as _ from 'lodash';
import { KeyPath, WayPoint } from '../util/KeyPath';
import * as yadeep from '../util/yadeep';

import TransformationNode from 'shared/transformations/TransformationNode';
import TransformationNodeType, { CommonTransformationOptions, NodeOptionsType } from './TransformationNodeType';
import TransformationNodeVisitor, { VisitorLookupMap } from './TransformationNodeVisitor';
import TransformationRegistry from './TransformationRegistry';
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';

export interface NodeArgs
{
  id: number;
  fields: List<{ path: KeyPath, id: number }>;
  meta: object;
}

export interface SerializedNodeArgs
{
  id: number;
  fields: Array<{ path: WayPoint[], id: number }>;
  meta: object;
}

export type ConstructionArgs = (NodeArgs | SerializedNodeArgs) & {
  deserialize?: boolean;
};

export default class ConstructorVisitor
  extends TransformationNodeVisitor<TransformationNode, ConstructionArgs>
{
  public visitorLookup: VisitorLookupMap<TransformationNode, ConstructionArgs> = {};

  public deserialize(args: SerializedNodeArgs): NodeArgs
  {
    const fields = List(args.fields.map((item) => {
      return {
        id: item.id,
        path: List(item.path),
      };
    }));

    const meta = _.cloneDeep(args.meta as CommonTransformationOptions);
    if (meta.newFieldKeyPaths !== undefined)
    {
      meta.newFieldKeyPaths = List((meta.newFieldKeyPaths as any as WayPoint[][]).map((kp) => List(kp)));
    }

    return {
      id: args.id,
      fields,
      meta,
    };
  }

  public visitDefault(type: TransformationNodeType, node: undefined, args: ConstructionArgs)
  {
    const ctor = TransformationRegistry.getType(type);

    const { id, fields, meta } = args.deserialize ?
      this.deserialize(args as SerializedNodeArgs)
      :
      args as NodeArgs;

    return new ctor(id, fields, meta);
  }
}
