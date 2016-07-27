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

require('./Card.less');

import * as $ from 'jquery';
import * as _ from 'underscore';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as classNames from 'classnames';
import { DragSource, DropTarget } from 'react-dnd';
var { createDragPreview } = require('react-dnd-text-dragpreview');
import Util from '../../../util/Util.tsx';
import LayoutManager from "../layout/LayoutManager.tsx";
import SelectCard from './card-types/SelectCard.tsx';
import FromCard from './card-types/FromCard.tsx';
import SortCard from './card-types/SortCard.tsx';
import FilterCard from './card-types/FilterCard.tsx';
import LetVarCard from './card-types/LetVarCard.tsx';
import ScoreCard from './card-types/ScoreCard.tsx';
import TransformCard from './card-types/TransformCard.tsx';
import WrapperCard from './card-types/WrapperCard.tsx';
import ValueCard from './card-types/ValueCard.tsx';
import IfCard from './card-types/IfCard.tsx';
import CreateCardTool from './CreateCardTool.tsx';
import Menu from '../../../common/components/Menu.tsx';
import Actions from "../../data/BuilderActions.tsx";
import { CardColors } from './../../BuilderTypes.tsx';
import { BuilderTypes } from './../../BuilderTypes.tsx';
import Store from "./../../data/BuilderStore.tsx";

var ArrowIcon = require("./../../../../images/icon_arrow_8x5.svg?name=ArrowIcon");

var CARD_TYPES_WITH_CARDS = ['from', 'count', 'min', 'max', 'avg', 'exists', 'parentheses', 'if']; // 'let', 'var' removed

var findParentWithClass = 
  (n, className, count) => 
    count > 100 ? null : (n && !n.is('body') && (n.hasClass(className) && !n.hasClass('single-card') ? n :
      findParentWithClass(n.parent(), className, count + 1)));
var hoverCard = (event) => {
  $('.card-hovering').removeClass('card-hovering');
  $('.card-hovering-lower').removeClass('card-hovering-lower');
  $('.card-hovering-upper').removeClass('card-hovering-upper');
  var c = findParentWithClass($(event.target), 'card', 0);
  if(c)
  {
    c.addClass('card-hovering');
    if(event.pageY > c.offset().top + c.height() - 30)
    {
      c.addClass('card-hovering-lower');
    }
    if(event.pageY < c.offset().top + 30)
    {
      c.addClass('card-hovering-upper');
    }
  }
};
$('body').mousemove(_.throttle(hoverCard, 100));

$('body').on('click', (event) =>
{
  // surely there is a better way to do this?
  if(!$(event.target).hasClass('card-title') && !findParentWithClass($(event.target), 'card-title', 0))
  {
    Actions.cards.selectCard(null, event.altKey, event.shiftKey);
  }
});

var _lastDragOverEl;
var _lastDragOverClassName;
const handleCardDragover = (event) => 
{
  var el = findParentWithClass($(event.target), 'card-drop-target', 0);
  if(el)
  {
    var lower = event.pageY > el.offset().top + el.height() / 2;
    var className = lower ? 'card-drag-over-lower' : 'card-drag-over-upper';
    if(!_lastDragOverEl || el !== _lastDragOverEl || _lastDragOverClassName !== className)
    {
      _lastDragOverEl && _lastDragOverEl.removeClass(_lastDragOverClassName);
      el.addClass(className);
      _lastDragOverEl = el;
      _lastDragOverClassName = className;
    }
  }
};
$(document).on('dragover', _.throttle(handleCardDragover, 100));
// $(document).on('dragend', () => 
// {
//   _lastDragOverEl.removeClass(_lastDragOverClassName);
//   setTimeout(() => {
//     // hack because the drag handler is throttled so could fire after 'dragend'
//     _lastDragOverEl.removeClass(_lastDragOverClassName);
//     _lastDragOverEl = null;
//   }, 200);
// });

