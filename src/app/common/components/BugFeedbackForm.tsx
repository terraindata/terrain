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
import * as html2canvas from 'html2canvas';
import * as Radium from 'radium';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Ajax } from 'util/Ajax';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import { ColorsActions } from '../../colors/data/ColorsRedux';
import * as UserTypes from '../../users/UserTypes';
import Util from '../../util/Util';
import TerrainComponent from './../../common/components/TerrainComponent';
import FadeInOut from './FadeInOut';
import './PopUpForm.less';
type User = UserTypes.User;
const Color = require('color');

export interface Props
{
  title: string;
  formDescription: string;
  users?: UserTypes.UserState;
  isBug: boolean;
  checkboxChecked: boolean;
  checkboxLabel: string;
  textboxPlaceholder?: string;
}

@Radium
class BugFeedbackForm extends TerrainComponent<Props>
{
  public state: {
    checkboxChecked: boolean;
    userInput: string;
  } =
    {
      checkboxChecked: true;
      userInput: '',
    };

  public handleSubmitForm(): void
  {
    const data = {
      bug: this.props.isBug
      description: 'test'
      user: this.props.users.currentUser.email,
      browserInfo: navigator.appVersion,
    };
    this.takeScreenshot(data, this.state.checkboxChecked);
  }

  public postFeedbackData(data: object)
  {
    const restoreAppOpacity = () => {
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
        html2canvas(app).then((canvas) => {
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
      <div> </div>
      );
  }
}

const ReactModal = require('react-modal');
const InfoIcon = require('./../../../images/icon_info.svg');
const CloseIcon = require('./../../../images/icon_close_8x8.svg?name=CloseIcon');

export default Util.createContainer(
  BugFeedbackForm,
  ['users'],
  {
    colorsActions: ColorsActions,
  },
);
