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

// tslint:disable:no-var-requires switch-default strict-boolean-expressions restrict-plus-operands

import * as React from 'react';
// import * as moment from 'moment';
const moment = require('moment');

import * as Immutable from 'immutable';
import * as _ from 'lodash';

import { AnalyticsState } from 'analytics/data/AnalyticsStore';
import { tooltip } from 'common/components/tooltip/Tooltips';
import { browserHistory } from 'react-router';
import BackendInstance from '../../../database/types/BackendInstance';
import { ItemStatus } from '../../../items/types/Item';
import { Colors, fontColor } from '../../colors/Colors';
import CreateLine from '../../common/components/CreateLine';
import Modal from '../../common/components/Modal';
import RolesStore from '../../roles/data/RolesStore';
import * as RoleTypes from '../../roles/RoleTypes';
import * as UserTypes from '../../users/UserTypes';
import Util from '../../util/Util';
import Dropdown from './../../common/components/Dropdown';
import { notificationManager } from './../../common/components/InAppNotification';
import InfoArea from './../../common/components/InfoArea';
import Scoreline from './../../common/components/Scoreline';
import TerrainComponent from './../../common/components/TerrainComponent';
import UserThumbnail from './../../users/components/UserThumbnail';
import * as LibraryTypes from './../LibraryTypes';
import LibraryColumn from './LibraryColumn';
import LibraryItem from './LibraryItem';
import LibraryItemCategory from './LibraryItemCategory';
import StatusDropdown from './StatusDropdown';

const AlgorithmIcon = require('./../../../images/icon_variant_15x17.svg?name=AlgorithmIcon');

type Category = LibraryTypes.Category;
type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;

export interface Props
{
  basePath: string;
  groups: Immutable.Map<ID, Group>;
  algorithms: Immutable.Map<ID, Algorithm>;
  selectedAlgorithm: ID;
  algorithmsOrder: Immutable.List<ID>;
  categoryId: ID;
  groupId: ID;
  canPinItems: boolean;
  params?: any;
  algorithmActions?: any;
  analytics: any;
  analyticsActions?: any;
  router?: any;
  referrer?: { label: string, path: string };
  users?: UserTypes.UserState;
}

export interface State
{
  rendered: boolean;
  lastMoved: any;
  roles: RoleTypes.RoleMap;
  draggingItemIndex: number;
  draggingOverIndex: number;

  duplicatingAlgorithm: boolean;
  duplicateAlgorithmTextboxValue: string;
  duplicateAlgorithmGroupIndex: number;
  duplicateAlgorithmId: ID;
}

export class AlgorithmsColumn extends TerrainComponent<Props>
{
  public state: State = {
    rendered: false,
    lastMoved: null,
    roles: null,
    draggingItemIndex: -1,
    draggingOverIndex: -1,

    duplicatingAlgorithm: false,
    duplicateAlgorithmTextboxValue: '',
    duplicateAlgorithmGroupIndex: 0,
    duplicateAlgorithmId: undefined,
  };

