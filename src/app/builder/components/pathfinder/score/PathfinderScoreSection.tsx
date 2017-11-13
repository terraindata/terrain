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
import Util from '../../../../util/Util';
import BuilderActions from '../../../data/BuilderActions';
import PathfinderCreateLine from '../PathfinderCreateLine';
import PathfinderSectionTitle from '../PathfinderSectionTitle';
import { _ScoreLine, Path, PathfinderContext, Score, Source } from '../PathfinderTypes';
import PathfinderScoreLine from './PathfinderScoreLine';

export interface Props
{
  pathfinderContext: PathfinderContext;
  score: Score;
  keyPath: KeyPath;
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
    BuilderActions.change(this.props.keyPath.push('lines'), newLines);
  }

  public handleAddScoreLine()
  {
    this.handleAnimateScoreBars();
    const newLines = this.props.score.lines.push(_ScoreLine());
    BuilderActions.change(this.props.keyPath.push('lines'), newLines);
  }

  public handleValueChange(key, index, value)
  {
    this.handleAnimateScoreBars();
    const newLine = this.props.score.lines.get(index).set(key, value);
    const newLines = this.props.score.lines.set(index, newLine);
    BuilderActions.change(this.props.keyPath.push('lines'), newLines);
  }

  public handleAnimateScoreBars()
  {
    this.setState({
      animateScoreBars: true,
    });
  }

  public getScoreLines(scoreLines)
  {
    const { source, step, canEdit, schemaState } = this.props.pathfinderContext;
    let dropdownOptions = List([]);
    console.log(source.dataSource);
    console.log(source.dataSource.getChoiceOptions);
    if (source.dataSource.getChoiceOptions !== undefined)
    {
     dropdownOptions = source.dataSource.getChoiceOptions({
      type: 'transformFields',
      source,
      schemaState,
    });
    }
    const keyPath = this.props.keyPath.push('lines');

    return (
      scoreLines.map((line, index) =>
      {
        return (
          {
            content: <PathfinderScoreLine
              key={index}
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
            key: index,
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
    BuilderActions.change(this.props.keyPath.push('lines'), newLines);
  }

  public handleDragStart()
  {
    this.setState({
      animateScoreBars: false,
    });
  }

  public renderTitle()
  {
    return (
      <div>
        I want to sort my data using the following factors:
      </div>
    );
  }

  public render()
  {
    const { source, step, canEdit } = this.props.pathfinderContext;
    const lines = this.getScoreLines(this.props.score.lines);
    return (
      <div
        className='pf-section'
      >
        <PathfinderSectionTitle
          title={PathfinderText.scoreSectionTitle}
          text={PathfinderText.scoreSectionSubtitle}
        />
        <DragAndDrop
          draggableItems={lines}
          onDrop={this.handleLinesReorder}
          onDragStart={this.handleDragStart}
          className='drag-drop-pf-score'
        />
        <PathfinderCreateLine
          canEdit={canEdit}
          onCreate={this.handleAddScoreLine}
          text={PathfinderText.createScoreLine}
        />
      </div>
    );
  }
}

export default PathfinderScoreSection;
