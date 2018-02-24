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
// tslint:disable:no-var-requires max-classes-per-file no-console

import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';

import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import './Walkthrough.less';

export interface WalkthroughProps<ViewEnum, Context>
{
  context: Context; // passed to custom components to help them display
  stepIndex: number; // current position in the step history
  stepHistory: List<ViewEnum>;
  setSteps: (newStep: number, newHistory: List<ViewEnum>) => void;
}

export interface ComponentProps<Context>
{
  context: Context;
  onDone: () => void;
}

export type WalkthroughComponentClass<Context> = React.ComponentClass<ComponentProps<Context>>;

export interface WalkthroughNodeOption<ViewEnum, Context>
{
  link: ViewEnum; // What ViewEnum to go to next
  buttonText?: string; // if it's a simple button, what does it say?
  component?: WalkthroughComponentClass<Context>; // if it's a custom ui interaction, what component to use
  default?: boolean;
}

export interface WalkthroughGraphNode<ViewEnum extends string, Context>
{
  prompt: string; // the main prompt to give to the user
  crumbText?: string; // the text that shows up in the breadcrumbs
  additionalText?: string; // a subtitle for the prompt
  options: Array<WalkthroughNodeOption<ViewEnum, Context>>;
}

export interface WalkthroughGraphType<ViewEnum extends string, Context>
{
  [k: string]: WalkthroughGraphNode<ViewEnum, Context>;
}

export function walkthroughFactory<ViewEnum extends string, Context>(graph: WalkthroughGraphType<ViewEnum, Context>)
{
  // TODO. Perform an integrity check of the provided graph to make sure it is a single DAG
  class Walkthrough extends TerrainComponent<WalkthroughProps<ViewEnum, Context>>
  {
    public renderOption(option: WalkthroughNodeOption<ViewEnum, Context>, index)
    {
      const buttonText = option.buttonText != null ?
        option.buttonText :
        'Next';
      // add the text 'or' in between buttons or elements
      const orText = index % 2 === 0 ? null :
        <div
          key={`or ${index}`}
          className='walkthrough-or-element'
        >
          Or
        </div>;

      if (option.component != null)
      {
        const ComponentClass = option.component;
        return ([
          <ComponentClass
            key={index}
            context={this.props.context}
            onDone={this.handleMoveToNextFactory(option.link)}
          />,
        ]);
      }
      else
      {
        return ([
          orText,
          <RadiumQuarantine>
            <div
              key={index}
              style={buttonStyle}
              className='walkthrough-option-button'
              onClick={this.handleMoveToNextFactory(option.link)}
            >
              <div className='walkthrough-option-button-text'>
                {buttonText}
              </div>
            </div>
          </RadiumQuarantine>,
        ]);
      }
    }

    public renderNode(node: WalkthroughGraphNode<ViewEnum, Context>)
    {
      return (
        <div className='walkthrough-step-view'>
          <div className='walkthrough-step-prompt'>
            { node.prompt }
          </div>
          <div className='walkthrough-additional-text'>
            { node.additionalText }
          </div>
          <div className='walkthrough-options'>
            { node.options.map(this.renderOption) }
          </div>
        </div>
      );
    }

    public render()
    {
      const { stepIndex, stepHistory } = this.props;
      const currentStep = stepHistory.get(stepIndex);
      const graphNode = graph[currentStep];
      return (
        <div className='walkthrough-root'>
          {
            graphNode != null ?
              this.renderNode(graphNode) :
              null
          }
        </div>
      );
    }

    public handleMoveToNextFactory(link: ViewEnum)
    {
      return () => {
        const { stepIndex, stepHistory } = this.props;
        if (stepIndex < stepHistory.size - 1) // not on the most recent step
        {
          // if link is to a different step then the next step, then we should overwrite history
          const nextStepInHistory = stepHistory.get(stepIndex + 1);
          if (link === nextStepInHistory)
          {
            this.props.setSteps(stepIndex + 1, stepHistory);
          }
          else
          {
            const nextHistory = stepHistory.slice(0, stepIndex + 1).toList().push(link);
            this.props.setSteps(stepIndex + 1, nextHistory);
          }
        }
        else
        {
          const nextHistory = stepHistory.push(link);
          this.props.setSteps(stepIndex + 1, nextHistory);
        }
      };
    }
  }
  return Walkthrough;
}

const buttonStyle = [
  backgroundColor(Colors().active, Colors().activeHover),
  fontColor(Colors().activeText),
];

// very simple passthrough component to prevent unnecessary re-renders
// and prevent some subtle radium event handler bugs
@Radium
class RadiumQuarantine extends React.Component
{
  public render()
  {
    return this.props.children;
  }
}
