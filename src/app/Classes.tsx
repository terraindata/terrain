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

// TODO MOD maybe move?

import * as Immutable from 'immutable';
import * as _ from 'underscore';
import Util from './util/Util';

export class BaseClass
{
  id: string | number = -1;

  constructor(config: { id?: ID, [field: string]: any } = {})
  {
    // nada
  }
}

// example instantiation function for a sub class
// class TestClassC extends BaseClass
// { ... }
// export type TestClass = TestClassC & IRecord<TestClassC>;
// export const _TestClass = (config?: {[key:string]: any}) =>
//   New<TestClass>(new TestClassC(config), config);

const records: { [class_name: string]: Immutable.Record.Class } = {};

export function New<T>(
  instance,
  config: { [field: string]: any } = {},
  extendId?: boolean | 'string' // if true, generate an ID on instantiation
): T & IRecord<T>
{
  const class_name = instance.__proto__.constructor.name;
  if (!records[class_name])
  {
    records[class_name] = Immutable.Record(new instance.__proto__.constructor({}));
  }

  if (extendId)
  {
    config = Util.extendId(config, extendId === 'string');
  }

  _.map(config,
    (value, key) =>
      instance[key] = value,
  );

  return new records[class_name](instance) as any;
}

export function recordForSave(record: IRecord<any>)
{
  const recordData = record.toJS();
  const meta = _.extend({}, recordData);

  if (record['excludeFields'])
  {
    record['excludeFields'].map((field) =>
    {
      delete recordData[field];
      delete meta[field];
    });
  }

  if (record['dbFields'])
  {
    record['dbFields'].map(
      (field) => delete meta[field]
    );

    _.map(meta,
      (v, key) => delete recordData[key]
    );

    recordData['meta'] = JSON.stringify(meta);
  }

  return recordData;
}

export function responseToRecordConfig(response: object): object
{
  if (response['meta'])
  {
    try
    {
      // somewhere along the line, \ get added to the text and not removed correctly
      // TODO update if the backend escaping is fixed
      let meta = JSON.parse(response['meta'].replace(/\\([^\\])/g, (a, b) => b).replace(/\\\\/g, "\\") || '{}');
      response = _.extend(meta, response);
      delete response['meta'];
    }
    catch (e) { }
  }

  return response;
}
