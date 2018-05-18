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

import * as _ from 'lodash';
import * as winston from 'winston';

import { PostProcessTransformConfig, PostProcessTransformOptionsTypes } from '../../../../../shared/etl/types/EndpointTypes';

export class PostProcessTransform
{
  constructor()
  {

  }

  public process(transformConfigs: PostProcessTransformConfig[], data: object[]): object[]
  {
    // [{"name":"aggregate","pattern":"[0-9]{1,}-[0-9]{1,}","primaryKeyName":"ga:productSku","aggParams":["Item Quantity","Item Revenue"]}]
    let processedData: object[] = _.cloneDeep(data);
    if (!Array.isArray(transformConfigs))
    {
      return data;
    }
    transformConfigs.forEach((transformConfig) =>
    {
      try
      {
        switch (transformConfig.type)
        {
          case 'Aggregate':
            processedData = this._aggregate(transformConfig.options, processedData);
            break;
          default:
            break;
        }
      }
      catch (e)
      {
        winston.warn(((e as any).toString() as string));
      }
    });
    return processedData;
  }

  private _aggregate(options: object, data: object[]): object[]
  {
    const patternRegExp = new RegExp(options['pattern']);
    const patternRegExpFull = new RegExp(options['pattern'] as string + '.*');
    const aggParams: string[] = options['fields'];
    const newDataDict: object = {};
    // step 1
    data.forEach((row) =>
    {
      if (patternRegExpFull.test(row[options['primaryKeyName']]))
      {
        const extractedPrimaryKey: string = row[options['primaryKeyName']]
          .replace(row[options['primaryKeyName']].replace(patternRegExp, ''), '');
        if (newDataDict[extractedPrimaryKey] === undefined)
        {
          newDataDict[extractedPrimaryKey] = [];
        }
        newDataDict[extractedPrimaryKey] = newDataDict[extractedPrimaryKey].concat(row);
      }
    });
    const returnData: object[] = [];
    // steps 2, 3 and 4
    Object.keys(newDataDict).forEach((nDDKey) =>
    {
      if (Array.isArray(newDataDict[nDDKey]) && newDataDict[nDDKey].length > 0)
      {
        const nDDValue: object = _.cloneDeep(newDataDict[nDDKey][0]);
        for (let i = 1; i < newDataDict[nDDKey].length; ++i)
        {
          options['fields'].forEach((aggField) =>
          {
            nDDValue[aggField] = parseFloat(nDDValue[aggField]) + parseFloat(newDataDict[nDDKey][i][aggField]);
          });
        }
        nDDValue[options['primaryKeyName']] = nDDKey;
        returnData.push(nDDValue);
      }
    });
    return returnData;
  }
}
