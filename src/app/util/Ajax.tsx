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

import * as $ from 'jquery';
import * as _ from 'underscore';
import * as Immutable from 'immutable';

import Actions from './../auth/data/AuthActions';
import AuthStore from './../auth/data/AuthStore';
import BuilderTypes from './../builder/BuilderTypes';
import LibraryTypes from './../library/LibraryTypes';
import UserTypes from './../users/UserTypes';
import Util from './../util/Util';
import {recordForSave, responseToRecordConfig} from '../Classes';

/**
 * Note: This is the old query response type.
 * For the new QueryResponse definition, see /midway/src/app/query/QueryResponse.ts
 */
export interface QueryResponse
{
  results?: any[];
  errorMessage?: string;
}

export const Ajax =
  {
    _reqMidway2(method: 'post' | 'get',
      url: string,
      body: object,
      onLoad: (response: object) => void,
      config: {
        noCredentials?: boolean,
        onError?: (response: any) => void,
        // crossDomain?: boolean;
        download?: boolean;
        downloadFilename?: string;
        urlArgs?: object;
      } = {})
    {
      let data: object;
      if (config.noCredentials)
      {
        data = body;
      }
      else
      {
        const authState = AuthStore.getState();
        data = {
          id:          authState.id,
          accessToken: authState.accessToken,
          body,
        };
      }

      return Ajax._req(
        method,
        '/midway/v1/' + url,
        JSON.stringify(data),
        (response) =>
        {
          var responseData: object = null;
          try
          {
            responseData = JSON.parse(response);
          }
          catch (e)
          {
            config.onError && config.onError(e);
          }

          if (responseData !== undefined)
          {
            // needs to be outside of the try/catch so that any errors it throws aren't caught
            onLoad(responseData);
          }
        },
        _.extend({
          host:        'http://localhost:3000',
          noToken:     true,
          json:        true,
          crossDomain: false,
        }, config),
      );
    },

    midwayStatus(success: () => void,
      failure: () => void)
    {
      return Ajax._reqMidway2(
        'get',
        'status',
        {},
        (resp: { status: string }) =>
        {
          if (resp && resp.status === 'ok')
          {
            success();
          }
          else
          {
            failure();
          }
        },
        {
          onError: failure,
        },
      );
    },

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
      } = {})
    {
      const host = config.host || MIDWAY_HOST;
      let fullUrl = host + url;
      const token = AuthStore.getState().get('accessToken');

      if (config.download)
      {
        const form = document.createElement('form');
        form.setAttribute('action', fullUrl);
        form.setAttribute('method', 'post');

        const dataObj: _.Dictionary<string> = {
          data,
          token,
          filename: config.downloadFilename,
        };
        _.map(dataObj, (value, key) =>
        {
          const input = document.createElement('input');
          input.setAttribute('type', 'hidden');
          input.setAttribute('name', key + '');
          input.setAttribute('value', value);
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
          // TODO re-enable
          // Actions.logout();
          return;
        }

        if (xhr.status != 200)
        {
          config && config.onError && config.onError({
            error: xhr.responseText,
          });
          return;
        }

        onLoad(xhr.responseText);
      };

      // NOTE: MIDWAY_HOST will be replaced by the build process.
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
        {}
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
      return Ajax._req('POST', url, data, onLoad, {onError});
    },

    _get(url: string, data: any, onLoad: (response: any) => void, onError?: (ev: Event) => void)
    {
      return Ajax._req('GET', url, data, onLoad, {onError});
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
      } = {}
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
            download:         options.download,
            downloadFilename: options.downloadFilename,
          },
        ),
        queryId: uniqueId,
      };
    },

    getUsers(onLoad: (users: { [id: string]: any }) => void)
    {
      return Ajax._reqMidway2(
        'get',
        'users/',
        {},
        (response: object[]) =>
        {
          const usersObj = {};
          response.map(
            (user) =>
            {
              usersObj[user['id']] = responseToRecordConfig(user);
            },
          );
          onLoad(usersObj);
        },
      );
    },

    saveUser(user: UserTypes.User,
      onSave: (response: any) => void,
      onError: (response: any) => void)
    {
      const userData = recordForSave(user);

      return Ajax._reqMidway2(
        'post',
        `users/${user.id}`,
        userData,
        onSave,
        {
          onError,
        },
      );
    },

    changePassword(id: number,
      oldPassword: string,
      newPassword: string,
      onSave: (response: any) => void,
      onError: (response: any) => void)
    {
      return Ajax._reqMidway2(
        'post',
        `users/${id}`,
        {
          oldPassword: oldPassword,
          password:    newPassword,
        },
        onSave,
        {
          onError,
        });
    },

    adminSaveUser(user: UserTypes.User)
    {
      return Ajax._reqMidway2(
        'post',
        `users/${user.id}`,
        {
          isSuperUser: user.isSuperUser ? 1 : 0,
          isDisabled:  user.isDisabled ? 1 : 0,
        },
        _.noop,
      );
    },

    createUser(email: string, password: string, onSave: (response: any) => void, onError: (response: any) => void)
    {
      return Ajax._reqMidway2(
        'post',
        `users`,
        {
          email,
          password,
        },
        onSave,
        onError,
      );
    },

    getItems(onLoad: (groups: IMMap<number, LibraryTypes.Group>,
      algorithms: IMMap<number, LibraryTypes.Algorithm>,
      variants: IMMap<number, LibraryTypes.Variant>,
      groupsOrder: IMList<number, any>) => void,
      onError?: (ev: Event) => void,)
    {
      return Ajax._reqMidway2(
        'get',
        'items/',
        {},
        (items: object[]) =>
        {
          const mapping =
            {
              VARIANT:   Immutable.Map<number, LibraryTypes.Variant>({}) as any,
              ALGORITHM: Immutable.Map<number, LibraryTypes.Algorithm>({}),
              GROUP:     Immutable.Map<number, LibraryTypes.Group>({}),
              QUERY:     Immutable.Map<number, BuilderTypes.Query>({}),
            };
          let groupsOrder = [];

          items.map(
            (itemObj) =>
            {
              const item = LibraryTypes._Item(
                responseToRecordConfig(itemObj),
              );
              mapping[item.type] = mapping[item.type].set(item.id, item);
              if (item.type === LibraryTypes.ItemType.Group)
              {
                groupsOrder.push(item.id);
              }
            },
          );

          mapping.ALGORITHM = mapping.ALGORITHM.map(
            alg => alg.set('groupId', alg.parent),
          ).toMap();

          mapping.VARIANT = mapping.VARIANT.map(
            v =>
            {
              v = v.set('algorithmId', v.parent);
              const alg = mapping.ALGORITHM.get(v.algorithmId);
              if(alg)
              {
                v = v.set('groupId', alg.groupId);
              }
              return v;
            },
          ).toMap();

          onLoad(
            mapping.GROUP,
            mapping.ALGORITHM,
            mapping.VARIANT,
            Immutable.List(groupsOrder),
          );
        },
        {
          onError,
          urlArgs: {
            type: 'GROUP,ALGORITHM,VARIANT',
          },
        },
      );
    },

    getItem(type: LibraryTypes.ItemType,
      id: ID,
      onLoad: (item: LibraryTypes.Item) => void,
      onError?: (ev: Event) => void)
    {
      return Ajax._reqMidway2(
        'get',
        `items/${id}`,
        {},
        (response: object[]) =>
        {
          if (response && response[0])
          {
            const item = LibraryTypes._Item(responseToRecordConfig(response[0]));
            onLoad(item);
          }
          else
          {
            onError('Nothing found' as any);
          }
        },
        {
          onError,
        });
    },

    getVariant(variantId: ID,
      onLoad: (variant: LibraryTypes.Variant) => void)
    {
      return Ajax.getItem(
        'VARIANT',
        variantId,
        (variantItem: LibraryTypes.Item) =>
        {
          onLoad(variantItem as LibraryTypes.Variant);
        },
      );
      // }
      // TODO
      // if (variantId.indexOf('@') === -1)
      // {
      // else
      // {
      //   // TODO
      //   // return Ajax.getVariantVersion(
      //   //   variantId,
      //   //   onLoad,
      //   // );
      // }
    },

    getVersions(id: ID, onLoad: (versions: any) => void)
    {
      // TODO

      // const url = '/versions/' + id;
      // return Ajax._get(url, '', (response: any) =>
      // {
      //   const versions = JSON.parse(response);
      //   onLoad(versions);
      // });
    },

    getVersion(id: ID, onLoad: (version: any) => void)
    {
      // TODO
      onLoad(null);
      return null;

      // if (!id || id.indexOf('@') === -1)
      // {
      //   onLoad(null);
      //   return null;
      // }

      // // viewing an old version
      // const pieces = id.split('@');
      // const originalId = pieces[0];
      // const versionId = pieces[1];

      // const url = '/versions/' + originalId;
      // return Ajax._get(
      //   url,
      //   '',
      //   (response: any) =>
      //   {
      //     const version = JSON.parse(response).find((version) => version.id === versionId);
      //     if (version)
      //     {
      //       const data = JSON.parse(version.data);
      //       Ajax.getVariant(originalId, (v: LibraryTypes.Variant) =>
      //       {
      //         if (v)
      //         {
      //           data['id'] = v.id;
      //           data['createdByUserId'] = v.createdByUserId;
      //           data['object'] = v['object'];
      //           data['objectId'] = v.objectId;
      //           data['objectType'] = v.objectType;

      //           onLoad(LibraryTypes._Variant(data));
      //         }
      //         else
      //         {
      //           onLoad(null);
      //         }
      //       });
      //     }
      //     else
      //     {
      //       onLoad(null);
      //     }
      //   },
      //   () => onLoad(null),
      // );
    },

    getQuery(variantId: ID,
      onLoad: (query: BuilderTypes.Query, variant: LibraryTypes.Variant) => void,)
    {
      if (!variantId)
      {
        return;
      }

      // TODO change if we store queries separate from variants
      return Ajax.getVariant(
        variantId,
        (v: LibraryTypes.Variant) =>
        {
          if (!v || !v.query)
          {
            onLoad(null, v);
          }
          onLoad(v.query, v);
        },
      );
    },

    saveItem(item: LibraryTypes.Item,
      onLoad?: (resp: any) => void, onError?: (ev: Event) => void)
    {
      if (item.type === LibraryTypes.ItemType.Variant)
      {
        item = LibraryTypes.variantForSave(item as LibraryTypes.Variant);
      }
      const itemData = recordForSave(item);
      const id = itemData['id'];
      let route = `items/${id}`;
      if (id === -1)
      {
        delete itemData['id'];
        route = 'items';
      }
      onLoad = onLoad || _.noop;

      return Ajax._reqMidway2(
        'post',
        route,
        itemData,
        onLoad,
        {
          onError,
        },
      );
    },

    /**
     * Old query interface. Queries M1.
     */
      query_m1(tql: string,
      db: string,
      onLoad: (response: QueryResponse) => void,
      onError?: (ev: Event) => void,
      sqlQuery?: boolean,
      options: {
        csv?: boolean,
        csvName?: string,
      } = {},)
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
          format:       options.csv ? 'csv' : undefined,
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
          download:         options.csv,
          downloadFilename: options.csvName || 'Results.csv',
          useMidway:        options.csv,
        },
      );
    },

    /**
     * Intermediate query interface. Queries M2.
     * Transforms result into old format.
     */
      query(body: string,
      db: string, // unused
      onLoad: (response: QueryResponse) => void,
      onError?: (ev: Event) => void,
      sqlQuery?: boolean, // unused
      options?: object // unused
    ): { xhr: XMLHttpRequest, queryId: string }
    {
      // TODO: For MySQL and other string queries, we should skip this step and send it as a string
      try
      {
        body = JSON.parse(body);
      }
      catch (e)
      {
        // on parse failure, absorb error and send query as a string
      }

      const queryId = '' + Math.random();
      const payload = {
        type:     'search', // can be other things in the future
        database: 1, // should be passed by caller
        body,
      };

      const onLoadHandler = (resp) =>
      {
        let result: QueryResponse = {results: []};
        try
        {
          const hits = resp.result.hits.hits;
          const results = hits.map((hit) =>
          {
            let source = hit._source;
            source._index = hit._index;
            source._type = hit._type;
            source._id = hit._id;
            source._score = hit._score;
            source._sort = hit._sort;
            return source;
          });

          result = {results};
        }
        catch (e)
        {
          // absorb
        }

        // This could be improved
        if (resp.errors.length > 0)
        {
          result.errorMessage = resp.errors[0].title;
        }

        onLoad(result);
      };

      const xhr = Ajax._reqMidway2(
        'post',
        'query/',
        payload,
        onLoadHandler,
        {onError},
      );

      return {queryId, xhr};
    },

    parseTree(tql: string, db: string, onLoad: (response: QueryResponse) => void, onError?: (ev: Event) => void)
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
            onError && onError(resp as any);
            return;
          }

          if (respData.errorMessage)
          {
            onError(respData);
            return;
          }

          onLoad(respData);
        },

        onError,
      );
    },
    
    schema(dbId: number, onLoad: (columns: object, error?: any) => void, onError?: (ev: Event) => void)
    {
      return Ajax._reqMidway2('get', '/database/' + dbId + '/schema', {}, (response: any) => {
        try {
          const cols: object = JSON.parse(response);
          onLoad(cols);
        }
        catch (e)
        {
          onError && onError(response as any);
        }
      });
    },

    getDbs(onLoad: (dbs: object) => void, onError?: (ev: Event) => void)
    {
      Ajax._postMidway1('/get_databases', {
        db: 'information_schema',
      }, (resp) =>
      {
        try
        {
          const list = JSON.parse(resp);
          onLoad(list.map((obj) => ({id: obj.id, name: obj.name, type: obj.type})));
        }
        catch (e)
        {
          onError && onError(e as any);
        }
      }, onError);
    },

    killQuery(id: string)
    {
      return Ajax._postMidway1('/kill_query_by_id', {
          query_id: id,
        },

        (resp) =>
        {
        },
      );
    },

    login(email: string,
      password: string,
      onLoad: (data: {
        id: number,
        accessToken: string,
      }) => void,
      onError: (error) => void): XMLHttpRequest
    {
      return Ajax._reqMidway2(
        'post',
        'auth/login',
        {
          email,
          password,
        },
        onLoad,
        {
          onError,
          noCredentials: true,
        },
      );
    },

    checkLogin(accessToken: string, id: number, onSuccess: () => void, onError: () => void)
    {
      Ajax._reqMidway2(
        'post',
        'status/loggedIn',
        {
          accessToken,
          id,
        },
        (data: { loggedIn: boolean }) =>
        {
          if (data && data.loggedIn)
          {
            onSuccess();
          }
          else
          {
            onError();
          }
        },
        onError,
      );
    },

    _config()
    {
      // change_conf_dict_mysql[btoa("host")] = btoa(encode_utf8("10.1.0.25"));
      // change_conf_dict_mysql[btoa("user")] = btoa(encode_utf8("dev"));
      // change_conf_dict_mysql[btoa("password")] = btoa(encode_utf8("terrain_webscalesql42"));
      // change_conf_dict_mysql[btoa("db")] = btoa(encode_utf8("BookDB"));
      // change_conf_dict[btoa("mysqlconfig")] = change_conf_dict_mysql;
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
