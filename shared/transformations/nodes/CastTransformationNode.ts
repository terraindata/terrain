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

import * as yadeep from 'shared/util/yadeep';
import { KeyPath } from 'shared/util/KeyPath';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import TransformationNode from './TransformationNode';
import { visitHelper } from 'shared/transformations/TransformationEngineNodeVisitor';
import TransformationVisitError from 'shared/transformations/TransformationVisitError';
import TransformationVisitResult from 'shared/transformations/TransformationVisitResult';

import dateFormat = require('date-format');

export default class CastTransformationNode extends TransformationNode
{
  public typeCode = TransformationNodeType.CastNode;

  public transform(doc: object)
  {
    const opts = this.meta as NodeOptionsType<TransformationNodeType.CastNode>;

    return visitHelper(this.fields, doc, { document: doc }, (kp, el) =>
    {
      try
      {
        if (typeof el === opts.toTypename || el == null || (el.constructor === Array && opts.toTypename === 'array'))
        {
          return undefined;
        }

        switch (opts.toTypename)
        {
          case 'string': {
            if (typeof el === 'object')
            {
              yadeep.set(doc, kp, JSON.stringify(el));
            }
            else
            {
              yadeep.set(doc, kp, el.toString());
            }
            break;
          }
          case 'number': {
            yadeep.set(doc, kp, Number(el));
            break;
          }
          case 'boolean': {
            if (typeof el === 'string')
            {
              yadeep.set(doc, kp, el.toLowerCase() === 'true');
            }
            else
            {
              yadeep.set(doc, kp, Boolean(el));
            }
            break;
          }
          case 'object': {
            if (typeof el === 'string')
            {
              try
              {
                const parsed = JSON.parse(el);
                yadeep.set(doc, kp, parsed);
              }
              catch (e)
              {
                yadeep.set(doc, kp, {});
              }
            }
            else
            {
              yadeep.set(doc, kp, {});
            }
            break;
          }
          case 'array': {
            yadeep.set(doc, kp, []);
            break;
          }
          case 'date': {
            if (opts.format === 'ISOstring')
            {
              yadeep.set(doc, kp, new Date(el).toISOString());
            }
            else if (opts.format === 'MMDDYYYY')
            {
              yadeep.set(doc, kp, dateFormat('MM/dd/yyyy', new Date(el)));
            }
            break;
          }
          default: {
            return {
              errors: [
                {
                  message: `Attempted to cast to an unsupported type ${opts.toTypename}`,
                } as TransformationVisitError,
              ],
            } as TransformationVisitResult;
          }
        }
      }
      catch (ex)
      {
        yadeep.set(doc, kp, null);
      }
    }, (kp, el) =>
      {
        return !(typeof el === opts.toTypename || el == null || (el.constructor === Array && opts.toTypename === 'array'));
      });
  }
}
