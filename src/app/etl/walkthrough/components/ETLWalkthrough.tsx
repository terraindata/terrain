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
import * as Radium from 'radium';
import * as React from 'react';
import { browserHistory } from 'react-router';

import { walkthroughFactory } from 'common/components/walkthrough/Walkthrough';
import { WalkthroughGraphType } from 'common/components/walkthrough/WalkthroughTypes';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { WalkthroughActions } from 'etl/walkthrough/ETLWalkthroughRedux';
import { ViewState, WalkthroughState } from 'etl/walkthrough/ETLWalkthroughTypes';

import ETLUploadStep from './ETLUploadStep';
import './ETLWalkthrough.less';

const { List } = Immutable;

export interface Props
{
  params: {
    step: number;
  };
  // injected props
  act?: typeof WalkthroughActions;
  walkthrough?: WalkthroughState;
}

class ETLWalkthrough extends TerrainComponent<Props>
{
  public componentWillMount()
  {
    this.getStepFromRoute(true);
  }

  public render()
  {
    const { walkthrough } = this.props;
    const currentStep = this.getStepFromRoute();
    return (
      <div className='etl-walkthrough'>
        <WalkthroughComponentClass
          stepIndex={currentStep}
          stepHistory={walkthrough.stepHistory}
          setSteps={this.handleStepsChange}
        />
        <div className='etl-walkthrough-spacer'/>
      </div>
    );
  }

  public handleStepsChange(newStep: number, newHistory: List<ViewState>)
  {
    const { walkthrough } = this.props;
    const currentStep = this.getStepFromRoute();

    if (newHistory.last() === ViewState.Finish)
    {
      // TODO: create a template and change the route
    }

    let newState = walkthrough;
    if (walkthrough.stepHistory !== newHistory)
    {
      newState = newState.set('stepHistory', newHistory);
    }
    if (newStep !== currentStep)
    {
      browserHistory.push(`/etl/new/${newStep}`);
    }
    this.props.act({
      actionType: 'setWalkthroughState',
      newState,
    });
  }

  // if the step is invalid or doesn't exist then return 0
  public getStepFromRoute(fixBadRoute = false)
  {
    const { params, walkthrough } = this.props;
    if (params != null && params.step != null)
    {
      const val = Number(params.step);
      const isInvalid = isNaN(val) || val < 0 || val >= walkthrough.stepHistory.size;
      if (!isInvalid)
      {
        return val;
      }
    }
    if (fixBadRoute)
    {
      browserHistory.push(`/etl/new/0`);
    }
    return 0;

  }
}

export default Util.createContainer(
  ETLWalkthrough,
  ['walkthrough'],
  { act: WalkthroughActions },
);

export const walkthroughGraph: WalkthroughGraphType<ViewState> =
{
  [ViewState.Start]: {
    prompt: 'What Would You Like to Do?',
    options: [
      {
        link: ViewState.Export,
        buttonText: 'Export a File',
      },
      {
        link: ViewState.Import,
        buttonText: 'Import a File',
      },
    ],
  },
  // Export
  [ViewState.Export]: {
    prompt: 'Export a File',
    crumbText: 'Export',
    options: [
      {
        link: ViewState.PickExportAlgorithm,
        buttonText: 'Start a New Export',
      },
      {
        link: ViewState.PickExportTemplate,
        buttonText: 'Use an Existing Export',
      },
    ],
  },
  [ViewState.PickExportTemplate]: {
    prompt: 'Select a Saved Export Template',
    crumbText: 'Select Template',
    options: [
      {
        link: ViewState.Review,
        component: null,
      },
    ],
  },
  [ViewState.PickExportAlgorithm]: {
    prompt: 'Select an Algorithm to Export From',
    crumbText: 'Select Algorithm',
    options: [
      {
        link: ViewState.ExportDestination,
        component: null,
      },
    ],
  },
  [ViewState.ExportDestination]: {
    prompt: 'Where Would You Like the Results?',
    crumbText: 'Destination Type',
    additionalText: 'You can always change this later',
    options: [
      {
        link: ViewState.Review,
        buttonText: 'Download The Results',
        default: true,
      },
      {
        link: ViewState.PickExportDestination,
        buttonText: 'Send to a Custom Destination',
      },
    ],
  },
  [ViewState.PickExportDestination]: {
    prompt: 'Select an Export Destination',
    crumbText: 'Export Destination',
    options: [
      {
        link: ViewState.Review,
        component: null,
      },
    ],
  },
  // Import
  [ViewState.Import]: {
    prompt: 'Import a File',
    crumbText: 'Import',
    options: [
      {
        link: ViewState.NewImport,
        buttonText: 'Start a New Import',
      },
      {
        link: ViewState.PickImportTemplate,
        buttonText: 'Use an Existing Import',
      },
    ],
  },
  [ViewState.PickImportTemplate]: {
    prompt: 'Select a Saved Import Template',
    crumbText: 'Select Template',
    options: [
      {
        link: ViewState.Review,
        component: null,
      },
    ],
  },
  [ViewState.NewImport]: {
    prompt: 'What Would You Like to Import?',
    crumbText: 'Source Type',
    options: [
      {
        link: ViewState.PickLocalFile,
        buttonText: 'Upload a File to Import',
        default: true,
      },
      {
        link: ViewState.PickImportSource,
        buttonText: 'Import From an External Source',
      },
    ],
  },
  [ViewState.PickLocalFile]: {
    prompt: '',
    crumbText: 'Upload File',
    options: [
      {
        link: ViewState.PickDatabase,
        component: ETLUploadStep,
        onRevert: ETLUploadStep.onRevert,
      },
    ],
  },
  [ViewState.PickImportSource]: {
    prompt: 'Select a Source to Import From',
    crumbText: 'Select Source',
    options: [
      {
        link: ViewState.PickDatabase,
        component: null,
      },
    ],
  },
  [ViewState.PickDatabase]: {
    prompt: 'Choose a Database to Import Into',
    crumbText: 'Select Database',
    options: [
      {
        link: ViewState.Review,
        component: null,
      },
    ],
  },
  [ViewState.Review]: {
    prompt: 'Review Details',
    crumbText: 'Review',
    options: [
      {
        link: ViewState.Finish,
        component: null,
      },
    ],
  },
};
const WalkthroughComponentClass = walkthroughFactory<ViewState>(walkthroughGraph);
