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

import csvWriter = require('csv-write-stream');
import sha1 = require('sha1');

import * as equal from 'deep-equal';
import * as _ from 'lodash';
import * as stream from 'stream';
import * as winston from 'winston';

import ESParser from '../../../../shared/database/elastic/parser/ESParser';
import { CSVTypeParser } from '../../../../shared/etl/CSVTypeParser';
import * as SharedUtil from '../../../../shared/Util';
import { getParsedQuery } from '../../app/Util';
import DatabaseController from '../../database/DatabaseController';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Tasty from '../../tasty/Tasty';
import ItemConfig from '../items/ItemConfig';
import Items from '../items/Items';
import { QueryHandler } from '../query/QueryHandler';

import ExportTemplateConfig from './templates/ExportTemplateConfig';
import ExportTemplates from './templates/ExportTemplates';
import TemplateBase from './templates/TemplateBase';

const exportTemplates = new ExportTemplates();

const TastyItems: Items = new Items();
const typeParser: CSVTypeParser = new CSVTypeParser();

export interface ExportConfig extends TemplateBase, ExportTemplateConfig
{
  filetype: string;
  update: boolean;      // false means replace (instead of update) ; default should be true
}

export class Export
{
  private NUMERIC_TYPES: Set<string> = new Set(['byte', 'short', 'integer', 'long', 'half_float', 'float', 'double']);
  private SCROLL_TIMEOUT: string = '60s';
  private MAX_ROW_THRESHOLD: number = 2000;

