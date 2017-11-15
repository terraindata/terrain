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

const $ = (type: string, payload: any) =>
{
  // jmansor: Dispatch to the old LibraryStore too, until store unification is finished.
  Store.dispatch({ type, payload });
  // jmansor: to prevent versioning duplication, only do it during global store dispatch.
  return { type, payload: Object.assign({}, payload, { versioning: true }) };
};

const Actions =
  {
    groups:
    {
      create:
      (
        group: LibraryTypes.Group = LibraryTypes._Group(),
        idCallBack?: (id: ID) => void,
      ) => (dispatch, getState, api) =>
        {
          api.saveItem(
            group,
            (response) =>
            {
              // on load
              const id = response.id; // ??
              dispatch($(ActionTypes.groups.create, {
                group: group.set('id', id),
              }));

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
      ) => (dispatch) =>
        {
          const group = LibraryStore.getState().groups.get(groupId);
          algorithm = algorithm
            .set('parent', groupId)
            .set('groupId', groupId);

          Ajax.saveItem(
            algorithm,
            (response) =>
            {
              // on load
              const id = response.id; // ??
              dispatch($(ActionTypes.algorithms.create, {
                algorithm: algorithm.set('id', id),
              }));
              idCallback && idCallback(id);
            },
          );
        },

      createAs:
      (
        groupId: ID,
        name: string,
        db: BackendInstance,
        onCreate?: (algorithmId) => void,
      ) => (dispatch) =>
        {
          const group = LibraryStore.getState().groups.get(groupId);
          const algorithm = LibraryTypes._Algorithm()
            .set('name', name)
            .set('db', db)
            .set('language', group.defaultLanguage);
          dispatch(Actions.algorithms.create(groupId, algorithm, onCreate));
        },

      change:
      (algorithm: Algorithm) =>
        $(ActionTypes.algorithms.change, { algorithm }),

      move:
      (algorithm: Algorithm, index: number, groupId: ID) =>
        $(ActionTypes.algorithms.move, { groupId, index, algorithm }),

      duplicate:
      (algorithm: Algorithm, index: number, name: string, db: BackendInstance, groupId?: ID) => (dispatch) =>
      {
        const { variantsOrder } = algorithm;

        groupId = groupId || algorithm.groupId;
        algorithm = algorithm
          .set('parent', groupId)
          .set('groupId', groupId)
          .set('id', -1)
          .set('name', name)
          .set('db', db)
          .set('variantsOrder', Immutable.List([]));

        dispatch(Actions.algorithms.create(
          algorithm.groupId,
          algorithm,
          (algorithmId: ID) =>
          {
            const variants = LibraryStore.getState().variants;
            variantsOrder.map(
              (variantId, index) =>
              {
                const variant = variants.get(variantId);
                setTimeout(() => dispatch(Actions.variants.duplicate(variant, index, null, groupId, algorithmId, db)), index * 200);
              },
            );
          },
        ));
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
      ) => (dispatch) =>
        {
          const algorithm = LibraryStore.getState().algorithms.get(algorithmId);
          variant = variant
            .set('parent', algorithmId)
            .set('algorithmId', algorithmId)
            .set('groupId', groupId)
            .set('db', algorithm && algorithm.db)
            .set('language', algorithm && algorithm.language);

          Ajax.saveItem(
            variant,
            (response) =>
            {
              // on load
              const id = response.id; // ??
              dispatch($(ActionTypes.variants.create, {
                variant: variant
                  .set('id', id)
                  .set('deployedName', variant.deployedName || 'terrain_' + String(id)),
              }));
              responseHandler && responseHandler(response, variant);
            },
          );
        },

      change:
      (variant: Variant) =>
        $(ActionTypes.variants.change, { variant }),

      move:
      (variant: Variant, index: number, groupId: ID, algorithmId: ID) => (dispatch) =>
      {
        const algorithm = LibraryStore.getState().algorithms.get(algorithmId);
        variant = variant.set('db', algorithm.db).set('language', algorithm.language);
        return dispatch($(ActionTypes.variants.move, { variant, index, groupId, algorithmId }));
      },

      duplicate:
      (variant: Variant, index: number, name?: string, groupId?: ID, algorithmId?: ID, db?: BackendInstance) => (dispatch) =>
      {
        groupId = groupId || variant.groupId;
        algorithmId = algorithmId || variant.algorithmId;
        const algorithm = LibraryStore.getState().algorithms.get(algorithmId);
        db = db || algorithm.db;
        name = name || Util.duplicateNameFor(variant.name);
        let newVariant = variant
          .set('id', -1)
          .set('parent', algorithmId)
          .set('algorithmId', algorithmId)
          .set('groupId', groupId)
          .set('name', name)
          .set('status', ItemStatus.Build)
          .set('db', db)
          .set('language', algorithm.language);
        newVariant = LibraryTypes.touchVariant(newVariant);

        dispatch(Actions.variants.create(groupId, algorithmId, newVariant));
      },

      duplicateAs:
      (variant: Variant, index: number, variantName?: string, responseHandler?: (response, variant) => any) =>
        (dispatch) =>
        {
          variantName = variantName || Util.duplicateNameFor(variant.name);
          let newVariant = variant
            .set('id', -1)
            .set('parent', variant.algorithmId)
            .set('algorithmId', variant.algorithmId)
            .set('groupId', variant.groupId)
            .set('name', variantName)
            .set('status', ItemStatus.Build);
          newVariant = LibraryTypes.touchVariant(newVariant);

          dispatch(Actions.variants.create(variant.groupId, variant.algorithmId, newVariant, responseHandler));
        },

      deploy:
      (variant: Variant, op: string, templateBody: object, toStatus: ItemStatus, deployedName: string) => (dispatch) =>
      {
        if (variant.deployedName !== deployedName)
        {
            variant = variant.set('deployedName', deployedName);
            console.log('updated variant:');
            console.log(variant);
            dispatch(Actions.variants.change(variant));
        }

        Ajax.deployQuery(
          op,
          templateBody,
          variant.db,
          (response) =>
          {
            // on load
            dispatch(Actions.variants.status(variant, toStatus, true));
            console.log('floop');
            console.log(variant);
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
      return (dispatch) =>
      {
        Ajax.getItems((groups, algorithms, variants, groupsOrder) =>
        {
          dispatch(Actions.loadState(_LibraryState({
            groups,
            algorithms,
            variants,
            groupsOrder,
            loading: false,
          })));
        });
      };
    },
  };

export default Actions;
