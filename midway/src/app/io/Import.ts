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

import * as _ from 'lodash';
import * as stream from 'stream';
import * as winston from 'winston';

import * as SharedElasticUtil from '../../../../shared/database/elastic/ElasticUtil';
import CSVTypeParser from '../../../../shared/etl/CSVTypeParser';
import { FieldTypes } from '../../../../shared/etl/FieldTypes';
import SharedUtil from '../../../../shared/Util';
import DatabaseController from '../../database/DatabaseController';
import ElasticClient from '../../database/elastic/client/ElasticClient';
import ElasticWriter from '../../database/elastic/streams/ElasticWriter';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Tasty from '../../tasty/Tasty';
import * as AppUtil from '../AppUtil';

import * as Common from './Common';
import ADocumentTransform from './streams/ADocumentTransform';
import CSVTransform from './streams/CSVTransform';
import ImportTransform from './streams/ImportTransform';
import JSONTransform from './streams/JSONTransform';
import TransformationEngineTransform from './streams/TransformationEngineTransform';
import ImportTemplateConfig from './templates/ImportTemplateConfig';
import { ImportTemplates } from './templates/ImportTemplates';
import { TemplateBase } from './templates/TemplateBase';

const importTemplates = new ImportTemplates();

const fieldTypes = new FieldTypes();
const typeParser: CSVTypeParser = new CSVTypeParser();

export interface ImportConfig extends TemplateBase
{
  file: stream.Readable;
  filetype: string;
  isNewlineSeparatedJSON?: boolean;      // defaults to false
  requireJSONHaveAllFields?: boolean;    // defaults to true
  update: boolean;      // false means replace (instead of update) ; default should be true
}

export class Import
{
  private BATCH_SIZE: number = 5000;
  private COMPATIBLE_TYPES: object =
    {
      text: new Set(['text']),
      keyword: new Set(['keyword']),
      byte: new Set(['text', 'byte', 'short', 'integer', 'long', 'half_float', 'float', 'double']),
      short: new Set(['text', 'short', 'integer', 'long', 'float', 'double']),
      integer: new Set(['text', 'integer', 'long', 'double']),
      long: new Set(['text', 'long']),
      half_float: new Set(['text', 'half_float', 'float', 'double']),
      float: new Set(['text', 'float', 'double']),
      double: new Set(['text', 'double']),
      boolean: new Set(['text', 'boolean']),
      date: new Set(['text', 'date']),
      nested: new Set(['nested']),
      geo_point: new Set(['array', 'geo_point']),
    };
  private NUMERIC_TYPES: Set<string> = new Set(['byte', 'short', 'integer', 'long', 'half_float', 'float', 'double']);
  private SUPPORTED_COLUMN_TYPES: Set<string> = new Set(Object.keys(this.COMPATIBLE_TYPES).concat(['array']));

