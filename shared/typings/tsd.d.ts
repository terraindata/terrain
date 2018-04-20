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


// used to  <reference path="./react/react.d.ts" />
/// <reference path="../../node_modules/immutable/dist/immutable.d.ts" />
/// <reference path="../../node_modules/moment/moment.d.ts" />

// used to <reference path="redux-actions/redux-actions.d.ts" />
// used to <reference path="react/react-dom.d.ts" />

// import React = __React;

interface Array<T>
{
  find(predicate: (search: T) => boolean): T;
  findIndex(predicate: (search: T) => boolean): number;
}

interface Action<T>
{
  type: string;
  payload?: T;
}

declare type List<T> = Immutable.List<T>;
declare type IMList<T, K> = Immutable.List<T>; // TODO remove second arg when highlighting is fixed
declare type IMMap<K, T> = Immutable.Map<K, T>;
declare type KeyPath = List<string | number>;
declare type SetFn<T> = (f: string, v: any) => T & IRecord<T>;
declare type SetIn<T> = (f: Array<string | number> | KeyPath, v: any) => T & IRecord<T>;
declare type Get<T> = <K extends keyof T>(f: K) => T[K];
declare type GetIn = (f: Array<string | number> | KeyPath, nsv?: any) => any;
declare type HasIn = (f: Array<string | number> | KeyPath) => boolean;
declare type Delete<T> = (f: string) => T & IRecord<T>;
declare type DeleteIn<T> = (f: Array<string | number> | KeyPath) => T & IRecord<T>;
declare type Update<T> = (f: string, updater: (n: any) => any) => T & IRecord<T>;
declare type UpdateIn<T> = (f: Array<string | number> | KeyPath, updater: (n: any) => any) => T & IRecord<T>;

declare interface IStore<T>
{
  getState: () => T;
  subscribe: (updater: (() => void)) => (() => void);
  dispatch: (action: { type: string, payload: { [k: string]: any } }) => void;
}

declare interface IMap<T>
{
  set: SetFn<T>;
  setIn: SetIn<T>;
  get: Get<T>;
  getIn: GetIn;
  hasIn: HasIn;
  delete: Delete<T>;
  deleteIn: DeleteIn<T>;
  remove: Delete<T>;
  removeIn: DeleteIn<T>;
  update: Update<T>;
  updateIn: UpdateIn<T>;
  toMap: () => Immutable.Map<string, any>;
  keys: () => Immutable.Iterator<any>;
  toJS: () => Object;
}

declare interface IRecord<T> extends IMap<T>
{
  id: ID;
}

declare type El = JSX.Element;
declare type Ref = React.Component<any, any> | Element;

declare type MEvent = React.MouseEvent<any>;

declare type ID = string | number;
declare interface IId
{
  id: ID;
}
declare interface IName
{
  name: string;
}

// these are build time substitions done by Webpack
declare const DEV: boolean;
declare const MIDWAY_HOST: string;

