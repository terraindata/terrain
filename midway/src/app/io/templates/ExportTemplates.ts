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

import * as srs from 'secure-random-string';
import * as Tasty from '../../../tasty/Tasty';
import * as App from '../../App';

import * as Util from '../../Util';

import UserConfig from '../../users/UserConfig';
import ExportTemplateBaseStringified from './ExportTemplateBaseStringified';
import ExportTemplateConfig from './ExportTemplateConfig';
import { TemplateBase } from './TemplateBase';
import { TemplateBaseStringified } from './TemplateBaseStringified';

export class ExportTemplates
{
  private exportTemplateTable: Tasty.Table;

  constructor()
  {
    this.exportTemplateTable = new Tasty.Table(
      'exportTemplates',
      ['id'],
      [
        'columnTypes',
        'dbid',
        'dbname',
        'name',
        'objectKey',
        'originalNames',
        'persistentAccessToken',
        'primaryKeyDelimiter',
        'primaryKeys',
        'rank',
        'tablename',
        'transformations',
      ],
    );
  }

  public async delete(user: UserConfig, id: number): Promise<ExportTemplateConfig[]>
  {
    return new Promise<ExportTemplateConfig[]>(async (resolve, reject) =>
    {
      const results: ExportTemplateConfig[] = await this.get(id);
      // template id specified but template not found
      if (results.length === 0)
      {
        return reject('Invalid template id passed');
      }

      const deleted: ExportTemplateBaseStringified[] =
        await App.DB.delete(this.exportTemplateTable, { id }) as ExportTemplateBaseStringified[];
      resolve(this._parseConfig(deleted) as ExportTemplateConfig[]);
    });
  }

  public async get(id?: number): Promise<ExportTemplateConfig[]>
  {
    const filter: object = { export: true };
    if (id !== undefined)
    {
      filter['id'] = id;
    }
    return this.select([], filter);
  }

  public async loginWithPersistentAccessToken(templateId: number, persistentAccessToken: string): Promise<ExportTemplateConfig[]>
  {
    return this.select([], { id: templateId, persistentAccessToken });
  }

  public async select(columns: string[], filter: object): Promise<ExportTemplateConfig[]>
  {
    return new Promise<ExportTemplateConfig[]>(async (resolve, reject) =>
    {
      const rawResults = await App.DB.select(this.exportTemplateTable, columns, filter);
      const results: ExportTemplateConfig[] = rawResults.map((result: object) => new ExportTemplateConfig(result));
      resolve(this._parseConfig(results.map((result) => new ExportTemplateBaseStringified(result))) as ExportTemplateConfig[]);
    });
  }

  public async updateAccessToken(user: UserConfig, templateID: number): Promise<ExportTemplateConfig>
  {
    return new Promise<ExportTemplateConfig>(async (resolve, reject) =>
    {
      if (templateID !== undefined)
      {
        const results: ExportTemplateConfig[] = await this.get(templateID);
        // template id specified but template not found
        if (results.length === 0)
        {
          return reject('Invalid template id passed');
        }
        if (!user.isSuperUser)
        {
          return reject('Insufficient Permissions');
        }
        const template: ExportTemplateConfig = results[0] as ExportTemplateConfig;
        template['persistentAccessToken'] = srs({ length: 256 });
        const upserted: ExportTemplateBaseStringified =
          await App.DB.upsert(this.exportTemplateTable, this._stringifyConfig(template)) as ExportTemplateBaseStringified;
        resolve(this._parseConfig(upserted) as ExportTemplateConfig);
      }
    });
  }

  public async upsert(user: UserConfig, template: ExportTemplateConfig): Promise<ExportTemplateConfig>
  {
    return new Promise<ExportTemplateConfig>(async (resolve, reject) =>
    {
      if (template.id !== undefined)
      {
        const results: ExportTemplateConfig[] = await this.get(template.id);
        // template id specified but template not found
        if (results.length === 0)
        {
          return reject('Invalid template id passed');
        }

        template = Util.updateObject(results[0], template);
      }
      else
      {
        const results: ExportTemplateConfig[] = await this.select(['id'], []);
        template.id = results.length + 1;
      }
      if (template['persistentAccessToken'] === undefined || template['persistentAccessToken'] === '')
      {
        const persistentAccessToken = srs(
          {
            length: 256,
          },
        );
        template['persistentAccessToken'] = persistentAccessToken;
      }
      const upserted: ExportTemplateBaseStringified =
        await App.DB.upsert(this.exportTemplateTable, this._stringifyConfig(template)) as ExportTemplateBaseStringified;
      resolve(this._parseConfig(upserted) as ExportTemplateConfig);
    });
  }

  private _parseConfig(stringified: ExportTemplateBaseStringified | ExportTemplateBaseStringified[]):
    ExportTemplateConfig | ExportTemplateConfig[]
  {
    if (Array.isArray(stringified))
    {
      return stringified.map((val) => this._parseConfigHelper(val));
    }
    return this._parseConfigHelper(stringified);
  }

  private _parseConfigHelper(stringified: ExportTemplateBaseStringified): ExportTemplateConfig
  {
    const objKeys = ['columnTypes', 'originalNames', 'primaryKeys', 'transformations'];
    for (const objKey of objKeys)
    {
      if (stringified[objKey] === '')
      {
        stringified[objKey] = '{}';
      }
    }
    const template: ExportTemplateConfig =
      {
        persistentAccessToken: stringified['persistentAccessToken'],
        columnTypes: JSON.parse(stringified['columnTypes']),
        dbid: stringified['dbid'],
        dbname: stringified['dbname'],
        id: stringified['id'],
        name: stringified['name'],
        objectKey: stringified['objectKey'] !== undefined ? stringified['objectKey'] : '',
        originalNames: JSON.parse(stringified['originalNames']),
        primaryKeyDelimiter: stringified['primaryKeyDelimiter'],
        primaryKeys: JSON.parse(stringified['primaryKeys']),
        rank: stringified['rank'] !== undefined ? stringified['rank'] : false,
        tablename: stringified['tablename'],
        transformations: JSON.parse(stringified['transformations']),
      };
    return template;
  }

  private _stringifyConfig(template: ExportTemplateConfig): ExportTemplateBaseStringified
  {
    const stringified: ExportTemplateBaseStringified =
      {
        persistentAccessToken: template['persistentAccessToken'],
        columnTypes: JSON.stringify(template['columnTypes']),
        dbid: template['dbid'],
        dbname: template['dbname'],
        id: template['id'],
        name: template['name'],
        objectKey: template['objectKey'] !== undefined ? template['objectKey'] : '',
        originalNames: JSON.stringify(template['originalNames']),
        // hack around silly linter complaint below
        primaryKeyDelimiter: (template['primaryKeyDelimiter'] === undefined ? '-' : template['primaryKeyDelimiter']) as string,
        primaryKeys: JSON.stringify(template['primaryKeys']),
        rank: template['rank'] !== undefined ? template['rank'] : false,
        tablename: template['tablename'],
        transformations: JSON.stringify(template['transformations']),
      };
    return stringified;
  }
}

export default ExportTemplates;