  public async upsert(files: stream.Readable[] | stream.Readable, fields: object, headless: boolean): Promise<ImportConfig>
  {
    return new Promise<ImportConfig>(async (resolve, reject) =>
    {
      const update: boolean | string = this._parseBooleanField(fields, 'update', true);
      if (typeof update === 'string')
      {
        return reject(update);
      }

      const isNewlineSeparatedJSON: boolean | string = this._parseBooleanField(fields, 'isNewlineSeparatedJSON', false);
      if (typeof isNewlineSeparatedJSON === 'string')
      {
        return reject(isNewlineSeparatedJSON);
      }

      let file: stream.Readable | null = null;
      if (Array.isArray(files))
      {
        for (const f of files)
        {
          if (f['fieldname'] === 'file')
          {
            file = f;
          }
        }
      }
      else
      {
        file = files;
      }
      if (file === null)
      {
        return reject('No file specified.');
      }

      const hasCsvHeader: boolean | string = this._parseBooleanField(fields, 'hasCsvHeader', true);
      if (typeof hasCsvHeader === 'string')
      {
        return reject(hasCsvHeader);
      }

      const requireJSONHaveAllFieldsDefault: boolean | string = this._parseBooleanField(fields, 'requireJSONHaveAllFields', true);

      if (typeof requireJSONHaveAllFieldsDefault === 'string')
      {
        return reject(requireJSONHaveAllFieldsDefault);
      }

      let imprtConf: ImportConfig;
      if (headless)
      {
        const templates: ImportTemplateConfig[] = await importTemplates.get(Number(fields['templateId']));
        if (templates.length === 0)
        {
          return reject('Invalid template ID provided: ' + String(fields['templateId']));
        }
        const template: ImportTemplateConfig = templates[0];
        imprtConf = {
          columnTypes: template['columnTypes'],
          dbid: template['dbid'],
          dbname: template['dbname'],
          file,
          filetype: fields['filetype'],
          isNewlineSeparatedJSON,
          name: template['name'],
          originalNames: template['originalNames'],
          primaryKeyDelimiter: template['primaryKeyDelimiter'],
          primaryKeys: template['primaryKeys'],
          requireJSONHaveAllFields: template['requireJSONHaveAllFields'],
          tablename: template['tablename'],
          transformations: template['transformations'],
          update,
        };
      }
      else
      {
        try
        {
          const columnTypes: object = JSON.parse(fields['columnTypes']);
          const originalNames: string[] = JSON.parse(fields['originalNames']);
          const primaryKeys: string[] = JSON.parse(fields['primaryKeys']);
          const transformations: object[] = JSON.parse(fields['transformations']);

          imprtConf = {
            columnTypes,
            dbid: Number(fields['dbid']),
            dbname: fields['dbname'],
            file,
            filetype: fields['filetype'],
            isNewlineSeparatedJSON,
            name: fields['name'],
            originalNames,
            primaryKeyDelimiter: fields['primaryKeyDelimiter'] === undefined ? '-' : fields['primaryKeyDelimiter'],
            primaryKeys,
            requireJSONHaveAllFields: fields['requireJSONHaveAllFields'] === undefined
              ? requireJSONHaveAllFieldsDefault : JSON.parse(fields['requireJSONHaveAllFields']),
            tablename: fields['tablename'],
            transformations,
            update,
          };
        }
        catch (e)
        {
          return reject('Error parsing originalNames, columnTypes, and/or transformations of import request: ' + String(e));
        }
      }

      const database: DatabaseController | undefined = DatabaseRegistry.get(imprtConf.dbid);
      if (database === undefined)
      {
        return reject('Database "' + imprtConf.dbid.toString() + '" not found.');
      }
      if (database.getType() !== 'ElasticController')
      {
        return reject('File import currently is only supported for Elastic databases.');
      }

      let time: number = Date.now();
      winston.info('File Import: beginning config/schema check.');
      const configError: string = this._verifyConfig(imprtConf);
      if (configError !== '')
      {
        return reject(configError);
      }
      const expectedMapping: object = await this._getMappingForSchema(imprtConf);
      const schema = await database.getTasty().schema();
      const mappingForSchema: object =
        this._checkMappingAgainstSchema(expectedMapping, schema, imprtConf.dbname);

      winston.info('File Import: finished config/schema check. Time (s): ' + String((Date.now() - time) / 1000));

      const columns: string[] = Object.keys(imprtConf.columnTypes);
      const insertTable: Tasty.Table = new Tasty.Table(
        imprtConf.tablename,
        imprtConf.primaryKeys,
        columns,
        imprtConf.dbname,
        mappingForSchema,
        imprtConf.primaryKeyDelimiter,
      );

      try
      {
        time = Date.now();
        winston.info('File Import: beginning to insert ES mapping.');
        await database.getTasty().getDB().putMapping(insertTable);
        winston.info('File Import: finished inserted ES mapping. Time (s): ' + String((Date.now() - time) / 1000));

        let importTransform: stream.Transform;
        switch (imprtConf.filetype)
        {
          case 'json':
            importTransform = JSONTransform.createImportStream();
            break;
          case 'csv':
            importTransform = CSVTransform.createImportStream(hasCsvHeader);
            break;
          default:
            throw new Error('File type must be either CSV or JSON.');
        }

        const documentTransform: ADocumentTransform = new ImportTransform(this, imprtConf);
        const transformationEngineTransform = new TransformationEngineTransform(imprtConf.transformations);
        const client: ElasticClient = database.getClient() as ElasticClient;
        let primaryKey;
        if (imprtConf.primaryKeys.length > 1)
        {
          const delimiter = imprtConf.primaryKeyDelimiter !== undefined ? imprtConf.primaryKeyDelimiter : '-';
          primaryKey = imprtConf.primaryKeys.join(delimiter);
        }
        else
        {
          primaryKey = imprtConf.primaryKeys[0];
        }

        const elasticWriter = new ElasticWriter(client, imprtConf.dbname, imprtConf.tablename, primaryKey);
        file.pipe(importTransform)
          .on('error', reject)
          .pipe(transformationEngineTransform)
          .on('error', reject)
          .pipe(documentTransform)
          .on('error', reject)
          .pipe(elasticWriter)
          .on('error', reject)
          .on('finish', () => resolve(imprtConf));
      }
      catch (e)
      {
        return reject(e);
      }
    });
  }

