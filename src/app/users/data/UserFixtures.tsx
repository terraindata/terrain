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

import RoleTypes from './../../roles/RoleTypes';
import UserTypes from './../UserTypes';

export const patty = new UserTypes.User({
  id: 'patty',
  name: 'Patty Hewes',
  imgUrl: 'http://lukeknepper.com/uploads/u0.jpg',
  // groupRoles: [],
});

export const ellen = new UserTypes.User({
  id: 'ellen',
  name: 'Ellen Parsons',
  imgUrl: 'http://lukeknepper.com/uploads/u1.jpg',
  username: 'ellen',
  timezone: 'Eastern / New York',
  email: 'ellen@hewes.com',
  skype: 'ellenparsons',
  phone: '(555) 867-5309',
  // groupRoles: [],
});

export const U2 = new UserTypes.User({
  id: 'U2',
  name: 'Paul Hewson',
  imgUrl: 'http://lukeknepper.com/uploads/U2.jpg',
  // groupRoles: [],
});

export const u3 = new UserTypes.User({
  id: 'u3',
  name: 'Wes Krulik',
  imgUrl: 'http://lukeknepper.com/uploads/u3.jpg',
  // groupRoles: [],
});

export const u4 = new UserTypes.User({
  id: 'u4',
  name: 'Tom Shayes',
  imgUrl: 'http://lukeknepper.com/uploads/u4.jpg',
  // groupRoles: [],
});

export const u5 = new UserTypes.User({
  id: 'u5',
  name: 'Arthur Frobisher',
  imgUrl: 'http://lukeknepper.com/uploads/u5.jpg',
  // groupRoles: [],
});

export const u6 = new UserTypes.User({
  id: 'u6',
  name: 'ASDFKLJ WEIOXOQ',
  imgUrl: 'http://lukeknepper.com/uploads/u6.jpg',
  // groupRoles: [],
});

export const u7 = new UserTypes.User({
  id: 'u7',
  name: 'PPRO ,TRKGP',
  imgUrl: 'http://lukeknepper.com/uploads/u7.jpg',
  // groupRoles: [],
});

export const u8 = new UserTypes.User({
  id: 'u8',
  name: 'Ray Fiske',
  imgUrl: 'http://lukeknepper.com/uploads/u8.jpg',
  // groupRoles: [],
});

export const u9 = new UserTypes.User({
  id: 'u9',
  name: 'David Connor',
  imgUrl: 'http://lukeknepper.com/uploads/u9.jpg',
  // groupRoles: [],
});
