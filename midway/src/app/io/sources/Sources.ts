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

import * as stream from 'stream';

import { GoogleAnalyticsConfig, GoogleAPI, GoogleSpreadsheetConfig } from './GoogleAPI';
import { Magento, MagentoSourceConfig } from './Magento';
import { Mailchimp, MailchimpSourceConfig } from './Mailchimp';
import { MySQL, MySQLSourceConfig } from './MySQL';

export const googleAPI: GoogleAPI = new GoogleAPI();
export const magento: Magento = new Magento();
export const mailchimp: Mailchimp = new Mailchimp();
export const mySQL: MySQL = new MySQL();

export interface SourceConfig
{
  type: string;
  params: object | object[];
}

export interface ExportSourceConfig
{
  params: object[];
  stream: stream.Readable;
}

export interface ImportSourceConfig
{
  filetype: string;
  params: object;
  stream: stream.Readable;
}

export class Sources
{

  public async handleTemplateExportSource(body: object, readStream: stream.Readable): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      console.log('\n\nABACADABRA 1\\n\n');
      let result = '';
      const exprtSourceConfig: ExportSourceConfig | string =
        {
          params: [],
          stream: readStream,
        };
      console.log('\n\nABACADABRA 2\\n\n');
      const sourceConfig: SourceConfig = body['body']['source'] as SourceConfig;
      console.log('\n\nABACADABRA 3\\n\n');
      exprtSourceConfig.params = sourceConfig.params;
      switch (sourceConfig.type)
      {
        case 'magento':
          result = await this._putJSONStreamIntoMagento(exprtSourceConfig);
          break;
        case 'mailchimp':
          console.log('\n\nABACADABRA 4\\n\n');
          result = await this._putJSONStreamIntoMailchimp(exprtSourceConfig);
          break;
        default:
          break;
      }
      return resolve(result);
    });
  }

  public async handleTemplateImportSource(body: object): Promise<ImportSourceConfig | string>
  {
    return new Promise<ImportSourceConfig | string>(async (resolve, reject) =>
    {
      let imprtSourceConfig: ImportSourceConfig | string =
        {
          filetype: '',
          params: {},
          stream: new stream.PassThrough(),
        };
      const sourceConfig: SourceConfig = body['body']['source'] as SourceConfig;
      switch (sourceConfig.type)
      {
        case 'analytics':
          imprtSourceConfig = await this._getStreamFromGoogleAnalytics(sourceConfig, body['body'], body['templateId']);
          break;
        case 'mysql':
          imprtSourceConfig = await this._getStreamFromMySQL(sourceConfig, body['body'], body['templateId']);
          break;
        case 'magento':
          result = await this._getStreamFromMagento(sourceConfig, body['body'], body['templateId']);
          break;
        case 'spreadsheets':
          imprtSourceConfig = await this._getStreamFromGoogleSpreadsheets(sourceConfig, body['body'], body['templateId']);
          break;
        default:
          break;
      }
      if (typeof imprtSourceConfig === 'string')
      {
        return reject(imprtSourceConfig);
      }
      else
      {
        return resolve(imprtSourceConfig);
      }
    });
  }

  private async _getStreamFromGoogleAnalytics(source: SourceConfig, body: object, templateId?: string): Promise<ImportSourceConfig>
  {
    return new Promise<ImportSourceConfig>(async (resolve, reject) =>
    {
      if (templateId !== undefined)
      {
        body['templateId'] = Number(parseInt(templateId, 10));
      }
      const writeStream = await googleAPI.getAnalytics(source['params']) as stream.Readable;

      delete body['source'];
      body['filetype'] = 'csv';
      const imprtSourceConfig: ImportSourceConfig =
        {
          filetype: 'csv',
          params: body,
          stream: writeStream,
        };
      return resolve(imprtSourceConfig);
    });
  }

  private async _getStreamFromGoogleSpreadsheets(source: SourceConfig, body: object, templateId?: string): Promise<ImportSourceConfig>
  {
    return new Promise<ImportSourceConfig>(async (resolve, reject) =>
    {
      if (templateId !== undefined)
      {
        body['templateId'] = Number(parseInt(templateId, 10));
      }
      const writeStream = await googleAPI.getSpreadsheetValuesAsCSVStream(
        await googleAPI.getSpreadsheets(source['params'] as GoogleSpreadsheetConfig)) as stream.Readable;

      delete body['source'];
      body['filetype'] = 'csv';
      const imprtSourceConfig: ImportSourceConfig =
        {
          filetype: 'csv',
          params: body,
          stream: writeStream,
        };
      return resolve(imprtSourceConfig);
    });
  }

  private async _getStreamFromMagento(source: SourceConfig, body: object, templateId?: string): Promise<ImportSourceConfig | string>
  {
    return new Promise<ImportSourceConfig | string>(async (resolve, reject) =>
    {
      if (templateId !== undefined)
      {
        body['templateId'] = Number(parseInt(templateId, 10));
      }
      const writeStream: stream.Readable | string = await magento._getJSONFromCSV(
        await magento.runQuery(source['params'] as MagentoSourceConfig[]));
      if (typeof writeStream === 'string')
      {
        return resolve(writeStream);
      }

      delete body['source'];
      body['filetype'] = 'json';
      const imprtSourceConfig: ImportSourceConfig =
        {
          filetype: 'json',
          params: body,
          stream: writeStream as stream.Readable,
        };
      return resolve(imprtSourceConfig);
    });
  }

  private async _getStreamFromMySQL(source: SourceConfig, body: object, templateId?: string): Promise<ImportSourceConfig | string>
  {
    return new Promise<ImportSourceConfig | string>(async (resolve, reject) =>
    {
      if (templateId !== undefined)
      {
        body['templateId'] = Number(parseInt(templateId, 10));
      }
      const writeStream: stream.Readable | string = await mySQL.getQueryAsCSVStream(
        await mySQL.runQuery(source['params'] as MySQLSourceConfig));
      if (typeof writeStream === 'string')
      {
        return resolve(writeStream);
      }

      delete body['source'];
      body['filetype'] = 'csv';
      const imprtSourceConfig: ImportSourceConfig =
        {
          filetype: 'csv',
          params: body,
          stream: writeStream as stream.Readable,
        };
      return resolve(imprtSourceConfig);
    });
  }

  // export private methods
  private async _putJSONStreamIntoMagento(exprtSourceConfig: ExportSourceConfig): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      resolve(await magento.runQuery(await magento.getJSONStreamAsMagentoSourceConfig(exprtSourceConfig)));
    });
  }

  private async _putJSONStreamIntoMailchimp(exprtSourceConfig: ExportSourceConfig): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      console.log('inside 1!');
      //resolve('hi');
      try {
        const cfgs: string = await mailchimp.getJSONStreamAsMailchimpSourceConfig(exprtSourceConfig);
        const cfg: MailchimpSourceConfig = {data: [], key: 'f', host: 's'};
        console.log('hgawegwg');
        resolve(await mailchimp.runQuery(cfg));
      }catch(e){
        console.log('e in here');
        console.log(e);
      }
    });
  }
}

export default Sources;