  /* asynchronously perform transformations on each item to upsert, and check against expected resultant types */
  public _transformAndCheck(obj: object, imprt: ImportConfig, dontCheck?: boolean): object
  {
    const specifiedColumnItem: object = {};
    Object.keys(imprt.columnTypes).forEach((name) =>
    {
      specifiedColumnItem[name] = obj[name];
    });

    if (dontCheck !== true)
    {
      const typeError: string = this._checkTypes(specifiedColumnItem, imprt);
      if (typeError !== '')
      {
        throw new Error(typeError);
      }
    }
    return this._convertDateToESDateAndTrim(specifiedColumnItem, imprt.columnTypes);
  }

  /* check for conflicts with existing schema, return error (string) if there is one
   * filters out fields already present in the existing mapping (since they don't need to be inserted)
   * mapping: ES mapping
   * returns: filtered mapping (object) or error message (string) */
  private _checkMappingAgainstSchema(mapping: object, schema: Tasty.Schema, database: string): object
  {
    if (schema.databaseNames().indexOf(database) === -1)
    {
      return mapping;
    }

    const fieldsToCheck: Set<string> = new Set(Object.keys(mapping['properties']));
    for (const table of schema.tableNames(database))
    {
      const fields: object = schema.fields(database, table);
      for (const field of Object.keys(fields))
      {
        if (fields.hasOwnProperty(field) && fieldsToCheck.has(field))
        {
          if (this._isCompatibleType(mapping['properties'][field], fields[field]))
          {
            fieldsToCheck.delete(field);
          }
          else
          {
            throw new Error('Type mismatch for field ' + field + '. Cannot cast "' +
              String(mapping['properties'][field]['type']) + '" to "' + String(fields[field]['type']) + '".');
          }
        }
      }
    }
    return mapping;
  }

  /* checks whether obj has the fields and types specified by nameToType
   * returns an error message if there is one; else returns empty string
   * nameToType: maps field name (string) to object (contains "type" field (string)) */
  private _checkTypes(obj: object, imprt: ImportConfig): string
  {
    if (imprt.filetype === 'json')
    {
      const targetHash: string = SharedUtil.elastic.buildDesiredHash(imprt.columnTypes);
      const targetKeys: string = JSON.stringify(Object.keys(imprt.columnTypes).sort());

      // parse dates
      const dateColumns: string[] = [];
      for (const colName of Object.keys(imprt.columnTypes))
      {
        if (imprt.columnTypes.hasOwnProperty(colName) && this._getESType(imprt.columnTypes[colName])['type'] === 'date')
        {
          dateColumns.push(colName);
        }
      }
      if (dateColumns.length > 0)
      {
        dateColumns.forEach((colName) =>
        {
          this._parseDatesHelper(obj, colName);
        });
      }

      if (SharedUtil.elastic.hashObjectStructure(obj) !== targetHash)
      {
        if (JSON.stringify(Object.keys(obj).sort()) !== targetKeys)
        {
          return 'Encountered an object that does not have the set of specified keys: ' + JSON.stringify(obj) + ', expected: ' + targetKeys;
        }
        for (const key of Object.keys(obj))
        {
          if (obj.hasOwnProperty(key))
          {
            if (!this._jsonCheckTypesHelper(obj[key], imprt.columnTypes[key]))
            {
              return 'Encountered an object whose field "' + key + '" does not match the specified type (' +
                JSON.stringify(imprt.columnTypes[key]) + '): ' + JSON.stringify(obj);
            }
          }
        }
      }
    }
    else if (imprt.filetype === 'csv')
    {
      for (const name of Object.keys(imprt.columnTypes))
      {
        if (imprt.columnTypes.hasOwnProperty(name))
        {
          if (!this._csvCheckTypesHelper(obj, imprt.columnTypes[name], name))
          {
            return 'Encountered an object whose field "' + name + '" does not match the specified type (' +
              JSON.stringify(imprt.columnTypes[name]) + '): ' + JSON.stringify(obj);
          }
        }
      }
    }

    // check that all elements of arrays are of the same type
    for (const field of Object.keys(imprt.columnTypes))
    {
      if (imprt.columnTypes[field]['type'] === 'array')
      {
        if (obj[field] !== null && !SharedUtil.elastic.isTypeConsistent(obj[field]))
        {
          return 'Array in field "' + field + '" of the following object contains inconsistent types: ' + JSON.stringify(obj);
        }
      }
    }

    for (const key of imprt.primaryKeys)
    {
      if (obj[key] === '' || obj[key] === null)
      {
        return 'Encountered an object with an empty primary key ("' + key + '"): ' + JSON.stringify(obj);
      }
    }

    return '';
  }

