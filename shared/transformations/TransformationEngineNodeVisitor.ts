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

// import * as winston from 'winston';
import * as Immutable from 'immutable';
import createKeccakHash = require('keccak');

import HashTransformationNode from 'shared/transformations/nodes/HashTransformationNode';
import { KeyPath } from '../util/KeyPath';
import * as yadeep from '../util/yadeep';
import CastTransformationNode from './nodes/CastTransformationNode';
import DuplicateTransformationNode from './nodes/DuplicateTransformationNode';
import FilterTransformationNode from './nodes/FilterTransformationNode';
import InsertTransformationNode from './nodes/InsertTransformationNode';
import JoinTransformationNode from './nodes/JoinTransformationNode';
import SplitTransformationNode from './nodes/SplitTransformationNode';
import SubstringTransformationNode from './nodes/SubstringTransformationNode';
import TransformationNode from './nodes/TransformationNode';
import UppercaseTransformationNode from './nodes/UppercaseTransformationNode';
import TransformationNodeType, { NodeOptionsType } from './TransformationNodeType';
import TransformationNodeVisitor from './TransformationNodeVisitor';
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';

export default class TransformationEngineNodeVisitor extends TransformationNodeVisitor
{
  private static splitHelper(el: any, opts: NodeOptionsType<TransformationNodeType.SplitNode>): string[]
  {
    let split: string[];
    if (typeof opts.delimiter === 'number')
    {
      split = [
        (el as string).slice(0, opts.delimiter as number),
        (el as string).slice(opts.delimiter as number),
      ];
    }
    else
    {
      split = (el as string).split(opts.delimiter as string | RegExp);
    }
    return split;
  }

  public applyTransformationNode(node: TransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    if (node === undefined)
    {
      return {} as TransformationVisitResult;
    }

    return node.accept(this, doc, options);
  }

