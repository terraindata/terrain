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

import * as Immutable from 'immutable';

import AnalyticsReducer from 'analytics/data/AnalyticsReducer';
import { SpotlightReducers } from 'app/builder/data/SpotlightRedux';
import { ConnectionsReducers } from 'app/connections/data/ConnectionsRedux';
import { AuthReducers } from 'auth/data/AuthRedux';
import BuilderCardsReducers from 'builder/data/BuilderCardsReducers';
import BuilderReducers from 'builder/data/BuilderReducers';
import { ETLReducers } from 'etl/ETLRedux';
import { TemplateEditorReducers } from 'etl/templates/TemplateEditorRedux';
import { WalkthroughReducers } from 'etl/walkthrough/ETLWalkthroughRedux';
import { JobsReducers } from 'jobs/data/JobsRedux';
import LibraryReducer from 'library/data/LibraryReducers';
import { applyMiddleware, compose, createStore } from 'redux';
import { combineReducers } from 'redux-immutable';
import thunk from 'redux-thunk';
import RolesReducer from 'roles/data/RolesReducers';
import { SchemaReducers } from 'schema/data/SchemaRedux';
import TerrainStoreLogger from 'store/TerrainStoreLogger';
import { UserReducers } from 'users/data/UserRedux';
import Ajax from 'util/Ajax';
import { ColorsReducers } from '../colors/data/ColorsRedux';
import { SchedulerReducers } from '../scheduler/data/SchedulerRedux';

const reducers = {
  analytics: AnalyticsReducer,
  auth: AuthReducers,
  builder: BuilderReducers,
  colors: ColorsReducers,
  connections: ConnectionsReducers,
  etl: ETLReducers,
  library: LibraryReducer,
  roles: RolesReducer,
  templateEditor: TemplateEditorReducers,
  schema: SchemaReducers,
  users: UserReducers,
  spotlights: SpotlightReducers,
  walkthrough: WalkthroughReducers,
  builderCards: BuilderCardsReducers,
  scheduler: SchedulerReducers,
  jobs: JobsReducers,
};

const rootReducer = combineReducers(reducers);
const initialState = Immutable.Map();

const terrainStore = createStore(rootReducer, initialState, compose(
  applyMiddleware(thunk.withExtraArgument(Ajax), TerrainStoreLogger.reduxMiddleWare),
  window['devToolsExtension'] ? window['devToolsExtension']() : (f) => f,
));

export default terrainStore;