  /* parses string input from CSV and checks against expected types ; handles arrays recursively */
  private _csvCheckTypesHelper(item: object, typeObj: object, field: string): boolean
  {
    switch (this.NUMERIC_TYPES.has(typeObj['type']) ? 'number' : typeObj['type'])
    {
      case 'number':
        if (item[field] === '' || item[field] === 'null')
        {
          item[field] = null;
        }
        else
        {
          const parsedValue: number | boolean = typeParser.getDoubleFromString(String(item[field]));
          if (typeof parsedValue === 'number')
          {
            item[field] = parsedValue;
            return true;
          }
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
        else if (item[field] === '' || item[field] === 'null')
        {
          item[field] = null;
        }
        else
        {
          return false;
        }
        break;
      case 'date':
        item[field] = item[field].replace(/\"/g, '');
        const date: number = Date.parse(item[field]);
        if (!isNaN(date))
        {
          item[field] = new Date(date);
        }
        else if (item[field] === '' || item[field] === 'null')
        {
          item[field] = null;
        }
        else
        {
          return false;
        }
        break;
      case 'array':
        if (item[field] === '' || item[field] === 'null')
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
      case 'geo_point':
        if (item[field] === '' || item[field] === 'null')
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
          if (Array.isArray(item[field]))
          {
            if (item[field].length !== 2 || typeof item[field][0] !== 'number' || typeof item[field][1] !== 'number')
            {
              return false;
            }
          }
        }
        break;
      case 'nested':
        if (item[field] === '' || item[field] === 'null')
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
          if (Array.isArray(item[field]))
          {
            return false;
          }
        }
        break;
      default:  // "text" case, leave as string
    }
    return true;
  }

  /* return ES type from type specification format of ImportConfig
   * typeObject: contains "type" field (string), and "innerType" field (object) in the case of array/object types */
  private _getESType(typeObject: object, withinArray: boolean = false, isIndexAnalyzed?: string, typeAnalyzer?: string): object
  {
    switch (typeObject['type'])
    {
      case 'array':
        return this._getESType(typeObject['innerType'], true);
      case 'object':
        return withinArray ? (typeObject['index'] === 'analyzed' ?
          { type: 'nested', index: typeObject['index'], analyzer: typeObject['analyzer'] } :
          { type: 'nested', index: typeObject['index'] })
          : (typeObject['index'] === 'analyzed' ?
            { type: 'object', index: typeObject['index'], analyzer: typeObject['analyzer'] } :
            { type: 'object', index: typeObject['index'] });
      default:
        return typeObject['index'] === 'analyzed' ?
          { type: typeObject['type'], index: typeObject['index'], analyzer: typeObject['analyzer'] } :
          { type: typeObject['type'], index: typeObject['index'] };
    }
  }

  /* converts type specification from ImportConfig into ES mapping format (ready to insert using ElasticDB.putMapping()) */
  private async _getMappingForSchema(imprt: ImportConfig): Promise<object>
  {
    return fieldTypes.getESMappingFromDocument(imprt.columnTypes);
  }

  /* proposed: ES mapping
   * existing: ES mapping */
  private _isCompatibleType(proposed: object, existing: object): boolean
  {
    const proposedType: string = proposed['type'];
    return this.COMPATIBLE_TYPES[proposedType] !== undefined && this.COMPATIBLE_TYPES[proposedType].has(existing['type']);
  }

  /* manually checks types (rather than checking hashes) ; handles arrays recursively */
  private _jsonCheckTypesHelper(item: object, typeObj: object): boolean
  {
    const thisType: string = SharedUtil.elastic.getType(item);
    if (thisType === 'null')
    {
      return true;
    }
    if (thisType === 'object' && typeObj['type'] === 'nested')
    {
      return true;
    }
    if (thisType === 'number' && this.NUMERIC_TYPES.has(typeObj['type']))
    {
      return true;
    }
    try
    {
      if (typeof JSON.parse(item as any) === 'number' && this.NUMERIC_TYPES.has(typeObj['type']))
      {
        return true;
      }
    }
    catch (e)
    {
      // do nothing
    }
    if (typeObj['type'] !== thisType)
    {
      return false;
    }
    if (thisType === 'array')
    {
      if (item[0] === undefined)
      {
        return true;
      }
      return this._jsonCheckTypesHelper(item[0], typeObj['innerType']);
    }
    return true;
  }

