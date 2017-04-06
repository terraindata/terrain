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

// https://github.com/ortoo/oauth2orize/blob/master/examples/express2/db/users.js
// TODO THIS IS A STUB. REPLACE WITH ORM

import * as bcrypt from 'bcrypt-nodejs';

import srs = require('secure-random-string');

const users = [
  {
    accessToken: '',
    id: '1',
    name: 'Bob Smith',
    password: bcrypt.hashSync('secret'),
    username: 'bob',
  },
  {
    accessToken: '',
    id: '2',
    name: 'Joe Davis',
    password: bcrypt.hashSync('password'),
    username: 'joe',
  },
  {
    accessToken: '',
    id: '3',
    name: 'Linux User',
    password: bcrypt.hashSync('secret'),
    username: 'luser',
  },
];

const Users =
{
  find: (id) =>
  {
    for (let i = 0, len = users.length; i < len; i++)
    {
      const user = users[i];
      if (user.id === id)
      {
        return user;
      }
    }
    return null;
  },
  findByAccessToken: (username, accessToken) =>
  {
    for (let i = 0, len = users.length; i < len; i++)
    {
      const user = users[i];
      if (user.username === username && user.accessToken.length > 0 && user.accessToken === accessToken)
      {
        return user;
      }
    }
    return null;
  },
  findByUsername: (username, password) =>
  {
    for (let i = 0, len = users.length; i < len; i++)
    {
      const user = users[i];
      if (user.username === username)
      {
        return new Promise((resolve, reject) => {
          bcrypt.compare(password, user.password, (err, res) =>
          {
            if (res)
            {
              if (user.accessToken.length === 0)
              {
                user.accessToken = srs(
                  {
                    length: 256,
                  });
              }
              resolve(user);
            } else {
              resolve(null);
            }
          });
        });
      }
    }
  },
};

export default Users;
