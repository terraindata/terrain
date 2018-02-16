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
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import PathfinderText from 'app/builder/components/pathfinder/PathfinderText';
import DragAndDrop from 'app/common/components/DragAndDrop';
import DragHandle from 'app/common/components/DragHandle';
import Dropdown from 'app/common/components/Dropdown';
import Util from '../../../../util/Util';
import BuilderActions from '../../../data/BuilderActions';
import PathfinderCreateLine from '../PathfinderCreateLine';
import PathfinderLine from '../PathfinderLine';
import PathfinderSectionTitle from '../PathfinderSectionTitle';
import { _ScoreLine, Path, PathfinderContext, PathfinderSteps, Score, ScoreLine, Source } from '../PathfinderTypes';
import PathfinderScoreLine from './PathfinderScoreLine';
import './PathfinderScoreStyle.less';

export interface Props
{
  pathfinderContext: PathfinderContext;
  score: Score;
  keyPath: KeyPath;
  onStepChange: (oldStep: PathfinderSteps) => void;
  step: PathfinderSteps;

  builderActions?: typeof BuilderActions;
}

class PathfinderScoreSection extends TerrainComponent<Props>
{
  public state: {
    allWeights: Array<{ weight: number }>;
    animateScoreBars: boolean;
  } = {
      allWeights: [],
      animateScoreBars: true,
    };

  public componentWillMount()
  {
    this.updateWeights(this.props.score.lines);
  }

  public componentWillReceiveProps(nextProps)
  {
    if (nextProps.score !== this.props.score)
    {
      this.updateWeights(nextProps.score.lines);
    }
  }

  public updateWeights(lines)
  {
    const allWeights = lines.toJS().map((line) =>
    {
      return { weight: line.weight };
    });
    this.setState({
      allWeights,
    });
  }

  public handleDeleteLine(index)
  {
    this.handleAnimateScoreBars();
    const newLines = this.props.score.lines.delete(index);
    this.props.builderActions.changePath(this.props.keyPath.push('lines'), newLines);
  }

  public handleAddScoreLine()
  {
    this.handleAnimateScoreBars();
    const newLines = this.props.score.lines.push(_ScoreLine());
    this.props.builderActions.changePath(this.props.keyPath.push('lines'), newLines);
  }

  public handleValueChange(key, index, value)
  {
    this.handleAnimateScoreBars();
    const newLine = this.props.score.lines.get(index).set(key, value);
    const newLines = this.props.score.lines.set(index, newLine);
    this.props.builderActions.changePath(this.props.keyPath.push('lines'), newLines);
  }

  public handleAnimateScoreBars()
  {
    this.setState({
      animateScoreBars: true,
    });
  }

  public renderLinearLineContents(line: ScoreLine, dropdownOptions, index)
  {
    return (
      <div className='pf-linear-score-line'>
        <Dropdown
          options={dropdownOptions.map((option) => option.displayName)}
          selectedIndex={dropdownOptions.map((option) => option.displayName).indexOf(line.field)}
          canEdit={this.props.pathfinderContext.canEdit}
          keyPath={this.props.keyPath.push('lines').push(index).push('field')}
          action={this.props.builderActions.changePath}
        />
        <Dropdown
          options={List(['asc', 'desc'])}
          optionsDisplayName={Map({ asc: 'ascending', desc: 'descending' })}
          selectedIndex={List(['asc', 'desc']).indexOf(line.sortOrder)}
          canEdit={this.props.pathfinderContext.canEdit}
          keyPath={this.props.keyPath.push('lines').push(index).push('sortOrder')}
          action={this.props.builderActions.changePath}
        />
      </div>
    );
  }

  public getLinearScoreLines(scoreLines)
  {
    const { source, step, canEdit, schemaState, builderState } = this.props.pathfinderContext;
    let dropdownOptions = List([]);
    if (source.dataSource.getChoiceOptions !== undefined)
    {
      dropdownOptions = source.dataSource.getChoiceOptions({
        type: 'fields',
        source,
        schemaState,
        builderState,
      });
    }
    return (
      scoreLines.map((line, index) =>
      {
        return {
          content: <PathfinderLine
            children={this.renderLinearLineContents(line, dropdownOptions, index)}
            index={index}
            canDrag={true}
            canEdit={canEdit}
            canDelete={canEdit}
            onDelete={this.handleDeleteLine}
          />,
          key: String(index),
          draggable: true,
          dragHandle: <DragHandle />,
          dragHandleStyle: { 'padding-top': '8px' },
        };
      })
    );
  }

