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

require('./BrowserInfoColumn.less');
import * as React from 'react';
import * as Immutable from 'immutable';
const {List} = Immutable;
import Ajax from './../../util/Ajax.tsx';
import Classs from './../../common/components/Classs.tsx';
import BrowserColumn from './BrowserColumn.tsx';
import BrowserItem from './BrowserItem.tsx';
import BrowserItemCategory from './BrowserItemCategory.tsx';
import CreateItem from '../../common/components/CreateItem.tsx';
import UserTypes from './../../users/UserTypes.tsx';
import RoleTypes from './../../roles/RoleTypes.tsx';
import BrowserTypes from './../BrowserTypes.tsx';
import ColorManager from './../../util/ColorManager.tsx';
import InfoArea from './../../common/components/InfoArea.tsx';
import Menu from './../../common/components/Menu.tsx';
import Actions from './../data/BrowserActions.tsx';
import UserThumbnail from './../../users/components/UserThumbnail.tsx';
import BuilderStore from './../../builder/data/BuilderStore.tsx';
import UserStore from './../../users/data/UserStore.tsx';
import RolesStore from './../../roles/data/RolesStore.tsx';
import UserActions from './../../users/data/UserActions.tsx';
import RolesActions from './../../roles/data/RolesActions.tsx';
import BrowserVariantInfo from './BrowserVariantInfo.tsx';

var GroupIcon = require('./../../../images/icon_badgeGroup.svg');
var AlgorithmIcon = require('./../../../images/icon_badgeAlgorithm.svg');
var VariantIcon = require('./../../../images/icon_badgeVariant.svg');

type Group = BrowserTypes.Group;
type Algorithm = BrowserTypes.Algorithm;
type Variant = BrowserTypes.Variant;

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
  history?: any;
}

class BrowserInfoColumn extends Classs<Props>
{
  state: {
    users: UserMap,
    roles: RoleMap,
    me: User,
  } = {
    users: null,
    roles: null,
    me: null,
  }
  
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
  }
  
  renderVariant()
  {
    return (
      <BrowserVariantInfo
        variant={this.props.variant}
        history={this.props.history}
      />
    );
  }
  
  renderAlgorithm()
  {
    if(! this.props.algorithm || this.props.variant)
    {
      return null;
    }
    
    return '';
  }
  
  renderUser(user: User): JSX.Element
  {
    let {roles} = this.state;
    let groupRoles = roles && roles.get(this.props.group.id);
    if(!user || user.isDisabled)
    {
      return null;
    }
    return <BrowserInfoUser 
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
  
  renderGroup()
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
      <div className='browser-info-users'>
        { this.renderUser(this.state.me) }
        { this.renderGroupRoles() }
        { this.renderRemainingUsers() }
      </div>
    );
  }
  
  render()
  {
    let item: BrowserTypes.Variant | BrowserTypes.Algorithm | BrowserTypes.Group = 
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
    
    
    return (
      <BrowserColumn
        index={4}
        title={null}
      >
        {
          item ?
            <div className='browser-info'>
              <div
                className='browser-info-image'
                style={{
                }}
              >
                <style
                  dangerouslySetInnerHTML={{ __html: '.browser-info-image #Color { \
                    fill: ' + ColorManager.colorForKey(groupId) + ' !important; \
                  }'}}
                />
                { icon }
              </div>
              <div className='browser-info-name'>
                { item.name }
              </div>
              <div className='browser-info-type'>
                { item.type }
              </div>
              { this.renderVariant() }
              { this.renderAlgorithm() }
              { this.renderGroup() }
            </div>
          :
            <div className='browser-info'>
              <InfoArea
                large='Select a Group'
              />
            </div>
            
        }
      </BrowserColumn>
    );
  }
}


interface BrowserInfoUserProps
{
  me: User;
  user: User;
  groupRoles: GroupRoleMap;
  groupId: ID;
}

class BrowserInfoUser extends Classs<BrowserInfoUserProps>
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
      <div key={user.username} className='browser-info-user'>
        <UserThumbnail
          username={user.username}
          showName={true}
          link={true}
        />
        <div className='browser-info-user-roles'>
          {
            roleText
          }
        </div>
        { (imGroupAdmin || imSysAdmin) ? <Menu options={menuOptions} small={true} /> : null }
      </div>
    );
  }
}

export default BrowserInfoColumn;