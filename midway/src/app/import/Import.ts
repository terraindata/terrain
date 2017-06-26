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
import * as winston from 'winston';

import DatabaseController from '../../database/DatabaseController';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Tasty from '../../tasty/Tasty';
import * as Util from '../Util';

export interface ImportConfig
{
  dbid: number;       // instance id
  db: string;         // for elastic, index name
  table: string;      // for elastic, type name
  contents: string;   // should parse directly into a JSON object
  filetype: string;   // either 'json' or 'csv'

  // if filetype is 'csv', default is to assume the first line contains headers
  // set this to true if this is not the case
  csvHeaderMissing?: boolean;
  // if filetype is 'json': object mapping string (oldName) to string (newName)
  // if filetype is 'csv': array of strings (newName)
  columnMap: object | string[];
  // if filetype is 'json': object mapping string (oldName) to boolean
  // if filetype is 'csv': array of booleans
  columnsToInclude: object | boolean[];
  // if filetype is 'json': object mapping string (oldName) to string (type)
  // if filetype is 'csv': array of strings (type)
  // supported types: text/number/boolean ; in progress: date/null/object
  columnTypes: object | string[];
  primaryKey: string;  // newName of primary key
}

export class Import
{
  public async upsert(imprt: ImportConfig): Promise<ImportConfig>
  {
    return new Promise<ImportConfig>(async (resolve, reject) =>
    {
      const configError: string = this._verifyConfig(imprt);
      if (configError !== '')
      {
        return reject(configError);
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
      const columns: string[] = this._getArrayFromMap(imprt.columnMap);

      const insertTable: Tasty.Table = new Tasty.Table(
        imprt.table,
        [imprt.primaryKey],
        columns,
        imprt.db,
      );

      const database: DatabaseController | undefined = DatabaseRegistry.get(imprt.dbid);
      if (database === undefined)
      {
        return reject('Database "' + imprt.dbid.toString() + '" not found.');
      }
      if (database.getType() !== 'ElasticController')
      {
        return reject('File import currently is only supported for Elastic databases.');
      }

      resolve(await database.getTasty().upsert(insertTable, items) as ImportConfig);
    });
  }

  // TODO: move into shared Util file
  /* returns an error message if there are any; else returns empty string */
  private _isValidIndexName(name: string): string
  {
    if (name === '')
    {
      return 'Index name cannot be an empty string.';
    }
    if (name !== name.toLowerCase())
    {
      return 'Index name may not contain uppercase letters.';
    }
    if (!/^[a-z\d].*$/.test(name))
    {
      return 'Index name must start with a lowercase letter or digit.';
    }
    if (!/^[a-z\d][a-z\d\._\+-]*$/.test(name))
    {
      return 'Index name may only contain lowercase letters, digits, periods, underscores, dashes, and pluses.';
    }
    return '';
  }
  /* returns an error message if there are any; else returns empty string */
  private _isValidTypeName(name: string): string
  {
    if (name === '')
    {
      return 'Document type cannot be an empty string.';
    }
    if (/^_.*/.test(name))
    {
      return 'Document type may not start with an underscore.';
    }
    return '';
  }

  /* returns an error message if there are any; else returns empty string */
  private _verifyConfig(imprt: ImportConfig): string
  {
    const indexError: string = this._isValidIndexName(imprt.db);
    if (indexError !== '')
    {
      return indexError;
    }
    const typeError: string = this._isValidTypeName(imprt.table);
    if (typeError !== '')
    {
      return typeError;
    }

    if (imprt.filetype !== 'csv')
    {
      imprt.csvHeaderMissing = false;
      const cmNames: string = JSON.stringify(Object.keys(imprt.columnMap).sort());
      const ctiNames: string = JSON.stringify(Object.keys(imprt.columnsToInclude).sort());
      const ctNames: string = JSON.stringify(Object.keys(imprt.columnTypes).sort());
      if (cmNames !== ctiNames || cmNames !== ctNames)
      {
        return 'List of names in columnMap, columnsToInclude, and columnTypes do not match.';
      }
    } else
    {
      if (imprt.csvHeaderMissing === undefined)
      {
        imprt.csvHeaderMissing = false;
      }
      if (!Array.isArray(imprt.columnMap) || !Array.isArray(imprt.columnsToInclude) || !Array.isArray(imprt.columnTypes))
      {
        return 'When uploading a CSV file, columnMap, columnsToInclude, and columnTypes should be arrays.';
      }
      if (imprt.columnMap.length !== imprt.columnsToInclude.length || imprt.columnMap.length !== imprt.columnTypes.length)
      {
        return 'Lengths of columnMap, columnsToInclude, and columnTypes do not match.';
      }
    }
    const columns: string[] = this._getArrayFromMap(imprt.columnMap);
    if (columns.indexOf(imprt.primaryKey) === -1)
    {
      return 'A column to be uploaded must be specified as the primary key.';
    }
    if (columns.indexOf('') !== -1)
    {
      return 'The empty string is not a valid column name.';
    }
    const columnTypes: string[] = this._getArrayFromMap(imprt.columnTypes);
    if (columnTypes.some((val, ind, arr) =>
    {
      return val !== 'text' && val !== 'number' && val !== 'boolean';
    }))
    {
      return 'Invalid data type encountered.';
    }
    return '';
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
            const desiredHash: string = this._buildDesiredHash(imprt.columnTypes);
            if (!this._checkHash(items, desiredHash))
            {
              return reject('Objects in provided input JSON do not match the specified keys and/or types.');
            }

            for (const oldName in imprt.columnMap)
            {
              if (imprt.columnMap.hasOwnProperty(oldName))
              {
                if (!imprt.columnsToInclude[oldName])
                {
                  delete imprt.columnMap[oldName];
                }
              }
            }

            // NOTE: rebuilds the entire object to handle renaming of fields ; depending on how many fields we expect
            // to be renamed, this could be much slower than directly deleting and updating fields
            const renamedItems: object[] = items.map((obj) =>
            {
              const renamedObj: object = {};
              for (const oldName in imprt.columnMap)
              {
                if (imprt.columnMap.hasOwnProperty(oldName))
                {
                  renamedObj[imprt.columnMap[oldName]] = obj[oldName];
                }
              }
              return renamedObj;
            });
            resolve(renamedItems);
          } else
          {
            resolve(items);
          }
        } catch (e)
        {
          return reject('JSON format incorrect: ' + String(e));
        }
      } else if (imprt.filetype === 'csv')
      {
        const columnIndicesToInclude: number[] = (imprt.columnsToInclude as boolean[]).reduce((res, val, ind) =>
        {
          if (val)
          {
            res.push(ind);
          }
          return res;
        }, [] as number[]);
        const columnParsers: object = {};
        (imprt.columnTypes as string[]).forEach((val, ind) =>
        {
          if (val === 'number')
          {
            columnParsers[imprt.columnMap[ind]] = 'number';
          } else if (val === 'boolean')
          {
            columnParsers[imprt.columnMap[ind]] = (item, head, resultRow, row, colIdx) =>
            {
              if (item === 'true')
              {
                return true;
              } else if (item === 'false')
              {
                return false;
              } else
              {
                return '';   // type error that will be caught in post-processing
              }
            };
          }
        });
        csv({
          flatKeys: true,
          checkColumn: true,
          noheader: imprt.csvHeaderMissing,
          headers: imprt.columnMap as string[],
          includeColumns: columnIndicesToInclude,
          colParser: columnParsers,
        }).fromString(imprt.contents).on('end_parsed', (jsonArrObj) =>
        {
          const nameToType: object = {};
          (imprt.columnMap as string[]).forEach((val, ind) =>
          {
            if (imprt.columnsToInclude[ind])
            {
              nameToType[val] = imprt.columnTypes[ind];
            }
          });
          if (this._checkHash(jsonArrObj, this._buildDesiredHash(nameToType)))
          {
            resolve(jsonArrObj);
          } else
          {
            return reject('Objects in provided input CSV do not match the specified keys and/or types.');
          }
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
  /* constructs an empty object with the specified field names and types, and returns its hash
     nameToType: maps field name (string) to type (string) */
  private _buildDesiredHash(nameToType: object): string
  {
    const obj: object = {};
    for (const name in nameToType)
    {
      if (nameToType.hasOwnProperty(name))
      {
        if (nameToType[name] === 'number')
        {
          obj[name] = 0;
        } else if (nameToType[name] === 'boolean')
        {
          obj[name] = false;
        } else
        {
          obj[name] = '';
        }
      }
    }
    return hashObject(Util.getEmptyObject(obj));
  }
  /* true if all items in "items," when emptied, hash to "targetHash"; else false */
  private _checkHash(items: object[], targetHash: string): boolean
  {
    for (const obj of items)
    {
      if (hashObject(Util.getEmptyObject(obj)) !== targetHash)
      {
        return false;
      }
    }
    return true;
  }

  private _getArrayFromMap(mapOrArray: object | string[]): string[]
  {
    let array: string[];
    if (Array.isArray(mapOrArray))
    {
      return array = mapOrArray;
    } else
    {
      array = Object.keys(mapOrArray).map((key) => mapOrArray[key]);
    }
    return array;
  }
}

export default Import;