  public componentWillMount()
  {
    const { canPinItems, router, analytics } = this.props;
    const { params, location } = router;
    const algorithmIds = [];

    if (params && params.algorithmId !== null && params.algorithmId !== undefined)
    {
      this.props.algorithmActions.select(params.algorithmId);
      algorithmIds.push(params.algorithmId);
    }

    if (canPinItems && location.query && location.query.pinned !== undefined)
    {
      const pinnedAlgorithmIds = location.query.pinned.split(',');

      pinnedAlgorithmIds.forEach((id) =>
      {
        const numericId = parseInt(id, 10);

        this.props.analyticsActions.pinAlgorithm(numericId);
        algorithmIds.push(numericId);
      });
    }

    if (algorithmIds.length > 0)
    {
      this.props.analyticsActions.fetch(
        analytics.selectedAnalyticsConnection,
        _.uniq(algorithmIds),
        analytics.selectedMetric,
        analytics.selectedInterval,
        analytics.selectedDateRange,
      );
    }

    this._subscribe(RolesStore, {
      stateKey: 'roles',
      isMounted: true,
    });
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
    if (nextProps.groupId !== this.props.groupId)
    {
      this.setState({
        rendered: false,
      });
    }

    const { canPinItems, selectedAlgorithm, basePath, analytics } = this.props;
    const { params, analytics: nextAnalytics } = nextProps;
    const { categoryId, groupId } = params;
    const nextSelectedAlgorithm = nextProps.selectedAlgorithm;
    const pinnedAlgorithms = nextAnalytics
      .pinnedAlgorithms
      .filter((pinnedAlgorithm) => pinnedAlgorithm)
      .keySeq()
      .toJS();

    if (selectedAlgorithm !== nextSelectedAlgorithm ||
      (canPinItems && analytics.pinnedAlgorithms !== nextAnalytics.pinnedAlgorithms)
    )
    {
      const pinnedParams = canPinItems && pinnedAlgorithms.length > 0 ? `/?pinned=${pinnedAlgorithms.join(',')}` : '';
      if (nextSelectedAlgorithm !== null && nextSelectedAlgorithm !== undefined)
      {
        browserHistory
          .replace(`/${basePath}/${categoryId}/${groupId}/${nextSelectedAlgorithm}${pinnedParams}`);
      }
      else
      {
        browserHistory
          .replace(`/${basePath}/${categoryId}/${groupId}${pinnedParams}`);
      }
    }
  }

  public handleDuplicateModalConfirm()
  {
    const id = this.state.duplicateAlgorithmId;
    const sorted = this.getSortedGroups();
    const groupIds = [];
    sorted.map((value) =>
    {
      groupIds.push(value.id);
    });
    this.props.algorithmActions.duplicate(
      this.props.algorithms.get(id),
      this.props.algorithmsOrder.findIndex((iid) => iid === id),
      this.state.duplicateAlgorithmTextboxValue,
      null,
      groupIds[this.state.duplicateAlgorithmGroupIndex],
    );
    this.setState({
      duplicatingAlgorithm: false,
    });
  }

  public handleDuplicateModalClose()
  {
    this.setState({
      duplicatingAlgorithm: false,
    });
  }

  public getSortedGroups()
  {
    const filtered = this.props.groups.filter((value) => value.categoryId === this.props.categoryId);
    const sorted = filtered.sortBy((group) => group.id);
    return sorted;
  }

  public handleDuplicate(id: ID)
  {
    const sorted = this.getSortedGroups();
    const groupIds = [];
    sorted.map((value) =>
    {
      groupIds.push(value.id);
    });
    this.setState({
      duplicatingAlgorithm: true,
      duplicateAlgorithmId: id,
      duplicateAlgorithmGroupIndex: groupIds.indexOf(this.props.groupId),  // get index,
      duplicateAlgorithmTextboxValue: Util.duplicateNameFor(this.props.algorithms.get(id).name),
    });
  }

  public handleAlgorithmGroupIndexChange(index)
  {
    this.setState({
      duplicateAlgorithmGroupIndex: index,
    });
  }

  public handleDuplicateTextboxChange(value)
  {
    this.setState({
      duplicateAlgorithmTextboxValue: value,
    });
  }

  public handleArchive(id: ID)
  {
    this.props.algorithmActions.change(
      this.props.algorithms.get(id)
        .set('status', ItemStatus.Archive) as Algorithm,
    );
  }

  public handleUnarchive(id: ID)
  {
    this.props.algorithmActions.change(
      this.props.algorithms.get(id)
        .set('status', ItemStatus.Build) as Algorithm,
    );
  }

  public handleCreate()
  {
    this.props.algorithmActions.create(this.props.categoryId, this.props.groupId);
  }

