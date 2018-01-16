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

// tslint:disable:variable-name max-classes-per-file strict-boolean-expressions

import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import Util from 'util/Util';
import BackendInstance from '../../database/types/BackendInstance';
import { Item, ItemC, ItemStatus, ItemType } from '../../items/types/Item';
import { _Query, Query, queryForSave } from '../../items/types/Query';
import { createRecordType } from '../Classes';

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
  public changingStatusOf: Algorithm = null;
  public changingStatusTo: ItemStatus = 'BUILD';

  // Keep track of versioning
  public modelVersion: number = 3;
}

const LibraryState_Record = createRecordType(new LibraryStateC(), 'LibraryStateC');
export interface LibraryState extends LibraryStateC, IRecord<LibraryState> { }
export const _LibraryState = (config?: any) =>
{
  if (config && !(config['modelVersion'] || config['modelVersion'] < 2))
  {
    config['modelVersion'] = 3;
  }
  return new LibraryState_Record(Util.extendId(config || {})) as any as LibraryState;
};

export type LibraryItem = Category | Algorithm | Group;

class AlgorithmC extends ItemC
{
  public type = ItemType.Algorithm;

  public groupId: number = -1;
  public categoryId: number = -1;

  public excludeFields: string[] = ['dbFields', 'excludeFields', 'groupId', 'categoryId'];
  // TODO try super or prototype

  public lastEdited: string = '';
  public lastUserId: number = -1;
  public version: boolean = false;
  public language: string = 'elastic';
  public deployedName: string = '';
  public modelVersion = 3;
  // don't use this!
  // TODO remove when algorithms can be saved without queries
  public query: Query = null;
}
export interface Algorithm extends AlgorithmC, IRecord<Algorithm> { }
const Algorithm_Record = createRecordType(new AlgorithmC(), 'AlgorithmC');
export const _Algorithm = (config?: any) =>
{
  // NOTE: we do not want a default value for the config param because
  //  we want to know the difference between creating a new algorithm with
  //  no params vs. an old version with no modelVersion param
  if (config && !config.modelVersion)
  {
    // from modelVersion 0 to 1
    config.modelVersion = 1;
    config.query = {
      cards: config.cards,
      inputs: config.inputs,
      resultsConfig: config.resultsConfig,
      tql: config.tql,
      deckOpen: config.deckOpen,
      algorithmId: config.id,
      language: 'mysql',
    };
  }

  if (config && config.modelVersion === 1)
  {
    // from 1 to 2
    config.modelVersion = 2;
    config.categoryId = config.groupId;
  }

  if (config && (config.modelVersion < 3))
  {
    config.modelVersion = 3;
    config.groupId = config.algorithmId;
  }

  config = config || {};
  config.language = config.language || 'elastic';

  config.query = config.query || {};
  config.query.language = config.language;
  config.query = _Query(config.query);

  config.deployedName = config.deployedName || (config.id ? 'terrain_' + String(config.id) : '');

  let v = new Algorithm_Record(config) as any as Algorithm;
  if (!config || !config.lastUserId || !config.lastEdited)
  {
    v = touchAlgorithm(v);
  }
  return v;
};

export function touchAlgorithm(v: Algorithm): Algorithm
{
  return v
    .set('lastEdited', new Date())
    .set('lastUserId', +localStorage['id'])
    ;
}

export function algorithmForSave(v: Algorithm): Algorithm
{
  return v.set('query', queryForSave(v.query));
}

class GroupC extends ItemC
{
  public type = ItemType.Group;

  public categoryId = -1;

  public lastEdited = '';
  public lastUsername = '';

  public algorithmsOrder = List([]);
  public language = 'elastic';

  public excludeFields = ['dbFields', 'excludeFields', 'categoryId'];
  public modelVersion = 3;
}

const Group_Record = createRecordType(new GroupC(), 'GroupC');
export interface Group extends GroupC, IRecord<Group> { }
export const _Group = (config?: any) =>
{
  if (config && (!config.modelVersion || config.modelVersion === 1))
  {
    // from 0 and 1 to 2
    config.modelVersion = 2;
    config.categoryId = config.groupId;
  }
  if (config && (!config.modelVersion || config.modelVersion < 3))
  {
    config.modelVersion = 3;
    config.algorithmsOrder = config.variantsOrder;
  }
  // from 2 to 3

  config = config || {};
  config.algorithmsOrder = List(config.algorithmsOrder || []);
  return new Group_Record(config) as any as Group;
};

export const categoryColors =
  [
    '#00A7F7',
    '#00BCD6',
    '#009788',
    '#48B14B',
    '#8AC541',
    '#CCDD1F',
    '#FFEC18',
    '#FFC200',
    '#FF9900',
    '#5F7D8C',
  ];

class CategoryC extends ItemC
{
  public type = ItemType.Category;

  public lastEdited = '';
  public lastUserId = '';
  public userIds = List([]);
  public groupsOrder = List([]);
  public defaultLanguage = 'elastic';
  public modelVersion = 3;
}

const Category_Record = createRecordType(new CategoryC(), 'CategoryC');
export interface Category extends CategoryC, IRecord<Category> { }
export const _Category = (config: any = {}) =>
{
  if (config && (!config.modelVersion || config.modelVersion === 1))
  {
    // from 0 and 1 to 2
    // TODO
  }
  // 2 --> 3
  if (config && (!config.modelVersion || config.modelVersion < 3))
  {
    config['groupsOrder'] = config['algorithmsOrder'];
    config['modelVersion'] = 3;
  }

  config = config || {};
  config.userIds = List(config.userIds || []);
  config.groupsOrder = List(config.groupsOrder || []);
  return new Category_Record(config) as any as Category;
};

export function nameForStatus(status: ItemStatus): string
{
  switch (status)
  {
    case ItemStatus.Approve:
      return 'Approve';
    case ItemStatus.Archive:
      return 'Archive';
    case ItemStatus.Build:
      return 'Build';
    case ItemStatus.Live:
      return 'Live';
    case ItemStatus.Default:
      return 'Default';
    default:
      return 'None';
  }
}

export function colorForStatus(status: ItemStatus): string
{
  switch (status)
  {
    case ItemStatus.Approve:
      return '#bf5bff';
    case ItemStatus.Archive:
      return '#ff735b';
    case ItemStatus.Build:
      return '#00a7f7';
    case ItemStatus.Live:
      return '#48b14b';
    case ItemStatus.Default:
      return '#957048';
    default:
      return '#000';
  }
}

export const typeToConstructor: {
  [key: string]: (...args) => Item,
} =
  {
    [ItemType.Query]: _Query,
    [ItemType.Algorithm]: _Algorithm,
    [ItemType.Group]: _Group,
    [ItemType.Category]: _Category,
  };
