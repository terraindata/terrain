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

type Category = LibraryTypes.Category;
type Group = LibraryTypes.Group;
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
    categories:
    {
      create:
      (
        category: LibraryTypes.Category = LibraryTypes._Category(),
        idCallBack?: (id: ID) => void,
      ) => (dispatch, getState, api) =>
        {
          api.saveItem(
            category,
            (response) =>
            {
              // on load
              const id = response.id; // ??
              dispatch($(ActionTypes.categories.create, {
                category: category.set('id', id),
              }));

              idCallBack && idCallBack(id);
            },
          );
        },

      change:
      (category: Category) =>
        $(ActionTypes.categories.change, { category }),

      move:
      (category, index: number) =>
        $(ActionTypes.categories.move, { category, index }),

      // duplicate:
      //   (category: Category, index: number) =>
      //     $(ActionTypes.categories.duplicate, { category, index }),
    },

    groups:
    {
      create:
      (
        categoryId: ID,
        group = LibraryTypes._Group(),
        idCallback?: (id: ID) => void,
      ) => (dispatch) =>
        {
          const category = LibraryStore.getState().categories.get(categoryId);
          group = group
            .set('parent', categoryId)
            .set('categoryId', categoryId);

          Ajax.saveItem(
            group,
            (response) =>
            {
              // on load
              const id = response.id; // ??
              dispatch($(ActionTypes.groups.create, {
                group: group.set('id', id),
              }));
              idCallback && idCallback(id);
            },
          );
        },

      createAs:
      (
        categoryId: ID,
        name: string,
        db: BackendInstance,
        onCreate?: (groupId) => void,
      ) => (dispatch) =>
        {
          const category = LibraryStore.getState().categories.get(categoryId);
          const group = LibraryTypes._Group()
            .set('name', name)
            .set('db', db)
            .set('language', category.defaultLanguage);
          dispatch(Actions.groups.create(categoryId, group, onCreate));
        },

      change:
      (group: Group) =>
        $(ActionTypes.groups.change, { group }),

      move:
      (group: Group, index: number, categoryId: ID) =>
        $(ActionTypes.groups.move, { categoryId, index, group }),

      duplicate:
      (group: Group, index: number, name: string, db: BackendInstance, categoryId?: ID) => (dispatch) =>
      {
        const { variantsOrder } = group;

        categoryId = categoryId || group.categoryId;
        group = group
          .set('parent', categoryId)
          .set('categoryId', categoryId)
          .set('id', -1)
          .set('name', name)
          .set('db', db)
          .set('variantsOrder', Immutable.List([]));

        dispatch(Actions.groups.create(
          group.categoryId,
          group,
          (groupId: ID) =>
          {
            const variants = LibraryStore.getState().variants;
            variantsOrder.map(
              (variantId, index) =>
              {
                const variant = variants.get(variantId);
                setTimeout(() => dispatch(Actions.variants.duplicate(variant, index, null, categoryId, groupId, db)), index * 200);
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
        categoryId: ID,
        groupId: ID,
        variant = LibraryTypes._Variant(),
        responseHandler?: (response, variant) => any,
      ) => (dispatch) =>
        {
          const group = LibraryStore.getState().groups.get(groupId);
          variant = variant
            .set('parent', groupId)
            .set('groupId', groupId)
            .set('categoryId', categoryId)
            .set('db', group && group.db)
            .set('language', group && group.language);

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
      (variant: Variant, index: number, categoryId: ID, groupId: ID) => (dispatch) =>
      {
        const group = LibraryStore.getState().groups.get(groupId);
        variant = variant.set('db', group.db).set('language', group.language);
        return dispatch($(ActionTypes.variants.move, { variant, index, categoryId, groupId }));
      },

      duplicate:
      (variant: Variant, index: number, name?: string, categoryId?: ID, groupId?: ID, db?: BackendInstance) => (dispatch) =>
      {
        categoryId = categoryId || variant.categoryId;
        groupId = groupId || variant.groupId;
        const group = LibraryStore.getState().groups.get(groupId);
        db = db || group.db;
        name = name || Util.duplicateNameFor(variant.name);
        let newVariant = variant
          .set('id', -1)
          .set('parent', groupId)
          .set('groupId', groupId)
          .set('categoryId', categoryId)
          .set('name', name)
          .set('status', ItemStatus.Build)
          .set('db', db)
          .set('language', group.language);
        newVariant = LibraryTypes.touchVariant(newVariant);

        dispatch(Actions.variants.create(categoryId, groupId, newVariant));
      },

      duplicateAs:
      (variant: Variant, index: number, variantName?: string, responseHandler?: (response, variant) => any) =>
        (dispatch) =>
        {
          variantName = variantName || Util.duplicateNameFor(variant.name);
          let newVariant = variant
            .set('id', -1)
            .set('parent', variant.groupId)
            .set('groupId', variant.groupId)
            .set('categoryId', variant.categoryId)
            .set('name', variantName)
            .set('status', ItemStatus.Build);
          newVariant = LibraryTypes.touchVariant(newVariant);

          dispatch(Actions.variants.create(variant.categoryId, variant.groupId, newVariant, responseHandler));
        },

      deploy:
      (variant: Variant, op: string, templateBody: object, toStatus: ItemStatus, deployedName: string) => (dispatch) =>
      {
        if (variant.deployedName !== deployedName)
        {
          variant = variant.set('deployedName', deployedName);
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
        Ajax.getItems((categories, groups, variants, categoriesOrder) =>
        {
          dispatch(Actions.loadState(_LibraryState({
            categories,
            groups,
            variants,
            categoriesOrder,
            loading: false,
          })));
        });
      };
    },
  };

export default Actions;