  public handleNameChange(id: ID, name: string)
  {
    if (this.props.algorithms.get(id).name !== name)
    {
      const oldName = this.props.algorithms.get(id).name;
      let message = '"' + oldName + '" is now "' + name + '"';
      if (!oldName)
      {
        message = 'To "' + name + '"';
      }

      notificationManager.addNotification(
        'Renamed',
        message,
        'info',
        5,
      );
    }

    this.props.algorithmActions.change(
      this.props.algorithms.get(id)
        .set('name', name) as Algorithm,
    );
  }

  public handleHover(index: number, type: string, id: ID)
  {
    const itemIndex = this.props.algorithmsOrder.findIndex((v) => v === id);
    if (type === 'algorithm'
      && this.state.lastMoved !== index + ' ' + itemIndex)
    {
      this.setState({
        lastMoved: index + ' ' + itemIndex,
        draggingItemIndex: itemIndex,
        draggingOverIndex: index,
      });

      // var target = this.props.algorithms.get(this.props.algorithmsOrder.get(index));
      // this.props.algorithmActions.move(this.props.algorithms.get(id).set('status', target.status) as Algorithm,
      //   index, this.props.categoryId, this.props.groupId);
    }
  }

  public handleDropped(id: ID, targetType: string, targetItem: any, shiftKey: boolean)
  {
    switch (targetType)
    {
      case 'category':
        // move this one to the new category
        // and create a new category
        // Actions.groups.move(this.props.groups.get(id), undefined, targetItem.id);
        break;
      case 'group':
        const groupName = targetItem.name || 'Untitled';
        const vrntName = this.props.algorithms.get(id).name || 'Untitled';
        notificationManager.addNotification(
          'Moved',
          '"' + vrntName + '" was moved to group "' + groupName + '"',
          'info',
          5,
        );
        if (shiftKey)
        {
          this.props.algorithmActions.duplicate(this.props.algorithms.get(id), 0, targetItem.categoryId, targetItem.id);
        }
        else
        {
          this.props.algorithmActions.move(this.props.algorithms.get(id), 0, targetItem.categoryId, targetItem.id);
        }
        break;
      case 'algorithm':
        this.props.algorithmActions.move(
          this.props.algorithms.get(id),
          this.props.algorithmsOrder.indexOf(targetItem.id),
          this.props.categoryId,
          this.props.groupId,
        );
        break;
      case 'variant':
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
      canPinItems,
      selectedAlgorithm,
      basePath,
      categoryId,
      groupId,
      analytics,
    } = this.props;

    if (selectedAlgorithm === id)
    {
      this.props.algorithmActions.unselect(id);
    } else
    {
      this.props.algorithmActions.select(id);
      this.props.analyticsActions.fetch(
        analytics.selectedAnalyticsConnection,
        [id],
        analytics.selectedMetric,
        analytics.selectedInterval,
        analytics.selectedDateRange,
      );
    }
  }

  public handleDoubleClick(id: ID)
  {
    const { canPinItems } = this.props;

    if (!canPinItems)
    {
      browserHistory.push(`/builder/?o=${id}`);
    }
  }

  public handlePinAlgorithm(algorithmId)
  {
    const { analytics } = this.props;

    this.props.analyticsActions.pinAlgorithm(algorithmId);
    this.props.analyticsActions.fetch(
      analytics.selectedAnalyticsConnection,
      [algorithmId],
      analytics.selectedMetric,
      analytics.selectedInterval,
      analytics.selectedDateRange,
    );
  }

  public renderDuplicateDropdown()
  {
    const sorted = this.getSortedGroups();
    const groupNames = sorted.map((value) => value.name);
    return (
      <div className='new-group-modal-child'>
        <div className='database-dropdown-wrapper'>
          <Dropdown
            selectedIndex={this.state.duplicateAlgorithmGroupIndex}
            options={groupNames.toList()}
            onChange={this.handleAlgorithmGroupIndexChange}
            canEdit={true}
            directionBias={90}
            className={'bic-db-dropdown'}
          />
        </div>
      </div>
    );
  }

