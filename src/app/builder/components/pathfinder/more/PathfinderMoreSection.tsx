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
import * as React from 'react';
import { Colors, getStyle } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List } = Immutable;
import { ColorsActions } from 'app/colors/data/ColorsRedux';
import FloatingInput from 'app/common/components/FloatingInput';
import { tooltip } from 'app/common/components/tooltip/Tooltips';
import Util from 'app/util/Util';
import BuilderActions from '../../../data/BuilderActions';
import PathfinderArea from '../PathfinderArea';
import PathfinderCreateLine from '../PathfinderCreateLine';
import PathfinderSectionTitle from '../PathfinderSectionTitle';
import PathfinderText from '../PathfinderText';
import { _AggregationLine, _Path, More, Path, PathfinderContext, Source } from '../PathfinderTypes';
import DragAndDrop, { DraggableItem } from './../../../../common/components/DragAndDrop';
import DragHandle from './../../../../common/components/DragHandle';
import PathfinderAggregationLine from './PathfinderAggregationLine';
import './PathfinderMoreStyle.less';
const RemoveIcon = require('images/icon_close_8x8.svg?name=RemoveIcon');

export interface Props
{
  pathfinderContext: PathfinderContext;
  path: Path;
  more: More;
  keyPath: KeyPath;
  hideTitle?: boolean;
  colorsActions?: typeof ColorsActions;
  toSkip?: number;
}

class PathfinderMoreSection extends TerrainComponent<Props>
{
  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.pf-line-wrapper .expand',
      style: getStyle('fill', Colors().iconColor),
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.pf-aggregation-arrow-open',
      style: { fill: Colors().active + ' !important' },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.pf-aggregation-arrow-advanced',
      style: getStyle('fill', Colors().iconColor),
    });
  }

  public handleReferenceChange(i, value)
  {
    BuilderActions.changePath(this.props.keyPath.push('references').push(i), value);
    if (this.props.path.nested.get(i) === undefined)
    {
      const nestedKeyPath = this.props.keyPath.butLast().toList().push('nested').push(i);
      BuilderActions.changePath(nestedKeyPath, _Path({ name: '', step: 0 }), true);
    }
  }

  public handleAddNested()
  {
    BuilderActions.changePath(this.props.keyPath.push('references'), this.props.more.references.push(''));
    const nestedKeyPath = this.props.keyPath.butLast().toList().push('nested');
    BuilderActions.changePath(nestedKeyPath, this.props.path.nested.push(undefined));
  }

  public handleDeleteNested(i)
  {
    BuilderActions.changePath(
      this.props.keyPath.push('references'),
      this.props.more.references.splice(i, 1),
    );
    const nestedKeyPath = this.props.keyPath.butLast().toList().push('nested');
    BuilderActions.changePath(
      nestedKeyPath,
      this.props.path.nested.splice(i, 1), true);
  }

  public handleAddLine()
  {
    const newLines = this.props.more.aggregations.push(_AggregationLine());
    BuilderActions.changePath(this.props.keyPath.push('aggregations'), newLines);
  }

  public handleDeleteLine(index)
  {
    const newLines = this.props.more.aggregations.delete(index);
    BuilderActions.changePath(this.props.keyPath.push('aggregations'), newLines);
  }

  public handleLinesReorder(items)
  {
    const newOrder = items.map((line) => line.key);
    const newLines = newOrder.map((index) =>
    {
      return this.props.more.aggregations.get(index);
    });
    BuilderActions.changePath(this.props.keyPath.push('aggregations'), newLines);
  }

  public getAggregationLines()
  {
    const lines: List<DraggableItem> = this.props.more.aggregations.map((agg, i) =>
    {
      return {
        content: <PathfinderAggregationLine
          pathfinderContext={this.props.pathfinderContext}
          aggregation={agg}
          keyPath={this.props.keyPath.push('aggregations').push(i)}
          onDelete={this.handleDeleteLine}
          index={i}
          key={i}
        />,
        key: i,
        draggable: true,
        dragHandle: <DragHandle />,
      };
    }).toList();
    return lines;
  }

  public renderPath(path: Path, i: number)
  {
    return (
      <PathfinderArea
        path={path}
        canEdit={this.props.pathfinderContext.canEdit}
        schema={this.props.pathfinderContext.schemaState}
        keyPath={this.props.keyPath.butLast().toList().push('nested').push(i)}
        toSkip={this.props.toSkip + 2} // Every time you nest, the filter section needs to know how nested it is
      />
    );
  }

  public renderNestedPaths()
  {
    const { references } = this.props.more;
    const { nested } = this.props.path;
    const { canEdit } = this.props.pathfinderContext;
    return (
      <div>
        {
          references.map((ref, i) =>
          {
            return (
              <div
                className='pf-more-nested'
                key={i}
              >
                {
                  nested.get(i) !== undefined &&
                  <div className={'pf-nested-line'}>
                    <div className={'pf-nested-line-inner'} />
                  </div>
                }
                <div className='pf-more-nested-reference'>
                  {
                    tooltip(
                      <FloatingInput
                        label={'Reference'}
                        isTextInput={true}
                        value={ref}
                        onChange={this._fn(this.handleReferenceChange, i)}
                        canEdit={canEdit}
                        className='pf-more-nested-reference-input'
                      />,
                      PathfinderText.referenceExplanation,
                    )
                  }
                  <RemoveIcon
                    onClick={this._fn(this.handleDeleteNested, i)}
                    className='pf-more-nested-remove close'
                  />
                </div>
                {
                  nested.get(i) !== undefined && this.renderPath(nested.get(i), i)
                }
              </div>
            );
          })
        }
      </div>
    );
  }

  public render()
  {
    const { canEdit } = this.props.pathfinderContext;
    return (
      <div
        className='pf-section pf-more-section'
      >
        {!this.props.hideTitle &&
          <PathfinderSectionTitle
            title={PathfinderText.moreSectionTitle}
            text={PathfinderText.moreSectionSubtitle}
          />
        }
        <DragAndDrop
          draggableItems={this.getAggregationLines()}
          onDrop={this.handleLinesReorder}
          className='more-aggregations-drag-drop'
        />
        <PathfinderCreateLine
          canEdit={canEdit}
          onCreate={this.handleAddLine}
          text={PathfinderText.createAggregationLine}
        />
        <div>
          {this.renderNestedPaths()}
          {
            tooltip(
              <PathfinderCreateLine
                canEdit={canEdit}
                onCreate={this.handleAddNested}
                text={PathfinderText.createNestedLine}
                style={{ marginTop: 12 }}
              />,
              PathfinderText.nestedExplanation,
            )
          }
        </div>
      </div>
    );
  }
}

export default Util.createContainer(
  PathfinderMoreSection,
  ['colors'],
  {
    colorsActions: ColorsActions,
  },
);
