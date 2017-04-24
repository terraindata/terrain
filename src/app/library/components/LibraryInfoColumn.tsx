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

require('./LibraryInfoColumn.less');
import * as React from 'react';
import * as Immutable from 'immutable';
const {List} = Immutable;
import Ajax from './../../util/Ajax';
import Classs from './../../common/components/Classs';
import LibraryColumn from './LibraryColumn';
import LibraryItem from './LibraryItem';
import LibraryItemCategory from './LibraryItemCategory';
import CreateItem from '../../common/components/CreateItem';
import UserTypes from './../../users/UserTypes';
import RoleTypes from './../../roles/RoleTypes';
import LibraryTypes from './../LibraryTypes';
import ColorManager from './../../util/ColorManager';
import InfoArea from './../../common/components/InfoArea';
import Menu from './../../common/components/Menu';
import Actions from './../data/LibraryActions';
import UserThumbnail from './../../users/components/UserThumbnail';
import BuilderStore from './../../builder/data/BuilderStore';
import UserStore from './../../users/data/UserStore';
import RolesStore from './../../roles/data/RolesStore';
import UserActions from './../../users/data/UserActions';
import RolesActions from './../../roles/data/RolesActions';
import LibraryVariantInfo from './LibraryVariantInfo';
import LibraryActions from './../data/LibraryActions';
import LibraryStore from './../data/LibraryStore';
import Util from './../../util/Util';
import Dropdown from './../../common/components/Dropdown';

var GroupIcon = require('./../../../images/icon_badgeGroup.svg');
var AlgorithmIcon = require('./../../../images/icon_badgeAlgorithm.svg');
var VariantIcon = require('./../../../images/icon_badgeVariant.svg');

type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;
type Variant = LibraryTypes.Variant;

type Role = RoleTypes.Role;
type RoleMap = RoleTypes.RoleMap;
type GroupRoleMap = RoleTypes.GroupRoleMap;
type User = UserTypes.User;
type UserMap = UserTypes.UserMap;

interface Props
{
  group: Group;
  algorithm: Algorithm;
  variant: Variant;
}

class LibraryInfoColumn extends Classs<Props>
{
  state: {
    users: UserMap,
    roles: RoleMap,
    me: User,
    dbs: List<string>,
  } = {
    users: null,
    roles: null,
    me: null,
    dbs: List([]),
  };

  constructor(props:Props)
  {
    super(props);

    this._subscribe(UserStore, {
      stateKey: 'users',
      storeKeyPath: ['users'],
    });
    this._subscribe(UserStore, {
      stateKey: 'me',
      storeKeyPath: ['currentUser'],
    });
    this._subscribe(RolesStore, {
      stateKey: 'roles',
    });

    this._subscribe(LibraryStore, {
      stateKey: 'dbs',
      storeKeyPath: ['dbs'],
    });

    Ajax.getDbs((dbs:string[]) =>
    {
      LibraryActions.setDbs(
        List(dbs)
      );
    });
  }

  renderVariant(isAdmin, isBuilder)
  {
    return (
      <LibraryVariantInfo
        variant={this.props.variant}
        isAdmin={isAdmin}
        isBuilder={isBuilder}
        dbs={this.state.dbs}
      />
    );
  }

  handleAlgorithmDbChange(dbIndex:number)
  {
    Actions.algorithms.change(this.props.algorithm.set('db', this.state.dbs.get(dbIndex)) as Algorithm);
  }


  renderAlgorithm(isAdmin, isBuilder)
  {
    if(! this.props.algorithm || this.props.variant)
    {
      return null;
    }

    return (
      <div>
        <div className='library-info-line'>
          <div>
          Default Database
          </div>
          <Dropdown
            selectedIndex={this.state.dbs && this.state.dbs.indexOf(this.props.algorithm.db)}
            options={this.state.dbs}
            onChange={this.handleAlgorithmDbChange}
            canEdit={isBuilder || isAdmin}
            className='bic-db-dropdown'
          />
        </div>
      </div>
    );
  }

  renderUser(user: User): JSX.Element
  {
    let {roles} = this.state;
    let groupRoles = roles && roles.get(this.props.group.id);
    if(!user || user.isDisabled)
    {
      return null;
    }
    return <LibraryInfoUser
      user={user}
      groupRoles={groupRoles}
      me={this.state.me}
      groupId={this.props.group.id}
      key={user.username}
    />;
  }

  renderGroupRoles(): JSX.Element | JSX.Element[]
  {
    let { me, users, roles } = this.state;
    let groupRoles = roles && roles.get(this.props.group.id);
    if(!me || !groupRoles || !users)
    {
      return null;
    }

    return groupRoles.toArray().map((role: Role) =>
      {
        if(role.username === me.username)
        {
          return null; // current user is always rendered at top
        }
        return this.renderUser(users.get(role.username));
      });
  }

  renderRemainingUsers()
  {
    let { me, roles, users } = this.state;
    let groupRoles = roles && roles.get(this.props.group.id);
    if(!me || !users)
    {
      return null;
    }

    return users.toArray().map((user: User) =>
      {
        if(user.username === me.username || (groupRoles && groupRoles.get(user.username)))
        {
          return null; // current user and existing roles are rendered at top
        }
        return this.renderUser(user);
      });
  }

