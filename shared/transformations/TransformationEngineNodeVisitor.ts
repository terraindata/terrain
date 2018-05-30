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
import dateFormat = require('date-format');
import * as Immutable from 'immutable';
import isPrimitive = require('is-primitive');
import { keccak256 } from 'js-sha3';
import * as _ from 'lodash';

import { diff } from 'semver';
import Encryption, { Keys } from 'shared/encryption/Encryption';
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
import FilterArrayTransformationNode from './nodes/FilterArrayTransformationNode';
import FilterTransformationNode from './nodes/FilterTransformationNode';
import FindReplaceTransformationNode from './nodes/FindReplaceTransformationNode';
import GroupByTransformationNode from './nodes/GroupByTransformationNode';
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
import ZipcodeTransformationNode from './nodes/ZipcodeTransformationNode';
import TransformationNodeType, { NodeOptionsType } from './TransformationNodeType';
import TransformationNodeVisitor from './TransformationNodeVisitor';
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';

import { TransformationEngine } from 'shared/transformations/TransformationEngine';

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

  // use standard AES 128 decryption
  private static decryptHelper(msg: string, key?: any): string
  {
    return Encryption.decryptStatic(msg, Keys.Transformations);
  }

  // use standard AES 128 rencryption
  private static encryptHelper(msg: string, key?: any): string
  {
    return Encryption.encryptStatic(msg, Keys.Transformations);
  }

  private static zipcodeHelper(zipcode: string, opts: NodeOptionsType<TransformationNodeType.ZipcodeNode>)
  {
    const data = TransformationEngine.datastore.get('zips')[zipcode];
    if (!data)
    {
      return null;
    }
    switch (opts.format)
    {
      case 'city':
        return data.city;
      case 'state':
        return data.state;
      case 'citystate':
        return (data.city as string) + ', ' + (data.state as string);
      case 'type':
        return data.type;
      default:
        return data.loc;
    }
  }

  private static visitHelper(fields: List<KeyPath>, doc: object, defaultResult: TransformationVisitResult,
    cb: (kp: KeyPath, el: any) => TransformationVisitResult | void,
    shouldTransform: (kp: KeyPath, el: any) => boolean = (kp, el) => true): TransformationVisitResult
  {
    const reducedResult = fields.reduce((accumulator, field) =>
    {
      if (accumulator)
      {
        return accumulator;
      }
      const el = yadeep.get(doc, field);
      if (!shouldTransform(field, el))
      {
        return accumulator;
      }
      if (Array.isArray(el))
      {
        for (let i: number = 0; i < el.length; i++)
        {
          let kp: KeyPath = field;
          if (kp.contains('*'))
          {
            kp = kp.set(kp.indexOf('*'), i.toString());
          }
          else
          {
            kp = kp.push(i.toString());
          }
          const result = cb(kp, yadeep.get(doc, kp));
          if (result !== undefined)
          {
            return result;
          }
        }
      }
      else
      {
        const result = cb(field, el);
        if (result !== undefined)
        {
          return result;
        }
      }
      return accumulator;
    }, undefined);
    if (reducedResult !== undefined)
    {
      return reducedResult;
    }
    else
    {
      return defaultResult;
    }
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
      let el: any = yadeep.get(doc, field);
      if (!isPrimitive(el) && el.constructor !== Array)
      {
        el = Object.assign({}, el);
      }
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
    let result: TransformationVisitResult;
    node.fields.forEach((field) =>
    {
      const el: any = yadeep.get(doc, field);
      if (el === undefined || result !== undefined)
      {
        return;
      }
      if (typeof el !== 'string' && el.constructor !== Array)
      {
        result = {
          errors: [
            {
              message: 'Attempted to insert in a non-string field (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
        return;
      }

      let at: number = 0;
      if (typeof opts['at'] === 'number')
      {
        at = opts['at'];
        if (opts['at'] < 0)
        {
          at += (el.length as number) + 1;
        }
      }
      else if (opts['at'] === undefined)
      {
        at = el.length;
      }
      else
      {
        result = {
          errors: [
            {
              message: 'Insert node: "at" property is invalid',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
        return;
      }

      let value;
      if (Immutable.Iterable.isIterable(opts['value']) || opts['value'] instanceof KeyPath)
      {
        value = yadeep.get(doc, opts['value'] as KeyPath);
        if (typeof value !== 'string')
        {
          result = {
            errors: [
              {
                message: 'Insert: field denoted by "value" keypath is not a string',
              } as TransformationVisitError,
            ],
          } as TransformationVisitResult;
          return;
        }
      }
      else if (typeof opts['value'] === 'string')
      {
        value = opts['value'];
      }
      else
      {
        result = {
          errors: [
            {
              message: 'Insert: "value" property is missing or invalid',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
        return;
      }

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
          const eli: any = yadeep.get(doc, kpi);
          yadeep.set(doc, kpi, (eli.slice(0, at) as string) + String(value) + (eli.slice(at) as string), { create: true });
        }
      }
      else
      {
        // Currently assumes a single from and length for all fieldIDs
        yadeep.set(doc, field, (el.slice(0, at) as string) + String(value) + (el.slice(at) as string), { create: true });
      }
    });

    if (result !== undefined)
    {
      return result;
    }

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
      if (el === undefined)
      {
        return;
      }
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
      if (split.length > opts.newFieldKeyPaths.size)
      {
        split[opts.newFieldKeyPaths.size - 1] = split.slice(opts.newFieldKeyPaths.size - 1).join(String(opts.delimiter));
      }
      for (let i: number = 0; i < opts.newFieldKeyPaths.size; i++)
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
    return TransformationEngineNodeVisitor.visitHelper(node.fields, doc, { document: doc }, (kp, el) =>
    {
      if (typeof el !== 'string')
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
        yadeep.set(doc, kp, el.toUpperCase());
      }
    });
  }

  public visitCastNode(node: CastTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.CastNode>;

    return TransformationEngineNodeVisitor.visitHelper(node.fields, doc, { document: doc }, (kp, el) =>
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
    }, (kp, el) =>
      {
        return !(typeof el === opts.toTypename || el == null || (el.constructor === Array && opts.toTypename === 'array'));
      });
  }

  public visitHashNode(node: HashTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.HashNode>;

    return TransformationEngineNodeVisitor.visitHelper(node.fields, doc, { document: doc }, (kp, el) =>
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
        yadeep.set(doc, kp, TransformationEngineNodeVisitor.hashHelper(el, opts.salt));
      }
    });
  }

  public visitAddNode(node: AddTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.AddNode>;

    return TransformationEngineNodeVisitor.visitHelper(node.fields, doc, { document: doc }, (kp, el) =>
    {
      if (typeof el !== 'number')
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
        yadeep.set(doc, kp, el + opts.shift);
      }
    });
  }

  public visitSubtractNode(node: SubtractTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.SubtractNode>;

    return TransformationEngineNodeVisitor.visitHelper(node.fields, doc, { document: doc }, (kp, el) =>
    {
      if (typeof el !== 'number')
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
        yadeep.set(doc, kp, el - opts.shift);
      }
    });
  }

  public visitMultiplyNode(node: MultiplyTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.MultiplyNode>;

    return TransformationEngineNodeVisitor.visitHelper(node.fields, doc, { document: doc }, (kp, el) =>
    {
      if (typeof el !== 'number')
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
        yadeep.set(doc, kp, el * opts.factor);
      }
    });
  }

  public visitDivideNode(node: DivideTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.DivideNode>;

    return TransformationEngineNodeVisitor.visitHelper(node.fields, doc, { document: doc }, (kp, el) =>
    {
      if (typeof el !== 'number')
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
        yadeep.set(doc, kp, el / opts.factor);
      }
    });
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

    return TransformationEngineNodeVisitor.visitHelper(node.fields, doc, { document: doc }, (kp, el) =>
    {
      if (setIfHelper(opts, el))
      {
        yadeep.set(doc, kp, opts.newValue, { create: true });
      }
    });
  }

  public visitFindReplaceNode(node: FindReplaceTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.FindReplaceNode>;

    return TransformationEngineNodeVisitor.visitHelper(node.fields, doc, { document: doc }, (kp, el) =>
    {
      if (typeof el !== 'string')
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
          yadeep.set(doc, kp, el.replace(new RegExp(opts.find, 'g'), opts.replace));
        }
        else
        {
          yadeep.set(doc, kp, el.split(opts.find).join(opts.replace));
        }
      }
    });
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
        yadeep.set(doc, opts.newFieldKeyPaths.get(0), el.length, { create: true });
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

    return TransformationEngineNodeVisitor.visitHelper(node.fields, doc, { document: doc }, (kp, el) =>
    {
      if (typeof el !== 'string')
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
        yadeep.set(doc, kp, TransformationEngineNodeVisitor.encryptHelper(el));
      }
    });
  }

  public visitDecryptNode(node: DecryptTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.DecryptNode>;

    return TransformationEngineNodeVisitor.visitHelper(node.fields, doc, { document: doc }, (kp, el) =>
    {
      if (typeof el !== 'string')
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
        yadeep.set(doc, kp, TransformationEngineNodeVisitor.decryptHelper(el));
      }
    });
  }

  public visitGroupByNode(node: GroupByTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.GroupByNode>;

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

    node.fields.forEach((field) =>
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

  public visitFilterArrayNode(node: FilterArrayTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.FilterArrayNode>;

    node.fields.forEach((field) =>
    {
      const el = yadeep.get(doc, field);
      if (Array.isArray(el))
      {
        const newArray = [];
        for (let i = 0; i < el.length; i++)
        {
          let drop = false;
          if (opts.filterNull && el[i] === null)
          {
            drop = true;
          }
          if (opts.filterUndefined && el[i] === undefined)
          {
            drop = true;
          }
          if (!drop)
          {
            newArray.push(el[i]);
          }
        }
        yadeep.set(doc, field, newArray, { create: true });
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

    //     node.fields.forEach((field) =>
    // {
    //   const el = yadeep.get(doc, field);
    //   if (Array.isArray(el))
    //   {
    //     let sum: number = 0;
    //     for (let i: number = 0; i < el.length; i++)
    //     {
    //       let kpi: KeyPath = field;
    //       if (kpi.contains('*'))
    //       {
    //         kpi = kpi.set(kpi.indexOf('*'), i.toString());
    //       }
    //       else
    //       {
    //         kpi = kpi.push(i.toString());
    //       }
    //       sum += yadeep.get(doc, kpi);
    //     }
    //     yadeep.set(doc, opts.newFieldKeyPaths.get(0), sum, { create: true });
    //   }
    //   else
    //   {
    //     return {
    //       errors: [
    //         {
    //           message: 'Attempted to sum a non-array (this is not supported)',
    //         } as TransformationVisitError,
    //       ],
    //     } as TransformationVisitResult;
    //   }
    // });
  }

  public visitZipcodeNode(node: ZipcodeTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.ZipcodeNode>;

    return TransformationEngineNodeVisitor.visitHelper(node.fields, doc, { document: doc }, (kp, el) =>
    {
      if (typeof el !== 'string')
      {
        return {
          errors: [
            {
              message: 'Attempted to convert a non-string field into a zipcode (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      else
      {
        yadeep.set(doc, kp, TransformationEngineNodeVisitor.zipcodeHelper(el, opts));
      }
    });
  }
}
