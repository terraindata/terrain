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

import Bottleneck from 'bottleneck';
import * as _ from 'lodash';
import * as request from 'request';
import { Readable, Writable } from 'stream';
import soap = require('strong-soap');
import * as winston from 'winston';

import { SinkConfig, SourceConfig } from 'shared/etl/types/EndpointTypes';

import
{
  KV,
  MagentoConfig,
  MagentoParamConfigType,
  MagentoParamConfigTypes,
  MagentoParamPayloadTypes,
  MagentoParamTypes,
  MagentoResponse,
  MagentoRoutes,
  MagentoRoutesRaw,
  PartialMagentoConfig,
  WSDLTree,
} from 'shared/etl/types/MagentoTypes';

import { TransformationEngine } from '../../../../../shared/transformations/TransformationEngine';
import DatabaseController from '../../../database/DatabaseController';
import DatabaseRegistry from '../../../databaseRegistry/DatabaseRegistry';
import * as App from '../../App';
import JSONTransform from '../../io/streams/JSONTransform';
import XMLTransform from '../../io/streams/XMLTransform';
import { QueryHandler } from '../../query/QueryHandler';
import AEndpointStream from './AEndpointStream';

/* tslint:disable:max-classes-per-file */

export default class MagentoEndpoint extends AEndpointStream
{
  private wsdlTree: WSDLTree;

  constructor()
  {
    super();
  }

  public async call(magConf: MagentoConfig): Promise<MagentoResponse>
  {
    return new Promise<MagentoResponse>(async (resolve, reject) =>
    {
      const host: string = magConf.host;
      if (this.wsdlTree === undefined)
      {
        await this.getWSDLTree(host);
      }
      let response: MagentoResponse = {} as object;
      let combinedParams: object = Object.assign({}, magConf.params);
      if (typeof magConf.sessionId === 'string' && magConf.sessionId.length > 0)
      {
        combinedParams = Object.assign(combinedParams, { sessionId: magConf.sessionId }); // attach sessionId to the request object
      }

      response = await this._soapCall(MagentoRoutesRaw[magConf.route], host, combinedParams);
      resolve(response);
    });
  }

  public async getSink(sinkConfig: SinkConfig, engine?: TransformationEngine): Promise<Writable>
  {
    const magentoConfig: MagentoConfig = await this._parseConfig(sinkConfig);
    return new MagentoStream(magentoConfig, this);
  }

  public async getSource(sourceConfig: SourceConfig): Promise<Readable>
  {
    return new Promise<Readable>(async (resolve, reject) =>
    {
      const writeStream = JSONTransform.createExportStream();
      const magentoConfig: MagentoConfig = await this._parseConfig(sourceConfig);

      if (magentoConfig.esdbid !== null && magentoConfig.esindex !== null)
      {
        const controller: DatabaseController = await this._getController(magentoConfig.esdbid);
        const qh: QueryHandler = controller.getQueryHandler();
        const payload = {
          database: controller.getID(),
          type: 'search',
          streaming: true,
          body: JSON.stringify(
            {
              query: {
                bool: {
                  filter:
                    [
                      {
                        term: {
                          _index: magentoConfig.esindex,
                        },
                      },
                      {
                        bool: {
                          filter: [],
                          should: [],
                        },
                      },
                    ],
                  should:
                    [
                      {
                        bool: {
                          filter:
                            [
                              {
                                exists: {
                                  field: '_id',
                                },
                              },
                            ],
                          should: [],
                        },
                      },
                    ],
                },
              },
              from: 0,
              track_scores: true,
              _source: true,
              script_fields: {},
              size: 9999,
            }),
        };
        const readStream: Readable = await qh.handleQuery(payload) as Readable;
        let doneReading: boolean = false;

        readStream.on('data', async (data) =>
        {
          if (data['hits'] !== undefined && data['hits']['hits'] !== undefined && Array.isArray(data['hits']['hits']))
          {
            const rows: object[] = data['hits']['hits'].map((hit) => hit['_source']);
            await this.callWithData(magentoConfig, rows, writeStream);
          }
          if (doneReading)
          {
            writeStream.end();
            resolve(writeStream);
          }
        });
        readStream.on('end', () =>
        {
          doneReading = true;
        });
      }
      else
      {
        const parsedResult = await this.call(magentoConfig);
        if (Array.isArray(parsedResult))
        {
          parsedResult.forEach((elem) =>
          {
            writeStream.write(elem);
          });
        }
        else
        {
          writeStream.write(parsedResult);
        }
        writeStream.end();
        resolve(writeStream);
      }
    });
  }

