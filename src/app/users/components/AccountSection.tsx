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

import * as Immutable from 'immutable';
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

import * as _ from 'lodash';
import { backgroundColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import { ColorsActions } from '../../colors/data/ColorsRedux';
import FadeInOut from '../../common/components/FadeInOut';
import './AccountSection.less';
const moment = require('moment-timezone');

export interface Props
{
  user?: any;
  sectionTitle: string;
  sectionType: string;
  sectionBoxes: List<any>;
  hasPhoto: boolean;
  columnNum: number;
  onChange: (value: any) => void;
  canEdit: boolean;
}

export default class Section extends TerrainComponent<Props>
{
  constructor(props)
  {
    super(props);

    this.state = {
      isEditing: false,
      sections: this.props.sectionBoxes,
      editingSections: {},
      errorModalOpen: false,
      errorModalMessage: '',
    };
  }

  public shouldComponentUpdate(nextProps, nextState)
  {
    if (!_.isEqual(nextState.editingSections, this.state.editingSections))
    {
      return true;
    }
    else
    {
      return (this.props !== nextProps) || (this.state !== nextState);
    }
  }

  public toggleErrorModal()
  {
    this.setState({
      errorModalOpen: !this.state.errorModalOpen,
    });
  }

  public handleUploadImage()
  {
    if (!this.state.isEditing)
    {
      return;
    }
    this.refs['imageInput']['click']();
  }

  public handleProfilePicChange(event)
  {
    if (!this.state.isEditing)
    {
      return;
    }
    const reader = new FileReader();

    reader.addEventListener('load', () =>
    {
      this.refs['profilePicImg']['src'] = reader.result;
      const editingPic = this.state.editingSections;
      editingPic['imgSrc'] = reader.result;
      this.setState({
        editingSections: editingPic,
      });
    }, false);

    if (event.target.files !== undefined)
    {
      const file = event.target.files[0];

      if (file)
      {
        if (file.size > 3000000)
        {
          this.setState({
            errorModalMessage: 'Maximum allowed file size is 3MB',
          });
          this.toggleErrorModal();
          return;
        }

        reader.readAsDataURL(file);
      }
    }
  }

  public renderSelectProfilePicture()
  {
    return (
      <div className='profile-pic-and-edit'>
        <img
          src={this.state.editingSections['imgSrc'] || UserTypes.profileUrlFor(this.props.user)}
          style={{ opacity: 0 }}
          onClick={this.handleUploadImage}
          ref='profilePicImg' />
        <input
          ref='imageInput'
          type='file'
          className='profile-pic-upload'
          onChange={this.handleProfilePicChange}
          id='profile-image-input'
        />
      </div>
    );
  }

  public handleProfilePictureSource(): string
  {
    const newImageUrl = this.state.editingSections['imgSrc'];
    const imageUrl: string = (newImageUrl === undefined) ? UserTypes.profileUrlFor(this.props.user) : newImageUrl;
    return 'url(' + imageUrl + ')';
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
      const perColumn = Math.ceil(this.props.sectionBoxes.count() / this.props.columnNum);
      let columns = List([]);
      for (let column = 0; column < this.props.columnNum; column++)
      {
        const columnStart = column * perColumn;
        const columnBlocks = this.props.sectionBoxes.slice(columnStart, columnStart + perColumn);
        columns = columns.push(columnBlocks);
      }

      return (
        <div className='section-body' style={{ background: Colors().bg }}>
          {this.props.hasPhoto ?
            <div
              className='profile-pic'
              onClick={this.handleProfilePicChange}
              style={{
                backgroundImage: this.handleProfilePictureSource(), opacity: (this.state.isEditing) ? 0.4 : 1,
                cursor: (this.state.isEditing) ? 'pointer' : 'default',
              }}>
              {this.renderSelectProfilePicture()}
            </div> : null}
          <div className='profile-text'>
            {columns.map((col, i) => this.renderBlocks(col, 'profile-col', i))}
          </div>
        </div>
      );

    }
  }

  public handleInputEdit(block, e)
  {
    const keyHeader = block.key;
    const currentInput = e.target.value;
    const currentEditingState = this.state.editingSections;
    currentEditingState[keyHeader] = currentInput;
    this.setState(
      {
        editingSections: currentEditingState,
      },
    );
  }

  public handleTimeZoneEdit(block, index)
  {
    const currentInput = block.options.get(index);
    const currentEditingState = this.state.editingSections;
    currentEditingState.timeZone = currentInput;
    this.setState(
      {
        editingSections: currentEditingState,
      },
    );
  }

  public renderEditField(blockList, block)
  {
    switch (block.type)
    {
      case 'Input':
        return (
          <input
            className='profile-input'
            id={block.header}
            type='text'
            onChange={this._fn(this.handleInputEdit, block)}
            value={(this.state.editingSections !== undefined) && (this.state.editingSections[block.key] !== undefined) ?
              this.state.editingSections[block.key] : block.info}
            required
          />
        );
      case 'Password':
        return (
          <input
            id={block.header}
            type='password'
            onChange={this._fn(this.handleInputEdit, block)}
            value={(this.state.editingSections !== undefined) && (this.state.editingSections[block.key] !== undefined) ?
              this.state.editingSections[block.key] : block.info}
            required
          />
        );
      case 'Dropdown':
        return <Dropdown
          canEdit={this.state.isEditing}
          options={block.options}
          selectedIndex={(this.state.editingSections !== undefined) && (this.state.editingSections[block.key] !== undefined) ?
            block.options.indexOf(this.state.editingSections[block.key]) : block.options.indexOf(block.info)}
          onChange={this._fn(this.handleTimeZoneEdit, block)}
        />;
      default:
        return block.info;
    }
  }

  public renderBlocks(blockList, colClassName, columnKey)
  {
    return (
      <div className={colClassName} key={columnKey}>
        {blockList.map((block, i) =>
          <div className='profile-block' key={i}>
            <div className='profile-header' style={{ color: Colors().sectionSubtitle }}>
              {block.header}
            </div>
            <div className='profile-inner-info'>
              {this.state.isEditing ? this.renderEditField(blockList, block) : (block.type !== 'Password' && block.info)}
            </div>
          </div>,
        )}
      </div>
    );
  }

  public onEditChange()
  {
    this.setState(
      {
        isEditing: true,
        editingSections: {},
      },
    );
  }

  public onSaveChange()
  {
    this.props.onChange(this.state.editingSections);
    this.setState(
      {
        isEditing: false,
        editingSections: {},
      },
    );
  }

  public onCancelChange()
  {
    this.setState(
      {
        isEditing: false,
        editingSections: {},
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
        style={{ background: Colors().blockBg }}
      >
        <div className='section-header-bar'>
          <div className='section-header'>{this.props.sectionTitle}</div>
          {this.props.canEdit ? (this.state.isEditing ? this.renderCancelAndSaveButtons() : this.renderEditButton()) : null}
        </div>
        {
          <FadeInOut
            open={(!(this.props.sectionType === 'password' && !this.state.isEditing))}
            children={this.renderBlockColumn()}
          />
        }
        <Modal
          message={this.state.errorModalMessage}
          onClose={this.toggleErrorModal}
          open={this.state.errorModalOpen}
          error={true}
        />
      </div>
    );
  }
}
