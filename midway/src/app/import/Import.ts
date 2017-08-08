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

import * as stream from 'stream';

import * as csvjson from 'csvjson';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import * as socketio from 'socket.io';
import * as winston from 'winston';

import * as SharedUtil from '../../../../shared/fileImport/Util';
import DatabaseController from '../../database/DatabaseController';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Tasty from '../../tasty/Tasty';
import { users } from '../users/UserRouter';
import * as Util from '../Util';
import { ImportTemplateBase, ImportTemplateConfig, ImportTemplates } from './ImportTemplates';

const importTemplates = new ImportTemplates();

export interface ImportConfig extends ImportTemplateBase
{
  contents: string;
  filetype: string;     // either 'json' or 'csv'
  streaming: boolean;   // if true, contents will be ignored
  update: boolean;      // false means replace (instead of update) ; default should be true
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
  private quoteChar: string = '\'';
  private batchSize: number = 5000;

  private imprt: ImportConfig;
  private database: DatabaseController;
  private insertTable: Tasty.Table;
  private maxActiveReads: number = 3;
  private streamingTempFolder: string = 'import_streaming_tmp';
  private streamingTempFilePrefix: string = 'chunk';
  private nextChunk: string;
  private chunkCount: number;
  private maxAllowedQueueSize: number = 3;
  private chunkSize: number = 10000000;
  private chunkQueue: object[];
  private readStream: stream.Readable;
  private totalReads: number;
  private readyToStream: boolean = false;

  /* set up websockets for import streaming from frontend GUI */
  public setUpSocket(io: socketio.Server)
  {
    winston.info('set up file import streaming server.');
    io.on('connection', (socket) =>
    {
      winston.info('streaming server received connection.');
      let authorized: boolean = false;
      socket.emit('request_auth');
      socket.on('auth', async (data) =>
      {
        if (authorized)
        {
          this._sendSocketError(socket, 'Already authenticated ; repeat attempt received.');
          return;
        }
        const user = await users.loginWithAccessToken(Number(data['id']), data['accessToken']);
        if (user === null)
        {
          this._sendSocketError(socket, 'Bad authentication.');
          return;
        }
        winston.info('streaming auth successful.');
        authorized = true;
        this._deleteStreamingTempFolder();    // in case the folder was improperly cleaned up last time (shouldn't happen)
        fs.mkdirSync(this.streamingTempFolder);
        winston.info('created streaming temp directory.');
        socket.emit('ready');
      });
      this.chunkCount = 0;
      this.nextChunk = '';
      socket.on('message', async (data) =>
      {
        winston.info('streaming server received data from client.');
        if (!authorized)
        {
          this._sendSocketError(socket, 'Must authenticate before sending messages.');
          return;
        }
        if (!this.readyToStream)
        {
          // close connection since there was a config issue
          this._sendSocketError(socket, 'config error -- see Ajax response.');
          return;
        }
        if (typeof data['chunk'] !== 'string' || typeof data['isLast'] !== 'boolean')
        {
          this._sendSocketError(socket, 'Malformed message.');
          return;
        }
        await this._writeItemsFromChunkToFile(data['chunk'], data['isLast'], socket);
        winston.info('emitting ready');
        socket.emit('ready');
      });
      socket.on('finished', async () =>
      {
        winston.info('streaming client finished.');
        if (!authorized)
        {
          this._sendSocketError(socket, 'Must authenticate before sending messages.');
          return;
        }
        if (!this.readyToStream)
        {
          // close connection since there was a config issue
          this._sendSocketError(socket, 'config error -- see Ajax response.');
          return;
        }

        await this._streamingUpsert(socket);

        socket.emit('midway_success');
        socket.disconnect(true);
      });
    });
  }

