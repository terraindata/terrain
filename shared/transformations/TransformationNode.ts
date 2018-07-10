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

import { KeyPath } from './../util/KeyPath';

import TransformationNodeType from './TransformationNodeType';
import TransformationNodeVisitor from './TransformationNodeVisitor';
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';

export default abstract class TransformationNode
{
  public id: number;
  public abstract typeCode: TransformationNodeType;
  // public fields: List<KeyPath>;
  // public fieldIds: List<number>;
  public fields: List<{ path: KeyPath, id: number }>;
  public meta: object;

  // override this to only operate on a certain js type
  public readonly acceptedType: string;

  public constructor(id: number, fields: List<{path: KeyPath, id: number}>, options: object = {})
  {
    this.id = id;
    this.fields = fields;
    this.meta = options;
  }

  // override to provide static validation
  public validate(): string | boolean
  {
    return true;
  }

  // override to customize entire transformation behavior
  public transform(doc: object): TransformationVisitResult
  {
    try
    {
      const valid = this.validate();
      if (typeof valid === 'string')
      {
        return {
          errors: [
            {
              message: `${this.typeCode} is malformed: ${String(valid)}`,
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      const result = this.transformDocument(doc);
      if (result === undefined)
      {
        return {
          document: doc,
        };
      }
      else
      {
        return result;
      }
    }
    catch (e)
    {
      return {
        errors: [
          {
            message: `Error in ${this.typeCode}: String(e)`,
          } as TransformationVisitError,
        ],
      } as TransformationVisitResult;
    }
  }

  public accept<R, P>(visitor: TransformationNodeVisitor<R, P>, args: P): R
  {
    return visitor.visit(this.typeCode, this, args);
  }

  // override to specify document transformation behavior
  protected transformDocument(doc: object): TransformationVisitResult | undefined
  {
    return {
      document: doc,
    };
  }

  protected checkType(value: any): boolean
  {
    if (this.acceptedType !== undefined)
    {
      if (this.acceptedType === 'array')
      {
        return Array.isArray(value);
      }
      else
      {
        return typeof value === this.acceptedType;
      }
    }
    return true;
  }
}
