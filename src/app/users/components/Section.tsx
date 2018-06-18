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

// Copyright 2018 Terrain Data, Inc.

// tslint:disable:no-var-requires switch-default strict-boolean-expressions

import { List } from 'immutable';
import * as React from 'react';

import { AuthState } from 'auth/AuthTypes';
import CheckBox from 'common/components/CheckBox';
import Dropdown from 'common/components/Dropdown';
import { notificationManager } from 'common/components/InAppNotification';
import Modal from 'common/components/Modal';
import Switch from 'common/components/Switch';
import TerrainComponent from 'common/components/TerrainComponent';
import * as momentZon from 'moment-timezone';
import { MidwayError } from 'shared/error/MidwayError';
import Settings from 'users/components/Settings';
import Util from 'util/Util';
import Ajax from '../../util/Ajax';
import TerrainTools from '../../util/TerrainTools';
import { UserActions as Actions } from '../data/UserRedux';
import * as UserTypes from '../UserTypes';
import AccountEntry from './AccountEntry';

import { backgroundColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import { ColorsActions } from '../../colors/data/ColorsRedux';
import './Section.less';

export interface Props
{
  user: any;
  sectionTitle: string;
  sectionType: string;
  sectionBoxes: List<any>;
  hasPhoto: boolean;
  columnNum: number;
}

export default class Section extends TerrainComponent<Props>
{
  constructor(props)
  {
    super(props);

    this.state = {
      isEditing: false,
    };
  }

  public renderBlockColumn()
  {
    if (this.props.columnNum === 0)
    {
      return (
        <div className='section-body' style={{ background: Colors().bg }}>
          {this.renderBlocks(this.props.sectionBoxes, 'no-column', 1)}
        </div>
      );
    }
    else
    {
      const perColumn = Math.floor(this.props.sectionBoxes.count() / this.props.columnNum);
      let columns = List([]);
      for (let column = 0; column < this.props.columnNum; column++)
      {
        const columnStart = column * perColumn;
        const columnBlocks = this.props.sectionBoxes.slice(columnStart, columnStart + perColumn);
        columns = columns.push(columnBlocks);
      }

      return (
        <div className='section-body' style={{ background: Colors().bg }}>
          {this.props.hasPhoto ? <div className='profile-pic'><img src={UserTypes.profileUrlFor(this.props.user)} // this.props.user
            ref='profilePicImg' /></div> : null}
          <div className='profile-text'>
            {columns.map((col, i) => this.renderBlocks(col, 'profile-col-1', i))}
          </div>
        </div>
      );

    }
  }

  public renderBlocks(blockList, colClassName, columnKey)
  {
    return (
      <div className={colClassName} key={columnKey}>
        {blockList.map((block, i) =>
          <div className='profile-block' key={i}>
            <div className='profile-header' style={{ color: Colors().sectionSubtitle }}>{block.header}</div>
            <div className='profile-inner-info'>{block.info}</div>
          </div>,
        )}
      </div>
    );
  }

  public renderProfile()
  {
    return (
      <div
        className='section-body'
        style={{ background: Colors().bg }}
      >
        <div className='profile-pic'>
          this is a photo
          </div>
        <div className='profile-text'>
          <div className='profile-col-1'>
            <div className='profile-block'>
              <div className='profile-header' style={{ color: Colors().sectionSubtitle }}>Name</div>
              <div className='profile-inner-info'>The name</div>
            </div>
            <div className='profile-block'>
              <div className='profile-header' style={{ color: Colors().sectionSubtitle }}>Email</div>
              <div className='profile-inner-info'>The email</div>
            </div>
            <div className='profile-block'>
              <div className='profile-header' style={{ color: Colors().sectionSubtitle }}>Phone</div>
              <div className='profile-inner-info'>123456789</div>
            </div>
          </div>
          <div className='profile-col-2'>
            <div className='profile-block'>
              <div className='profile-header' style={{ color: Colors().sectionSubtitle }}>User Id</div>
              <div className='profile-inner-info'>the user id</div>
            </div>
            <div className='profile-block'>
              <div className='profile-header' style={{ color: Colors().sectionSubtitle }}>What I Do</div>
              <div className='profile-inner-info'>cry</div>
            </div>
            <div className='profile-block'>
              <div className='profile-header' style={{ color: Colors().sectionSubtitle }}>Skype</div>
              <div className='profile-inner-info'>yes</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  public renderPassword()
  {
    return (
      <div
        className='section-body'
        style={{ background: Colors().bg }}
      >

        <div className='profile-block'>
          <div className='profile-header' style={{ color: Colors().sectionSubtitle }}>Enter Current Password</div>
          <div className='profile-inner-info'>text entry here</div>
        </div>
        <div className='profile-block'>
          <div className='profile-header' style={{ color: Colors().sectionSubtitle }}>New Password</div>
          <div className='profile-inner-info'>text entry here</div>
        </div>
        <div className='profile-block'>
          <div className='profile-header' style={{ color: Colors().sectionSubtitle }}>Verify Password</div>
          <div className='profile-inner-info'>text entry here</div>
        </div>
      </div>
    );
  }

  public renderTimeZone()
  {
    return (
      <div
        className='section-body'
        style={{ background: Colors().bg }}
      >
        <div className='profile-block'>
          <div className='profile-header' style={{ color: Colors().sectionSubtitle }}>GMT Offset</div>
          <div className='profile-inner-info'>hiiii</div>
        </div>
        <div className='profile-block'>
          <div className='profile-header' style={{ color: Colors().sectionSubtitle }}>Send Daily Email At</div>
          <div className='profile-inner-info'>
            dropbox here
            </div>
        </div>
      </div>
    );
  }

  public onEditChange()
  {
    this.setState(
      {
        isEditing: true,
      },
    );
  }

  public onSaveChange()
  {
    this.setState(
      {
        isEditing: false,
      },
    );
  }

  public onCancelChange()
  {
    this.setState(
      {
        isEditing: false,
      },
    );
  }

  public renderEditButton()
  {
    return (
      <div
        className='section-edit-button'
        onClick={this.onEditChange}
        style={{ color: Colors().bg, background: Colors().sectionEditButton }}
      >
        Edit
      </div>
    );
  }

  public renderCancelAndSaveButtons()
  {
    return (
      <div className='section-cancel-save'>
        <div
          className='section-save-button'
          onClick={this.onSaveChange}
          style={{ color: Colors().bg, background: Colors().mainBlue }}
        >
          Save
          </div>
        <div
          className='section-cancel-button'
          onClick={this.onCancelChange}
          style={{ color: Colors().sectionSubtitle, background: Colors().bg }}
        >
          Cancel
          </div>
      </div>
    );
  }

  public render()
  {
    return (
      <div
        className='section-container'
        style={{ background: Colors().sectionBg }}
      >
        <div className='section-header-bar'>
          <div className='section-header'>{this.props.sectionTitle}</div>
          {this.state.isEditing ? this.renderCancelAndSaveButtons() : this.renderEditButton()}
        </div>

        {this.renderBlockColumn()}
      </div>
    );
  }
}