  public renderDuplicateModal()
  {
    return (<Modal
      open={this.state.duplicatingAlgorithm}
      showTextbox={true}
      confirm={true}
      onClose={this.handleDuplicateModalClose}
      onConfirm={this.handleDuplicateModalConfirm}
      onTextboxValueChange={this.handleDuplicateTextboxChange}
      textboxValue={this.state.duplicateAlgorithmTextboxValue}
      title='Duplicate Algorithm'
      confirmButtonText='Duplicate'
      message='What would you like to name the duplicate algorithm?'
      textboxPlaceholderValue='Varaint Name'
      children={this.renderDuplicateDropdown()}
      childrenMessage='Please select an group for the duplicate algorithm.'
      allowOverflow={true}
      inputClassName='duplicate-group-modal-input'
    />);
  }

  public renderAlgorithm(id: ID, fadeIndex: number)
  {
    const {
      canPinItems,
      params,
      basePath,
      analytics,
      users,
    } = this.props;
    const { currentUser: me } = users;
    const currentAlgorithmId = params.algorithmId;
    const algorithm = this.props.algorithms.get(id);
    const index = this.props.algorithmsOrder.indexOf(id);
    const { roles } = this.state;
    let canEdit: boolean;
    let canDrag: boolean;
    canEdit = true;
    canDrag = true;
    const isSelected = currentAlgorithmId === algorithm.id.toString();
    const isPinned = analytics.pinnedAlgorithms.get(algorithm.id, false);

    // if (me && roles)
    // {
    //   canEdit = roles.getIn([this.props.categoryId, me.id, 'builder'])
    //     || roles.getIn([this.props.categoryId, me.id, 'admin']);
    //   canDrag = canEdit &&
    //     (algorithm.status !== ItemStatus.Live ||
    //       roles.getIn([this.props.categoryId, me.id, 'admin']));
    // }

    // let role = 'Viewer';
    // if (roles && roles.getIn([this.props.categoryId, algorithm.lastUserId]))
    // {
    //   if (roles && roles.getIn([this.props.categoryId, algorithm.lastUserId]).admin)
    //   {
    //     role = 'Admin';
    //   }
    //   else if (roles && roles.getIn([this.props.categoryId, algorithm.lastUserId]).builder)
    //   {
    //     role = 'Builder';
    //   }
    // }
    return (
      <LibraryItem
        index={index}
        fadeIndex={fadeIndex}
        draggingItemIndex={this.state.draggingItemIndex}
        draggingOverIndex={this.state.draggingOverIndex}
        name={algorithm.name}
        icon={<AlgorithmIcon />}
        onDuplicate={this.handleDuplicate}
        onArchive={this.handleArchive}
        onUnarchive={this.handleUnarchive}
        canArchive={canDrag && algorithm.status !== ItemStatus.Archive}
        canDuplicate={canEdit}
        canUnarchive={algorithm.status === ItemStatus.Archive}
        canRename={algorithm.status !== ItemStatus.Live && algorithm.status !== ItemStatus.Default}
        canPin={canPinItems}
        isPinned={isPinned}
        onPin={this.handlePinAlgorithm}
        key={algorithm.id}
        to={`/${basePath}/${this.props.categoryId}/${this.props.groupId}/${id}`}
        className='library-item-lightest'
        id={id}
        type='algorithm'
        onNameChange={this.handleNameChange}
        rendered={this.state.rendered}
        onHover={this.handleHover}
        onDropped={this.handleDropped}
        onDragFinish={this.handleDragFinish}
        item={algorithm}
        onDoubleClick={this.handleDoubleClick}
        canEdit={canDrag}
        canDrag={canDrag}
        canCreate={canDrag}
        isStarred={algorithm.status === 'DEFAULT'}
        onSelect={this.handleItemSelect}
        isSelected={isSelected}
        isFocused={true}
      >
        <div className='flex-container'>
          <UserThumbnail
            userId={algorithm.lastUserId}
            medium={true}
          />

          <div className='flex-grow'>
            <StatusDropdown
              algorithm={algorithm}
              noBorder={true}
              algorithmActions={this.props.algorithmActions}
            />
            <div
              className='library-item-line'
              style={fontColor(Colors().text1)}
            >
              {
                'Changed ' + Util.formatDate(algorithm.lastEdited)
              }
            </div>
          </div>
        </div>
      </LibraryItem>
    );
  }

