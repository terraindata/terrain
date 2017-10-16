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

// tslint:disable:no-var-requires strict-boolean-expressions no-unused-expression

import * as classNames from 'classnames';
import * as Radium from 'radium';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import FadeInOut from './FadeInOut';
import './Modal.less';

const Color = require('color');

export interface Props
{
  open: boolean;
  message?: string;
  title?: string;
  error?: boolean;
  fill?: boolean;
  wide?: boolean;
  confirm?: boolean;
  confirmButtonText?: string;
  onConfirm?: () => void;
  onClose: () => void;
  children?: any;
  childrenMessage?: string;
  thirdButtonText?: string;
  onThirdButton?: () => void;
  pre?: boolean;
  showTextbox?: boolean;
  textboxValue?: string;
  initialTextboxValue?: string;
  textboxPlaceholderValue?: string;
  onTextboxValueChange?: (newValue: string) => void;
  allowOverflow?: boolean;
  closeOnConfirm?: boolean;
  className?: string;
  noFooterPadding?: boolean; // TODO: find better way
  inputClassName?: string;
}

@Radium
class Modal extends TerrainComponent<Props>
{
  public closeModalSuccess()
  {
    if (this.props.closeOnConfirm !== undefined && !this.props.closeOnConfirm)
    {
      this.props.onConfirm ? this.props.onConfirm() : null;
      return;
    }
    this.props.onClose();
    this.props.onConfirm ? this.props.onConfirm() : null;
  }

  public handleTextboxChange(evt)
  {
    if (this.props.onTextboxValueChange)
    {
      this.props.onTextboxValueChange(evt.target.value);
    }
  }

  public render()
  {
    const defaultTitle = this.props.error ? 'Error' : 'Please Confirm';

    const msgTag = this.props.pre ? <pre /> : <div />;

    const messageStyle = [
      fontColor('#242424'),
      backgroundColor('#fff'),
    ];
    const buttonTextColor = Color('#242424');
    const buttonStyle = [
      fontColor('#424242', buttonTextColor.alpha(buttonTextColor.alpha() * 0.5)),
      backgroundColor('#fff'),
      borderColor('#EDEFF3'),
    ];

    return (
      <FadeInOut
        open={this.props.open}
      >
        <div>
          <ReactModal
            contentLabel={''}
            isOpen={true}
            overlayClassName='modal-overlay'
            style={
              {
                overlay: backgroundColor(Colors().fadedOutBg),
                content: getStyle('boxShadow', `0px 0px 5px 2px ${Colors().boxShadow}`),
              }
            }
            className={classNames({
              'modal-content': true,
              'modal-content-wide': this.props.wide,
              'modal-content-fill': this.props.fill,
              'modal-content-allow-overflow': this.props.allowOverflow,
              [this.props.className]: (this.props.className !== '' && this.props.className !== undefined),
            })}
          >
            <div
              className={classNames({
                'modal-dialog': true,
                'modal-dialog-no-footer': !this.props.confirm,
                'modal-dialog-no-footer-padding': this.props.noFooterPadding,
              })}
              style={[
                fontColor(Colors().altText1),
                backgroundColor('#fff'),
              ]}
            >
              <div
                className={classNames({
                  'modal-title': true,
                  'modal-title-error': this.props.error,
                })}
                style={[
                  fontColor(Colors().text1),
                  this.props.error ? backgroundColor(Colors().error) :
                    (localStorage.getItem('theme') === 'DARK') ? backgroundColor(Colors().bg3) : backgroundColor(Colors().bg2),

                ]}
              >
                {
                  this.props.error ?
                    <div className='modal-info-icon'>
                      <InfoIcon />
                    </div>
                    :
                    null
                }
                <div
                  className='modal-title-inner'
                >
                  {
                    this.props.title ? this.props.title : defaultTitle
                  }
                </div>
                {
                  !this.props.confirm &&
                  <CloseIcon
                    className='modal-close-x'
                    onClick={this.props.onClose}
                  />
                }
              </div>
              {
                this.props.message &&
                React.cloneElement(
                  msgTag,
                  {
                    className: classNames({
                      'modal-message': true,
                    }),
                    style: messageStyle,
                    children: this.props.message,
                  },
                )
              }
              {
                this.props.showTextbox &&
                <input
                  type='text'
                  className={classNames({
                    'standard-input': true,
                    [this.props.inputClassName]: this.props.inputClassName !== undefined && this.props.inputClassName !== '',
                  })}
                  placeholder={this.props.textboxPlaceholderValue}
                  defaultValue={this.props.initialTextboxValue}
                  value={this.props.textboxValue}
                  onChange={this.handleTextboxChange} // see CardsDeck.tsx for example function
                />
              }
              {
                this.props.childrenMessage &&
                React.cloneElement(
                  msgTag,
                  {
                    className: classNames({
                      'modal-message': true,
                    }),
                    style: messageStyle,
                    children: this.props.childrenMessage,
                  },
                )
              }
              {
                this.props.children
              }
              {
                this.props.confirm &&
                <div
                  className='modal-buttons'
                  style={[
                    fontColor(Colors().altText1),
                    backgroundColor(Colors().altBg2),
                  ]}
                >
                  {
                    this.props.thirdButtonText &&
                    <div
                      className='button modal-third-button'
                      onClick={this.props.onThirdButton}
                      style={buttonStyle}
                      key='modal-third-button'
                    >
                      {
                        this.props.thirdButtonText
                      }
                    </div>
                  }
                  {
                    this.props.confirm ?
                      <div
                        className='button modal-confirm-button'
                        onClick={this.closeModalSuccess}
                        style={[
                          backgroundColor(Colors().active, Colors().activeHover),
                          borderColor(Colors().active, Colors().activeHover),
                          fontColor(Colors().activeText),
                        ]}
                        key='modal-confirm-button'
                      >
                        {
                          this.props.confirmButtonText ? this.props.confirmButtonText : 'Continue'
                        }
                      </div>
                      :
                      <div />
                  }
                  <div
                    className='button modal-close-button'
                    style={buttonStyle}
                    onClick={this.props.onClose}
                    key='modal-close-button'
                  >
                    Cancel
                    </div>
                </div>
              }
            </div>
          </ReactModal>
        </div>
      </FadeInOut>
    );
  }
}

const ReactModal = require('react-modal');
const InfoIcon = require('./../../../images/icon_info.svg');
const CloseIcon = require('./../../../images/icon_close_8x8.svg?name=CloseIcon');

export default Modal;
