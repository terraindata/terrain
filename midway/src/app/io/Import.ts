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

import aesjs = require('aes-js');
import sha1 = require('sha1');

import * as bcrypt from 'bcrypt';
import * as csv from 'fast-csv';
import * as keccak from 'keccak';
import * as _ from 'lodash';
import * as promiseQueue from 'promise-queue';
import * as stream from 'stream';
import * as winston from 'winston';

import * as SharedElasticUtil from '../../../../shared/database/elastic/ElasticUtil';
import { CSVTypeParser } from '../../../../shared/etl/CSVTypeParser';
import { FieldTypes } from '../../../../shared/etl/FieldTypes';
import * as SharedUtil from '../../../../shared/Util';
import DatabaseController from '../../database/DatabaseController';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Tasty from '../../tasty/Tasty';
import * as Util from '../Util';
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
  private CHUNK_SIZE: number = 10000000;
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
  private MAX_ACTIVE_READS: number = 3;
  private MAX_ALLOWED_QUEUE_SIZE: number = 3;
  private NUMERIC_TYPES: Set<string> = new Set(['byte', 'short', 'integer', 'long', 'half_float', 'float', 'double']);
  private STREAMING_TEMP_FILE_PREFIX: string = 'chunk';
  private STREAMING_TEMP_FOLDER: string = 'import_streaming_tmp';
  private SUPPORTED_COLUMN_TYPES: Set<string> = new Set(Object.keys(this.COMPATIBLE_TYPES).concat(['array']));

  private chunkCount: number;
  private chunkQueue: object[];
  private nextChunk: string;

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
      let csvHeaderRemoved: boolean = (fields['filetype'] !== 'csv') || !hasCsvHeader;
      let jsonBracketRemoved: boolean = !(fields['filetype'] === 'json' && !isNewlineSeparatedJSON);

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

      const time: number = Date.now();
      winston.info('File Import: beginning config/schema check.');
      const configError: string = this._verifyConfig(imprtConf);
      if (configError !== '')
      {
        return reject(configError);
      }
      const expectedMapping: object = await this._getMappingForSchema(imprtConf);
      const mappingForSchema: object | string =
        this._checkMappingAgainstSchema(expectedMapping, await database.getTasty().schema(), imprtConf.dbname);
      if (typeof mappingForSchema === 'string')
      {
        return reject(mappingForSchema);
      }
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

      await this._deleteStreamingTempFolder();
      await Util.mkdir(this.STREAMING_TEMP_FOLDER);

      this.chunkQueue = [];
      this.nextChunk = '';
      this.chunkCount = 0;
      let contents: string = '';
      file.on('data', async (chunk) =>
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
            (file as stream.Readable).pause();     // hack around silly lint error
            try
            {
              // do not read the last one in case "isLast" still needs to be set through the "end" event below
              await this._writeFromChunkQueue(imprtConf, 1);
            }
            catch (e)
            {
              await this._deleteStreamingTempFolder();
              return reject(e);
            }
            (file as stream.Readable).resume();     // hack around silly lint error
          }
        }
      });
      file.on('error', async (e) =>
      {
        await this._deleteStreamingTempFolder();
        return reject(e);
      });
      file.on('end', async () =>
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
        try
        {
          await this._writeFromChunkQueue(imprtConf, 0);
        }
        catch (e)
        {
          await this._deleteStreamingTempFolder();
          return reject(e);
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

  private async _applyTransforms(obj: object, transforms: object[]): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {

      let colName: string | undefined;
      for (const transform of transforms)
      {
        switch (transform['name'])
        {
          case 'encrypt':
            const oldColEncryptName: string | undefined = transform['colName'];
            const key: string | undefined = transform['args']['key'];
            if (oldColEncryptName === undefined || key === undefined)
            {
              throw new Error('Column name and key must be provided.');
            }
            if ((key as string).length !== 32)
            {
              throw new Error('Encryption key must be exactly 32 characters.');
            }
            const byteKey: any = aesjs.utils.utf8.toBytes(key as string);
            const msgToEncrypt: string = typeof obj[oldColEncryptName as string] === 'string'
              ? obj[oldColEncryptName as string] : JSON.stringify(obj[oldColEncryptName as string]);
            const msgBytes: any = aesjs.utils.utf8.toBytes(msgToEncrypt);
            const aesCtr = new aesjs.ModeOfOperation.ctr(byteKey, new aesjs.Counter(5));
            obj[oldColEncryptName as string] = aesjs.utils.hex.fromBytes(aesCtr.encrypt(msgBytes));
            break;
          case 'decrypt':
            const oldColDecryptName: string | undefined = transform['colName'];
            const keyDecrypt: string | undefined = transform['args']['key'];
            if (oldColDecryptName === undefined || keyDecrypt === undefined)
            {
              throw new Error('Column name and key must be provided.');
            }
            if ((keyDecrypt as string).length !== 32)
            {
              throw new Error('Decryption key must be exactly 32 characters.');
            }
            const byteKeyDecrypt: any = aesjs.utils.utf8.toBytes(keyDecrypt as string);
            const msgToDecrypt: string = typeof obj[oldColDecryptName as string] === 'string'
              ? obj[oldColDecryptName as string] : JSON.stringify(obj[oldColDecryptName as string]);
            const decryptedMsgBytes: any = aesjs.utils.hex.toBytes(msgToDecrypt);
            const aesCtrDecrypt = new aesjs.ModeOfOperation.ctr(byteKeyDecrypt, new aesjs.Counter(5));
            obj[oldColDecryptName as string] = aesjs.utils.utf8.fromBytes(aesCtrDecrypt.decrypt(decryptedMsgBytes));
            break;
          case 'hash':
            const oldColHashName: string | undefined = transform['colName'];
            const bcryptSalt: string | undefined = transform['args']['bcryptSalt'];
            const sha3Salt: string | undefined = transform['args']['sha3Salt'];
            if (oldColHashName === undefined || bcryptSalt === undefined || sha3Salt === undefined)
            {
              throw new Error('Column name, bcrypt salt, and SHA3 salt must be provided.');
            }
            if ((bcryptSalt as string).length < 72)
            {
              throw new Error('bcrypt salt is < 72 characters.');
            }
            const msgToHash: string = typeof obj[oldColHashName as string] === 'string'
              ? obj[oldColHashName as string] : JSON.stringify(obj[oldColHashName as string]);
            const sha3Hashed: string = keccak('sha3-256').update(msgToHash + sha3Salt as string).digest('hex');
            // use BCRYPT_VERSION 2a, 10 rounds
            obj[oldColHashName as string] = await bcrypt.hash(sha3Hashed, '$2a$10$' + (bcryptSalt as string));
            break;
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
      return resolve(obj);
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

      if (this._hashObjectStructure(obj) !== targetHash)
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
              return 'Encountered an object whose field "' + key + '"does not match the specified type (' +
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
            return 'Encountered an object whose field "' + name + '"does not match the specified type (' +
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
        if (obj[field] !== null && !SharedUtil.isTypeConsistent(obj[field]))
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

  private async _getItems(imprt: ImportConfig, contents: string): Promise<object[]>
  {
    return new Promise<object[]>(async (resolve, reject) =>
    {
      let time: number = Date.now();
      winston.info('File Import: beginning data parsing.');
      let items: object[];
      try
      {
        items = await this._parseData(imprt, contents);
      } catch (e)
      {
        return reject('Error parsing data: ' + String(e));
      }
      winston.info('File Import: finished parsing data. Time (s): ' + String((Date.now() - time) / 1000));
      time = Date.now();
      winston.info('File Import: beginning transform/type-checking of data.');
      if (items.length === 0)
      {
        return resolve(items);
      }
      try
      {
        items = [].concat.apply([], await this._transformAndCheck(items, imprt));
      } catch (e)
      {
        return reject(e);
      }
      winston.info('File Import: finished transforming/type-checking data. Time (s): ' + String((Date.now() - time) / 1000));
      resolve(items);
    });
  }

  /* converts type specification from ImportConfig into ES mapping format (ready to insert using ElasticDB.putMapping()) */
  private async _getMappingForSchema(imprt: ImportConfig): Promise<object>
  {
    return fieldTypes.getESMappingFromDocument(imprt.columnTypes);
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
    const thisType: string = SharedUtil.getType(item);
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

  private async _parseData(imprt: ImportConfig, contents: string): Promise<object[]>
  {
    return new Promise<object[]>(async (resolve, reject) =>
    {
      if (imprt.filetype === 'json')
      {
        let items: object[];
        if (imprt.isNewlineSeparatedJSON === true)
        {
          const stringItems: string[] = contents.split(/\r|\n/);
          items = [];
          for (const str of stringItems)
          {
            try
            {
              if (str !== '')
              {
                items.push(JSON.parse(str));
              }
            }
            catch (e)
            {
              return reject('JSON format incorrect: Could not parse object: ' + str);
            }
          }
        }
        else
        {
          try
          {
            items = JSON.parse(contents);
            if (!Array.isArray(items))
            {
              return reject('Input JSON file must parse to an array of objects.');
            }
          }
          catch (e)
          {
            return reject('JSON format incorrect: ' + String(e));
          }
        }

        if (imprt['requireJSONHaveAllFields'] !== false)
        {
          const expectedCols: string = JSON.stringify(imprt.originalNames.sort());
          for (const obj of items)
          {
            if (JSON.stringify(Object.keys(obj).sort()) !== expectedCols)
            {
              return reject('JSON file contains an object that does not contain the expected fields. Got fields: ' +
                JSON.stringify(Object.keys(obj).sort()) + '\nExpected: ' + expectedCols);
            }
          }
        }
        else
        {
          for (const obj of items)
          {
            const fieldsInDocumentNotExpected = _.difference(Object.keys(obj), imprt.originalNames);
            for (const field of fieldsInDocumentNotExpected)
            {
              if (obj.hasOwnProperty(field))
              {
                return reject('JSON file contains an object with an unexpected field ("' + String(field) + '"): ' +
                  JSON.stringify(obj));
              }
              delete obj[field];
            }
            const expectedFieldsNotInDocument = _.difference(imprt.originalNames, Object.keys(obj));
            for (const field of expectedFieldsNotInDocument)
            {
              obj[field] = null;
            }
          }
        }
        resolve(items);
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
      winston.info('File Import: beginning read/upload file number ' + String(num) + '.');
      let items: object[];
      try
      {
        const data: string = await Util.readFile(this.STREAMING_TEMP_FOLDER + '/' + this.STREAMING_TEMP_FILE_PREFIX + String(num),
          { encoding: 'utf8' }) as string;

        const time = Date.now();
        winston.info('File Import: about to update/upsert to ES.');
        items = JSON.parse(data);
        if (items.length === 0)
        {
          return resolve();
        }
        if (imprt.update)
        {
          await database.getTasty().update(insertTable, items);
        }
        else
        {
          await database.getTasty().upsert(insertTable, items);
        }
        winston.info('File Import: finished update/upsert to ES. Time (s): ' + String((Date.now() - time) / 1000));
        winston.info('File Import: finished read/upload file number ' + String(num) + '.');
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
      winston.info('File Import: beginning to insert ES mapping.');
      await database.getTasty().getDB().putMapping(insertTable);
      winston.info('File Import: finished inserted ES mapping. Time (s): ' + String((Date.now() - time) / 1000));

      const queue = new promiseQueue(this.MAX_ACTIVE_READS, this.chunkCount);
      let counter: number = 0;
      for (let num = 0; num < this.chunkCount; num++)
      {
        queue.add(() =>
          new Promise<void>(async (thisResolve, thisReject) =>
          {
            await this._readFileAndUpsert(imprt, database, insertTable, num);
            counter++;
            if (counter === this.chunkCount)
            {
              try
              {
                await this._deleteStreamingTempFolder();
                winston.info('File Import: deleted streaming temp folder.');
                resolve();
              }
              catch (e)
              {
                reject(e);
              }
            }
            thisResolve();
          }));
      }
    });
  }

  /* asynchronously perform transformations on each item to upsert, and check against expected resultant types */
  private async _transformAndCheck(allItems: object[], imprt: ImportConfig,
    dontCheck?: boolean): Promise<object[][]>
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
              item = await this._applyTransforms(item, imprt.transformations);
            } catch (e)
            {
              return thisReject('Failed to apply transforms: ' + String(e));
            }
            // only include the specified columns ; NOTE: unclear if faster to copy everything over or delete the unused ones
            const specifiedColumnItem: object = {};
            Object.keys(imprt.columnTypes).forEach((name) =>
            {
              specifiedColumnItem[name] = item[name];
            });

            if (dontCheck !== true)
            {
              const typeError: string = this._checkTypes(specifiedColumnItem, imprt);
              if (typeError !== '')
              {
                return thisReject(typeError);
              }
            }
            const trimmedItem: object = this._convertDateToESDateAndTrim(specifiedColumnItem, imprt.columnTypes);
            transformedItems.push(trimmedItem);
          }
          thisResolve(transformedItems);
        }));
    }
    return Promise.all(promises);
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

  /* streaming helper function ; dequeue the next chunk of data, process it, and write the results to a temp file */
  private async _writeFromChunkQueue(imprt: ImportConfig, targetQueueSize: number): Promise<void[]>
  {
    const promises: Array<Promise<void>> = [];
    while (this.chunkQueue.length > targetQueueSize)
    {
      const chunkObj: object = this.chunkQueue.shift() as object;
      promises.push(this._writeItemsFromChunkToFile(imprt, chunkObj['chunk'], chunkObj['isLast'], this.chunkCount));
      this.chunkCount++;
    }
    return Promise.all(promises);
  }

  /* streaming helper function ; slice "chunk" into a coherent piece of data, process it, and write the results to a temp file */
  private async _writeItemsFromChunkToFile(imprt: ImportConfig, chunk: string, isLast: boolean, num: number): Promise<void>
  {
    return new Promise<void>(async (resolve, reject) =>
    {
      // get valid piece of data
      let thisChunk: string = '';
      if (imprt.filetype === 'csv' || (imprt.filetype === 'json' && imprt.isNewlineSeparatedJSON === true))
      {
        const end: number = isLast ? chunk.length : chunk.lastIndexOf('\n');
        thisChunk = this.nextChunk + String(chunk.substring(0, end));
        this.nextChunk = chunk.substring(end + 1, chunk.length);
      }
      else
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
          let openBraces: number = 0;
          let openBrackets: number = 0;
          let match: number = 0;
          let previousMatch: boolean = true;
          let quotemarkCounter: number = 0;
          for (let i = 0; i < thisChunk.length; i++)
          {
            if (openBraces === 0 && openBrackets === 0 && quotemarkCounter % 2 === 0)
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
            if (quotemarkCounter % 2 === 0 && thisChunk.charAt(i) === '"' && i > 0 && thisChunk.charAt(i - 1) !== '\\') // entering str
            {
              quotemarkCounter++;
            }
            else if (quotemarkCounter % 2 !== 0 && thisChunk.charAt(i) === '"' && i > 0 && thisChunk.charAt(i - 1) !== '\\') // leaving str
            {
              quotemarkCounter--;
            }
            else if (thisChunk.charAt(i) === '{' && quotemarkCounter % 2 === 0)
            {
              openBraces++;
            }
            else if (thisChunk.charAt(i) === '}' && quotemarkCounter % 2 === 0)
            {
              openBraces--;
            }
            else if (thisChunk.charAt(i) === '[' && quotemarkCounter % 2 === 0)
            {
              openBrackets++;
            }
            else if (thisChunk.charAt(i) === ']' && quotemarkCounter % 2 === 0)
            {
              openBrackets--;
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

      try
      {
        winston.info('File Import: opening temp file for writing.');
        await Util.writeFile(this.STREAMING_TEMP_FOLDER + '/' + this.STREAMING_TEMP_FILE_PREFIX + String(num),
          JSON.stringify(items), { flag: 'wx' });
        winston.info('File Import: finished writing items to temp file.');
      }
      catch (err)
      {
        return reject('Failed to dump to temp file: ' + String(err));
      }
      resolve();
    });
  }
}

export default Import;
