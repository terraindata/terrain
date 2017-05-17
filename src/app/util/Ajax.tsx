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

import Actions from './../auth/data/AuthActions';
import AuthStore from './../auth/data/AuthStore';
import BuilderTypes from './../builder/BuilderTypes';
import LibraryTypes from './../library/LibraryTypes';
import RoleTypes from './../roles/RoleTypes';
import UserTypes from './../users/UserTypes';
import Util from './../util/Util';

export interface QueryResponse
{
  results?: any[];
  errorMessage?: string;
}

export const Ajax =
{
  _reqMidway2(
    method: 'post' | 'get',
    url: string,
    data: object,
    onLoad: (response: object) => void,
    config: {
      onError?: (response: any) => void,
      // crossDomain?: boolean;
      download?: boolean;
      downloadFilename?: string;
    } = {},
  )
  {
    return Ajax._req(
      method,
      "/midway/v1/" + url,
      JSON.stringify(data),
      (response) =>
      {
        var responseData: object = null;
        try {
          responseData = JSON.parse(response);
        }
        catch(e)
        {
          config.onError && config.onError(e);
        }

        if(responseData !== undefined)
        {
          // needs to be outside of the try/catch so that any errors it throws aren't caught
          onLoad(responseData)
        }
      },
      _.extend({
        host: 'http://localhost:3000',
        noToken: true,
        json: true,
      }, config)
    );
  },

  midwayStatus(
    success: () => void,
    failure: () => void,
  )
  {
    return Ajax._reqMidway2(
      'get',
      'status',
      {},
      (resp: { status: string }) =>
      {
        if(resp && resp.status === 'ok')
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

  _req(
    method: string,
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
    } = {},
  )
  {
    let host = config.host || MIDWAY_HOST;
    console.log("config.host = " + config.host);
    console.log("MIDWAY_HOST = " + MIDWAY_HOST);
    host = MIDWAY_HOST;
    const fullUrl = host + url;
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
        Actions.logout();
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

    // NOTE: MIDWAY_HOST will be replaced by the build process.
    console.log("fullUrl = " + fullUrl);
    xhr.open(method, fullUrl, true);

    if (config.json)
    {
      xhr.setRequestHeader('Content-type', 'application/json');
    }

    if (!config.noToken)
    {
      xhr.setRequestHeader('token', token);
    }

    if (config.crossDomain)
    {
      xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
      xhr.setRequestHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Access-Control-Allow-Origin');
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
    reqFields: {[f: string]: any},
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
      xhr:
        Ajax._req('POST', url, JSON.stringify(_.extend(
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

  saveRole: (role: RoleTypes.Role) =>
    Ajax._post(
      `/roles/${role.groupId}/${role.userId}/${role.admin ? '1' : '0'}/${role.builder ? '1' : '0'}`,
      '',
      _.noop),

  getRoles: (onLoad: (roles: any[]) => void) =>
    Ajax._get('/roles/', '', (response: any) => {
      onLoad(JSON.parse(response));
    })
  ,

  getUsers(onLoad: (users: {[id: string]: any}) => void)
  {
    return Ajax._get('/users/', '', (response: any) =>
      {
        const usersArr = JSON.parse(response);
        const usersObj = {};
        usersArr.map((user) => usersObj[user.username] = user);
        onLoad(usersObj);
      });
  },

  saveUser(user: UserTypes.User, onSave: (response: any) => void, onError: (response: any) => void)
  {
    const data = user.toJS();
    user.excludeFields.map((field) => delete data[field]);
    user.dbFields.map((field) => delete data[field]);
    return Ajax._post(`/users/${user.userId}`, JSON.stringify({
      data: JSON.stringify(data),
    }), onSave, onError);
  },

  changePassword(username: string, oldPassword: string, newPassword: string, onSave: (response: any) => void, onError: (response: any) => void)
  {
    return Ajax._post(`/users/${username}`, JSON.stringify({
      oldpassword: oldPassword,
      password: newPassword,
    }), onSave, onError);
  },

  adminSaveUser(user: UserTypes.User)
  {
    return Ajax._post(`/users/${user.userId}`, JSON.stringify({
      admin: user.isAdmin ? 1 : 0,
      disabled: user.isDisabled ? 1 : 0,
    }), _.noop);
  },

  createUser(username: string, password: string, onSave: (response: any) => void, onError: (response: any) => void)
  {
    return Ajax._post(`/users/${username}`, JSON.stringify({
      password,
    }), onSave, onError);
  },

  getItems(
    onLoad: (groups: {[id: string]: any}, algorithms: {[id: string]: any}, variants: {[id: string]: any}, groupsOrder: ID[]) => void,
    onError?: (ev: Event) => void,
  )
  {
    return Ajax._get('/items/', '', (response: any) =>
    {
      const items = JSON.parse(response);

      const mapping =
      {
        variants: {},
        algorithms: {},
        groups: {},
        groupsOrder: [],
      };
      const keys = ['groups', 'algorithms', 'variants'];
      keys.map((key) =>
        items[key].map((item) =>
        {
          const data = item.data && item.data.length ? item.data : '{}';
          item = _.extend({}, JSON.parse(item.data), item);
          delete item.data;
          mapping[key][item.id] = item;
          if (key === 'groups')
          {
            mapping.groupsOrder.push(item.id);
          }
        }),
      );

      onLoad(mapping.groups, mapping.algorithms, mapping.variants, mapping.groupsOrder);
    }, onError);
  },

  getItem(type: string, id: ID, onLoad: (item: any) => void, onError?: (ev: Event) => void)
  {
    return Ajax._get(`/items/${id}`, '', (response: any) =>
    {
      // TODO change if the middle tier format changes
      const r = JSON.parse(response);
      const all = r && r[type + 's'];
      const item = all && all.find((i) => i.id === id);
      if (item)
      {
        _.extend(item, JSON.parse(item.data));
        delete item.data;
      }
      onLoad(item);
    }, onError);
  },

  getVariant(variantId: ID, onLoad: (variant: LibraryTypes.Variant) => void)
  {
    if (variantId.indexOf('@') === -1)
    {
      return Ajax.getItem(
        'variant',
        variantId,
        (variantData: object) =>
        {
          onLoad(LibraryTypes._Variant(variantData));
        },
      );
    }
    else
    {
      return Ajax.getVariantVersion(
        variantId,
        onLoad,
      );
    }
  },

  getVariantVersions(variantId: ID, onLoad: (variantVersions: any) => void)
  {
    const url = '/variant_versions/' + variantId;
    return Ajax._get(url, '', (response: any) =>
    {
      const variantVersions = JSON.parse(response);
      onLoad(variantVersions);
    });
  },

  getVariantVersion(variantId: ID, onLoad: (variantVersion: any) => void)
  {
    if (!variantId || variantId.indexOf('@') === -1)
    {
      onLoad(null);
      return null;
    }

    // viewing an old version
    const pieces = variantId.split('@');
    const originalVariantId = pieces[0];
    const versionId = pieces[1];

    const url = '/variant_versions/' + originalVariantId;
    return Ajax._get(
      url,
      '',
      (response: any) =>
      {
        const version = JSON.parse(response).find((v) => v.id === versionId);
        if (version)
        {
          const data = JSON.parse(version.data);
          Ajax.getVariant(originalVariantId, (v: LibraryTypes.Variant) =>
          {
            if (v)
            {
              data['id'] = v.id;
              data['groupId'] = v.groupId;
              data['status'] = v.status;
              data['algorithmId'] = v.algorithmId;
              data['version'] = true;

              onLoad(LibraryTypes._Variant(data));
            }
            else
            {
              onLoad(null);
            }
          });
        }
        else
        {
          onLoad(null);
        }
      },
      () => onLoad(null),
    );
  },

  getQuery(
    variantId: ID,
    onLoad: (query: BuilderTypes.Query, variant: LibraryTypes.Variant) => void,
  )
  {
    if (!variantId)
    {
      return;
    }

    // TODO change if we store queries separate from variants
    const load = (v: LibraryTypes.Variant) =>
    {
      if (!v || !v.query)
      {
        onLoad(null, v);
      }
      onLoad(v.query, v);
    };

    return Ajax.getVariant(
      variantId,
      load,
    );
  },

  saveItem(item: LibraryTypes.Variant | LibraryTypes.Algorithm | LibraryTypes.Group, onLoad?: (resp: any) => void, onError?: (ev: Event) => void)
  {
    const id = item.get('id');
    const type = item.get('type');
    const obj = {
      data: {},
    };
    item.get('dbFields').map((field) =>
      obj[field] = Util.asJS(item.get(field)),
    );
    item.get('dataFields').map((field) =>
        obj.data[field] = Util.asJS(item.get(field)),
    );
    obj.data = JSON.stringify(obj.data);
    onLoad = onLoad || _.noop;
    return Ajax._req('POST', `/${type}s/${id}`, JSON.stringify(obj), onLoad, onError);
  },

  // run query, consider renaming
  query(
    tql: string,
    db: string,
    onLoad: (response: QueryResponse) => void,
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
        try {
          resp = resp.replace(/\t/g, ' ').replace(/\n/g, ' ');
          respData = JSON.parse(resp);
        } catch (e) {
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

  parseTree(tql: string, db: string, onLoad: (response: QueryResponse) => void, onError?: (ev: Event) => void)
  {
    return Ajax._postMidway1('/get_tql_tree', {
        query_string: encode_utf8(tql),
        db,
      },

      (resp) =>
      {
        let respData = null;
        try {
          resp = resp.replace(/\t/g, ''); // tabs cause the JSON parser to error out
          respData = JSON.parse(resp);
        } catch (e) {
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

  schema(dbId: number, onLoad: (columns: any[], error?: any) => void, onError?: (ev: Event) => void)
  {
    /*_reqMidway2(
    method: 'post' | 'get',
    url: string,
    data: object,
    onLoad: (response: any) => void,
    config: {
      onError?: (response: any) => void,
      // crossDomain?: boolean;
      noToken?: boolean;
      download?: boolean;
      downloadFilename?: string;
    } = {}, */
    return Ajax._reqMidway2('get', '/database/' + dbId + '/schema', {}, (response: any) => {
      console.log('got schema for database ' + dbId + ':\n' + response.toString());
    });
      /*(resp: string) =>
      {
        let cols: any = null;
        try
        {
          cols = JSON.parse(resp).results;
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
      );*/
  },

  getDbs(onLoad: (dbs: string[]) => void, onError?: (ev: Event) => void)
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
    return Ajax._postMidway1('/kill_query_by_id', {
        query_id: id,
      },

      (resp) =>
      {
      },
    );
  },

  login(
    email: string,
    password: string,
    onLoad: (data: {
      id: number,
      accessToken: string,
    }) => void,
    onError: (error) => void
  ): XMLHttpRequest
  {
    return Ajax._reqMidway2(
      'post',
      'auth/login',
      {
        email,
        password,
      },
      onLoad,
      onError
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
      (data: {loggedIn: boolean}) =>
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
      onError
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

function encode_utf8(s) {
  return unescape(encodeURIComponent(s));
}

function decode_utf8(s) {
  return decodeURIComponent(escape(s));
}

export default Ajax;
