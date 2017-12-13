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

// Copyright 2017 Terrain Data, Inc.

// tslint:disable:variable-name strict-boolean-expressions no-console

/**
 * This file provides utility functions for implementing classes
 * from Immutable Records. This gives the typesafety benefits of
 * Typescript with the immutability benefits of Immutable.
 *
 * Set up Record-backed classes by:
 * 1. create a class with a temporary name that extends BaseClass
 * 2. define instance variables and give them default values
 *       (note: Immutable Records must have default values)
 * 3. export a type with your final class name that is a union of your
 *    temporary name and IRecord of your temp name - this will add
 *    the Record functions to the type of your class
 * 4. export a factory function that calls New with your class and config
 *
 * Note: you can add two properties to your class if you will save
 *  it to the server using the utility function below:
 * - excludeFields: which fields to exclude from the server save.
 *    good for temporary state fields which don't need saving
 * - dbFields: including this will create a new `meta` property on
 *    the object containing every field not within the dbFields list.
 *    good if the database only stores certain cols and has a meta column
 */

/*

Example definition for a sub class:

class TestClassC extends BaseClass
{
  testString = '';
  testList = List([]);
}
export type TestClass = TestClassC & IRecord<TestClassC>;
export const _TestClass = (config?: {[key:string]: any}) =>
  New<TestClass>(new TestClassC(config), config);

*/

import * as Immutable from 'immutable';
import * as _ from 'lodash';
import Util from './util/Util';

export class BaseClass
{
  public id: string | number = -1;

  constructor(config: { id?: ID, [field: string]: any } = {})
  {
    // nada
  }
}

const records: { [class_name: string]: Immutable.Record.Class } = {};

export function New<T>(
  instance,
  config: { [field: string]: any } = {},
  extendId?: boolean | 'string', // if true, generate an ID on instantiation
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

// This converts the standard Record class format to a plain JS
//  object for saving to the server
export function recordForSave(record: IRecord<any>)
{
  const recordData = record.toJS();
  const meta: any = _.extend({}, recordData);

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
      (field) => delete meta[field],
    );

    _.map(meta,
      (v, key) => delete recordData[key],
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
      const meta = JSON.parse(response['meta'] || '{}');
      response = _.extend(meta, response);
      delete response['meta'];
    }
    catch (e)
    {
      console.log('JSON Parse Error converting item: ', e, response['meta']);
    }
  }

  return response;
}

// boilerplate generator
export type WithIRecord<T> = T & IRecord<T>;
export function makeConstructor<T>(Type: { new(): T; })
{
  return (config?: { [key: string]: any }) =>
    New<WithIRecord<T>>(new Type(), config);
}
