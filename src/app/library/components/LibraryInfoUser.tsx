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

// tslint:disable:strict-boolean-expressions

import * as Immutable from 'immutable';
import * as React from 'react';
import Menu from './../../common/components/Menu';
import TerrainComponent from './../../common/components/TerrainComponent';
import RolesActions from './../../roles/data/RolesActions';
import * as RoleTypes from './../../roles/RoleTypes';
import UserThumbnail from './../../users/components/UserThumbnail';
import * as UserTypes from './../../users/UserTypes';
import './LibraryInfoColumn.less';

type CategoryRoleMap = RoleTypes.CategoryRoleMap;
type User = UserTypes.User;
interface LibraryInfoUserProps
{
  me: User;
  user: User;
  categoryRoles: CategoryRoleMap;
  categoryId: ID;
  roleActions: any;
}

class LibraryInfoUser extends TerrainComponent<LibraryInfoUserProps>
{
  public changeRole(newRole: string)
  {
    const { user, categoryRoles } = this.props;
    let role = categoryRoles && categoryRoles.get(user.id);
    if (!role)
    {
      role = new RoleTypes.Role({ categoryId: this.props.categoryId, userId: user.id });
    }

    this.props.roleActions.change(
      role.set('builder', newRole === 'Builder').set('admin', newRole === 'Admin') as RoleTypes.Role,
    );
  }

  public changeToAdmin()
  {
    this.changeRole('Admin');
  }

  public changeToBuilder()
  {
    this.changeRole('Builder');
  }

  public changeToViewer()
  {
    this.changeRole('Viewer');
  }

  public render()
  {
    const { me, user, categoryRoles } = this.props;
    if (!user)
    {
      return null;
    }

    // TODO re-enable roles

    // const gr = categoryRoles && categoryRoles.get(user.id);
    // const isSuperUser = gr && gr.isSuperUser;
    // const isBuilder = gr && gr.builder && !isSuperUser;
    // const isViewer = !isSuperUser && !isBuilder;
    // const roleText = isSuperUser ? 'Admin' : (isBuilder ? 'Builder' : 'Viewer');

    // const imSysAdmin = me.isSuperUser;
    // const isCategoryAdmin = categoryRoles && categoryRoles.get(me.id) && categoryRoles.get(me.id).admin;

    const isSuperUser = user.isSuperUser;
    const isBuilder = !user.isSuperUser;
    const isViewer = false;
    const roleText = user.isSuperUser ? 'Admin' : (isBuilder ? 'Builder' : 'Viewer');

    const imSysAdmin = me.isSuperUser;
    const isCategoryAdmin = me.isSuperUser;

    // TODO
    const menuOptions =
      Immutable.List([
        {
          text: 'Viewer',
          onClick: this.changeToViewer,
          disabled: isViewer,
        },
        {
          text: 'Builder',
          onClick: this.changeToBuilder,
          disabled: isBuilder,
        },
        {
          text: 'Admin',
          onClick: this.changeToAdmin,
          disabled: isSuperUser,
        },
      ]);

    return (
      <div key={user.id} className='library-info-user'>
        <UserThumbnail
          userId={user.id}
          showName={true}
          link={true}
        />
        <div className='library-info-user-roles'>
          {
            roleText
          }
        </div>
        {(isCategoryAdmin || imSysAdmin) ? <Menu options={menuOptions} small={true} /> : null}
      </div>
    );
  }
}

export default LibraryInfoUser;
