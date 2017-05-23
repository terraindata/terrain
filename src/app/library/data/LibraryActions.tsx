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

const _ = require('underscore');
import Util from '../../util/Util';
import BuilderTypes from './../../builder/BuilderTypes';
import LibraryTypes from './../LibraryTypes';
import ActionTypes from './LibraryActionTypes';
import Store from './LibraryStore';
import {_LibraryState, LibraryState, LibraryStore} from './LibraryStore';
type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;
type Variant = LibraryTypes.Variant;
import * as Immutable from 'immutable';

import Ajax from './../../util/Ajax';

const $ = (type: string, payload: any) => Store.dispatch({type, payload});

const Actions =
{
  groups:
  {
    create:
      (
        group: LibraryTypes.Group = LibraryTypes._Group(),
        idCallBack?: (id: ID) => void
      ) =>
      {
        Ajax.saveItem(
          group,
          (response) =>
          {
            // on load
            let id = response.id; //??
            $(ActionTypes.groups.create, {
              group: group.set('id', id),
            });
            idCallBack && idCallBack(id);
          }
        );
      },

    change:
      (group: Group) =>
        $(ActionTypes.groups.change, { group }),

    move:
      (group, index: number) =>
        $(ActionTypes.groups.move, { group, index }),

    // duplicate:
    //   (group: Group, index: number) =>
    //     $(ActionTypes.groups.duplicate, { group, index }),
  },

  algorithms:
  {
    create:
      (groupId: ID) =>
      {
        Ajax.saveItem(
          LibraryTypes._Algorithm({
            parent: groupId,
          }),
          (response) =>
          {
            // on load
            let id = response.id; //??
            $(ActionTypes.algorithms.create, {
              algorithm: LibraryTypes._Algorithm({
                id,
                parent: groupId,
                groupId,
              })
            });
          }
        );
      },

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
      (groupId: ID, algorithmId: ID, variant = LibraryTypes._Variant()) =>
      {
        variant = variant
          .set('parent', algorithmId)
          .set('algorithmId', algorithmId)
          .set('groupId', groupId);
          
        Ajax.saveItem(
          variant,
          (response) =>
          {
            // on load
            let id = response.id; //??
            $(ActionTypes.variants.create, {
              variant: variant.set('id', id),
            });
          }
        );
      },

    change:
      (variant: Variant) =>
        $(ActionTypes.variants.change, { variant }),

    move:
      (variant: Variant, index: number, groupId: ID, algorithmId: ID) =>
        $(ActionTypes.variants.move, { variant, index, groupId, algorithmId }),

    duplicate:
      (variant: Variant, index: number, groupId?: ID, algorithmId?: ID) =>
      {
        groupId = groupId || variant.groupId;
        algorithmId = algorithmId || variant.algorithmId;
        
        let newVariant = variant.set('id', -1)
          .set('parent', algorithmId)
          .set('groupId', groupId)
          .set('name', Util.duplicateNameFor(variant.name))
          ;
        newVariant = LibraryTypes.touchVariant(newVariant);
        
        Actions.variants.create(groupId, algorithmId, newVariant);
      },

    status:
      (variant: Variant, status: LibraryTypes.ItemStatus, confirmed?: boolean) =>
        $(ActionTypes.variants.status, { variant, status, confirmed }),

    fetchVersion:
      (variantId: string, onNoVersion: (variantId: string) => void) =>
      {
        // TODO
        // Ajax.getVariantVersion(variantId, (variantVersion: LibraryTypes.Variant) =>
        // {
        //   if (!variantVersion)
        //   {
        //     onNoVersion(variantId);
        //   }
        //   else
        //   {
        //     Actions.variants.loadVersion(variantId, variantVersion);
        //   }
        // });
      },

    loadVersion:
      (variantId: string, variantVersion: LibraryTypes.Variant) =>
        $(ActionTypes.variants.loadVersion, { variantId, variantVersion }),

  },

  loadState:
    (state: LibraryState) =>
      $(ActionTypes.loadState, { state }),

  setDbs:
    (dbs: List<string>) =>
      $(ActionTypes.setDbs, { dbs }),

  // overwrites current state with state from server
  fetch:
    () =>
    {
      Ajax.getItems((groups, algorithms, variants, groupsOrder) =>
      {
        Actions.loadState(_LibraryState({
          groups,
          algorithms,
          variants,
          groupsOrder: groupsOrder,
          loading: false,
        }));
      });
    },
};

export default Actions;