  public visitDefault(node: TransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public visitDuplicateNode(node: DuplicateTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.DuplicateNode>;
    node.fields.forEach((field) =>
    {
      const el: any = yadeep.get(doc, field);
      yadeep.set(doc, opts.newFieldKeyPaths.get(0), el, { create: true });
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitFilterNode(node: FilterTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    // TODO
    return this.visitDefault(node, doc, options);
  }

  public visitJoinNode(node: JoinTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.JoinNode>;
    let joined: string;
    node.fields.forEach((field) =>
    {
      const el: any = yadeep.get(doc, field);
      if (typeof el !== 'string')
      {
        return {
          errors: [
            {
              message: 'Attempted to join using a non-string field (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }

      if (joined === undefined)
      {
        joined = el as string;
      }
      else
      {
        joined = joined + opts.delimiter + (el as string);
      }
    });
    yadeep.set(doc, opts.newFieldKeyPaths.get(0), joined, { create: true });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitInsertNode(node: InsertTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.InsertNode>;
    node.fields.forEach((field) =>
    {
      const el: any = yadeep.get(doc, field);
      if (typeof el !== 'string')
      {
        return {
          errors: [
            {
              message: 'Attempted to insert in a non-string field (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }

      let at: number = 0;
      if (typeof opts['at'] === 'number')
      {
        at = opts['at'];
        if (opts['at'] < 0)
        {
          at += el.length + 1;
        }
      }
      else if (opts['at'] === undefined)
      {
        at = el.length;
      }
      else
      {
        return {
          errors: [
            {
              message: 'Insert node: "at" property is invalid',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }

      let value;
      if (Immutable.Iterable.isIterable(opts['value']) || opts['value'] instanceof KeyPath)
      {
        value = yadeep.get(doc, opts['value'] as KeyPath);
        if (typeof value !== 'string')
        {
          return {
            errors: [
              {
                message: 'Insert: field denoted by "value" keypath is not a string',
              } as TransformationVisitError,
            ],
          } as TransformationVisitResult;
        }
      }
      else if (typeof opts['value'] === 'string')
      {
        value = opts['value'];
      }
      else
      {
        return {
          errors: [
            {
              message: 'Insert: "value" property is missing or invalid',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }

      // Currently assumes a single from and length for all fieldIDs
      yadeep.set(doc, field, el.slice(0, at) + String(value) + el.slice(at), { create: true });
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitSplitNode(node: SplitTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.SplitNode>;

    if (node.fields.size > 1)
    {
      return {
        errors: [
          {
            message: 'Attempted to split multiple fields at once (this is not supported)',
          } as TransformationVisitError,
        ],
      } as TransformationVisitResult;
    }

    node.fields.forEach((field) =>
    {
      const el: any = yadeep.get(doc, field);
      let split: string[];
      if (el.constructor === Array)
      {
        for (let i: number = 0; i < Object.keys(el).length; i++)
        {
          let kpi: KeyPath = field;
          if (kpi.contains('*'))
          {
            kpi = kpi.set(kpi.indexOf('*'), i.toString());
          }
          else
          {
            kpi = kpi.push(i.toString());
          }

          split = TransformationEngineNodeVisitor.splitHelper(yadeep.get(doc, kpi), opts);

          for (let j: number = 0; j < split.length; j++)
          {
            let newkpi: KeyPath = opts.newFieldKeyPaths.get(j);
            if (newkpi.contains('*'))
            {
              newkpi = newkpi.set(newkpi.indexOf('*'), i.toString());
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

      split = TransformationEngineNodeVisitor.splitHelper(el, opts);

      if (split.length !== opts.newFieldKeyPaths.size)
      {
        return {
          errors: [
            {
              message: 'Number of split field names does not match number of split elements',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }

      for (let i: number = 0; i < split.length; i++)
      {
        yadeep.set(doc, opts.newFieldKeyPaths.get(i), split[i], { create: true });
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitSubstringNode(node: SubstringTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.SubstringNode>;
    node.fields.forEach((field) =>
    {
      const el: any = yadeep.get(doc, field);
      if (typeof el !== 'string')
      {
        return {
          errors: [
            {
              message: 'Attempted to take a substring of a non-string field (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      if (!opts.hasOwnProperty('from') || opts['from'] < 0)
      {
        return {
          errors: [
            {
              message: 'Substring node: "from" property is missing or invalid',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      if (!opts.hasOwnProperty('length') || opts['length'] < 0)
      {
        return {
          errors: [
            {
              message: 'Substring node: "length" property is missing or invalid',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      // Currently assumes a single from and length for all fieldIDs
      yadeep.set(doc, field, el.substr(opts['from'], opts['length']), { create: true });
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitUppercaseNode(node: UppercaseTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    node.fields.forEach((field) =>
    {
      const el = yadeep.get(doc, field);
      if (Array.isArray(el))
      {
        for (let i: number = 0; i < el.length; i++)
        {
          let kpi: KeyPath = field;
          if (kpi.contains('*'))
          {
            kpi = kpi.set(kpi.indexOf('*'), i.toString());
          }
          else
          {
            kpi = kpi.push(i.toString());
          }
          yadeep.set(doc, kpi, yadeep.get(doc, kpi).toUpperCase());
        }
      }
      else if (typeof el !== 'string')
      {
        return {
          errors: [
            {
              message: 'Attempted to capitalize a non-string field (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      else
      {
        yadeep.set(doc, field, el.toUpperCase());
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitCastNode(node: CastTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.CastNode>;

    node.fields.forEach((field: KeyPath) =>
    {
      const originalElement: any = yadeep.get(doc, field);

      if (typeof originalElement === opts.toTypename || originalElement.constructor === Array && opts.toTypename === 'array')
      {
        return;
      }

      let newFields: KeyPath[] = [field];

      if (Array.isArray(originalElement))
      {
        newFields = [];
        for (let i: number = 0; i < originalElement.length; i++)
        {
          let kpi: KeyPath = field;
          if (kpi.contains('*'))
          {
            kpi = kpi.set(kpi.indexOf('*'), i.toString());
          }
          else
          {
            kpi = kpi.push(i.toString());
          }
          newFields.push(kpi);
        }
      }

      newFields.forEach((f: KeyPath) =>
      {
        const el: any = yadeep.get(doc, f);

        if (typeof el === opts.toTypename || el.constructor === Array && opts.toTypename === 'array')
        {
          return;
        }

        switch (opts.toTypename)
        {
          case 'string': {
            if (typeof el === 'object')
            {
              yadeep.set(doc, f, JSON.stringify(el));
            }
            else
            {
              yadeep.set(doc, f, el.toString());
            }
            break;
          }
          case 'number': {
            yadeep.set(doc, f, Number(el));
            break;
          }
          case 'boolean': {
            if (typeof el === 'string')
            {
              yadeep.set(doc, f, el.toLowerCase() === 'true');
            }
            else
            {
              yadeep.set(doc, f, Boolean(el));
            }
            break;
          }
          case 'object': {
            yadeep.set(doc, f, {});
            break;
          }
          case 'array': {
            yadeep.set(doc, f, []);
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

      });
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitHashNode(node: HashTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    node.fields.forEach((field) =>
    {
      const el = yadeep.get(doc, field);
      if (Array.isArray(el))
      {
        for (let i: number = 0; i < el.length; i++)
        {
          let kpi: KeyPath = field;
          if (kpi.contains('*'))
          {
            kpi = kpi.set(kpi.indexOf('*'), i.toString());
          }
          else
          {
            kpi = kpi.push(i.toString());
          }
          yadeep.set(doc, kpi, createKeccakHash('keccak256').update(yadeep.get(doc, kpi)).digest('hex'));
        }
      }
      else if (typeof el !== 'string')
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
        yadeep.set(doc, field, createKeccakHash('keccak256').update(el).digest('hex'));
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitArraySumNode(node: HashTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.ArraySumNode>;

    node.fields.forEach((field) =>
    {
      const el = yadeep.get(doc, field);
      if (Array.isArray(el))
      {
        let sum: number = 0;
        for (let i: number = 0; i < el.length; i++)
        {
          let kpi: KeyPath = field;
          if (kpi.contains('*'))
          {
            kpi = kpi.set(kpi.indexOf('*'), i.toString());
          }
          else
          {
            kpi = kpi.push(i.toString());
          }
          sum += yadeep.get(doc, kpi);
        }
        yadeep.set(doc, opts.newFieldKeyPaths.get(0), sum, { create: true });
      }
      else
      {
        return {
          errors: [
            {
              message: 'Attempted to sum a non-array (this is not supported)',
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