  handleGroupDbChange(dbIndex:number)
  {
    Actions.groups.change(this.props.group.set('db', this.state.dbs.get(dbIndex)) as Group);
  }

  renderGroup(isAdmin, isBuilder)
  {
    let { group } = this.props;
    if(!group || this.props.algorithm || this.props.variant)
    {
      return null;
    }

    // let users: UserTypes.UserMap = UserStore.getState().get('users');
    // let me: UserTypes.User = UserStore.getState().get('currentUser');
    // let groupRoles: GroupRoleMap = RolesStore.getState().getIn(['roles', group.id]);

    let isSysAdmin = this.state.me && this.state.me.isAdmin;

    return (
      <div>
        <div className='library-info-line'>
          <div>
            Default Database
          </div>
          <Dropdown
            selectedIndex={this.state.dbs && this.state.dbs.indexOf(this.props.group.db)}
            options={this.state.dbs}
            onChange={this.handleGroupDbChange}
            canEdit={isBuilder || isAdmin}
            className='bic-db-dropdown'
          />
        </div>
        <div className='library-info-users'>
          { this.renderUser(this.state.me) }
          { this.renderGroupRoles() }
          { this.renderRemainingUsers() }
        </div>
      </div>
    );
  }

  render()
  {
    let item: LibraryTypes.Variant | LibraryTypes.Algorithm | LibraryTypes.Group =
      this.props.variant || this.props.algorithm || this.props.group;

    switch(item && item.type)
    {
      case 'group':
        var groupId: any = item.id;
        var opacity = 1;
        var icon = <GroupIcon />;
        break;
      case 'algorithm':
        var groupId: any = item['groupId'];
        var opacity = 0.75;
        var icon = <AlgorithmIcon />;
        break;
      case 'variant':
        var groupId: any = item['groupId'];
        var opacity = 0.5;
        var icon = <VariantIcon />;
        break;
    }

    let isAdmin = Util.haveRole(groupId, 'admin', UserStore, RolesStore);
    let isBuilder = Util.haveRole(groupId, 'builder', UserStore, RolesStore);

    return (
      <LibraryColumn
        index={4}
        title={null}
      >
        {
          item ?
            <div className='library-info'>
              <div
                className='library-info-image'
              >
                <style
                  dangerouslySetInnerHTML={{ __html: '.library-info-image #Color { \
                    fill: ' + ColorManager.colorForKey(groupId) + ' !important; \
                  }'}}
                />
                {
                  icon
                }
              </div>
              <div className='library-info-name'>
                {
                  item.name
                }
              </div>
              <div className='library-info-type'>
                {
                  item.type
                }
              </div>
              {
                this.renderVariant(isAdmin, isBuilder)
              }
              {
                this.renderAlgorithm(isAdmin, isBuilder)
              }
              {
                this.renderGroup(isAdmin, isBuilder)
              }
            </div>
          :
            <div className='library-info'>
              <InfoArea
                large='Select a Group'
              />
            </div>

        }
      </LibraryColumn>
    );
  }
}


interface LibraryInfoUserProps
{
  me: User;
  user: User;
  groupRoles: GroupRoleMap;
  groupId: ID;
}

class LibraryInfoUser extends Classs<LibraryInfoUserProps>
{
  changeRole(newRole:string)
  {
    let { user, groupRoles } = this.props;
    var role = groupRoles && groupRoles.get(user.username);
    if(!role)
    {
      role = new RoleTypes.Role({ groupId: this.props.groupId, username: user.username });
    }

    RolesActions.change(
      role.set('builder', newRole === 'Builder').set('admin', newRole === 'Admin') as RoleTypes.Role
    );
  }

  changeToAdmin()
  {
    this.changeRole('Admin');
  }

  changeToBuilder()
  {
    this.changeRole('Builder');
  }

  changeToViewer()
  {
    this.changeRole('Viewer');
  }

  render()
  {
    let { me, user, groupRoles } = this.props;
    if(!user)
    {
      return null;
    }

    let gr = groupRoles && groupRoles.get(user.username);
    let isAdmin = gr && gr.admin;
    let isBuilder = gr && gr.builder && !isAdmin;
    let isViewer = !isAdmin && !isBuilder;
    let roleText = isAdmin ? 'Admin' : (isBuilder ? 'Builder' : 'Viewer');

    let imSysAdmin = me.isAdmin;
    let imGroupAdmin = groupRoles && groupRoles.get(me.username) && groupRoles.get(me.username).admin;
    // TODO
    let menuOptions =
    Immutable.List([
      {
        text: 'Viewer',
        onClick: this.changeToViewer,
        disabled: isViewer
      },
      {
        text: 'Builder',
        onClick: this.changeToBuilder,
        disabled: isBuilder
      },
      {
        text: 'Admin',
        onClick: this.changeToAdmin,
        disabled: isAdmin
      }
    ]);

    return (
      <div key={user.username} className='library-info-user'>
        <UserThumbnail
          username={user.username}
          showName={true}
          link={true}
        />
        <div className='library-info-user-roles'>
          {
            roleText
          }
        </div>
        { (imGroupAdmin || imSysAdmin) ? <Menu options={menuOptions} small={true} /> : null }
      </div>
    );
  }
}

export default LibraryInfoColumn;
