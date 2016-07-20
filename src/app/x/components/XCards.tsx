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

require('./XCards.less');
import * as classNames from 'classnames';
import * as _ from 'underscore';
import * as React from 'react';
import * as Immutable from 'immutable';
import Classs from './../../common/components/Classs.tsx';
import * as ReactDOM from 'react-dom';
let shallowCompare = require('react-addons-shallow-compare');

import { DragDropContext } from 'react-dnd';
var HTML5Backend = require('react-dnd-html5-backend');
import { DragSource, DropTarget } from 'react-dnd';
var { createDragPreview } = require('react-dnd-text-dragpreview');

type List<T> = Immutable.List<T>;
let List = Immutable.List;

const COLORS = 
[
  ["#B45759", "#EA7E81"],
  ["#89B4A7", "#C1EADE"],
  ["#7EAAB3", "#B9E1E9"],
  ["#8AC888", "#B7E9B5"],
  ["#C0C0BE", "#E2E2E0"],
  ["#E7BE70", "#EDD8B1"],
  ["#9DC3B8", "#D1EFE7"],
  ["#C5AFD5", "#EAD9F7"],
  ["#CDCF85", "#F5F6B3"],
  ["#b37e7e", "#daa3a3"],
  ["#70B1AC", "#D2F3F0"],
  ["#8299b8", "#acc6ea"],
  ["#cc9898", "#ecbcbc"],
  ["#8dc4c1", "#bae8e5"],
  ["#a2b37e", "#c9daa6"],
  ["#a98abf", "#cfb3e3"],
  ["#7eb397", "#a9dec2"],
  ["#b3a37e", "#d7c7a2"]
];

let _IXCard = Immutable.Record({
  id: '',
  rows: List([]),
  cards: List([]),
});
class IXCard extends _IXCard {
  id: string;
  rows: string[];
  cards: CardList;
  
  constructor(id: string, cards: CardList)
  {
    super({
      id,
      cards,
      rows:  _.range(0, Math.floor(Math.random() * 4)).map(i => ""),
    });
  }
}

// type IXCardMap = {
//   [id: string]: IXCard;
// }

interface CardDragItem
{
  card: any;
  children: {[id: string]: boolean};
  height: number;
}

interface CardProps
{
  card: IXCard;
  keyPath: KeyPath;
  depth: number;
  dy: number;
  
  onHoverDrop: (item: CardDragItem, targetId: string, type: string) => void;
  
  connectDragSource?: (a:any) => any;
  connectDropTarget?: (a:any) => any;
  isDragging?: boolean;
}

class _Card extends Classs<CardProps>
{
  styles: React.CSSProperties[];
  
  state: {
    dy: number,
    isDragging: boolean,
    startY: number,
  } = {
    dy: 0,
    isDragging: false,
    startY: 0,
  };
  
  constructor(props:CardProps)
  {
    super(props);
    
    let colors = COLORS[(props.card.id.charCodeAt(0) - 96) % COLORS.length];
    this.styles = 
    [
      {
        backgroundColor: colors[0],
      },
      {
        backgroundColor: colors[1],
      },
    ];
  }
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return shallowCompare(this, nextProps, nextState);
  }
  
  handleInputChange(event)
  {
    console.log(this.getKeyPath());
  }
  
  getKeyPath()
  {
    return this._ikeyPath(this.props.keyPath, this.props.card.id);
  }
  
  // handleMouseDown(event)
  // {
  //   this.setState({
  //     isDragging: true,
  //     dy: 0,
  //     startY: event.pageY,
  //   });
  //   $('body').on('mousemove', this.handleMouseMove);
  //   $('body').on('mouseup', this.handleMouseUp);
  //   $('body').on('mouseleave', this.handleMouseUp);
  // }
  
  // handleMouseMove(event)
  // {
  //   this.setState({
  //     dy: this.state.dy + 1,
  //   })
  // }
  
  // handleMouseUp(event)
  // {
    
  // }

  render()
  {
    let {card} = this.props;
    return this.props.connectDropTarget(
      <div
        className={classNames({
          'x-card': true,
          'x-card-dragging': this.props.isDragging,
        })}
        style={_.extend({}, this.styles[this.props.depth % 2], {
          top: this.props.dy,
        })}
      >
        {
          this.props.connectDragSource(
            <div className='x-card-title' onMouseDown={_.noop /*this.handleMouseDown*/}>
              Card
            </div>
          )
        }
        <div className='x-card-fields'>
          {
            card.rows.map((row, index) =>
              <input type='text' value={row} rel={index + ''} onChange={this.handleInputChange} key={index} />
            )
          }
        </div>
        {
          !card.cards ? null : 
            <XCardsArea
              cards={card.cards}
              keyPath={this.getKeyPath()}
              depth={this.props.depth}
              cardId={card.id}
            />
        }
      </div>
    );
  }
}


// DnD stuff