  public async export(exprt: ExportConfig, headless: boolean): Promise<stream.Readable | string>
  {
    return new Promise<stream.Readable | string>(async (resolve, reject) =>
    {
      const database: DatabaseController | undefined = DatabaseRegistry.get(exprt.dbid);
      if (database === undefined)
      {
        return reject('Database "' + exprt.dbid.toString() + '" not found.');
      }

      if (database.getType() !== 'ElasticController')
      {
        return reject('File export currently is only supported for Elastic databases.');
      }

      if (exprt.filetype !== 'csv' && exprt.filetype !== 'json' && exprt.filetype !== 'json [type object]')
      {
        return reject('Filetype must be either CSV or JSON.');
      }

      let objectKeyValue: string | undefined;
      if (exprt.filetype === 'json [type object]' && exprt.objectKey !== undefined)
      {
        objectKeyValue = exprt.objectKey;
      }

      if (headless)
      {
        // get a template given the template ID
        const templates: ExportTemplateConfig[] = await exportTemplates.get(exprt.templateId);
        if (templates.length === 0)
        {
          return reject('Template not found. Did you supply an export template ID?');
        }
        const template = templates[0] as object;
        if (exprt.dbid !== template['dbid'])
        {
          return reject('Template database ID does not match supplied database ID.');
        }
        for (const templateKey of Object.keys(template))
        {
          exprt[templateKey] = template[templateKey];
        }
      }

      if (exprt.columnTypes === undefined)
      {
        return reject('Must provide export template column types.');
      }
      if (exprt.filetype === 'json [type object]' && objectKeyValue !== undefined)
      {
        exprt.objectKey = objectKeyValue;
      }

      // get query data from algorithmId or query (or variant Id if necessary)
      let qry: string = '';
      if ((exprt as any).variantId !== undefined && exprt.algorithmId === undefined)
      {
        exprt.algorithmId = (exprt as any).variantId;
      }
      if (exprt.algorithmId !== undefined && exprt.query === undefined)
      {
        qry = await this._getQueryFromAlgorithm(exprt.algorithmId);
      }
      else if (exprt.algorithmId === undefined && exprt.query !== undefined)
      {
        qry = exprt.query;
      }
      else
      {
        return reject('Must provide either algorithm ID or query, not both or neither.');
      }
      if (qry === '')
      {
        return reject('Empty query provided.');
      }

      const mapping: object = exprt.columnTypes;
      if (typeof mapping === 'string')
      {
        return reject(mapping);
      }

      let writer: any;
      if (exprt.filetype === 'csv')
      {
        writer = csvWriter();
      }
      else if (exprt.filetype === 'json' || exprt.filetype === 'json [type object]')
      {
        writer = new stream.PassThrough();
      }

      if (exprt.filetype === 'json' || exprt.filetype === 'json [type object]')
      {
        if (exprt.filetype === 'json [type object]')
        {
          writer.write('{ \"');
          writer.write(exprt.objectKey);
          writer.write('\":');
        }
        writer.write('[');
      }

      const originalMapping: object = {};
      // generate original mapping if there were any renames
      const allNames = Object.keys(exprt.columnTypes);
      allNames.forEach((value, i) =>
      {
        originalMapping[value] = value;
      });

      const renameTransformations: object[] = exprt.transformations.filter((transformation) => transformation['name'] === 'rename');
      renameTransformations.forEach((transformation) =>
      {
        originalMapping[transformation['colName']] = mapping[transformation['args']['newName']];
      });

      // TODO add transformation check for addcolumn and update mapping accordingly
      const qh: QueryHandler = database.getQueryHandler();
      const payload = {
        database: exprt.dbid,
        type: 'search',
        streaming: true,
        databasetype: 'elastic',
        body: qry,
      };

      const respStream: any = await qh.handleQuery(payload);
      if (respStream === undefined || (respStream.hasError !== undefined && respStream.hasError()))
      {
        writer.end();
        return reject('Nothing to export.');
      }

      try
      {
        const extractTransformations = exprt.transformations.filter((transformation) => transformation['name'] === 'extract');
        exprt.transformations = exprt.transformations.filter((transformation) => transformation['name'] !== 'extract');

        winston.info('Beginning export transformations.');
        const cfg = {
          extractTransformations,
          exprt,
          fieldArrayDepths: {},
          id: 1,
          mapping: originalMapping,
        };

        let isFirstJSONObj: boolean = true;
        await new Promise(async (res, rej) =>
        {
          respStream.on('data', (doc) =>
          {
            if (doc === undefined || doc === null)
            {
              return res();
            }

            try
            {
              doc = this._postProcessDoc(doc, cfg);
              if (exprt.filetype === 'csv')
              {
                writer.write(doc);
              }
              else if (exprt.filetype === 'json' || exprt.filetype === 'json [type object]')
              {
                isFirstJSONObj === true ? isFirstJSONObj = false : writer.write(',\n');
                writer.write(JSON.stringify(doc));
              }

              if (exprt.filetype === 'json' || exprt.filetype === 'json [type object]')
              {
                writer.write(']');
                if (exprt.filetype === 'json [type object]')
                {
                  writer.write('}');
                }
              }
            }
            catch (e)
            {
              return rej(e);
            }
          });

          respStream.on('end', () =>
          {
            return res();
          });

          respStream.on('error', (err) =>
          {
            winston.error(err);
            return rej(err);
          });
        });

        writer.end();
        return resolve(writer);
      }
      catch (e)
      {
        respStream.close();
        return reject(e);
      }
    });
  }

  public async getNamesAndTypesFromQuery(dbid: number, qry: string): Promise<object | string>
  {
    qry = this._shouldRandomSample(qry);
    const database: DatabaseController | undefined = DatabaseRegistry.get(dbid);
    if (database === undefined)
    {
      throw new Error('Database "' + dbid.toString() + '" not found.');
    }
    if (database.getType() !== 'ElasticController')
    {
      throw new Error('File export currently is only supported for Elastic databases.');
    }
    return this._getAllFieldsAndTypesFromQuery(database, qry, dbid);
  }

