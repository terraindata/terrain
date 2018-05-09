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
import { FileTypes } from 'shared/etl/types/ETLTypes';

import FileConfigForm from 'etl/common/components/FileConfigForm';
import { WalkthroughActions } from 'etl/walkthrough/ETLWalkthroughRedux';
import { ViewState, WalkthroughState } from 'etl/walkthrough/ETLWalkthroughTypes';
import { _FileConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import { SourceOptionsType } from 'shared/etl/types/EndpointTypes';
import { Sources } from 'shared/etl/types/EndpointTypes';
import { ETLStepComponent, TransitionParams } from './ETLStepComponent';
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
  public render()
  {
    const { walkthrough } = this.props;
    return (
      <span
        style={{ maxHeight: transitionRowHeight }}
        className='source-filetype-options'
      >
        <div
          className='etl-transition-element field-type-q'
          style={{ maxHeight: !this.props.hide ? transitionRowHeight : '0px' }}
        >
          <FileConfigForm
            fileConfig={walkthrough.source.fileConfig}
            onChange={this.handleFileConfigChange}
            hideTypePicker={true}
            style={{ padding: '3px' }}
          />
        </div>
      </span>
    );
  }

  public handleFileConfigChange(newConfig: FileConfig)
  {
    const { walkthrough } = this.props;
    const newSource = walkthrough.source.set('fileConfig', newConfig);
    this.props.act({
      actionType: 'setState',
      state: {
        source: newSource,
      },
    });
  }
}

const transitionRowHeight = '48px';

export default Util.createTypedContainer(
  SourceFileTypeOptions,
  ['walkthrough'],
  { act: WalkthroughActions },
);
