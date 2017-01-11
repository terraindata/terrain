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


import * as React from 'react';
import Classs from './../../common/components/Classs.tsx';
import LibraryColumn from './LibraryColumn.tsx';
import LibraryItem from './LibraryItem.tsx';
import LibraryItemCategory from './LibraryItemCategory.tsx';
import CreateItem from '../../common/components/CreateItem.tsx';
import LibraryTypes from './../LibraryTypes.tsx';
import ColorManager from './../../util/ColorManager.tsx';
import InfoArea from './../../common/components/InfoArea.tsx';
import Actions from './../data/LibraryActions.tsx';
import UserThumbnail from './../../users/components/UserThumbnail.tsx';
import UserTypes from '../../users/UserTypes.tsx';
import UserStore from '../../users/data/UserStore.tsx';
import RoleTypes from '../../roles/RoleTypes.tsx';
import RolesStore from '../../roles/data/RolesStore.tsx';

var GroupIcon = require('./../../../images/icon_group_17x11.svg?name=GroupIcon');

type Group = LibraryTypes.Group;

interface Props
{
  groups: Immutable.Map<ID, Group>;
  groupsOrder: Immutable.List<ID>;
}

class GroupsColumn extends Classs<Props>
{
  state: {
    rendered: boolean,
    lastMoved: any,
    me: UserTypes.User,
    roles: RoleTypes.RoleMap,
  } = {
    rendered: false,
    lastMoved: null,
    me: null,
    roles: null,
  }
  
  componentDidMount()
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
      isMounted: true
    });
  }
  
  // handleDuplicate(id: ID)
  // {
  //   Actions.groups.duplicate(this.props.groups.find(g => g.id === id),
  //     this.props.groupsOrder.findIndex(iid => iid === id));
  // }
  
  handleArchive(id: ID)
  {
    Actions.groups.change(this.props.groups.find(g => g.id === id)
      .set('status', LibraryTypes.EGroupStatus.Archive) as Group);
  }
  
  handleNameChange(id: ID, name: string)
  {
    Actions.groups.change(
      this.props.groups.get(id)
        .set('name', name) as Group
    );
  }
  
  handleCreate()
  {
    Actions.groups.create();
  }
  
  handleHover(index: number, type: string, id: ID)
  {
    var itemIndex = this.props.groupsOrder.findIndex(v => v === id);
    if(type === 'group' && itemIndex !== index 
      && this.state.lastMoved !== index + ' ' + itemIndex)
    {
      this.setState({
        lastMoved: index + ' ' + itemIndex,
      });
      var target = this.props.groups.get(this.props.groupsOrder.get(index));
      Actions.groups.move(this.props.groups.get(id).set('status', target.status) as Group, index);
    }
  }

  handleDropped(id: ID, targetType: string, targetItem: any, shifted: boolean)
  {
    
  }  
  
  renderGroup(id: ID, index: number)
  {
    const group = this.props.groups.get(id);
    let {me, roles} = this.state;
    let groupRoles = roles && roles.get(id);
    let canCreate = (me && groupRoles && groupRoles.getIn([me.username, 'admin']));
    let canEdit = canCreate || (me && me.isAdmin);
    let canDrag = false;
      
        // onDuplicate={this.handleDuplicate}
    return (
      <LibraryItem
        index={index}
        name={group.name}
        id={id}
        icon={<GroupIcon />}
        onArchive={this.handleArchive}
        color={ColorManager.colorForKey(group.id)}
        key={group.id}
        to={'/library/' + group.id}
        onNameChange={this.handleNameChange}
        type='group'
        rendered={this.state.rendered}
        onHover={this.handleHover}
        onDropped={this.handleDropped}
        item={group}
        canEdit={canEdit || canDrag}
        canDrag={canDrag}
        canArchive={canEdit || canDrag}
        canDuplicate={false}
        canCreate={canCreate}
      >
        <div className='group-library-info-wrapper'>
          {
            groupRoles && me && (groupRoles.getIn([me.username, 'builder']) || groupRoles.getIn([me.username, 'admin'])) &&
              <UserThumbnail
                username={me.username}
                medium={true}
                extra={
                  groupRoles.getIn([me.username, 'admin']) ? 'Admin' : 
                    (groupRoles.getIn([me.username, 'builder']) ? 'Builder' : 'Viewer')
                }
              />
          }
          {
            groupRoles && groupRoles.toArray()
            .filter(role => role.builder || role.admin)
            .map(
              (role, index) => 
                index > 8 || (me && role.username === me.username) ? null : 
                  <UserThumbnail
                    username={role.username}
                    key={role.username}
                    medium={true}
                    extra={
                      groupRoles.getIn([role.username, 'admin']) ? 'Admin' : 
                        (groupRoles.getIn([role.username, 'builder']) ? 'Builder' : 'Viewer')
                    }
                  />
            )
          }
        </div>
      </LibraryItem>
    );
  }
  
  handleCategoryHover(statusString: string, id: ID)
  {
    let g = this.props.groups.get(id);
    let status = LibraryTypes.EGroupStatus[statusString];
    if(g.status !== status)
    {
      Actions.groups.change(g.set('status', status) as Group);  
    }
  }
  
  renderCategory(status: LibraryTypes.EGroupStatus)
  {
    var ids = this.props.groupsOrder.filter(id => this.props.groups.get(id).status === status);
    let canCreate = this.state.me && this.state.me.isAdmin;
    
    return (
      <LibraryItemCategory
        status={LibraryTypes.EGroupStatus[status]}
        key={status}
        onHover={this.handleCategoryHover}
        type='group'
        titleHidden={status === LibraryTypes.EGroupStatus.Live}
      >
        {
          ids.map(this.renderGroup)
        }
        {
          ids.size === 0 && <div className='library-category-none'>None</div>
        }
        {
          status === LibraryTypes.EGroupStatus.Live && canCreate &&
            <CreateItem
              name='group'
              onCreate={this.handleCreate}
            />
        }
      </LibraryItemCategory>
    );
  }
  
  render()
  {
    return (
      <LibraryColumn
        index={1}
        title='Groups'
      >
        {
          this.props.groups.size ?
            (
              <div>
                { this.renderCategory(LibraryTypes.EGroupStatus.Live) }
                { this.renderCategory(LibraryTypes.EGroupStatus.Archive) }
              </div>
            )
            :
            <InfoArea
              large='No groups created, yet.'
              button='Create a group'
              onClick={this.handleCreate}
            />
        }
      </LibraryColumn>
    );
  }
}

export default GroupsColumn;