  private _postProcessDoc(doc: object, cfg: any): object
  {
    // merge groupJoins with _source if necessary
    doc = this._mergeGroupJoin(doc);
    // extract field after doing all merge joins
    cfg.extractTransformations.forEach((transform) =>
    {
      const oldColName: string | undefined = transform['colName'];
      const newColName: string | undefined = transform['args']['newName'];
      const path: string | undefined = transform['args']['path'];
      if (oldColName !== undefined && newColName !== undefined && path !== undefined)
      {
        doc['_source'][newColName] = _.get(doc['_source'], path);
      }
    });

    // verify schema mapping with documents and fix documents accordingly
    doc = this._checkDocumentAgainstMapping(doc['_source'], cfg.mapping);
    for (const field of Object.keys(doc))
    {
      if (doc[field] !== null && doc[field] !== undefined)
      {
        if (cfg.fieldArrayDepths[field] !== undefined)
        {
          cfg.fieldArrayDepths[field] = Number(cfg.fieldArrayDepths[field]) + this._getArrayDepth(doc[field]);
          if (cfg.fieldArrayDepths[field] > 1)
          {
            throw new Error('Export field "' + field + '" contains mixed types. You will not be able to re-import the exported file.');
          }
        }
        else
        {
          cfg.fieldArrayDepths[field] = this._getArrayDepth(doc[field]);
        }

        if (Array.isArray(doc[field]) && cfg.exprt.filetype === 'csv')
        {
          doc[field] = this._convertArrayToCSVArray(doc[field]);
        }
      }
    }

    doc = this._transformAndCheck(doc, cfg.exprt, false);
    if (cfg.exprt.rank === true)
    {
      if (doc['TERRAINRANK'] !== undefined)
      {
        throw new Error('Conflicting field: TERRAINRANK.');
      }
      doc['TERRAINRANK'] = cfg.id;
      cfg.id++;
    }
    return doc;
  }

  private _shouldRandomSample(qry: string): string
  {
    const parser = getParsedQuery(qry);
    let query = parser.getValue();
    if (query['size'] !== undefined)
    {
      if (typeof query['size'] === 'number' && qry['size'] > this.MAX_ROW_THRESHOLD)
      {
        query['from'] = 0;
        query['size'] = this.MAX_ROW_THRESHOLD;
        query = { function_score: { random_score: {}, query } };
      }
    }
    return query;
  }

  private async _getQueryFromAlgorithm(algorithmId: number): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      const algorithms: ItemConfig[] = await TastyItems.get(algorithmId);
      if (algorithms.length === 0)
      {
        return reject('Algorithm not found.');
      }

