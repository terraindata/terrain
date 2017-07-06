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

import sha1 = require('sha1');

import * as csv from 'csvtojson';
import * as winston from 'winston';

import DatabaseController from '../../database/DatabaseController';
import * as DBUtil from '../../database/Util';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Tasty from '../../tasty/Tasty';

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
  // if filetype is 'json': object mapping string (oldName) to object (contains "type" field)
  // if filetype is 'csv': array of objects (contains "type" field)
  // supported types: text, byte/short/integer/long/half_float/float/double, boolean, date, array, (null)
  columnTypes: object | object[];
  primaryKey: string;  // newName of primary key
}

export class Import
{
  private compatibleTypes: object =
  {
    text: new Set(['text']),
    byte: new Set(['text', 'byte', 'short', 'integer', 'long', 'half_float', 'float', 'double']),
    short: new Set(['text', 'short', 'integer', 'long', 'float', 'double']),
    integer: new Set(['text', 'integer', 'long', 'double']),
    long: new Set(['text', 'long']),
    half_float: new Set(['text', 'half_float', 'float', 'double']),
    float: new Set(['text', 'float', 'double']),
    double: new Set(['text', 'double']),
    boolean: new Set(['text', 'boolean']),
    date: new Set(['text', 'date']),
    // object: new Set(['object', 'nested']),
    // nested: new Set(['nested']),
  };
  // private maxValues: object =
  // {
  //   byte: Math.pow(2, 7),
  //   short: Math.pow(2, 15),
  //   integer: Math.pow(2, 31),
  //   long: Math.pow(2, 63),
  //   half_float: Math.pow(2, 11),
  //   float: Math.pow(2, 24),
  //   double: Math.pow(2, 53),
  // };
  private supportedColumnTypes: Set<string> = new Set(Object.keys(this.compatibleTypes).concat(['array']));
  private numericTypes: Set<string> = new Set(['byte', 'short', 'integer', 'long', 'half_float', 'float', 'double']);