  public async upsert(imprt: ImportConfig): Promise<ImportConfig>
  {
    this.imprt = imprt;
    this.readyToStream = false;
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
      this.database = database;

      let time: number = Date.now();
      winston.info('checking config and schema...');
      const configError: string = this._verifyConfig(imprt);
      if (configError !== '')
      {
        return reject(configError);
      }
      const expectedMapping: object = this._getMappingForSchema(imprt);
      const mappingForSchema: object | string =
        this._checkMappingAgainstSchema(expectedMapping, await database.getTasty().schema(), imprt.dbname);
      if (typeof mappingForSchema === 'string')
      {
        return reject(mappingForSchema);
      }
      winston.info('checked config and schema (s): ' + String((Date.now() - time) / 1000));

      const columns: string[] = Object.keys(imprt.columnTypes);
      this.insertTable = new Tasty.Table(
        imprt.tablename,
        [imprt.primaryKey],
        columns,
        imprt.dbname,
        mappingForSchema,
      );

      if (!imprt.streaming)
      {
        const items: object[] = [];
        try
        {
          const newItems: object[] = await this._getItems(imprt, imprt.contents);
          newItems.forEach((val) =>
          {
            items.push(val);
          });
        } catch (e)
        {
          return reject(e);
        }

        time = Date.now();
        winston.info('putting mapping...');
        await this._tastyPutMapping();
        winston.info('put mapping (s): ' + String((Date.now() - time) / 1000));

        time = Date.now();
        winston.info('about to upsert via tasty...');
        const res: ImportConfig = await this._tastyUpsert(imprt, items);
        winston.info('upserted to tasty (s): ' + String((Date.now() - time) / 1000));
        resolve(res);
        resolve(imprt);
      }
      else
      {
        this.readyToStream = true;
        // logic handled through socket.io connection
        resolve(imprt);
      }
    });
  }
  public async upsertHeadless(files: stream.Readable[], fields: object): Promise<ImportConfig>
  {
    return new Promise<ImportConfig>(async (resolve, reject) =>
    {
      const templates: ImportTemplateConfig[] = await importTemplates.get(Number(fields['templateID']));
      if (templates.length === 0)
      {
        return reject('Invalid template ID provided: ' + String(fields['templateID']));
      }
      const template: ImportTemplateConfig = templates[0];

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
      winston.info('hascsvheader: ' + String(hasCsvHeader));
      let csvHeaderRemoved: boolean = (fields['filetype'] !== 'csv') || !hasCsvHeader;

      const imprtConf: ImportConfig = {
        dbid: template['dbid'],
        dbname: template['dbname'],
        tablename: template['tablename'],
        originalNames: template['originalNames'],
        columnTypes: template['columnTypes'],
        primaryKey: template['primaryKey'],
        transformations: template['transformations'],

        contents: '',
        filetype: fields['filetype'],
        streaming: true,
        update,
      };
      let res: ImportConfig = imprtConf;    // satisfies linter, since otherwise didn't let call resolve(res) below
      try
      {
        res = await this.upsert(imprtConf);
      }
      catch (e)
      {
        reject(e);
      }

      this._deleteStreamingTempFolder();    // in case the folder was improperly cleaned up last time (shouldn't happen)
      fs.mkdirSync(this.streamingTempFolder);

      this.readStream = file;
      this.chunkQueue = [];
      this.nextChunk = '';
      this.chunkCount = 0;
      let contents: string = '';
      this.readStream.on('data', async (chunk) =>
      {
        contents += chunk.toString();
        if (contents.length > this.chunkSize)
        {
          if (!csvHeaderRemoved)
          {
            contents = contents.substring(contents.indexOf('\n') + 1, contents.length);
            csvHeaderRemoved = true;
          }
          this.chunkQueue.push({ chunk: contents, isLast: false });
          contents = '';
          if (this.chunkQueue.length >= this.maxAllowedQueueSize)
          {
            this.readStream.pause();
          }
          await this._writeNextChunk(reject);
        }
      });
      this.readStream.on('error', (e) =>
      {
        throw e;
      });
      this.readStream.on('end', async () =>
      {
        if (contents !== '')
        {
          if (!csvHeaderRemoved)
          {
            contents = contents.substring(contents.indexOf('\n') + 1, contents.length);
            csvHeaderRemoved = true;
          }
          this.chunkQueue.push({ chunk: contents, isLast: true });
        }
        else
        {
          if (this.chunkQueue.length === 0)
          {
            return reject('Logic issue with streaming queue.');    // shouldn't happen
          }
          this.chunkQueue[this.chunkQueue.length - 1]['isLast'] = true;
        }
        while (this.chunkQueue.length > 0)
        {
          await this._writeNextChunk(reject);
        }

        await this._streamingUpsert(reject);

        resolve(res);
      });
    });
  }
  /* after type-checking has completed, read from temp files to upsert via Tasty, and delete the temp files
   * errors will be processed through "socket" (either a socket.io connection, or the reject method of a promise) */
  private async _streamingUpsert(socket: socketio.Socket | ((r?: any) => void))
  {
    const time: number = Date.now();
    winston.info('putting mapping...');
    await this._tastyPutMapping();
    winston.info('put mapping (s): ' + String((Date.now() - time) / 1000));

    winston.info('opening files for upsert...');
    this.totalReads = 0;
    for (let num = 0; num < Math.min(this.chunkCount, this.maxActiveReads); num++)
    {
      this.totalReads++;
      await this._readFileAndUpsert(num, this.chunkCount, socket);
    }
  }
  /* headless streaming helper function ; dequeue the next chunk of data, process it, and write the results to a temp file
   * errors will be processed through "reject" (the reject method of a promise) */
  private async _writeNextChunk(reject: ((r?: any) => void))
  {
    if (this.chunkQueue.length === 0 || (this.chunkQueue.length === 1 && !this.chunkQueue[0]['isLast']))
    {
      return;
    }
    const chunkObj: object = this.chunkQueue.shift() as object;
    if (this.chunkQueue.length < this.maxAllowedQueueSize)
    {
      this.readStream.resume();
    }
    return this._writeItemsFromChunkToFile(chunkObj['chunk'], chunkObj['isLast'], reject);
  }
  /* streaming helper function ; slice "chunk" into a coherent piece of data, process it, and write the results to a temp file
   * errors will be processed through "socket" (either a socket.io connection, or the reject method of a promise) */
  private async _writeItemsFromChunkToFile(chunk: string, isLast: boolean, socket: socketio.Socket | ((r?: any) => void))
  {
    // get valid piece of csv data ; TODO: SUPPORT JSON AS WELL
    const end: number = isLast ? chunk.length : chunk.lastIndexOf('\n');
    const thisChunk: string = this.nextChunk + String(chunk.substring(0, end));
    this.nextChunk = chunk.substring(end + 1, chunk.length);
    let items: object[];
    try
    {
      items = await this._getItems(this.imprt, thisChunk);
    }
    catch (e)
    {
      this._sendSocketError(socket, 'Failed to get items: ' + String(e));
    }
    winston.info('streaming server got items from data');

    fs.open(this.streamingTempFolder + '/' + this.streamingTempFilePrefix + String(this.chunkCount), 'wx', (err, fd) =>
    {
      winston.info('opened file for writing.');
      if (err !== undefined && err !== null)
      {
        this._sendSocketError(socket, 'Failed to open temp file for dumping: ' + String(err));
        return;
      }
      fs.write(fd, JSON.stringify(items), (writeErr) =>
      {
        if (writeErr !== undefined && writeErr !== null)
        {
          this._sendSocketError(socket, 'Failed to dump to temp file: ' + String(writeErr));
        }
      });
      winston.info('wrote items to file.');
    });
    this.chunkCount++;
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
  private async _tastyPutMapping(): Promise<object>
  {
    return this.database.getTasty().getDB().putMapping(this.insertTable);
  }
  private async _tastyUpsert(imprt: ImportConfig, items: object[]): Promise<ImportConfig>
  {
    return new Promise<ImportConfig>(async (resolve, reject) =>
    {
      let res: ImportConfig;
      if (imprt.update)
      {
        res = await this.database.getTasty().update(this.insertTable, items) as ImportConfig;
      }
      else
      {
        res = await this.database.getTasty().upsert(this.insertTable, items) as ImportConfig;
      }
      resolve(res);
    });
  }

  /* streaming helper function ; process errors through "socket" (either a socket.io connection, or the reject method of a promise) */
  private _sendSocketError(socket: socketio.Socket | ((r?: any) => void), error: string)
  {
    winston.info('emitting socket error: ' + error);
    if (typeof socket === 'function')
    {
      this._deleteStreamingTempFolder();
      socket(error);
    }
    else
    {
      socket.emit('midway_error', error);
      this._deleteStreamingTempFolder();
      socket.disconnect(true);
    }
  }
  /* streaming helper function.
   * errors will be processed through "socket" (either a socket.io connection, or the reject method of a promise) */
  private async _readFileAndUpsert(num: number, targetNum: number, socket: socketio.Socket | ((r?: any) => void))
  {
    winston.info('BEGINNING read file upload number ' + String(num));

    let items: object[];
    fs.readFile(this.streamingTempFolder + '/' + this.streamingTempFilePrefix + String(num), 'utf8', async (err, data) =>
    {
      if (err !== undefined && err !== null)
      {
        this._sendSocketError(socket, 'Failed to read from temp file: ' + String(err));
        return;
      }
      const time = Date.now();
      winston.info('about to upsert to tasty...');
      items = JSON.parse(data);
      await this._tastyUpsert(this.imprt, items);
      winston.info('upserted to tasty (s): ' + String((Date.now() - time) / 1000));
      winston.info('FINISHED read file upload number ' + String(num));

      if (this.totalReads < targetNum)
      {
        const nextNum: number = this.totalReads;
        this.totalReads++;
        await this._readFileAndUpsert(nextNum, targetNum, socket);   // TODO: recursion limit??
      }
      else if (this.totalReads === targetNum)
      {
        this.totalReads++;
        this._deleteStreamingTempFolder();
        winston.info('deleted streaming temp folder');
      }
    });
  }
  private _deleteStreamingTempFolder()
  {
    rimraf(this.streamingTempFolder, (err) =>
    {
      if (err !== undefined && err !== null)
      {
        // can't _sendSocketError() or else would end up in an infinite cycle
        throw new Error('Failed to delete temp file: ' + String(err));
      }
    });
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
        try
        {
          const options: object = {
            delimiter: ',',
            quote: this.quoteChar,
            // TODO: handle case where field name contains quoteChar
            headers: imprt.originalNames.map((val) => this.quoteChar + val + this.quoteChar).join(','),
          };
          resolve(csvjson.toObject(contents, options));
        }
        catch (e)
        {
          // NOTE: csvjson parser will not throw errors for rows that contain the wrong number of entries
          return reject('CSV format incorrect: ' + String(e));
        }
      } else
      {
        return reject('Invalid file-type provided.');
      }
    });
  }

  /* asynchronously perform transformations on each item to upsert, and check against expected resultant types */
  private async _transformAndCheck(allItems: object[], imprt: ImportConfig): Promise<object[][]>
  {
    const promises: Array<Promise<object[]>> = [];
    let baseInd: number = 0;
    let items: object[];
    while (allItems.length > 0)
    {
      items = allItems.splice(0, this.batchSize);
      promises.push(
        new Promise<object[]>(async (thisResolve, thisReject) =>
        {
          const transformedItems: object[] = [];
          let ind: number = 0;
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
            for (const name in imprt.columnTypes)
            {
              if (imprt.columnTypes.hasOwnProperty(name))
              {
                trimmedItem[name] = item[name];
              }
            }
            const typeError: string = this._checkTypes(trimmedItem, imprt, baseInd + ind);
            if (typeError !== '')
            {
              return thisReject(typeError);
            }
            transformedItems.push(trimmedItem);
            ind++;
          }
          thisResolve(transformedItems);
        }));
      baseInd += items.length;
    }
    return Promise.all(promises);
  }

  /* checks whether obj has the fields and types specified by nameToType
   * returns an error message if there is one; else returns empty string
   * nameToType: maps field name (string) to object (contains "type" field (string)) */
  private _checkTypes(obj: object, imprt: ImportConfig, ind: number): string
  {
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
        dateColumns.forEach((colName) =>
        {
          this._parseDatesHelper(obj, colName);
        });
      }

      if (this._hashObjectStructure(obj) !== targetHash)
      {
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
      }
    }
    else if (imprt.filetype === 'csv')
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
    }

    // check that all elements of arrays are of the same type
    for (const field of Object.keys(imprt.columnTypes))
    {
      if (imprt.columnTypes[field]['type'] === 'array')
      {
        if (obj[field] !== null && !this._isTypeConsistent(obj[field]))
        {
          return 'Array in field "' + field + '" of object number ' + String(ind) + ' contains inconsistent types.';
        }
      }
    }

    if (obj[imprt.primaryKey] === '' || obj[imprt.primaryKey] === null)
    {
      return 'Object number ' + String(ind) + ' has an empty primary key.';
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
}

export default Import;
