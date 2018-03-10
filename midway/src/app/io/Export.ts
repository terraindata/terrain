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
import sha1 = require('sha1');
import * as stream from 'stream';
import * as winston from 'winston';

import ESConverter from '../../../../shared/database/elastic/formatter/ESConverter';
import { ESJSONParser } from '../../../../shared/database/elastic/parser/ESJSONParser';
import * as SharedUtil from '../../../../shared/Util';
import { getParsedQuery } from '../../app/Util';
import DatabaseController from '../../database/DatabaseController';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import ItemConfig from '../items/ItemConfig';
import Items from '../items/Items';
import { QueryHandler } from '../query/QueryHandler';

import AExportTransform from './streams/AExportTransform';
import CSVExportTransform from './streams/CSVExportTransform';
import ExportTransform from './streams/ExportTransform';
import JSONExportTransform from './streams/JSONExportTransform';
import ExportTemplateConfig from './templates/ExportTemplateConfig';
import ExportTemplates from './templates/ExportTemplates';
import TemplateBase from './templates/TemplateBase';

import * as Transform from './Transform';

const exportTemplates = new ExportTemplates();
const TastyItems: Items = new Items();

export interface ExportConfig extends TemplateBase, ExportTemplateConfig
{
  filetype: string;
  update: boolean;      // false means replace (instead of update) ; default should be true
}

export class Export
{
  private NUMERIC_TYPES: Set<string> = new Set(['byte', 'short', 'integer', 'long', 'half_float', 'float', 'double']);

  public async export(exportConfig: ExportConfig, headless: boolean): Promise<stream.Readable>
  {
    const database: DatabaseController | undefined = DatabaseRegistry.get(exportConfig.dbid);
    if (database === undefined)
    {
      throw new Error('Database "' + exportConfig.dbid.toString() + '" not found.');
    }

    if (database.getType() !== 'ElasticController')
    {
      throw new Error('File export currently is only supported for Elastic databases.');
    }

    if (exportConfig.filetype !== 'csv' && exportConfig.filetype !== 'json' && exportConfig.filetype !== 'json [type object]')
    {
      throw new Error('Filetype must be either CSV or JSON.');
    }

    if (headless)
    {
      // get a template given the template ID
      const templates: ExportTemplateConfig[] = await exportTemplates.get(exportConfig.templateId);
      if (templates.length === 0)
      {
        throw new Error('Template not found. Did you supply an export template ID?');
      }
      const template = templates[0] as object;
      if (exportConfig.dbid !== template['dbid'])
      {
        throw new Error('Template database ID does not match supplied database ID.');
      }
      for (const templateKey of Object.keys(template))
      {
        exportConfig[templateKey] = template[templateKey];
      }
    }

    const mapping: object = exportConfig.columnTypes;
    if (mapping === undefined)
    {
      throw new Error('Must provide export template column types.');
    }

    return new Promise<stream.Readable>(async (resolve, reject) =>
    {
      // get query data from algorithmId or query (or variant Id if necessary)
      let query: string = '';
      if (exportConfig['variantId'] !== undefined && exportConfig.algorithmId === undefined)
      {
        exportConfig.algorithmId = exportConfig['variantId'];
      }
      if (exportConfig.algorithmId !== undefined && exportConfig.query === undefined)
      {
        query = await this._getQueryFromAlgorithm(exportConfig.algorithmId);
      }
      else if (exportConfig.algorithmId === undefined && exportConfig.query !== undefined)
      {
        query = exportConfig.query;
      }
      else
      {
        throw new Error('Must provide either algorithm ID or query, not both or neither.');
      }

      if (query === '')
      {
        throw new Error('Empty query provided.');
      }

      // get list of export column names
      const columnNames: string[] = Object.keys(mapping);
      if (exportConfig.rank === true && columnNames.indexOf('TERRAINRANK') === -1)
      {
        columnNames.push('TERRAINRANK');
      }

      const originalMapping: object = {};
      // generate original mapping if there were any renames
      const allNames = Object.keys(mapping);
      allNames.forEach((value, i) =>
      {
        originalMapping[value] = value;
      });

      const renameTransformations: object[] = exportConfig.transformations.filter((transformation) => transformation['name'] === 'rename');
      renameTransformations.forEach((transformation) =>
      {
        originalMapping[transformation['colName']] = mapping[transformation['args']['newName']];
      });

      // TODO add transformation check for addcolumn and update mapping accordingly
      const qh: QueryHandler = database.getQueryHandler();
      const payload = {
        database: exportConfig.dbid,
        type: 'search',
        streaming: true,
        databasetype: 'elastic',
        body: query,
      };

      const respStream: stream.Readable = await qh.handleQuery(payload) as stream.Readable;
      if (respStream === undefined)
      {
        throw new Error('Nothing to export.');
      }

      try
      {
        const extractTransformations = exportConfig.transformations.filter((transformation) => transformation['name'] === 'extract');
        exportConfig.transformations = exportConfig.transformations.filter((transformation) => transformation['name'] !== 'extract');

        winston.info('Beginning export transformations.');
        const exportTransformConfig = {
          extractTransformations,
          exportConfig,
          fieldArrayDepths: {},
          id: 1,
          mapping: originalMapping,
        };

        const documentTransform: ExportTransform = new ExportTransform(this, exportTransformConfig);
        let exportTransform: AExportTransform;
        switch (exportConfig.filetype)
        {
          case 'json':
            exportTransform = new JSONExportTransform();
            break;
          case 'csv':
            exportTransform = new CSVExportTransform(columnNames);
            break;
          default:
            throw new Error('File type must be either CSV or JSON.');
        }

        resolve(respStream.pipe(documentTransform).pipe(exportTransform));
      }
      catch (e)
      {
        reject(e);
      }
    });
  }