  public getScoreLines(scoreLines)
  {
    const { source, step, canEdit, schemaState, builderState } = this.props.pathfinderContext;
    let dropdownOptions = List([]);
    if (source.dataSource.getChoiceOptions !== undefined)
    {
      dropdownOptions = source.dataSource.getChoiceOptions({
        type: 'transformFields',
        source,
        schemaState,
        builderState,
      });
    }
    const keyPath = this.props.keyPath.push('lines');

    return (
      scoreLines.map((line, index) =>
      {
        return (
          {
            content: <PathfinderScoreLine
              key={String(index)}
              line={line}
              step={step}
              onDelete={this.handleDeleteLine}
              index={index}
              onValueChange={this.handleValueChange}
              keyPath={keyPath.push(index)}
              allWeights={this.state.allWeights}
              dropdownOptions={dropdownOptions}
              animateScoreBars={this.state.animateScoreBars}
              onAnimateScoreBars={this.handleAnimateScoreBars}
              pathfinderContext={this.props.pathfinderContext}
            />,
            key: String(index),
            draggable: true,
            dragHandle: <DragHandle />,
            dragHandleStyle: { 'padding-top': '8px' },
          }
        );
      }).toList()
    );
  }

  public handleLinesReorder(items)
  {
    const newOrder = items.map((line) => line.key);
    const newLines = newOrder.map((index) =>
    {
      return this.props.score.lines.get(index);
    });
    this.props.builderActions.changePath(this.props.keyPath.push('lines'), newLines);
  }

  public handleDragStart()
  {
    this.setState({
      animateScoreBars: false,
    });
  }

  public handleStepChange()
  {
    if (this.props.step === PathfinderSteps.Score)
    {
      this.props.onStepChange(this.props.step);
    }
  }

  public render()
  {
    const { source, step, canEdit } = this.props.pathfinderContext;
    const types = _.keys(PathfinderText.scoreSectionTypes);
    const typeDisplayNames = {};
    types.forEach((type) =>
    {
      typeDisplayNames[type] = PathfinderText.scoreSectionTypes[type].title;
    });
    return (
      <div
        className='pf-section'
      >
        <PathfinderSectionTitle
          title={PathfinderText.scoreSectionTitle}
          text={PathfinderText.scoreSectionSubtitle}
        />
        <div className='pf-score-section-type'>
          Score Type:
          <Dropdown
            options={List(types)}
            optionsDisplayName={Map(typeDisplayNames)}
            selectedIndex={types.indexOf(this.props.score.type)}
            keyPath={this.props.keyPath.push('type')}
            tooltips={List(types.map((type) => PathfinderText.scoreSectionTypes[type].tooltip))}
            canEdit={canEdit}
            action={this.props.builderActions.changePath}
          />
        </div>
        {
          this.props.score.type === 'terrain' || this.props.score.type === 'linear' ?
            <DragAndDrop
              draggableItems={this.props.score.type === 'terrain' ?
                this.getScoreLines(this.props.score.lines) : this.getLinearScoreLines(this.props.score.lines)
              }
              onDrop={this.handleLinesReorder}
              onDragStart={this.handleDragStart}
              className='drag-drop-pf-score'
            />
            :
            null
        }
        {
          this.props.score.type === 'terrain' || this.props.score.type === 'linear' ?
            <PathfinderCreateLine
              canEdit={canEdit}
              onCreate={this.handleAddScoreLine}
              text={PathfinderText.createScoreLine}
            />
            :
            null
        }

        {
          this.props.step === PathfinderSteps.Score &&
          <div
            onClick={this.handleStepChange}
            className='pf-step-button'
          >
            Scoring looks good for now
          </div>
        }
      </div>
    );
  }
}

export default Util.createTypedContainer(
  PathfinderScoreSection,
  [],
  { builderActions: BuilderActions }
);
