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
import { Item, ItemC, ItemStatus, ItemType } from '../../items/types/Item';
import { _Query, Query, queryForSave } from '../../items/types/Query';

export type LibraryItem = Group | Variant | Algorithm;
// TODO MOD refactor

class VariantC extends ItemC
{
  public type = ItemType.Variant;

  public algorithmId: number = -1;
  public groupId: number = -1;

  public excludeFields: string[] = ['dbFields', 'excludeFields', 'algorithmId', 'groupId'];
  // TODO try super or prototype

  public lastEdited: string = '';
  public lastUserId: number = -1;
  public version: boolean = false;
  public language: string = 'elastic';
  public deployedName: string = '';

  // don't use this!
  // TODO remove when variants can be saved without queries
  public query: Query = null;
}
export interface Variant extends VariantC, IRecord<Variant> { }
const Variant_Record = Immutable.Record(new VariantC());
export const _Variant = (config?: any) =>
{
  // NOTE: we do not want a default value for the config param because
  //  we want to know the difference between creating a new variant with
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
      variantId: config.id,
      language: 'mysql',
    };
  }

  if (config && config.modelVersion === 1)
  {
    // from 1 to 2
    // TODO if necessary
  }

  config = config || {};
  config.language = config.language || 'elastic';

  config.query = config.query || {};
  config.query.language = config.language;
  config.query = _Query(config.query);

  config.deployedName = config.deployedName || (config.id ? 'terrain_' + String(config.id) : '');

  let v = new Variant_Record(config) as any as Variant;
  if (!config || !config.lastUserId || !config.lastEdited)
  {
    v = touchVariant(v);
  }
  console.log('new variant created');
  console.log(v);
  return v;
};

export function touchVariant(v: Variant): Variant
{
  return v
    .set('lastEdited', new Date())
    .set('lastUserId', +localStorage['id'])
    ;
}

export function variantForSave(v: Variant): Variant
{
  return v.set('query', queryForSave(v.query));
}

class AlgorithmC extends ItemC
{
  public type = ItemType.Algorithm;

  public groupId = -1;

  public lastEdited = '';
  public lastUsername = '';

  public variantsOrder = List([]);
  public language = 'elastic';

  public excludeFields = ['dbFields', 'excludeFields', 'groupId'];
}
const Algorithm_Record = Immutable.Record(new AlgorithmC());
export interface Algorithm extends AlgorithmC, IRecord<Algorithm> { }
export const _Algorithm = (config?: any) =>
{
  if (config && (!config.modelVersion || config.modelVersion === 1))
  {
    // from 0 and 1 to 2
    // TODO
  }

  config = config || {};
  config.variantsOrder = List(config.variantsOrder || []);
  return new Algorithm_Record(config) as any as Algorithm;
};

export const groupColors =
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

class GroupC extends ItemC
{
  public type = ItemType.Group;

  public lastEdited = '';
  public lastUserId = '';
  public userIds = List([]);
  public algorithmsOrder = List([]);
  public defaultLanguage = 'elastic';
}
const Group_Record = Immutable.Record(new GroupC());
export interface Group extends GroupC, IRecord<Group> { }
export const _Group = (config: any = {}) =>
{
  if (config && (!config.modelVersion || config.modelVersion === 1))
  {
    // from 0 and 1 to 2
    // TODO
  }

  config = config || {};
  config.userIds = List(config.userIds || []);
  config.algorithmsOrder = List(config.algorithmsOrder || []);
  return new Group_Record(config) as any as Group;
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
    [ItemType.Variant]: _Variant,
    [ItemType.Algorithm]: _Algorithm,
    [ItemType.Group]: _Group,
  };