  /* parses obj[field] (string) into a boolean, if possible.
   * defaultRet: default return value if obj[field] is undefined */
  private _parseBooleanField(obj: object, field: string, defaultRet: boolean): boolean | string
  {
    let parsed: boolean = defaultRet;
    if (obj[field] === 'false')
    {
      parsed = false;
    }
    else if (obj[field] === 'true')
    {
      parsed = true;
    }
    else if (obj[field] !== undefined)
    {
      return 'Invalid value for parameter "' + field + '": ' + String(obj[field]);
    }
    return parsed;
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

  private _convertDateToESDateAndTrim(fieldObj: object, fieldTypesObj: object): object
  {
    const convertDateAndTrim =
      {
        double: (self, node, typeObj) => node,
        float: (self, node, typeObj) => node,
        long: (self, node, typeObj) => node,
        boolean: (self, node, typeObj) => node,
        null: (self, node, typeObj) => node,
        short: (self, node, typeObj) => node,
        byte: (self, node, typeObj) => node,
        integer: (self, node, typeObj) => node,
        half_float: (self, node, typeObj) => node,
        geo_point: (self, node, typeObj) => node,
        date: (self, node, typeObj) =>
        {
          if (node !== null)
          {
            const isMMDDYYYYFormat = new RegExp(/^((0?[1-9]|1[0,1,2])\/(0?[1-9]|[1,2][0-9]|3[0,1])\/([0-9]{4}))$/);
            if (isMMDDYYYYFormat.test(node))
            {
              try
              {
                const splitDate: string[] = node.split('/');
                node = new Date(Date.parse([splitDate[2], splitDate[0], splitDate[1]].join('-'))).toISOString();
              }
              catch (e)
              {
                // do nothing
              }
            }
            else
            {
              node = new Date(Date.parse(node)).toISOString();
            }
          }
          return node;
        },
        text: (self, node, typeObj) =>
        {
          if (node !== null)
          {
            node = node.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
          }
          return node;
        },
        keyword: (self, node, typeObj) =>
        {
          if (node !== null)
          {
            node = node.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
          }
          return node;
        },
        array: (self, node, typeObj) =>
        {
          if (node !== null)
          {
            for (const ind in node)
            {
              if (node.hasOwnProperty(ind))
              {
                node[ind] = visit(self, node[ind], typeObj['innerType']);
              }
            }
          }
          return node;
        },
        nested: (self, node, typeObj) =>
        {
          if (node !== null)
          {
            for (const key in node)
            {
              if (node.hasOwnProperty(key))
              {
                node[key] = visit(self, node[key], typeObj['innerType'][key]);
              }
            }
          }
          return node;
        },
      };

    function visit(visitor, obj, typeObj)
    {
      return visitor[typeObj['type']](visitor, obj, typeObj);
    }

    const returnObj: object = {};
    Object.keys(fieldTypesObj).forEach((key) =>
    {
      returnObj[key] = visit(convertDateAndTrim, fieldObj[key], fieldTypesObj[key]);
    });

    return returnObj;
  }

  /* returns an error message if there are any; else returns empty string */
  private _verifyConfig(imprt: ImportConfig): string
  {
    const indexError: string = SharedElasticUtil.isValidIndexName(imprt.dbname);
    if (indexError !== '')
    {
      return indexError;
    }
    const typeError: string = SharedElasticUtil.isValidTypeName(imprt.tablename);
    if (typeError !== '')
    {
      return typeError;
    }

    if (imprt.filetype !== 'csv' && imprt.filetype !== 'json')
    {
      return 'Invalid file-type provided.';
    }

    const columnList: string[] = Object.keys(imprt.columnTypes);
    const columns: Set<string> = new Set(columnList);
    if (columns.size !== columnList.length)
    {
      return 'Provided column names must be distinct.';
    }
    if (imprt.primaryKeys.length === 0)
    {
      return 'At least one column must be specified as a primary key.';
    }
    for (const key of imprt.primaryKeys)
    {
      if (!columns.has(key))
      {
        return 'The column "' + key + '" was specified to be part of the primary key, so it must be included.';
      }
    }
    let fieldError: string;
    for (const colName of columnList)
    {
      fieldError = SharedElasticUtil.isValidFieldName(colName);
      if (fieldError !== '')
      {
        return fieldError;
      }
    }
    const columnTypes: string[] = columnList.map((val) => imprt.columnTypes[val]['type']);
    if (columnTypes.some((val, ind, arr) =>
    {
      return !(this.SUPPORTED_COLUMN_TYPES.has(val));
    }))
    {
      return 'Invalid data type encountered.';
    }
    return '';
  }
}

export default Import;
