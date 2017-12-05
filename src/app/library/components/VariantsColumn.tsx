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
import { uniq } from 'lodash';

import { AnalyticsState } from 'analytics/data/AnalyticsStore';
import { tooltip } from 'common/components/tooltip/Tooltips';
import { browserHistory } from 'react-router';
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
import { notificationManager } from './../../common/components/InAppNotification';
import InfoArea from './../../common/components/InfoArea';
import TerrainComponent from './../../common/components/TerrainComponent';
import UserThumbnail from './../../users/components/UserThumbnail';
import * as LibraryTypes from './../LibraryTypes';
import LibraryColumn from './LibraryColumn';
import LibraryItem from './LibraryItem';
import LibraryItemCategory from './LibraryItemCategory';
import StatusDropdown from './StatusDropdown';

const VariantIcon = require('./../../../images/icon_variant_15x17.svg?name=VariantIcon');

type Variant = LibraryTypes.Variant;
type Group = LibraryTypes.Group;

export interface Props
{
  basePath: string;
  variants: Immutable.Map<ID, Variant>;
  selectedVariant: ID;
  variantsOrder: Immutable.List<ID>;
  categoryId: ID;
  groupId: ID;
  groups: Immutable.Map<ID, Group>;
  canPinItems: boolean;
  params?: any;
  variantActions?: any;
  analytics: any;
  analyticsActions?: any;
  router?: any;
  referrer?: { label: string, path: string };
}

class VariantsColumn extends TerrainComponent<Props>
{
  public state: {
    rendered: boolean,
    lastMoved: any,
    me: UserTypes.User,
    roles: RoleTypes.RoleMap,
    draggingItemIndex: number;
    draggingOverIndex: number;

    duplicatingVariant: boolean;
    duplicateVariantTextboxValue: string;
    duplicateVariantGroupIndex: number;
    duplicateVariantId: ID;
  } = {
    rendered: false,
    lastMoved: null,
    me: null,
    roles: null,
    draggingItemIndex: -1,
    draggingOverIndex: -1,

    duplicatingVariant: false,
    duplicateVariantTextboxValue: '',
    duplicateVariantGroupIndex: 0,
    duplicateVariantId: undefined,
  };

