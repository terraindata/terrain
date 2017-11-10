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
import TerrainStore from 'store/TerrainStore';
import Util from '../../../../util/Util';
import BuilderActions from '../../../data/BuilderActions';
import PathfinderCreateLine from '../PathfinderCreateLine';
import { _ScoreLine, Path, Score, Source } from '../PathfinderTypes';
import PathfinderScoreLine from './PathfinderScoreLine';
import DragHandle from 'app/common/components/DragHandle';
import DragAndDrop from 'app/common/components/DragAndDrop';

export interface Props
{
  score: Score;
  source: Source;
  step: string;
  canEdit: boolean;
  keyPath: KeyPath;
}

class PathfinderSourceSection extends TerrainComponent<Props>
{
  public state: {
    allWeights: Array<{ weight: number }>;
  } = {
    allWeights: [],
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
    const newLines = this.props.score.lines.delete(index);
    BuilderActions.change(this.props.keyPath.push('lines'), newLines);
    this.updateWeights(newLines);
  }

  public handleAddScoreLine()
  {
    const newLines = this.props.score.lines.push(_ScoreLine());
    BuilderActions.change(this.props.keyPath.push('lines'), newLines);
    this.updateWeights(newLines);
  }

  public handleValueChange(key, index, value)
  {
    const newLine = this.props.score.lines.get(index).set(key, value);
    const newLines = this.props.score.lines.set(index, newLine);
    BuilderActions.change(this.props.keyPath.push('lines'), newLines);
    if (key === 'weight')
    {
      this.updateWeights(newLines);
    }
  }

  public getScoreLines(scoreLines)
  {
    const dropdownOptions = this.props.score.getTransformDropdownOptions((TerrainStore.getState() as any).get('schema'));
    const keyPath = this.props.keyPath.push('lines');
    return (
        scoreLines.map((line, index) =>
        {
          return (
          { content: <PathfinderScoreLine
              key={index}
              line={line}
              step={this.props.step}
              source={this.props.source}
              onDelete={this.handleDeleteLine}
              index={index}
              onValueChange={this.handleValueChange}
              canEdit={this.props.canEdit}
              keyPath={keyPath.push(index)}
              allWeights={this.state.allWeights}
              dropdownOptions={dropdownOptions}
            />,
            key: index,
            draggable: true,
            dragHandle: <DragHandle/>,
            dragHandleStyle: {'padding-top': '8px'}
          }
          );
        }).toList()
    );
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
    const { source, step } = this.props;
    const lines = this.getScoreLines(this.props.score.lines);
    return (
      <div
        className='pf-section'
      >
        <div className='pf-section-title'>{PathfinderText.scoreStepTitle}</div>
        <div className='pf-section-subtitle'>{PathfinderText.scoreStepSubtitle}</div>
        <DragAndDrop
          draggableItems={lines}
        />
        <PathfinderCreateLine
          canEdit={this.props.canEdit}
          onCreate={this.handleAddScoreLine}
          text={PathfinderText.createScoreLine}
        />

      </div>
    );
  }
}

export default PathfinderSourceSection;
