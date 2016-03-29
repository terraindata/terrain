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

// Providing drag and drop functionality for things that contain cards (Card.tsx and CardsArea.tsx)
import * as React from 'react';
import Util from '../../util/Util.tsx';
import { DropZone, DropZoneManager } from "../layout/DropZoneManager.tsx";
import * as ReactDOM from 'react-dom';
import * as $ from 'jquery';
import Actions from "../../data/Actions.tsx";

var CardsContainerMixin = 
{
  propTypes:
  {
    cardsPropKeyPath: React.PropTypes.array.isRequired,
    parentIdPropKeyPath: React.PropTypes.array.isRequired,
    dropZoneRef: React.PropTypes.string.isRequired,
  },
  
  getCards()
  {
    return this.props.cardsPropKeyPath.reduce((arr, key) => arr[key], this.props);
  }, 
  
  getParentId()
  {
    return this.props.parentIdPropKeyPath.reduce((arr, key) => arr[key], this.props);
  }, 
  
  componentDidMount()
  {
    if(this.hasCardsArea())
    {
      var zoneId = 'z' + Util.randInt(123456789);
      DropZoneManager.register(zoneId,
      {
        id: zoneId,
        element: this.refs[this.props.dropZoneRef],
        onDragOver: this.onDragOver,
        onDragOut: this.onDragOut,
        onDrop: this.onDrop,
      });
      
      this.setState({
        zoneId
      });
    }
  },
  
  componentWillUnmount()
  {
    if(this.hasCardsArea())
    {
      DropZoneManager.deregister(this.state.zoneId);
    }
  },
  
  onDragOver(data: any, x: number, y: number, element: Element)
  {
    this.setState({
      draggingOver: true,
      draggingPlaceholder: {x, y, element},
    })
  },
  
  onDragOut()
  {
    this.setState({
      draggingOver: false,
      draggingPlaceholder: null,
    })
  },
  
  onDrop(data: any, x: number, y: number)
  {
    var index = 0;
    var node = $(ReactDOM.findDOMNode(this));
    var cards = this.getCards();
    while(index < cards.length &&
      node.find('[rel="card-' + cards[index].id+'"]')[0].getBoundingClientRect().top <= y)
    {
      index ++;
    }
    
    var cardIndex = cards.findIndex(card => card.id === data.id);
    if(cardIndex !== -1 && cardIndex < index)
    {
      index --;
    }
    
    Actions.cards.move(data, index, this.getParentId());
    
    this.onDragOut();
  },
};

export default CardsContainerMixin;