  public handleItemStatusHover(statusString: string, id: ID)
  {
    // do nothing
  }

  public handleItemDrop(toStatus: string, id: ID)
  {
    const v = this.props.algorithms.get(id);
    if (v.status === ItemStatus.Archive && toStatus === ItemStatus.Build)
    {
      this.props.algorithmActions.change(v.set('status', ItemStatus.Build) as Algorithm);
      return;
    }
    else if (v.status === ItemStatus.Build && toStatus === ItemStatus.Archive)
    {
      this.props.algorithmActions.change(v.set('status', ItemStatus.Archive) as Algorithm);
      return;
    }
    else if (toStatus === ItemStatus.Archive && (v.status === ItemStatus.Live || v.status === ItemStatus.Default))
    {
      this.props.algorithmActions.status(v, ItemStatus.Archive, false);
      return;
    }
  }

  public hasStatus(id: ID, status: ItemStatus)
  {
    return this.props.algorithms.getIn([id, 'status']) === status;
  }

  public renderAlgorithms(archived?: boolean)
  {
    const { users } = this.props;
    const { roles } = this.state;
    const { currentUser: me } = users;
    const canMakeLive = me && roles && roles.getIn([this.props.categoryId, me.id, 'admin']);
    const canCreate = true; // canMakeLive;
    // TODO maybe on the new middle tier, builders can create algorithms
    //  || (
    //   me && roles && roles.getIn([this.props.categoryId, me.id, 'builder'])
    // );

    let fadeIndex = 0;

    return (
      <LibraryItemCategory
        status={archived ? ItemStatus.Archive : ItemStatus.Build}
        key={archived ? '1' : '0'}
        type='algorithm'
        onHover={this.handleItemStatusHover}
        onDrop={this.handleItemDrop}
        titleHidden={!archived}
      >
        {
          this.props.algorithmsOrder.toSet().toList().map((id, index) =>
            this.props.algorithms.get(id) &&
            (archived ? this.hasStatus(id, 'ARCHIVE') : !this.hasStatus(id, 'ARCHIVE'))
            && this.renderAlgorithm(id, fadeIndex++),
          )
        }
        {
          this.props.algorithmsOrder.some((id) => archived ? this.hasStatus(id, 'ARCHIVE') : !this.hasStatus(id, 'ARCHIVE'))
            ? null
            : <div className='library-category-none'>None</div>
        }
        {
          canCreate && !archived &&
          tooltip(
            <CreateLine onClick={this.handleCreate} open={false} />,
            {
              title: 'Create a New Algorithm',
              position: 'top',
            },
          )
        }
      </LibraryItemCategory>
    );
  }

  public render()
  {
    const { referrer, users } = this.props;

    return (
      <LibraryColumn
        index={3}
        title='Algorithms'
        referrer={referrer}
      >
        {this.renderDuplicateModal()}
        {
          this.props.algorithmsOrder ?
            (
              this.props.algorithmsOrder.size ?
                (
                  <div>
                    {this.renderAlgorithms()}
                    {this.renderAlgorithms(true)}
                  </div>
                )
                :
                <InfoArea
                  large='No algorithms created, yet.'
                  button={
                    Util.haveRole(this.props.categoryId, 'builder', users, RolesStore) ||
                      Util.haveRole(this.props.categoryId, 'admin', users, RolesStore)
                      ? 'Create a algorithm' : null
                  }
                  onClick={this.handleCreate}
                />
            )
            : null
        }
      </LibraryColumn>
    );
  }
}

export default Util.createTypedContainer(
  AlgorithmsColumn,
  ['users'],
  {},
);
