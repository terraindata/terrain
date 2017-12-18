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

import { List } from 'immutable';
import * as React from 'react';

import BackendInstance from '../../../database/types/BackendInstance';
import { backgroundColor, Colors } from '../../colors/Colors';
import Dropdown from './../../common/components/Dropdown';
import InfoArea from './../../common/components/InfoArea';
import TerrainComponent from './../../common/components/TerrainComponent';
import RolesStore from './../../roles/data/RolesStore';
import * as RoleTypes from './../../roles/RoleTypes';
import * as UserTypes from './../../users/UserTypes';
import Ajax from './../../util/Ajax';
import ColorManager from './../../util/ColorManager';
import Util from './../../util/Util';
import * as LibraryTypes from './../LibraryTypes';
import LibraryAlgorithmInfo from './LibraryAlgorithmInfo';
import LibraryColumn from './LibraryColumn';
import './LibraryInfoColumn.less';
import LibraryInfoUser from './LibraryInfoUser';

const GroupIcon = require('./../../../images/icon_badgeAlgorithm.svg');
const CategoryIcon = require('./../../../images/icon_badgeGroup.svg');
const AlgorithmIcon = require('./../../../images/icon_badgeAlgorithm.svg');

type Category = LibraryTypes.Category;
type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;

type Role = RoleTypes.Role;
type RoleMap = RoleTypes.RoleMap;
type User = UserTypes.User;
type UserMap = UserTypes.UserMap;

export interface Props
{
  dbs: List<BackendInstance>;
  category: Category;
  group: Group;
  algorithm: Algorithm;
  categoryActions: any;
  groupActions: any;
  algorithmActions: any;
  libraryActions: any;
  roleActions: any;
  users?: UserTypes.UserState;
}

export interface State
{
  roles: RoleMap,
}

class LibraryInfoColumn extends TerrainComponent<Props>
{
  public state: State = {
    roles: null,
  };

  constructor(props: Props)
  {
    super(props);

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

  public renderAlgorithm(isSuperUser, isBuilder)
  {
    return (
      <LibraryAlgorithmInfo
        algorithm={this.props.algorithm}
        isSuperUser={isSuperUser}
        isBuilder={isBuilder}
        algorithmActions={this.props.algorithmActions}
      />
    );
  }

  public handleGroupDbChange(dbIndex: number)
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    this.props.groupActions.change(this.props.group.set('db', dbs.get(dbIndex)) as Group);
  }

  public renderGroup(isSuperUser, isBuilder)
  {
    if (!this.props.group || this.props.algorithm)
    {
      return null;
    }
    const db = this.props.group.db;
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
    const { users } = this.props;
    const { roles } = this.state;
    const categoryRoles = roles && roles.get(this.props.category.id);
    if (!user || user.isDisabled)
    {
      return null;
    }
    return <LibraryInfoUser
      user={user}
      categoryRoles={categoryRoles}
      me={users.currentUser}
      categoryId={this.props.category.id}
      key={user.id}
      roleActions={this.props.roleActions}
    />;
  }

  public renderCategoryRoles(): JSX.Element | JSX.Element[]
  {
    const { users } = this.props;
    const { roles } = this.state;
    const { currentUser: me } = users;

    const categoryRoles = roles && roles.get(this.props.category.id);
    if (!me || !categoryRoles || !users)
    {
      return null;
    }

    return categoryRoles.toArray().map((role: Role) =>
    {
      if (role.userId === me.id)
      {
        return null; // current user is always rendered at top
      }
      return this.renderUser(users.users.get(role.userId));
    });
  }

  public renderRemainingUsers()
  {
    const { users } = this.props;
    const { roles } = this.state;
    const { currentUser: me } = users;
    const categoryRoles = roles && roles.get(this.props.category.id);
    if (!me || !users)
    {
      return null;
    }

    return users.users.toArray().map((user: User) =>
    {
      if (user.id === me.id || (categoryRoles && categoryRoles.get(user.id)))
      {
        return null; // current user and existing roles are rendered at top
      }
      return this.renderUser(user);
    });
  }

  public handleCategoryDbChange(dbIndex: number)
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    this.props.categoryActions.change(this.props.category.set('db', dbs.get(dbIndex)) as Category);
  }

  public renderCategory(isSuperUser, isBuilder)
  {
    const { category, users } = this.props;
    if (!category || this.props.group || this.props.algorithm)
    {
      return null;
    }

    // let users: UserTypes.UserMap = UserStore.getState().get('users');
    // let me: UserTypes.User = UserStore.getState().get('currentUser');
    // let categoryRoles: CategoryRoleMap = RolesStore.getState().getIn(['roles', category.id]);
    const { currentUser: me } = users;
    const isSysAdmin = me && me.isSuperUser;
    const dbs = this.getSortedDatabases(this.props.dbs);
    return (
      <div>
        <div className='library-info-line'>
          <div>
            Default Database
          </div>
          <Dropdown
            selectedIndex={dbs && dbs.findIndex(
              (db) => db.id === this.props.category.db.id,
            )}
            options={dbs.map((db) => String(db.name) + ` (${db.type})`).toList()}
            onChange={this.handleCategoryDbChange}
            canEdit={isBuilder || isSuperUser}
            className='bic-db-dropdown'
          />
        </div>
      </div>
    );
  }

  // Category permissions (hidden until reconnected)
  // <div className='library-info-users'>
  //   {this.renderUser(this.state.me)}
  //   {this.renderCategoryRoles()}
  //   {this.renderRemainingUsers()}
  // </div>

  public render()
  {
    const { users } = this.props;
    const item: LibraryTypes.Algorithm | LibraryTypes.Group | LibraryTypes.Category =
      this.props.algorithm || this.props.group || this.props.category;

    let categoryId: ID;
    let opacity: number;
    let icon: any;

    switch (item && item.type)
    {
      case 'CATEGORY':
        categoryId = item.id;
        opacity = 1;
        icon = <CategoryIcon />;
        break;
      case 'GROUP':
        categoryId = item['categoryId'];
        opacity = 0.75;
        icon = <GroupIcon />;
        break;
      case 'ALGORITHM':
        categoryId = item['categoryId'];
        opacity = 0.5;
        icon = <AlgorithmIcon />;
        break;
      default:
        break;
    }

    const isSuperUser = Util.haveRole(categoryId, 'admin', users, RolesStore);
    const isBuilder = Util.haveRole(categoryId, 'builder', users, RolesStore);

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
                    fill: ' + ColorManager.colorForKey(categoryId) + ' !important; \
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
                this.renderAlgorithm(isSuperUser, isBuilder)
              }
              {
                this.renderGroup(isSuperUser, isBuilder)
              }
              {
                this.renderCategory(isSuperUser, isBuilder)
              }
            </div>
            :
            <div
              className='library-info'
              style={backgroundColor(Colors().bg3)}
            >
              <InfoArea
                large='Select a Category'
              />
            </div>

        }
      </LibraryColumn>
    );
  }
}

export default Util.createContainer(
  LibraryInfoColumn,
  ['users'],
  {}
);
