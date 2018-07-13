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

import srs = require('secure-random-string');

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import * as Util from '../AppUtil';

import APIKeyConfig from './APIKeyConfig';

export class APIKeys
{
  private apiKeyTable: Tasty.Table;

  public initialize()
  {
    this.apiKeyTable = App.TBLS.apiKeys;
  }

  public async validate(key: string): Promise<APIKeyConfig | null>
  {
    const results: APIKeyConfig[] = await this.select([], { key }) as APIKeyConfig[];
    if (results.length > 0 && results[0]['enabled'])
    {
      return results[0];
    }
    else
    {
      return null;
    }
  }

  public async create(): Promise<APIKeyConfig>
  {
    try
    {
      const cfg: APIKeyConfig = {
        key: srs({ length: 20, alphanumeric: true }),
        createdAt: new Date(Date.now()),
        enabled: true,
      };

      return this.upsert(cfg);
    }
    catch (e)
    {
      throw new Error('Problem creating default API key: ' + String(e));
    }
  }

  public async delete(key: string): Promise<object>
  {
    return App.DB.delete(this.apiKeyTable, { key } as APIKeyConfig);
  }

  public async select(columns: string[], filter?: object): Promise<APIKeyConfig[]>
  {
    return App.DB.select(this.apiKeyTable, columns, filter) as Promise<APIKeyConfig[]>;
  }

  public async get(key: string, fields?: string[]): Promise<APIKeyConfig[]>
  {
    if (key !== undefined)
    {
      if (fields !== undefined)
      {
        return this.select(fields, { key });
      }
      return this.select([], { key });
    }
    if (fields !== undefined)
    {
      return this.select(fields, {});
    }
    return this.select([], {});
  }

  public async upsert(apikey: APIKeyConfig): Promise<APIKeyConfig>
  {
    if (apikey.key !== undefined)
    {
      const results: APIKeyConfig[] = await this.get(apikey.key);
      if (results.length !== 0)
      {
        apikey = Util.updateObject(results[0], apikey);
      }
    }
    return App.DB.upsert(this.apiKeyTable, apikey) as Promise<APIKeyConfig>;
  }
}

export default APIKeys;
