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

// import Bottleneck = require('bottleneck');
import jsonStream = require('JSONStream');
import soap = require('strong-soap');

import Bottleneck from 'bottleneck';
import * as _ from 'lodash';
import * as stream from 'stream';
import * as winston from 'winston';

import { getValueFromDocPath } from '../../../../../shared/Util';
import { Credentials } from '../../credentials/Credentials';
import CSVExportTransform from '../streams/CSVExportTransform';
import { ExportSourceConfig } from './Sources';

export const credentials: Credentials = new Credentials();
const limiter: any = new Bottleneck({
  maxConcurrent: 1,
  minTime: 2000,
});

export interface MagentoJSONConfig
{
  data: object[];
}

export interface MagentoSourceConfig
{
  credentialId: number;
  customOperation?: string;
  data: object[];
  mappedKeys?: object[];
  mappedParams: object | object[];
  options?: object;
  updateParams: object | object[];
  url: object[];
}

export class Magento
{
  public async getJSONStreamAsMagentoSourceConfig(exportSourceConfig: ExportSourceConfig): Promise<MagentoSourceConfig[]>
  {
    return new Promise<MagentoSourceConfig[]>(async (resolve, reject) =>
    {
      // cannot stream unfortunately as we need the entire dataset to do certain operations
      // such as getting all products and removing products that aren't in the exported dataset
      const magentoSourceConfigs: MagentoSourceConfig[] = [];
      let results: object[] = [];
      const jsonParser = jsonStream.parse();
      exportSourceConfig.stream.pipe(jsonParser);
      jsonParser.on('data', (data) =>
      {
        results = results.concat(data);
      });
      jsonParser.on('end', () =>
      {
        if (Array.isArray(exportSourceConfig.params))
        {
          exportSourceConfig.params.forEach((exportSourceConfigParam) =>
          {
            magentoSourceConfigs.push({
              credentialId: exportSourceConfigParam['credentialId'],
              customOperation: exportSourceConfigParam['customOperation'],
              data: results,
              mappedParams: exportSourceConfigParam['mappedParams'],
              options: exportSourceConfigParam['options'],
              updateParams: exportSourceConfigParam['updateParams'],
              url: exportSourceConfigParam['url'],
            } as MagentoSourceConfig);
          });
        }
        else
        {
          magentoSourceConfigs.push({
            credentialId: exportSourceConfig.params['credentialId'],
            customOperation: exportSourceConfig.params['customOperation'],
            data: results,
            mappedParams: exportSourceConfig.params['mappedParams'],
            options: exportSourceConfig.params['options'],
            updateParams: exportSourceConfig.params['updateParams'],
            url: exportSourceConfig.params['url'],
          } as MagentoSourceConfig);
        }
        return resolve(magentoSourceConfigs);
      });
      jsonParser.on('error', (err) =>
      {
        winston.error(err);
        throw err;
      });
    });
  }

  public async getMagentoRowsAsCSVStream(values: any[]): Promise<stream.Readable>
  {
    return new Promise<stream.Readable>(async (resolve, reject) =>
    {
      const colNames: string[] = Object.keys(values[0]);
      const writer = new CSVExportTransform(colNames);
      if (values.length > 0)
      {
        for (let i = 1; i < values.length; ++i)
        {
          writer.write(values[i]);
        }
      }
      writer.end();
      resolve(writer);
    });
  }

