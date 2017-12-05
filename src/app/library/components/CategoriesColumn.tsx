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

// tslint:disable:no-empty no-shadowed-variable strict-boolean-expressions restrict-plus-operands no-var-requires

import * as React from 'react';
import { ItemStatus } from '../../../items/types/Item';
import CreateLine from '../../common/components/CreateLine';
import RolesStore from '../../roles/data/RolesStore';
import * as RoleTypes from '../../roles/RoleTypes';
import UserStore from '../../users/data/UserStore';
import * as UserTypes from '../../users/UserTypes';
import InfoArea from './../../common/components/InfoArea';
import TerrainComponent from './../../common/components/TerrainComponent';
import UserThumbnail from './../../users/components/UserThumbnail';
import * as LibraryTypes from './../LibraryTypes';
import LibraryColumn from './LibraryColumn';
import LibraryItem from './LibraryItem';
import LibraryItemCategory from './LibraryItemCategory';

import { tooltip } from 'common/components/tooltip/Tooltips';
const CategoryIcon = require('./../../../images/icon_group_17x11.svg?name=GroupIcon');

type Category = LibraryTypes.Category;
type Variant = LibraryTypes.Variant;

export interface Props
{
  basePath: string;
  categories: Immutable.Map<ID, Category>;
  categoriesOrder: Immutable.List<ID>;
  params: any;
  isFocused: boolean; // is this the last thing focused / selected?
  categoryActions: any;
  variants: Immutable.Map<ID, Variant>;
}

class CategoriesColumn extends TerrainComponent<Props>
{
  public state: {
    rendered: boolean,
    lastMoved: any,
    me: UserTypes.User,
    roles: RoleTypes.RoleMap,
  } = {
    rendered: false,
    lastMoved: null,
    me: null,
    roles: null,
  };

  public componentDidMount()
  {
    this.setState({
      rendered: true,
    });
    this._subscribe(UserStore, {
      stateKey: 'me',
      storeKeyPath: ['currentUser'],
      isMounted: true,
    });
    this._subscribe(RolesStore, {
      stateKey: 'roles',
      isMounted: true,
    });
  }

  // handleDuplicate(id: ID)
  // {
  //   Actions.categories.duplicate(this.props.categories.find(g => g.id === id),
  //     this.props.categoriesOrder.findIndex(iid => iid === id));
  // }

  public handleArchive(id: ID)
  {
    this.props.categoryActions.change(this.props.categories.find((g) => g.id === id)
      .set('status', ItemStatus.Archive) as Category);
  }

  public handleUnarchive(id: ID)
  {
    this.props.categoryActions.change(this.props.categories.find((g) => g.id === id)
      .set('status', ItemStatus.Build) as Category);
  }

  public handleNameChange(id: ID, name: string)
  {
    this.props.categoryActions.change(
      this.props.categories.get(id)
        .set('name', name) as Category,
    );
  }

  public handleCreate()
  {
    this.props.categoryActions.create();
  }

  public handleHover(index: number, type: string, id: ID)
  {
    const itemIndex = this.props.categoriesOrder.findIndex((v) => v === id);
    if (type === 'category' && itemIndex !== index
      && this.state.lastMoved !== index + ' ' + itemIndex)
    {
      this.setState({
        lastMoved: index + ' ' + itemIndex,
      });
      const target = this.props.categories.get(this.props.categoriesOrder.get(index));
      this.props.categoryActions.move(this.props.categories.get(id).set('status', target.status) as Category, index);
    }
  }

  public handleDropped(id: ID, targetType: string, targetItem: any, shifted: boolean)
  {

  }

  public handleDragFinish()
  {

  }

