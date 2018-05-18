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

// Copyright 2018 Terrain Data, Inc.
import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import { BaseClass, New } from 'shared/util/Classes';

// This module will contain all of the different 'types' (i.e. models) relevant to auth
// This type represents the state of the AuthStore
class AuthStateC extends BaseClass
{
  public accessToken: string = '';
  public id: number = -1;
}
// These two lines are boilerplate that you can copy and paste and adapt for other Immutable-backed classes
//  This first line exports a type that you will actually use in other files.
//  It combines the class we defined above with the Immutable methods specified in IRecord (e.g. set, setIn, getIn)
export type AuthState = AuthStateC & IRecord<AuthStateC>;
//  This second line exports a function to create a new instance of the AuthState Immutable backed class
//  It's a replacement for a constructor.
//  This is necessary because simply doing `new AuthStateC` will not create an Immutable version
//   and you can't use `new` simply with Immutable Records.
export const _AuthState = (config?: { [key: string]: any }) =>
  New<AuthState>(new AuthStateC(config), config);
