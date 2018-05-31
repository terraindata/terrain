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
// tslint:disable:no-var-requires max-classes-per-file no-console

import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';

import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Quarantine from 'util/RadiumQuarantine';
import
{
  ComponentProps,
  WalkthroughComponentClass,
  WalkthroughGraphNode,
  WalkthroughGraphType,
  WalkthroughNodeOption,
  WalkthroughProps,
} from './WalkthroughTypes';

import './Walkthrough.less';

export function walkthroughFactory<ViewEnum, Context = any>(graph: WalkthroughGraphType<ViewEnum, Context>)
{
  // TODO. Perform an integrity check of the provided graph if views is provided
  class Walkthrough extends TerrainComponent<WalkthroughProps<ViewEnum, Context>>
  {
    public renderOption(option: WalkthroughNodeOption<ViewEnum, Context>, index)
    {
      const buttonText = option.buttonText != null ?
        option.buttonText :
        'Next';

      const buttonComponent = (
        <Quarantine>
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
        </Quarantine>
      );

      if (option.component != null)
      {
        const ComponentClass = option.component;
        const extraProps = option.extraProps !== undefined ? option.extraProps : {};
        const customComponent = (
          <div>
            <ComponentClass
              key={index}
              {...extraProps}
              context={this.props.context}
              onDone={this.handleMoveToNextFactory(option.link)}
            />
            {option.componentNeedsButton ? buttonComponent : null}
          </div>
        );
        // TODO style the container
        return (
          [customComponent]
        );
      }
      else
      {
        return ([buttonComponent]);
      }
    }

    public renderNode(node: WalkthroughGraphNode<ViewEnum, Context>)
    {
      return (
        <div
          className='walkthrough-step-view'
          style={backgroundColor(Colors().fadedOutBg)}
        >
          <div className='walkthrough-step-prompt'>
            {node.prompt}
          </div>
          <div className='walkthrough-additional-text'>
            {node.additionalText}
          </div>
          <div className='walkthrough-options'>
            {node.options.map(this.renderOption)}
          </div>
        </div>
      );
    }

    public render()
    {
      const { stepIndex, stepHistory } = this.props;
      const currentStep = stepHistory.get(stepIndex);
      const graphNode = graph[currentStep as any];
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

    public revertLinkOptions(step: ViewEnum)
    {
      const graphNode = graph[step as any];
      graphNode.options.forEach((option, j) =>
      {
        if (option.onRevert != null)
        {
          option.onRevert(this.props.transitionParams);
        }
      });
    }

    public arriveLinkOptions(step: ViewEnum)
    {
      const graphNode = graph[step as any];
      if (graphNode != null)
      {
        graphNode.options.forEach((option, i) =>
        {
          if (option.onArrive != null)
          {
            option.onArrive(this.props.transitionParams);
          }
        });
      }
    }

    public moveToNext(link: ViewEnum)
    {
      const { stepIndex, stepHistory } = this.props;
      if (stepIndex < stepHistory.size - 1) // not on the most recent step
      {
        const nextStepInHistory = stepHistory.get(stepIndex + 1);
        if (link === nextStepInHistory)
        {
          this.props.setSteps(stepIndex + 1, stepHistory);
        }
        else
        {
          // if link is to a different step then the next step, then
          // 1: overwrite the history from this point on and
          // 2: call onRevert for each option that has it defined
          const nextHistory = stepHistory.slice(0, stepIndex + 1).toList().push(link);
          const removedSteps = stepHistory.slice(stepIndex + 1);
          removedSteps.forEach((step, i) =>
          {
            this.revertLinkOptions(step);
          });
          this.props.setSteps(stepIndex + 1, nextHistory);
          this.arriveLinkOptions(link);
        }
      }
      else
      {
        const nextHistory = stepHistory.push(link);
        this.props.setSteps(stepIndex + 1, nextHistory);
        // call onArrive for next options
        this.arriveLinkOptions(link);
      }

    }

    public handleMoveToNextFactory(link: ViewEnum)
    {
      return () => this.moveToNext(link);
    }
  }
  return Walkthrough;
}

const buttonStyle = [
  backgroundColor(Colors().active, Colors().activeHover),
  fontColor(Colors().activeText),
];
