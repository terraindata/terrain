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

// tslint:disable:restrict-plus-operands no-var-requires no-shadowed-variable strict-boolean-expressions switch-default

import * as Immutable from 'immutable';
import { replaceRoute } from 'library/helpers/LibraryRoutesHelper';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as React from 'react';
import BackendInstance from '../../../database/types/BackendInstance';
import { ItemStatus } from '../../../items/types/Item';
import { Colors, fontColor } from '../../colors/Colors';
import CreateLine from '../../common/components/CreateLine';
import Modal from '../../common/components/Modal';
import RolesStore from '../../roles/data/RolesStore';
import * as RoleTypes from '../../roles/RoleTypes';
import UserStore from '../../users/data/UserStore';
import * as UserTypes from '../../users/UserTypes';
import Util from '../../util/Util';
import Dropdown from './../../common/components/Dropdown';
import InfoArea from './../../common/components/InfoArea';
import Scoreline from './../../common/components/Scoreline';
import TerrainComponent from './../../common/components/TerrainComponent';
import UserThumbnail from './../../users/components/UserThumbnail';
import * as LibraryTypes from './../LibraryTypes';
import LibraryColumn from './LibraryColumn';
import LibraryItem from './LibraryItem';
import LibraryItemCategory from './LibraryItemCategory';

import './GroupsColumn.less';

import { tooltip } from 'common/components/tooltip/Tooltips';

const GroupIcon = require('./../../../images/icon_algorithm_16x13.svg?name=AlgorithmIcon');

type Category = LibraryTypes.Category;
type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;

export interface Props
{
  basePath: string;
  dbs: List<BackendInstance>;
  categories: Immutable.Map<ID, Category>;
  groups: Immutable.Map<ID, Group>;
  algorithms: Immutable.Map<ID, Algorithm>;
  groupsOrder: Immutable.List<ID>;
  categoryId: ID;
  params: any;
  isFocused: boolean; // is this the last thing focused / selected?
  groupActions: any;
  algorithmActions: any;
  referrer?: { label: string, path: string };
}

class GroupsColumn extends TerrainComponent<Props>
{
  public state: {
    rendered: boolean,
    me: UserTypes.User,
    roles: RoleTypes.RoleMap,
    lastMoved: string;
    draggingItemIndex: number;
    draggingOverIndex: number;
    creatingNewGroup: boolean;
    newGroupTextboxValue: string;
    newGroupDbIndex: number;
    duplicatingGroup: boolean;
    duplicateGroupTextboxValue: string;
    duplicateGroupId: ID;
    duplicateGroupCategoryIndex: number;
  } = {
    rendered: false,
    me: null,
    roles: null,
    lastMoved: '',
    draggingItemIndex: -1,
    draggingOverIndex: -1,
    creatingNewGroup: false,
    newGroupTextboxValue: '',
    newGroupDbIndex: -1,
    duplicatingGroup: false,
    duplicateGroupTextboxValue: '',
    duplicateGroupId: '',
    duplicateGroupCategoryIndex: 0,
  };

  constructor(props)
  {
    super(props);
    this.getSortedDatabases = memoizeOne(this.getSortedDatabases);
  }

  public componentWillMount()
  {
    this._subscribe(UserStore, {
      stateKey: 'me',
      storeKeyPath: ['currentUser'],
      // isMounted: true,
    });
    this._subscribe(RolesStore, {
      stateKey: 'roles',
      // isMounted: true
    });
  }

  public componentDidMount()
  {
    this.setState({
      rendered: true,
    });
  }

  public componentDidUpdate()
  {
    if (!this.state.rendered)
    {
      this.setState({
        rendered: true,
      });
    }
  }

  public componentWillReceiveProps(nextProps)
  {
    if (nextProps.categoryId !== this.props.categoryId)
    {
      this.setState({
        rendered: false,
      });
    }
  }

  public getSortedDatabases(dbs)
  {
    return Util.sortDatabases(dbs);
  }

