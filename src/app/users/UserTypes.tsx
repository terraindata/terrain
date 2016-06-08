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

import RoleTypes from './../roles/RoleTypes.tsx';
import * as Immutable from 'immutable';

export module UserTypes
{
  let _User = Immutable.Record({
    // db-level fields
    username: "",
    isAdmin: false,
    isDisabled: false,
    
    // metadata fields
    firstName: "",
    lastName: "",
    whatIDo: "",
    email: "",
    skype: "",
    timezone: "",
    phone: "",
    imgSrc: "",
    
    // exlcude the db-level fields from the meta-data save
    excludeFields: ["isAdmin", "username", "disabled"],
    
    // groupRoles: Immutable.Map({}),
  });
  export class User extends _User
  {
    username: string;
    
    // data fields
    firstName: string;
    lastName: string;
    whatIDo: string;
    email: string;
    skype: string;
    timezone: string;
    phone: string;
    imgSrc: string;
    
    isAdmin: boolean;
    isDisabled: boolean;
    
    excludeFields: string[];
    
    name(): string
    {
      return `${this.firstName} ${this.lastName}`;
    }
    
    // groupRoles: {[groupId: string]: RoleTypes.GroupUserRole;}
  }
  
  export type UserMap = Immutable.Map<ID, UserTypes.User>;
  
  let _UserState = Immutable.Record({
    loading: true,
    users: Immutable.Map<ID, User>({}),
    currentUser: null,
  })
  export class UserState extends _UserState {
    loading: boolean;
    users: UserMap;
    currentUser: User;
  }
}

export default UserTypes;