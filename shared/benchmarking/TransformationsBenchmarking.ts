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
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import TransformationRegistry from 'shared/transformations/TransformationRegistry';
import { KeyPath } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

import EngineUtil from 'shared/transformations/util/EngineUtil';

/*
 *  Using Date.now() as a placeholder until we figure out an actual package to do benchmarking
 */
export default class Benchmarking
{
  public static doc1 = {
    name: 'Nolas',
    type: 'Restaurant',
    notes: 'Unfortunately closed for lunch',
    rating: 4,
    servesAlchohol: true,
    hasGoodWings: true,
    streetName: 'Ramona St',
    meta: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    goodDishes: [
      {
        name: 'Deviled Eggs',
        description: 'Very Tasty, according to David',
        purchaseHistory: [
          3,
          2,
          4,
          5,
        ],
      },
      {
        name: 'Cup of Gumbo',
        description: 'Mmmmm, delicious',
        purchaseHistory: [
          1,
          3,
        ],
      },
      {
        name: 'Sliders',
        description: 'Very tasty mini burgers',
        purchaseHistory: [
          8,
          12,
        ],
      },
    ],
  };

  public static createFlatDocument(numFields: number = 100): object
  {
    const obj = {};
    for (let i = 0; i < numFields; i++)
    {
      obj[`field${i}`] = Math.random();
    }
    return obj;
  }

  // run func for at least minTime milliseconds, in batches of size chunk. return average time in microseconds
  public static time(func: () => void, chunk: number = 100, minTime: number = 1000): number
  {
    const start = Date.now();
    let runs = 0;
    while (Date.now() - start < minTime)
    {
      runs++;
      for (let i = 0; i < chunk; i++)
      {
        func();
      }
    }
    const stop = Date.now();
    return 1000 * (stop - start) / (runs * chunk);
  }

  public static weave(
    fn1: (arg: any) => void,
    fn2: (arg: any) => void,
    argSets: any[],
    chunk?: number,
    minTime?: number,
  ): Array<{ time1: number, time2: number, difference: number }>
  {
    const runs = [];
    for (const args of argSets)
    {
      const t1 = Benchmarking.time(() => fn1(args), chunk, minTime);
      const t2 = Benchmarking.time(() => fn2(args), chunk, minTime);
      runs.push({
        time1: t1,
        time2: t2,
        difference: t1 - t2,
        ratio: t1 / t2,
      });
    }
    return runs;
  }

  public static yadeepBenchmark(chunk: number = 100, minTime: number = 1000)
  {
    const simplePath = List(['name']);
    const arrayPath = List(['meta', -1]);
    const complexPath1 = List(['goodDishes', -1, 'description']);
    const complexPath2 = List(['goodDishes', -1, 'purchaseHistory', -1]);
    const complexPath3 = List(['goodDishes', 1, 'purchaseHistory']);

    const testDoc = Benchmarking.doc1;

    const testGet = (path) => yadeep.get(testDoc, path);
    const testSearch = (path) => yadeep.search(testDoc, path);
    const testPaths = [simplePath, arrayPath, complexPath1, complexPath2, complexPath3];
    const runs = Benchmarking.weave(testGet, testSearch, testPaths, chunk, minTime);
    return runs;
  }

  public static transformationBenchmark(chunk: number = 100, minTime: number = 1000)
  {
    const documents = List([Benchmarking.doc1]);
    const engine1 = EngineUtil.createEngineFromDocuments(documents).engine;
    const engine2 = EngineUtil.createEngineFromDocuments(documents).engine;

    EngineUtil.interpretETLTypes(engine2, {
      documents,
    });
    EngineUtil.addInitialTypeCasts(engine2);

    const testEngine1 = (doc) => engine1.transform(doc);
    const testEngine2 = (doc) => engine2.transform(doc);

    const testDocs = [Benchmarking.doc1];
    const runs = Benchmarking.weave(testEngine1, testEngine2, testDocs, chunk, minTime);
    return runs;
  }
}