  public renderCategory(id: ID, index: number)
  {
    const { basePath } = this.props;
    const category = this.props.categories.get(id);
    const { params } = this.props;
    const { me, roles } = this.state;
    const categoryRoles = roles && roles.get(id);
    const canCreate = (me && categoryRoles && categoryRoles.getIn([me.id, 'admin']));
    const canEdit = canCreate || (me && me.isSuperUser);
    const canDrag = false;

    let canRename = true;
    canRename = this.props.variants.every(
      (v: Variant) =>
      {
        if (id === v.categoryId)
        {
          return !(v.status === ItemStatus.Live || v.status === ItemStatus.Default);
        }
        return true;
      },

    );
    // onDuplicate={this.handleDuplicate}
    return (
      <LibraryItem
        index={index}
        fadeIndex={index}
        name={category.name}
        id={id}
        icon={<CategoryIcon />}
        onArchive={this.handleArchive}
        key={category.id}
        to={`/${basePath}/${category.id}`}
        onNameChange={this.handleNameChange}
        type='category'
        rendered={this.state.rendered}
        onHover={this.handleHover}
        onDropped={this.handleDropped}
        onDragFinish={this.handleDragFinish}
        item={category}
        canEdit={canEdit || canDrag}
        canDrag={canDrag}
        canArchive={(canEdit || canDrag) && category.status !== ItemStatus.Archive}
        canDuplicate={false}
        canUnarchive={category.status === ItemStatus.Archive}
        canRename={canRename}
        onUnarchive={this.handleUnarchive}
        canCreate={canCreate}
        isSelected={+category.id === +params.categoryId}
        isFocused={this.props.isFocused}
      >
        <div className='category-library-info-wrapper'>
          {
            categoryRoles && me && (categoryRoles.getIn([me.id, 'builder']) || categoryRoles.getIn([me.id, 'admin'])) &&
            <UserThumbnail
              userId={me.id}
              medium={true}
              extra={
                categoryRoles.getIn([me.id, 'admin']) ? 'Admin' :
                  (categoryRoles.getIn([me.id, 'builder']) ? 'Builder' : 'Viewer')
              }
            />
          }
          {
            categoryRoles && categoryRoles.toArray()
              .filter((role) => role.builder || role.admin)
              .map(
              (role, index) =>
                index > 8 || (me && role.userId === me.id) ? null :
                  <UserThumbnail
                    userId={role.userId}
                    key={role.userId}
                    medium={true}
                    extra={
                      categoryRoles.getIn([role.userId, 'admin']) ? 'Admin' :
                        (categoryRoles.getIn([role.userId, 'builder']) ? 'Builder' : 'Viewer')
                    }
                  />,
            )
          }
        </div>
      </LibraryItem>
    );
  }

  public handleCategoryHover(statusString: string, id: ID)
  {
    const g = this.props.categories.get(id);
    const status = ItemStatus[statusString];
    if (g.status !== status)
    {
      this.props.categoryActions.change(g.set('status', status) as Category);
    }
  }

  public renderStatusGroup(status: ItemStatus)
  {
    const ids = this.props.categoriesOrder.filter((id) => this.props.categories.get(id).status === status);
    const canCreate = this.state.me && this.state.me.isSuperUser;

    return (
      <LibraryItemCategory
        status={status}
        key={status}
        onHover={this.handleCategoryHover}
        type='category'
        titleHidden={status === ItemStatus.Build}
      >
        {
          ids.map(this.renderCategory)
        }
        {
          ids.size === 0 && <div className='library-category-none'>None</div>
        }
        {
          status === ItemStatus.Build && !!canCreate &&
          tooltip(
            <CreateLine onClick={this.handleCreate} open={false} />,
            {
              title: 'Create a New Category',
              position: 'top',
            },
          )
        }
      </LibraryItemCategory>
    );
  }

  public render()
  {
    return (
      <LibraryColumn
        index={1}
        title='Categories'
      >
        {
          this.props.categories.size ?
            (
              <div>
                {this.renderStatusGroup(ItemStatus.Build)}
                {this.renderStatusGroup(ItemStatus.Archive)}
              </div>
            )
            :
            <InfoArea
              large='No categories created, yet.'
              button='Create a category'
              onClick={this.handleCreate}
            />
        }
      </LibraryColumn>
    );
  }
}

export default CategoriesColumn;
