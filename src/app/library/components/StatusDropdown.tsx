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

// tslint:disable:no-var-requires

import { List } from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';

import { tooltip } from 'common/components/tooltip/Tooltips';
import { UserState } from 'users/UserTypes';
import { ItemStatus as Status } from '../../../items/types/Item';
import RolesStore from '../../roles/data/RolesStore';
import Util from '../../util/Util';
import * as LibraryTypes from '../LibraryTypes';
import Dropdown from './../../common/components/Dropdown';
import TerrainComponent from './../../common/components/TerrainComponent';
import './StatusDropdown.less';

const StarIcon = require('../../../images/icon_star.svg?name=StarIcon');

export interface Props
{
  algorithm: LibraryTypes.Algorithm;
  noBorder?: boolean;
  algorithmActions: any;
  tooltips?: List<any>;
  users?: UserState;
}

class StatusDropdown extends TerrainComponent<Props>
{
  public state = {
    isBuilder: true,
  };

  public handleChange(index: number)
  {
    const status = this.getOrder()[index];
    this.props.algorithmActions.status(this.props.algorithm, status as Status, false);
  }

  public canEdit(): boolean
  {
    const { algorithm, users } = this.props;
    const { currentUser } = users;
    return (currentUser !== undefined && currentUser.isSuperUser) ||
      (this.state.isBuilder &&
        algorithm.status !== Status.Deployed &&
        algorithm.status !== Status.Default
      );
  }

  public getOptions(): List<string> // List<El>
  {
    const { algorithm, users } = this.props;
    const { currentUser } = users;

    if (!this.canEdit())
    {
      return LockedOptions[algorithm.status];
    }

    if (currentUser !== undefined && currentUser.isSuperUser)
    {
      return AdminOptions;
    }

    if (this.state.isBuilder)
    {
      return BuilderOptions;
    }

    return AdminOptions;
  }

  public getOrder(): Array<Status | string>
  {
    const { users } = this.props;
    const { currentUser } = users;
    if (currentUser !== undefined && currentUser.isSuperUser)
    {
      return AdminOptionsOrder;
    }

    if (this.state.isBuilder)
    {
      return BuilderOptionsOrder;
    }

    return [];
  }

  public getSelectedIndex(): number
  {
    if (!this.canEdit())
    {
      return 0;
    }

    const { status } = this.props.algorithm;

    return this.getOrder().indexOf(status);
  }

  public render()
  {
    const { algorithm, users } = this.props;
    const { currentUser } = users;

    let tooltipText = '';
    if (!this.canEdit())
    {
      if (!this.state.isBuilder)
      {
        tooltipText = "You aren't a Builder in this category,<br />so you can't edit this Algorithm's status.";
      }
      else if (!currentUser.isSuperUser)
      {
        tooltipText = "This Algorithm is Deployed and you aren't<br />an Admin in this Category, so you<br />can't edit its status.";
      }
    }
    else
    {
      tooltipText = 'Click to change the Algorithm\'s status, e.g. to Deployed or Archive';
    }

    return (
      <Dropdown
        options={this.getOptions()}
        selectedIndex={this.getSelectedIndex()}
        onChange={this.handleChange}
        canEdit={this.canEdit()}
        tooltips={this.props.tooltips}
        wrapperTooltip={tooltipText}
      />
    );
    // <div className='status-dropdown-wrapper'>
    //   <div
    //     className={classNames({
    //       'status-dropdown': true,
    //       'status-dropdown-no-border': this.props.noBorder,
    //       'status-dropdown-can-edit': this.canEdit(),
    //     })}
    //   >
    //   </div>
    // </div>
  }
}

function getOption(status: Status)
{
  return LibraryTypes.nameForStatus(status as Status);

  // return (
  //   <div
  //     className='status-dropdown-option'
  //     style={{
  //       color: LibraryTypes.colorForStatus(status),
  //     }}
  //   >
  //     {
  //       status === Status.Default
  //         ?
  //         <StarIcon
  //           className='status-dropdown-option-star'
  //         />
  //         :
  //         <div
  //           className='status-dropdown-option-marker'
  //           style={{
  //             background: LibraryTypes.colorForStatus(status),
  //           }}
  //         />
  //     }
  //     <div
  //       className='status-dropdown-option-text'
  //     >
  //       {
  //         LibraryTypes.nameForStatus(status as Status)
  //       }
  //     </div>
  //   </div>
  // );
}

const AdminOptionsOrder =
  [
    Status.Default,
    Status.Live,
    Status.Deployed,
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

const LockedOptions = {};
_.map(Status, (status, statusKey) =>
{
  LockedOptions[status] = List([getOption(status)]);
});

export default Util.createTypedContainer(
  StatusDropdown,
  ['users'],
  {},
);