interface Props
{
  card: BuilderTypes.ICard;
  index: number;
  parentId: string;
  singleCard?: boolean;
  keys: string[];
}

var Card = React.createClass({
  propTypes:
  {
    card: React.PropTypes.object.isRequired,
    index: React.PropTypes.number.isRequired,
    parentId: React.PropTypes.string,
    singleCard: React.PropTypes.bool, // indicates it's not in a list, it's just a single card
    keys: React.PropTypes.array.isRequired,
  },
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  },

  getInitialState()
  {
    return {
      open: true,
      id: this.props.card.id,
      selected: false,
      menuOptions:
      [
        {
          text: 'Copy',
          onClick: this.handleCopy,
        },
        {
          text: 'Hide',
          onClick: this.toggleClose,
        },
        {
          text: 'Delete',
          onClick: this.handleDelete,
        },
      ],
      titleStyle: {
        background: CardColors[this.props.card.type] ? CardColors[this.props.card.type][0] : CardColors['none'][0],
      },
      bodyStyle: {
        background: CardColors[this.props.card.type] ? CardColors[this.props.card.type][1] : CardColors['none'][1],
        borderColor: CardColors[this.props.card.type] ? CardColors[this.props.card.type][0] : CardColors['none'][0],
      },
    }
  },
  
  getColor(index:number): string
  {
    return CardColors[this.props.card.type] ? CardColors[this.props.card.type][index] : CardColors['none'][index];
  },
  
  componentWillMount()
  {
    this.unsubscribe = Store.subscribe(() =>
    {
      let selected = Store.getState().getIn(['selectedCardIds', this.props.card.id]);
      if((selected && !this.state.selected) || (!selected && this.state.selected))
      {
        this.setState({
          selected
        });
      }
    });
  },
  
  componentWillUnmount()
  {
    this.unsubscribe && this.unsubscribe();
    this.unsubscribe = null;
    if(this.props.dndListener)
    {
      this.props.dndListener.unbind('draggedAway', this.handleDraggedAway);
      this.props.dndListener.unbind('dropped', this.handleDropped);
      this.props.dndListener.unbind('droppedBelow', this.handleDroppedBelow);
      this.props.dndListener.unbind('droppedAbove', this.handleDroppedAbove);
    }
  },
  
  componentDidMount()
  {
    this.dragPreview = createDragPreview(
      Util.titleForCard(this.props.card) + ' (' + Util.previewForCard(this.props.card) + ')',
    {
      backgroundColor: this.getColor(0),
      borderColor: this.getColor(1),
      color: '#fff',
      fontSize: 15,
      fontWeight: 'bold',
      paddingTop: 7,
      paddingRight: 12,
      paddingBottom: 9,
      paddingLeft: 12,
      borderRadius: 10
    });
    this.props.connectDragPreview(this.dragPreview);
    
    if(this.props.dndListener)
    {
      this.props.dndListener.bind('draggedAway', this.handleDraggedAway);
      this.props.dndListener.bind('dropped', this.handleDropped);
      this.props.dndListener.bind('droppedBelow', this.handleDroppedBelow);
      this.props.dndListener.bind('droppedAbove', this.handleDroppedAbove);
    }
  },
  
  componentDidUpdate()
  {
    if(this.props.dndListener)
    {
      this.props.dndListener.bind('draggedAway', this.handleDraggedAway);
      this.props.dndListener.bind('dropped', this.handleDropped);
      this.props.dndListener.bind('droppedBelow', this.handleDroppedBelow);
      this.props.dndListener.bind('droppedAbove', this.handleDroppedAbove);
    }
  },
  
  handleDraggedAway()
  {
    // Util.animateToHeight(this.refs['cardContainer'], 0);
  },
  
  handleDropped()
  {
    // Util.animateToAutoHeight(this.refs['cardContainer']);
  },
  
  handleDroppedBelow(item)
  {
    this.setState({
      droppedBelow: true,
    });
  },
  
  handleDroppedAbove(item)
  {
    this.setState({
      droppedAbove: true,
    });
  },
  
	toggleClose(event)
	{
    this.setState({
      open: ! this.state.open,
    })
    if(this.state.open)
    {
      setTimeout(() => 
      Util.animateToHeight(this.refs.cardBody, 0), 300);
    }
    else
    {
      setTimeout(() => 
      Util.animateToAutoHeight(this.refs.cardBody), 300);
    }
       
    event.preventDefault();
    event.stopPropagation();
	},
  
  handleTitleClick(event)
  {
    if(!this.props.canEdit)
    {
      return;
    }
    
    event.stopPropagation();
    event.preventDefault();
    Actions.cards.selectCard(this.props.card.id, event.altKey, event.shiftKey);
  },
  
  hasCardsArea(): boolean
  {
    return !! CARD_TYPES_WITH_CARDS.find(type => type === this.props.card.type);
  },
  
  handleDelete()
  {
    Util.animateToHeight(this.refs.cardInner, 0);
    setTimeout(() => {
      Actions.cards.remove(this.props.card, this.props.parentId);
    }, 250);
  },
  
  handleCopy()
  {
  },
  
  addCardBelow()
  {
    this.setState({
      addingCardBelow: !this.state.addingCardBelow,
    });
  },
  
  addCardAbove()
  {
    this.setState({
      addingCardAbove: !this.state.addingCardAbove,
    });
  },
  
  minimizeCreateCard()
  {
    this.setState({
      addingCardAbove: false,
      addingCardBelow: false,
    });
  },
  
  renderAddCard(isLower?: boolean)
  {
    if(this.props.singleCard || !this.props.canEdit)
    {
      return null;
    }
    
    return (
      <div
        className={'card-add-card-btn' + (isLower ? ' card-add-card-btn-lower' : '')}
        onClick={isLower ? this.addCardBelow : this.addCardAbove}
      >
        {
          (isLower ? this.state.addingCardBelow : this.state.addingCardAbove) ? '-' : '+'
        }
      </div>
    );
  },

	render() {

		var CardComponent;

		switch(this.props.card.type)
		{
			case 'select':
				CardComponent = SelectCard;
				break;
			case 'from':
				CardComponent = FromCard;
				break;
   case 'sort':
     CardComponent = SortCard;
     break;
   case 'filter':
    CardComponent = FilterCard;
      break;
    case 'let':
    case 'var':
      CardComponent = LetVarCard;
      break;
    case 'transform':
      CardComponent = TransformCard;
      break;
    case 'score':
      CardComponent = ScoreCard;
      break;
    case 'if':
      CardComponent = IfCard;
      break;
    case 'count':
    case 'sum':
    case 'min':
    case 'max':
    case 'avg':
    case 'exists':
    case 'parentheses':
      CardComponent = WrapperCard;
      var isWrapperCard = true;
      break;
    case 'take':
    case 'skip':
      CardComponent = ValueCard;
      break;
		}
    
    var content = <div>This card has not been implemented yet.</div>;
    if(CardComponent)
    {
      content = <CardComponent {...this.props} />
    }

		var contentToDisplay = (
			<div className={'card-content' + (this.props.singleCard ? ' card-content-single' : '')}>
				{content}
			</div>
		);
    
		var title = Util.titleForCard(this.props.card);
    const { isDragging, connectDragSource, connectDropTarget } = this.props;
    const rendering = 
      <div
        className={classNames({
          'card': true,
          'card-dragging': isDragging,
          'card-closed' : !this.state.open,
          'single-card': this.props.singleCard,
          'card-selected': this.state.selected,
          'card-drop-target': true,
          'wrapper-card': isWrapperCard,
        })}
        rel={'card-' + this.props.card.id}
      >
        <div ref='cardContainer' className='card-container'>
          { !this.props.singleCard &&
            <CreateCardTool
              {...this.props}
              index={this.props.index}
              parentId={this.props.parentId}
              open={this.state.addingCardAbove}
              onMinimize={this.minimizeCreateCard}
            />
          }
          { this.renderAddCard() }
          <div className='card-stroke card-stroke-above' />
          <div
            className={'card-inner ' + (this.props.singleCard ? 'card-single' : '')}
            style={this.state.bodyStyle}
            ref='cardInner'
          >
            { !this.props.singleCard &&
              connectDragSource(
                <div
                  className={classNames({
                    'card-title': true,
                    'card-title-closed': !this.state.open,
                  })}
                  style={this.state.titleStyle}
                  onClick={this.handleTitleClick}
                  >
                  <ArrowIcon className="card-arrow-icon" onClick={this.toggleClose} />
                  { title }
                  <span className={classNames({
                    'card-preview': true,
                    'card-preview-hidden': this.state.open
                  })}>
                    { Util.previewForCard(this.props.card) }
                  </span>
                  {
                    this.props.canEdit && <Menu options={this.state.menuOptions} />
                  }
                </div>
              )
            }
            <div className='card-body' ref='cardBody'>
              { contentToDisplay }
            </div>
          </div>
          <div className='card-stroke card-stroke-below' />
          { this.renderAddCard(true) }
          { !this.props.singleCard &&
            <CreateCardTool
              {...this.props}
              index={this.props.index + 1}
              parentId={this.props.parentId}
              open={this.state.addingCardBelow}
              onMinimize={this.minimizeCreateCard}
            />
          }
        </div>
      </div>;
      
    if(!this.props.singleCard)
    {
      return connectDropTarget(rendering);
    }
    return rendering;			
	},
});