  public async callWithData(magentoConfig: MagentoConfig, rows: object[], writeStream?: Writable): Promise<void>
  {
    return new Promise<void>(async (resolve, reject) =>
    {
      for (let i = 0; i < rows.length; ++i)
      {
        try
        {
          const row = rows[i];
          const payloadType: object = MagentoParamPayloadTypes[magentoConfig.route];
          const newRow: object = {};
          Object.keys(magentoConfig['remapping']).forEach((oldKey) =>
          {
            const newKey = magentoConfig['remapping'][oldKey];
            // TODO: make this more robust
            if (!payloadType['isArray'] && row[oldKey] !== undefined && Array.isArray(row[oldKey]) && magentoConfig.onlyFirst === true)
            {
              try
              {
                newRow[newKey] = row[oldKey][0];
              }
              catch (e1)
              {
                newRow[newKey] = _.cloneDeep(row[oldKey]);
              }
            }
            else
            {
              newRow[newKey] = _.cloneDeep(row[oldKey]);
            }
          });

          if (newRow !== undefined && typeof newRow === 'object' && Array.isArray(Object.keys(newRow)))
          {
            Object.keys(newRow).forEach((nrKey) =>
            {
              magentoConfig.params[nrKey] = newRow[nrKey];
            });
          }

          const parsedResult = await this.call(magentoConfig);
          if (writeStream !== undefined)
          {
            if (parsedResult !== undefined && Array.isArray(parsedResult))
            {
              parsedResult.forEach((elem) =>
              {
                magentoConfig.includedFields.forEach((field) =>
                {
                  elem['original_' + field] = row[field];
                });
                writeStream.write(elem);
              });
            }
            else
            {
              magentoConfig.includedFields.forEach((field) =>
              {
                parsedResult['original_' + field] = row[field];
              });
              writeStream.write(parsedResult);
            }
          }
        }
        catch (e)
        {
          winston.error(e);
        }
      }
      resolve();
    });
  }

  public async getWSDLTree(host): Promise<void>
  {
    return new Promise<void>(async (resolve, reject) =>
    {
      const wsdlPortTypeMessagePrepend = 'typens:';

      let wsdlAsJSON: object = {};
      const wsdlTree: WSDLTree =
      {
        message: {},
        portType: {},
        types: {},
      };
      const wsdlMsg: object = {};
      const wsdlPortType: object = {};

      try
      {
        wsdlAsJSON = await this._getWSDLAsJSON({ host }, { secure: true });
        wsdlAsJSON['message'].forEach((entry) =>
        {
          wsdlMsg[entry['name']] = entry['part'];
        });
        wsdlAsJSON['portType']['operation'].forEach((entry) =>
        {
          const portTypeInput = entry['input']['message'].substring(wsdlPortTypeMessagePrepend.length);
          const portTypeOutput = entry['output']['message'].substring(wsdlPortTypeMessagePrepend.length);

          wsdlPortType[entry['name']] = { input: portTypeInput, output: portTypeOutput };
        });
        wsdlTree.types = {};
        wsdlAsJSON['types']['schema']['complexType'].forEach((entry, i) =>
        {
          wsdlTree.types[entry['name']] = entry;
        });
      }
      catch (e)
      {
        winston.warn((e as any).toString() as string);
      }
      wsdlTree.message = wsdlMsg;
      wsdlTree.portType = wsdlPortType;
      this.wsdlTree = wsdlTree;
      return resolve();
    });
  }

  public async login(endpointConfig: SourceConfig | SinkConfig): Promise<PartialMagentoConfig>
  {
    return new Promise<PartialMagentoConfig>(async (resolve, reject) =>
    {
      const magentoIntegrationConfig: object = await this.getIntegrationConfig(endpointConfig.integrationId) as object;
      const magConf: MagentoConfig =
      {
        esdbid: null,
        esindex: null,
        host: magentoIntegrationConfig['host'],
        includedFields: [],
        onlyFirst: false,
        params: {
          username: magentoIntegrationConfig['username'],
          apiKey: magentoIntegrationConfig['apiKey'],
        },
        remapping: {},
        route: MagentoRoutes.Login,
      };

      try
      {
        const partialMagentoConfig: PartialMagentoConfig =
        {
          host: '',
          sessionId: '',
        };
        partialMagentoConfig.host = magentoIntegrationConfig['host'];
        partialMagentoConfig.sessionId = await this.call(magConf) as string;
        resolve(partialMagentoConfig);
      }
      catch (e)
      {
        resolve(e);
      }
    });
  }

