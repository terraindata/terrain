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

// tslint:disable:no-shadowed-variable strict-boolean-expressions no-unused-expression

import * as Immutable from 'immutable';
import * as _ from 'underscore';

import BackendInstance from '../../../database/types/BackendInstance';
import { ItemStatus } from '../../../items/types/Item';
import Util from '../../util/Util';
import * as LibraryTypes from '../LibraryTypes';
import ActionTypes from './LibraryActionTypes';
import Store from './LibraryStore';
import { _LibraryState, LibraryState, LibraryStore } from './LibraryStore';

type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;
type Variant = LibraryTypes.Variant;

import Ajax from './../../util/Ajax';

const $ = (type: string, payload: any) => Store.dispatch({ type, payload });

const Actions =
  {
    groups:
    {
      create:
      (
        group: LibraryTypes.Group = LibraryTypes._Group(),
        idCallBack?: (id: ID) => void,
      ) =>
      {
        Ajax.saveItem(
          group,
          (response) =>
          {
            // on load
            const id = response.id; // ??
            $(ActionTypes.groups.create, {
              group: group.set('id', id),
            });
            idCallBack && idCallBack(id);
          },
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
      (
        groupId: ID,
        algorithm = LibraryTypes._Algorithm(),
        idCallback?: (id: ID) => void,
        useParentDefaults = true,
      ) =>
      {
        algorithm = algorithm
          .set('parent', groupId)
          .set('groupId', groupId);
        if (useParentDefaults)
        {
          const group = LibraryStore.getState().groups.get(groupId);
          algorithm = algorithm
            .set('db', group && group.db)
            .set('language', group && group.defaultLanguage);
        }

        Ajax.saveItem(
          algorithm,
          (response) =>
          {
            // on load
            const id = response.id; // ??
            $(ActionTypes.algorithms.create, {
              algorithm: algorithm.set('id', id),
            });
            idCallback && idCallback(id);
          },
        );
      },

      createAs:
      (
        groupId: ID,
        name: string,
      ) =>
      {
        const algorithm = LibraryTypes._Algorithm().set('name', name);
        Actions.algorithms.create(groupId, algorithm);
      },

      change:
      (algorithm: Algorithm) =>
        $(ActionTypes.algorithms.change, { algorithm }),

      move:
      (algorithm: Algorithm, index: number, groupId: ID) =>
        $(ActionTypes.algorithms.move, { groupId, index, algorithm }),

      duplicate:
      (algorithm: Algorithm, index: number, groupId?: ID) =>
      {
        const { variantsOrder } = algorithm;

        groupId = groupId || algorithm.groupId;
        algorithm = algorithm
          .set('parent', groupId)
          .set('groupId', groupId)
          .set('id', -1)
          .set('name', Util.duplicateNameFor(algorithm.name))
          .set('variantsOrder', Immutable.List([]));

        Actions.algorithms.create(
          algorithm.groupId,
          algorithm,
          (algorithmId: ID) =>
          {
            const variants = LibraryStore.getState().variants;
            variantsOrder.map(
              (variantId, index) =>
              {
                const variant = variants.get(variantId);
                setTimeout(() => Actions.variants.duplicate(variant, 0, groupId, algorithmId), index * 200);
              },
            );
          },
          false,
        );
      },
    },

    variants:
    {
      create:
      (
        groupId: ID,
        algorithmId: ID,
        variant = LibraryTypes._Variant(),
        responseHandler?: (response, variant) => any,
        useParentDefaults = true,
      ) =>
      {
        variant = variant
          .set('parent', algorithmId)
          .set('algorithmId', algorithmId)
          .set('groupId', groupId);
        if (useParentDefaults)
        {
          const algorithm = LibraryStore.getState().algorithms.get(algorithmId);
          variant = variant
            .set('db', algorithm && algorithm.db)
            .set('language', algorithm && algorithm.language);
        }
        Ajax.saveItem(
          variant,
          (response) =>
          {
            // on load
            const id = response.id; // ??
            $(ActionTypes.variants.create, {
              variant: variant.set('id', id),
            });
            responseHandler && responseHandler(response, variant);
          },
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
        let newVariant = variant
          .set('id', -1)
          .set('parent', algorithmId)
          .set('algorithmId', algorithmId)
          .set('groupId', groupId)
          .set('name', Util.duplicateNameFor(variant.name))
          .set('status', ItemStatus.Build);
        newVariant = LibraryTypes.touchVariant(newVariant);

        Actions.variants.create(groupId, algorithmId, newVariant, undefined, false);
      },

      duplicateAs:
      (variant: Variant, index: number, algorithmName?: string, responseHandler?: (response, variant) => any) =>
      {
        algorithmName = algorithmName || Util.duplicateNameFor(variant.name);
        let newVariant = variant
          .set('id', -1)
          .set('parent', variant.algorithmId)
          .set('algorithmId', variant.algorithmId)
          .set('groupId', variant.groupId)
          .set('name', algorithmName)
          .set('status', ItemStatus.Build);
        newVariant = LibraryTypes.touchVariant(newVariant);

        Actions.variants.create(variant.groupId, variant.algorithmId, newVariant, responseHandler);
      },

      deploy:
      (variant: Variant, op: string, templateBody: object, toStatus: ItemStatus) =>
      {
        Ajax.deployQuery(
          op,
          templateBody,
          variant.db,
          (response) =>
          {
            // on load
            Actions.variants.status(variant, toStatus, true);
          },
        );
      },

      status:
      (variant: Variant, status: ItemStatus, confirmed?: boolean) =>
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

      select:
      (variantId: string) =>
        $(ActionTypes.variants.select, { variantId }),

      unselect:
      (variantId: string) =>
        $(ActionTypes.variants.unselect, { variantId }),

      unselectAll:
      () => $(ActionTypes.variants.unselectAll, {}),
    },

    loadState:
    (state: LibraryState) =>
      $(ActionTypes.loadState, { state }),

    setDbs:
    (dbs: List<BackendInstance>, dbLoadFinished: boolean) =>
      $(ActionTypes.setDbs, { dbs, dbLoadFinished }),

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
          groupsOrder,
          loading: false,
        }));
      });
    },
  };

export default Actions;
