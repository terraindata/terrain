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
import * as queryString from 'query-string';
import * as stream from 'stream';
import * as winston from 'winston';

import {
  PostProcessAggregationTypes,
  PostProcessConfig,
  PostProcessFilterTypes,
  PostProcessParseTypes,
  PostProcessOptionsTypes,
} from 'shared/etl/types/PostProcessTypes';

import BufferTransform from '../io/streams/BufferTransform';

export class PostProcess
{
  constructor()
  {
    // do nothing
  }

  public async process(transformConfigs: PostProcessConfig[], dataStreams: stream.Readable[]): Promise<object[]>
  {
    // [{"name":"aggregate","pattern":"[0-9]{1,}-[0-9]{1,}","primaryKey":"ga:productSku","aggParams":["Item Quantity","Item Revenue"]}]
    return new Promise<object[]>(async (resolve, reject) =>
    {
      const data: object[] = [];
      dataStreams.forEach(async (dataStream) =>
      {
        const accumulatedData: object[] = await BufferTransform.toArray(dataStream);
        accumulatedData.forEach((chunk) =>
        {
          try
          {
            data.push(chunk);
          }
          catch (e)
          {
            winston.warn((e as any).toString() as string);
          }
        });
      });

      let processedData: object[] = _.cloneDeep(data);
      if (!Array.isArray(transformConfigs))
      {
        winston.warn('Transforms is not an array');
        return resolve(data);
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
            case 'Filter':
              processedData = this._filter(transformConfig.options, processedData);
              break;
            case 'Parse':
              processedData = this._parse(transformConfig.options, processedData);
              break;
            case 'Sort':
              processedData = this._sort(transformConfig.options, processedData);
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
      return resolve(processedData);
    });
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
      if (patternRegExpFull.test(row[options['primaryKey']]))
      {
        const extractedPrimaryKey: string = row[options['primaryKey']]
          .replace(row[options['primaryKey']].replace(patternRegExp, ''), '');
        if (newDataDict[extractedPrimaryKey] === undefined)
        {
          newDataDict[extractedPrimaryKey] = [];
        }
        newDataDict[extractedPrimaryKey] = newDataDict[extractedPrimaryKey].concat(row);
      }
    });

    Object.keys(newDataDict).forEach((nDDKey) =>
    {
      newDataDict[nDDKey].sort((a, b) =>
      {
        return a[options['primaryKey']] > b[options['primaryKey']];
      });
    });

    const returnData: object[] = [];
    switch (options['operation'])
    {
      case PostProcessAggregationTypes.Sum:
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
            nDDValue[options['primaryKey']] = nDDKey;
            returnData.push(nDDValue);
          }
        });
        break;
      case PostProcessAggregationTypes.Average:
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
            if (newDataDict[nDDKey].length !== 0)
            {
              options['fields'].forEach((aggField) =>
              {
                nDDValue[aggField] = nDDValue[aggField] / newDataDict[nDDKey].length;
              });
            }
            nDDValue[options['primaryKey']] = nDDKey;
            returnData.push(nDDValue);
          }
        });
        break;
      default:
    }
    return returnData;
  }

  private _parse(options: object, data: object[]): object[]
  {
    const returnData: object[] = [];
    switch (options['operation'])
    {
      case PostProcessParseTypes.ParseURL:
        data.forEach((row) =>
        {
          const newRow = _.cloneDeep(row);
          const parsedClicks = queryString.parseUrl(newRow[options['field']]);
          const parsedClicksUrl = parsedClicks['url'];
          const parsedClicksQuery = parsedClicks['query'];
          const domainName = options['url'];
          let parsedClicksUrlArr = [];
          try
          {
            parsedClicksUrlArr = parsedClicksUrl.substring(parsedClicksUrl.indexOf(domainName) + domainName.length).split('/').filter((token) => token.length !== 0);
          }
          catch (e)
          {
            // do nothing
          }
          if (parsedClicksUrlArr.length !== 0)
          {
            newRow[options['field']] = parsedClicksQuery;
          }

          returnData.push(newRow);
        });
        break;
      default:
    }
    return returnData;
  }

  private _filter(options: object, data: object[]): object[]
  {
    let returnData: object[] = [];
    switch (options['operation'])
    {
      case PostProcessFilterTypes.RemoveByPattern:
        returnData = data.filter((row) =>
          row[options['primaryKey']] != null && Array.isArray(row[options['primaryKey']].match(new RegExp(options['pattern'], 'g'))));
        break;
      case PostProcessFilterTypes.MostRecent:
        break;
      default:
    }
    return returnData;
  }
}
