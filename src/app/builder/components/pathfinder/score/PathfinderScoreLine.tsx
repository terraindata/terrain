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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import LinearSelector from 'app/common/components/LinearSelector';
import BuilderTextbox from '../../../../common/components/BuilderTextbox';
import Dropdown from '../../../../common/components/Dropdown';
import SearchableDropdown from '../../../../common/components/SearchableDropdown';
import ScoreBar from '../../charts/ScoreBar';
import TransformCard from '../../charts/TransformCard';
import TransformChartPreviewWrapper from '../../charts/TransformChartPreviewWrapper';
import PathfinderLine from '../PathfinderLine';
import { ChoiceOption, Path, PathfinderContext, Score, ScoreLine, Source } from '../PathfinderTypes';
import BuilderActions from './../../../data/BuilderActions';
import { BuilderStore } from './../../../data/BuilderStore';
const SigmoidIcon = require('images/icon_sigmoid.svg?name=SigmoidIcon');
const LinearIcon = require('images/icon_linear.svg?name=LinearIcon');
const ExponentialIcon = require('images/icon_exponential.svg?name=ExponentialIcon');
const LogarithmicIcon = require('images/icon_logarithmic.svg?name=LogarithmicIcon');
const NormalIcon = require('images/icon_normal.svg?name=NormalIcon');
const CloseIcon = require('images/icon_close_8x8.svg?name=CloseIcon');
const ArrowIcon = require('images/icon_arrow.svg?name=ArrowIcon');

export interface Props
{
  line: ScoreLine;
  step: string;
  index: number;
  onDelete: (index) => void;
  onValueChange: (key: string, index: number, newValue: any) => void;
  allWeights: Array<{ weight: number }>;
  keyPath: KeyPath;
  animateScoreBars?: boolean;
  onAnimateScoreBars?: () => void;
  dropdownOptions: List<ChoiceOption>;
  pathfinderContext: PathfinderContext;
}

class PathfinderScoreLine extends TerrainComponent<Props>
{
  public state: {
    weight: number;
    expanded: boolean;
    fieldIndex: number;
  } = {
      weight: this.props.line.weight,
      expanded: this.props.line.expanded,
      fieldIndex: this.props.dropdownOptions.map((v) => v.displayName).toList().indexOf(this.props.line.field),
    };

  public componentWillReceiveProps(nextProps)
  {
    if (this.props.line !== nextProps.line)
    {
      this.setState({
        fieldIndex: nextProps.dropdownOptions.map((v) => v.displayName).toList().indexOf(nextProps.line.field),
        weight: nextProps.line.weight,
        expanded: nextProps.line.expanded,
      });
    }
  }

  public handleExpandedChange(expanded)
  {
    this.props.onValueChange('expanded', this.props.index, expanded);
  }

  public handleTransformModeChange(index)
  {
    const options = ['linear', 'logarithmic', 'exponential', 'normal', 'sigmoid'];
    BuilderActions.changePath(this.props.keyPath.push('transformData').push('mode'), options[index]);
  }

  public handleFieldChange(index)
  {
    const value = this.props.dropdownOptions.map((v) => v.displayName).toList().get(index);
    BuilderActions.changePath(this.props.keyPath.push('field'), value, false, true);
  }

  public renderTransformChart()
  {
    const { line, pathfinderContext } = this.props;
    const data = {
      input: line.field,
      domain: line.transformData.domain,
      hasCustomDomain: false,
      scorePoints: line.transformData.scorePoints,
      static: {
        colors: [Colors().builder.cards.categories.score, Colors().bg3],
      },
      mode: line.transformData.mode,
      dataDomain: line.transformData.dataDomain,
    };

    return (
      <div className='pf-score-line-transform'>
        <LinearSelector
          options={List(['linear', 'logarithmic', 'exponential', 'normal', 'sigmoid'])}
          selected={line.transformData.mode}
          keyPath={this.props.keyPath.push('transformData').push('mode')}
          action={BuilderActions.changePath}
          canEdit={pathfinderContext.canEdit}
          displayNames={Map({
            linear: 'Linear',
            logarithmic: 'Logarithmic',
            exponential: 'Exponential',
            normal: 'Bell-Curve',
            sigmoid: 'S-Curve',
          })}
        />
        <TransformCard
          builderState={BuilderStore.getState()}
          canEdit={pathfinderContext.canEdit}
          className={'builder-comp-list-item'}
          data={data}
          handleCardDrop={undefined}
          helpOn={undefined}
          keyPath={this.props.keyPath.push('transformData')}
          language={'elastic'}
          onChange={BuilderActions.changePath}
          parentData={undefined}
          index={pathfinderContext.source.dataSource.name}
        />
      </div>);
  }

  public renderTransformChartPreview()
  {
    return (
      <div className='pf-score-line-expand'>
        <div className='pf-score-line-transform-preview'>
          <TransformChartPreviewWrapper
            points={this.props.line.transformData.scorePoints}
            domain={this.props.line.transformData.domain}
            range={List([0, 1])}
            height={25}
            width={33}
            mode={this.props.line.transformData.mode}
          />
        </div>
      </div>
    );
  }

  public renderLineContents()
  {
    return (
      <div className='pf-line pf-score-line-inner'>
        <ScoreBar
          parentData={{ weights: this.props.allWeights }}
          data={{ weight: this.state.weight }}
          keyPath={this.props.keyPath.push('weight')}
          noAnimation={!this.props.animateScoreBars}
        />
        <BuilderTextbox
          keyPath={this.props.keyPath.push('weight')}
          value={this.props.line.weight}
          language={'elastic'}
          canEdit={this.props.pathfinderContext.canEdit}
          placeholder={'weight'}
          isNumber={true}
          autoDisabled={true}
          onChange={this.props.onAnimateScoreBars}
          action={BuilderActions.changePath}
        />
        <span className='pf-score-line-text'>times</span>
        <SearchableDropdown
          options={this.props.dropdownOptions.map((v) => v.displayName).toList()}
          selectedIndex={this.state.fieldIndex}
          canEdit={this.props.pathfinderContext.canEdit}
          placeholder={'Field...'}
          onChange={this.handleFieldChange}
        />
        {
          this.props.line.field &&
          <div
            className={this.props.line.expanded ?
              'pf-score-line-transform-arrow-open' :
              'pf-score-line-transform-arrow-closed'}
          >
            <div
              className={this.props.line.expanded ?
                'pf-score-line-transform-arrow-inner-open' :
                'pf-score-line-transform-arrow-inner-closed'}
            />
          </div>
        }
        {
          !this.props.line.expanded ?
            this.renderTransformChartPreview() :
            null
        }
      </div>
    );
  }

  public render()
  {
    const { step } = this.props;
    const expandableContent = this.props.line.field ?
      this.renderTransformChart() : null;
    return (
      <PathfinderLine
        canDrag={true}
        canDelete={this.props.pathfinderContext.canEdit}
        canEdit={this.props.pathfinderContext.canEdit}
        children={this.renderLineContents()}
        onDelete={this.props.onDelete}
        index={this.props.index}
        onExpand={this.handleExpandedChange}
        expanded={this.props.line.expanded}
        expandableContent={expandableContent}
        expandButton={<div
          className={classNames({
            'pf-score-line-arrow': true,
            'pf-score-line-arrow-open': this.props.line.expanded,
          })}
          style={this.props.line.expanded ? getStyle('fill', Colors().active)
            : getStyle('fill', Colors().iconColor)}
        >
          <ArrowIcon />
        </div>}
      />
    );
  }
}

export default PathfinderScoreLine;