  private _convertArrayToSOAPArray(arr: any[]): object
  {
    return { item: arr };
  }

  private async _getController(id: number | string | null): Promise<DatabaseController>
  {
    let controller: DatabaseController | undefined;
    if (typeof id === 'string')
    {
      controller = DatabaseRegistry.getByName(id);
    }
    else if (typeof id === 'number')
    {
      controller = DatabaseRegistry.get(id);
    }

    if (controller === undefined)
    {
      throw new Error('Database or server id ' + String(id) + ' is invalid.');
    }

    if (controller.getType() !== 'ElasticController')
    {
      throw new Error('Invalid controller for Elastic endpoint');
    }

    return controller;
  }

  private async _getWSDLAsJSON(params, options)
  {
    return new Promise(async (resolve, reject) =>
    {
      const xmlPath = 'definitions';
      const xmlStream = request(params['host']).pipe(XMLTransform.createImportStream(xmlPath));
      let fullData = {};
      xmlStream.on('data', (data) =>
      {
        fullData = data;
      })
        .on('end', () =>
        {
          resolve(fullData);
        });
    });
  }

  private async _parseConfig(sourceConfig: SourceConfig | SinkConfig): Promise<MagentoConfig>
  {
    return new Promise<MagentoConfig>(async (resolve, reject) =>
    {
      const partialMagConf: PartialMagentoConfig = await this.login(sourceConfig);
      const magentoConfig: MagentoConfig =
      {
        esdbid: sourceConfig['options']['esdbid'],
        esindex: sourceConfig['options']['esindex'],
        host: partialMagConf.host,
        includedFields: sourceConfig['options']['includedFields'],
        params: sourceConfig['options']['params'],
        onlyFirst: sourceConfig['options']['onlyFirst'],
        remapping: sourceConfig['options']['remapping'],
        route: sourceConfig['options']['route'],
        sessionId: partialMagConf.sessionId,
      };

      resolve(magentoConfig);
    });
  }

  private _parseJSONWithWSDL(rawJSON: object | object[], name: string): any
  {
    const typeAsArr: string[] = name.split(':');
    if (typeAsArr.length > 1)
    {
      typeAsArr[1] = typeAsArr[1].replace(new RegExp('\\[.*\\]', 'g'), '');
    }

    switch (typeAsArr[0])
    {
      case 'typens':
        const innerType = this.wsdlTree['types'][typeAsArr[1]];
        if (typeof innerType['complexContent'] === 'object')
        {
          const innerTypeType: string = innerType['complexContent']['restriction']['base'];
          if (innerTypeType === 'soapenc:Array')
          {
            if (Array.isArray(rawJSON['item']))
            {
              const rows: any[] = [];
              rawJSON['item'].forEach((rowElem) =>
              {
                rows.push(this._parseJSONWithWSDL(rowElem, innerType['complexContent']['restriction']['attribute']['wsdl:arrayType']));
              });
              rawJSON = rows;
            }
            else if (rawJSON['item'] !== undefined)
            {
              if (rawJSON['item'] === null)
              {
                rawJSON = null;
              }
              else
              {
                rawJSON = [rawJSON['item']['$value']];
              }
            }
            else if (rawJSON['item'] === undefined)
            {
              rawJSON = [];
            }
          }
        }
        else if (typeof innerType['all'] === 'object')
        {
          const row: object = {};
          const innerTypeNames: string[] = innerType['all']['element'].map((innerTypeType) => innerTypeType['name']);
          const rawJSONKeys: string[] = Object.keys(rawJSON).filter((key) => key[0] !== '$');
          const existingFields: string[] = _.intersection(innerTypeNames, rawJSONKeys);
          const filteredInnerTypes = innerType['all']['element'].filter((innerTypeType) =>
            existingFields.indexOf(innerTypeType['name']) !== -1);
          filteredInnerTypes.forEach((innerTypeType) =>
          {
            if (innerTypeType['type'].substr(0, 3) === 'xsd'
              && innerTypeType['type'].indexOf('[') === -1 && innerTypeType['type'].indexOf(']') === -1)
            {
              if (rawJSON[innerTypeType['name']] === null)
              {
                row[innerTypeType['name']] = null;
              }
              else
              {
                row[innerTypeType['name']] = rawJSON[innerTypeType['name']]['$value'];
              }
            }
            else
            {
              row[innerTypeType['name']] = this._parseJSONWithWSDL(rawJSON[innerTypeType['name']], innerTypeType['type']);
            }
          });
          rawJSON = row;
        }
        break;
      case 'xsd':
        if (rawJSON === null)
        {
          rawJSON = null;
        }
        else
        {
          rawJSON = rawJSON['$value'];
        }
        break;
      default:
    }
    return rawJSON;
  }

