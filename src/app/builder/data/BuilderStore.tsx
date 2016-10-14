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

var _ = require('underscore');
import * as Immutable from 'immutable';
import { Map, List } from 'immutable';
import * as ReduxActions from 'redux-actions';
import {CardItem} from '../components/cards/Card.tsx';
var Redux = require('redux');
import ActionTypes from './BuilderActionTypes.tsx';
import Util from '../../util/Util.tsx';

import Types from './../BuilderTypes.tsx';

export class BuilderStateClass
{
  loading: boolean = false;
  queries: Map<ID, Types.IQuery> = Map({});
  
  hoveringCardId: ID = "";
  selectedCardIds: Map<ID, boolean> = Map({});
  
  // These are only for the db of the current open variant
  tables: List<string> = List([]);
  tableColumns: Map<string, List<string>> = Map({});
  
  dbs: List<string> = List([]);
  
  manual: Map<ID, Types.ICards> = Map({});
  // Card examples used in the manual are stored here.
  
  draggingCardItem: CardItem = false;
  draggingOverKeyPath: KeyPath = Immutable.List([]);
  draggingOverIndex: number = -1;
}
export interface BuilderState extends BuilderStateClass, IMap<BuilderState> {}
let BuilderState_Record = Immutable.Record(new BuilderStateClass());
let _BuilderState = (config?:any) => {
  return new BuilderState_Record(config || {}) as any as BuilderState;
}

var DefaultState = _BuilderState();

import BuilderReducers from './BuilderReducers.tsx';

export const BuilderStore: IStore<BuilderState> = Redux.createStore(ReduxActions.handleActions(BuilderReducers), DefaultState);

export default BuilderStore;