// DnD stuff

// Defines a draggable result functionality
const cardSource = 
{
  canDrag(props)
  {
    return props.canEdit;
  },
  
  beginDrag(props)
  {
    const item = props.card;
    // TODO do something better than this
    $('body').addClass('card-is-dragging');
    if(props.dndListener)
    {
       props.dndListener.trigger('draggedAway')
    }
    // Actions.cards.selectCard(item.id, false, false);
    return item;
  },
  
  endDrag(props, monitor, component)
  {
    // TODO do something better than this
    $('body').removeClass('card-is-dragging');
    
    if(props.dndListener)
    {
      setTimeout(() =>
       props.dndListener.trigger('dropped')
      , 250);
    }
    
    if(!monitor.didDrop())
    {
      return;
    }
    
    const item = monitor.getItem();
    const dropResult = monitor.getDropResult();
    
    var m = monitor.getClientOffset();
  }
}

// Defines props to inject into the component
const dragCollect = (connect, monitor) =>
({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
  connectDragPreview: connect.dragPreview()
});



const cardTarget = 
{
  canDrop(props, monitor)
  {
    return true;
  },
  
  drop(props, monitor, component)
  {
    if(monitor.isOver({ shallow: true}))
    {
      const card = monitor.getItem();
      const id = props.card.id;
      const findId = (c) =>
      {
        for(var i in c)
        {
          if(c.hasOwnProperty(i) && typeof c[i] === 'object')
          {
            if(c[i].id === id || findId(card[i]))
            {
              return true;  
            }
          }
        }
      }
      
      if(findId(card))
      {
        return;  
      }
      
      var cr = ReactDOM.findDOMNode(component).getBoundingClientRect();
      var m = monitor.getClientOffset();
      if(m.y > (cr.top + cr.bottom) / 2)
      {
        var below = true;
      }
      
      props.dndListener && props.dndListener.trigger(below ? 'droppedBelow' : 'droppedAbove',
          monitor.getItem()
        );
      
      Actions.cards.move(card, props.index + (below ? 1 : 0), props.parentId)
    }
  }
}

const dropCollect = (connect, monitor) =>
({
  connectDropTarget: connect.dropTarget(),
});

export default DropTarget('CARD', cardTarget, dropCollect)(DragSource('CARD', cardSource, dragCollect)(Card));