  private async _rawSoapRequest(params): Promise<any>
  {
    return new Promise<any>(async (resolve, reject) =>
    {
      const options = {};
      soap.soap.createClient(params['host'], options, async (err, client) =>
      {
        if (!err)
        {
          const clientFuncCallFunction = client[params['route']];
          Object.keys(params['params']).forEach((param) =>
          {
            if (Array.isArray(params['params'][param]))
            {
              params['params'][param] = this._convertArrayToSOAPArray(params['params'][param]);
            }
          });
          App.Limiter.submit(clientFuncCallFunction, params['params'], (errLogin, resultLogin, envLogin?, soapHeaderLogin?) =>
          {
            if (!errLogin)
            {
              resolve(resultLogin);
            }
            else
            {
              resolve(new Error(errLogin));
            }
          });
        }
        else
        {
          resolve(new Error('Invalid host parameters.'));
        }
      });
    });
  }

  private async _soapCall(route: string, host: string, data?: any)
  {
    return new Promise(async (resolve, reject) =>
    {
      if (this.wsdlTree === undefined
        || (typeof this.wsdlTree === 'object' && Object.keys(this.wsdlTree).length === 0))
      {
        return resolve({});
      }
      // preprocess data into the correct format via wsdlTree['message'][route]['input'] lookup

      const params = {
        host,
        params: data,
        route,
      };

      const rawResult = await this._rawSoapRequest(params);
      const resultKey = this.wsdlTree['portType'][route]['output'];
      const rawResultKey = this.wsdlTree['message'][resultKey]['name'];
      let parsedResult = null;
      const typeAsArr: string[] = this.wsdlTree['message'][resultKey]['type'].split(':');
      switch (typeAsArr[0])
      {
        case 'xsd':
          if (rawResult[rawResultKey] === null)
          {
            parsedResult = null;
          }
          else
          {
            parsedResult = rawResult[rawResultKey]['$value'];
          }
          break;
        case 'typens':
          parsedResult = this._parseJSONWithWSDL(rawResult[rawResultKey], this.wsdlTree['message'][resultKey]['type']);
          break;
        default:
          break;
      }
      resolve(parsedResult);
    });
  }
}

class MagentoStream extends Writable
{

  private config: MagentoConfig;
  private parent: MagentoEndpoint;
  private batches: object[][];
  private currentBatch: number;
  private batchSize: number;

  constructor(config, parent)
  {
    super({
      objectMode: true,
      highWaterMark: 1024 * 8,
    });
    this.parent = parent;
    this.config = config;
    this.batches = [];
    this.currentBatch = 0;
    this.batchSize = 100;
  }

  public _write(chunk: any, encoding: string, callback: (err?: Error) => void): void
  {
    if (this.batches.length === this.currentBatch)
    {
      this.batches.push([]);
    }
    this.batches[this.currentBatch].push(chunk as object);
    if (this.batches[this.currentBatch].length >= this.batchSize)
    {
      // do the post request
      this.sendToMagento(this.batches[this.currentBatch] as object[], this.currentBatch);
    }
    callback();
  }

  public _final(callback: any)
  {
    this.sendToMagento(this.batches[this.currentBatch] as object[], this.currentBatch);
    callback();
  }

  private sendToMagento(bulk: object[], currBatch)
  {
    this.currentBatch++;
    try
    {
      if (bulk !== undefined)
      {
        this.parent.callWithData(this.config, bulk).then((res) =>
        {
          winston.info('Magento endpoint successfully processed data chunk payload');
        })
          .catch((err) =>
          {
            winston.info('Magento endpoint had an error while processing data chunk payload');
            throw new Error(err);
          });
      }
    }
    catch (e)
    {
      winston.error('Magento endpoint error: ');
      winston.error(e);
    }
  }
}
