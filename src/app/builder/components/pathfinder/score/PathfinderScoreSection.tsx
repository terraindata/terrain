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
import * as Radium from 'radium';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import PathfinderText from 'app/builder/components/pathfinder/PathfinderText';
import { ColorsActions } from 'app/colors/data/ColorsRedux';
import CheckBox from 'app/common/components/CheckBox';
import DragAndDrop from 'app/common/components/DragAndDrop';
import DragHandle from 'app/common/components/DragHandle';
import Dropdown from 'app/common/components/Dropdown';
import FadeInOut from 'app/common/components/FadeInOut';
import { RouteSelector, RouteSelectorOption, RouteSelectorOptionSet } from 'app/common/components/RouteSelector';
import SingleRouteSelector from 'app/common/components/SingleRouteSelector';
import Util from '../../../../util/Util';
import BuilderActions from '../../../data/BuilderActions';
import PathfinderCreateLine from '../PathfinderCreateLine';
import PathfinderLine from '../PathfinderLine';
import PathfinderSectionTitle from '../PathfinderSectionTitle';
import
{
  _ScoreLine, Path, PathfinderContext, PathfinderSteps, Score, ScoreLine, ScoreType,
  ScoreTypesChoices, Source,
} from '../PathfinderTypes';
import PathfinderScoreLine from './PathfinderScoreLine';
import './PathfinderScoreStyle.less';

export interface Props
{
  pathfinderContext: PathfinderContext;
  score: Score;
  keyPath: KeyPath;
  onStepChange: (oldStep: PathfinderSteps) => void;
  builderActions?: typeof BuilderActions;
  colorsActions?: typeof ColorsActions;
}

