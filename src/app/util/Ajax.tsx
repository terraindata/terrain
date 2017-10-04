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

// tslint:disable:restrict-plus-operands strict-boolean-expressions return-undefined no-console no-empty no-unused-expression

// Note: If anyone would like to take the time to clean up this file, be my guest.

import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';

import BackendInstance from '../../database/types/BackendInstance';
import { Item, ItemType } from '../../items/types/Item';
import Query from '../../items/types/Query';
import Actions from './../auth/data/AuthActions';
import AuthStore from './../auth/data/AuthStore';
import * as LibraryTypes from './../library/LibraryTypes';
import * as UserTypes from './../users/UserTypes';

import MidwayQueryResponse from '../../database/types/MidwayQueryResponse';

import { MidwayError } from '../../../shared/error/MidwayError';
import { QueryRequest } from '../../database/types/QueryRequest';
import { recordForSave, responseToRecordConfig } from '../Classes';
import AjaxM1 from './AjaxM1';
// const { List, Map } = Immutable;

export const Ajax =
  {
    req(method: 'post' | 'get',
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
          id: authState.id,
          accessToken: authState.accessToken,
          body,
        };
      }

      return Ajax._reqGeneric(
        method,
        '/midway/v1/' + url,
        JSON.stringify(data),
        (response) =>
        {
          let responseData: object = null;
          try
          {
            responseData = JSON.parse(response);
          }
          catch (e)
          {
            // parsing error, we create a new QueryResponse so that callers wont need to worry about the format
            // anymore.
            config.onError && config.onError(e);
          }

          if (responseData !== undefined)
          {
            // needs to be outside of the try/catch so that any errors it throws aren't caught
            onLoad(responseData);
          }
        },
        _.extend({
          onError: config.onError,
          host: MIDWAY_HOST,
          noToken: true,
          json: true,
          crossDomain: false,
        }, config),
      );
    },

    _reqGeneric(method: string,
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

      if (config.download)
      {
        const form = document.createElement('form');
        form.setAttribute('action', fullUrl);
        form.setAttribute('method', 'post');
        form.setAttribute('target', '_blank');

        // TODO move
        const accessToken = AuthStore.getState().accessToken;
        const id = AuthStore.getState().id;
        const dataObj = {
          id,
          accessToken,
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
      xhr.timeout = 180000;
      xhr.onerror = (err: any) =>
      {
        const routeError: MidwayError = new MidwayError(400, 'The Connection Has Been Lost.', JSON.stringify(err), {});
        config && config.onError && config.onError(routeError);
      };

      xhr.onload = (ev: Event) =>
      {
        if (xhr.status === 401)
        {
          // TODO re-enable
          Actions.logout();
        }

        if (xhr.status !== 200)
        {
          config && config.onError && config.onError(xhr.responseText);
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
        {

        }
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

    midwayStatus(success: () => void,
      failure: () => void)
    {
      return Ajax.req(
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

    getUsers(onLoad: (users: { [id: string]: any }) => void)
    {
      return Ajax.req(
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

      return Ajax.req(
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
      return Ajax.req(
        'post',
        `users/${id}`,
        {
          oldPassword,
          password: newPassword,
        },
        onSave,
        {
          onError,
        });
    },

    adminSaveUser(user: UserTypes.User)
    {
      return Ajax.req(
        'post',
        `users/${user.id}`,
        {
          isSuperUser: user.isSuperUser ? 1 : 0,
          isDisabled: user.isDisabled ? 1 : 0,
          email: user.email,
        },
        _.noop,
      );
    },

    createUser(email: string, password: string, onSave: (response: any) => void, onError: (response: any) => void)
    {
      return Ajax.req(
        'post',
        `users`,
        {
          email,
          password,
        },
        onSave,
        {
          onError,
        },
      );
    },

    getItems(onLoad: (groups: IMMap<number, LibraryTypes.Group>,
      algorithms: IMMap<number, LibraryTypes.Algorithm>,
      variants: IMMap<number, LibraryTypes.Variant>,
      groupsOrder: IMList<number, any>) => void,
      onError?: (ev: Event) => void)
    {
      return Ajax.req(
        'get',
        'items/',
        {},
        (items: object[]) =>
        {
          const mapping =
            {
              VARIANT: Immutable.Map<number, LibraryTypes.Variant>({}) as any,
              ALGORITHM: Immutable.Map<number, LibraryTypes.Algorithm>({}),
              GROUP: Immutable.Map<number, LibraryTypes.Group>({}),
              QUERY: Immutable.Map<number, Query>({}),
            };
          const groupsOrder = [];

          items.map(
            (itemObj) =>
            {
              const item = LibraryTypes.typeToConstructor[itemObj['type']](
                responseToRecordConfig(itemObj),
              );
              mapping[item.type] = mapping[item.type].set(item.id, item);
              if (item.type === ItemType.Group)
              {
                groupsOrder.push(item.id);
              }
            },
          );

          mapping.ALGORITHM = mapping.ALGORITHM.map(
            (alg) => alg.set('groupId', alg.parent),
          ).toMap();

          mapping.VARIANT = mapping.VARIANT.map(
            (v) =>
            {
              v = v.set('algorithmId', v.parent);
              const alg = mapping.ALGORITHM.get(v.algorithmId);
              if (alg)
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

    getItem(type: ItemType,
      id: ID,
      onLoad: (item: Item) => void,
      onError?: (ev: Event) => void)
    {
      return Ajax.req(
        'get',
        `items/${id}`,
        {},
        (response: object[]) =>
        {
          if (response && response[0])
          {
            const item = LibraryTypes.typeToConstructor[response[0]['type']](responseToRecordConfig(response[0]));
            onLoad(item);
          }
          else
          {
            onError && onError('Nothing found' as any);
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
        (variantItem: Item) =>
        {
          onLoad(variantItem as LibraryTypes.Variant);
        },
        (error) =>
        {
          if (error as any === 'Nothing found')
          {
            onLoad(null);
          }
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

    getVersions(id: ID, onLoad: (versions: any) => void, onError?: (ev: Event) => void)
    {
      return Ajax.req('get', 'versions/items/' + id, {}, (response: any) =>
      {
        try
        {
          onLoad(response);
        }
        catch (e)
        {
          onError && onError(response as any);
        }
      });
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
      onLoad: (query: Query, variant: LibraryTypes.Variant) => void)
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
          else
          {
            onLoad(v.query, v);
          }
        },
      );
    },

    saveItem(item: Item,
      onLoad?: (resp: any) => void, onError?: (ev: Event) => void)
    {
      if (item.type === ItemType.Variant)
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

      return Ajax.req(
        'post',
        route,
        itemData,
        (respArray) =>
        {
          onLoad(respArray[0]);
        },
        {
          onError,
        },
      );
    },
    /**
     * Query M2
     */
    query(body: string,
      db: BackendInstance,
      onLoad: (response: MidwayQueryResponse) => void,
      onError?: (ev: string | MidwayError) => void,
      sqlQuery?: boolean, // unused
      options: {
        streaming?: boolean,
        streamingTo?: string,
      } = {},
    ): { xhr: XMLHttpRequest, queryId: string }
    {
      const payload: QueryRequest = {
        type: 'search', // can be other things in the future
        database: db.id as number, // should be passed by caller
        streaming: options.streaming,
        databasetype: db.type,
        body,
      };

      const onLoadHandler = (resp) =>
      {
        const queryResult: MidwayQueryResponse = MidwayQueryResponse.fromParsedJsonObject(resp);
        onLoad(queryResult);
      };
      const queryId = '' + Math.random();
      const xhr = Ajax.req(
        'post',
        'query/',
        payload,
        onLoadHandler,
        {
          onError,
          download: options.streaming,
          downloadFilename: options.streamingTo,
        },
      );

      return { queryId, xhr };
    },

    deployQuery(
      type: string,
      body: object,
      db: BackendInstance,
      onLoad: (response: MidwayQueryResponse) => void,
      onError?: (ev: string | MidwayError) => void,
    )
    {
      const payload: QueryRequest = {
        type,
        database: db.id as number,
        databasetype: db.type,
        body,
      };

      const onLoadHandler = (resp) =>
      {
        const queryResult: MidwayQueryResponse = MidwayQueryResponse.fromParsedJsonObject(resp);
        onLoad(queryResult);
      };

      Ajax.req(
        'post',
        'query/',
        payload,
        onLoadHandler,
        {
          onError,
        },
      );
    },

    getStreamingProgress(onLoad: (resp: any) => void,
      onError: (resp: any) => void,
    )
    {
      const onLoadHandler = (resp) =>
      {
        onLoad(resp);
      };
      Ajax.req(
        'post',
        'import/progress/',
        {},
        onLoadHandler,
        {
          onError,
        },
      );
      return;
    },

    importFile(file: File,
      filetype: string,
      dbname: string,
      tablename: string,
      connectionId: number,
      originalNames: Immutable.List<string>,
      columnTypes: Immutable.Map<string, object>,
      primaryKeys: List<string>,
      transformations: Immutable.List<object>,
      update: boolean,
      hasCsvHeader: boolean,
      isNewlineSeparatedJSON: boolean,
      requireJSONHaveAllFields: boolean,
      primaryKeyDelimiter: string,
      onLoad: (resp: any) => void,
      onError: (resp: any) => void,
    )
    {
      // TODO: call Ajax.req() instead with formData in body
      const authState = AuthStore.getState();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('id', String(authState.id));
      formData.append('accessToken', authState.accessToken);
      formData.append('filetype', filetype);
      formData.append('dbname', dbname);
      formData.append('tablename', tablename);
      formData.append('dbid', String(connectionId));
      formData.append('originalNames', JSON.stringify(originalNames));
      formData.append('columnTypes', JSON.stringify(columnTypes));
      formData.append('primaryKeys', JSON.stringify(primaryKeys));
      formData.append('transformations', JSON.stringify(transformations));
      formData.append('update', String(update));
      formData.append('hasCsvHeader', String(hasCsvHeader));
      formData.append('isNewlineSeparatedJSON', String(isNewlineSeparatedJSON));
      formData.append('requireJSONHaveAllFields', String(requireJSONHaveAllFields));
      formData.append('primaryKeyDelimiter', primaryKeyDelimiter);

      const xhr = new XMLHttpRequest();
      xhr.open('post', MIDWAY_HOST + '/midway/v1/import/');
      xhr.send(formData);

      xhr.onerror = (err: any) =>
      {
        const routeError: MidwayError = new MidwayError(400, 'The Connection Has Been Lost.', JSON.stringify(err), {});
        onError(routeError);
      };

      xhr.onload = (ev: Event) =>
      {
        if (xhr.status === 401)
        {
          // TODO re-enable
          Actions.logout();
        }

        if (xhr.status !== 200)
        {
          onError(xhr.responseText);
          return;
        }

        onLoad(xhr.responseText);
      };
      return;
    },

    exportFile(filetype: string,
      dbname: string,
      serverId: number,
      columnTypes: Immutable.Map<string, object>,
      transformations: Immutable.List<object>,
      query: string,
      rank: boolean,
      objectKey: string,
      downloadFilename: string,
      onLoad: (resp: any) => void,
      onError?: (ev: string) => void,
    )
    {
      const payload: object = {
        dbid: serverId,
        dbname,
        filetype,
        columnTypes,
        query,
        rank,
        objectKey,
        transformations,
      };
      const onLoadHandler = (resp) =>
      {
        const queryResult: MidwayQueryResponse = MidwayQueryResponse.fromParsedJsonObject(resp);
        onLoad(queryResult);
      };
      Ajax.req(
        'post',
        'import/export/',
        payload,
        onLoadHandler,
        {
          onError,
          download: true,
          downloadFilename,
        },
      );
      return;
    },

    saveTemplate(dbname: string,
      tablename: string,
      dbid: number,
      originalNames: List<string>,
      columnTypes: Immutable.Map<string, object>,
      primaryKeys: List<string>,
      transformations: List<object>,
      name: string,
      exporting: boolean,
      primaryKeyDelimiter: string,
      onLoad: (resp: object[]) => void,
      onError?: (ev: string) => void,
    )
    {
      const payload: object = {
        dbid,
        dbname,
        tablename,
        originalNames,
        columnTypes,
        primaryKeys,
        transformations,
        name,
        export: exporting,
        primaryKeyDelimiter,
      };
      const onLoadHandler = (resp) =>
      {
        onLoad(resp);
      };
      Ajax.req(
        'post',
        'templates/create',
        payload,
        onLoadHandler,
        {
          onError,
        },
      );
      return;
    },

    updateTemplate(originalNames: List<string>,
      columnTypes: Immutable.Map<string, object>,
      primaryKeys: List<string>,
      transformations: List<object>,
      exporting: boolean,
      primaryKeyDelimiter: string,
      templateId: number,
      onLoad: (resp: object[]) => void,
      onError?: (ev: string) => void,
    )
    {
      const payload: object = {
        originalNames,
        columnTypes,
        primaryKeys,
        transformations,
        export: exporting,
        primaryKeyDelimiter,
      };
      const onLoadHandler = (resp) =>
      {
        onLoad(resp);
      };
      Ajax.req(
        'post',
        'templates/' + String(templateId),
        payload,
        onLoadHandler,
        {
          onError,
        },
      );
      return;
    },

    deleteTemplate(templateId: number,
      onLoad: (resp: object[]) => void,
      onError?: (ev: string) => void,
    )
    {
      const onLoadHandler = (resp) =>
      {
        onLoad(resp);
      };
      Ajax.req(
        'post',
        'templates/delete/' + String(templateId),
        {},
        onLoadHandler,
        {
          onError,
        },
      );
      return;
    },

    fetchTemplates(
      connectionId: number,
      dbname: string,
      tablename: string,
      exporting: boolean,
      onLoad: (templates: object[]) => void,
    )
    {
      const payload: object = {
        dbid: connectionId,
        dbname,
        tablename,
      };

      if (exporting)
      {
        payload['exportOnly'] = true;
      }
      else
      {
        payload['importOnly'] = true;
      }

      Ajax.req(
        'post',
        'templates/',
        payload,
        (response: object[]) =>
        {
          onLoad(response);
        },
      );
    },

    schema(dbId: number | string, onLoad: (columns: object | any[], error?: any) => void, onError?: (ev: Event) => void)
    {
      // TODO see if needs to query m1
      return Ajax.req('get', 'database/' + dbId + '/schema', {}, (response: any) =>
      {
        try
        {
          const cols: object = typeof response === 'string' ? JSON.parse(response) : response;
          onLoad(cols);
        }
        catch (e)
        {
          onError && onError(response as any);
        }
      });
    },

    getDbs(onLoad: (dbs: BackendInstance[], loadFinished: boolean) => void, onError?: (ev: Event) => void)
    {
      let m2Dbs: BackendInstance[] = null;
      const checkForLoaded = () =>
      {
        if (!m2Dbs)
        {
          return;
        }

        let dbs: BackendInstance[] = [];
        if (m2Dbs)
        {
          dbs = dbs.concat(m2Dbs);
        }
        onLoad(dbs, !!(m2Dbs));
      };

      Ajax.req(
        'get',
        'database',
        {},
        (dbs: [BackendInstance]) =>
        {
          m2Dbs = dbs.map((db) =>
          {
            db['source'] = 'm2';
            return db;
          });
          checkForLoaded();
        },
        {
          onError: (e) =>
          {
            onError && onError(e);
            m2Dbs = [] as any;
            checkForLoaded();
          },
        },
      );
    },

    createDb(name: string, dsn: string, type: string,
      onSave: (response: any) => void,
      onError: (response: any) => void)
    {
      return Ajax.req(
        'post',
        `database`,
        {
          name,
          dsn,
          host: dsn,
          type,
        },
        onSave,
        {
          onError,
        },
      );
    },

    deleteDb(id: number,
      onSave: (response: any) => void,
      onError: (response: any) => void)
    {
      return Ajax.req(
        'post',
        `database/` + id + `/delete`,
        {},
        onSave,
        {
          onError,
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
      return Ajax.req(
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
      Ajax.req(
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
        {
          onError,
        },
      );
    },

    getAnalytics(
      variantIds: ID[],
      start: Date,
      end: Date,
      metricId: number,
      onLoad: (response: any) => void,
      onError?: (ev: Event) => void)
    {
      const args = {
        variantid: variantIds.join(','),
        start: start.toISOString(),
        end: end.toISOString(),
        interval: 'day',
        eventid: metricId.toString(),
        agg: 'histogram',
        field: '@timestamp',
      };

      return Ajax.req(
        'get',
        `events/agg`,
        {},
        (response: any) =>
        {
          try
          {
            onLoad(response);
          }
          catch (e)
          {
            onError && onError(response as any);
          }
        },
        { onError, urlArgs: args });
    },
  };

export default Ajax;
