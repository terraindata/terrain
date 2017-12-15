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

import * as classNames from 'classnames';
import * as Radium from 'radium';
import * as React from 'react';
import Util from '../../util/Util';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor } from '../../colors/Colors';
import { ColorsActions } from '../../colors/data/ColorsRedux';
import Modal from './../../common/components/Modal';
import TerrainComponent from './../../common/components/TerrainComponent';
import './TemplateList.less';

const TrashIcon = require('./../../../images/icon_trash.svg');

export interface Props
{
  items: List<string>;
  colorsActions: typeof ColorsActions;
  title?: string;
  onDelete?: (index: number) => void;
  onSelectOption?: () => void;
  onApply?: (index: number) => void;
  confirmDelete?: boolean;
}

@Radium
class TemplateList extends TerrainComponent<Props>
{
  public state: {
    selectedIndex: number,
    modalOpen: boolean,
    deleteIndex: number,
    errorMsg: string,
  } = {
    selectedIndex: -1,
    modalOpen: false,
    deleteIndex: -1,
    errorMsg: '',
  };

  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.list-items-item-wrapper .st1',
      style: { fill: Colors().text3},
    });
  }

  public setErrorMsg(errorMsg: string)
  {
    this.setState({
      errorMsg,
    });
  }

  public hideErrorModal()
  {
    this.setState({
      errorMsg: '',
    });
  }

  public hideDeleteErrorModal()
  {
    this.setState({
      modalOpen: false,
    });
  }

  public handleDelete(index: number)
  {
    if (this.props.confirmDelete !== undefined && this.props.confirmDelete)
    {
      this.setState({
        modalOpen: true,
        deleteIndex: index,
      });
      return;
    }
    this.props.onDelete(index);
  }

  public handleApply()
  {
    this.props.onApply(this.state.selectedIndex);
  }

  public handleSelectOption(index: number)
  {
    this.setState({
      selectedIndex: this.state.selectedIndex === index ? -1 : index,
    });
  }

  public renderTitle()
  {
    if (this.props.title !== undefined && this.props.title !== '')
    {
      return (
        <div
          className='list-title'
          style={fontColor(Colors().text1)}
        >
          {
            this.props.title
          }
        </div>
      );
    }
  }

  public renderApply()
  {
    // TODO: button changes colors on delete
    if (this.props.items.size > 0)
    {

      return (
        <div
          className='list-apply button'
          onClick={this.state.selectedIndex === -1 ? this._fn(this.setErrorMsg, 'Select a template to apply') : this._fn(this.handleApply)}
          style={this.state.selectedIndex === -1 ? backgroundColor(Colors().bg3) : buttonColors()}
        >
          <div
            style={fontColor(Colors().text1)}
          >
            Apply
          </div>
        </div>
      );
    }
  }

  public renderList()
  {
    return (
      <div
        className='flex-container list-items'
      >
        {
          this.props.items.map((item, index) =>
          {
            const isSelected = index === this.state.selectedIndex;
            return (
              <div
                className={classNames({
                  'clickable list-items-item': true,
                  'list-items-item-selected': isSelected,
                })}
                onClick={this._fn(this.handleSelectOption, index)}
                style={[
                  fontColor(Colors().text1),
                  backgroundColor(Colors().bg3),
                  borderColor(
                    isSelected ? Colors().active : Colors().highlight,
                    isSelected ? Colors().active : Colors().inactiveHover,
                  ),
                ]}
                key={index}
              >
                <div
                  className='flex-container list-items-item-wrapper'
                >
                  {
                    item
                  }
                  <TrashIcon
                    onClick={this._fn(this.handleDelete, index)}
                    className='delete-list-item'
                  />
                </div>
              </div>
            );
          })
        }
      </div>
    );
  }

  public renderError()
  {
    return (
      <Modal
        open={this.state.errorMsg !== ''}
        message={this.state.errorMsg}
        onClose={this.hideErrorModal}
        error={true}
      />
    );
  }

  public renderDeleteError()
  {
    return (
      <Modal
        open={this.state.modalOpen}
        message={'Are you sure you want to delete template ' + this.props.items.get(this.state.deleteIndex) + '?'}
        onClose={this.hideDeleteErrorModal}
        confirm={true}
        onConfirm={this._fn(this.props.onDelete, this.state.deleteIndex)}
      />
    );
  }

  public render()
  {
    return (
      <div
        className='flex-container list-container'
        style={backgroundColor(Colors().bg1)}
      >
        {this.renderTitle()}
        {this.renderList()}
        {this.renderApply()}
        {this.renderError()}
        {this.renderDeleteError()}
      </div>
    );
  }
}

export default Util.createContainer(
  TemplateList,
  [],
  {
    colorsActions: ColorsActions
  },
);
