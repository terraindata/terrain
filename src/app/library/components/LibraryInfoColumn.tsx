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

// tslint:disable:no-var-requires strict-boolean-expressions restrict-plus-operands

import * as Immutable from 'immutable';
import * as React from 'react';
const { List } = Immutable;
import BackendInstance from '../../../database/types/BackendInstance';
import { backgroundColor, Colors } from '../../common/Colors';
import Dropdown from './../../common/components/Dropdown';
import InfoArea from './../../common/components/InfoArea';
import TerrainComponent from './../../common/components/TerrainComponent';
import RolesStore from './../../roles/data/RolesStore';
import * as RoleTypes from './../../roles/RoleTypes';
import UserStore from './../../users/data/UserStore';
import * as UserTypes from './../../users/UserTypes';
import Ajax from './../../util/Ajax';
import ColorManager from './../../util/ColorManager';
import Util from './../../util/Util';
import * as LibraryTypes from './../LibraryTypes';
import LibraryColumn from './LibraryColumn';
import './LibraryInfoColumn.less';
import LibraryInfoUser from './LibraryInfoUser';
import LibraryVariantInfo from './LibraryVariantInfo';

const AlgorithmIcon = require('./../../../images/icon_badgeAlgorithm.svg');
const GroupIcon = require('./../../../images/icon_badgeGroup.svg');
const VariantIcon = require('./../../../images/icon_badgeVariant.svg');

type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;
type Variant = LibraryTypes.Variant;

type Role = RoleTypes.Role;
type RoleMap = RoleTypes.RoleMap;
type User = UserTypes.User;
type UserMap = UserTypes.UserMap;

export interface Props
{
  dbs: List<BackendInstance>;
  group: Group;
  algorithm: Algorithm;
  variant: Variant;
  groupActions: any;
  algorithmActions: any;
  variantActions: any;
  libraryActions: any;
  roleActions: any;
}

class LibraryInfoColumn extends TerrainComponent<Props>
{
  public state: {
    users: UserMap,
    roles: RoleMap,
    me: User,
  } = {
    users: null,
    roles: null,
    me: null,
  };

  constructor(props: Props)
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

