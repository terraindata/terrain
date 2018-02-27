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

import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { _SinkConfig, _SourceConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import { WalkthroughActions } from 'etl/walkthrough/ETLWalkthroughRedux';
import { ViewState, WalkthroughState } from 'etl/walkthrough/ETLWalkthroughTypes';
import { getFileType } from 'shared/etl/FileUtil';
import { SinkOptionsType, Sinks, SourceOptionsType, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes } from 'shared/etl/types/ETLTypes';
import { ETLStepComponent, StepProps, TransitionParams } from './ETLStepComponent';
import './ETLStepComponent.less';

class ETLReviewStep extends ETLStepComponent
{
  public isImport()
  {
    const { walkthrough } = this.props;
    return walkthrough.sink.type === Sinks.Database;
  }

  public renderRow(label, value)
  {
    return (
      <div className='etl-review-step-row' key={label}>
        <div className='etl-review-step-label' style={labelStyle}>
          {label}
        </div>
        <div className='etl-review-step-value' style={valueStyle}>
          {value}
        </div>
      </div>
    );
  }

  public renderSourceInfo() // TODO should info for other sources
  {
    const { walkthrough } = this.props;
    const { source, file } = walkthrough;
    return [
      this.renderRow('Source Type', source.type),
      source.type === Sources.Upload ? this.renderRow('File Name', file.name) : null,
    ];
  }

  public renderSinkInfo() // TODO show info for other sinks
  {
    const { walkthrough } = this.props;
    const { sink } = walkthrough;
    const options = sink.options as SinkOptionsType<Sinks.Database>;
    return [
      this.renderRow('Sink Type', sink.type),
      ...sink.type !== Sinks.Database ? [] :
        [
          this.renderRow('Server', options.serverId), // TODO show the server name
          this.renderRow('Database', options.database),
          this.renderRow('Table', options.table),
        ],
    ];
  }

  public renderSummary()
  {
    const { walkthrough } = this.props;
    const { source, sink, file, chosenTemplateId } = walkthrough;
    return (
      <div className='etl-review-column'>
        {this.renderRow('Type', this.isImport() ? 'Import' : 'Export')}
        <div className='etl-review-gap' style={gapStyle} />
        {... this.renderSourceInfo()}
        <div className='etl-review-gap' style={gapStyle} />
        {... this.renderSinkInfo()}
      </div>
    );
  }

  public renderSummaryChosenTemplate()
  {
    return null; // TODO
  }

  public render()
  {
    const { walkthrough } = this.props;
    return (
      <div className='etl-transition-column etl-review-step'>
        {
          walkthrough.chosenTemplateId !== -1 ?
            this.renderSummaryChosenTemplate()
            :
            this.renderSummary()
        }
        <div className='etl-step-next-button-spacer'>
          {this._renderNextButton()}
        </div>
      </div>
    );
  }
}

const labelStyle = fontColor(Colors().text2);
const valueStyle = fontColor(Colors().text2);
const gapStyle = { borderBottom: `1px solid ${Colors().border1}` };

export default Util.createTypedContainer(
  ETLReviewStep,
  ['walkthrough'],
  { act: WalkthroughActions },
);