@Radium
class PathfinderScoreSection extends TerrainComponent<Props>
{
  public state: {
    allWeights: Array<{ weight: number }>;
  } = {
      allWeights: [],
    };
    
  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: `.pf-section .pf-score-line-transform
      .linear-selector-wrapper .linear-selector-options .linear-selector-option`,
      style: fontColor(Colors().active + ' !important'),
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: `.pf-section .pf-score-line-transform .linear-selector-wrapper
      .linear-selector-options .linear-selector-option-selected`,
      style: fontColor(Colors().fontWhite + ' !important'),
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.pf-section .pf-score-line-inner .dropdown-wrapper',
      style: { background: Colors().fontWhite },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.pf-section .pf-score-line-inner .dropdown-options-wrapper',
      style: { background: Colors().fontWhite },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.pf-section .pf-score-line-inner .dropdown-options-wrapper .dropdown-option',
      style: { background: Colors().fontWhite },
    });
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
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'lines'), newLines);
  }

  public handleAddScoreLine()
  {
    const newLines = this.props.score.lines.push(_ScoreLine());
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'lines'), newLines);
  }

  public handleValueChange(key, index, value)
  {
    const newLine = this.props.score.lines.get(index).set(key, value);
    const newLines = this.props.score.lines.set(index, newLine);
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'lines'), newLines);
  }

  public getOptionSets(): List<RouteSelectorOptionSet>
  {
    const { score, pathfinderContext } = this.props;
    const { source } = pathfinderContext;

    const fieldOptions = source.dataSource.getChoiceOptions({
      type: 'fields',
      subtype: 'transform',
      source,
      schemaState: pathfinderContext.schemaState,
      builderState: pathfinderContext.builderState,
    });

    const fieldSet: RouteSelectorOptionSet = {
      key: 'field',
      options: fieldOptions,
      shortNameText: 'Data Field',
      headerText: '',
      column: true,
      hideSampleData: true,
      hasSearch: true,
    };
    const orderOptions = List([
      {
        displayName: 'ascending',
        value: 'asc',
        sampleData: List([]),
      },
      {
        displayName: 'descending',
        value: 'desc',
        sampleData: List([]),
      },
    ]);
    const orderSet: RouteSelectorOptionSet = {
      key: 'sortOrder',
      options: orderOptions,
      shortNameText: 'Order',
      headerText: '',
      column: true,
      hideSampleData: true,
      hasSearch: false,
    };
    return List([
      fieldSet,
      orderSet,
    ]);
  }

  public handleLinearValueChange(i: number, optionSetIndex: number, value: any)
  {
    const { props } = this;
    const { source } = props.pathfinderContext;
    if (optionSetIndex === 0)
    {
      this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'lines', i, 'field'), value);
    }
    else
    {
      this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'lines', i, 'sortOrder'), value);
    }
  }

  public renderLinearLineContents(line: ScoreLine, index)
  {
    return (
      <div className='pf-linear-score-line'>
        <RouteSelector
          optionSets={this.getOptionSets()}
          values={List([
            line.field,
            line.sortOrder,
          ])}
          onChange={this._fn(this.handleLinearValueChange, index)}
          canEdit={this.props.pathfinderContext.canEdit}
          defaultOpen={line.field === null}
        />
      </div>
    );
  }

  public getLinearScoreLines(scoreLines)
  {
    const { source, step, canEdit, schemaState, builderState } = this.props.pathfinderContext;
    return (
      scoreLines.map((line, index) =>
      {
        return {
          content: <PathfinderLine
            children={this.renderLinearLineContents(line, index)}
            index={index}
            canDrag={true}
            canEdit={canEdit}
            canDelete={canEdit}
            onDelete={this.handleDeleteLine}
            className='pf-linear-score-line-wrapper'
            style={index === 0 ? { marginTop: -4 } : {}}
          />,
          key: String(index),
          draggable: true,
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
        type: 'fields',
        subtype: 'transform',
        source,
        schemaState,
        builderState,
      });
    }
    const keyPath = this._ikeyPath(this.props.keyPath, 'lines');

    return (
      scoreLines.map((line, index) =>
      {
        return (
          {
            content: <PathfinderScoreLine
              key={String(index)}
              line={line}
              onDelete={this.handleDeleteLine}
              index={index}
              onValueChange={this.handleValueChange}
              keyPath={this._ikeyPath(keyPath, index)}
              allWeights={this.state.allWeights}
              dropdownOptions={dropdownOptions}
              pathfinderContext={this.props.pathfinderContext}
            />,
            key: String(index),
            draggable: !line.expanded || !line.field,
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
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'lines'), newLines);
  }

  public handleStepChange()
  {
    const { step } = this.props.pathfinderContext;
    if (step === PathfinderSteps.Score)
    {
      this.props.onStepChange(step);
    }
  }

  public randomizeScore()
  {
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'seed'),
      Math.round(Math.random() * 100));
  }

  public toggleExpanded(expanded)
  {
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'expanded'),
      expanded);
  }

  public render()
  {
    const { pathfinderContext, score } = this.props;
    const { source, step, canEdit } = this.props.pathfinderContext;

    return (
      <div
        className='pf-section pf-score-section'
      >
        <PathfinderSectionTitle
          title={PathfinderText.scoreSectionTitle}
          tooltipText={PathfinderText.scoreSectionSubtitle}
          canExpand={true}
          onExpand={this.toggleExpanded}
          expanded={score.expanded}
          contentCount={score.lines.count()}
        />
        <FadeInOut
          open={score.expanded}
        >
          {
            (score.type === 'terrain' || score.type === 'linear') ?
              <DragAndDrop
                draggableItems={score.type === 'terrain' ?
                  this.getScoreLines(score.lines) : this.getLinearScoreLines(score.lines)
                }
                onDrop={this.handleLinesReorder}
                className='drag-drop-pf-score'
                style={backgroundColor(Colors().blockBg)}
              />
              :
              null
          }
          {
            ((score.type === 'terrain' || score.type === 'linear') && canEdit) ?
              <PathfinderCreateLine
                canEdit={canEdit}
                onCreate={this.handleAddScoreLine}
                text={PathfinderText.createScoreLine}
              />
              :
              null
          }
          {
            score.type === 'random' &&
            <div
              className='pf-score-randomize-button'
              onClick={this.randomizeScore}
              style={[
                fontColor(Colors().fontWhite),
                backgroundColor(Colors().active),
              ]}
            >
              Randomize
            </div>
          }
        </FadeInOut>
      </div>
    );
  }

  private handleScoreTypeChange(value: ScoreType)
  {
    this.props.builderActions.changePath(
      this._ikeyPath(this.props.keyPath, 'type'),
      value,
    );
  }
}

export default Util.createTypedContainer(
  PathfinderScoreSection,
  [],
  {
    builderActions: BuilderActions,
    colorsActions: ColorsActions,
  },
);
