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
import ActionTypes from './BrowserActionTypes.tsx';
import Store from './BrowserStore.tsx';
import BrowserTypes from './../BrowserTypes.tsx';
import BuilderTypes from './../../builder/BuilderTypes.tsx';
type Group = BrowserTypes.Group;
type Algorithm = BrowserTypes.Algorithm;
type Variant = BrowserTypes.Variant;
import * as Immutable from 'immutable';

import Ajax from './../../util/Ajax.tsx';

var $ = (type: string, payload: any) => Store.dispatch({type, payload})

const Actions =
{
  groups:
  {
    create:
      () =>
        $(ActionTypes.groups.create, {}),
    
    change:
      (group: Group) =>
        $(ActionTypes.groups.change, { group }),
    
    move:
      (group, index: number) =>
        $(ActionTypes.groups.move, { group, index }),
        
    duplicate:
      (group: Group, index: number) =>
        $(ActionTypes.groups.duplicate, { group, index }),
    
    prevGroups:
      (groups: Map<ID, Group>) =>
        $(ActionTypes.groups.prevGroups, { groups }),
  },
  
  algorithms:
  {
    create:
      (groupId: ID) =>
        $(ActionTypes.algorithms.create, { groupId }),
    
    change:
      (algorithm: Algorithm) =>
        $(ActionTypes.algorithms.change, { algorithm }),
    
    move:
      (algorithm: Algorithm, index: number, groupId: ID) =>
        $(ActionTypes.algorithms.move, { groupId, index, algorithm }),
        
    duplicate:
      (algorithm: Algorithm, index: number, groupId?: ID) =>
        $(ActionTypes.algorithms.duplicate, { algorithm, index, groupId }),
  },
  
  variants:
  {
    create:
      (groupId: ID, algorithmId: ID) =>
        $(ActionTypes.variants.create, { groupId, algorithmId }),
    
    change:
      (variant: Variant) =>
        $(ActionTypes.variants.change, { variant }),
    
    move:
      (variant: Variant, index: number, groupId: ID, algorithmId: ID) =>
        $(ActionTypes.variants.move, { variant, index, groupId, algorithmId }),
        
    duplicate:
      (variant: Variant, index: number, groupId?: ID, algorithmId?: ID) =>
        $(ActionTypes.variants.duplicate, { variant, index, groupId, algorithmId }),
    
    status:
      (variant: Variant, status: BrowserTypes.EVariantStatus, confirmed?: boolean, isDefault?: boolean) =>
        $(ActionTypes.variants.status, { variant, status, confirmed, isDefault }),
  },
  
  loadState:
    (state) =>
      $(ActionTypes.loadState, { state }),
  
  
  // overwrites current state with state from server
  fetch:
    () =>
    {
      Ajax.getItems((groups, algorithms, variants, groupsOrder) =>
      {
        _.map(variants, variant => {
          let alg = algorithms[variant.algorithmId];
          if(!alg.variants)
          {
            alg.variants = Immutable.Map({});
          }
          alg.variants = alg.variants.set(variant.id, 
            (BrowserTypes._Variant(variant))
              .set('cards', BuilderTypes.recordFromJS(variant.cards))
              .set('inputs', BuilderTypes.recordFromJS(variant.inputs))
          );
        });
        
        _.map(algorithms, algorithm => {
          if(algorithm.variantsOrder)
          {
            algorithm.variantsOrder = Immutable.List(algorithm.variantsOrder);
          }
          let g = groups[algorithm.groupId];
          if(!g.algorithms)
          {
            g.algorithms = Immutable.Map({});
          }
          g.algorithms = g.algorithms.set(algorithm.id, BrowserTypes._Algorithm(algorithm));
        });
        
        var groupMap = {};
        _.map(groups, group => {
          if(group.algorithmsOrder)
          {
            group.algorithmsOrder = Immutable.List(group.algorithmsOrder);
          }
          groupMap[group.id] = BrowserTypes._Group(group);
        });
        
        Actions.loadState(Immutable.fromJS({
          groups: Immutable.Map(groupMap),
          groupsOrder: Immutable.List(groupsOrder),
        }));
      })
    },
}

export default Actions;