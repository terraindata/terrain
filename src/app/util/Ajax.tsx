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

import Store from './../auth/data/AuthStore.tsx';
import Actions from './../auth/data/AuthActions.tsx';
import UserTypes from './../users/UserTypes.tsx';

var Ajax = {
  _req(method: string, url: string, data: any, onLoad: (response: any) => void, onError?: (ev:Event) => void) 
  {
    let xhr = new XMLHttpRequest();
    xhr.onerror = onError;
    xhr.onload = (ev:Event) =>
    {
      if (xhr.status === 401)
      {
        Actions.logout();
        return;
      }
      
      if (xhr.status != 200)
      {
        onLoad({
          error: xhr.responseText
        });
        return;
      }
      
      onLoad(xhr.responseText);
    }
    
    // NOTE: $SERVER_URL will be replaced by the build process.
    xhr.open(method, SERVER_URL + url, true);
    xhr.setRequestHeader('token', Store.getState().get('authenticationToken'));
    xhr.send(data);
    return xhr;  
  },
  
  _post(url: string, data: any, onLoad: (response: any) => void, onError?: (ev:Event) => void)
  {
    return Ajax._req("POST", url, data, onLoad, onError);
  },
  
  _get(url: string, data: any, onLoad: (response: any) => void, onError?: (ev:Event) => void)
  {
    return Ajax._req("GET", url, data, onLoad, onError);
  },
  
  getUsers(onLoad: (users: {[id: string]: any}) => void)
  {
    return Ajax._get("/user/", "", (response: any) =>
      {
        let usersArr = JSON.parse(response);
        var usersObj = {};
        usersArr.map(user => usersObj[user.username] = user);
        onLoad(usersObj);
      });
  },
  
  saveUser(user: UserTypes.User, onSave: (response: any) => void, onError: (response: any) => void)
  {
    var data = user.toJS();
    user.excludeFields.map(field => delete data[field]);
    return Ajax._post(`/user/${user.username}`, JSON.stringify({
      data: JSON.stringify(data),
    }), onSave, onError);
  },
  
  createUser(username: string, password: string, onSave: (response: any) => void, onError: (response: any) => void)
  {
    return Ajax._post(`/user/${username}`, JSON.stringify({
      password,
    }), onSave, onError);
  },
  
  getItems( 
    onLoad: (groups: {[id: string]: any}, algorithms: {[id: string]: any}, variants: {[id: string]: any}, groupsOrder: ID[]) => void, 
    onError?: (ev:Event) => void
  )
  {
    return Ajax._get("/algo/", "", (response: any) =>
    {
      let items = JSON.parse(response);
      
      var mapping = 
      {
        variants: {},
        algorithms: {},
        groups: {},
        groupsOrder: null,
      };
      
      items.map(item =>
      {
        let spec = JSON.parse(item.specification);
        if(mapping[spec.type + 's'])
        {
          mapping[spec.type + 's'][spec.id] = spec;
        }
        if(spec.type === 'groupsOrder')
        {
          mapping.groupsOrder = spec.groupsOrder;
        }
      })
      
      onLoad(mapping.groups, mapping.algorithms, mapping.variants, mapping.groupsOrder);
    }, onError);
  },
  
  getItem(id: ID, onLoad: (item: any) => void, onError?: (ev:Event) => void)
  {
    return Ajax._get(`/algo/${id}`, "", (response: any) =>
    {
      onLoad(JSON.parse(response));
    }, onError);
  },
  
  saveItem(item: Immutable.Map<string, any>, onLoad?: (resp: any) => void, onError?: (ev:Event) => void)
  {
    let id = item.get('id');
    if(item.get('associations'))
    {
      item = item
        .update
        (
          item.get('associations'),
          assocs => assocs.keySeq()
        );
    }
    let data = JSON.stringify(item.toJS());
    onLoad = onLoad || _.noop;
    return Ajax._req("POST", `/algo/${id}`, data, onLoad, onError);
  },
  
	query(tql: string, onLoad: (response: any) => void, onError?: (ev:Event) => void)
  {
    return Ajax._post("/query", tql, onLoad, onError);
  },
  
  schema(onLoad: (tables: {name: string, columns: any[]}[], error?: any) => void, onError?: (ev:Event) => void)
  {
    return Ajax._post("/schema/" , null, (response) => {
      try {
        var tables = JSON.parse(response)['tables'];
      } catch(e) {
        onLoad(null, e);
        return;
      }
      onLoad(tables);
    }, onError);
  }
};

export default Ajax;