  public _postProcessDoc(doc: object, cfg: any): object
  {
    // merge top-level fields with _source if necessary
    doc = Transform.mergeDocument(doc);

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

        if (Array.isArray(doc[field]) && cfg.exportConfig.filetype === 'csv')
        {
          doc[field] = this._convertArrayToCSVArray(doc[field]);
        }
      }
    }

    doc = this._transformAndCheck(doc, cfg.exportConfig, false);
    if (cfg.exportConfig.rank === true)
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
  private _checkTypes(obj: object, exportConfig: ExportConfig): void
  {
    const targetHash: string = this._buildDesiredHash(exportConfig.columnTypes);
    const targetKeys: string = JSON.stringify(Object.keys(exportConfig.columnTypes).sort());

    // parse dates
    const dateColumns: string[] = [];
    for (const colName of Object.keys(exportConfig.columnTypes))
    {
      if (exportConfig.columnTypes.hasOwnProperty(colName) && this._getESType(exportConfig.columnTypes[colName]) === 'date')
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
          if (!this._jsonCheckTypesHelper(obj[key], exportConfig.columnTypes[key]))
          {
            throw new Error('Encountered an object whose field "' + key + '"does not match the specified type (' +
              JSON.stringify(exportConfig.columnTypes[key]) + '): ' + JSON.stringify(obj));
          }
        }
      }
    }

    // check that all elements of arrays are of the same type
    for (const field of Object.keys(exportConfig.columnTypes))
    {
      if (exportConfig.columnTypes[field]['type'] === 'array')
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
  private _transformAndCheck(doc: object, exportConfig: ExportConfig, dontCheck?: boolean): object
  {
    try
    {
      doc = Transform.applyTransforms(doc, exportConfig.transformations);
    }
    catch (e)
    {
      throw new Error('Failed to apply transforms: ' + String(e));
    }
    // only include the specified columns
    // NOTE: unclear if faster to copy everything over or delete the unused ones
    const trimmedDoc: object = {};
    for (const name of Object.keys(exportConfig.columnTypes))
    {
      if (exportConfig.columnTypes.hasOwnProperty(name))
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
        this._checkTypes(trimmedDoc, exportConfig);
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
