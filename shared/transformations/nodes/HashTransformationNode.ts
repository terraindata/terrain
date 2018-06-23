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

import { keccak256 } from 'js-sha3';

function hashHelper(toHash: string, salt: string): string
{
  if (typeof toHash !== 'string')
  {
    throw new Error('Value to hash is not a string');
  }
  else if (typeof salt !== 'string')
  {
    throw new Error('Salt is not a string');
  }
  return keccak256.update(toHash + salt).hex();
}

export default class HashTransformationNode extends TransformationNode
{
  public typeCode = TransformationNodeType.HashNode;

  public transform(doc: object)
  {
    const opts = this.meta as NodeOptionsType<TransformationNodeType.HashNode>;

    return visitHelper(this.fields, doc, { document: doc }, (kp, el) =>
    {
      if (typeof el !== 'string')
      {
        return {
          errors: [
            {
              message: 'Attempted to hash a non-string field (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      else
      {
        yadeep.set(doc, kp, hashHelper(el, opts.salt));
      }
    });
  }
}