      try
      {
        if (algorithms[0].meta !== undefined)
        {
          return resolve(JSON.parse(algorithms[0].meta as string)['query']['tql']);
        }
      }
      catch (e)
      {
        return reject('Malformed algorithm');
      }
    });
  }

  private async _getAllFieldsAndTypesFromQuery(database: DatabaseController, qry: string,
    dbid?: number, maxSize?: number): Promise<object | string>
  {
    return new Promise<object | string>(async (resolve, reject) =>
    {
      const fieldObj: object = {};
      let fieldsAndTypes: object = {};
      let rankCounter = 1;
      const qh: QueryHandler = database.getQueryHandler();
      const payload = {
        database: dbid as number,
        type: 'search',
        streaming: false,
        databasetype: 'elastic',
        body: JSON.stringify(qry),
      };
      const qryResponse: any = await qh.handleQuery(payload);
      if (qryResponse === undefined || qryResponse.hasError())
      {
        return resolve(fieldObj);
      }
      const resp = qryResponse.result;
      if (resp.hits === undefined || (resp.hits !== undefined && resp.hits.hits === undefined))
      {
        return resolve(fieldObj);
      }
      const newDocs: object[] = resp.hits.hits as object[];
      if (newDocs.length === undefined)
      {
        return resolve('Something was wrong with the query.');
      }
      if (newDocs.length === 0)
      {
        return resolve(fieldObj);
      }
      fieldsAndTypes = await this._getFieldsAndTypesFromDocuments(newDocs, fieldsAndTypes);
      rankCounter += newDocs.length;
      for (const field of Object.keys(fieldsAndTypes))
      {
        fieldObj[field] = this._getPriorityType(fieldsAndTypes[field]);
      }
      return resolve(fieldObj);
    });
  }

  // boolean, long, double, string, array, object ({...})
  // returns an object with keys as the fields and values as arrays of the detected types
  private async _getFieldsAndTypesFromDocuments(docs: object[], fieldObj: object): Promise<object>
  {
    if (fieldObj === undefined)
    {
      fieldObj = {};
    }
    return new Promise<object>(async (resolve, reject) =>
    {
      for (const doc of docs)
      {
        const mergeDoc = this._mergeGroupJoin(doc);
        const fields: string[] = Object.keys(doc['_source']);
        for (const field of fields)
        {
          const fullTypeObj = { type: 'text', index: 'not_analyzed', analyzer: null as (string | null) };
          switch (typeof doc['_source'][field])
          {
            case 'number':
              fullTypeObj.type = doc['_source'][field] % 1 === 0 ? 'long' : 'double';
              if (!fieldObj.hasOwnProperty(field))
              {
                fieldObj[field] = [fullTypeObj];
              }
              else
              {
                if (fieldObj[field].map((typeObj) => typeObj['type'] === fullTypeObj['type'])
                  .indexOf(true) > -1)
                {
                  fieldObj[field].concat(fullTypeObj);
                }
              }
              break;
            case 'boolean':
              fullTypeObj.type = 'boolean';
              if (!fieldObj.hasOwnProperty(field))
              {
                fieldObj[field] = [fullTypeObj];
              }
              else
              {
                if (fieldObj[field].map((typeObj) => typeObj['type'] === fullTypeObj['type'])
                  .indexOf(true) < 0)
                {
                  fieldObj[field].concat(fullTypeObj);
                }
              }
              break;
            case 'object':
              fullTypeObj.type = Array.isArray(doc['_source'][field]) === true ? 'array' : 'object';
              if (!fieldObj.hasOwnProperty(field))
              {
                fieldObj[field] = [fullTypeObj.type === 'array' ?
                  this._recursiveArrayTypeHelper(doc['_source'][field]) : fullTypeObj];
              }
              else
              {
                if (fullTypeObj.type === 'array')
                {
                  const fullArrayObj: object = this._recursiveArrayTypeHelper(doc['_source'][field]);
                  if (fieldObj[field].indexOf(fullArrayObj) < 0)
                  {
                    fieldObj[field].concat(fullArrayObj);
                  }
                }
                else
                {
                  if (fieldObj[field].map((typeObj) => typeObj['type'] === fullTypeObj['type'])
                    .indexOf(true) < 0)
                  {
                    fieldObj[field].concat(fullTypeObj);
                  }
                }
              }
              break;
            default:
              fullTypeObj.index = 'analyzed';
              fullTypeObj.analyzer = 'standard';
              if (!fieldObj.hasOwnProperty(field))
              {
                fieldObj[field] = [fullTypeObj];
              }
              else
              {
                fieldObj[field].concat(fullTypeObj);
              }
          }
        }
      }
      return resolve(fieldObj);
    });
  }

  private _recursiveArrayTypeHelper(fieldValue: any): object
  {
    if (Array.isArray(fieldValue))
    {
      return { type: 'array', innerType: this._recursiveArrayTypeHelper(fieldValue[0]) };
    }
    else
    {
      switch (typeof fieldValue)
      {
        case 'number':
          return { type: fieldValue % 1 === 0 ? 'long' : 'double', innerType: null, index: 'not_analyzed', analyzer: null };
        case 'boolean':
          return { type: 'boolean', innerType: null, index: 'not_analyzed', analyzer: null };
        case 'object':
          return { type: 'object', innerType: null, index: 'not_analyzed', analyzer: null };
        default:
          return { type: 'text', innerType: null, index: 'analyzed', analyzer: 'standard' };
      }
    }
  }

  private _getInnermostType(arrayType: object): string
  {
    while (arrayType['type'] === 'array' && arrayType['innerType'] !== undefined && typeof arrayType['innerType'] === 'object')
    {
      arrayType = arrayType['innerType'];
    }
    return arrayType['type'];
  }

  private _getPriorityType(types: object[]): object
  {
    const topPriorityTypes: string[] = ['array', 'object']; // string is default case
    if (types.length === 1)
    {
      return types[0];
    }

    for (const type of topPriorityTypes)
    {
      if (types.map((typesObj) => typesObj['type']).indexOf('array') >= 0)
      {
        const arrayTypes: object[] = types.filter((typeObj) => typeObj['type'] === 'array');
        const innermostTypes: string[] = arrayTypes.map((arrayType) =>
        {
          return this._getInnermostType(arrayType);
        });
        if (types.length === 1)
        {
          return arrayTypes[0];
        }
        if (equal(innermostTypes.sort(), ['double', 'long']))
        {
          return { type: 'double', index: 'not_analyzed', analyzer: null };
        }
        return { type: 'text', index: 'analyzed', analyzer: 'standard' };
      }
      else if (types.map((typesObj) => typesObj['type']).indexOf('object') >= 0)
      {
        return { type: 'object', index: 'not_analyzed', analyzer: null };
      }
    }

    if (equal(types.map((typeObj) => typeObj['type']).sort(), ['double', 'long']))
    {
      return { type: 'double', index: 'not_analyzed', analyzer: null };
    }
    return { type: 'text', index: 'analyzed', analyzer: 'standard' };
  }

  private _applyTransforms(obj: object, transforms: object[]): object
  {
    let colName: string | undefined;
    for (const transform of transforms)
    {
      switch (transform['name'])
      {
        case 'rename':
          const oldName: string | undefined = transform['colName'];
          const newName: string | undefined = transform['args']['newName'];
          if (oldName === undefined || newName === undefined)
          {
            throw new Error('Rename transformation must supply colName and newName arguments.');
          }
          if (oldName !== newName)
          {
            obj[newName] = obj[oldName];
            delete obj[oldName];
          }
          break;
        case 'split':
          const oldCol: string | undefined = transform['colName'];
          const newCols: string[] | undefined = transform['args']['newName'];
          const splitText: string | undefined = transform['args']['text'];
          if (oldCol === undefined || newCols === undefined || splitText === undefined)
          {
            throw new Error('Split transformation must supply colName, newName, and text arguments.');
          }
          if (newCols.length !== 2)
          {
            throw new Error('Split transformation currently only supports splitting into two columns.');
          }
          if (typeof obj[oldCol] !== 'string')
          {
            throw new Error('Can only split columns containing text.');
          }
          const oldText: string = obj[oldCol];
          delete obj[oldCol];
          const ind: number = oldText.indexOf(splitText);
          if (ind === -1)
          {
            obj[newCols[0]] = oldText;
            obj[newCols[1]] = '';
          }
          else
          {
            obj[newCols[0]] = oldText.substring(0, ind);
            obj[newCols[1]] = oldText.substring(ind + splitText.length);
          }
          break;
        case 'merge':
          const startCol: string | undefined = transform['colName'];
          const mergeCol: string | undefined = transform['args']['mergeName'];
          const newCol: string | undefined = transform['args']['newName'];
          const mergeText: string | undefined = transform['args']['text'];
          if (startCol === undefined || mergeCol === undefined || newCol === undefined || mergeText === undefined)
          {
            throw new Error('Merge transformation must supply colName, mergeName, newName, and text arguments.');
          }
          if (typeof obj[startCol] !== 'string' || typeof obj[mergeCol] !== 'string')
          {
            throw new Error('Can only merge columns containing text.');
          }
          obj[newCol] = String(obj[startCol]) + mergeText + String(obj[mergeCol]);
          if (startCol !== newCol)
          {
            delete obj[startCol];
          }
          if (mergeCol !== newCol)
          {
            delete obj[mergeCol];
          }
          break;
        case 'duplicate':
          colName = transform['colName'];
          const copyName: string | undefined = transform['args']['newName'];
          if (colName === undefined || copyName === undefined)
          {
            throw new Error('Duplicate transformation must supply colName and newName arguments.');
          }
          obj[copyName] = obj[colName];
          break;
        default:
          if (transform['name'] !== 'prepend' && transform['name'] !== 'append')
          {
            throw new Error('Invalid transform name encountered: ' + String(transform['name']));
          }
          colName = transform['colName'];
          const text: string | undefined = transform['args']['text'];
          if (colName === undefined || text === undefined)
          {
            throw new Error('Prepend/append transformation must supply colName and text arguments.');
          }
          if (typeof obj[colName] !== 'string')
          {
            throw new Error('Can only prepend/append to columns containing text.');
          }
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
    return obj;
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
    if (this.NUMERIC_TYPES.has(typeObj['type']))
    {
      return 'number';
    }
    if (typeObj['type'] === 'array')
    {
      return 'array-' + this._buildDesiredHashHelper(typeObj['innerType']);
    }
    return typeObj['type'];
  }

  private _checkDocumentAgainstMapping(document: object, mapping: object): object
  {
    const newDocument: object = document;
    const fieldsInMappingNotInDocument: string[] = _.difference(Object.keys(mapping), Object.keys(document));
    for (const field of fieldsInMappingNotInDocument)
    {
      newDocument[field] = null;
      // TODO: Case 740
      // if (fields[field]['type'] === 'text')
      // {
      //   newDocument[field] = '';
      // }
    }
    const fieldsInDocumentNotMapping = _.difference(Object.keys(newDocument), Object.keys(mapping));
    for (const field of fieldsInDocumentNotMapping)
    {
      delete newDocument[field];
    }
    return newDocument;
  }

  /* checks whether obj has the fields and types specified by nameToType
   * returns an error message if there is one; else returns empty string
   * nameToType: maps field name (string) to object (contains "type" field (string)) */
  private _checkTypes(obj: object, exprt: ExportConfig): void
  {
    const targetHash: string = this._buildDesiredHash(exprt.columnTypes);
    const targetKeys: string = JSON.stringify(Object.keys(exprt.columnTypes).sort());

    // parse dates
    const dateColumns: string[] = [];
    for (const colName of Object.keys(exprt.columnTypes))
    {
      if (exprt.columnTypes.hasOwnProperty(colName) && this._getESType(exprt.columnTypes[colName]) === 'date')
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

    if (this._hashObjectStructure(obj) !== targetHash)
    {
      if (JSON.stringify(Object.keys(obj).sort()) !== targetKeys)
      {
        throw new Error('Encountered an object that does not have the set of specified keys: ' + JSON.stringify(obj));
      }
      for (const key of Object.keys(obj))
      {
        if (obj.hasOwnProperty(key))
        {
          if (!this._jsonCheckTypesHelper(obj[key], exprt.columnTypes[key]))
          {
            throw new Error('Encountered an object whose field "' + key + '"does not match the specified type (' +
              JSON.stringify(exprt.columnTypes[key]) + '): ' + JSON.stringify(obj));
          }
        }
      }
    }

    // check that all elements of arrays are of the same type
    for (const field of Object.keys(exprt.columnTypes))
    {
      if (exprt.columnTypes[field]['type'] === 'array')
      {
        if (obj[field] !== null && !SharedUtil.isTypeConsistent(obj[field]))
        {
          throw new Error('Array in field "' + field + '" of the following object contains inconsistent types: ' + JSON.stringify(obj));
        }
      }
    }
  }

  private _convertArrayToCSVArray(arr: any[]): string
  {
    return JSON.stringify(arr);
  }

  /* parses string input from CSV and checks against expected types ; handles arrays recursively */
  private _csvCheckTypesHelper(item: object, typeObj: object, field: string): boolean
  {
    switch (this.NUMERIC_TYPES.has(typeObj['type']) ? 'number' : typeObj['type'])
    {
      case 'double':
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
      case 'long':
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

  /* assumes arrays are of uniform depth */
  private _getArrayDepth(obj: any): number
  {
    if (Array.isArray(obj))
    {
      return this._getArrayDepth(obj[0]) + 1;
    }
    return 0;
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

  private _getObjectStructureStr(payload: object): string
  {
    let structStr: string = SharedUtil.getType(payload);
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

  /* returns a hash based on the object's field names and data types
   * handles object fields recursively ; only checks the type of the first element of arrays */
  private _hashObjectStructure(payload: object): string
  {
    return sha1(this._getObjectStructureStr(payload));
  }

  // manually checks types (rather than checking hashes) ; handles arrays recursively
  private _jsonCheckTypesHelper(item: object, typeObj: object): boolean
  {
    const type: string = SharedUtil.getType(item);
    if (type === 'null')
    {
      return true;
    }
    if (type === 'number' && this.NUMERIC_TYPES.has(typeObj['type']))
    {
      return true;
    }
    if (typeObj['type'] !== type)
    {
      return false;
    }
    if (type === 'array')
    {
      if (item[0] === undefined)
      {
        return true;
      }
      return this._jsonCheckTypesHelper(item[0], typeObj['innerType']);
    }
    return true;
  }

  private _mergeGroupJoin(doc: object): object
  {
    if (doc['_source'] !== undefined)
    {
      const sourceKeys = Object.keys(doc['_source']);
      const rootKeys = _.without(Object.keys(doc), '_index', '_type', '_id', '_score', '_source');
      if (rootKeys.length > 0) // there were group join objects
      {
        const duplicateRootKeys: string[] = [];
        rootKeys.forEach((rootKey) =>
        {
          if (sourceKeys.indexOf(rootKey) > -1)
          {
            duplicateRootKeys.push(rootKey);
          }
        });
        if (duplicateRootKeys.length !== 0)
        {
          throw new Error('Duplicate keys ' + JSON.stringify(duplicateRootKeys) + ' in root level and source mapping');
        }
        rootKeys.forEach((rootKey) =>
        {
          doc['_source'][rootKey] = doc[rootKey];
          delete doc[rootKey];
        });
      }
    }
    return doc;
  }

  // recursively attempts to parse strings to dates
  private _parseDatesHelper(item: string | object, field: string)
  {
    if (Array.isArray(item[field]))
    {
      let i: number = 0;
      while (i < Object.keys(item[field]).length)
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

  // asynchronously perform transformations on each item to upsert, and check against expected resultant types
  private _transformAndCheck(doc: object, exprt: ExportConfig, dontCheck?: boolean): object
  {
    try
    {
      doc = this._applyTransforms(doc, exprt.transformations);
    }
    catch (e)
    {
      throw new Error('Failed to apply transforms: ' + String(e));
    }
    // only include the specified columns
    // NOTE: unclear if faster to copy everything over or delete the unused ones
    const trimmedDoc: object = {};
    for (const name of Object.keys(exprt.columnTypes))
    {
      if (exprt.columnTypes.hasOwnProperty(name))
      {
        if (typeof doc[name] === 'string')
        {
          trimmedDoc[name] = doc[name].replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        }
        else
        {
          trimmedDoc[name] = doc[name];
        }
      }
    }
    if (dontCheck !== true)
    {
      try
      {
        this._checkTypes(trimmedDoc, exprt);
      }
      catch (e)
      {
        throw e;
      }
    }
    return trimmedDoc;
  }
}

export default Export;
