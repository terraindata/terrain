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

import jsonStream = require('JSONStream');
import soap = require('strong-soap');

import * as _ from 'lodash';
import * as winston from 'winston';

import { getValueFromDocPath } from '../../../../../shared/Util';
import { Credentials } from '../../credentials/Credentials';
import { ExportSourceConfig } from './Sources';

export const credentials: Credentials = new Credentials();

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
          } as magentoSourceConfig);
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

  public async runQuery(magentoSourceConfigs: MagentoSourceConfig[]): Promise<string | object[]>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      const resultStr: string = '';
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
                  case 'trim':
                    // magentoSourceConfig.data
                    result = await this._runSoapOperation(deepCopyMagentoSourceConfig, soapCreds, options) as object[];
                    const excludedProducts: object[] = result.filter((row) =>
                    {
                      return row;
                    });
                    i++;
                    deepCopyMagentoSourceConfig.url = [magentoSourceConfig.url[i]];
                    deepCopyMagentoSourceConfig.data = excludedProducts;
                    result = await this._runSoapOperation(deepCopyMagentoSourceConfig, soapCreds, options) as object[];
                    break;
                  case 'aggregate':
                    // look at the previous 2 elements in storedResult and add a new field
                    // params: primaryKey (field to aggregate on, is a RegExp string), aggParams (array of keys to merge)
                    // dump #2 into a dictionary with the primary key as the key and the value as the object
                    deepCopyMagentoSourceConfig.url = [magentoSourceConfig.url[i]];
                    let firstObjDict: object = {};
                    const secondObjDict: object = {};
                    const aggregatedObjDict: object = {};
                    const aggPrimaryKey: string = deepCopyMagentoSourceConfig.url[0]['primaryKey'];
                    const aggParams: string[] = deepCopyMagentoSourceConfig.url[0]['aggParams'];
                    const offset: number[] = deepCopyMagentoSourceConfig.url[0]['offset'] !== undefined
                      ? deepCopyMagentoSourceConfig.url[0]['offset'] : [1, 2];
                    const primaryKeyRegexStr: string = deepCopyMagentoSourceConfig.url[0]['primaryKeyRegex']
                      !== undefined ? deepCopyMagentoSourceConfig.url[0]['primaryKeyRegex'] : '.*$';
                    const secondObjLst: any[] = storedResult[i - offset[0]];
                    if (!Array.isArray(secondObjLst))
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
                      if (Array.isArray(storedResult[i - offset[1]]))
                      {
                        storedResult[i - offset[1]].forEach((firstObjObj) =>
                        {
                          firstObjDict[firstObjObj[aggPrimaryKey]] = firstObjObj;
                        });
                      }
                      else // already in kv format
                      {
                        firstObjDict = storedResult[i - offset[1]];
                      }
                      secondObjLst.forEach((secondObj) =>
                      {
                        secondObjDict[secondObj[aggPrimaryKey]] = secondObj;
                      });
                      Object.keys(firstObjDict).forEach((firstObjDictKey) =>
                      {
                        const primaryKeyRegex: any = new RegExp(firstObjDictKey + primaryKeyRegexStr);
                        const matchedKeys: string[] = Object.keys(secondObjDict).filter((secondObjDictKey)
                          => primaryKeyRegex.test(secondObjDictKey));
                        matchedKeys.forEach((matchedKey) =>
                        {
                          if (aggregatedObjDict[firstObjDictKey] === undefined)
                          {
                            aggregatedObjDict[firstObjDictKey] = this._upsertParams(firstObjDict[firstObjDictKey],
                              secondObjDict[matchedKey], aggParams);
                          }
                          else
                          {
                            aggregatedObjDict[firstObjDictKey] = this._upsertParams(aggregatedObjDict[firstObjDictKey],
                              secondObjDict[matchedKey], aggParams);
                          }
                        });
                      });
                      storedResult.push(aggregatedObjDict);
                    }
                    catch (e)
                    {
                      winston.warn((e as any).toString() as string);
                    }
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
                  deepCopyMagentoSourceConfig.data = [];
                  deepCopyMagentoSourceConfig.mappedKeys = [];
                  const dataKey: string = deepCopyMagentoSourceConfig.url[0]['dataKey'];
                  const originalKey: string = deepCopyMagentoSourceConfig.url[0]['originalKey'];
                  const mappedKey: string = deepCopyMagentoSourceConfig.url[0]['mappedKey'];
                  Object.keys(storedResult[i - 1]).forEach((key) =>
                  {
                    const dataObj: object = {};
                    const mappedObj: object = {};
                    dataObj[dataKey] = Array.isArray(storedResult[i - 1][key][originalKey])
                      ? storedResult[i - 1][key][originalKey][0] : storedResult[i - 1][key][originalKey];
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
                    });
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
            return resolve(storedResult[storedResult.length - 1]);
          }
          else
          {
            resultStr += await this._runSoapOperation(magentoSourceConfig, soapCreds, options, resultStr) as string;
          }
        }
        catch (e)
        {
          return resolve(resultStr + ((e as any).toString()));
        }
      });
      return resolve(resultStr);
    });
  }

  private async _runSoapOperation(magentoSourceConfig: MagentoSourceConfig, soapCreds: object,
    options: object): Promise<string | object[]>
  {
    return new Promise<string | object[]>(async (resolve, reject) =>
    {
      const resultArr: Array<Promise<object>> = [];
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
                  while (rowCounter < magentoSourceConfig.data.length)
                  {
                    let mappedKey: object;
                    if (magentoSourceConfig.mappedKeys !== undefined && Array.isArray(magentoSourceConfig.mappedKeys))
                    {
                      mappedKey = magentoSourceConfig.mappedKeys[rowCounter];
                    }
                    const row = magentoSourceConfig.data[rowCounter];
                    const requestArgs: object = row;
                    const sanitizedRequestArgs = _.cloneDeep(requestArgs);
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
                    resultArr.push(new Promise<object>((thisResolve, thisReject) =>
                    {
                      winston.info('Request: ' + JSON.stringify(requestArgs));
                      method(requestArgs, (error, result, envelope, soapHeader) =>
                      {
                        if (error)
                        {
                          thisResolve({
                            args: sanitizedRequestArgs, status: 'false',
                            error: _.get(error, 'root.Envelope.Body.Fault.faultstring'),
                          });
                        }
                        else
                        {
                          if (result !== undefined && magentoSourceConfig.url[0]['path'] !== undefined)
                          {
                            const extractedDoc: object = getValueFromDocPath(result, magentoSourceConfig.url[0]['path']);
                            thisResolve({ args: sanitizedRequestArgs, status: extractedDoc, mappedKey });
                          }
                          else
                          {
                            thisResolve({ args: sanitizedRequestArgs, status: result });
                          }
                        }
                      });
                    }));
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
                while (j < 3)
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
                    resultArr.push(new Promise<object>((thisResolve, thisReject) =>
                    {
                      method(requestArgs, (error, result, envelope, soapHeader) =>
                      {
                        // console.log('Response: ' + JSON.stringify(result, null, 2));
                        if (error)
                        {
                          thisResolve({
                            args: sanitizedRequestArgs, status: 'false',
                            error: _.get(error, 'root.Envelope.Body.Fault.faultstring'),
                          });
                        }
                        else
                        {
                          if (result !== undefined && magentoSourceConfig.url[0]['path'] !== undefined)
                          {
                            const extractedDoc: object = getValueFromDocPath(result, magentoSourceConfig.url[0]['path']);
                            thisResolve({ args: sanitizedRequestArgs, status: extractedDoc, mappedKey });
                          }
                          else if (result && result['result'] !== undefined)
                          {
                            thisResolve({ args: sanitizedRequestArgs, status: result['result']['$value'] });
                          }
                          else
                          {
                            thisResolve({ args: sanitizedRequestArgs, status: 'true' });
                          }
                        }
                      });
                    }));
                  }
                  catch (e)
                  {
                    return resolve(((e as any).toString()));
                  }
                  j++;
                }
              }
            }
            const resultObj: object[] = await Promise.all(resultArr);
            // winston.info('Result of Magento request: ' + JSON.stringify(resultObj, null, 2));
            return resolve(resultObj);
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
        if (Array.isArray(origObj[aggParams]))
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
        origObj[aggParam] = objToMerge[aggParam];
      }
    });
    return origObj;
  }
}

export default Magento;
