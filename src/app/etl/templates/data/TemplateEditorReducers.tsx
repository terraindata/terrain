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
import * as _ from 'lodash';
import Ajax from 'util/Ajax';

import { _TemplateEditorState, TemplateEditorState } from 'etl/templates/TemplateTypes';
import * as TemplateTypes from 'etl/templates/TemplateTypes';
const { List, Map } = Immutable;

// inside some common file

// The type that defines all the possible action payloads
// Also asserts that the key is the same as the actionType
type AllActionsType<SelfT> =
{
  [key in keyof SelfT]: {actionType: key, [other: string]: any}
}

// Unrolls AllActionsT into a union of its members
type Unroll<AllActionsT extends AllActionsType<AllActionsT>> = AllActionsT[keyof AllActionsT]

// The type returned by an action whose payload is ActionT
interface WrappedPayload<ActionT>
{
  type: string;
  payload: ActionT;
}

// The type of 'action' that a reducer operates on. This is actually the same type as WrappedPayload
interface ReducerPayload<Key extends keyof AllActionsT, AllActionsT>
{
  type: Key;
  payload: AllActionsT[Key];
}

// union of all possible actionTypes strings
type ActionTypeUnion<AllActionsT extends AllActionsType<AllActionsT>> = Unroll<AllActionsT>['actionType'];

// dictionary that must map all actionTypes and only actionTypes
// reducers must follow this pattern
type ConstrainedMap<AllActionsT extends AllActionsType<AllActionsT>, S> =
{
  [key in ActionTypeUnion<AllActionsT>]: (state, action: ReducerPayload<key, AllActionsT>) => S;
}

abstract class ActionReducer<AllActionsT extends AllActionsType<AllActionsT>, StateType>
{
  public abstract reducers: ConstrainedMap<AllActionsT, StateType>;

  public act(action: Unroll<AllActionsT>): WrappedPayload<Unroll<AllActionsT>>
  {
    return {
      type: (action as any).actionType,
      payload: action,
    }
  }

  public actionsForExport(): (action: Unroll<AllActionsT>) => any
  {
    return this.act;
  }

  public reducersForExport(_stateCreator): (state, action) => StateType
  {
    return (state: StateType = _stateCreator(), action) =>
    {
      let nextState = state;
      if (this.reducers[action.type])
      {
        nextState = this.reducers[action.type](state, action);
      }
      return nextState;
    }
  }
}

interface ActionParamTypes extends AllActionsType<ActionParamTypes>
{
  setPreviewData: {
    actionType: 'setPreviewData';
    preview: any;
    originalNames: any;
  },
  placeholder: {
    actionType: 'placeholder';
    foo: any;
  }
}

class TemplateEditorActionsClass extends ActionReducer<ActionParamTypes, TemplateEditorState>
{
  public reducers: ConstrainedMap<ActionParamTypes, TemplateEditorState> =
  {
    setPreviewData: (state, action) => {
      console.log('you called setPreviewData');
      return state;
    },
    placeholder: (state, action) => {
      console.log('you called placeholder');
      return state;
    },
  }
}

const ActionReducerInstance = new TemplateEditorActionsClass();
export const TemplateEditorActions = ActionReducerInstance.actionsForExport();
export const TemplateEditorReducers = ActionReducerInstance.reducersForExport(_TemplateEditorState);