// Defines a draggable result functionality
const cardSource = 
{
  canDrag(props)
  {
    return props.canEdit || true;
  },
  
  beginDrag(props, monitor, component)
  {
    let card = props.card.toJS();
    var children: {[id: string]: boolean} = {};
    
    let addChildren = (c: IXCard) =>
    {
      children[c.id] = true;
      if(c.cards && c.cards.size)
      {
        c.cards.map(addChildren);
      }
    }
    addChildren(props.card);
    
    const item: CardDragItem = 
    {
      card,
      children,
      height: ReactDOM.findDOMNode(component).getBoundingClientRect().height,
    };
    
    props.onHoverDrop(item, card.id, 'hover', false);
    
    return item;
  },
  
  endDrag(props, monitor, component)
  {
    if(!monitor.didDrop())
    {
      return;
    }
    
    const item = monitor.getItem();
    const dropResult = monitor.getDropResult();
    
    // var m = monitor.getClientOffset();
  }
}

let shallow = { shallow: true };
const cardTarget = 
{
  canDrop(props, monitor)
  {
    // make sure this card is not a child card
    return ! monitor.getItem().children[props.card.id];
  },
  
  hover(props, monitor, component)
  {
    if(props.card.id === monitor.getItem().card.id)
    {
      return;
    }
    
    if(monitor.isOver(shallow))
    {
      let {top, bottom} = ReactDOM.findDOMNode(component).getBoundingClientRect();
      let m = monitor.getClientOffset();
      var overTop = false;
      if(m.y < (top + bottom) / 2)
      {
        overTop = true;
      }
      
      props.onHoverDrop(monitor.getItem(), props.card.id, 'hover', overTop);
    }
    // else
    // {
    //   props.onHoverDrop(null, null, 'hover');
    // }
  },
  
  drop(props, monitor, component)
  {
    if(monitor.isOver(shallow))
    {
      props.onHoverDrop(monitor.getItem(), props.card.id, 'drop', null);
      
      // const card = monitor.getItem();
      // const id = props.card.id;
      // const findId = (c) =>
      // {
      //   for(var i in c)
      //   {
      //     if(c.hasOwnProperty(i) && typeof c[i] === 'object')
      //     {
      //       if(c[i].id === id || findId(card[i]))
      //       {
      //         return true;  
      //       }
      //     }
      //   }
      // }
      
      // if(findId(card))
      // {
      //   return;  
      // }
      
      // var cr = ReactDOM.findDOMNode(component).getBoundingClientRect();
      // var m = monitor.getClientOffset();
      // if(m.y > (cr.top + cr.bottom) / 2)
      // {
      //   var below = true;
      // }
      
      // props.dndListener && props.dndListener.trigger(below ? 'droppedBelow' : 'droppedAbove',
      //     monitor.getItem()
      //   );
      
      // Actions.cards.move(card, props.index + (below ? 1 : 0), props.parentId)
    }
    else
    {
      props.onHoverDrop(null, null, 'drop');
    }
  }
}

const dropCollect = (connect, monitor) =>
({
  connectDropTarget: connect.dropTarget(),
});


// Defines props to inject into the component
const dragCollect = (connect, monitor) =>
({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
  connectDragPreview: connect.dragPreview()
});

let Card = DropTarget('CARD', cardTarget, dropCollect)(DragSource('CARD', cardSource, dragCollect)(_Card));







