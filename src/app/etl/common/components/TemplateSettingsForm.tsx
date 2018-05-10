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
// tslint:disable:no-var-requires import-spacing max-classes-per-file
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as React from 'react';
import Util from 'util/Util';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { instanceFnDecorator } from 'shared/util/Classes';

import { _TemplateSettings, TemplateSettings } from 'shared/etl/immutable/TemplateSettingsRecords';
import { TemplateSettings as TemplateSettingsI } from 'shared/etl/types/ETLTypes';

const { List, Map } = Immutable;

export interface Props
{
  settings: TemplateSettings;
  onChange: (config: TemplateSettings, isBlur?: boolean) => void;
}

export default class TemplateSettingsForm extends TerrainComponent<Props>
{
  public inputMap: InputDeclarationMap<TemplateSettingsI & { tooltip: any }> =
    {
      abortThreshold: {
        type: DisplayType.NumberBox,
        displayName: 'Abort Threshold',
        widthFactor: 2,
        group: 'main',
      },
      tooltip: {
        type: DisplayType.Custom,
        displayName: '',
        widthFactor: 3,
        group: 'main',
        getDisplayState: (s: TemplateSettingsI) => s.abortThreshold === 0 ? DisplayState.Active : DisplayState.Hidden,
        options: {
          render: this.renderAbortTooltip,
        },
      },
    };

  public renderAbortTooltip(state: TemplateSettingsI, disabled: boolean)
  {
    return <div style={{ position: 'relative', top: '5px' }}> (No Limit) </div>;
  }

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        inputState={this.configToState(this.props.settings)}
        onStateChange={this.handleFormChange}
      />
    );
  }

  @instanceFnDecorator(memoizeOne)
  public configToState(config: TemplateSettings): TemplateSettingsI
  {
    return config.toJS() as TemplateSettingsI;
  }

  public handleFormChange(state: TemplateSettingsI, isBlur?: boolean)
  {
    this.props.onChange(_TemplateSettings(state), isBlur);
  }
}
