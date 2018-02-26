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
// tslint:disable:no-var-requires

import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';

import FadeInOut from 'common/components/FadeInOut';
import FilePicker from 'common/components/FilePicker';

import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { WalkthroughActions } from 'etl/walkthrough/ETLWalkthroughRedux';
import { ViewState, WalkthroughState } from 'etl/walkthrough/ETLWalkthroughTypes';
import { ETLStepComponent, RevertParams, StepProps } from './ETLStepComponent';
import SourceFileTypeOptions from './SourceFileTypeOptions';

import './ETLStepComponent.less';

const UploadIcon = require('images/icon_export.svg');

enum Stage
{
  PickFile = 0,
  FileTypeSettings = 1,
  Confirm = 2,
}

class ETLUploadStep extends ETLStepComponent
{
  public static onRevert(params: RevertParams)
  {
    const walkthrough = params.walkthrough
      .set('file', null)
      .set('source', null);
    params.act({
      actionType: 'setWalkthroughState',
      newState: walkthrough,
    });
  }

  public getStage(): Stage
  {
    const { walkthrough } = this.props;
    if (walkthrough.file == null || walkthrough.source == null)
    {
      return Stage.PickFile;
    }
    else if (walkthrough.source.params == null)
    {
      return Stage.FileTypeSettings;
    }
    else
    {
      return Stage.Confirm;
    }
  }

  public renderUploadSection()
  {
    const button = (
      <div className='etl-upload-button' style={uploadButtonStyle}>
        <UploadIcon width='32px'/>
        <div className='upload-button-text'>
          Choose a File
        </div>
      </div>
    );

    const file = this.props.walkthrough.file;
    const showFileName = file != null;
    return (
      <div className='etl-transition-column'>
        <FilePicker
          large={true}
          onChange={this.handleChangeFile}
          accept={'.csv,.json'}
          customButton={button}
        />
        <span style={{minHeight: transitionRowHeight}}>
          <div
            className='etl-transition-element step-upload-filename'
            style={{height: showFileName ? transitionRowHeight : '0px'}}
          >
            { showFileName ? file.name : 'Invalid File' }
          </div>
        </span>
      </div>
    );
  }

  public renderFileTypeSettings(show: boolean)
  {
    return (
      <SourceFileTypeOptions/>
    );
  }

  public render()
  {
    const stage: number = this.getStage();
    return (
      <div className='etl-transition-column etl-upload-step'>
        { this.renderUploadSection() }
        <SourceFileTypeOptions
          hide={stage <= Stage.PickFile}
        />
        { this._renderNextButton(false) }
      </div>
    );
  }

  public handleChangeFile(file: File)
  {
    const walkthrough = this.props.walkthrough;
    this.props.act({
      actionType: 'setWalkthroughState',
      newState: walkthrough
        .set('file', file)
        .set('source', { type: 'local'}),
    });
    this.props.act({
      actionType: 'autodetectFileOptions',
      file,
    });
  }
}

const transitionRowHeight = '28px';
const uploadButtonStyle = [
  backgroundColor(Colors().bg3),
  fontColor(Colors().text2, Colors().active),
  borderColor(Colors().darkerHighlight, Colors().active),
  getStyle('boxShadow', `2px 1px 3px ${Colors().boxShadow}`),
];

export default Util.createTypedContainer(
  ETLUploadStep,
  ['walkthrough'],
  { act: WalkthroughActions },
);
