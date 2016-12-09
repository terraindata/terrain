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

require('./Modal.less');
import Classs from './../../common/components/Classs.tsx';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as classNames from 'classnames';

var ReactModal = require('react-modal');
var InfoIcon = require('./../../../images/icon_info.svg')

interface Props {
	message: string;
  onClose: () => void;
  open: boolean;
  title?: string;
  error?: boolean;
  fill?: boolean;
  confirm?: boolean;
	confirmButtonText?: string;
	onConfirm?: () => void; 
  children?: any;
}

class Modal extends Classs<Props>   
{
  closeModalSuccess () 
  {
    this.props.onClose();
    this.props.onConfirm ? this.props.onConfirm() : null;
  }

  render () 
  {
    var defaultTitle = this.props.error ? 'Alert' : 'Please Confirm'
      
    return (
      <div>
        <ReactModal 
        	isOpen={this.props.open} 
        	overlayClassName='modal-overlay' 
        	className={classNames({
            'modal-content': true,
            'modal-content-fill': this.props.fill,
          })}
        >
          <div className ='modal-dialog'> 
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
                {
                  this.props.title ? this.props.title : defaultTitle
                }
            </div>
            {
              this.props.message &&
              	<div className={classNames({
                  'modal-message': true,
                  'modal-message-error': this.props.error,
                })}>
                  {
                    this.props.message
                  }
             		</div>
            }
            {
              this.props.children
            }
         		<div className ='modal-buttons'>
          		{
         				this.props.confirm ? 
         					<div className='button modal-confirm-button' onClick={this.closeModalSuccess}>
         						{
                       this.props.confirmButtonText ? this.props.confirmButtonText : 'Ok'
                    }
         					</div> 
         					: 
         					<div />
         			}
              <div className='button modal-close-button' onClick={this.props.onClose}>
                {
                  this.props.confirm ? 'Cancel' : 'Close'
                }
              </div>
          	</div>
          </div>
        </ReactModal>
      </div>
    );
  }
}

export default Modal;