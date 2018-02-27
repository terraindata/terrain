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
import * as TerrainLog from 'loglevel';
import * as Serialize from 'remotedev-serialize';
import Util from './util/Util';

export class BaseClass
{
  public id: string | number = -1;

  constructor(config: { id?: ID, [field: string]: any } = {})
  {
    // nada
  }
}

const AllRecordMap: { [class_name: string]: Immutable.Record.Class } = {};
let AllRecordArray = [];
export const AllRecordNameArray = [];
export let RecordsSerializer = Serialize.immutable(Immutable, []);

function addNewRecord(rec: Immutable.Record.Class, name: string)
{
  AllRecordMap[name] = rec;
  AllRecordNameArray.push(name);
  AllRecordArray.push(rec);
  RecordsSerializer = Serialize.immutable(Immutable, AllRecordArray);
}

export function resetRecordNameArray(recordName: string[]): boolean
{
  // fast-path checking
  let alreadySame = false;
  for (const i in recordName)
  {
    if (recordName[i] !== AllRecordArray[i])
    {
      alreadySame = true;
    }
  }
  if (alreadySame === true)
  {
    return true;
  }

  // we have to try to reset the serializer record type array
  const newRecordArray = [];
  for (let newPos = 0; newPos < recordName.length; newPos = newPos + 1)
  {
    const name = recordName[newPos];
    let matchedRecord;
    // searching the matched Record class
    for (let i = 0; i < AllRecordNameArray.length; i = i + 1)
    {
      if (name === AllRecordNameArray[i])
      {
        matchedRecord = AllRecordArray[i];
      }
    }
    if (matchedRecord !== undefined)
    {
      newRecordArray.push(matchedRecord);
    } else
    {
      return false;
    }
  }
  AllRecordArray = newRecordArray;
  RecordsSerializer = Serialize.immutable(Immutable, AllRecordArray);
  return true;
}

export function Constructor<T>(instance)
{
  const class_name = instance.__proto__.constructor.name;
  if (!AllRecordMap[class_name])
  {
    TerrainLog.debug('New Record ' + String(class_name));
    const newRecord = Immutable.Record(new instance.__proto__.constructor({}));
    addNewRecord(newRecord, class_name);
  }
  return AllRecordMap[class_name];
}

export function New<T>(
  instance,
  config: { [field: string]: any } = {},
  extendId?: boolean | 'string', // if true, generate an ID on instantiation
): T & IRecord<T>
{
  const constructor = Constructor<T>(instance);

  if (extendId)
  {
    config = Util.extendId(config, extendId === 'string');
  }
  _.forOwn(config,
    (value, key) => { instance[key] = value; },
  );
  return new constructor(instance) as any;
}

export function createRecordType(obj, name: string)
{
  if (!AllRecordMap[name])
  {
    addNewRecord(Immutable.Record(obj), name);
  } else
  {
    TerrainLog.debug('WARNING: The record type ' + name + ' has already been created!');
  }
  return AllRecordMap[name];
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
export function makeConstructor<T>(Type: { new(): T; }): (config?: ConfigType<T>) => WithIRecord<T>
{
  return (config?: { [key: string]: any }) =>
    New<WithIRecord<T>>(new Type(), config);
}

type overrideMap<T> = {
  [key in keyof T]?: (config?: any, deep?: boolean) => T[key]
};

// iterates through instance's methods and adds them to the record prototype
// note that if you have a name conflict (like getIn), then the Record's prototype will be overwritten
// also note that this won't add inherited methods
function injectInstanceMethods(constructor, instance)
{
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance));
  for (const method of methods)
  {
    if (method !== 'constructor')
    {
      constructor.prototype[method] = instance.__proto__[method];
    }
  }
}

type ConfigType<T> = {
  [k in keyof T]?: T[k];
}
/**
 * If injectMethods is true, then the resultant object creator will add the Type's instance methods to the object's prototype.
 * You should use configOverride if the immutable record can be rebuilt from a pure js object (e.g. an object returned by recordForSave)
 * the overrider is called if the resultant constructor is called with deep = true
 */
