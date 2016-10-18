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


/// <reference path="./react/react.d.ts" />
/// <reference path="../../node_modules/immutable/dist/Immutable.d.ts" />

/// <reference path="redux-actions/redux-actions.d.ts" />
/// <reference path="react/react-dom.d.ts" />

import React = __React;

interface Array<T> {
  find(predicate: (search: T) => boolean) : T;
  findIndex(predicate: (search: T) => boolean) : number;
}

declare type List<T> = Immutable.List<T>;
declare type Map<K, T> = Immutable.Map<K, T>;
declare type KeyPath = List<string | number>;
declare type Set<T> = (f: string, v: any) => T;
declare type SetIn<T> = (f: (string | number)[] | KeyPath, v: any) => T
declare type Get = (f: string | number) => any;
declare type GetIn = (f: (string | number)[] | KeyPath) => any;
declare type Delete<T> = (f: string) => T;
declare type DeleteIn<T> = (f: (string | number)[] | KeyPath) => T;
declare type Update<T> = (f: string, updater: (n: any) => any) => T;
declare type UpdateIn<T> = (f: (string | number)[] | KeyPath, updater: (n: any) => any) => T;

declare interface IStore<T>
{
  getState: () => T;
  subscribe: (updater: (() => void)) => (() => void);
  dispatch: (action: { type: string, payload: {[k:string]: any} }) => void;
}

declare interface IMap<T>
{
  set: Set<T>;
  setIn: SetIn<T>;
  get: Get;
  getIn: GetIn;
  delete: Delete<T>;
  deleteIn: DeleteIn<T>;
  remove: Delete<T>;
  removeIn: DeleteIn<T>;
  update: Update<T>;
  updateIn: UpdateIn<T>;
  toMap: () => Map<string, any>;
}

declare interface IRecord<T> extends IMap<T>
{
  id: string;
  type: string;
}

declare type El = JSX.Element;
declare type Ref = React.Component<any, any> | Element;

declare type MEvent = React.MouseEvent;

declare type ID = string;
declare interface IId
{
  id: ID;
}
declare interface IName
{
  name: string;
}

// SERVER_URL is a "compile time" substition done by Webpack.
declare var SERVER_URL: string;

declare const escape: (s:string) => string;
declare const unescape: (s:string) => string;

// DEV is a "compile time" substition done by Webpack.
declare var DEV: boolean;