  public async upsert(imprt: ImportConfig): Promise<ImportConfig>
  {
    return new Promise<ImportConfig>(async (resolve, reject) =>
    {
      const database: DatabaseController | undefined = DatabaseRegistry.get(imprt.dbid);
      if (database === undefined)
      {
        return reject('Database "' + imprt.dbid.toString() + '" not found.');
      }
      if (database.getType() !== 'ElasticController')
      {
        return reject('File import currently is only supported for Elastic databases.');
      }

      const configError: string = this._verifyConfig(imprt);
      if (configError !== '')
      {
        return reject(configError);
      }
      const expectedMapping: object = this._getMappingForSchema(imprt);
      const mappingForSchema: object | string =
        this._checkMappingAgainstSchema(expectedMapping, await database.getTasty().schema(), imprt.db);
      if (typeof mappingForSchema === 'string')
      {
        return reject(mappingForSchema);
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
      const columns: string[] = Object.keys(this._includedNamesToType(imprt));
      winston.info('got parsed data!');
      winston.info(JSON.stringify(items));

      const insertTable: Tasty.Table = new Tasty.Table(
        imprt.table,
        [imprt.primaryKey],
        columns,
        imprt.db,
        mappingForSchema,
      );
      await database.getTasty().getDB().putMapping(insertTable);

      winston.info('about to upsert via tasty...');
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
    const nameToType: object = this._includedNamesToType(imprt);
    const columnList: string[] = Object.keys(nameToType);
    const columns: Set<string> = new Set(columnList);
    if (columns.size !== columnList.length)
    {
      return 'Provided column names must be distinct.';
    }
    if (!columns.has(imprt.primaryKey))
    {
      return 'A column to be included in the uploaded must be specified as the primary key.';
    }
    if (columns.has(''))
    {
      return 'The empty string is not a valid column name.';
    }
    // const columnTypes: string[] = this._getArrayFromMap(nameToType);
    const columnTypes: string[] = columnList.map((val) => nameToType[val]['type']);
    if (columnTypes.some((val, ind, arr) =>
    {
      return !(this.supportedColumnTypes.has(val));
    }))
    {
      return 'Invalid data type encountered.';
    }
    return '';
  }
  // filter out values that already exist (and don't need to be inserted) ; return error if there is one
  private _checkMappingAgainstSchema(mapping: object, schema: Tasty.Schema, database: string): object | string
  {
    if (schema.databaseNames().indexOf(database) === -1)
    {
      return mapping;
    }
    // check for conflicts with existing mapping
    const fieldsToCheck: Set<string> = new Set(Object.keys(mapping['properties']));
    for (const table of schema.tableNames(database))
    {
      const fields: object = schema.fields(database, table);
      for (const field in fields)
      {
        if (fields.hasOwnProperty(field) && fieldsToCheck.has(field))
        {
          winston.info('...schema for field...');
          winston.info(JSON.stringify(fields[field]));
          if (this._isCompatibleType(mapping['properties'][field], fields[field]))
          {
            fieldsToCheck.delete(field);
            delete mapping['properties'][field];
          }
          else
          {
            return 'Type mismatch for field ' + field + '. Cannot cast "' +
              this._getESType(mapping['properties'][field]) + '" to "' + String(fields[field]['type']) + '".';
          }
        }
      }
    }
    return mapping;
  }
  // start with mapping from import config, check against existing schema
  // build object representing expected mapping
  private _getMappingForSchema(imprt: ImportConfig): object
  {
    const nameToType: object = this._includedNamesToType(imprt);
    // create mapping containing new fields
    const mapping: object = {};
    Object.keys(nameToType).forEach((val) =>
    {
      // mapping[val] = this._formatTypeForMapping(nameToType[val]);
      mapping[val] = this._getESType(nameToType[val]);
    });
    return DBUtil.constructESMapping(mapping);
  }
  // proposed: contains "type" field (string), and "innerType" field (object) in the case of array/object types
  // existing: field specification from ES mapping (contains "type" field (string), "properties" field (in the case of objects))
  private _isCompatibleType(proposed: object, existing: object, withinArray: boolean = false): boolean
  {
    const proposedType: string = this._getESType(proposed);
    return this.compatibleTypes[proposedType] !== undefined && this.compatibleTypes[proposedType].has(existing['type']);
  }
  // typeObject: contains "type" field (string), and "innerType" field (object) in the case of array/object types
  private _getESType(typeObject: object, withinArray: boolean = false): string
  {
    switch (typeObject['type'])
    {
      case 'array':
        return this._getESType(typeObject['innerType'], true);
      // case 'object':
      //     return withinArray ? 'nested' : 'object';
      default:
        return typeObject['type'];
    }
  }
  // typeObject: contains "type" field (string), and "innerType" field (object) in the case of array/object types
  // returns: type (string or object (in the case of "object"/"nested" type)
  // private _formatTypeForMapping(typeObject: object): string | object
  // {
  //     const esType: string = this._getESType(typeObject);
  //     if (esType !== 'object' && esType !== 'nested')
  //     {
  //         return esType;
  //     }
  //     const mappingType: object = {};
  //     if (esType === 'nested')
  //     {
  //         mappingType['__isNested__'] = true;
  //     }
  //     let innerObject: object = typeObject;
  //     while (innerObject['type'] === 'array')
  //     {
  //         innerObject = innerObject['innerType'];
  //     }
  //     if (innerObject['type'] !== 'object')
  //     {
  //         throw new Error('Improperly formatted type encountered while translating for schema.');
  //     }
  //     Object.keys(innerObject).forEach((key) =>
  //     {
  //         mappingType[key] = this._formatTypeForMapping(innerObject[key]);
  //     });
  //     return mappingType;
  // }

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
            // parse dates
            const dateColumns: string[] = [];
            for (const colName in imprt.columnTypes)
            {
              if (imprt.columnTypes.hasOwnProperty(colName) && imprt.columnTypes[colName]['type'] === 'date')
              {
                dateColumns.push(colName);
              }
            }
            if (dateColumns.length > 0)
            {
              items.forEach((item) =>
              {
                dateColumns.forEach((colName) =>
                {
                  const date: number = Date.parse(item[colName]);
                  if (!isNaN(date))
                  {
                    item[colName] = new Date(date);
                  }
                });
              });
            }

            const typeError: string = this._checkTypes(items, imprt.columnTypes);
            if (typeError !== '')
            {
              return reject('Objects in provided input JSON do not match the specified keys and/or types: ' + typeError);
            }

            for (const oldName in imprt.columnMap)
            {
              if (imprt.columnMap.hasOwnProperty(oldName) && !imprt.columnsToInclude[oldName])
              {
                delete imprt.columnMap[oldName];
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
        const columnParsers: object = this._buildCSVColumnParsers(imprt);
        csv({
          flatKeys: true,
          checkColumn: true,
          noheader: imprt.csvHeaderMissing,
          headers: imprt.columnMap as string[],
          includeColumns: columnIndicesToInclude,
          colParser: columnParsers,
        }).fromString(imprt.contents).on('end_parsed', (jsonArrObj) =>
        {
          winston.info('hello');
          winston.info(JSON.stringify(jsonArrObj));
          const nameToType: object = this._includedNamesToType(imprt);
          winston.info('about to start check');
          const typeError: string = this._checkTypes(jsonArrObj, nameToType);
          if (typeError === '')
          {
            winston.info('finished check');
            resolve(jsonArrObj);
          } else
          {
            return reject('Objects in provided input CSV do not match the specified keys and/or types: ' + typeError);
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
  private _buildCSVColumnParsers(imprt: ImportConfig): object
  {
    const columnParsers: object = {};
    (imprt.columnTypes as object[]).map((val) => this._getESType(val)).forEach((val, ind) =>
    {
      switch (val)
      {
        case 'text':
          columnParsers[imprt.columnMap[ind]] = 'string';
          break;
        case 'number':
          columnParsers[imprt.columnMap[ind]] = (item) =>
          {
            const num: number = Number(item);
            if (!isNaN(num))
            {
              return num;
            }
            if (item === '')
            {
              return null;
            }
            return '';   // type error that will be caught in post-processing
          };
          break;
        case 'boolean':
          columnParsers[imprt.columnMap[ind]] = (item) =>
          {
            if (item === 'true')
            {
              return true;
            }
            if (item === 'false')
            {
              return false;
            }
            if (item === '')
            {
              return null;
            }
            return '';   // type error that will be caught in post-processing
          };
          break;
        case 'date':
          columnParsers[imprt.columnMap[ind]] = (item) =>
          {
            const date: number = Date.parse(item);
            if (!isNaN(date))
            {
              return new Date(date);
            }
            if (item === '')
            {
              return null;
            }
            return '';   // type error that will be caught in post-processing
          };
          break;
        default:  // "array" and "object" cases
          columnParsers[imprt.columnMap[ind]] = (item) =>
          {
            if (item === '')
            {
              return null;
            }
            try
            {
              winston.info('attempting to parse: ' + String(item));
              return JSON.parse(item);
            } catch (e)
            {
              return '';   // type error that will be caught in post-processing
            }
          };
      }
    });
    return columnParsers;
  }

  /* checks whether all objects in "items" have the fields and types specified by nameToType
   * returns an error message if there is one; else returns empty string
   * nameToType: maps field name (string) to object (contains "type" field (string)) */
  private _checkTypes(items: object[], nameToType: object): string
  {
    const targetHash: string = this._buildDesiredHash(nameToType);
    const targetKeys: string = JSON.stringify(Object.keys(nameToType).sort());

    let ind: number = 0;
    for (const obj of items)
    {
      if (this._hashObjectStructure(obj) === targetHash)
      {
        winston.info('checktypes: hash matches');
        ind++;
        continue;
      }
      if (JSON.stringify(Object.keys(obj).sort()) !== targetKeys)
      {
        return 'Object number ' + String(ind) + ' does not have the set of specified keys.';
      }
      for (const key in obj)
      {
        if (obj.hasOwnProperty(key) && obj[key] !== null)
        {
          const thisType: string = this._getType(obj[key]);
          if (thisType === 'number' && this.numericTypes.has(nameToType[key]['type']))
          {
            continue;
          }
          if (nameToType[key]['type'] !== thisType)
          {
            return 'Field "' + key + '" of object number ' + String(ind) +
              ' does not match the specified type: ' + String(nameToType[key]['type']);
          }
          if (thisType === 'array')
          {
            // TODO: (recursively) check all array elements are of the same type, and the correct one
          }
        }
      }
      ind++;
    }
    return '';
  }
  /* return the target hash an object with the specified field names and types should have
   * nameToType: maps field name (string) to object (contains "type" field (string)) */
  private _buildDesiredHash(nameToType: object): string
  {
    let strToHash: string = 'object';
    const nameToTypeArr: string[] = Object.keys(nameToType).sort();
    nameToTypeArr.forEach((name) =>
    {
      strToHash += '|' + name + ':' + this._buildDesiredHashHelper(nameToType[name]) + '|';
    });
    return sha1(strToHash);
  }
  private _buildDesiredHashHelper(typeObj: object): string
  {
    if (this.numericTypes.has(typeObj['type']))
    {
      return 'number';
    }
    if (typeObj['type'] === 'array')
    {
      return 'array-' + this._buildDesiredHashHelper(typeObj['innerType']);
    }
    return typeObj['type'];
  }
  // TODO: merge with jason's copy in shared util
  /* returns a hash based on the object's field names and data types
   * handles object fields recursively ; only checks the type of the first element of arrays */
  private _hashObjectStructure(payload: object): string
  {
    return sha1(this._getObjectStructureStr(payload));
  }
  private _getObjectStructureStr(payload: object): string
  {
    let structStr: string = this._getType(payload);
    if (structStr === 'object')
    {
      structStr = Object.keys(payload).sort().reduce((res, item) =>
      {
        res += '|' + item + ':' + this._getObjectStructureStr(payload[item]) + '|';
        return res;
      },
        structStr);
    }
    else if (structStr === 'array')
    {
      if (Object.keys(structStr).length > 0)
      {
        structStr += '-' + this._getObjectStructureStr(payload[0]);
      }
      else
      {
        structStr += '-empty';
      }
    }
    return structStr;
  }
  private _getType(obj: object): string
  {
    if (typeof obj === 'object')
    {
      if (obj === null)
      {
        return 'null';
      }
      if (obj instanceof Date)
      {
        return 'date';
      }
      if (Array.isArray(obj))
      {
        return 'array';
      }
    }
    if (typeof obj === 'string')
    {
      return 'text';
    }
    // handles "number", "boolean", "object", and "undefined" cases
    return typeof obj;
  }

  // private _getArrayFromMap(mapOrArray: object | string[]): string[]
  // {
  //   let array: string[];
  //   if (Array.isArray(mapOrArray))
  //   {
  //     return array = mapOrArray;
  //   } else
  //   {
  //     array = Object.keys(mapOrArray).map((key) => mapOrArray[key]);
  //   }
  //   return array;
  // }
  private _includedNamesToType(imprt: ImportConfig): object
  {
    const nameToType: object = {};
    Object.keys(imprt.columnMap).forEach((ind) =>
    {
      if (imprt.columnsToInclude[ind])
      {
        nameToType[imprt.columnMap[ind]] = imprt.columnTypes[ind];
      }
    });
    return nameToType;
  }
}

export default Import;
