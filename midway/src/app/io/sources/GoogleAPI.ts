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

import * as googleoauthjwt from 'google-oauth-jwt';
import * as _ from 'lodash';
import * as stream from 'stream';
import * as winston from 'winston';

import { CredentialConfig } from '../../credentials/CredentialConfig';
import Credentials from '../../credentials/Credentials';
import CSVExportTransform from '../streams/CSVExportTransform';

export const credentials: Credentials = new Credentials();
export const request = googleoauthjwt.requestWithJWT();

export interface GoogleSpreadsheetConfig
{
  credentialId: number;
  id: string;
  name: string;
  range: string;
}

export class GoogleAPI
{
  private storedEmail: string;
  private storedKeyFilePath: string;

  public async getSpreadsheets(spreadsheet: GoogleSpreadsheetConfig): Promise<any>
  {
    return new Promise<any>(async (resolve, reject) =>
    {
      if (this.storedEmail === undefined && this.storedKeyFilePath === undefined)
      {
        await this._getStoredGoogleAPICredentials(spreadsheet.credentialId, 'spreadsheets');
      }
      request({
        url: 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheet.id + '/values/' + spreadsheet.name + '!' + spreadsheet.range,
        jwt: {
          email: this.storedEmail,
          key: this.storedKeyFilePath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        },
      }, (err, res, body) =>
        {
          try
          {
            const bodyObj = JSON.parse(body);
            resolve(bodyObj['values']);
          }
          catch (e)
          {
            winston.info('Potentially incorrect credentials. Caught error: ' + (e.toString() as string));
            reject('Potentially incorrect Google API credentials.');
          }
        });
    });
  }

  public async getSpreadsheetValuesAsCSVStream(values: any): Promise<stream.Readable>
  {
    return new Promise<stream.Readable>(async (resolve, reject) =>
    {
      const writer = new CSVExportTransform(values[0]);
      if (values.length > 0)
      {
        for (let i = 1; i < values.length; ++i)
        {
          writer.write(_.zipObject(values[0], values[i]));
        }
      }
      writer.end();
      resolve(writer);
    });
  }

  private async _getStoredGoogleAPICredentials(id: number, type: string)
  {
    const creds: CredentialConfig[] = await credentials.get(id, type);
    if (creds.length === 0)
    {
      winston.info('No credential found for type ' + type + '.');
    }
    else
    {
      const cred: object = JSON.parse(creds[0].meta);
      this.storedEmail = cred['storedEmail'];
      this.storedKeyFilePath = cred['storedKeyFilePath'];
    }
  }
}

export default GoogleAPI;
