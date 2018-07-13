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
// tslint:disable:no-var-requires strict-boolean-expressions

import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as React from 'react';

import Button from 'app/common/components/Button';
import Modal from 'app/common/components/Modal';
import { backgroundColor, Colors, fontColor, getStyle } from '../../../colors/Colors';
import { ColorsActions } from '../../../colors/data/ColorsRedux';
import './ButtonModal.less';

export interface Props
{
  button?: string;
  buttonIcon?: any;
  iconColor?: any;
  modal: string;
  wide: boolean;
  noFooterPadding: boolean;
  normalTextButton?: boolean;
  smallTextButton?: boolean;
  smallIconButton?: boolean;
  modalContent?: any;
  helpCursor?: boolean;
}

export default class ButtonModal extends TerrainComponent<Props>
{
  constructor(props)
  {
    super(props);
    this.state = {
      modalOpen: false,
    };
  }

  public handleModalOpen()
  {
    this.setState({
      modalOpen: true,
    });
  }

  public handleModalClose()
  {
    this.setState({
      modalOpen: false,
    });
  }

  public renderButton()
  {
    return (
      <Button
        text={this.props.button}
        onClick={this.handleModalOpen}
      />
    );
  }

  public renderSmallTextButton()
  {
    return (
      <div
        className={(this.props.helpCursor) ? 'small-text-button' : 'small-help-button'}
        onClick={this.handleModalOpen}
        style={{ color: Colors().mainBlue, fontWeight: 200 }}
      >
        {this.props.button}
      </div>
    );
  }

  public renderSmallIconButton()
  {
    return (
      <div
        className='button-icon-div'
        style={{ fill: this.props.iconColor }}
        onClick={this.handleModalOpen}
      >
        {this.props.buttonIcon}
      </div>
    );
  }

  public render()
  {
    return (
      <div>
        {this.props.smallIconButton && this.renderSmallIconButton()}
        {this.props.smallTextButton && this.renderSmallTextButton()}
        {this.props.normalTextButton && this.renderButton()}
        <Modal
          open={this.state.modalOpen}
          title={this.props.modal}
          wide={this.props.wide}
          onClose={this.handleModalClose}
          noFooterPadding={this.props.noFooterPadding}
          children={this.props.modalContent}
        />
      </div>
    );
  }
}
