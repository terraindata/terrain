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
import Button from 'common/components/Button';
import CheckBox from 'common/components/CheckBox';
import * as html2canvas from 'html2canvas';
import * as Radium from 'radium';
import * as React from 'react';
import { Ajax } from 'util/Ajax';
import { backgroundColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import { ColorsActions } from '../../colors/data/ColorsRedux';
import * as UserTypes from '../../users/UserTypes';
import Util from '../../util/Util';
import TerrainComponent from './../../common/components/TerrainComponent';
import FadeInOut from './FadeInOut';
import './PopUpForm.less';
type User = UserTypes.User;

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
  formDescription?: string;
  showTextbox?: boolean;
  textboxPlaceholderValue?: string;
  textboxValue?: string;
  closeOnConfirm?: boolean;
  className?: string;
  onConfirm?: () => void;
  checkboxLabel?: string;
  isBug: boolean;
  users?: UserTypes.UserState;
}

@Radium
class PopUpForm extends TerrainComponent<Props>
{
  public static defaultProps = {
    confirmButtonText: 'SUBMIT',
    checkboxLabel: 'Check to include screenshot.',
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

  public closePopUpFormSuccess()
  {
    this.handleSubmitForm();
    this.props.onClose();
  }

  public handleTextboxChange(evt)
  {
    this.setState({
      textboxValue: evt.target.value,
    });
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
  public handleSubmitForm(): void
  {
    const data = {
      bug: this.props.isBug,
      description: this.state.textboxValue,
      user: this.props.users.currentUser.email,
      browserInfo: navigator.appVersion,
    };
    this.takeScreenshot(data, this.state.checkboxChecked);
  }

  public postFeedbackData(data: object)
  {
    const restoreAppOpacity = () =>
    {
      if (data['screenshot'] !== undefined)
      {
        const newApp: HTMLElement = document.getElementsByClassName('app-inner')[0] as HTMLElement;
        newApp.style.opacity = 'inherit';
      }
    };

    Ajax.req(
      'post',
      `feedback/`,
      data,
      (response) => restoreAppOpacity(),
      {
        onError: (err) => restoreAppOpacity(),
      });
  }

  public takeScreenshot(data: object, screenshotChecked: boolean): void
  {
    if (screenshotChecked)
    {
      const app: HTMLElement = document.getElementsByClassName('app-inner')[0] as HTMLElement;
      app.style.opacity = '1.0';
      html2canvas(app).then((canvas) =>
      {
        const dataUrl = canvas.toDataURL();
        data['screenshot'] = dataUrl;
        this.postFeedbackData(data);
      });
    }
    else
    {
      this.postFeedbackData(data);
    }
  }

  public render()
  {
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
                      this.props.title ? this.props.title : ''
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
                    this.props.formDescription ? this.props.formDescription : ''
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
                      this.props.textboxPlaceholderValue ? this.props.textboxPlaceholderValue : ''
                    }
                    defaultValue=''
                    value={this.props.textboxValue}
                    onChange={this.handleTextboxChange} // see CardsDeck.tsx for example function
                    autoFocus
                    onFocus={this.handleFocus}
                  />
                }
                {
                  <CheckBox
                    checked={this.state.checkboxChecked}
                    onChange={this.handleCheckboxCheckedChange}
                    label={this.props.checkboxLabel ? this.props.checkboxLabel : ''}
                  />
                }

                <div className='popupform-modal-buttons modal-close-button'>
                  <Button
                    text={this.props.cancelButtonText ? this.props.cancelButtonText : 'CANCEL'}
                    onClick={this.props.onClose}></Button>
                </div>
                <div className='popupform-modal-buttons modal-confirm-button'>
                  <Button
                    theme='active'
                    text={this.props.confirmButtonText ? this.props.confirmButtonText : 'CONTINUE'}
                    onClick={!this.props.confirmDisabled && this.closePopUpFormSuccess}></Button>
                </div>

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
  ['users'],
  {
    colorsActions: ColorsActions,
  },
);
