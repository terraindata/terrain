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

// tslint:disable:restrict-plus-operands strict-boolean-expressions return-undefined no-console no-empty max-line-length no-unused-expression no-shadowed-variable

import * as $ from 'jquery';
import * as _ from 'lodash';
import BackendInstance from '../../database/types/BackendInstance';

/**
 * Note: This is the old query response type.
 * For the new QueryResponse definition, see /midway/src/app/query/QueryResponse.ts
 */
export interface M1QueryResponse
{
  results?: any[];
  errorMessage?: string;
}

export const Ajax =
{
  _req(method: string,
    url: string,
    data: string,
    onLoad: (response: any) => void,
    config: {
      onError?: (response: any) => void,
      host?: string,
      crossDomain?: boolean;
      noToken?: boolean;
      download?: boolean;
      downloadFilename?: string;
      json?: boolean;
      urlArgs?: object;
    } = {}): XMLHttpRequest
  {
    const host = config.host || '';
    let fullUrl = host + url;

    if (config.download)
    {
      // TODO make sure this still works
      const form = document.createElement('form');
      form.setAttribute('action', fullUrl);
      form.setAttribute('method', 'post');

      // TODO move
      const dataObj = {
        data,
        filename: config.downloadFilename,
      };
      _.map(dataObj as any, (value, key) =>
      {
        const input = document.createElement('input');
        input.setAttribute('type', 'hidden');
        input.setAttribute('name', key + '');
        input.setAttribute('value', value as any);
        form.appendChild(input);
      });

      document.body.appendChild(form); // Required for FF
      form.submit();
      form.remove();
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.onerror = config && config.onError;
    xhr.onload = (ev: Event) =>
    {
      if (xhr.status === 401)
      {
        console.log('Not logged in correctly to Midway 1');
        return;
      }

      if (xhr.status !== 200)
      {
        config && config.onError && config.onError({
          error: xhr.responseText,
        });
        return;
      }

      onLoad(xhr.responseText);
    };

    if (method === 'get')
    {
      try
      {
        const dataObj = JSON.parse(data);
        fullUrl += '?' + $.param(dataObj);

        if (config.urlArgs)
        {
          fullUrl += '&' + $.param(config.urlArgs);
        }
      }
      catch (e)
      { }
    }
    else if (config.urlArgs)
    {
      fullUrl += '?' + $.param(config.urlArgs);
    }

    xhr.open(method, fullUrl, true);

    if (config.json)
    {
      xhr.setRequestHeader('Content-Type', 'application/json');
    }

    if (!config.noToken)
    {
      const token = 'L9DcAxWyyeAuZXwb-bJRtA'; // hardcoded token in pa-terraformer02. TODO change?
      xhr.setRequestHeader('token', token);
    }

    if (config.crossDomain)
    {
      xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
      xhr.setRequestHeader('Access-Control-Allow-Headers',
        'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Access-Control-Allow-Origin');
    }

    xhr.send(data);
    return xhr;
  },

  _post(url: string, data: any, onLoad: (response: any) => void, onError?: (ev: Event) => void)
  {
    return Ajax._req('POST', url, data, onLoad, { onError });
  },

  _get(url: string, data: any, onLoad: (response: any) => void, onError?: (ev: Event) => void)
  {
    return Ajax._req('GET', url, data, onLoad, { onError });
  },

  _postMidway1(
    url: string,
    reqFields: { [f: string]: any },
    onLoad: (resp: string) => void,
    onError?: (ev: Event) => void,
    options: {
      download?: boolean;
      downloadFilename?: string;
      useMidway?: boolean;
    } = {},
  ): { xhr: XMLHttpRequest, queryId: string }
  {
    const uniqueId = '' + Math.random();
    return {
      xhr: Ajax._req('POST', url, JSON.stringify(_.extend(
        {
          timestamp: (new Date()).toISOString(),
          uniqueId,
        }, reqFields)),

        onLoad,

        {
          // noToken: true,
          onError,
          // host: options.useMidway ? undefined : TDB_HOST,
          // crossDomain: ! options.useMidway,
          download: options.download,
          downloadFilename: options.downloadFilename,
        },
      ),
      queryId: uniqueId,
    };
  },

  queryM1(body: string,
    db: BackendInstance,
    onLoad: (response: M1QueryResponse) => void,
    onError?: (ev: Event) => void,
    sqlQuery?: boolean, // unused
    options: {
      streaming?: boolean,
      streamingTo?: string,
    } = {},
  ): { xhr: XMLHttpRequest, queryId: string }
  {
    return Ajax.query_m1(body, db.id, onLoad, onError, sqlQuery, options as any);
  },
  /**
   * Old query interface. Queries M1.
   */
  query_m1(
    tql: string,
    db: string | number,
    onLoad: (response: M1QueryResponse) => void,
    onError?: (ev: Event) => void,
    sqlQuery?: boolean,
    options: {
      csv?: boolean,
      csvName?: string,
    } = {},
  )
  {
    // kill queries running under the same id
    // Ajax.killQueries(); // TODO add id

    let dest = '/query';
    if (options.csv)
    {
      dest = '/query_csv';
    }
    else if (sqlQuery)
    {
      dest = '/sql_query';
    }

    return Ajax._postMidway1(dest, {
      query_string: encode_utf8(tql),
      db,
      format: options.csv ? 'csv' : undefined,
    },

      (resp) =>
      {
        let respData = null;
        try
        {
          resp = resp.replace(/\t/g, ' ').replace(/\n/g, ' ');
          respData = JSON.parse(resp);
        } catch (e)
        {
          onError && onError(resp as any);
          return;
        }
        onLoad(respData);
      },

      onError,

      {
        download: options.csv,
        downloadFilename: options.csvName || 'Results.csv',
        useMidway: options.csv,
      },
    );
  },

  parseTree(tql: string, db: string, onLoad: (response: M1QueryResponse, context?: any) => void, onError?: (ev: Event, context?: any) => void, context?: any)
  {
    return Ajax._postMidway1('/get_tql_tree', {
      query_string: encode_utf8(tql),
      db,
    },

      (resp) =>
      {
        let respData = null;
        try
        {
          resp = resp.replace(/\t/g, ''); // tabs cause the JSON parser to error out
          respData = JSON.parse(resp);
        } catch (e)
        {
          onError && onError(resp as any, context);
          return;
        }

        if (respData.errorMessage)
        {
          onError(respData, context);
          return;
        }

        onLoad(respData, context);
      },

      (e) =>
      {
        onError && onError(e, context);
      },
    );
  },

  schema_m1(db: string | number, onLoad: (columns: object | any[], error?: any) => void, onError?: (ev: Event) => void)
  {
    return Ajax._postMidway1('/get_schema', {
      db,
    },
      (resp: string) =>
      {
        const cols: any = null;
        try
        {
          const cols = JSON.parse(resp).results;
          // var tables: {[name:string]: {name: string; columns: any[];}} = {};

          // cols.map(
          // (
          //   col: { TABLE_NAME: string; COLUMN_NAME: string; }
          // ) =>
          // {
          //   let column = _.extend(col, { name: col.COLUMN_NAME });
          //   let table = col.TABLE_NAME;

          //   if(!tables[table])
          //   {
          //     console.log('add table', table);
          //     tables[table] = {
          //       name: table,
          //       columns: [],
          //     };
          //   }

          //   tables[table].columns.push(column);
          // });

          // onLoad(_.toArray(tables) as any);
          onLoad(cols);
        }
        catch (e)
        {
          onError && onError(resp as any);
        }

        if (cols)
        {
          onLoad(cols as any);
        }
      },
      onError,
    );
  },

  getDbs_m1(onLoad: (dbs: string[]) => void, onError?: (ev: Event) => void)
  {
    Ajax._postMidway1('/get_databases', {
      db: 'information_schema',
    }, (resp) =>
      {
        try
        {
          const list = JSON.parse(resp);
          onLoad(list.results.map((obj) => obj.schema_name));
        }
        catch (e)
        {
          onError && onError(e as any);
        }
      }, onError);
  },
  killQuery(id: string)
  {
    // TODO integrate query killing with M2
    return Ajax.killQuery_m1(id);
  },
  killQuery_m1(id: string)
  {
    return Ajax._postMidway1('/kill_query_by_id', {
      query_id: id,
    },

      (resp) =>
      {
      },
    );
  },
};

function encode_utf8(s)
{
  return unescape(encodeURIComponent(s));
}

function decode_utf8(s)
{
  return decodeURIComponent(escape(s));
}

export default Ajax;
