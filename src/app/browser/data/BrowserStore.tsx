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
import Actions from "./BrowserActions.tsx";
import BrowserTypes from './../BrowserTypes.tsx';
import Util from './../../util/Util.tsx';
import { g0, g1, g2, g3, g4 } from './BrowserFixtures.tsx';
import { a00, a01, a02, a03 } from './BrowserFixtures.tsx';
import { v000, v001, v002, v003, v004, v005, v006, v007, v008, v009 } from './BrowserFixtures.tsx';

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


// AuthStore.subscribe(() =>
// {
  // Ajax.saveItem(g0, (e) => {
  //   console.log(e);
  //   Ajax.getItems((items:any) =>
  //   {
  //     console.log(items);
  //   }, (ev:Event) =>
  //   {
  //     console.log('error');
  //   }); 
  // }, (e) => console.log('error', e));
  // Ajax.saveItem(g1);
  // Ajax.saveItem(g2);
  // Ajax.saveItem(g3);
  // Ajax.saveItem(g4);
  
  // Ajax.saveItem(a00);
  // Ajax.saveItem(a01);
  // Ajax.saveItem(a02);
  // Ajax.saveItem(a03);
  
  // Ajax.saveItem(v000);
  // Ajax.saveItem(v001);
  // Ajax.saveItem(v002);
  // Ajax.saveItem(v003);
  // Ajax.saveItem(v004);
  // Ajax.saveItem(v005);
  // Ajax.saveItem(v006);
  // Ajax.saveItem(v007);
  // Ajax.saveItem(v008);
  // Ajax.saveItem(v009);
  
//   Ajax.saveItem(Immutable.Map({
//     id: 'groupsOrder',
//     type: 'groupsOrder',
//     groupsOrder: ["g0", "g1", "g2", "g3", "g4"],
//   }));
// });

// AuthStore.subscribe(() =>
// {
//   if(AuthStore.getState().get('authenticationToken'))
//   {
//     Actions.fetch();
//   }
// });

BrowserStore.subscribe(() =>
{
  let state = BrowserStore.getState();
  if(!state.get('loading'))
  {
    // TODO in the future, consider a more effecient approach
    state.get('groups').map(
      group =>
      {
        Ajax.saveItem(group);
        group.get('algorithms').map(
          algorithm =>
          {
            Ajax.saveItem(algorithm);
            algorithm.get('variants').map(
              variant => Ajax.saveItem(variant)
            );
          }
        );
      }
    );
    Ajax.saveItem(Immutable.Map({
      id: 'groupsOrder',
      type: 'groupsOrder',
      groupsOrder: state.get('groupsOrder'),
    }));
  }
});

export default BrowserStore;