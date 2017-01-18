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

require('./StatusDropdown.less');
import * as React from 'react';
import * as Immutable from 'immutable';
const {List} = Immutable;
import PureClasss from './../../common/components/PureClasss.tsx';
import Dropdown from './../../common/components/Dropdown.tsx';
import * as classNames from 'classnames';
import LibraryTypes from '../LibraryTypes.tsx';
import LibraryActions from '../data/LibraryActions.tsx';
type Status = LibraryTypes.EVariantStatus;
const Status = LibraryTypes.EVariantStatus;
import Util from '../../util/Util.tsx';
import RolesStore from '../../roles/data/RolesStore.tsx';
import UserStore from '../../users/data/UserStore.tsx';

const StarIcon = require('../../../images/icon_star.svg?name=StarIcon');

interface Props
{
  variant: LibraryTypes.Variant;
  noBorder?: boolean;
}

class StatusDropdown extends PureClasss<Props>
{
  state = {
    isAdmin: false,
    isBuilder: false,
  };
  
  componentDidMount()
  {
    this._subscribe(RolesStore, {
      updater: () =>
      {
        let isAdmin = Util.haveRole(this.props.variant.groupId, 'admin', UserStore, RolesStore);
        let isBuilder = Util.haveRole(this.props.variant.groupId, 'builder', UserStore, RolesStore);
        if(isAdmin !== this.state.isAdmin || isBuilder !== this.state.isBuilder)
        {
          this.setState({
            isAdmin,
            isBuilder,
          });
        }
      },
      isMounted: true,
    });
  }
  
  handleChange(index:number)
  {
    let status = this.getOrder()[index];
    let isDefault = false;
    if(status === DEFAULT)
    {
      status = Status.Live;
      isDefault = true;
    }
    LibraryActions.variants.status(this.props.variant, status as Status, false, isDefault);
  }
  
  canEdit():boolean
  {
    let {variant} = this.props;
    return this.state.isAdmin || 
      (this.state.isBuilder && variant.status !== Status.Live);
  }
  
  getOptions(): List<El>
  {
    let {variant} = this.props;
    
    if(!this.canEdit())
    {
      if(variant.isDefault)
      {
        return LockedOptionDefault;
      }
      
      return LockedOptions[variant.status];
    }
    
    if(this.state.isBuilder)
    {
      return BuilderOptions;
    }
    
    return AdminOptions;
  }
  
  getOrder(): (Status | string)[]
  {
    if(this.state.isBuilder)
    {
      return BuilderOptionsOrder;
    }
    
    return AdminOptionsOrder;
  }
  
  getSelectedIndex(): number
  {
    if(!this.canEdit())
    {
      return 0;
    }
    
    let {status, isDefault} = this.props.variant;
    
    if(isDefault)
    {
      return this.getOrder().indexOf(DEFAULT);
    }
    
    return this.getOrder().indexOf(status);
  }
  
  render()
  {
    let {variant} = this.props;
    
    let tooltip = "";
    if(!this.canEdit())
    {
      if(!this.state.isBuilder)
      {
        tooltip = "You aren't a Builder in this group,<br />so you can't edit this Variant's status.";
      }
      else if(!this.state.isAdmin)
      {
        tooltip = "This Variant is Live and you aren't<br />an Admin in this Group, so you<br />can't edit its status.";
      }
    }
    
    return (
      <div className='status-dropdown-wrapper'>
        <div
          className={classNames({
            'status-dropdown': true,
            'status-dropdown-no-border': this.props.noBorder,
            'status-dropdown-can-edit': this.canEdit(),
          })}
          data-tip={tooltip}
          data-html={true}
        >
          <Dropdown 
            options={this.getOptions()}
            selectedIndex={this.getSelectedIndex()}
            onChange={this.handleChange}
            canEdit={this.canEdit()}
          />
        </div>
      </div>
    );
  }
}

function getOption(status:Status | string)
{
  return (
    <div
      className='status-dropdown-option'
      style={{
        color: LibraryTypes.colorForStatus(status)
      }}
    >
      {
        status === DEFAULT
        ?
          <StarIcon
            className='status-dropdown-option-star'
          />
        :
          <div
            className='status-dropdown-option-marker'
            style={{
              background: LibraryTypes.colorForStatus(status)
            }}
          />
      }
      <div
        className='status-dropdown-option-text'
      >
        {
          LibraryTypes.nameForStatus(status)
        }
      </div>
    </div>
  );
}

const DEFAULT = 'Default';

const AdminOptionsOrder =
[
  DEFAULT,
  Status.Live,
  Status.Approve,
  Status.Build,
  Status.Archive,
];
const AdminOptions = List(AdminOptionsOrder.map(getOption));

const BuilderOptionsOrder =
[
  Status.Approve,
  Status.Build,
  Status.Archive,
];
const BuilderOptions = List(BuilderOptionsOrder.map(getOption));
  
const LockedOptions = Util.mapEnum(Status, status =>
{
  return List([getOption(+status as any)]);
});
const LockedOptionDefault = List([
  getOption(DEFAULT)
]);


export default StatusDropdown;