  public componentWillMount()
  {
    const { canPinItems, router, analytics } = this.props;
    const { params, location } = router;
    const variantIds = [];

    if (params && params.variantId !== null && params.variantId !== undefined)
    {
      this.props.variantActions.select(params.variantId);
      variantIds.push(params.variantId);
    }

    if (canPinItems && location.query && location.query.pinned !== undefined)
    {
      const pinnedVariantIds = location.query.pinned.split(',');

      pinnedVariantIds.forEach((id) =>
      {
        const numericId = parseInt(id, 10);

        this.props.analyticsActions.pinVariant(numericId);
        variantIds.push(numericId);
      });
    }

    if (variantIds.length > 0)
    {
      this.props.analyticsActions.fetch(
        analytics.selectedAnalyticsConnection,
        uniq(variantIds),
        analytics.selectedMetric,
        analytics.selectedInterval,
        analytics.selectedDateRange,
      );
    }

    this._subscribe(UserStore, {
      stateKey: 'me',
      storeKeyPath: ['currentUser'],
      isMounted: true,
    });
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

    const { canPinItems, selectedVariant, basePath, analytics } = this.props;
    const { params, analytics: nextAnalytics } = nextProps;
    const { categoryId, groupId } = params;
    const nextSelectedVariant = nextProps.selectedVariant;
    const pinnedVariants = nextAnalytics
      .pinnedVariants
      .filter((pinnedVariant) => pinnedVariant)
      .keySeq()
      .toJS();

    if (selectedVariant !== nextSelectedVariant ||
      (canPinItems && analytics.pinnedVariants !== nextAnalytics.pinnedVariants)
    )
    {
      const pinnedParams = canPinItems && pinnedVariants.length > 0 ? `/?pinned=${pinnedVariants.join(',')}` : '';
      if (nextSelectedVariant !== null && nextSelectedVariant !== undefined)
      {
        browserHistory
          .replace(`/${basePath}/${categoryId}/${groupId}/${nextSelectedVariant}${pinnedParams}`);
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
    const id = this.state.duplicateVariantId;
    const sorted = this.getSortedGroups();
    const groupIds = [];
    sorted.map((value) =>
    {
      groupIds.push(value.id);
    });
    this.props.variantActions.duplicate(
      this.props.variants.get(id),
      this.props.variantsOrder.findIndex((iid) => iid === id),
      this.state.duplicateVariantTextboxValue,
      null,
      groupIds[this.state.duplicateVariantGroupIndex],
    );
    this.setState({
      duplicatingVariant: false,
    });
  }

  public handleDuplicateModalClose()
  {
    this.setState({
      duplicatingVariant: false,
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
      duplicatingVariant: true,
      duplicateVariantId: id,
      duplicateVariantGroupIndex: groupIds.indexOf(this.props.groupId),  // get index,
      duplicateVariantTextboxValue: Util.duplicateNameFor(this.props.variants.get(id).name),
    });
  }

  public handleVariantGroupIndexChange(index)
  {
    this.setState({
      duplicateVariantGroupIndex: index,
    });
  }

  public handleDuplicateTextboxChange(value)
  {
    this.setState({
      duplicateVariantTextboxValue: value,
    });
  }

  public handleArchive(id: ID)
  {
    this.props.variantActions.change(
      this.props.variants.get(id)
        .set('status', ItemStatus.Archive) as Variant,
    );
  }

  public handleUnarchive(id: ID)
  {
    this.props.variantActions.change(
      this.props.variants.get(id)
        .set('status', ItemStatus.Build) as Variant,
    );
  }

  public handleCreate()
  {
    this.props.variantActions.create(this.props.categoryId, this.props.groupId);
  }

  public handleNameChange(id: ID, name: string)
  {
    if (this.props.variants.get(id).name !== name)
    {
      const oldName = this.props.variants.get(id).name;
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

    this.props.variantActions.change(
      this.props.variants.get(id)
        .set('name', name) as Variant,
    );
  }

  public handleHover(index: number, type: string, id: ID)
  {
    const itemIndex = this.props.variantsOrder.findIndex((v) => v === id);
    if (type === 'variant'
      && this.state.lastMoved !== index + ' ' + itemIndex)
    {
      this.setState({
        lastMoved: index + ' ' + itemIndex,
        draggingItemIndex: itemIndex,
        draggingOverIndex: index,
      });

      // var target = this.props.variants.get(this.props.variantsOrder.get(index));
      // this.props.variantActions.move(this.props.variants.get(id).set('status', target.status) as Variant,
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
        const vrntName = this.props.variants.get(id).name || 'Untitled';
        notificationManager.addNotification(
          'Moved',
          '"' + vrntName + '" was moved to group "' + groupName + '"',
          'info',
          5,
        );
        if (shiftKey)
        {
          this.props.variantActions.duplicate(this.props.variants.get(id), 0, targetItem.categoryId, targetItem.id);
        }
        else
        {
          this.props.variantActions.move(this.props.variants.get(id), 0, targetItem.categoryId, targetItem.id);
        }
        break;
      case 'variant':
        this.props.variantActions.move(
          this.props.variants.get(id),
          this.props.variantsOrder.indexOf(targetItem.id),
          this.props.categoryId,
          this.props.groupId,
        );
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
      selectedVariant,
      basePath,
      categoryId,
      groupId,
      analytics,
    } = this.props;

    if (selectedVariant === id)
    {
      this.props.variantActions.unselect(id);
    } else
    {
      this.props.variantActions.select(id);
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

  public handlePinVariant(variantId)
  {
    const { analytics } = this.props;

    this.props.analyticsActions.pinVariant(variantId);
    this.props.analyticsActions.fetch(
      analytics.selectedAnalyticsConnection,
      [variantId],
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
            selectedIndex={this.state.duplicateVariantGroupIndex}
            options={groupNames.toList()}
            onChange={this.handleVariantGroupIndexChange}
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
      open={this.state.duplicatingVariant}
      showTextbox={true}
      confirm={true}
      onClose={this.handleDuplicateModalClose}
      onConfirm={this.handleDuplicateModalConfirm}
      onTextboxValueChange={this.handleDuplicateTextboxChange}
      textboxValue={this.state.duplicateVariantTextboxValue}
      title='Duplicate Variant'
      confirmButtonText='Duplicate'
      message='What would you like to name the duplicate variant?'
      textboxPlaceholderValue='Varaint Name'
      children={this.renderDuplicateDropdown()}
      childrenMessage='Please select an group for the duplicate variant.'
      allowOverflow={true}
      inputClassName='duplicate-group-modal-input'
    />);
  }

  public renderVariant(id: ID, fadeIndex: number)
  {
    const { canPinItems, params, basePath, analytics } = this.props;
    const currentVariantId = params.variantId;
    const variant = this.props.variants.get(id);
    const index = this.props.variantsOrder.indexOf(id);
    const { me, roles } = this.state;
    let canEdit: boolean;
    let canDrag: boolean;
    canEdit = true;
    canDrag = true;
    const isSelected = currentVariantId === variant.id.toString();
    const isPinned = analytics.pinnedVariants.get(variant.id, false);

    // if (me && roles)
    // {
    //   canEdit = roles.getIn([this.props.categoryId, me.id, 'builder'])
    //     || roles.getIn([this.props.categoryId, me.id, 'admin']);
    //   canDrag = canEdit &&
    //     (variant.status !== ItemStatus.Live ||
    //       roles.getIn([this.props.categoryId, me.id, 'admin']));
    // }

    // let role = 'Viewer';
    // if (roles && roles.getIn([this.props.categoryId, variant.lastUserId]))
    // {
    //   if (roles && roles.getIn([this.props.categoryId, variant.lastUserId]).admin)
    //   {
    //     role = 'Admin';
    //   }
    //   else if (roles && roles.getIn([this.props.categoryId, variant.lastUserId]).builder)
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
        name={variant.name}
        icon={<VariantIcon />}
        onDuplicate={this.handleDuplicate}
        onArchive={this.handleArchive}
        onUnarchive={this.handleUnarchive}
        canArchive={canDrag && variant.status !== ItemStatus.Archive}
        canDuplicate={canEdit}
        canUnarchive={variant.status === ItemStatus.Archive}
        canRename={variant.status !== ItemStatus.Live && variant.status !== ItemStatus.Default}
        canPin={canPinItems}
        isPinned={isPinned}
        onPin={this.handlePinVariant}
        key={variant.id}
        to={`/${basePath}/${this.props.categoryId}/${this.props.groupId}/${id}`}
        className='library-item-lightest'
        id={id}
        type='variant'
        onNameChange={this.handleNameChange}
        rendered={this.state.rendered}
        onHover={this.handleHover}
        onDropped={this.handleDropped}
        onDragFinish={this.handleDragFinish}
        item={variant}
        onDoubleClick={this.handleDoubleClick}
        canEdit={canDrag}
        canDrag={canDrag}
        canCreate={canDrag}
        isStarred={variant.status === 'DEFAULT'}
        onSelect={this.handleItemSelect}
        isSelected={isSelected}
        isFocused={true}
      >
        <div className='flex-container'>
          <UserThumbnail
            userId={variant.lastUserId}
            medium={true}
          />

          <div className='flex-grow'>
            <StatusDropdown
              variant={variant}
              noBorder={true}
              variantActions={this.props.variantActions}
            />
            <div
              className='library-item-line'
              style={fontColor(Colors().text1)}
            >
              {
                'Changed ' + Util.formatDate(variant.lastEdited)
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
    const v = this.props.variants.get(id);
    if (v.status === ItemStatus.Archive && toStatus === ItemStatus.Build)
    {
      this.props.variantActions.change(v.set('status', ItemStatus.Build) as Variant);
      return;
    }
    else if (v.status === ItemStatus.Build && toStatus === ItemStatus.Archive)
    {
      this.props.variantActions.change(v.set('status', ItemStatus.Archive) as Variant);
      return;
    }
    else if (toStatus === ItemStatus.Archive && (v.status === ItemStatus.Live || v.status === ItemStatus.Default))
    {
      this.props.variantActions.status(v, ItemStatus.Archive, false);
      return;
    }
  }

  public hasStatus(id: ID, status: ItemStatus)
  {
    return this.props.variants.getIn([id, 'status']) === status;
  }

  public renderVariants(archived?: boolean)
  {
    const { me, roles } = this.state;
    const canMakeLive = me && roles && roles.getIn([this.props.categoryId, me.id, 'admin']);
    const canCreate = true; // canMakeLive;
    // TODO maybe on the new middle tier, builders can create variants
    //  || (
    //   me && roles && roles.getIn([this.props.categoryId, me.id, 'builder'])
    // );

    let fadeIndex = 0;

    return (
      <LibraryItemCategory
        status={archived ? ItemStatus.Archive : ItemStatus.Build}
        key={archived ? '1' : '0'}
        type='variant'
        onHover={this.handleItemStatusHover}
        onDrop={this.handleItemDrop}
        titleHidden={!archived}
      >
        {
          this.props.variantsOrder.map((id, index) =>
            this.props.variants.get(id) &&
            (archived ? this.hasStatus(id, 'ARCHIVE') : !this.hasStatus(id, 'ARCHIVE'))
            && this.renderVariant(id, fadeIndex++),
          )
        }
        {
          this.props.variantsOrder.some((id) => archived ? this.hasStatus(id, 'ARCHIVE') : !this.hasStatus(id, 'ARCHIVE'))
            ? null
            : <div className='library-category-none'>None</div>
        }
        {
          canCreate && !archived &&
          tooltip(
            <CreateLine onClick={this.handleCreate} open={false} />,
            {
              title: 'Create a New Variant',
              position: 'top',
            },
          )
        }
      </LibraryItemCategory>
    );
  }

  public render()
  {
    const { referrer } = this.props;

    return (
      <LibraryColumn
        index={3}
        title='Variants'
        referrer={referrer}
      >
        {this.renderDuplicateModal()}
        {
          this.props.variantsOrder ?
            (
              this.props.variantsOrder.size ?
                (
                  <div>
                    {this.renderVariants()}
                    {this.renderVariants(true)}
                  </div>
                )
                :
                <InfoArea
                  large='No variants created, yet.'
                  button={
                    Util.haveRole(this.props.categoryId, 'builder', UserStore, RolesStore) ||
                      Util.haveRole(this.props.categoryId, 'admin', UserStore, RolesStore)
                      ? 'Create a variant' : null
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

export default VariantsColumn;
