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

// tslint:disable:no-var-requires strict-boolean-expressions no-unused-expression

import * as classNames from 'classnames';
import BugFeedbackForm from 'common/components/BugFeedbackForm';
import CheckBox from 'common/components/CheckBox';
import Modal from 'common/components/Modal';
import * as Radium from 'radium';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import { ColorsActions } from '../../colors/data/ColorsRedux';
import Util from '../../util/Util';
import TerrainComponent from './../../common/components/TerrainComponent';
import FadeInOut from './FadeInOut';
import './PopUpForm.less';

const Color = require('color');

// put
export interface Props
{
  colorsActions: typeof ColorsActions;
  title?: string;
  open: boolean;
  wide?: boolean;
  confirm?: boolean;
  confirmButtonText?: string;
  confirmDisabled?: boolean; // if true, confirm button is disabled
  cancelButtonText?: string;
  onClose: () => void;
  onErrorClear: () => void;
  formContent?: typeof BugFeedbackForm;
  formDescription?: string;
  showTextbox?: boolean;
  textboxPlaceholderValue?: string;
  textboxValue?: string;
  onTextboxValueChange?: (newValue: string) => void;
  closeOnConfirm?: boolean;
  className?: string;
  checkboxDescription?: boolean;
  onConfirm?: () => void;
  checkboxLabel?: string;
}

@Radium
class PopUpForm extends TerrainComponent<Props>
{
  public static defaultProps = {
    confirmButtonText: 'SUBMIT',
  };
  public state: {
    checkboxChecked: boolean,
    textboxValue: string,
  } =
    {
      checkboxChecked: true,
      textboxValue: '',
    };

  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.modal-content ::-webkit-scrollbar-thumb',
      style: { background: Colors().altScrollbarPiece },
    });
  }

  public closeModalSuccess()
  {
    if (this.props.closeOnConfirm !== undefined && !this.props.closeOnConfirm)
    {
      this.props.onConfirm ? this.props.onConfirm() : null;
      return;
    }
    this.props.onClose();
    this.props.onConfirm ? this.props.onConfirm() : null;
    //console.log(typeof(this.props.formContent));
  }

  public handleTextboxChange(evt)
  {
    if (this.props.onTextboxValueChange)
    {
      this.props.onTextboxValueChange(evt.target.value);
    }
    this.setState({
      textboxValue: evt.target.value,
    });
    //console.log(this.props.formContent);
  }

  public handleCheckboxCheckedChange()
  {
    this.setState({
      checkboxChecked: !this.state.checkboxChecked,
    });

  }

  public handleFocus(e)
  {
    e.target.select(); // text input field value will show selected
  }

  public render()
  {
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

    const confirmButtonStyle = this.props.confirmDisabled ?
      [
        fontColor(Colors().activeText),
        backgroundColor(Colors().activeHover),
        borderColor(Colors().altBg2),
        getStyle('cursor', 'default'),
      ]
      :
      [
        backgroundColor(Colors().active, Colors().activeHover),
        borderColor(Colors().active, Colors().activeHover),
        fontColor(Colors().activeText),
      ];

    return (
      <FadeInOut
        open={this.props.open}
      >
        <div>
          <ReactModal
            appElement={document.getElementById('app')}
            contentLabel={''}
            isOpen={true}
            overlayClassName='popupform-overlay'
            style={
              {
                content: getStyle('boxShadow', `0px 0px 5px 2px ${Colors().boxShadow}`),
              }
            }
            className={'dead-center-flex-wrapper'}
          >
            <div className={classNames({
              'popupform-content': true,
              'popupform-content-wide': false,
              'popupform-content-fill': false,
              [this.props.className]: (this.props.className !== '' && this.props.className !== undefined),
            })}>
              <div
                className={classNames({
                  'popupform-dialog': true,
                  'popupform-dialog-no-footer': !this.props.confirm,
                })}
                style={[
                  fontColor(Colors().altText1),
                  backgroundColor('#fff'),
                ]}
              >
                <div
                  className={classNames({
                    'popupform-title': true,
                  })}
                  style={[
                    fontColor('ffffff'),
                    backgroundColor('#55c6fa'),
                  ]}
                >
                  <div
                    className='popupform-title-inner'
                  >
                    {
                      this.props.formContent ? this.props.formContent.props.title  : this.props.title
                    }
                  </div>
                  {
                    !this.props.confirm &&
                    <CloseIcon
                      className='popupform-close-x'
                      onClick={this.props.onClose}
                    />
                  }
                </div>
                {
                  <div className='popupform-description'> {
                    this.props.formContent ? this.props.formContent.props.formDescription : this.props.formDescription
                  }
                  </div>
                }
                {
                  this.props.showTextbox &&
                  <textarea
                    className={classNames({
                      'popupform-standard-input': true,

                    })}
                    placeholder={
                      this.props.formContent ?  this.props.formContent.props.textboxPlaceholder : this.props.textboxPlaceholderValue
                    }
                    defaultValue=''
                    value={this.props.textboxValue}
                    onChange={this.handleTextboxChange} // see CardsDeck.tsx for example function
                    autoFocus
                    onFocus={this.handleFocus}
                  />
                }
                {
                }
                {
                  <CheckBox
                  checked={this.state.checkboxChecked}
                  onChange={this.handleCheckboxCheckedChange}
                  label={this.props.formContent ? this.props.formContent.props.checkboxLabel : this.props.checkboxLabel}/>
                }
                {
                  this.props.confirm &&
                  <div
                    className='popupform-modal-buttons'
                    style={[
                      fontColor(Colors().altText1),
                    ]}
                  >
                    <div
                      className='button modal-close-button'
                      style={buttonStyle}
                      onClick={this.props.onClose}
                      key='modal-close-button'
                    >
                      {
                        this.props.cancelButtonText ? this.props.cancelButtonText : 'CANCEL'
                      }
                    </div>
                    {
                      this.props.confirm ?
                        <div
                          className={classNames({
                            'button': true,
                            'modal-confirm-button': true,
                          })}
                          onClick={!this.props.confirmDisabled && this.closeModalSuccess}
                          style={confirmButtonStyle}
                          key='modal-confirm-button'
                        >
                          {
                            this.props.confirmButtonText ? this.props.confirmButtonText : 'Continue'
                          }
                        </div>
                        :
                        <div />
                    }

                  </div>
                }
              </div>
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

export default Util.createContainer(
  PopUpForm,
  [],
  {
    colorsActions: ColorsActions,
  },
);
