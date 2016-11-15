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
import * as _ from 'underscore';
import * as moment from 'moment';
import Classs from './../../common/components/Classs.tsx';
import BrowserColumn from './BrowserColumn.tsx';
import BrowserItem from './BrowserItem.tsx';
import BrowserItemCategory from './BrowserItemCategory.tsx';
import CreateItem from '../../common/components/CreateItem.tsx';
import BrowserTypes from './../BrowserTypes.tsx';
import ColorManager from './../../util/ColorManager.tsx';
import InfoArea from './../../common/components/InfoArea.tsx';
import Util from '../../util/Util.tsx';
import Actions from './../data/BrowserActions.tsx';
import UserThumbnail from './../../users/components/UserThumbnail.tsx';
import UserTypes from '../../users/UserTypes.tsx';
import UserStore from '../../users/data/UserStore.tsx';
import RoleTypes from '../../roles/RoleTypes.tsx';
import RolesStore from '../../roles/data/RolesStore.tsx';
import {notificationManager} from './../../common/components/InAppNotification.tsx'

var VariantIcon = require('./../../../images/icon_variant_15x17.svg?name=VariantIcon');

type Variant = BrowserTypes.Variant;

interface Props
{
  variants: Immutable.Map<ID, Variant>;
  variantsOrder: Immutable.List<ID>;
  groupId: ID;
  algorithmId: ID;
  history: any;
}

