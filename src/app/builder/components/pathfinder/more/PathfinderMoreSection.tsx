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
import ColorsActions from 'app/colors/data/ColorsActions';
import BuilderActions from '../../../data/BuilderActions';
import PathfinderCreateLine from '../PathfinderCreateLine';
import PathfinderSectionTitle from '../PathfinderSectionTitle';
import PathfinderText from '../PathfinderText';
import { _AggregationLine, More, Path, PathfinderContext, Source } from '../PathfinderTypes';
import DragAndDrop, { DraggableItem } from './../../../../common/components/DragAndDrop';
import DragHandle from './../../../../common/components/DragHandle';
import PathfinderAggregationLine from './PathfinderAggregationLine';

export interface Props
{
  pathfinderContext: PathfinderContext;
  more: More;
  keyPath: KeyPath;
  hideTitle?: boolean;
}

class PathfinderMoreSection extends TerrainComponent<Props>
{
  public componentWillMount()
  {
    ColorsActions.setStyle('.pf-line-wrapper .expand', getStyle('fill', Colors().iconColor));
    ColorsActions.setStyle('.pf-aggregation-arrow-open', { fill: Colors().active + ' !important' });
    ColorsActions.setStyle('.pf-aggregation-arrow-advanced', getStyle('fill', Colors().iconColor));
  }

  public handleAddLine()
  {
    const newLines = this.props.more.aggregations.push(_AggregationLine());
    BuilderActions.change(this.props.keyPath.push('aggregations'), newLines);
  }

  public handleDeleteLine(index)
  {
    const newLines = this.props.more.aggregations.delete(index);
    BuilderActions.change(this.props.keyPath.push('aggregations'), newLines);
  }

  public handleLinesReorder(items)
  {
    const newOrder = items.map((line) => line.key);
    const newLines = newOrder.map((index) =>
    {
      return this.props.more.aggregations.get(index);
    });
    BuilderActions.change(this.props.keyPath.push('aggregations'), newLines);
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
      </div>
    );
  }
}

export default PathfinderMoreSection;