  public async runQuery(magentoSourceConfigs: MagentoSourceConfig[]): Promise<string | object[]>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      let resultStr: string = '';
      magentoSourceConfigs.forEach(async (magentoSourceConfig) =>
      {
        try
        {
          const soapCreds: object = {};
          const creds: string[] = await credentials.getAsStrings(magentoSourceConfig.credentialId, 'magento');
          if (creds.length === 0)
          {
            winston.info('No credentials found for that credential ID.');
          }
          else
          {
            const cred: object = JSON.parse(creds[0]);
            soapCreds['username'] = cred['apiUser'];
            soapCreds['apiKey'] = cred['apiKey'];
            soapCreds['baseUrl'] = cred['baseUrl'];
          }
          const options = magentoSourceConfig.options !== undefined ? magentoSourceConfig.options : {};
          _.extend(options, soapCreds);
          delete options['baseUrl'];
          if (Array.isArray(magentoSourceConfig.url))
          {
            let result: object[] = [];
            const storedResult: any[] = [];
            // chain operations
            const deepCopyMagentoSourceConfig = _.cloneDeep(magentoSourceConfig);
            let i = 0;
            while (i < magentoSourceConfig.url.length)
            {
              deepCopyMagentoSourceConfig['mappedParams'] = magentoSourceConfig['mappedParams'][i];
              deepCopyMagentoSourceConfig['updateParams'] = magentoSourceConfig['updateParams'][i];
              if (Array.isArray(magentoSourceConfig.url[i]['name'].match(new RegExp(/^<.*>$/g))))
              {
                const op: string = magentoSourceConfig.url[i]['name'].substring(1, magentoSourceConfig.url[i]['name'].length - 1);
                switch (op)
                {
                  case 'aggregate':
                    // look at the previous 2 elements in storedResult and add a new field
                    // params: primaryKey (field to aggregate on, is a RegExp string), aggParams (array of keys to merge)
                    // dump #2 into a dictionary with the primary key as the key and the value as the object
                    deepCopyMagentoSourceConfig.url = [magentoSourceConfig.url[i]];
                    let aggFirstObjDict: object = {};
                    const aggSecondObjDict: object = {};
                    const aggregatedObjDict: object = {};
                    const aggPrimaryKey: string = deepCopyMagentoSourceConfig.url[0]['primaryKey'];
                    const aggParams: string[] = deepCopyMagentoSourceConfig.url[0]['aggParams'];
                    const aggOffset: number[] = deepCopyMagentoSourceConfig.url[0]['offset'] !== undefined
                      ? deepCopyMagentoSourceConfig.url[0]['offset'] : [1, 2];
                    const aggPrimaryKeyRegexStr: string = deepCopyMagentoSourceConfig.url[0]['primaryKeyRegex']
                      !== undefined ? deepCopyMagentoSourceConfig.url[0]['primaryKeyRegex'] : '.*$';
                    const aggSecondObjLst: any[] = storedResult[i - aggOffset[0]];
                    if (!Array.isArray(aggSecondObjLst))
                    {
                      winston.warn('Previous stored element is not an array.');
                    }
                    if (deepCopyMagentoSourceConfig.url[0]['primaryKey'] === undefined
                      || !Array.isArray(deepCopyMagentoSourceConfig.url[0]['aggParams']))
                    {
                      winston.warn('Requires primaryKey and an array of aggregation params');
                    }
                    try
                    {
                      if (Array.isArray(storedResult[i - aggOffset[1]]))
                      {
                        storedResult[i - aggOffset[1]].forEach((firstObjObj) =>
                        {
                          aggFirstObjDict[firstObjObj[aggPrimaryKey]] = firstObjObj;
                        });
                      }
                      else // already in kv format
                      {
                        aggFirstObjDict = storedResult[i - aggOffset[1]];
                      }
                      aggSecondObjLst.forEach((secondObj) =>
                      {
                        aggSecondObjDict[secondObj[aggPrimaryKey]] = secondObj;
                      });
                      Object.keys(aggFirstObjDict).forEach((aggFirstObjDictKey) =>
                      {
                        const primaryKeyRegex: any = new RegExp(aggFirstObjDictKey + aggPrimaryKeyRegexStr);
                        const matchedKeys: string[] = Object.keys(aggSecondObjDict).filter((aggSecondObjDictKey) =>
                          primaryKeyRegex.test(aggSecondObjDictKey));
                        matchedKeys.forEach((matchedKey) =>
                        {
                          if (aggregatedObjDict[aggFirstObjDictKey] === undefined)
                          {
                            aggregatedObjDict[aggFirstObjDictKey] = this._upsertParams(aggFirstObjDict[aggFirstObjDictKey],
                              aggSecondObjDict[matchedKey], aggParams);
                          }
                          else
                          {
                            aggregatedObjDict[aggFirstObjDictKey] = this._upsertParams(aggregatedObjDict[aggFirstObjDictKey],
                              aggSecondObjDict[matchedKey], aggParams);
                          }
                        });
                        if (matchedKeys.length === 0)
                        {
                          aggregatedObjDict[aggFirstObjDictKey] = this._fillDefaultParams(aggFirstObjDict[aggFirstObjDictKey], aggParams);
                        }
                      });
                      storedResult.push(aggregatedObjDict);
                    }
                    catch (e)
                    {
                      winston.warn((e as any).toString() as string);
                    }
                    break;
                  case 'getValuesAsElements':
                    const storedResultKeys: string[] = Object.keys(storedResult[i - 1]);
                    const resultArr: object[] = [];
                    storedResultKeys.forEach((storedResultKey) =>
                    {
                      resultArr.push(storedResult[i - 1][storedResultKey]);
                    });
                    storedResult.push(resultArr);
                    break;
                  case 'sum':
                    deepCopyMagentoSourceConfig.url = [magentoSourceConfig.url[i]];
                    const sumOffsetObjDict: object = {};
                    // const sumSecondObjDict: object = {};
                    const sumObjDict: object = {};
                    const sumPrimaryKey: string = deepCopyMagentoSourceConfig.url[0]['primaryKey'];
                    // sumParams format:
                    // [{ field: <qty>, newFieldName: <inventory>, includedObjFieldName: <inventoryDetails>,
                    // includedObjFields: <[product_id, qty, is_in_stock]> }...]
                    const sumParam: object = deepCopyMagentoSourceConfig.url[0]['sumParam'];
                    const sumOffset: number = deepCopyMagentoSourceConfig.url[0]['offset'] !== undefined
                      ? deepCopyMagentoSourceConfig.url[0]['offset'] : 1;
                    const sumOffsetObjLst: any[] = storedResult[i - sumOffset];
                    const returnLst: object[] = [];
                    if (!Array.isArray(sumOffsetObjLst))
                    {
                      winston.warn('Previous stored element is not an array.');
                    }
                    if (deepCopyMagentoSourceConfig.url[0]['primaryKey'] === undefined
                      || deepCopyMagentoSourceConfig.url[0]['sumParam'] === undefined)
                    {
                      winston.warn('Requires primaryKey and an array of sum params');
                    }
                    try
                    {
                      sumOffsetObjLst.forEach((offsetObj) =>
                      {
                        if (sumOffsetObjDict[offsetObj[sumPrimaryKey]] !== undefined)
                        {
                          // already exists
                          sumOffsetObjDict[offsetObj[sumPrimaryKey]].push(offsetObj);
                        }
                        else
                        {
                          sumOffsetObjDict[offsetObj[sumPrimaryKey]] = [].concat(offsetObj);
                        }
                      });

                      Object.keys(sumOffsetObjDict).forEach((offsetObjKey) =>
                      {
                        const offsetObjArr: object[] = sumOffsetObjDict[offsetObjKey];
                        const includedObjs: object[] = [];
                        let sumCount: number = 0.0;
                        offsetObjArr.forEach((offsetObjElem) =>
                        {
                          sumCount += typeof offsetObjElem[sumParam['field']] === 'number'
                            ? offsetObjElem[sumParam['field']]
                            : parseInt(offsetObjElem[sumParam['field']], 10);
                          includedObjs.push(_.pick(offsetObjElem, sumParam['includedObjFields']));
                        });
                        const fullOffsetObj: object = {};
                        fullOffsetObj[sumPrimaryKey] = offsetObjKey;
                        fullOffsetObj[sumParam['newFieldName']] = sumCount;
                        fullOffsetObj[sumParam['includedObjFieldName']] = includedObjs;
                        returnLst.push(fullOffsetObj);
                      });
                      storedResult.push(returnLst);
                    }
                    catch (e)
                    {
                      winston.warn((e as any).toString() as string);
                    }
                    break;
                  case 'trim':
                    deepCopyMagentoSourceConfig.url = [magentoSourceConfig.url[i]];
                    const untrimedResult: object[] = storedResult[i - 1];
                    const keysToInclude: string[] = deepCopyMagentoSourcConfig.url[0]['keys'];
                    const excludedProducts: object[] = untrimedResult.filter((row) =>
                    {
                      return _.pick(row, keysToInclude);
                    });
                    storedResult.push(excludedProducts);
                    // deepCopyMagentoSourceConfig.data = excludedProducts;
                    i++;
                    break;
                  default:
                    break;
                }
              }
              else
              {
                // dataKey represents the key for the SOAP request, in this case probably product
                // originalKey represents the original dataKey in the previous SOAP request, in this case probably product_id
                // mappedKey represents the primary key that maps to the results, in this case probably sku
                deepCopyMagentoSourceConfig.url = [magentoSourceConfig.url[i]];
                if (deepCopyMagentoSourceConfig.url[0]['useKeysAsData'] === true
                  && deepCopyMagentoSourceConfig.url[0]['dataKey'] !== undefined
                  && deepCopyMagentoSourceConfig.url[0]['originalKey'] !== undefined
                  && deepCopyMagentoSourceConfig.url[0]['mappedKey'] !== undefined)
                {
                  /*
                  deepCopyMagentoSourceConfig.data =
                  [
                    { product: '5449' },
                    { product: '5450' },
                    { product: '6116' },
                  ];
                  deepCopyMagentoSourceConfig.mappedKeys =
                  [
                    { sku: '118010-731' },
                    { sku: '118010-270' },
                    { sku: '665023' },
                  ];
                  */
                  /*
                  deepCopyMagentoSourceConfig.data =
                  [
                    { products: { item: ['5447', '5445', '5444', '5438', '5437', '5436', '5435', '5434', '5433', '5429', '5424'] } },
                  ];
                  deepCopyMagentoSourceConfig.mappedKeys =
                  [
                    { sku: '118010-731' },
                  ];
                  */

                  deepCopyMagentoSourceConfig.data = [];
                  deepCopyMagentoSourceConfig.mappedKeys = [];
                  const dataKey: string = deepCopyMagentoSourceConfig.url[0]['dataKey'];
                  const originalKey: string = deepCopyMagentoSourceConfig.url[0]['originalKey'];
                  const mappedKey: string = deepCopyMagentoSourceConfig.url[0]['mappedKey'];
                  const useFullArray: boolean = deepCopyMagentoSourceConfig.url[0]['useFullArray'];
                  Object.keys(storedResult[i - 1]).forEach((key) =>
                  {
                    const dataObj: object = {};
                    const mappedObj: object = {};
                    _.set(dataObj, dataKey, Array.isArray(storedResult[i - 1][key][originalKey]) && useFullArray !== true
                      ? storedResult[i - 1][key][originalKey][0] : storedResult[i - 1][key][originalKey]);
                    mappedObj[mappedKey] = key;
                    deepCopyMagentoSourceConfig.data.push(dataObj);
                    deepCopyMagentoSourceConfig.mappedKeys.push(mappedObj);
                  });
                }
                result = await this._runSoapOperation(deepCopyMagentoSourceConfig, soapCreds, options) as object[];
                if (magentoSourceConfig.url[i]['postProcessPath'] !== undefined
                  && magentoSourceConfig.url[i]['postProcessArray'] === true)
                {
                  try
                  {
                    const newResults: object[] = [];
                    // console.log(JSON.stringify(result, null, 2));
                    result.forEach((res) =>
                    {
                      if (res['status'] !== undefined && Array.isArray(res['status']))
                      {
                        let k = 0;
                        while (k < res['status'].length)
                        {
                          if (magentoSourceConfig.url[i]['onlyFirstElement'] === true && k > 0)
                          {
                            break;
                          }
                          const row = res['status'][k];
                          // console.log(row);
                          const newRow: object = {};
                          Object.keys(row).forEach((rowKey) =>
                          {
                            if (row[rowKey] !== null
                              && row[rowKey]['$attributes'] !== undefined
                              && row[rowKey]['$attributes']['arrayType'] !== undefined)
                            {
                              // this is an array
                              const itemArr: any[] = [];
                              if (row[rowKey]['item'] !== undefined && Array.isArray(row[rowKey]['item']))
                              {
                                row[rowKey]['item'].forEach((itemElem) =>
                                {
                                  itemArr.push(itemElem['$value']);
                                });
                              }
                              newRow[rowKey] = itemArr;
                            }
                            else if (row[rowKey] !== null && row[rowKey] !== undefined
                              && row[rowKey]['$value'] !== undefined)
                            {
                              newRow[rowKey] = row[rowKey]['$value'];
                            }
                          });
                          if (res['mappedKey'] !== undefined)
                          {
                            const mappedKeyKey: string = res['mappedKey'][deepCopyMagentoSourceConfig.url[0]['mappedKey']];
                            newRow[deepCopyMagentoSourceConfig.url[0]['mappedKey']] = mappedKeyKey;
                            newResults.push(newRow);
                          }
                          else
                          {
                            newResults.push(newRow);
                          }
                          k++;
                        }
                      }
                      else if (res['status'] !== undefined)
                      {
                        const row = res['status'];
                        const newRow: object = {};
                        Object.keys(row).forEach((rowKey) =>
                        {
                          if (row[rowKey] !== null
                            && row[rowKey]['$attributes'] !== undefined
                            && row[rowKey]['$attributes']['arrayType'] !== undefined)
                          {
                            // this is an array
                            const itemArr: any[] = [];
                            if (row[rowKey]['item'] !== undefined && Array.isArray(row[rowKey]['item']))
                            {
                              row[rowKey]['item'].forEach((itemElem) =>
                              {
                                itemArr.push(itemElem['$value']);
                              });
                            }
                            newRow[rowKey] = itemArr;
                          }
                          else if (row[rowKey] !== null && row[rowKey] !== undefined
                            && row[rowKey]['$value'] !== undefined)
                          {
                            newRow[rowKey] = row[rowKey]['$value'];
                          }
                        });
                        if (res['mappedKey'] !== undefined)
                        {
                          const mappedKeyKey: string = res['mappedKey'][deepCopyMagentoSourceConfig.url[0]['mappedKey']];
                          newRow[deepCopyMagentoSourceConfig.url[0]['mappedKey']] = mappedKeyKey;
                          newResults.push(newRow);
                        }
                        else
                        {
                          newResults.push(newRow);
                        }
                      }
                    });
                    // console.log(JSON.stringify(newResults, null, 2));
                    storedResult.push(newResults);
                  }
                  catch (e)
                  {
                    winston.warn((e as any).toString() as string);
                  }
                }
              }
              i++;
              winston.info('Moving on to ' + i.toString() as string + '...');
            }
            storedResult.forEach((sr) =>
            {
              if (Array.isArray(sr))
              {
                console.log(sr.length);
              }
              else
              {
                console.log(Object.keys(sr).length);
              }
            });

            // Object.keys(storedResult[storedResult.length - 1]).sort().slice(0, 50).forEach((wat) =>
            // {
            //   console.log(JSON.stringify(storedResult[storedResult.length - 1][wat], null, 2));
            // });
            console.log('Finis');
            // console.log(JSON.stringify(storedResult[storedResult.length - 1].slice(0, 50), null, 2));
            return resolve(storedResult[storedResult.length - 1]);
          }
          else
          {
            resultStr += await this._runSoapOperation(magentoSourceConfig, soapCreds, options) as string;
            return resolve(resultStr);
          }
        }
        catch (e)
        {
          return resolve((resultStr.toString() as string) + (((e as any).toString() as string)));
        }
      });
    });
  }

  private _fillDefaultParams(origObj: object, aggParams: string[]): object
  {
    aggParams.forEach((aggParam) =>
    {
      if (origObj[aggParam] !== undefined) // already exists
      {
        if (!Array.isArray(origObj[aggParam]))
        {
          origObj[aggParam] = [].concat(origObj[aggParam]);
        }
      }
      else // does not exist yet
      {
        origObj[aggParam] = null;
      }
    });
    return origObj;
  }

  private async _runSoapOperation(magentoSourceConfig: MagentoSourceConfig, soapCreds: object,
    options: object): Promise<string | object[]>
  {
    return new Promise<string | object[]>(async (resolve, reject) =>
    {
      const THRESHOLD: number = 30;
      const resultArr: object[] = [];
      soap.soap.createClient(soapCreds['baseUrl'], options, async (err, client) =>
      {
        if (err)
        {
          winston.info(err);
        }
        let sessionId: string = '';
        winston.info('creating SOAP client.');
        client.on('request', (body) =>
        {
          winston.info('XML request:');
          winston.info(body);
          winston.info('end XML request');
        });
        client['login']({ username: soapCreds['username'], apiKey: soapCreds['apiKey'] },
          async (errLogin, resultLogin, envLogin, soapHeaderLogin) =>
          {
            if (!errLogin && resultLogin['loginReturn'] !== undefined && resultLogin['loginReturn']['$value'] !== undefined)
            {
              sessionId = resultLogin['loginReturn']['$value'];
              let method: any = client;
              const routeSplit: string[] = magentoSourceConfig.url[0]['name'].split('/');
              routeSplit.forEach((routeIndiv) =>
              {
                method = method[routeIndiv];
              });
              if (magentoSourceConfig.url[0]['get'] === true) // GET request
              {
                try
                {
                  let rowCounter: number = 0;
                  if (magentoSourceConfig.data === undefined)
                  {
                    magentoSourceConfig.data = [];
                  }
                  if (magentoSourceConfig.data.length === 0)
                  {
                    magentoSourceConfig.data.push({});
                  }
                  let callbackCounter: number = 0;
                  while (rowCounter < magentoSourceConfig.data.length && rowCounter < THRESHOLD) // TODO: remove restriction at 10
                  {
                    let mappedKey: object;
                    if (magentoSourceConfig.mappedKeys !== undefined && Array.isArray(magentoSourceConfig.mappedKeys))
                    {
                      mappedKey = magentoSourceConfig.mappedKeys[rowCounter];
                    }
                    const row = magentoSourceConfig.data[rowCounter];
                    const requestArgs: object = row;
                    requestArgs['sessionId'] = sessionId;
                    if (magentoSourceConfig.updateParams !== undefined)
                    {
                      Object.keys(magentoSourceConfig.updateParams).forEach((key) =>
                      {
                        requestArgs[key] = magentoSourceConfig.updateParams[key];
                      });
                    }
                    if (magentoSourceConfig.mappedParams !== undefined)
                    {
                      Object.keys(magentoSourceConfig.mappedParams).forEach((key) =>
                      {
                        requestArgs[key] = row[magentoSourceConfig.mappedParams[key]];
                      });
                    }

                    winston.info('Request: ' + JSON.stringify(requestArgs));
                    limiter.submit(method, requestArgs, (error, result, envelope, soapHeader) =>
                    {
                      winston.info('In callback GET ' + (callbackCounter.toString() as string)
                        + ' with request ' + JSON.stringify(requestArgs));
                      const sanitizedRequestArgs = _.cloneDeep(requestArgs);
                      delete sanitizedRequestArgs['sessionId'];
                      if (error)
                      {
                        resultArr.push({
                          args: sanitizedRequestArgs, status: 'false',
                          error: _.get(error, 'root.Envelope.Body.Fault.faultstring'),
                        });
                      }
                      else
                      {
                        if (result !== undefined && magentoSourceConfig.url[0]['path'] !== undefined)
                        {
                          const extractedDoc: object = getValueFromDocPath(result, magentoSourceConfig.url[0]['path']);
                          resultArr.push({ args: sanitizedRequestArgs, status: extractedDoc, mappedKey });
                        }
                        else
                        {
                          resultArr.push({ args: sanitizedRequestArgs, status: result });
                        }
                      }
                      if (callbackCounter >= THRESHOLD - 1 || callbackCounter >= magentoSourceConfig.data.length - 1) // TODO remove 10
                      {
                        return resolve(resultArr);
                      }
                      callbackCounter++;
                    });
                    rowCounter++;
                  }
                }
                catch (e)
                {
                  return resolve(((e as any).toString()));
                }
              }
              else
              {
                let j: number = 0;
                // while (j < magentoSourceConfig.data.length)
                let callbackCounter: number = 0;
                while (j < THRESHOLD) // TODO THRESHOLD
                {
                  const row = magentoSourceConfig.data[j];
                  let mappedKey: object;
                  if (magentoSourceConfig.mappedKeys !== undefined && Array.isArray(magentoSourceConfig.mappedKeys))
                  {
                    mappedKey = magentoSourceConfig.mappedKeys[j];
                  }
                  try
                  {
                    const requestArgs: object = row;
                    Object.keys(magentoSourceConfig.updateParams).forEach((key) =>
                    {
                      requestArgs[key] = magentoSourceConfig.updateParams[key];
                    });
                    Object.keys(magentoSourceConfig.mappedParams).forEach((key) =>
                    {
                      requestArgs[key] = row[magentoSourceConfig.mappedParams[key]];
                    });
                    const sanitizedRequestArgs = _.cloneDeep(requestArgs);
                    requestArgs['sessionId'] = sessionId;
                    limiter.submit(method, requestArgs, (error, result, envelope, soapHeader) =>
                    {
                      winston.info('In callback POST ' + (callbackCounter.toString() as string)
                        + ' with request ' + JSON.stringify(requestArgs));
                      if (error)
                      {
                        resultArr.push({
                          args: sanitizedRequestArgs, status: 'false',
                          error: _.get(error, 'root.Envelope.Body.Fault.faultstring'),
                        });
                      }
                      else
                      {
                        if (result !== undefined && magentoSourceConfig.url[0]['path'] !== undefined)
                        {
                          const extractedDoc: object = getValueFromDocPath(result, magentoSourceConfig.url[0]['path']);
                          resultArr.push({ args: sanitizedRequestArgs, status: extractedDoc, mappedKey });
                        }
                        else if (result && result['result'] !== undefined)
                        {
                          resultArr.push({ args: sanitizedRequestArgs, status: result['result']['$value'] });
                        }
                        else
                        {
                          resultArr.push({ args: sanitizedRequestArgs, status: 'true' });
                        }
                      }
                      if (callbackCounter >= THRESHOLD - 1 || callbackCounter >= magentoSourceConfig.data.length - 1)
                      {
                        return resolve(resultArr);
                      }
                      callbackCounter++;
                    });
                  }
                  catch (e)
                  {
                    return resolve(((e as any).toString()));
                  }
                  j++;
                }
              }
            }
            // const resultObj: object[] = await Promise.all(resultArr);
            // winston.info('Result of Magento request: ' + JSON.stringify(resultObj, null, 2));
          });
      });
    });
  }

  private _upsertParams(origObj: object, objToMerge: object, aggParams: string[]): object
  {
    aggParams.forEach((aggParam) =>
    {
      if (origObj[aggParam] !== undefined) // already exists
      {
        if (Array.isArray(origObj[aggParam]))
        {
          origObj[aggParam] = origObj[aggParam].concat(objToMerge[aggParam]);
        }
        else
        {
          origObj[aggParam] = [].concat(origObj[aggParam], objToMerge[aggParam]);
        }
      }
      else // does not exist yet
      {
        origObj[aggParam] = objToMerge[aggParam] !== undefined ? objToMerge[aggParam] : null;
      }
    });
    return origObj;
  }
}

export default Magento;
