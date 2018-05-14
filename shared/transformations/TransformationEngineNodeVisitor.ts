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
import aesjs = require('aes-js');
import * as Immutable from 'immutable';
import { keccak256 } from 'js-sha3';

import {diff} from 'semver';
import { KeyPath } from '../util/KeyPath';
import * as yadeep from '../util/yadeep';
import AddTransformationNode from './nodes/AddTransformationNode';
import ArrayCountTransformationNode from './nodes/ArrayCountTransformationNode';
import ArraySumTransformationNode from './nodes/ArraySumTransformationNode';
import CastTransformationNode from './nodes/CastTransformationNode';
import DecryptTransformationNode from './nodes/DecryptTransformationNode';
import DifferenceTransformationNode from './nodes/DifferenceTransformationNode';
import DivideTransformationNode from './nodes/DivideTransformationNode';
import DuplicateTransformationNode from './nodes/DuplicateTransformationNode';
import EncryptTransformationNode from './nodes/EncryptTransformationNode';
import FilterTransformationNode from './nodes/FilterTransformationNode';
import FindReplaceTransformationNode from './nodes/FindReplaceTransformationNode';
import HashTransformationNode from './nodes/HashTransformationNode';
import InsertTransformationNode from './nodes/InsertTransformationNode';
import JoinTransformationNode from './nodes/JoinTransformationNode';
import MultiplyTransformationNode from './nodes/MultiplyTransformationNode';
import ProductTransformationNode from './nodes/ProductTransformationNode';
import QuotientTransformationNode from './nodes/QuotientTransformationNode';
import SetIfTransformationNode from './nodes/SetIfTransformationNode';
import SplitTransformationNode from './nodes/SplitTransformationNode';
import SubstringTransformationNode from './nodes/SubstringTransformationNode';
import SubtractTransformationNode from './nodes/SubtractTransformationNode';
import SumTransformationNode from './nodes/SumTransformationNode';
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

  private static hashHelper(toHash: string, salt: string): string
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
      if (opts.newFieldKeyPaths.get(0).contains('*'))
      {
        // assume el length is same as target length
        for (let i: number = 0; i < el.length; i++)
        {
          const kpi: KeyPath = opts.newFieldKeyPaths.get(0).set(
            opts.newFieldKeyPaths.get(0).indexOf('*'), i.toString());
          yadeep.set(doc, kpi, el[i], { create: true });
        }
      } else
      {
        yadeep.set(doc, opts.newFieldKeyPaths.get(0), el, { create: true });
      }
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

      if (
        originalElement == null
        || typeof originalElement === opts.toTypename
        || (originalElement.constructor === Array && opts.toTypename === 'array')
      )
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

        if (typeof el === opts.toTypename || el == null || el.constructor === Array && opts.toTypename === 'array')
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
            if (typeof el === 'string')
            {
              try
              {
                const parsed = JSON.parse(el);
                yadeep.set(doc, f, parsed);
              }
              catch (e)
              {
                yadeep.set(doc, f, {});
              }
            }
            else
            {
              yadeep.set(doc, f, {});
            }
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
    const opts = node.meta as NodeOptionsType<TransformationNodeType.HashNode>;

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
          const toHash = yadeep.get(doc, kpi);
          yadeep.set(doc, kpi, TransformationEngineNodeVisitor.hashHelper(toHash, opts.salt));
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
        yadeep.set(doc, field, TransformationEngineNodeVisitor.hashHelper(el, opts.salt));
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitAddNode(node: AddTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.AddNode>;

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
          yadeep.set(doc, kpi, (yadeep.get(doc, kpi) as number) + opts.shift);
        }
      }
      else if (typeof el !== 'number')
      {
        return {
          errors: [
            {
              message: 'Attempted to add to a non-numeric (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      else
      {
        yadeep.set(doc, field, el + opts.shift);
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitSubtractNode(node: SubtractTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.SubtractNode>;

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
          yadeep.set(doc, kpi, yadeep.get(doc, kpi) - opts.shift);
        }
      }
      else if (typeof el !== 'number')
      {
        return {
          errors: [
            {
              message: 'Attempted to subtract from a non-numeric (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      else
      {
        yadeep.set(doc, field, el - opts.shift);
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitMultiplyNode(node: MultiplyTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.MultiplyNode>;

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
          yadeep.set(doc, kpi, yadeep.get(doc, kpi) * opts.factor);
        }
      }
      else if (typeof el !== 'number')
      {
        return {
          errors: [
            {
              message: 'Attempted to multiply a non-numeric (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      else
      {
        yadeep.set(doc, field, el * opts.factor);
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitDivideNode(node: DivideTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.DivideNode>;

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
          yadeep.set(doc, kpi, yadeep.get(doc, kpi) / opts.factor);
        }
      }
      else if (typeof el !== 'number')
      {
        return {
          errors: [
            {
              message: 'Attempted to divide a non-numeric (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      else
      {
        yadeep.set(doc, field, el / opts.factor);
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitSetIfNode(node: SetIfTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const setIfHelper = (o: NodeOptionsType<TransformationNodeType.SetIfNode>, e: any) =>
    {
      if (o.filterNaN)
      {
        return isNaN(e);
      }
      else if (o.filterUndefined)
      {
        return e === undefined;
      }
      else if (o.filterNull)
      {
        return e === null;
      }
      else if (o.filterStringNull)
      {
        return e === 'null';
      }
      else if (o.filterValue !== undefined)
      {
        return e === o.filterValue;
      }

      return false;
    };

    const opts = node.meta as NodeOptionsType<TransformationNodeType.SetIfNode>;

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

          const eli = yadeep.get(doc, kpi);
          if (setIfHelper(opts, eli))
          {
            yadeep.set(doc, kpi, opts.newValue, { create: true });
          }
        }
      }
      else
      {
        if (setIfHelper(opts, el))
        {
          yadeep.set(doc, field, opts.newValue, { create: true });
        }
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitFindReplaceNode(node: FindReplaceTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.FindReplaceNode>;

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

          if (opts.regex)
          {
            yadeep.set(doc, kpi, yadeep.get(doc, kpi).replace(new RegExp(opts.find, 'g'), opts.replace));
          }
          else
          {
            yadeep.set(doc, kpi, yadeep.get(doc, kpi).split(opts.find).join(opts.replace));
          }
        }
      }
      else if (typeof el !== 'string')
      {
        return {
          errors: [
            {
              message: 'Attempted to do a find/replace on a non-string field (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      else
      {
        if (opts.regex)
        {
          yadeep.set(doc, field, el.replace(new RegExp(opts.find, 'g'), opts.replace));
        }
        else
        {
          yadeep.set(doc, field, el.split(opts.find).join(opts.replace));
        }
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitArraySumNode(node: ArraySumTransformationNode, doc: object, options: object = {}): TransformationVisitResult
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

  public visitArrayCountNode(node: ArrayCountTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.ArrayCountNode>;

    node.fields.forEach((field) =>
    {
      const el = yadeep.get(doc, field);
      if (Array.isArray(el))
      {
        let count: number = 0;
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
          count++;
        }
        yadeep.set(doc, opts.newFieldKeyPaths.get(0), count, { create: true });
      }
      else
      {
        return {
          errors: [
            {
              message: 'Attempted to count a non-array (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

    public visitProductNode(node: ProductTransformationNode, doc: object, options: object = {}): TransformationVisitResult
    {
        const opts = node.meta as NodeOptionsType<TransformationNodeType.ProductNode>;

        let product: number = 0;
        let initialized: boolean = false;

        node.fields.forEach((field) =>
        {
            const el = yadeep.get(doc, field);
            if (typeof el === 'number')
            {
                if (initialized)
                {
                    product *= el;
                }
                else
                {
                    product = el;
                    initialized = true;
                }
            }
            else
            {
                return {
                    errors: [
                        {
                            message: 'Attempted to compute a product using non-numeric fields (this is not supported)',
                        } as TransformationVisitError,
                    ],
                } as TransformationVisitResult;
            }
        });

        yadeep.set(doc, opts.newFieldKeyPaths.get(0), product, { create: true });

        return {
            document: doc,
        } as TransformationVisitResult;
    }

    public visitQuotientNode(node: QuotientTransformationNode, doc: object, options: object = {}): TransformationVisitResult
    {
        const opts = node.meta as NodeOptionsType<TransformationNodeType.QuotientNode>;

        let quotient: number = 0;
        let initialized: boolean = false;

        node.fields.forEach((field) =>
        {
            const el = yadeep.get(doc, field);
            if (typeof el === 'number')
            {
                if (initialized)
                {
                    quotient /= el;
                }
                else
                {
                    quotient = el;
                    initialized = true;
                }
            }
            else
            {
                return {
                    errors: [
                        {
                            message: 'Attempted to compute a quotient using non-numeric fields (this is not supported)',
                        } as TransformationVisitError,
                    ],
                } as TransformationVisitResult;
            }
        });

        yadeep.set(doc, opts.newFieldKeyPaths.get(0), quotient, { create: true });

        return {
            document: doc,
        } as TransformationVisitResult;
    }

    public visitSumNode(node: SumTransformationNode, doc: object, options: object = {}): TransformationVisitResult
    {
        const opts = node.meta as NodeOptionsType<TransformationNodeType.SumNode>;

        let sum: number = 0;

        node.fields.forEach((field) =>
        {
            const el = yadeep.get(doc, field);
            if (typeof el === 'number')
            {
                sum += el;
            }
            else
            {
                return {
                    errors: [
                        {
                            message: 'Attempted to compute a sum using non-numeric fields (this is not supported)',
                        } as TransformationVisitError,
                    ],
                } as TransformationVisitResult;
            }
        });

        yadeep.set(doc, opts.newFieldKeyPaths.get(0), sum, { create: true });

        return {
            document: doc,
        } as TransformationVisitResult;
    }

    public visitDifferenceNode(node: DifferenceTransformationNode, doc: object, options: object = {}): TransformationVisitResult
    {
        const opts = node.meta as NodeOptionsType<TransformationNodeType.DifferenceNode>;

        let difference: number = 0;
        let initialized: boolean = false;

        node.fields.forEach((field) =>
        {
            const el = yadeep.get(doc, field);
            if (typeof el === 'number')
            {
                if (initialized)
                {
                    difference -= el;
                }
                else
                {
                    difference = el;
                    initialized = true;
                }
            }
            else
            {
                return {
                    errors: [
                        {
                            message: 'Attempted to compute a difference using non-numeric fields (this is not supported)',
                        } as TransformationVisitError,
                    ],
                } as TransformationVisitResult;
            }
        });

        yadeep.set(doc, opts.newFieldKeyPaths.get(0), difference, { create: true });

        return {
            document: doc,
        } as TransformationVisitResult;
    }

    public visitEncryptNode(node: EncryptTransformationNode, doc: object, options: object = {}): TransformationVisitResult
    {
        const opts = node.meta as NodeOptionsType<TransformationNodeType.EncryptNode>;

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
                    yadeep.set(doc, kpi, this.encryptHelper(yadeep.get(doc, kpi), node.key));
                }
            }
            else if (typeof el !== 'string')
            {
                return {
                    errors: [
                        {
                            message: 'Attempted to encrypt a non-string (this is not supported)',
                        } as TransformationVisitError,
                    ],
                } as TransformationVisitResult;
            }
            else
            {
                yadeep.set(doc, field, this.encryptHelper(el, node.key));
            }
        });

        return {
            document: doc,
        } as TransformationVisitResult;
    }

    public visitDecryptNode(node: DecryptTransformationNode, doc: object, options: object = {}): TransformationVisitResult
    {
        const opts = node.meta as NodeOptionsType<TransformationNodeType.DecryptNode>;

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
                    yadeep.set(doc, kpi, this.decryptHelper(yadeep.get(doc, kpi), node.key));
                }
            }
            else if (typeof el !== 'string')
            {
                return {
                    errors: [
                        {
                            message: 'Attempted to decrypt a non-string (this is not supported)',
                        } as TransformationVisitError,
                    ],
                } as TransformationVisitResult;
            }
            else
            {
                yadeep.set(doc, field, this.decryptHelper(el, node.key));
            }
        });

        return {
            document: doc,
        } as TransformationVisitResult;
    }

    // use standard AES 128 decryption
    private decryptHelper(msg: string, key?: any): string
    {
            const msgBytes: any = aesjs.utils.hex.toBytes(msg);
            const aesCtr: any = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
            return aesjs.utils.utf8.fromBytes(aesCtr.decrypt(msgBytes));
    }

    // use standard AES 128 rencryption
    private encryptHelper(msg: string, key?: any): string
    {
            const msgBytes: any = aesjs.utils.utf8.toBytes(msg);
            const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
            return aesjs.utils.hex.fromBytes(aesCtr.encrypt(msgBytes));
    }
}
