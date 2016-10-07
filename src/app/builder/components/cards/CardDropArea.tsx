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

// an invisible area covering the upper or lower half of a card, sensing that a card can be dropped

require('./CardDropArea.less');
import * as React from 'react';
import PureClasss from '../../../common/components/PureClasss.tsx';
import { DropTarget } from 'react-dnd';
const classNames = require('classnames');
import { CardItem } from './Card.tsx';
import Actions from "../../data/BuilderActions.tsx";
import BuilderTypes from '../../BuilderTypes.tsx';

interface Props
{
  keyPath: KeyPath;
  index: number;
  
  half?: boolean;
  lower?: boolean;
  isOver?: boolean;
  canDrop?: boolean;
  connectDropTarget?: (el: El) => El;
  
  height?: number;
  heightOffset?: number; // height will be 100% - heightOffset
  
  beforeDrop?: (item:CardItem, targetProps:Props) => void;
  accepts?: List<string>;
  item?: CardItem;
}

class CardDropArea extends PureClasss<Props>
{
  renderCardPreview()
  {
    if(!this.props.isOver || !this.props.canDrop)
    {
      return null;
    }
    
    const {item} = this.props;
    const {type} = item;
    const {colors} = BuilderTypes.Blocks[type].static;
    
    var preview = "New";
    if(!item.new)
    {
      preview = BuilderTypes.getPreview(item.props.card);
    }
    
    return (
      <div
        className='card-drop-preview'
        style={{
          background: '#fff',
          borderColor: colors[0],
        }}
      >
        <div
          className='card-title card-title-closed'
          style={{
            background: colors[0],
          }}
        >
          <div className='card-title-inner'>
            {
              BuilderTypes.Blocks[type].static.title
            }
          </div>
          <div
            className='card-preview'
          >
            {
              preview
            }
          </div>
        </div>
      </div>
    );
  }
  
	render()
  {
    var style = null;
    if(this.props.height)
    {
      style = {
        height: this.props.height,
      };
    }
    if(this.props.heightOffset)
    {
      style = {
        heightOffset: `100% - ${this.props.heightOffset}`,
      };
    }
    
    return this.props.connectDropTarget(
      <div
        className={classNames({
          'card-drop-area': true,
          'card-drop-area-half': this.props.half,
          'card-drop-area-upper': this.props.half && !this.props.lower,
          'card-drop-area-lower': this.props.half && this.props.lower,
          'card-drop-area-over': this.props.isOver,
          'card-drop-area-can-drop': this.props.canDrop,
          'card-drop-area-shift': window.location.search.indexOf('shift') !== -1,
          'card-drop-area-no-shift': window.location.search.indexOf('shift') === -1,
        })}
        style={style}
      >
        <div
          className='card-drop-area-inner'
          style={
            window.location.search.indexOf('shift') !== -1 &&
              {
                zIndex: 99999999 + this.props.keyPath.size,
              }
          }
        />
        
        {
          this.renderCardPreview()
        }
      </div>
	  );
	}
}

const cardTarget = 
{
  canDrop(targetProps:Props, monitor)
  {
    let item = monitor.getItem() as CardItem;
    const {type} = item;
    
    if(targetProps.accepts && targetProps.accepts.indexOf(type) === -1)
    {
      return false;
    }
    
    if(item['new'])
    {
      return true;
    }
    
    let itemKeyPath = item.props.keyPath;
    let targetKeyPath = targetProps.keyPath;
    
    if(itemKeyPath.equals(targetKeyPath))
    {
      return true;
    }
    
    if(targetProps['singleCard'])
    {
      // can't drop above/below a singleCard
      return false;
    }
    
    let itemChildKeyPath = itemKeyPath.push(item.props.index);
    if(targetKeyPath.size >= itemChildKeyPath.size)
    {
      // can't drag a card into a card that is within itself
      // so make sure that the itemKeyPath is not a prefix for the targetKeyPath
      return ! targetKeyPath.splice(itemChildKeyPath.size, targetKeyPath.size - itemChildKeyPath.size)
        .equals(itemChildKeyPath);
    }
    return true;
  },
  
  drop(targetProps:Props, monitor, component)
  {
    if(monitor.isOver({ shallow: true})) // shouldn't need this: && cardTarget.canDrop(targetProps, monitor))
    {
      let item = monitor.getItem();
      
      if(
        item.props
        && item.props.keyPath.equals(targetProps.keyPath)
        && targetProps.index === item.props.index
      )
      {
        // dropped on itself
        return;
      }
      
      if(targetProps.beforeDrop)
      {
        targetProps.beforeDrop(item, targetProps);
      }
      
      var targetIndex = targetProps.index;
      if(targetProps.half && targetProps.lower)
      {
        // dropping above target props
        targetIndex ++;
      }
      
      
      if(item['new'])
      {
        // is a new card
        Actions.create(targetProps.keyPath, targetIndex, item.type);
        return;
      }
      
      // dragging an existing card
      let cardProps = item.props;
      var indexOffset = 0;
      Actions.nestedMove(cardProps.keyPath, cardProps.index, targetProps.keyPath, targetIndex);
    }
  }
}

const dropCollect = (connect, monitor) =>
({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver({ shallow: true }),
  canDrop: monitor.isOver({ shallow: true }) && monitor.canDrop(),
  item: monitor.getItem(),
});


export default DropTarget('CARD', cardTarget, dropCollect)(CardDropArea);