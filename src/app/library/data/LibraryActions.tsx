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
import { _LibraryState, LibraryState } from '../LibraryTypes';
import ActionTypes from './LibraryActionTypes';

type Category = LibraryTypes.Category;
type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;

import Ajax from './../../util/Ajax';

const $ = (type: string, payload: any) =>
{
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
          ) => (dispatch, getState) =>
            {
              const category = getState().get('library').categories.get(categoryId);
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
          ) => (dispatch, getState) =>
            {
              const category = getState().get('library').categories.get(categoryId);
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
          (group: Group, index: number, name: string, db: BackendInstance, categoryId?: ID) =>
            (dispatch, getState) =>
            {
              const { algorithmsOrder } = group;

              categoryId = categoryId || group.categoryId;
              group = group
                .set('parent', categoryId)
                .set('categoryId', categoryId)
                .set('id', -1)
                .set('name', name)
                .set('db', db)
                .set('algorithmsOrder', Immutable.List([]));

              dispatch(Actions.groups.create(
                group.categoryId,
                group,
                (groupId: ID) =>
                {
                  const algorithms = getState().get('library').algorithms;
                  algorithmsOrder.map(
                    (algorithmId, index) =>
                    {
                      const algorithm = algorithms.get(algorithmId);
                      setTimeout(() =>
                        dispatch(
                          Actions.algorithms.duplicate(
                            algorithm,
                            index,
                            null,
                            categoryId,
                            groupId,
                            db,
                          ),
                        ),
                        index * 200,
                      );
                    },
                  );
                },
              ));
            },
      },

    algorithms:
      {
        create:
          (
            categoryId: ID,
            groupId: ID,
            algorithm = LibraryTypes._Algorithm(),
            responseHandler?: (response, algorithm) => any,
          ) => (dispatch, getState) =>
            {
              const group = getState().get('library').groups.get(groupId);
              algorithm = algorithm
                .set('parent', groupId)
                .set('groupId', groupId)
                .set('categoryId', categoryId)
                .set('db', group && group.db)
                .set('language', group && group.language);

              Ajax.saveItem(
                algorithm,
                (response) =>
                {
                  // on load
                  const id = response.id; // ??
                  dispatch($(ActionTypes.algorithms.create, {
                    algorithm: algorithm
                      .set('id', id)
                      .set('deployedName', algorithm.deployedName || 'terrain_' + String(id)),
                  }));
                  responseHandler && responseHandler(response, algorithm);
                },
              );
            },

        change:
          (algorithm: Algorithm) =>
            $(ActionTypes.algorithms.change, { algorithm }),

        move:
          (algorithm: Algorithm, index: number, categoryId: ID, groupId: ID) => (dispatch, getState) =>
          {
            const group = getState().get('library').groups.get(groupId);
            algorithm = algorithm.set('db', group.db).set('language', group.language);
            return dispatch($(ActionTypes.algorithms.move, { algorithm, index, categoryId, groupId }));
          },

        duplicate:
          (algorithm: Algorithm, index: number, name?: string, categoryId?: ID, groupId?: ID, db?: BackendInstance) =>
            (dispatch, getState) =>
            {
              categoryId = categoryId || algorithm.categoryId;
              groupId = groupId || algorithm.groupId;
              const group = getState().get('library').groups.get(groupId);
              db = db || group.db;
              name = name || Util.duplicateNameFor(algorithm.name);
              let newAlgorithm = algorithm
                .set('id', -1)
                .set('parent', groupId)
                .set('groupId', groupId)
                .set('categoryId', categoryId)
                .set('name', name)
                .set('status', algorithm.status === ItemStatus.Archive ? ItemStatus.Archive : ItemStatus.Build)
                .set('db', db)
                .set('deployedName', '')
                .set('language', group.language);
              newAlgorithm = LibraryTypes.touchAlgorithm(newAlgorithm);

              dispatch(Actions.algorithms.create(categoryId, groupId, newAlgorithm));
            },

        duplicateAs:
          (algorithm: Algorithm, algorithmName?: string, responseHandler?: (response, algorithm) => any) =>
            (dispatch) =>
            {
              algorithmName = algorithmName || Util.duplicateNameFor(algorithm.name);
              let newAlgorithm = algorithm
                .set('id', -1)
                .set('parent', algorithm.groupId)
                .set('groupId', algorithm.groupId)
                .set('categoryId', algorithm.categoryId)
                .set('name', algorithmName)
                .set('status', ItemStatus.Build);
              newAlgorithm = LibraryTypes.touchAlgorithm(newAlgorithm);

              dispatch(Actions.algorithms.create(algorithm.categoryId, algorithm.groupId, newAlgorithm, responseHandler));
            },

        deploy:
          (algorithm: Algorithm, op: string, templateBody: object, toStatus: ItemStatus, deployedName: string) => (dispatch) =>
          {
            if (algorithm.deployedName !== deployedName)
            {
              algorithm = algorithm.set('deployedName', deployedName);
              dispatch(Actions.algorithms.change(algorithm));
            }

            Ajax.deployQuery(
              op,
              templateBody,
              algorithm.db,
              (response) =>
              {
                // on load
                dispatch(Actions.algorithms.status(algorithm, toStatus, true));
              },
            );
          },

        status:
          (algorithm: Algorithm, status: ItemStatus, confirmed?: boolean) =>
            $(ActionTypes.algorithms.status, { algorithm, status, confirmed }),

        fetchVersion:
          (algorithmId: string, onNoVersion: (algorithmId: string) => void) =>
          {
            return { type: 'noop' };
            // TODO
            // Ajax.getAlgorithmVersion(algorithmId, (algorithmVersion: LibraryTypes.Algorithm) =>
            // {
            //   if (!algorithmVersion)
            //   {
            //     onNoVersion(algorithmId);
            //   }
            //   else
            //   {
            //     Actions.algorithms.loadVersion(algorithmId, algorithmVersion);
            //   }
            // });
          },

        loadVersion:
          (algorithmId: string, algorithmVersion: LibraryTypes.Algorithm) =>
            $(ActionTypes.algorithms.loadVersion, { algorithmId, algorithmVersion }),

        select:
          (algorithmId: string) =>
            $(ActionTypes.algorithms.select, { algorithmId }),

        unselect:
          (algorithmId: string) =>
            $(ActionTypes.algorithms.unselect, {}),
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
          Ajax.getItems((categories, groups, algorithms, categoriesOrder) =>
          {
            dispatch(Actions.loadState(_LibraryState({
              categories,
              groups,
              algorithms,
              categoriesOrder,
              loading: false,
            })));
          });
        };
      },
  };

export default Actions;
