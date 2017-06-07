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
require('./Modal.less');
import * as classNames from 'classnames';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import PureClasss from './../../common/components/PureClasss';

const ReactModal = require('react-modal');
const InfoIcon = require('./../../../images/icon_info.svg');
const CloseIcon = require('./../../../images/icon_close_8x8.svg?name=CloseIcon');

export interface Props
{
  message: string;
  open: boolean;
  title?: string;
  error?: boolean;
  fill?: boolean;
  confirm?: boolean;
  confirmButtonText?: string;
  onConfirm?: () => void;
  onClose: () => void;
  children?: any;
  thirdButtonText?: string;
  onThirdButton?: () => void;
  pre?: boolean;
}

class Modal extends PureClasss<Props>
{
  closeModalSuccess()
  {
    this.props.onClose();
    this.props.onConfirm ? this.props.onConfirm() : null;
  }

  render()
  {
    const defaultTitle = this.props.error ? 'Alert' : 'Please Confirm';

    const msgTag = this.props.pre ? <pre /> : <div />;

    return (
      <div>
        <ReactModal
          contentLabel={''}
          isOpen={this.props.open}
          overlayClassName='modal-overlay'
          className={classNames({
            'modal-content': true,
            'modal-content-fill': this.props.fill,
          })}
        >
          <div className='modal-dialog'>
            <div className={classNames({
              'modal-title': true,
              'modal-title-error': this.props.error,
            })}>
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
                    'modal-message-error': this.props.error,
                  }),
                  children: this.props.message,
                },
              )
            }
            {
              this.props.children
            }
            {
              this.props.confirm &&
              <div className='modal-buttons'>
                {
                  this.props.thirdButtonText &&
                  <div
                    className='button modal-third-button'
                    onClick={this.props.onThirdButton}
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
                  onClick={this.props.onClose}
                >
                  Cancel
                  </div>
              </div>
            }
          </div>
        </ReactModal>
      </div>
    );
  }
}

export default Modal;