  public getNewGroupIndex(): number
  {
    const { categories } = this.props;
    const dbs = this.getSortedDatabases(this.props.dbs);
    const category = categories.get(this.props.categoryId);

    if (this.state.newGroupDbIndex !== -1)
    {
      return this.state.newGroupDbIndex;
    }
    else
    {
      return dbs && category.db && dbs.findIndex((db) => db.id === category.db.id);
    }
  }

  public handleGroupDuplicateClose()
  {
    this.setState({
      duplicatingGroup: false,
      duplicateGroupTextboxValue: '',
    });
  }

  public handleGroupDuplicateConfirm()
  {
    const categoryKeys = _.keys(this.props.categories.toJS());
    const categoryId = categoryKeys
      .map((key) => parseFloat(key))
      .sort()[this.state.duplicateGroupCategoryIndex];
    const id = this.state.duplicateGroupId;
    const index = this.props.groupsOrder.findIndex((iid) => iid === id);
    const dbs = this.getSortedDatabases(this.props.dbs);
    const dbIndex = this.getNewGroupIndex();
    this.props.groupActions.duplicate(
      this.props.groups.get(id),
      index,
      this.state.duplicateGroupTextboxValue,
      dbs.get(dbIndex),
      this.props.categories.get(parseFloat(categoryId)).id,
    );
    this.setState({
      duplicatingGroup: false,
      duplicateGroupTextboxValue: '',
    });
  }

  public handleDuplicateGroupTextboxChange(value)
  {
    this.setState({
      duplicateGroupTextboxValue: value,
    });
  }

  public handleDuplicateGroupCategoryChange(value)
  {
    this.setState({
      duplicateGroupCategoryIndex: value,
    });
  }

  public handleDuplicate(id: ID)
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    const options = dbs ? dbs.filter((db) => db.type === 'elastic').map((db) => db.name + ` (${db.type})`).toList() : [];
    let selected;
    const group = this.props.groups.get(id);
    if (group !== undefined)
    {
      selected = group.db.name + ` (${group.db.type})`;
    }

