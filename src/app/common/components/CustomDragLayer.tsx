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
import Colors, { backgroundColor, borderColor, fontColor } from 'app/colors/Colors';
import TerrainComponent from 'app/common/components/TerrainComponent';
import { Map } from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import { DragLayer } from 'react-dnd';
import PerformantDragLayer from './DragLayer.js';

interface Props
{
  item: any;
  itemType: string;
}

function collect(monitor)
{
  return {
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
  };
}

const comparisons: Map<string, string> = Map({
  contains: 'contains',
  exists: 'exists',
  equal: '=',
  notequal: '≠',
  notcontain: 'does not contain',
  greater: '>',
  less: '<',
  greaterequal: '≥',
  lessequal: '≤',
  alphabefore: 'comes before',
  alphaafter: 'comes after',
  datebefore: 'starts before',
  dateafter: 'starts after',
  located: 'is located within',
});

/*
  This file creates custom drag layers for different drag items. It is important for
  the drag layers to be "dumb" so that performance remains good
  For example, instead of rendering a filter line for the item preview, just render basic
  text divs that look like the filter line but that are static.
  It uses a custom implementation of DragLayer (stored in DragLayer.js) instead of the
  React-dnd DragLayer for performance optimization.
*/
class CustomDragLayerRaw extends TerrainComponent<Props> {

  public renderItemBlock(key: string, header: string, data: any)
  {
    const headerStyle = fontColor(Colors().text3);
    const valueStyle = fontColor(Colors().active);
    return (
      <div className={`drag-drop-item-${key}`}>
        <div
          className={`drag-drop-item-${key}-header`}
          style={headerStyle}
        >
          {header}
        </div>
        <div
          className={`drag-drop-item-${key}-value`}
          style={valueStyle}
        >
          {
           // TODO MAKE THIS USE FILTER LINES DISPLAY FUNCTION SOMEHOW
            key === 'comparison' ?
              comparisons.get(data['comparison']) :
              JSON.stringify(data[key])
          }
        </div>
      </div>
    );
  }

  public render()
  {
    const { item, itemType } = this.props;
    const { data } = item;
    switch (itemType)
    {
      case 'GROUP':
        const groupStyle = _.extend({},
          backgroundColor(Colors().blockBg),
          borderColor(Colors().blockOutline),
          { width: item.width },
        );
        return (
          <div
            className='drag-drop-group-preview'
            style={groupStyle}
          >
            {data.name}
          </div>
        );
      case 'ITEM':
        const itemStyle = _.extend({},
          backgroundColor(Colors().sidebarBg),
          { width: item.width },
        );
        return (
          <div
            className='drag-drop-item-preview'
            style={itemStyle}
          >
            {this.renderItemBlock('field', 'data field', data)}
            {this.renderItemBlock('comparison', 'condition', data)}
            {this.renderItemBlock('value', 'value', data)}
          </div>
        );
      default:
        return null;
    }
  }
}

export default PerformantDragLayer(collect)(CustomDragLayerRaw);
