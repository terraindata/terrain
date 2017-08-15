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

import * as csv from 'fast-csv';
import * as stream from 'stream';
import * as _ from 'underscore';
import * as winston from 'winston';

import { json } from 'd3-request';
import * as SharedUtil from '../../../../shared/fileImport/Util';
import DatabaseController from '../../database/DatabaseController';
import ElasticClient from '../../database/elastic/client/ElasticClient';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Tasty from '../../tasty/Tasty';
import { ItemConfig, Items } from '../items/Items';
import * as Util from '../Util';
import { ExportTemplateConfig, ImportTemplateBase, ImportTemplateConfig, ImportTemplates } from './ImportTemplates';
const importTemplates = new ImportTemplates();

const TastyItems: Items = new Items();

export interface ImportConfig extends ImportTemplateBase
{
  file: stream.Readable;
  filetype: string;     // either 'json' or 'csv'
  update: boolean;      // false means replace (instead of update) ; default should be true
}

export interface ExportConfig extends ImportConfig, ExportTemplateConfig
{
  filetype: string;
  rank?: boolean;
}

export class Import
{
  private BATCH_SIZE: number = 5000;
  private CHUNK_SIZE: number = 10000000;
  private COMPATIBLE_TYPES: object =
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
  private MAX_ACTIVE_READS: number = 3;
  private MAX_ALLOWED_QUEUE_SIZE: number = 3;
  private NUMERIC_TYPES: Set<string> = new Set(['byte', 'short', 'integer', 'long', 'half_float', 'float', 'double']);
  private SCROLL_TIMEOUT: string = '60s';
  private STREAMING_TEMP_FILE_PREFIX: string = 'chunk';
  private STREAMING_TEMP_FOLDER: string = 'import_streaming_tmp';
  private SUPPORTED_COLUMN_TYPES: Set<string> = new Set(Object.keys(this.COMPATIBLE_TYPES).concat(['array']));

  private chunkCount: number;
  private chunkQueue: object[];
  private nextChunk: string;
  private readStream: stream.Readable;

  public async export(exprt: ExportConfig): Promise<stream.Readable | string>
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
      const elasticClient: ElasticClient = database.getClient() as ElasticClient;

      const dbSchema: Tasty.Schema = await database.getTasty().schema();

      // get a template given the template ID
      const templates: ImportTemplateConfig[] = await importTemplates.getExport(exprt.templateID);
      if (templates.length === 0)
      {
        return reject('Template not found.');
      }
      const template = templates[0] as object;
      for (const templateKey of Object.keys(template))
      {
        exprt[templateKey] = template[templateKey];
      }
      if (exprt['export'] === undefined || exprt['export'] === false || Number(exprt['export']) === 0)
      {
        return reject('Cannot use an import template for export.');
      }