    const categoryNames = this.getSortedCategoryNames();
    const currCategoryName = this.props.categories.get(group.categoryId).name;
    this.setState({
      duplicateGroupId: id,
      duplicateGroupTextboxValue: Util.duplicateNameFor(this.props.groups.get(id).name),
      duplicatingGroup: true,
      newGroupDbIndex: options.indexOf(selected),
      duplicateGroupCategoryIndex: categoryNames.indexOf(currCategoryName),
    });
  }

  public getSortedCategoryNames()
  {
    const categoryNames = [];
    const sorted = this.props.categories.sortBy((category) => category.id);
    sorted.map((value) =>
    {
      categoryNames.push(value.name);
    });
    return categoryNames;
  }

  public handleArchive(id: ID)
  {
    this.props.groupActions.change(
      this.props.groups.get(id)
        .set('status', ItemStatus.Archive) as Group,
    );
  }

  public handleUnarchive(id: ID)
  {
    this.props.groupActions.change(
      this.props.groups.get(id)
        .set('status', ItemStatus.Build) as Group,
    );
  }

  public handleCreate()
  {
    this.props.groupActions.create(this.props.categoryId);
  }

  public handleNameChange(id: ID, name: string)
  {
    this.props.groupActions.change(
      this.props.groups.get(id)
        .set('name', name) as Group,
    );
  }

  public handleNewGroupModalOpen()
  {
    let index = this.getNewGroupIndex();
    if (index === -1)
    {
      index = 0;
    }
    this.setState({
      creatingNewGroup: true,
      newGroupDbIndex: index,
      newGroupTextboxValue: '',
    });
  }

  public handleNewGroupModalClose()
  {
    this.setState({
      creatingNewGroup: false,
      newGroupDbIndex: -1,
    });
  }

  public handleNewGroupTextboxChange(value)
  {
    this.setState({
      newGroupTextboxValue: value,
    });
  }

  public handleNewGroupDbChange(dbIndex: number)
  {
    this.setState({
      newGroupDbIndex: dbIndex,
    });
  }

  public handleNewGroupCreated(groupId)
  {
    const { basePath, groups } = this.props;
    const categoryId = groups.get(groupId).categoryId;
    replaceRoute({
      basePath,
      categoryId,
      groupId,
    });
  }

  public handleNewGroupCreate()
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    const index = this.getNewGroupIndex();

    this.props.groupActions.createAs(
      this.props.categoryId,
      this.state.newGroupTextboxValue,
      dbs.get(index),
      this.handleNewGroupCreated,
    );
  }

  public handleHover(index: number, type: string, id: ID)
  {
    const itemIndex = this.props.groupsOrder.indexOf(id);
    if (type === 'group'
      && this.state.lastMoved !== index + ' ' + itemIndex)
    {
      this.setState({
        lastMoved: index + ' ' + itemIndex,
        draggingItemIndex: itemIndex,
        draggingOverIndex: index,
      });
    }
  }

  public handleDropped(id: ID, targetType: string, targetItem: any, shiftKey: boolean)
  {
    switch (targetType)
    {
      case 'category':
        if (shiftKey)
        {
          this.props.groupActions.duplicate(
            this.props.groups.get(id),
            0,
            targetItem.id,
          );
        }
        else
        {
          this.props.groupActions.move(
            this.props.groups.get(id),
            0,
            targetItem.id,
          );
        }
        break;
      case 'group':
        this.props.groupActions.move(
          this.props.groups.get(id),
          this.props.groupsOrder.indexOf(targetItem.id),
          this.props.categoryId,
        );
        break;
      case 'algorithm':
        // no good
        break;
    }
  }

  public handleDragFinish()
  {
    this.setState({
      draggingItemIndex: -1,
      draggingOverIndex: -1,
    });
  }

  public handleItemSelect(id: ID)
  {
    const {
      basePath,
      categoryId,
    } = this.props;

    this.props.algorithmActions.unselect();

    replaceRoute({
      basePath,
      categoryId,
      groupId: id,
    });

    return true;
  }

  public renderGroup(id: ID, fadeIndex: number)
  {
    const { params, basePath } = this.props;
    const group = this.props.groups.get(id);
    const index = this.props.groupsOrder.indexOf(id);
    const scores = {
      [ItemStatus.Archive]:
      {
        score: 0,
        color: LibraryTypes.colorForStatus(ItemStatus.Archive),
        name: 'Algorithms in Archived Status',
      },
      [ItemStatus.Build]:
      {
        score: 0,
        color: LibraryTypes.colorForStatus(ItemStatus.Build),
        name: 'Algorithms in Build Status',
      },
      [ItemStatus.Approve]:
      {
        score: 0,
        color: LibraryTypes.colorForStatus(ItemStatus.Approve),
        name: 'Algorithms in Approve Status',
      },
      [ItemStatus.Live]:
      {
        score: 0,
        color: LibraryTypes.colorForStatus(ItemStatus.Live),
        name: 'Algorithms in Live Status',
      },
      [ItemStatus.Default]:
      {
        score: 0,
        color: LibraryTypes.colorForStatus(ItemStatus.Default),
        name: 'Algorithms in Default Status',
      },
    };

    const algorithms = this.props.algorithms.filter(
      (v: Algorithm) =>
        v.groupId === id,
    );

    algorithms.map(
      (v: Algorithm) =>
      {
        if (v.status !== undefined)
        {
          scores[v.status].score++;
        }
      },
    );

    // scores.splice(0, 1); // remove Archived count
    const { me, roles } = this.state;
    const canArchive = (group.status !== ItemStatus.Archive); // me && roles && roles.getIn([group.categoryId, me.id, 'admin']);
    const canDuplicate = true;
    const canRename = (scores[ItemStatus.Live].score === 0 && scores[ItemStatus.Default].score === 0);
    const canDrag = true; // me && roles && roles.getIn([group.categoryId, me.id, 'admin']);
    const canEdit = canDrag; // ||me && roles && roles.getIn([group.categoryId, me.id, 'admin']);
    // (me && roles && roles.getIn([group.categoryId, me.id, 'builder']));

    const lastTouched: Algorithm = algorithms.reduce(
      (lastTouched: Algorithm, v: Algorithm) =>
      {
        const date = new Date(v.lastEdited);
        const lastTouchedDate = new Date(lastTouched && lastTouched.lastEdited);
        if (!lastTouched || (lastTouchedDate < date || isNaN(lastTouchedDate.getTime())))
        {
          return v;
        }
        return lastTouched;
      },
      null,
    );

    let date: string;
    let userId: string | number = 'There are no algorithms';
    if (lastTouched)
    {
      date = lastTouched.lastEdited;
      userId = lastTouched.lastUserId;
    }

    let role = 'Viewer';
    if (roles && roles.getIn([this.props.categoryId, userId]))
    {
      if (roles && roles.getIn([this.props.categoryId, userId]).admin)
      {
        role = 'Admin';
      }
      else if (roles && roles.getIn([this.props.categoryId, userId]).builder)
      {
        role = 'Builder';
      }
    }
    return (
      <LibraryItem
        index={index}
        fadeIndex={fadeIndex}
        draggingItemIndex={this.state.draggingItemIndex}
        draggingOverIndex={this.state.draggingOverIndex}
        name={group.name}
        icon={<GroupIcon />}
        onDuplicate={this.handleDuplicate}
        onArchive={this.handleArchive}
        key={group.id}
        to={`/${basePath}/${this.props.categoryId}/${group.id}`}
        className='library-item-lighter'
        id={id}
        onNameChange={this.handleNameChange}
        type='group'
        rendered={this.state.rendered}
        onHover={this.handleHover}
        onDropped={this.handleDropped}
        onDragFinish={this.handleDragFinish}
        onSelect={this.handleItemSelect}
        item={group}
        canEdit={canEdit}
        canDrag={canDrag}
        canCreate={canDrag}
        canArchive={canArchive}
        canDuplicate={canDuplicate}
        canRename={canRename}
        isSelected={+group.id === +params.groupId}
        isFocused={this.props.isFocused}
        canUnarchive={group.status === ItemStatus.Archive}
        onUnarchive={this.handleUnarchive}
      >
        <div className='flex-container'>
          <UserThumbnail userId={userId} medium={true} />
          <div className='flex-grow'>
            <div className='library-item-line'>
              <Scoreline
                scores={_.values(scores)}
                hideZeroes={true}
              />
            </div>
            <div
              className='library-item-line'
              style={fontColor(Colors().text1)}
            >
              {
                date === undefined ? 'There are no algorithms' :
                  'Most Recent Change: ' + Util.formatDate(date)
              }
            </div>
          </div>
        </div>
      </LibraryItem>
    );
  }

  public handleCategoryHover(statusString: string, id: ID)
  {
    const a = this.props.groups.get(id);
    if (a.status !== statusString && statusString !== undefined)
    {
      this.props.groupActions.change(a.set('status', statusString) as Group);
    }
  }

  public renderCategory(status: ItemStatus)
  {
    const { groups } = this.props;
    const ids = this.props.groupsOrder.filter((id) => groups.get(id) && groups.get(id).status === status);
    const { me, roles } = this.state;
    const canCreate = true; // me && roles && roles.getIn([this.props.categoryId, me.id, 'admin']);
    return (
      <LibraryItemCategory
        status={status}
        key={status}
        onHover={this.handleCategoryHover}
        type='group'
        titleHidden={status === ItemStatus.Build}
      >
        {
          ids.map(this.renderGroup)
        }
        {
          ids.size === 0 && <div className='library-category-none'>None</div>
        }
        {
          status === ItemStatus.Build && canCreate &&
          tooltip(
            <CreateLine onClick={this.handleNewGroupModalOpen} open={false} />,
            {
              title: 'Create a New Group',
              position: 'top',
            },
          )
        }
      </LibraryItemCategory>
    );
  }

  public renderDatabaseDropdown()
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    const options = dbs ? dbs.filter((db) => db.type === 'elastic').map((db) => db.name + ` (${db.type})`).toList() : [];
    return (
      <div className='new-group-modal-child'>
        <div className='database-dropdown-wrapper'>
          <Dropdown
            selectedIndex={this.state.newGroupDbIndex}
            options={options}
            onChange={this.handleNewGroupDbChange}
            canEdit={true}
            directionBias={90}
            className='bic-db-dropdown'
          />
        </div>
      </div>
    );
  }

  public renderCategoryDropdown()
  {
    const categoryKeys = _.keys(this.props.categories.toJS());
    const values = categoryKeys.map((key) => parseFloat(key)).sort();
    let categoryNames = Immutable.Map<number, string>({});
    categoryKeys.forEach((key) =>
    {
      categoryNames = categoryNames.set(parseFloat(key), this.props.categories.get(parseFloat(key)).name);
    });
    return (
      <div className='new-group-modal-child'>
        <div className='database-dropdown-wrapper'>
          <div className='duplicate-group-child-message'>Please select a category for the duplicate group.</div>
          <Dropdown
            selectedIndex={this.state.duplicateGroupCategoryIndex}
            options={Immutable.List(values)}
            optionsDisplayName={categoryNames}
            onChange={this.handleDuplicateGroupCategoryChange}
            canEdit={true}
            directionBias={90}
            className={'bic-db-dropdown'}
          />
        </div>
      </div>
    );
  }

  public renderDuplicateDropdowns()
  {
    return (
      <div>
        {this.renderDatabaseDropdown()}
        {this.renderCategoryDropdown()}
      </div>
    );
  }

  public renderDuplicateGroupModal()
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    const group = this.props.groups.get(this.state.duplicateGroupId);
    return (<Modal
      open={this.state.duplicatingGroup}
      showTextbox={true}
      confirm={true}
      onClose={this.handleGroupDuplicateClose}
      onConfirm={this.handleGroupDuplicateConfirm}
      onTextboxValueChange={this.handleDuplicateGroupTextboxChange}
      textboxValue={this.state.duplicateGroupTextboxValue}
      title='Duplicate Group'
      confirmButtonText='Duplicate'
      message='What would you like to name the duplicate group?'
      textboxPlaceholderValue='Group Name'
      children={this.renderDuplicateDropdowns()}
      childrenMessage='Please select a database for the duplicate group.'
      allowOverflow={true}
      inputClassName='duplicate-group-modal-input'
    />);
  }

  public renderCreateGroupModal()
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    const canCreateGroup: boolean = dbs && dbs.size > 0;

    return canCreateGroup ?
      (<Modal
        open={this.state.creatingNewGroup}
        showTextbox={true}
        confirm={true}
        onClose={this.handleNewGroupModalClose}
        onConfirm={this.handleNewGroupCreate}
        onTextboxValueChange={this.handleNewGroupTextboxChange}
        title='New Group'
        confirmButtonText='Create'
        message='What would you like to name the group?'
        textboxPlaceholderValue='Group Name'
        children={this.renderDatabaseDropdown()}
        childrenMessage='Please select a database'
        allowOverflow={true}
      />) :
      (<Modal
        open={this.state.creatingNewGroup}
        onClose={this.handleNewGroupModalClose}
        onTextboxValueChange={this.handleNewGroupTextboxChange}
        title='Cannot Create New Group'
        message='No databases available'
      />);
  }

  public render()
  {
    const { groups, groupsOrder, categoryId, referrer } = this.props;
    return (
      <LibraryColumn
        index={2}
        title='Groups'
        referrer={referrer}
      >
        {
          this.renderCreateGroupModal()
        }
        {
          this.renderDuplicateGroupModal()
        }
        {
          groupsOrder ?
            (
              groupsOrder.size ?
                (
                  <div>
                    {
                      this.renderCategory('BUILD')
                    }
                    {
                      this.renderCategory('ARCHIVE')
                    }
                  </div>
                )
                :
                <InfoArea
                  large='No groups created, yet.'
                  button={
                    Util.haveRole(categoryId, 'admin', UserStore, RolesStore)
                      ? 'Create a group' : null
                  }
                  onClick={this.handleNewGroupModalOpen}
                />
            )
            : null
        }
      </LibraryColumn>
    );
  }
}

export default GroupsColumn;
