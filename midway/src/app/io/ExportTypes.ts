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

import * as equal from 'deep-equal';
import * as _ from 'lodash';

import ESConverter from '../../../../shared/database/elastic/formatter/ESConverter';
import { ESJSONParser } from '../../../../shared/database/elastic/parser/ESJSONParser';
import { getParsedQuery } from '../../app/Util';
import DatabaseController from '../../database/DatabaseController';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import { QueryHandler } from '../query/QueryHandler';
import { Export } from './Export';

export class ExportTypes
{
  private MAX_ROW_THRESHOLD: number = 2000;

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

  private _shouldRandomSample(qry: string): string
  {
    let parser = getParsedQuery(qry);
    const query = parser.getValue();
    if (query['size'] !== undefined)
    {
      if (typeof query['size'] === 'number' && query['size'] > this.MAX_ROW_THRESHOLD)
      {
        query['size'] = this.MAX_ROW_THRESHOLD;
      }
    }

    query.query = {
      function_score: {
        random_score: {},
        query: query.query,
      },
    };
    parser = new ESJSONParser(JSON.stringify(query), true);
    return ESConverter.formatES(parser as ESJSONParser);
  }

  private async _getAllFieldsAndTypesFromQuery(database: DatabaseController, qry: string,
    dbid?: number, maxSize?: number): Promise<object | string>
  {
    return new Promise<object | string>(async (resolve, reject) =>
    {
      const fieldObj: object = {};
      let fieldsAndTypes: object = {};
      const qh: QueryHandler = database.getQueryHandler();
      const payload = {
        database: dbid as number,
        type: 'search',
        streaming: false,
        databasetype: 'elastic',
        body: qry,
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
      for (let doc of docs)
      {
        doc = Export.mergeGroupJoin(doc);
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
    if (types.length === 1)
    {
      return types[0];
    }

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

    if (equal(types.map((typeObj) => typeObj['type']).sort(), ['double', 'long']))
    {
      return { type: 'double', index: 'not_analyzed', analyzer: null };
    }
    return { type: 'text', index: 'analyzed', analyzer: 'standard' };
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
}
