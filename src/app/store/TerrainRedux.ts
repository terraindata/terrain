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

/*
 * A brief how-to:
 * Child classes that extend TerrainRedux contain the logic and typings for Actions, Reducers, and ActionTypes
 * Child classes that extend TerrainRedux need to provide a 'manifest' type as a generic
 * The manifest is an interface with the following properties:
 * Every key of the interface is the name of each action / reducer (actions and reducers have identical names)
 * Every value of the interface is a named map that acts as the type definition for action payloads.
 * In each action payload the key 'actionType' is required and must be the same  as the key name.
 * e.g.
 * interface ActionsManifest
 * {
 *   action1: {
 *     actionType: 'action1';
 *     someParameter: string;
 *     otherParameter?: any;
 *   };
 *   action2: {
 *     actionType: 'action2';
 *     foo: number;
 *   }
 * }
 *
 * the reducers property must be defined in the child class definition and it must be a map
 * that has all the actionTypes of the manifest type. Each value is a function whose type signature are
 * just like a normal redux reducer.
 *
 * Actions and reducers are exported by first creating an instance of the child class.
 * The inherited methods _actionsForExport and _reducersForExport are then invoked and exported
 */

// The type that defines all the possible action payloads
// Also asserts that the key is the same as the actionType
export type AllActionsType<SelfT> =
{
  [key in keyof SelfT]: {actionType: key, [other: string]: any}
};

// Unrolls AllActionsT into a union of its members
export type Unroll<AllActionsT extends AllActionsType<AllActionsT>> = AllActionsT[keyof AllActionsT];

// The type returned by an action whose payload is ActionT
export interface WrappedPayload<AllActionsT extends AllActionsType<AllActionsT>>
{
  type: keyof AllActionsT;
  payload: Unroll<AllActionsT>;
}

export type ActPayload<AllActionsT extends AllActionsType<AllActionsT>> =
  WrappedPayload<AllActionsT> | ((dispatch: (payload: WrappedPayload<AllActionsT>) => any) => any);

// The type of 'action' that a reducer operates on. This is actually the same type as WrappedPayload
export interface ReducerPayload<Key extends keyof AllActionsT, AllActionsT>
{
  type: Key;
  payload: AllActionsT[Key];
}

// dictionary that must map all actionTypes and only actionTypes
// reducers must adhere to this map
export type ConstrainedMap<AllActionsT extends AllActionsType<AllActionsT>, S> =
{
  [key in keyof AllActionsT]: (state: S, action: ReducerPayload<key, AllActionsT>) => S;
};

export abstract class TerrainRedux<AllActionsT extends AllActionsType<AllActionsT>, StateType>
{
  public abstract reducers: ConstrainedMap<AllActionsT, StateType>;

  // child class should override this for special actions
  public overrideAct(action: Unroll<AllActionsT>): ActPayload<AllActionsT>
  {
    return undefined;
  }

  public _dispatchReducerFactory(dispatch: (payload: WrappedPayload<AllActionsT>) => any):
    (action: Unroll<AllActionsT>) => any
  {
    return (action: Unroll<AllActionsT>) => {
      const payload = {
        type: (action as any).actionType,
        payload: action,
      }
      dispatch(payload);
    }
  }

  public _act(action: Unroll<AllActionsT>): ActPayload<AllActionsT>
  {
    const override = this.overrideAct(action);
    if (override !== undefined)
    {
      return override;
    }
    return {
      type: (action as any).actionType, // Can't seem to find a way around this type assertion
      payload: action,
    };
  }

  public _actionsForExport(): (action: Unroll<AllActionsT>) => any
  {
    return this._act.bind(this);
  }

  public _reducersForExport(_stateCreator): (state, action) => StateType
  {
    return (state: StateType = _stateCreator(), action) =>
    {
      let nextState = state;
      if (this.reducers[action.type])
      {
        nextState = this.reducers[action.type](state, action);
      }
      return nextState;
    };
  }
}

// Type query utility to get the type of an action.
export type GetType<K extends keyof AllActionsT, AllActionsT extends AllActionsType<AllActionsT>> = AllActionsT[K];
