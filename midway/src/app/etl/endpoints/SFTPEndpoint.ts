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
// tslint:disable:triple-equals

import * as SSH from 'ssh2';
import { Readable, Writable } from 'stream';
import * as winston from 'winston';

import { SinkConfig, SourceConfig } from '../../../../../shared/etl/types/EndpointTypes';
import { TransformationEngine } from '../../../../../shared/transformations/TransformationEngine';
import { Inputs } from '../../../../../shared/util/Inputs';
import IntegrationConfig from '../../integrations/IntegrationConfig';
import { integrations } from '../../integrations/IntegrationRouter';
import AEndpointStream from './AEndpointStream';

export const inputs: Inputs = new Inputs();

export default class SFTPEndpoint extends AEndpointStream
{
  constructor()
  {
    super();
  }

  public async getSource(source: SourceConfig): Promise<Readable[]>
  {
    const genericConfig: object = await this.getIntegrationConfig(source.integrationId);
    if (genericConfig['username'] != null && genericConfig['username'] !== ''
      && genericConfig['password'] != null && genericConfig['password'] != '')
    {
      delete genericConfig['key'];
    }
    else
    {
      // if (genericConfig['username'] !== undefined)
      // {
      //   delete genericConfig['username'];
      // }
      if (genericConfig['password'] !== undefined)
      {
        delete genericConfig['password'];
      }
    }
    if (genericConfig['ip'] !== undefined)
    {
      genericConfig['host'] = genericConfig['ip'];
      delete genericConfig['ip'];
    }

    if (genericConfig['key'] !== undefined)
    {
      let genericConfigPrivateKey: string = '-----BEGIN RSA PRIVATE KEY-----' + ((genericConfig['key'] as string)
        .replace('-----BEGIN RSA PRIVATE KEY-----', '').replace('-----END RSA PRIVATE KEY-----', '')
        .replace(new RegExp('\\s', 'g'), '\n').replace(new RegExp('\\n+', 'g'), '\n') as string) + '-----END RSA PRIVATE KEY-----';
      if (genericConfig['key'].indexOf('BEGIN PRIVATE KEY') !== -1 && genericConfig['key'].indexOf('END PRIVATE KEY') !== -1)
      {
        genericConfigPrivateKey = '-----BEGIN PRIVATE KEY-----' + ((genericConfig['key'] as string)
          .replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '')
          .replace(new RegExp('\\s', 'g'), '\n').replace(new RegExp('\\n+', 'g'), '\n') as string) + '-----END PRIVATE KEY-----';
      }
      genericConfig['privateKey'] = genericConfigPrivateKey;
    }

    const config: SSH.ConnectConfig = genericConfig as SSH.ConnectConfig;
        console.log('EVEN: ',JSON.stringify(config, null, 2));
    const sftp: SSH.SFTPWrapper = await this.getSFTPClient(config);
    return this.getSFTPList(source, sftp);
  }

  public async getSink(sink: SinkConfig, engine?: TransformationEngine): Promise<Writable>
  {
    const genericConfig: object = await this.getIntegrationConfig(sink.integrationId);
    if (genericConfig['username'] != null && genericConfig['username'] !== ''
      && genericConfig['password'] != null && genericConfig['password'] != '')
    {
      delete genericConfig['privateKey'];
    }
    else
    {
      // if (genericConfig['username'] !== undefined)
      // {
      //   delete genericConfig['username'];
      // }
      if (genericConfig['password'] !== undefined)
      {
        delete genericConfig['password'];
      }
    }
    if (genericConfig['ip'] !== undefined)
    {
      genericConfig['host'] = genericConfig['ip'];
      delete genericConfig['ip'];
    }

    const config: SSH.ConnectConfig = genericConfig as SSH.ConnectConfig;
    console.log('ODD: ',JSON.stringify(config, null, 2));
    const sftp: SSH.SFTPWrapper = await this.getSFTPClient(config);
    return sftp.createWriteStream(sink.options['filepath']);
  }

  private async getSFTPClient(sftpConfig: SSH.ConnectConfig): Promise<SSH.SFTPWrapper>
  {
    return new Promise<SSH.SFTPWrapper>((resolve, reject) =>
    {
      const client = new SSH.Client();
      client.on('ready', () =>
      {
        client.sftp((err, sftpClient) =>
        {
          if (err !== null && err !== undefined)
          {
            return reject(err);
          }
          else
          {
            return resolve(sftpClient);
          }
        });
      }).on('error', reject)
        .connect(sftpConfig);
    });
  }

  private async getSFTPList(source: SourceConfig, sftp: SSH.SFTPWrapper): Promise<Readable[]>
  {
    return new Promise<Readable[]>(async (resolve, reject) =>
    {
      const readStreams: Readable[] = [];
      if (Array.isArray(source.rootInputConfig['inputs']))
      {
        const pathToFile: string = source.options['filepath'].substring(0, (source.options['filepath'].lastIndexOf('/') as number) + 1);
        const filesAtPath: string[] = await this._getFilesFromPath(pathToFile, sftp);
        const options =
          {
            filename: source.options['filepath'],
            inputs: source.rootInputConfig['inputs'],
          };

        const filenames: string[] = inputs.parseFilename(filesAtPath, options);
        filenames.forEach(async (filename) =>
        {
          readStreams.push(sftp.createReadStream(filename));
        });
      }
      else
      {
        readStreams.push(sftp.createReadStream(source.options['filepath']));
      }
      resolve(readStreams);
    });
  }

  private async _getFilesFromPath(path: string, sftp: SSH.SFTPWrapper): Promise<string[]>
  {
    return new Promise<string[]>(async (resolve, reject) =>
    {
      const files: string[] = [];
      try
      {
        sftp.readdir(path, (err, list) =>
        {
          if (err)
          {
            winston.warn((err as any).toString() as string);
            return resolve([]);
          }
          else
          {
            list.forEach((file) =>
            {
              if (file['longname'].substring(0, 2) === '-r')
              {
                files.push(file['filename']);
              }
            });
          }
          resolve(files);
        });
      }
      catch (e)
      {
        winston.warn((e as any).toString() as string);
        return resolve([]);
      }
    });
  }
}