    Ajax.getDbs((dbs: BackendInstance[], loadFinished: boolean) =>
    {
      this.props.libraryActions.setDbs(
        List(dbs),
        loadFinished,
      );
    });
  }

  public getSortedDatabases(dbs)
  {
    return Util.sortDatabases(dbs);
  }

  public renderVariant(isSuperUser, isBuilder)
  {
    return (
      <LibraryVariantInfo
        variant={this.props.variant}
        isSuperUser={isSuperUser}
        isBuilder={isBuilder}
        variantActions={this.props.variantActions}
      />
    );
  }

  public handleAlgorithmDbChange(dbIndex: number)
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    this.props.algorithmActions.change(this.props.algorithm.set('db', dbs.get(dbIndex)) as Algorithm);
  }

  public renderAlgorithm(isSuperUser, isBuilder)
  {
    if (!this.props.algorithm || this.props.variant)
    {
      return null;
    }
    const db = this.props.algorithm.db;
    return (
      <div className='library-info-line'>
        <div className='library-info-table'>
          <div className='library-info-row'>
            <div className='library-info-row-data'>
              Database
            </div>
            <div className='library-info-row-data'>
              {db.name}
            </div>
          </div>
          <div className='library-info-row'>
            <div className='library-info-row-data'>
              Language
            </div>
            <div className='library-info-row-data'>
              {db.type}
            </div>
          </div>
        </div>
      </div>
    );
  }

  public renderUser(user: User): JSX.Element
  {
    const { roles } = this.state;
    const groupRoles = roles && roles.get(this.props.group.id);
    if (!user || user.isDisabled)
    {
      return null;
    }
    return <LibraryInfoUser
      user={user}
      groupRoles={groupRoles}
      me={this.state.me}
      groupId={this.props.group.id}
      key={user.id}
      roleActions={this.props.roleActions}
    />;
  }

  public renderGroupRoles(): JSX.Element | JSX.Element[]
  {
    const { me, users, roles } = this.state;
    const groupRoles = roles && roles.get(this.props.group.id);
    if (!me || !groupRoles || !users)
    {
      return null;
    }

    return groupRoles.toArray().map((role: Role) =>
    {
      if (role.userId === me.id)
      {
        return null; // current user is always rendered at top
      }
      return this.renderUser(users.get(role.userId));
    });
  }

  public renderRemainingUsers()
  {
    const { me, roles, users } = this.state;
    const groupRoles = roles && roles.get(this.props.group.id);
    if (!me || !users)
    {
      return null;
    }

    return users.toArray().map((user: User) =>
    {
      if (user.id === me.id || (groupRoles && groupRoles.get(user.id)))
      {
        return null; // current user and existing roles are rendered at top
      }
      return this.renderUser(user);
    });
  }

  public handleGroupDbChange(dbIndex: number)
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    this.props.groupActions.change(this.props.group.set('db', dbs.get(dbIndex)) as Group);
  }

  public renderGroup(isSuperUser, isBuilder)
  {
    const { group } = this.props;
    if (!group || this.props.algorithm || this.props.variant)
    {
      return null;
    }

    // let users: UserTypes.UserMap = UserStore.getState().get('users');
    // let me: UserTypes.User = UserStore.getState().get('currentUser');
    // let groupRoles: GroupRoleMap = RolesStore.getState().getIn(['roles', group.id]);

    const isSysAdmin = this.state.me && this.state.me.isSuperUser;
    const dbs = this.getSortedDatabases(this.props.dbs);
    return (
      <div>
        <div className='library-info-line'>
          <div>
            Default Database
          </div>
          <Dropdown
            selectedIndex={dbs && dbs.findIndex(
              (db) => db.id === this.props.group.db.id,
            )}
            options={dbs.map((db) => String(db.name) + ` (${db.type})`).toList()}
            onChange={this.handleGroupDbChange}
            canEdit={isBuilder || isSuperUser}
            className='bic-db-dropdown'
          />
        </div>
      </div>
    );
  }

  // Group permissions (hidden until reconnected)
  // <div className='library-info-users'>
  //   {this.renderUser(this.state.me)}
  //   {this.renderGroupRoles()}
  //   {this.renderRemainingUsers()}
  // </div>

  public render()
  {
    const item: LibraryTypes.Variant | LibraryTypes.Algorithm | LibraryTypes.Group =
      this.props.variant || this.props.algorithm || this.props.group;

    let groupId: ID;
    let opacity: number;
    let icon: any;

    switch (item && item.type)
    {
      case 'GROUP':
        groupId = item.id;
        opacity = 1;
        icon = <GroupIcon />;
        break;
      case 'ALGORITHM':
        groupId = item['groupId'];
        opacity = 0.75;
        icon = <AlgorithmIcon />;
        break;
      case 'VARIANT':
        groupId = item['groupId'];
        opacity = 0.5;
        icon = <VariantIcon />;
        break;
      default:
        break;
    }

    const isSuperUser = Util.haveRole(groupId, 'admin', UserStore, RolesStore);
    const isBuilder = Util.haveRole(groupId, 'builder', UserStore, RolesStore);

    return (
      <LibraryColumn
        index={4}
        title={null}
      >
        {
          item ?
            <div
              className='library-info'
              style={backgroundColor(Colors().bg3)}
            >
              <div
                className='library-info-image'
              >
                <style
                  dangerouslySetInnerHTML={{
                    __html: '.library-info-image #Color { \
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
                this.renderVariant(isSuperUser, isBuilder)
              }
              {
                this.renderAlgorithm(isSuperUser, isBuilder)
              }
              {
                this.renderGroup(isSuperUser, isBuilder)
              }
            </div>
            :
            <div
              className='library-info'
              style={backgroundColor(Colors().bg3)}
            >
              <InfoArea
                large='Select a Group'
              />
            </div>

        }
      </LibraryColumn>
    );
  }
}

export default LibraryInfoColumn;