export function makeExtendedConstructor<T>(
  Type: { new(): T; },
  injectMethods: boolean = false,
  configOverride?: overrideMap<T>,
): (config?: ConfigType<T>, deep?: boolean) => WithIRecord<T>
{
  if (injectMethods)
  {
    const instance = new Type();
    injectInstanceMethods(Constructor(instance), instance);
  }
  if (configOverride)
  {
    return (config?: { [key: string]: any }, deep?: boolean) =>
    {
      const overrideKeys = Object.keys(configOverride);
      if (deep)
      {
        const overridenConfig = {};
        for (const key of overrideKeys)
        {
          overridenConfig[key] = configOverride[key](config[key], true);
        }
        config = _.defaults(overridenConfig, config);
      }
      return New<WithIRecord<T>>(new Type(), config);
    };
  }
  else
  {
    return (config?: { [key: string]: any }) => New<WithIRecord<T>>(new Type(), config);
  }
}

/*** Example Usage ***/
/***
  import { List } from 'immutable';
  import { makeExtendedConstructor, WithIRecord } from 'src/app/Classes';

  // lets make a basic Rectangle class that has instance methods

  class RectangleC
  {
    public readonly length: number = 1;
    public readonly width: number = 1;
    public  getArea()
    {
      return this.length * this.width;
    }
    public isSquare()
    {
      return this.length === this.width;
    }
  }
  export type Rectangle = WithIRecord<RectangleC>;
  export const _Rectangle = makeExtendedConstructor(RectangleC, true);

  // by setting true, we tell makeExtendedConstructor that we want to inject RectangleC's instance methods onto created Records.

  const rect1 = _Rectangle({length: 4, width: 3});
  console.log(rect1.set('length', 5).getArea()); // 15

  // so far so good, constructing rectangles is easy by providing an optional object that specifies length and width
  // here's a slightly more complicated record; one that has nested immutable records

  class ShapesC
  {
    public readonly rectangles: List<Rectangle> = List([]);
    public readonly lines: List<number> = List([]);

    public getTotalArea()
    {
      return this.rectangles
        .map((val) => val.getArea())
        .reduce((a: number, b: number) => a + b);
    }

    public getLongestLine()
    {
      return this.lines.max();
    }
  }
  export type Shapes = WithIRecord<ShapesC>;
  export const _Shapes = makeExtendedConstructor(ShapesC, true);

  const shapes1 = _Shapes({
    rectangles: List([rect1]),
    lines: List([0, 1, 2, 3]),
  });
  console.log(shapes1.getLongestLine()); // 3

  // Cool, still works! What's the problem?
  // Say we save a Shape to a database... it will get serialized to something like this:

  const plainShape = {
      rectangles: [
        {length: 5, width: 6},
        {length: 3, width: 4},
      ],
      lines: [5, 6, 7],
    };

  // rectangles is now a plain js array of plain js object, and lines is also a plain array.
  // if we try to cosntruct a shape from this, we'll get some problems

  const shapesTest = _Shapes(plainShape);
  console.log(shapesTest.getTotalArea()); // Uncaught TypeError: val.getArea is not a function

  // Yikes. There's no way for the _Shapes constructor to know what to do with plainShape.rectangles;
  // for all it knows, it's an immutable list of immutable rectangles.
  // To fix this we need give makeExtendedConstructor some hints on how to deal with the plain js object
  // makeExtendedConstructor takes a 3rd argument that accepts an object mapping keys to functions

  export const _ShapesDeep = makeExtendedConstructor(ShapesC, true, {
      rectangles: (rects: object[]) => List(rects).map((val) => _Rectangle(val)).toList(),
      lines: (lines: number[]) => List(lines),
    });
  const shapes2 = _ShapesDeep(plainShape, true);

  // the returned constructor, _ShapesDeep in this case, takes an optional 2nd argument.
  // If it's true, then makeExtendedConstructor knows that it's taking in a plain js object.
  // It now takes the provided functions and converts the config values. e.g. [5, 6, 7] into List([5, 6, 7]);

  console.log(shapes2.getTotalArea()); // 42
  // Voila!
***/