      let qry: string = '';
      // get query data from variantId or query
      if (exprt.variantId !== undefined && exprt.query === undefined)
      {
        const variants: ItemConfig[] = await TastyItems.get(exprt.variantId);
        if (variants.length === 0)
        {
          return reject('Variant not found.');
        }
        if (variants[0]['meta'] !== undefined)
        {
          const variantMeta: object = JSON.parse(variants[0]['meta'] as string);
          if (variantMeta['query'] !== undefined && variantMeta['query']['tql'] !== undefined)
          {
            qry = variantMeta['query']['tql'];
          }
        }
      }
      else if (exprt.variantId === undefined && exprt.query !== undefined)
      {
        qry = exprt.query;
      }
      else
      {
        return reject('Must provide either variant ID or query, not both or neither.');
      }
      if (qry === '')
      {
        return reject('Empty query provided.');
      }
      let rankCounter: number = 1;
      const writer = csvWriter();
      const pass = new stream.PassThrough();
      writer.pipe(pass);
      const qryObj: object = JSON.parse(qry);
      if (qryObj.hasOwnProperty('terrainRank') && exprt.rank === true)
      {
        return reject('Conflicting field: terrainRank.');
      }
      qryObj['scroll'] = this.SCROLL_TIMEOUT;
      let errMsg: string = '';
      elasticClient.search(qryObj, async function getMoreUntilDone(err, resp)
      {
        if (resp.hits === undefined || resp.hits.total === 0)
        {
          writer.end();
          errMsg = 'Nothing to export.';
          return reject(errMsg);
        }
        const newDocs: object[] = resp.hits.hits as object[];
        if (newDocs.length === 0)
        {
          writer.end();
          return resolve(pass);
        }
        let returnDocs: object[] = [];
        for (const doc of newDocs)
        {
          // verify schema mapping with documents and fix documents accordingly
          const newDoc: object | string = await this._checkDocumentAgainstMapping(doc['_source'], dbSchema, exprt.dbname);
          if (typeof newDoc === 'string')
          {
            writer.end();
            errMsg = newDoc;
            return reject(errMsg);
          }
          newDoc['terrainRank'] = rankCounter;
          for (const field of Object.keys(newDoc))
          {
            if (newDoc.hasOwnProperty(field) && newDoc[field] instanceof Array)
            {
              newDoc[field] = this._convertArrayToCSVArray(newDoc[field]);
            }
          }
          returnDocs.push(newDoc as object);
          rankCounter++;
        }

        // transform documents with template
        try
        {
          returnDocs = [].concat.apply([], await this._transformAndCheck(returnDocs, exprt, true, exprt.rank));
        } catch (e)
        {
          writer.end();
          errMsg = e;
          return reject(errMsg);
        }

        // export to csv
        for (const returnDoc of returnDocs)
        {
          writer.write(returnDoc);
        }
        if (Math.min(resp.hits.total, qryObj['size']) > rankCounter - 1)
        {
          elasticClient.scroll({
            scrollId: resp._scroll_id,
            scroll: this.SCROLL_TIMEOUT,
          }, getMoreUntilDone);
        }
        else
        {
          writer.end();
          resolve(pass);
        }
      }.bind(this),
      );
    });
  }

  public async upsert(files: stream.Readable[], fields: object, headless: boolean): Promise<ImportConfig>
  {
    return new Promise<ImportConfig>(async (resolve, reject) =>
    {
      const update: boolean | string = this._parseBooleanField(fields, 'update', false);
      if (typeof update === 'string')
      {
        return reject(update);
      }

      let file: stream.Readable | null = null;
      for (const f of files)
      {
        if (f['fieldname'] === 'file')
        {
          file = f;
        }
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
      let csvHeaderRemoved: boolean = (fields['filetype'] !== 'csv') || !hasCsvHeader;
      let jsonBracketRemoved: boolean = fields['filetype'] !== 'json';

      let imprtConf: ImportConfig;
      if (headless)
      {
        const templates: ImportTemplateConfig[] = await importTemplates.getImport(Number(fields['templateID']));
        if (templates.length === 0)
        {
          return reject('Invalid template ID provided: ' + String(fields['templateID']));
        }
        const template: ImportTemplateConfig = templates[0];

        imprtConf = {
          columnTypes: template['columnTypes'],
          dbid: template['dbid'],
          dbname: template['dbname'],
          file,
          filetype: fields['filetype'],
          originalNames: template['originalNames'],
          primaryKey: template['primaryKey'],
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
          const transformations: object[] = JSON.parse(fields['transformations']);

          imprtConf = {
            columnTypes,
            dbid: Number(fields['dbid']),
            dbname: fields['dbname'],
            file,
            filetype: fields['filetype'],
            originalNames,
            primaryKey: fields['primaryKey'],
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

      const time: number = Date.now();
      winston.info('checking config and schema...');
      const configError: string = this._verifyConfig(imprtConf);
      if (configError !== '')
      {
        return reject(configError);
      }
      const expectedMapping: object = this._getMappingForSchema(imprtConf);
      const mappingForSchema: object | string =
        this._checkMappingAgainstSchema(expectedMapping, await database.getTasty().schema(), imprtConf.dbname);
      if (typeof mappingForSchema === 'string')
      {
        return reject(mappingForSchema);
      }
      winston.info('checked config and schema (s): ' + String((Date.now() - time) / 1000));

      const columns: string[] = Object.keys(imprtConf.columnTypes);
      const insertTable: Tasty.Table = new Tasty.Table(
        imprtConf.tablename,
        [imprtConf.primaryKey],
        columns,
        imprtConf.dbname,
        mappingForSchema,
      );

      await this._deleteStreamingTempFolder();
      await Util.mkdir(this.STREAMING_TEMP_FOLDER);

      this.readStream = file;
      this.chunkQueue = [];
      this.nextChunk = '';
      this.chunkCount = 0;
      let contents: string = '';
      this.readStream.on('data', async (chunk) =>
      {
        contents += chunk.toString();
        if (contents.length > this.CHUNK_SIZE)
        {
          const chunkError: string = this._enqueueChunk(imprtConf, contents, false, csvHeaderRemoved, jsonBracketRemoved);
          if (chunkError !== '')
          {
            return reject(chunkError);
          }
          csvHeaderRemoved = true;
          jsonBracketRemoved = true;
          contents = '';
          if (this.chunkQueue.length >= this.MAX_ALLOWED_QUEUE_SIZE)
          {
            this.readStream.pause();
          }
          try
          {
            await this._writeNextChunk(imprtConf);
          }
          catch (e)
          {
            await this._deleteStreamingTempFolder();
            return reject(e);
          }
        }
      });
      this.readStream.on('error', async (e) =>
      {
        await this._deleteStreamingTempFolder();
        return reject(e);
      });
      this.readStream.on('end', async () =>
      {
        if (contents !== '')
        {
          const chunkError: string = this._enqueueChunk(imprtConf, contents, true, csvHeaderRemoved, jsonBracketRemoved);
          if (chunkError !== '')
          {
            await this._deleteStreamingTempFolder();
            return reject(chunkError);
          }
          csvHeaderRemoved = true;
          jsonBracketRemoved = true;
        }
        else
        {
          if (this.chunkQueue.length === 0)
          {
            await this._deleteStreamingTempFolder();
            return reject('Logic issue with streaming queue.');    // shouldn't happen
          }
          this.chunkQueue[this.chunkQueue.length - 1]['isLast'] = true;
        }
        while (this.chunkQueue.length > 0)
        {
          try
          {
            await this._writeNextChunk(imprtConf);
          }
          catch (e)
          {
            await this._deleteStreamingTempFolder();
            return reject(e);
          }
        }

        try
        {
          await this._streamingUpsert(imprtConf, database, insertTable);
        }
        catch (e)
        {
          await this._deleteStreamingTempFolder();
          return reject(e);
        }

        resolve(imprtConf);
      });
    });
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
          obj[newName] = obj[oldName];
          delete obj[oldName];
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
          delete obj[startCol];
          delete obj[mergeCol];
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

  private async _checkDocumentAgainstMapping(document: object, schema: Tasty.Schema, database: string): Promise<object | string>
  {
    return new Promise<object | string>(async (resolve, reject) =>
    {
      const newDocument: object = document;
      if (schema.tableNames(database).length === 0)
      {
        return resolve('Schema not found for database ' + database);
      }
      for (const table of schema.tableNames(database))
      {
        const fields: object = schema.fields(database, table);
        const fieldsInMappingNotInDocument: string[] = _.difference(Object.keys(fields), Object.keys(document));
        for (const field of fieldsInMappingNotInDocument)
        {
          newDocument[field] = null;
          if (fields[field]['type'] === 'text')
          {
            newDocument[field] = '';
          }
        }
        const fieldsInDocumentNotMapping = _.difference(Object.keys(newDocument), Object.keys(fields));
        for (const field of fieldsInDocumentNotMapping)
        {
          delete newDocument[field];
        }
      }
      resolve(newDocument);
    });
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
      for (const field of Object.keys(fields))
      {
        if (fields.hasOwnProperty(field) && fieldsToCheck.has(field))
        {
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

  /* checks whether obj has the fields and types specified by nameToType
   * returns an error message if there is one; else returns empty string
   * nameToType: maps field name (string) to object (contains "type" field (string)) */
  private _checkTypes(obj: object, imprt: ImportConfig): string
  {
    if (imprt.filetype === 'json')
    {
      const targetHash: string = this._buildDesiredHash(imprt.columnTypes);
      const targetKeys: string = JSON.stringify(Object.keys(imprt.columnTypes).sort());

      // parse dates
      const dateColumns: string[] = [];
      for (const colName of Object.keys(imprt.columnTypes))
      {
        if (imprt.columnTypes.hasOwnProperty(colName) && this._getESType(imprt.columnTypes[colName]) === 'date')
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
          return 'Encountered an object that does not have the set of specified keys: ' + JSON.stringify(obj);
        }
        for (const key of Object.keys(obj))
        {
          if (obj.hasOwnProperty(key) && obj[key] !== null)
          {
            if (!this._jsonCheckTypesHelper(obj[key], imprt.columnTypes[key]))
            {
              return 'Encountered an object whose field "' + key + ' does not match the specified type (' +
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
            return 'Encountered an object whose field "' + name + ' does not match the specified type (' +
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
        if (obj[field] !== null && !this._isTypeConsistent(obj[field]))
        {
          return 'Array in field "' + field + '" of the following object contains inconsistent types: ' + JSON.stringify(obj);
        }
      }
    }

    if (obj[imprt.primaryKey] === '' || obj[imprt.primaryKey] === null)
    {
      return 'Encountered an object with an empty primary key: ' + JSON.stringify(obj);
    }

    return '';
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

  private async _deleteStreamingTempFolder()
  {
    try
    {
      await Util.rmdir(this.STREAMING_TEMP_FOLDER);
    }
    catch (e)
    {
      // can't catch this error more gracefully, or else would end up in an infinite cycle
      throw new Error('Failed to clean streaming temp folder: ' + String(e));
    }
  }

  /* streaming helper function ; enqueue the next chunk of data for processing
   * returns an error message if there was one, else empty string */
  private _enqueueChunk(imprt: ImportConfig, contents: string, isLast: boolean,
    csvHeaderRemoved: boolean, jsonBracketRemoved: boolean): string
  {
    if (!csvHeaderRemoved)
    {
      const ind: number = contents.indexOf('\n');
      const headers: string[] = contents.substring(0, ind).split(',');
      if (headers.length !== imprt.originalNames.length)
      {
        return 'CSV header does not contain the expected number of columns (' +
          String(imprt.originalNames.length) + '): ' + JSON.stringify(headers);
      }
      contents = contents.substring(ind + 1, contents.length);
    }
    else if (!jsonBracketRemoved)
    {
      contents = contents.substring(contents.indexOf('[') + 1, contents.length);
    }
    this.chunkQueue.push({ chunk: contents, isLast });
    return '';
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

  private async _getItems(imprt: ImportConfig, contents: string): Promise<object[]>
  {
    return new Promise<object[]>(async (resolve, reject) =>
    {
      let time: number = Date.now();
      winston.info('parsing data...');
      let items: object[];
      try
      {
        items = await this._parseData(imprt, contents);
      } catch (e)
      {
        return reject('Error parsing data: ' + String(e));
      }
      winston.info('got parsed data! (s): ' + String((Date.now() - time) / 1000));
      time = Date.now();
      winston.info('transforming and type-checking data...');
      if (items.length === 0)
      {
        return reject('No data provided in file to upload.');
      }
      try
      {
        items = [].concat.apply([], await this._transformAndCheck(items, imprt));
      } catch (e)
      {
        return reject(e);
      }
      winston.info('transformed (and type-checked) data! (s): ' + String((Date.now() - time) / 1000));
      resolve(items);
    });
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
    for (const key of Object.keys(mapping))
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

  /* returns a hash based on the object's field names and data types
   * handles object fields recursively ; only checks the type of the first element of arrays */
  private _hashObjectStructure(payload: object): string
  {
    return sha1(this._getObjectStructureStr(payload));
  }

  /* proposed: ES mapping
   * existing: ES mapping */
  private _isCompatibleType(proposed: object, existing: object): boolean
  {
    const proposedType: string = proposed['type'];
    return this.COMPATIBLE_TYPES[proposedType] !== undefined && this.COMPATIBLE_TYPES[proposedType].has(existing['type']);
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

  /* manually checks types (rather than checking hashes) ; handles arrays recursively */
  private _jsonCheckTypesHelper(item: object, typeObj: object): boolean
  {
    const thisType: string = this._getType(item);
    if (thisType === 'number' && this.NUMERIC_TYPES.has(typeObj['type']))
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

  /* parses obj[field] (string) into a boolean, if possible.
   * defaultRet: default return value if obj[field] is undefined */
  private _parseBooleanField(obj: object, field: string, defaultRet: boolean): boolean | string
  {
    let parsed: boolean = defaultRet;
    if (obj[field] === 'false')
    {
      parsed = false;
    }
    else if (obj[field] !== undefined && obj[field] !== 'true')
    {
      return 'Invalid value for parameter "' + field + '": ' + String(obj[field]);
    }
    return parsed;
  }

  private async _parseData(imprt: ImportConfig, contents: string): Promise<object[]>
  {
    return new Promise<object[]>(async (resolve, reject) =>
    {
      if (imprt.filetype === 'json')
      {
        try
        {
          const items: object[] = JSON.parse(contents);
          if (!Array.isArray(items))
          {
            return reject('Input JSON file must parse to an array of objects.');
          }

          const expectedCols: string = JSON.stringify(imprt.originalNames.sort());
          for (const obj of items)
          {
            if (JSON.stringify(Object.keys(obj).sort()) !== expectedCols)
            {
              return reject('JSON file contains an object that does not contain the expected fields. Got fields: ' +
                JSON.stringify(Object.keys(obj).sort()) + '\nExpected: ' + expectedCols);
            }
          }
          resolve(items);
        } catch (e)
        {
          return reject('JSON format incorrect: ' + String(e));
        }
      } else if (imprt.filetype === 'csv')
      {
        const items: object[] = [];
        csv.fromString(contents, { ignoreEmpty: true }).on('data', (data) =>
        {
          if (data.length !== imprt.originalNames.length)
          {
            return reject('CSV row does not contain the expected number of entries (' +
              String(imprt.originalNames.length) + '): ' + JSON.stringify(data));
          }
          const obj: object = {};
          imprt.originalNames.forEach((val, ind) =>
          {
            obj[val] = data[ind];
          });
          items.push(obj);
        }).on('error', (e) =>
        {
          return reject('CSV format incorrect: ' + String(e));
        }).on('end', () =>
        {
          resolve(items);
        });
      }
    });
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

  /* streaming helper function ; read from temp file number "num" to upsert to tasty */
  private async _readFileAndUpsert(imprt: ImportConfig, database: DatabaseController, insertTable: Tasty.Table, num: number)
  {
    return new Promise<void>(async (resolve, reject) =>
    {
      winston.info('BEGINNING read file upload number ' + String(num));
      let items: object[];
      try
      {
        const data: string = await Util.readFile(this.STREAMING_TEMP_FOLDER + '/' + this.STREAMING_TEMP_FILE_PREFIX + String(num),
          { encoding: 'utf8' }) as string;

        const time = Date.now();
        winston.info('about to upsert to tasty...');
        items = JSON.parse(data);
        if (imprt.update)
        {
          await database.getTasty().update(insertTable, items);
        }
        else
        {
          await database.getTasty().upsert(insertTable, items);
        }
        winston.info('upserted to tasty (s): ' + String((Date.now() - time) / 1000));
        winston.info('FINISHED read file upload number ' + String(num));
        resolve();
      }
      catch (err)
      {
        return reject(err);
      }
    });
  }

  /* after type-checking has completed, read from temp files to upsert via Tasty, and delete the temp files */
  private async _streamingUpsert(imprt: ImportConfig, database: DatabaseController, insertTable: Tasty.Table): Promise<void>
  {
    return new Promise<void>(async (resolve, reject) =>
    {
      const time: number = Date.now();
      winston.info('putting mapping...');
      await database.getTasty().getDB().putMapping(insertTable);
      winston.info('put mapping (s): ' + String((Date.now() - time) / 1000));

      winston.info('opening files for upsert...');
      let totalReads: number = 0;
      while (totalReads < this.chunkCount)
      {
        const promises: Array<Promise<void>> = [];
        const readNum: number = Math.min(this.MAX_ACTIVE_READS, this.chunkCount - totalReads);
        for (let num = totalReads; num < totalReads + readNum; num++)
        {
          promises.push(this._readFileAndUpsert(imprt, database, insertTable, num));
        }
        try
        {
          await Promise.all(promises);
        }
        catch (err)
        {
          return reject('Failed to read from temp file: ' + String(err));
        }
        totalReads += readNum;
      }
      await this._deleteStreamingTempFolder();
      winston.info('deleted streaming temp folder');
      resolve();
    });
  }

  /* asynchronously perform transformations on each item to upsert, and check against expected resultant types */
  private async _transformAndCheck(allItems: object[], imprt: ImportConfig | ExportConfig,
    dontCheck?: boolean, rank?: boolean): Promise<object[][]>
  {
    const promises: Array<Promise<object[]>> = [];
    let items: object[];
    while (allItems.length > 0)
    {
      items = allItems.splice(0, this.BATCH_SIZE);
      promises.push(
        new Promise<object[]>(async (thisResolve, thisReject) =>
        {
          const transformedItems: object[] = [];
          for (let item of items)
          {
            try
            {
              item = this._applyTransforms(item, imprt.transformations);
            } catch (e)
            {
              return thisReject('Failed to apply transforms: ' + String(e));
            }
            // only include the specified columns ; NOTE: unclear if faster to copy everything over or delete the unused ones
            const trimmedItem: object = {};
            for (const name of Object.keys(imprt.columnTypes))
            {
              if (imprt.columnTypes.hasOwnProperty(name))
              {
                trimmedItem[name] = item[name];
              }
            }
            if (dontCheck !== true)
            {
              const typeError: string = this._checkTypes(trimmedItem, imprt);
              if (typeError !== '')
              {
                return thisReject(typeError);
              }
            }
            if (rank === true)
            {
              trimmedItem['terrainRank'] = item['terrainRank'];
            }
            transformedItems.push(trimmedItem);
          }
          thisResolve(transformedItems);
        }));
    }
    return Promise.all(promises);
  }

  /* returns an error message if there are any; else returns empty string */
  private _verifyConfig(imprt: ImportConfig): string
  {
    const indexError: string = SharedUtil.isValidIndexName(imprt.dbname);
    if (indexError !== '')
    {
      return indexError;
    }
    const typeError: string = SharedUtil.isValidTypeName(imprt.tablename);
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
    if (!columns.has(imprt.primaryKey))
    {
      return 'A column to be included in the uploaded must be specified as the primary key.';
    }
    let fieldError: string;
    for (const colName of columnList)
    {
      fieldError = SharedUtil.isValidFieldName(colName);
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

  /* streaming helper function ; slice "chunk" into a coherent piece of data, process it, and write the results to a temp file */
  private async _writeItemsFromChunkToFile(imprt: ImportConfig, chunk: string, isLast: boolean): Promise<void>
  {
    return new Promise<void>(async (resolve, reject) =>
    {
      // get valid piece of data
      let thisChunk: string = '';
      if (imprt.filetype === 'csv')
      {
        const end: number = isLast ? chunk.length : chunk.lastIndexOf('\n');
        thisChunk = this.nextChunk + String(chunk.substring(0, end));
        this.nextChunk = chunk.substring(end + 1, chunk.length);
      }
      else if (imprt.filetype === 'json')
      {
        // open square-bracket has already been removed by frontend/headless preprocessing
        if (isLast)
        {
          thisChunk = '[' + this.nextChunk + chunk;
          this.nextChunk = '';
        }
        else
        {
          thisChunk = this.nextChunk + chunk;
          let left: number = 0;
          let right: number = 0;
          let match: number = 0;
          let previousMatch: boolean = true;
          for (let i = 0; i < thisChunk.length; i++)
          {
            if (left === right)
            {
              if (!previousMatch)
              {
                match = i;
              }
              previousMatch = true;
            }
            else
            {
              previousMatch = false;
            }
            if (thisChunk.charAt(i) === '{')
            {
              left++;
            }
            else if (thisChunk.charAt(i) === '}')
            {
              right++;
            }
          }
          this.nextChunk = thisChunk.substring(match, thisChunk.length);
          const trimmedNextChunk: string = this.nextChunk.trim();
          if (trimmedNextChunk.length > 0 && trimmedNextChunk.charAt(0) !== ',')
          {
            return reject('JSON format incorrect.');
          }
          this.nextChunk = this.nextChunk.substring(this.nextChunk.indexOf(',') + 1, this.nextChunk.length);
          thisChunk = '[' + thisChunk.substring(0, match) + ']';
        }
      }

      let items: object[];
      try
      {
        items = await this._getItems(imprt, thisChunk);
      }
      catch (e)
      {
        return reject('Failed to get items: ' + String(e));
      }
      winston.info('streaming server got items from data');

      try
      {
        winston.info('opening file for writing...');
        await Util.writeFile(this.STREAMING_TEMP_FOLDER + '/' + this.STREAMING_TEMP_FILE_PREFIX + String(this.chunkCount),
          JSON.stringify(items), { flag: 'wx' });
        winston.info('wrote items to file.');
      }
      catch (err)
      {
        return reject('Failed to dump to temp file: ' + String(err));
      }
      this.chunkCount++;
      resolve();
    });
  }

  /* streaming helper function ; dequeue the next chunk of data, process it, and write the results to a temp file */
  private async _writeNextChunk(imprt: ImportConfig): Promise<void>
  {
    if (this.chunkQueue.length === 0 || (this.chunkQueue.length === 1 && !this.chunkQueue[0]['isLast']))
    {
      return;
    }
    const chunkObj: object = this.chunkQueue.shift() as object;
    if (this.chunkQueue.length < this.MAX_ALLOWED_QUEUE_SIZE)
    {
      this.readStream.resume();
    }
    return this._writeItemsFromChunkToFile(imprt, chunkObj['chunk'], chunkObj['isLast']);
  }
}

export default Import;
