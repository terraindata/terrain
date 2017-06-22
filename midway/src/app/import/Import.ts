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

import * as csv from 'csvtojson';
import * as hashObject from 'hash-object';

import ElasticConfig from '../../database/elastic/ElasticConfig';
import ElasticController from '../../database/elastic/ElasticController';
import * as DBUtil from '../../database/Util';
import * as Tasty from '../../tasty/Tasty';
import * as Util from '../Util';

export interface ImportConfig
{
  dsn: string;        // e.g.,'http://127.0.0.1:9200'
  db: string;         // for elastic, index name
  table: string;      // for elastic, type name
  contents: string;   // should parse directly into a JSON object
  dbtype: string;     // e.g., 'elastic'
  filetype: string;   // either 'json' or 'csv'
}

export class Import
{
  public async insert(imprt: ImportConfig): Promise<ImportConfig>
  {
    return new Promise<ImportConfig>(async (resolve, reject) =>
    {
      if (imprt.db === '' || imprt.table === '')
      {
        throw new Error('Index name and document type cannot be empty strings.');
      }
      if (imprt.db !== imprt.db.toLowerCase())
      {
        throw new Error('Index name may not contain uppercase letters.');
      }
      if (!/^[a-z\d].*$/.test(imprt.db))
      {
        throw new Error('Index name must start with a lowercase letter or digit.');
      }
      if (!/^[a-z\d][a-z\d\._\+-]*$/.test(imprt.db))
      {
        throw new Error('Index name may only contain lowercase letters, digits, periods, underscores, dashes, and pluses.');
      }
      if (/^_.*/.test(imprt.table))
      {
        throw new Error('Document type may not start with an underscore.');
      }

      let items: object[];
      try
      {
        items = await this._parseData(imprt);
      } catch (e)
      {
        return reject('Error parsing data: ' + String(e));
      }
      if (items.length === 0)
      {
        return reject('No data provided in file to upload.');
      }
      const columns: string[] = Object.keys(items[0]);

      const insertTable: Tasty.Table = new Tasty.Table(
        imprt.table,
        ['_id'],
        columns,
        imprt.db,
      );

      const elasticConfig: ElasticConfig = DBUtil.DSNToConfig(imprt.dbtype, imprt.dsn) as ElasticConfig;
      const elasticController: ElasticController = new ElasticController(elasticConfig, 0, 'Import');

      resolve(await elasticController.getTasty().upsert(insertTable, items) as ImportConfig);
    });
  }

  private async _parseData(imprt: ImportConfig): Promise<object[]>
  {
    return new Promise<object[]>(async (resolve, reject) =>
    {
      if (imprt.filetype === 'json')
      {
        try
        {
          const items: object[] = JSON.parse(imprt.contents);
          if (!Array.isArray(items))
          {
            return reject('Input JSON file must parse to an array of objects.');
          }
          if (items.length > 0)
          {
            const desiredHash: string = hashObject(Util.getEmptyObject(items[0]));
            for (const obj of items)
            {
              if (hashObject(Util.getEmptyObject(obj)) !== desiredHash)
              {
                return reject('Objects in provided input JSON do not have the same keys and/or types.');
              }
            }
          }
          resolve(items);
        } catch (e)
        {
          return reject('JSON format incorrect: ' + String(e));
        }
      } else if (imprt.filetype === 'csv')
      {
        csv({ flatKeys: true, checkColumn: true }).fromString(imprt.contents).on('end_parsed', (jsonArrObj) =>
        {
          resolve(jsonArrObj);
        }).on('error', (e) =>
        {
          return reject('CSV format incorrect: ' + String(e));
        });
      } else
      {
        return reject('Invalid file-type provided.');
      }
    });
  }
}

export default Import;
