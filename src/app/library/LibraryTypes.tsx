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

import * as Immutable from 'immutable';
import * as _ from 'underscore';
import {IResultsConfig} from '../builder/components/results/ResultsConfig';
import BuilderTypes from './../builder/BuilderTypes';
import RoleTypes from './../roles/RoleTypes';
import UserTypes from './../users/UserTypes';
import Util from './../util/Util';
const {List, Map} = Immutable;
import {BaseClass, New} from '../Classes';

export module LibraryTypes
{
  export const ItemStatus =
  {
    Archive: 'ARCHIVE',
    Build: 'BUILD',
    Approve: 'APPROVE',
    Live: 'LIVE',
    Default: 'DEFAULT',
  };

  
  class ItemC extends BaseClass
  {
    // TODO potentially consolidate with midway
    id: number = 0;
    parent: number = 0;
    
    name: string = '';
    status: string = ItemStatus.Build;
    type: string;
    
    dbFields = ['id', 'parent', 'name', 'status', 'type'];
    excludeFields= ['dbFields', 'excludeFields'];
    
    modelVersion = 2; // 2 is for the first version of Node midway
  }
  export type Item = ItemC & IRecord<ItemC>;
  export const _Item = (config?: {[key:string]: any}) => 
    New<Item>(new ItemC(config), config);
  

  class VariantC extends ItemC
  {
    type = 'variant';

    algorithmId: number = -1;
    groupId: number = -1;

    excludeFields= ['dbFields', 'excludeFields', 'algorithmId', 'groupId']; 
    // TODO try super or prototype
    
    lastEdited = '';
    lastUsername = '';
    version = false;
    db = 'urbansitter';

    // don't use this!
    // TODO remove when variants can be saved without queries
    query: BuilderTypes.Query = null;
  }
  export interface Variant extends VariantC, IRecord<Variant> {}
  const Variant_Record = Immutable.Record(new VariantC());
  export const _Variant = (config?: any) => {
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
      };
    }
    
    if(config.modelVersion === 1)
    {
      // from 1 to 2
      // TODO if necessary
    }
    
    config = config || {};

    // TODO change to standalone query Item
    config.query = BuilderTypes._Query(config.query);

    let v = new Variant_Record(config) as any as Variant;
    if (!config || !config.lastUserId || !config.lastEdited)
    {
      v = touchVariant(v);
    }
    return v;
  };

  export function touchVariant(v: Variant): Variant
  {
    return v
      .set('lastEdited', new Date())
      .set('lastUserId', localStorage['id'])
    ;
  }

  export function variantForSave(v: Variant): Variant
  {
    return v.set('query', BuilderTypes.queryForSave(v.query));
  }


  class AlgorithmC extends ItemC
  {
    type = 'algorithm';
    
    groupId = -1;
    
    lastEdited = '';
    lastUsername = '';

    variantsOrder = List([]);
    db = 'urbansitter'; // TODO change

    excludeFields= ['dbFields', 'excludeFields', 'groupId']; 
  }
  const Algorithm_Record = Immutable.Record(new AlgorithmC());
  export interface Algorithm extends AlgorithmC, IRecord<Algorithm> {}
  export const _Algorithm = (config?: any) => {
    if(config && (!config.modelVersion || config.modelVersion === 1))
    {
      // from 0 and 1 to 2
      // TODO
    }
    
    if(!config)
    
    if(config)
    {
      config.variantsOrder = List(config.variantsOrder || []);
    }
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

  export enum EGroupStatus
  {
    // This order must be consistent with Midway
    Archive,
    Live,
  }

  class GroupC
  {
    id: ID = '';
    name = '';
    lastEdited = '';
    lastUserId = '';
    userIds = List([]);
    algorithmsOrder = List([]);
    status = EGroupStatus.Live;
    db = 'urbansitter';

    // for DB storage
    type = 'group';
    dbFields = ['status'];
    dataFields = ['name', 'lastEdited', 'lastUserId', 'algorithmsOrder', 'db'];
  }
  const Group_Record = Immutable.Record(new GroupC());
  export interface Group extends GroupC, IRecord<Group> {}
  export const _Group = (config?: any) => {
    config = Util.extendId(config || {});
    config.userIds = List(config.userIds || []);
    config.algorithmsOrder = List(config.algorithmsOrder || []);
    return new Group_Record(config) as any as Group;
  };

  export function nameForStatus(status: ItemStatus | string): string
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
      case 'Default':
        return 'Default';
      default:
        return 'None';
    }
  }

  export function colorForStatus(status: ItemStatus | string): string
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
      case 'Default':
        return '#957048';
      default:
        return '#000';
    }
  }

  export function getDbFor(item: Variant | Algorithm | Group | BuilderTypes.Query): string
  {
    // TODO change when DB is at algorithm level
    switch (item && item.type)
    {
      case 'query':
        // const variantId = (item as BuilderTypes.Query).variantId;
        return null;
      case 'variant':
        return (item as Variant).db;
      case 'algorithm':
        return null;
      case 'group':
      default:
        return null;
    }
  }
}

export default LibraryTypes;
