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
import * as winston from 'winston';
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';

import { UserConfig } from '../users/UserRouter';
import * as Util from '../Util';

export interface ImportTemplateBase
{
  // object mapping string (newName) to object (contains "type" field, "innerType" field if array type)
  // supported types: text, byte/short/integer/long/half_float/float/double, boolean, date, array, (null)
  columnTypes: object;
  dbid: number;           // instance id
  dbname: string;         // for elastic, index name
  export?: boolean;       // export type template
  originalNames: string[];    // array of strings (oldName)
  persistentAccessToken?: string;    // persistent access token
  primaryKeyDelimiter?: string;
  primaryKeys: string[];  // newName of primary key(s)
  tablename: string;      // for elastic, type name
  transformations: object[];  // list of in-order data transformations
}

export interface ImportTemplateConfig extends ImportTemplateBase
{
  id?: number;
  name: string;
}

interface ImportTemplateConfigStringified
{
  columnTypes: string;
  dbid: number;
  dbname: string;
  export: boolean;
  id?: number;
  name: string;
  originalNames: string;
  persistentAccessToken?: string;
  primaryKeyDelimiter: string;
  primaryKeys: string;
  tablename: string;
  transformations: string;
}

export interface ExportTemplateConfig extends ImportTemplateBase
{
  id?: number;
  name: string;
  query?: string;
  templateId?: number;
  variantId?: number;
}

export class ImportTemplates
{
  private templateTable: Tasty.Table;

  constructor()
  {
    this.templateTable = new Tasty.Table(
      'importTemplates',
      ['id'],
      [
        'columnTypes',
        'dbid',
        'dbname',
        'export',
        'name',
        'originalNames',
        'persistentAccessToken',
        'primaryKeyDelimiter',
        'primaryKeys',
        'tablename',
        'transformations',
      ],
    );
  }

  public async delete(user: UserConfig, id: number): Promise<ImportTemplateConfig[]>
  {
    return new Promise<ImportTemplateConfig[]>(async (resolve, reject) =>
    {
      const results: ImportTemplateConfig[] = await this.get(id);
      // template id specified but template not found
      if (results.length === 0)
      {
        return reject('Invalid template id passed');
      }

      const deleted: ImportTemplateConfigStringified[] =
        await App.DB.delete(this.templateTable, { id }) as ImportTemplateConfigStringified[];
      resolve(this._parseConfig(deleted) as ImportTemplateConfig[]);
    });
  }

  public async get(id?: number): Promise<ImportTemplateConfig[]>
  {
    const filter: object = (id !== undefined) ? { id } : {};
    return this.select([], filter);
  }

  public async getExport(id?: number): Promise<ImportTemplateConfig[]>
  {
    const filter: object = { export: true };
    if (id !== undefined)
    {
      filter['id'] = id;
    }
    return this.select([], filter);
  }

  public async getImport(id?: number): Promise<ImportTemplateConfig[]>
  {
    const filter: object = { export: false };
    if (id !== undefined)
    {
      filter['id'] = id;
    }
    return this.select([], filter);
  }

  public async loginWithPersistentAccessToken(templateId: number, persistentAccessToken: string): Promise<ImportTemplateConfig[]>
  {
    return this.select([], { id: templateId, persistentAccessToken });
  }

  public async select(columns: string[], filter: object): Promise<ImportTemplateConfig[]>
  {
    return new Promise<ImportTemplateConfig[]>(async (resolve, reject) =>
    {
      const templates: ImportTemplateConfigStringified[] =
        await App.DB.select(this.templateTable, columns, filter) as ImportTemplateConfigStringified[];
      resolve(this._parseConfig(templates) as ImportTemplateConfig[]);
    });
  }

  public async updateAccessToken(user: UserConfig, templateID: number): Promise<ImportTemplateConfig>
  {
    return new Promise<ImportTemplateConfig>(async (resolve, reject) =>
    {
      if (templateID !== undefined)
      {
        const results: ImportTemplateConfig[] = await this.get(templateID);
        // template id specified but template not found
        if (results.length === 0)
        {
          return reject('Invalid template id passed');
        }
        if (user.isSuperUser !== 1)
        {
          return reject('Insufficient Permissions');
        }
        const template: ImportTemplateConfig = results[0] as ImportTemplateConfig;
        template['persistentAccessToken'] = srs({ length: 256 });
        const upserted: ImportTemplateConfigStringified =
          await App.DB.upsert(this.templateTable, this._stringifyConfig(template)) as ImportTemplateConfigStringified;
        resolve(this._parseConfig(upserted) as ImportTemplateConfig);
      }
    });
  }

  public async upsert(user: UserConfig, template: ImportTemplateConfig): Promise<ImportTemplateConfig>
  {
    return new Promise<ImportTemplateConfig>(async (resolve, reject) =>
    {
      if (template.id !== undefined)
      {
        const results: ImportTemplateConfig[] = await this.get(template.id);
        // template id specified but template not found
        if (results.length === 0)
        {
          return reject('Invalid template id passed');
        }

        template = Util.updateObject(results[0], template);
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
      const upserted: ImportTemplateConfigStringified =
        await App.DB.upsert(this.templateTable, this._stringifyConfig(template)) as ImportTemplateConfigStringified;
      resolve(this._parseConfig(upserted) as ImportTemplateConfig);
    });
  }

  private _parseConfig(stringified: ImportTemplateConfigStringified | ImportTemplateConfigStringified[]):
    ImportTemplateConfig | ImportTemplateConfig[]
  {
    if (Array.isArray(stringified))
    {
      return stringified.map((val) => this._parseConfigHelper(val));
    }
    return this._parseConfigHelper(stringified);
  }
  private _parseConfigHelper(stringified: ImportTemplateConfigStringified): ImportTemplateConfig
  {
    const template: ImportTemplateConfig =
      {
        persistentAccessToken: stringified['persistentAccessToken'],
        columnTypes: JSON.parse(stringified['columnTypes']),
        dbid: stringified['dbid'],
        dbname: stringified['dbname'],
        export: stringified['export'],
        id: stringified['id'],
        name: stringified['name'],
        originalNames: JSON.parse(stringified['originalNames']),
        primaryKeyDelimiter: stringified['primaryKeyDelimiter'],
        primaryKeys: JSON.parse(stringified['primaryKeys']),
        tablename: stringified['tablename'],
        transformations: JSON.parse(stringified['transformations']),
      };
    return template;
  }

  private _stringifyConfig(template: ImportTemplateConfig): ImportTemplateConfigStringified
  {
    const stringified: ImportTemplateConfigStringified =
      {
        persistentAccessToken: template['persistentAccessToken'],
        columnTypes: JSON.stringify(template['columnTypes']),
        dbid: template['dbid'],
        dbname: template['dbname'],
        export: template['export'] === true ? true : false,
        id: template['id'],
        name: template['name'],
        originalNames: JSON.stringify(template['originalNames']),
        // hack around silly linter complaint below
        primaryKeyDelimiter: (template['primaryKeyDelimiter'] === undefined ? '-' : template['primaryKeyDelimiter']) as string,
        primaryKeys: JSON.stringify(template['primaryKeys']),
        tablename: template['tablename'],
        transformations: JSON.stringify(template['transformations']),
      };
    return stringified;
  }
}

export default ImportTemplates;