class VariantsColumn extends Classs<Props>
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
  
  componentWillMount()
  {
    this._subscribe(UserStore, {
      stateKey: 'me',
      storeKeyPath: ['currentUser'],
      isMounted: true,
    });
    this._subscribe(RolesStore, {
      stateKey: 'roles', 
      isMounted: true
    });
    this.setState({
      rendered: true,
    })
  }
  
  componentDidUpdate()
  {
    if(!this.state.rendered)
    {
      this.setState({
        rendered: true,
      });
    }
  }
  
  componentWillReceiveProps(nextProps)
  {
    if(nextProps.algorithmId !== this.props.algorithmId)
    {
      this.setState({
        rendered: false,
      });
    }
  }
  
  handleDuplicate(index: number)
  {
    Actions.variants.duplicate(this.props.variants.get(this.props.variantsOrder.get(index)), index);
  }
  
  handleArchive(index: number)
  {
    Actions.variants.change(this.props.variants.get(this.props.variantsOrder.get(index))
      .set('status', BrowserTypes.EVariantStatus.Archive) as Variant);
  }
  
  handleCreate()
  {
    Actions.variants.create(this.props.groupId, this.props.algorithmId);
  }
  
  handleNameChange(id: ID, name: string)
  {
      if(this.props.variants.get(id).name !== name)
      {
        var oldName = this.props.variants.get(id).name || 'Untitled'; 
        notificationManager.addNotification(
          'Renamed',
          '"' + oldName + '" is now "' + name + '"',
          'info',
          5
        );
      }

    Actions.variants.change(
      this.props.variants.get(id)
        .set('name', name) as Variant
    );
  }
    
  handleHover(index: number, type: string, id: ID)
  {
    var itemIndex = this.props.variantsOrder.findIndex(v => v === id);
    if(type === 'variant' && itemIndex !== index 
      && this.state.lastMoved !== index + ' ' + itemIndex)
    {
      this.setState({
        lastMoved: index + ' ' + itemIndex,
      });
      
      var target = this.props.variants.get(this.props.variantsOrder.get(index));
      Actions.variants.move(this.props.variants.get(id).set('status', target.status) as Variant,
        index, this.props.groupId, this.props.algorithmId);
    }
  }

  handleDropped(id: ID, targetType: string, targetItem: any, shiftKey: boolean)
  {
    switch (targetType) {
      case "group":
        // move this one to the new group
        // and create a new group
        // Actions.algorithms.move(this.props.algorithms.get(id), undefined, targetItem.id);
        break;
      case "algorithm":
        var algorithmName = targetItem.name || 'Untitled';
        var vrntName = this.props.variants.get(id).name  || 'Untitled';
        notificationManager.addNotification(
          'Moved',
          '"' + vrntName + '" was moved to algorithm "' + algorithmName + '"',
          'info',
          5
        );
        if(shiftKey)
        {
          Actions.variants.duplicate(this.props.variants.get(id), 0, targetItem.groupId, targetItem.id);
        }
        else
        {
          Actions.variants.move(this.props.variants.get(id), 0, targetItem.groupId, targetItem.id);
        }
        break;
      case "variant":
        // maybe the code for moving one variant to a specific spot in another alg goes here?
        break;
    }
  }
  
  handleDoubleClick(id:ID)
  {
    this.props.history.pushState({}, `/builder/?o=${id}`);
  }

  renderVariant(id: ID, index: number)
  {
    // Sublime gets messed up with the 'var' in 'variant', hence this pseudonym
    const vriant = this.props.variants.get(id);
    let {me, roles} = this.state;
    if(me && roles)
    {
      var canEdit = roles.getIn([this.props.groupId, me.username, 'builder'])
        || roles.getIn([this.props.groupId, me.username, 'admin']);
      var canDrag = canEdit && 
        (vriant.status !== BrowserTypes.EVariantStatus.Live || 
          roles.getIn([this.props.groupId, me.username, 'admin']));
    }
    
    var role = "Viewer";
    if (roles && roles.getIn([this.props.groupId, vriant.lastUsername])) 
    {
      if (roles && roles.getIn([this.props.groupId, vriant.lastUsername]).admin) 
      {
        role = "Admin";
      }
      else if (roles && roles.getIn([this.props.groupId, vriant.lastUsername]).builder)
      {
        role = "Builder";
      }
    }
    
    return (
      <BrowserItem
        index={index}
        name={vriant.name}
        icon={<VariantIcon />}
        onDuplicate={this.handleDuplicate}
        onArchive={this.handleArchive}
        canArchive={canDrag}
        canDuplicate={canEdit}
        color={ColorManager.colorForKey(this.props.groupId)}
        key={vriant.id}
        to={`/browser/${this.props.groupId}/${this.props.algorithmId}/${id}`}
        className='browser-item-lightest'
        id={id}
        type='variant'
        onNameChange={this.handleNameChange}
        rendered={this.state.rendered}
        onHover={this.handleHover}
        onDropped={this.handleDropped}
        item={vriant}
        onDoubleClick={this.handleDoubleClick}
        canEdit={canDrag}
        canDrag={canDrag}
      >
        <div className='flex-container'>
          <UserThumbnail username={vriant.lastUsername} medium={true} extra = {role}/>
          
          <div className='flex-grow'>
            <div 
              className='browser-item-line'
            >
              { Util.formatDate(vriant.lastEdited) }
            </div>
          </div>
        </div>
      </BrowserItem>
    );
  }
  
  handleVariantStatusHover(statusString: string, id: ID)
  {
    let v = this.props.variants.get(id);
    let status = BrowserTypes.EVariantStatus[statusString];
    if(v.status !== status)
    {
      Actions.variants.change(v.set('status', status) as Variant);  
    }
  }
  
  hasStatus(id: ID, status: BrowserTypes.EVariantStatus)
  {
    return this.props.variants.getIn([id, 'status']) === status;
  }
  
  renderVariants(archived?: boolean)
  {
    let {me, roles} = this.state;
    let canMakeLive = me && roles && roles.getIn([this.props.groupId, me.username, 'admin']);
    let canCreate = canMakeLive || (
      me && roles && roles.getIn([this.props.groupId, me.username, 'builder'])
    );
    
    return (
      <BrowserItemCategory
        status={archived ? 'Archive' : 'Build'}
        key={archived ? '1' : '0'}
        type='variant'
        onHover={this.handleVariantStatusHover}
        titleHidden={!archived}
      >
        {
          this.props.variantsOrder.map((id, index) =>
            this.props.variants.get(id) &&
              (archived ? this.hasStatus(id, BrowserTypes.EVariantStatus.Archive) : !this.hasStatus(id, BrowserTypes.EVariantStatus.Archive))
              && this.renderVariant(id, index)
          )
        }
        {
          this.props.variantsOrder.some(id => archived ? this.hasStatus(id, BrowserTypes.EVariantStatus.Archive) : !this.hasStatus(id, BrowserTypes.EVariantStatus.Archive))
          ? null
          : <div className='browser-category-none'>None</div>
        }
        {
          canCreate && !archived &&
            <CreateItem
              name='variant'
              onCreate={this.handleCreate}
            />
        }
      </BrowserItemCategory>
    );
  }
  
  render()
  {
    return (
      <BrowserColumn
        index={3}
        title='Variants'
      >
        { 
          this.props.variants ?
            (
              this.props.variants.size ?
              (
                <div>
                  { this.renderVariants() }
                  { this.renderVariants(true) }
                </div>
              )
              :
              <InfoArea
                large='No variants created, yet.'
                button={
                  Util.haveRole(this.props.groupId, 'builder', UserStore, RolesStore)
                    ? 'Create a variant' : null
                }
                onClick={this.handleCreate}
              />
            )
          : null
        }
      </BrowserColumn>
    );
  }
}

export default VariantsColumn;