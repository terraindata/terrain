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

import * as _ from 'underscore';
import * as Immutable from 'immutable';
import * as ReduxActions from 'redux-actions';
var Redux = require('redux');

import AuthStore from './../../auth/data/AuthStore.tsx';
import UserStore from './../../users/data/UserStore.tsx';
import RoleStore from './../../roles/data/RolesStore.tsx';
import Actions from "./BrowserActions.tsx";
import BrowserTypes from './../BrowserTypes.tsx';
import Util from './../../util/Util.tsx';

import Ajax from './../../util/Ajax.tsx';

var DefaultState = Immutable.fromJS({
  loading: true,
  // groups: {},
  // groupsOrder: [],
});

import BrowserReducers from './BrowserReducers.tsx';

let BrowserStore = Redux.createStore(ReduxActions.handleActions(_.extend({},
  BrowserReducers,
{})), DefaultState);


BrowserStore.subscribe(() =>
{
  let state = BrowserStore.getState();
  let groups = state.get('groups');
  let prevGroups = state.get('prevGroups');
  if(groups !== prevGroups)
  {
    groups.map((group: BrowserTypes.Group, groupId: ID) =>
    {
      let prevGroup = prevGroups.get(groupId);
      if(group !== prevGroup)
      {
        if(Util.canEdit(group, UserStore, RoleStore))
        {
          Ajax.saveItem(group);
        }
        
        group.algorithms.map((alg: BrowserTypes.Algorithm, algId: ID) =>
        {
          let prevAlg = prevGroup && prevGroup.algorithms.get(algId);
          if(prevAlg !== alg)
          {
            if(Util.canEdit(alg, UserStore, RoleStore))
            {
              Ajax.saveItem(alg);
            }
            
            alg.variants.map((v: BrowserTypes.Variant, vId: ID) =>
            {
              if(v !== (prevAlg && prevAlg.variants.get(vId)))
              {
                if(Util.canEdit(v, UserStore, RoleStore))
                {
                  Ajax.saveItem(v);
                }
              }
            });
          }
        });
      }
    });
    
    Actions.groups.prevGroups(groups);
  }
});

export default BrowserStore;