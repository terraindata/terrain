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

import { _SinkConfig, _SourceConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import { WalkthroughActions } from 'etl/walkthrough/ETLWalkthroughRedux';
import { ViewState, WalkthroughState } from 'etl/walkthrough/ETLWalkthroughTypes';
import { getFileType } from 'shared/etl/FileUtil';
import { FileTypes } from 'shared/etl/types/ETLTypes';
import { ETLStepComponent, RevertParams, StepProps } from './ETLStepComponent';
import './ETLStepComponent.less';
import SourceFileTypeOptions from './SourceFileTypeOptions';

const UploadIcon = require('images/icon_export.svg');

class ETLUploadStep extends ETLStepComponent
{
  // called when a user arrives at this step, but later
  // chooses a different path
  public static onRevert(params: RevertParams)
  {
    params.act({
      actionType: 'setState',
      state: {
        file: null,
        source: _SourceConfig(),
      },
    });
  }

  public renderUploadSection()
  {
    const button = (
      <div
        className={this._altButtonClass()}
        style={this._altButtonStyle()}
      >
        <UploadIcon/>
        <div className='alt-button-text'>
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
        <span
          style={{
            minHeight: transitionRowHeight,
            marginTop: '6px',
          }}
        >
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

  public render()
  {
    const filePicked = this.props.walkthrough.file != null;
    return (
      <div className='etl-transition-column etl-upload-step'>
        { this.renderUploadSection() }
        <SourceFileTypeOptions
          hide={!filePicked}
        />
        <div className='etl-step-next-button-spacer'>
          { this._renderNextButton(filePicked) }
        </div>
      </div>
    );
  }

  public handleChangeFile(file: File)
  {
    const walkthrough = this.props.walkthrough;
    this.props.act({
      actionType: 'setState',
      state: {
        file,
        source: _SourceConfig(),
      },
    });
    if (getFileType(file) === FileTypes.Json)
    {
      this.props.act({
        actionType: 'autodetectJsonOptions',
        file,
      });
    }

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
