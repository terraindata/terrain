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
  // array of strings (oldName)
  originalNames: string[];
  // object mapping string (newName) to object (contains "type" field, "innerType" field if array type)
  // supported types: text, byte/short/integer/long/half_float/float/double, boolean, date, array, (null)
  columnTypes: object;
  primaryKey: string;  // newName of primary key
  transformations: object[];  // list of in-order data transformations
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
      winston.info('got parsed data!');
      winston.info(JSON.stringify(items));
      if (items.length === 0)
      {
        return reject('No data provided in file to upload.');
      }
      try
      {
        items = await this._applyTransforms(items, imprt.transformations);
      } catch (e)
      {
        return reject('Failed to apply transforms: ' + String(e));
      }
      winston.info('applied transforms!');
      // only include the specified columns ; NOTE: unclear if faster to copy everything over or delete the unused ones
      items = items.map((val) =>
      {
        const trimmedVal: object = {};
        for (const name in imprt.columnTypes)
        {
          if (imprt.columnTypes.hasOwnProperty(name))
          {
            trimmedVal[name] = val[name];
          }
        }
        return trimmedVal;
      });
      const typeError: string = this._checkTypes(items, imprt);
      if (typeError !== '')
      {
        return reject(typeError);
      }

      const columns: string[] = Object.keys(imprt.columnTypes);
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

    if (imprt.csvHeaderMissing === undefined)
    {
      imprt.csvHeaderMissing = false;
    }

    const columnList: string[] = Object.keys(imprt.columnTypes);
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
    const columnTypes: string[] = columnList.map((val) => imprt.columnTypes[val]['type']);
    if (columnTypes.some((val, ind, arr) =>
    {
      return !(this.supportedColumnTypes.has(val));
    }))
    {
      return 'Invalid data type encountered.';
    }
    return '';
  }

  /* converts type specification from ImportConfig into ES mapping format (ready to insert using ElasticDB.putMapping()) */
  private _getMappingForSchema(imprt: ImportConfig): object
  {
    // create mapping containing new fields
    const mapping: object = {};
    Object.keys(imprt.columnTypes).forEach((val) =>
    {
      mapping[val] = this._getESType(imprt.columnTypes[val]);
    });
    return this._getMappingForSchemaHelper(mapping);
  }
  /* recursive helper function for _getMappingForSchema(...)
   * mapping: maps field name (string) to type (string or object (in the case of "object"/"nested" type))
   * NOTE: contains functionality to handle "object"/"nested" types, though they are not yet supported by Import */
  private _getMappingForSchemaHelper(mapping: object): object
  {
    const body: object = {};
    for (const key in mapping)
    {
      if (mapping.hasOwnProperty(key) && key !== '__isNested__')
      {
        if (typeof mapping[key] === 'string')
        {
          body[key] = { type: mapping[key] };
          if (mapping[key] === 'text')
          {
            body[key]['fields'] = { keyword: { type: 'keyword', ignore_above: 256 } };
          }
        }
        else if (typeof mapping[key] === 'object')
        {
          body[key] = this._getMappingForSchemaHelper(mapping[key]);
        }
      }
    }
    const payload: object = { properties: body };
    if (mapping['__isNested__'] !== undefined)
    {
      payload['type'] = 'nested';
    }
    return payload;
  }

  /* check for conflicts with existing schema, return error (string) if there is one
   * filters out fields already present in the existing mapping (since they don't need to be inserted)
   * mapping: ES mapping
   * returns: filtered mapping (object) or error message (string) */
  private _checkMappingAgainstSchema(mapping: object, schema: Tasty.Schema, database: string): object | string
  {
    if (schema.databaseNames().indexOf(database) === -1)
    {
      return mapping;
    }
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
              String(mapping['properties'][field]['type']) + '" to "' + String(fields[field]['type']) + '".';
          }
        }
      }
    }
    return mapping;
  }
  /* proposed: ES mapping
   * existing: ES mapping */
  private _isCompatibleType(proposed: object, existing: object): boolean
  {
    const proposedType: string = proposed['type'];
    return this.compatibleTypes[proposedType] !== undefined && this.compatibleTypes[proposedType].has(existing['type']);
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

          const expectedCols: string = JSON.stringify(imprt.originalNames.sort());
          for (const obj of items)
          {
            if (JSON.stringify(Object.keys(obj).sort()) !== expectedCols)
            {
              // TODO: make more informative, relax condition
              return reject('JSON file contains an object that does not contain the expected fields.');
            }
          }
          resolve(items);
        } catch (e)
        {
          return reject('JSON format incorrect: ' + String(e));
        }
      } else if (imprt.filetype === 'csv')
      {
        csv({
          flatKeys: true,
          checkColumn: true,
          noheader: imprt.csvHeaderMissing,
          headers: imprt.originalNames,
          quote: '\'',
        }).fromString(imprt.contents).on('end_parsed', (jsonArrObj) =>
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

  /* checks whether all objects in "items" have the fields and types specified by nameToType
   * returns an error message if there is one; else returns empty string
   * nameToType: maps field name (string) to object (contains "type" field (string)) */
  private _checkTypes(items: object[], imprt: ImportConfig): string
  {
    let ind: number = 0;
    if (imprt.filetype === 'json')
    {
      const targetHash: string = this._buildDesiredHash(imprt.columnTypes);
      const targetKeys: string = JSON.stringify(Object.keys(imprt.columnTypes).sort());

      // parse dates
      const dateColumns: string[] = [];
      for (const colName in imprt.columnTypes)
      {
        if (imprt.columnTypes.hasOwnProperty(colName) && this._getESType(imprt.columnTypes[colName]) === 'date')
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
            this._parseDatesHelper(item, colName);
          });
        });
      }

      for (const obj of items)
      {
        if (this._hashObjectStructure(obj) === targetHash)
        {
          winston.info('checktypes: hash matches');
          ind++;
          continue;
        }
        winston.info('checktypes: hashes do not match');
        if (JSON.stringify(Object.keys(obj).sort()) !== targetKeys)
        {
          return 'Object number ' + String(ind) + ' does not have the set of specified keys.';
        }
        for (const key in obj)
        {
          if (obj.hasOwnProperty(key) && obj[key] !== null)
          {
            if (!this._jsonCheckTypesHelper(obj[key], imprt.columnTypes[key]))
            {
              return 'Field "' + key + '" of object number ' + String(ind) +
                ' does not match the specified type: ' + JSON.stringify(imprt.columnTypes[key]);
            }
          }
        }
        ind++;
      }
    }
    else if (imprt.filetype === 'csv')
    {
      for (const obj of items)
      {
        for (const name in imprt.columnTypes)
        {
          if (imprt.columnTypes.hasOwnProperty(name))
          {
            if (!this._csvCheckTypesHelper(obj, imprt.columnTypes[name], name))
            {
              return 'Field "' + name + '" of object number ' + String(ind) +
                ' does not match the specified type: ' + JSON.stringify(imprt.columnTypes[name]);
            }
          }
        }
        ind++;
      }
    }

    // check that all elements of arrays are of the same type
    for (const field of Object.keys(imprt.columnTypes))
    {
      if (imprt.columnTypes[field]['type'] === 'array')
      {
        ind = 0;
        for (const obj of items)
        {
          if (obj[field] !== null && !this._isTypeConsistent(obj[field]))
          {
            return 'Array in field "' + field + '" of object number ' + String(ind) + ' contains inconsistent types.';
          }
          ind++;
        }
      }
    }

    return '';
  }
  /* manually checks types (rather than checking hashes) ; handles arrays recursively */
  private _jsonCheckTypesHelper(item: object, typeObj: object): boolean
  {
    const thisType: string = this._getType(item);
    if (thisType === 'number' && this.numericTypes.has(typeObj['type']))
    {
      return true;
    }
    if (typeObj['type'] !== thisType)
    {
      return false;
    }
    if (thisType === 'array')
    {
      return this._jsonCheckTypesHelper(item[0], typeObj['innerType']);
    }
    return true;
  }
  /* parses string input from CSV and checks against expected types ; handles arrays recursively */
  private _csvCheckTypesHelper(item: object, typeObj: object, field: string): boolean
  {
    switch (this.numericTypes.has(typeObj['type']) ? 'number' : typeObj['type'])
    {
      case 'number':
        const num: number = Number(item[field]);
        if (!isNaN(num))
        {
          item[field] = num;
        }
        else if (item[field] === '')
        {
          item[field] = null;
        }
        else
        {
          return false;
        }
        break;
      case 'boolean':
        if (item[field] === 'true')
        {
          item[field] = true;
        }
        else if (item[field] === 'false')
        {
          item[field] = false;
        }
        else if (item[field] === '')
        {
          item[field] = null;
        }
        else
        {
          return false;
        }
        break;
      case 'date':
        const date: number = Date.parse(item[field]);
        if (!isNaN(date))
        {
          item[field] = new Date(date);
        }
        else if (item[field] === '')
        {
          item[field] = null;
        }
        else
        {
          return false;
        }
        break;
      case 'array':
        if (item[field] === '')
        {
          item[field] = null;
        }
        else
        {
          try
          {
            if (typeof item[field] === 'string')
            {
                item[field] = JSON.parse(item[field]);
            }
          } catch (e)
          {
            return false;
          }
          if (!Array.isArray(item[field]))
          {
            return false;
          }
          let i: number = 0;
          while (i < Object.keys(item[field]).length)    // lint hack to get around not recognizing item[field] as an array
          {
            if (!this._csvCheckTypesHelper(item[field], typeObj['innerType'], String(i)))
            {
              return false;
            }
            i++;
          }
        }
        break;
      default:  // "text" case, leave as string
    }
    return true;
  }
  /* recursively attempts to parse strings to dates */
  private _parseDatesHelper(item: string | object, field: string)
  {
    if (Array.isArray(item[field]))
    {
      let i: number = 0;
      while (i < Object.keys(item[field]).length)   // lint hack to get around not recognizing item[field] as an array
      {
        this._parseDatesHelper(item[field], String(i));
        i++;
      }
    }
    else
    {
      const date: number = Date.parse(item[field]);
      if (!isNaN(date))
      {
        item[field] = new Date(date);
      }
    }
  }
  /* checks if all elements in the provided array are of the same type ; handles nested arrays */
  private _isTypeConsistent(arr: object[]): boolean
  {
    return this._isTypeConsistentHelper(arr) !== 'inconsistent';
  }
  private _isTypeConsistentHelper(arr: object[]): string
  {
    const types: Set<string> = new Set();
    arr.forEach((obj) =>
    {
      types.add(this._getType(obj));
    });
    if (types.size !== 1)
    {
      return 'inconsistent';
    }
    const type: string = types.entries().next().value[0];
    if (type === 'array')
    {
      const innerTypes: Set<string> = new Set();
      arr.forEach((obj) =>
      {
        innerTypes.add(this._isTypeConsistentHelper(obj as object[]));
      });
      if (innerTypes.size !== 1)
      {
        return 'inconsistent';
      }
      return innerTypes.entries().next().value[0];
    }
    return type;
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
  /* return ES type from type specification format of ImportConfig
   * typeObject: contains "type" field (string), and "innerType" field (object) in the case of array/object types */
  private _getESType(typeObject: object, withinArray: boolean = false): string
  {
    switch (typeObject['type'])
    {
      case 'array':
        return this._getESType(typeObject['innerType'], true);
      case 'object':
        return withinArray ? 'nested' : 'object';
      default:
        return typeObject['type'];
    }
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
  /* recursive helper to handle arrays */
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

  private async _applyTransforms(items: object[], transforms: object[]): Promise<object[]>
  {
    return new Promise<object[]>(async (resolve, reject) =>
    {
      for (const transform of transforms)
      {
        switch (transform['name'])
        {
          case 'rename':
            const oldName: string | undefined = transform['args']['oldName'];
            const newName: string | undefined = transform['args']['newName'];
            if (oldName === undefined || newName === undefined)
            {
              return reject('Rename transformation must supply oldName and newName arguments.');
            }
            for (const obj of items)
            {
              obj[newName] = obj[oldName];
              delete obj[oldName];
            }
            break;
          case 'split':
            const oldCol: string | undefined = transform['args']['oldName'];
            const newCols: string[] | undefined = transform['args']['newName'];
            const splitText: string | undefined = transform['args']['text'];
            if (oldCol === undefined || newCols === undefined || splitText === undefined)
            {
              return reject('Split transformation must supply oldName, newName, and text arguments.');
            }
            if (newCols.length !== 2)
            {
              return reject('Split transformation currently only supports splitting into two columns.');
            }
            if (typeof items[0][oldCol] !== 'string')
            {
              return reject('Can only split columns containing text.');
            }
            for (const obj of items)
            {
              const ind: number = obj[oldCol].indexOf(splitText);
              if (ind === -1)
              {
                obj[newCols[0]] = obj[oldCol];
                obj[newCols[1]] = '';
                delete obj[oldCol];
              }
              else
              {
                obj[newCols[0]] = obj[oldCol].substring(0, ind);
                obj[newCols[1]] = obj[oldCol].substring(ind + splitText.length);
                delete obj[oldCol];
              }
            }
            break;
          case 'merge':
            const oldCols: string[] | undefined = transform['args']['oldName'];
            const newCol: string | undefined = transform['args']['newName'];
            const mergeText: string | undefined = transform['args']['text'];
            if (oldCols === undefined || newCol === undefined || mergeText === undefined)
            {
              return reject('Merge transformation must supply oldName, newName, and text arguments.');
            }
            if (oldCols.length !== 2)
            {
              return reject('Merge transformation currently only supports merging of two columns.');
            }
            if (typeof items[0][oldCols[0]] !== 'string' || typeof items[0][oldCols[1]] !== 'string')
            {
              return reject('Can only merge columns containing text.');
            }
            for (const obj of items)
            {
              obj[newCol] = String(obj[oldCols[0]]) + mergeText + String(obj[oldCols[1]]);
              delete obj[oldCols[0]];
              delete obj[oldCols[1]];
            }
            break;
          default:
            if (transform['name'] !== 'prepend' && transform['name'] !== 'append')
            {
              return reject('Invalid transform name encountered: ' + String(transform['name']));
            }
            const colName: string | undefined = transform['args']['colName'];
            const text: string | undefined = transform['args']['text'];
            if (colName === undefined || text === undefined)
            {
              return reject('Prepend/append transformation must supply colName and text arguments.');
            }
            if (typeof items[0][colName] !== 'string')
            {
              return reject('Can only prepend/append to columns containing text.');
            }
            for (const obj of items)
            {
              if (transform['name'] === 'prepend')
              {
                obj[colName] = text + String(obj[colName]);
              }
              else
              {
                obj[colName] = String(obj[colName]) + text;
              }
            }
        }
      }
      resolve(items);
    });
  }
}

export default Import;
