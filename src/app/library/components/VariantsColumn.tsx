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
import * as _ from 'underscore';
// import * as moment from 'moment';
const moment = require('moment');

import { browserHistory } from 'react-router';
import { ItemStatus } from '../../../items/types/Item';
import CreateLine from '../../common/components/CreateLine';
import RolesStore from '../../roles/data/RolesStore';
import * as RoleTypes from '../../roles/RoleTypes';
import UserStore from '../../users/data/UserStore';
import * as UserTypes from '../../users/UserTypes';
import Util from '../../util/Util';
import { notificationManager } from './../../common/components/InAppNotification';
import InfoArea from './../../common/components/InfoArea';
import TerrainComponent from './../../common/components/TerrainComponent';
import UserThumbnail from './../../users/components/UserThumbnail';
import Actions from './../data/LibraryActions';
import * as LibraryTypes from './../LibraryTypes';
import LibraryColumn from './LibraryColumn';
import LibraryItem from './LibraryItem';
import LibraryItemCategory from './LibraryItemCategory';
import StatusDropdown from './StatusDropdown';

const VariantIcon = require('./../../../images/icon_variant_15x17.svg?name=VariantIcon');

type Variant = LibraryTypes.Variant;

export interface Props
{
  basePath: string;
  variants: Immutable.Map<ID, Variant>;
  selectedVariants: Immutable.List<ID>;
  variantsOrder: Immutable.List<ID>;
  groupId: ID;
  algorithmId: ID;
  multiselect?: boolean;
  params?: any;
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
  } = {
    rendered: false,
    lastMoved: null,
    me: null,
    roles: null,
    draggingItemIndex: -1,
    draggingOverIndex: -1,
  };

  public componentWillMount()
  {
    const { multiselect, params } = this.props;

    if (multiselect && params && params.variantId)
    {
      const variantIds = params.variantId.split(',');
      variantIds.forEach((id) => Actions.variants.select(id));
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
    if (nextProps.algorithmId !== this.props.algorithmId)
    {
      this.setState({
        rendered: false,
      });
    }

    const { multiselect, selectedVariants, basePath } = this.props;
    const { params } = nextProps;
    const { groupId, algorithmId } = params;
    const nextSelectedVariants = nextProps.selectedVariants;
    if (multiselect && !selectedVariants.equals(nextSelectedVariants))
    {
      browserHistory
        .replace(`/${basePath}/${groupId}/${algorithmId}/${nextSelectedVariants.join(',')}`);
    }
  }

  public handleDuplicate(id: ID)
  {
    Actions.variants.duplicate(
      this.props.variants.get(id),
      this.props.variantsOrder.findIndex((iid) => iid === id),
    );
  }

  public handleArchive(id: ID)
  {
    Actions.variants.change(
      this.props.variants.get(id)
        .set('status', ItemStatus.Archive) as Variant,
    );
  }

  public handleCreate()
  {
    Actions.variants.create(this.props.groupId, this.props.algorithmId);
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

    Actions.variants.change(
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
      // Actions.variants.move(this.props.variants.get(id).set('status', target.status) as Variant,
      //   index, this.props.groupId, this.props.algorithmId);
    }
  }

  public handleDropped(id: ID, targetType: string, targetItem: any, shiftKey: boolean)
  {
    switch (targetType)
    {
      case 'group':
        // move this one to the new group
        // and create a new group
        // Actions.algorithms.move(this.props.algorithms.get(id), undefined, targetItem.id);
        break;
      case 'algorithm':
        const algorithmName = targetItem.name || 'Untitled';
        const vrntName = this.props.variants.get(id).name || 'Untitled';
        notificationManager.addNotification(
          'Moved',
          '"' + vrntName + '" was moved to algorithm "' + algorithmName + '"',
          'info',
          5,
        );
        if (shiftKey)
        {
          Actions.variants.duplicate(this.props.variants.get(id), 0, targetItem.groupId, targetItem.id);
        }
        else
        {
          Actions.variants.move(this.props.variants.get(id), 0, targetItem.groupId, targetItem.id);
        }
        break;
      case 'variant':
        Actions.variants.move(
          this.props.variants.get(id),
          this.props.variantsOrder.indexOf(targetItem.id),
          this.props.groupId,
          this.props.algorithmId,
        );
        break;
    }

    this.setState({
      draggingItemIndex: -1,
      draggingOverIndex: -1,
    });
  }

  public handleItemSelect(id: ID)
  {
    const {
      multiselect,
      selectedVariants,
      basePath,
      groupId,
      algorithmId,
    } = this.props;

    if (multiselect)
    {
      if (selectedVariants.includes(id.toString()))
      {
        Actions.variants.unselect(id.toString());
      } else
      {
        Actions.variants.select(id.toString());
      }
    } else
    {
      browserHistory.push(`/${basePath}/${groupId}/${algorithmId}/${id}`);
      const { variantId } = this.props.params;
      Actions.variants.unselectAll();
      Actions.variants.select(variantId);
    }
  }

  public handleDoubleClick(id: ID)
  {
    browserHistory.push(`/builder/?o=${id}`);
  }

  public renderVariant(id: ID, fadeIndex: number)
  {
    const { multiselect, params, basePath } = this.props;
    const currentVariantId = params.variantId;
    const variant = this.props.variants.get(id);
    const { selectedVariants } = this.props;
    const index = this.props.variantsOrder.indexOf(id);
    const { me, roles } = this.state;
    let canEdit: boolean;
    let canDrag: boolean;
    canEdit = true;
    canDrag = true;
    const isSelected = multiselect ?
      selectedVariants.includes(variant.id.toString()) :
      currentVariantId === variant.id.toString();

    // if (me && roles)
    // {
    //   canEdit = roles.getIn([this.props.groupId, me.id, 'builder'])
    //     || roles.getIn([this.props.groupId, me.id, 'admin']);
    //   canDrag = canEdit &&
    //     (variant.status !== ItemStatus.Live ||
    //       roles.getIn([this.props.groupId, me.id, 'admin']));
    // }

    // let role = 'Viewer';
    // if (roles && roles.getIn([this.props.groupId, variant.lastUserId]))
    // {
    //   if (roles && roles.getIn([this.props.groupId, variant.lastUserId]).admin)
    //   {
    //     role = 'Admin';
    //   }
    //   else if (roles && roles.getIn([this.props.groupId, variant.lastUserId]).builder)
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
        canArchive={canDrag}
        canDuplicate={canEdit}
        key={variant.id}
        to={`/${basePath}/${this.props.groupId}/${this.props.algorithmId}/${id}`}
        className='library-item-lightest'
        id={id}
        type='variant'
        onNameChange={this.handleNameChange}
        rendered={this.state.rendered}
        onHover={this.handleHover}
        onDropped={this.handleDropped}
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
            />
            <div
              className='library-item-line'
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

  public handlItemStatusHover(statusString: string, id: ID)
  {
    const v = this.props.variants.get(id);
    if (v.status !== statusString)
    {
      Actions.variants.change(v.set('status', statusString) as Variant);
    }
  }

  public hasStatus(id: ID, status: ItemStatus)
  {
    return this.props.variants.getIn([id, 'status']) === status;
  }

  public renderVariants(archived?: boolean)
  {
    const { me, roles } = this.state;
    const canMakeLive = me && roles && roles.getIn([this.props.groupId, me.id, 'admin']);
    const canCreate = true; // canMakeLive;
    // TODO maybe on the new middle tier, builders can create variants
    //  || (
    //   me && roles && roles.getIn([this.props.groupId, me.id, 'builder'])
    // );

    let fadeIndex = 0;

    return (
      <LibraryItemCategory
        status={archived ? ItemStatus.Archive : ItemStatus.Build}
        key={archived ? '1' : '0'}
        type='variant'
        onHover={this.handlItemStatusHover}
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
          <CreateLine
            onClick={this.handleCreate}
            open={false}
          />
        }
      </LibraryItemCategory>
    );
  }

  public render()
  {
    return (
      <LibraryColumn
        index={3}
        title='Variants'
      >
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
                    Util.haveRole(this.props.groupId, 'builder', UserStore, RolesStore) ||
                      Util.haveRole(this.props.groupId, 'admin', UserStore, RolesStore)
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
