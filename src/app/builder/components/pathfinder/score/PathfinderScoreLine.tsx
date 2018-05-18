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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import TransformCard from 'app/builder/components/charts/TransformCard';
import ExpandIcon from 'app/common/components/ExpandIcon';
import LinearSelector from 'app/common/components/LinearSelector';
import { BuilderState } from 'builder/data/BuilderState';
import Util from 'util/Util';
import BuilderTextbox from '../../../../common/components/BuilderTextbox';
import Dropdown from '../../../../common/components/Dropdown';
import SearchableDropdown from '../../../../common/components/SearchableDropdown';
import ScoreBar from '../../charts/ScoreBar';
import TransformChartPreviewWrapper from '../../charts/TransformChartPreviewWrapper';
import PathfinderLine from '../PathfinderLine';
import { ChoiceOption, Path, PathfinderContext, Score, ScoreLine, Source } from '../PathfinderTypes';
import BuilderActions from './../../../data/BuilderActions';
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
  index: number;
  onDelete: (index) => void;
  onValueChange: (key: string, index: number, newValue: any) => void;
  allWeights: Array<{ weight: number }>;
  keyPath: KeyPath;
  dropdownOptions: List<ChoiceOption>;
  pathfinderContext: PathfinderContext;

  builder?: BuilderState;
  builderActions?: typeof BuilderActions;
}

const EditableField = (props) =>
  props.editing ? props.editComponent : props.readOnlyComponent;

class PathfinderScoreLine extends TerrainComponent<Props>
{
  public state: {
    weight: number;
    expanded: boolean;
    fieldIndex: number;
    editingField: boolean;
  } = {
      weight: this.props.line.weight,
      expanded: this.props.line.expanded,
      fieldIndex: this.props.dropdownOptions.map((v) => v.value).toList().indexOf(this.props.line.field),
      editingField: false,
    };

  public componentWillReceiveProps(nextProps)
  {
    if (this.props.line !== nextProps.line || !_.isEqual(nextProps.dropdownOptions, this.props.dropdownOptions))
    {
      const weight = nextProps.line.weight;
      this.setState({
        fieldIndex: nextProps.dropdownOptions.map((v) => v.value).toList().indexOf(nextProps.line.field),
        weight: weight !== '' ? parseInt(weight, 10) : 0,
        expanded: nextProps.line.expanded,
      });
    }
  }

  public handleExpandedChange(expanded)
  {
    if (!this.props.line.field)
    {
      return;
    }
    this.props.onValueChange('expanded', this.props.index, expanded);
  }

  public handleTransformModeChange(index)
  {
    const options = ['linear', 'logarithmic', 'exponential', 'normal', 'sigmoid'];
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'transformData', 'mode'), options[index]);
  }

  public handleFieldChange(index)
  {
    const value = this.props.dropdownOptions.map((v) => v.value).toList().get(index);
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'field'), value, false, true);
    this.setState((state) => ({ editingField: false }));
  }

  public renderTransformChart()
  {
    const { line, pathfinderContext } = this.props;
    const data = {
      input: line.field,
      domain: line.transformData.domain,
      hasCustomDomain: line.transformData.hasCustomDomain,
      scorePoints: line.transformData.scorePoints,
      visiblePoints: line.transformData.visiblePoints,
      static: {
        colors: [Colors().builder.cards.categories.score, Colors().bg3],
      },
      mode: line.transformData.mode,
      dataDomain: line.transformData.dataDomain,
      closed: !line.expanded,
      autoBound: line.transformData.autoBound,
    };
    return (
      <div
        className='pf-score-line-transform'
        style={backgroundColor(Colors().blockBg)}
      >
        <LinearSelector
          options={List(['linear', 'logarithmic', 'exponential', 'normal', 'sigmoid'])}
          selected={line.transformData.mode}
          keyPath={this._ikeyPath(this.props.keyPath, 'transformData', 'mode')}
          action={this.props.builderActions.changePath}
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
          builderState={this.props.builder}
          canEdit={pathfinderContext.canEdit}
          className={'builder-comp-list-item'}
          data={data}
          handleCardDrop={undefined}
          helpOn={undefined}
          keyPath={this._ikeyPath(this.props.keyPath, 'transformData')}
          language={'elastic'}
          onChange={this.props.builderActions.changePath}
          parentData={undefined}
          index={(pathfinderContext.source.dataSource as any).index}
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

  public editingField()
  {
    this.setState((state) => ({ editingField: true }));
  }

  public handleWeightChange(value: number)
  {
    this.setState((state) => ({ weight: value }));
  }

  public handleWeightAfterChange(value: number)
  {
    const { keyPath } = this.props;

    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'weight'), value);
  }

  public renderExpandIcon()
  {
    const { line } = this.props;
    return (
      <div style={line.field ? {} : { opacity: 0 }}>
        <ExpandIcon
          open={line.expanded && line.field !== undefined && line.field !== ''}
          onClick={this._fn(this.handleExpandedChange, !line.expanded)}
        />
      </div>
    );
  }

  public handleDropdownClose()
  {
    this.setState({
      editingField: false,
    });
  }

  public renderLineContents()
  {
    const { fieldIndex } = this.state;
    return (
      <div
        className='pf-line pf-score-line-inner'
      >
        {this.renderExpandIcon()}
        <EditableField
          editing={this.state.editingField || fieldIndex === -1}
          editComponent={
            <SearchableDropdown
              options={this.props.dropdownOptions.map((v) => v.displayName as string).toList()}
              selectedIndex={fieldIndex}
              canEdit={this.props.pathfinderContext.canEdit}
              placeholder={'Field...'}
              onChange={this.handleFieldChange}
              width={fieldIndex > -1 ? '33.33%' : '100%'}
              open={this.state.editingField || fieldIndex === -1}
              onClose={this.handleDropdownClose}
            />
          }
          readOnlyComponent={
            <div className='field-name' onClick={this.editingField}>
              {this.props.dropdownOptions.get(fieldIndex).displayName as string}
            </div>
          }
        />

        {
          fieldIndex > -1 ?
            (
              <div style={getStyle('width', '66.66%')} >
                <ScoreBar
                  weight={this.state.weight}
                  onChange={this.handleWeightChange}
                  canEdit={this.props.pathfinderContext.canEdit}
                  onAfterChange={this.handleWeightAfterChange}
                />
              </div>
            ) : null
        }

        {
          this.props.line.field &&
          this.renderTransformChartPreview()
        }
      </div>
    );
  }

  public render()
  {
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
        expanded={this.props.line.expanded}
        style={_.extend({}, borderColor(Colors().blockBg), backgroundColor(Colors().fontWhite))}
        expandableContent={expandableContent}
      />
    );
  }
}

export default Util.createTypedContainer(
  PathfinderScoreLine,
  ['builder'],
  {
    builderActions: BuilderActions,
  },
);
