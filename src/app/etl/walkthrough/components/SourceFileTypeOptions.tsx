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

import CheckBox from 'common/components/CheckBox';
import FadeInOut from 'common/components/FadeInOut';
import FilePicker from 'common/components/FilePicker';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import * as FileUtil from 'shared/etl/FileUtil';
import { FileTypes, TemplateTypes } from 'shared/etl/types/ETLTypes';

import { WalkthroughActions } from 'etl/walkthrough/ETLWalkthroughRedux';
import { ViewState, WalkthroughState } from 'etl/walkthrough/ETLWalkthroughTypes';
import { ETLStepComponent, RevertParams } from './ETLStepComponent';
import './ETLStepComponent.less';

interface Props
{
  hide?: boolean;

  // injected props
  act?: typeof WalkthroughActions;
  walkthrough?: WalkthroughState;
}

class SourceFileTypeOptions extends TerrainComponent<Props>
{
  public hasCsvHeader(): boolean
  {
    const { walkthrough } = this.props;
    return walkthrough.source.fileConfig.hasCsvHeader;
  }

  public jsonHasNewlines(): boolean
  {
    const { walkthrough } = this.props;
    return walkthrough.source.fileConfig.jsonNewlines;
  }

  public renderCsvOptions()
  {
    const hasHeader = this.hasCsvHeader();

    return (
      <div
        className='source-file-type-row-button'
        onClick={this.handleCsvHeaderChange}
      >
        <CheckBox
          checked={hasHeader}
          onChange={() => null}
        />
        <div className='source-file-type-checkbox-label'>
          This file has a header
        </div>
      </div>
    );
  }

  public renderJsonOptions()
  {
    const hasNewlines = this.jsonHasNewlines();

    return (
      <div
        className='source-file-type-row-button'
        onClick={this.handleJsonNewlinesChange}
      >
        <CheckBox
          checked={hasNewlines}
          onChange={() => null}
        />
        <div className='source-file-type-checkbox-label'>
          Objects seperated by newlines
        </div>
      </div>
    );
  }

  public render()
  {
    const { file } = this.props.walkthrough;
    const type = file != null ? FileUtil.getFileType(file) : null;
    return (
      <span style={{height: transitionRowHeight}}>
        <div
          className='etl-transition-element field-type-q'
          style={{height: !this.props.hide ? transitionRowHeight : '0px'}}
        >
          <div className='source-file-type-options'>
            {type === FileTypes.Csv ? this.renderCsvOptions() : null}
            {type === FileTypes.Json ? this.renderJsonOptions() : null}
          </div>
        </div>
      </span>
    );
  }

  public handleCsvHeaderChange()
  {
    const { walkthrough } = this.props;
    const hasHeader = this.hasCsvHeader();
    const newSource = walkthrough.source
      .setIn(['fileConfig', 'hasCsvHeader'], !hasHeader);
    this.props.act({
      actionType: 'setState',
      state: {
        source: newSource,
      }; , , , ,
    });
  }

  public handleJsonNewlinesChange()
  {
    const { walkthrough } = this.props;
    const hasNewlines = this.jsonHasNewlines();

    const newSource = walkthrough.source
      .setIn(['fileConfig', 'jsonNewlines'], !hasNewlines);
    this.props.act({
      actionType: 'setState',
      state: {
        source: newSource,
      },
    });
  }
}

const transitionRowHeight = '28px';

export default Util.createTypedContainer(
  SourceFileTypeOptions,
  ['walkthrough'],
  { act: WalkthroughActions },
);
