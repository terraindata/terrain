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

// tslint:disable:no-var-requires variable-name strict-boolean-expressions no-unused-expression

import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as Redux from 'redux';
import thunk from 'redux-thunk';
import BackendInstance from '../../../database/types/BackendInstance';
import * as LibraryTypes from './../LibraryTypes';

import { ItemStatus } from '../../../items/types/Item';
import Util from './../../util/Util';

type Category = LibraryTypes.Category;
type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;

class LibraryStateC
{
  public loaded = false;
  public loading = true;
  public dbs: List<BackendInstance> = Immutable.List([]);
  public dbsLoaded: boolean = false;

  public categories: IMMap<ID, Category> = null;
  public groups: IMMap<ID, Group> = null;
  public algorithms: IMMap<ID, Algorithm> = null;
  public selectedAlgorithm: ID = null;

  // these are set these on initial load
  public prevCategories: IMMap<ID, Category> = null;
  public prevGroups: IMMap<ID, Group> = null;
  public prevAlgorithms: IMMap<ID, Algorithm> = null;

  public categoriesOrder: List<ID> = Immutable.List([]);

  public changingStatus: boolean = false;
  public changingStatusOf: LibraryTypes.Algorithm = null;
  public changingStatusTo: ItemStatus = 'BUILD';

  // Keep track of versioning
  public modelVersion: number = 3;
}
const LibraryState_Record = Immutable.Record(new LibraryStateC());
export interface LibraryState extends LibraryStateC, IRecord<LibraryState> { }
export const _LibraryState = (config?: any) =>
{
  if (config && !(config['modelVersion'] || config['modelVersion'] < 2))
  {
    config['modelVersion'] = 3;
  }
  return new LibraryState_Record(Util.extendId(config || {})) as any as LibraryState;
};

// So this is the best way I’ve found so far to combine the advantages of ImmutableJS with Typescript.
// It does get a little messy or hacky
// 1. `LibraryStateC` is just a plain ES6 class with properties that all have to have default values
// but by itself, that class won’t have Immutability, so we make:
// 2. `LibraryState_Record` is an Immutable class that’s created from `LibraryStateC`. It will contain
//      the members that are specified in LibraryStateC and their default values (they have to have default values for Immutable)
// but Typescript doesn’t know the properties that LibraryState_Record can have (e.g. `loaded`, `categories`), so we make
// 3. `interface LibraryState`, which is just a union of the `LibraryStateC` type with the Immutable Record type for LibraryState.
//  This correctly expresses the typings of `LibraryState_Record`, and this is the actual type that we use throughout
//   the app when referring to LibraryState types
// 4. `_LibraryState` is just a utility function to make new objects of type `LibraryState`,
//     basically just instantiating a `LibraryState_Record` and casting it to type `LibraryState`, an applying some smarter
//     default values

// …So I know it’s a little messy and a lot to take in. The goal is to be able to do things like these:
// const libraryState = _LibraryState({ ... });
// const categories = libraryState.categories; // typescript recognizes the categories property on libraryState
// const loadingLibraryState = libraryState.set('loading', true); // typescript still knows that this returns a LibraryState type

const DefaultState = _LibraryState();

import LibraryReducers from './LibraryReducers';

// Because LibraryReducers.tsx imports LibraryState and _LibraryState
// from this file, and this file imports LibraryReducers from LibraryReducers.tsx
// it will cause circularity problems in environments that don't go trough webpack
// like Jest. That's why we check that if the reducer is not defined, use a dummy reducer.
export const LibraryStore = Redux.createStore(
  LibraryReducers !== undefined ? LibraryReducers : (state, action) => state,
  DefaultState,
  Redux.applyMiddleware(thunk),
);

export default LibraryStore;