type KeyPath = List<string | number>;
type CardList = List<IXCard>;
interface XCardsAreaProps
{
  cardId: string;
  cards: CardList;
  keyPath: KeyPath;
  depth: number;
  connectDropTarget?: (a:any) => any;
}
class _XCardsArea extends Classs<XCardsAreaProps>
{
  state: {
    hoverIndex: number;
    hoverHeight: number;
    clearedHover: boolean;
    lastHoverId: string;
    lastHoverDirection: boolean;
    // hoverDirection: number;
  } = {
    hoverIndex: null,
    hoverHeight: null,
    clearedHover: false,
    lastHoverId: null,
    lastHoverDirection: null,
    // hoverDirection: 0,
  };
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return shallowCompare(this, nextProps, nextState);
  }
  
  endHover()
  {
    this.setState({
      hoverIndex: null,
      hoverHeight: null,
      clearedHover: false,
      lastHoverId: null,
      lastHoverDirection: null,
      // hoverDirection: 1,
    });
  }
  
  handleHoverDrop(item: CardDragItem, targetId: string, type: string, top: boolean)
  {
    if(item === null)
    {
      this.endHover();
      return;
    }
    
    if(type === 'drop')
    {
      this.endHover();
      return;
    }
    
    // type is hover
    if(targetId === null)
    {
      // this.setState({
      //   clearedHover: true,
      // });
      this.setState({
        lastHoverId: null,
      });
      return;
    }
    
    if(targetId === this.state.lastHoverId && top === this.state.lastHoverDirection)
    {
      // nothing has changed
      return;
    }
    
    // var {hoverDirection} = this.state;
    // if(targetId === this.state.lastHoverId)
    // {
    //   if(!this.state.clearedHover)
    //   {
    //     // still hovering over the same one as last time
    //     return;
    //   }
    //   else
    //   {
    //     console.log('direction switch');
    //     // direction has changed
    //     hoverDirection *= -1;
    //   }
    // }
    
    // if(this.state.hoverIndex === null)
    // {
    //   // establish initial direction
    //   hoverDirection = top ? -1 : 1;
    // }
    
    let index = this.props.cards.findIndex((card:IXCard) => card.id === targetId);
    // let offset = hoverDirection === -1 ? 1 : 0;
    let directionOffset = top ? 0 : 1; //1 : 0;
    // var sibilingOffset = 0;
    
    // let dragIndex = this.props.cards.findIndex((card:IXCard) => card.id === item.card.id);
    // if(dragIndex !== -1 && dragIndex < index)
    // {
    //   // dragging an element in this list down
    //   sibilingOffset = 1;
    // }
    
    console.log(directionOffset);
    console.log(top ? 'top' : 'notop');
    
    this.setState({
      hoverIndex: index + directionOffset, // + sibilingOffset,
      hoverHeight: item.height,
      clearedHover: false,
      lastHoverId: targetId,
      lastHoverDirection: top,
      // hoverDirection,
    });
  }
  
  render()
  {
    let {cards} = this.props;
    return this.props.connectDropTarget(
      <div className='x-cards-area'>
        {
          cards.map((card, index) => 
            <Card
              card={card}
              keyPath={this._ikeyPath(this.props.keyPath, 'cards')}
              key={card.id}
              depth={this.props.depth + 1}
              onHoverDrop={this.handleHoverDrop}
              dy={this.state.hoverIndex !== null ?
                  (index >= this.state.hoverIndex ? this.state.hoverHeight : 0)
                : 0}
            />
          )
        }
        {
          cards.size > 0 ? null :
            <div className='x-card-cards-empty'>
              Drag / create a card here
            </div>
        }
      </div>
    );
  }  
}
const cardAreaTarget = 
{
  canDrop(props, monitor)
  {
    // make sure this card is not a child card
    return ! monitor.getItem().children[props.cardId];
  },
  
  hover(props, monitor, component)
  {
    if(monitor.isOver({ shallow: true}))
    {
      component.handleHoverDrop(monitor.getItem(), null, 'hover', null);
    }
  },
  
  drop(props, monitor, component)
  {
    if(monitor.isOver({ shallow: true}))
    {
      component.handleHoverDrop(null, null, 'drop', null);
      
      // const card = monitor.getItem();
      // const id = props.card.id;
      // const findId = (c) =>
      // {
      //   for(var i in c)
      //   {
      //     if(c.hasOwnProperty(i) && typeof c[i] === 'object')
      //     {
      //       if(c[i].id === id || findId(card[i]))
      //       {
      //         return true;  
      //       }
      //     }
      //   }
      // }
      
      // if(findId(card))
      // {
      //   return;  
      // }
      
      // var cr = ReactDOM.findDOMNode(component).getBoundingClientRect();
      // var m = monitor.getClientOffset();
      // if(m.y > (cr.top + cr.bottom) / 2)
      // {
      //   var below = true;
      // }
      
      // props.dndListener && props.dndListener.trigger(below ? 'droppedBelow' : 'droppedAbove',
      //     monitor.getItem()
      //   );
      
      // Actions.cards.move(card, props.index + (below ? 1 : 0), props.parentId)
    }
  }
}

const dropAreaCollect = (connect, monitor) =>
({
  connectDropTarget: connect.dropTarget(),
});
let XCardsArea = DropTarget('CARD', cardAreaTarget, dropAreaCollect)(_XCardsArea);

interface XCardsProps
{
  params?: any;
  history?: any;
  location?: {
    pathname: string;
  };
}

class XCards extends Classs<XCardsProps>
{
  state: {
    cards: CardList;
  } = {
    cards: List([
      new IXCard('a', null),
      new IXCard('b', null),
      new IXCard('c', null),
      new IXCard('d', null),
      new IXCard('e', null),
    ]),
    // cards: List([
    //   new IXCard('a', List([
    //     new IXCard('ab', List([
    //       new IXCard('ae', List([
    //         new IXCard('ag', null),
    //       ])),
    //       new IXCard('af',  List([])),
    //     ])),
    //     new IXCard('ac', null),
    //     new IXCard('ad',  List([])),
    //   ])),
    // ]),
  };

  constructor(props)
  {
    super(props);
  }
  
  _kp = Immutable.List([]);
  
  render()
  {
    return (
      <div className='x-cards'>
        <XCardsArea
          cards={this.state.cards}
          keyPath={this._kp}
          depth={0}
          cardId={null}
        />
      </div>
    );
  }
}


export default DragDropContext(HTML5Backend)(XCards);