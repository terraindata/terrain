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
import Util from '../../util/Util.tsx';
import PanelMixin from '../layout/PanelMixin.tsx';
import LayoutManager from "../layout/LayoutManager.tsx";
import SelectCard from './card-types/SelectCard.tsx';
import FromCard from './card-types/FromCard.tsx';
import SortCard from './card-types/SortCard.tsx';
import FilterCard from './card-types/FilterCard.tsx';
import LetVarCard from './card-types/LetVarCard.tsx';
import ScoreCard from './card-types/ScoreCard.tsx';
import TransformCard from './card-types/TransformCard.tsx';
import WrapperCard from './card-types/WrapperCard.tsx';
import IfCard from './card-types/IfCard.tsx';
import CreateCardTool from './CreateCardTool.tsx';
import Menu from '../common/Menu.tsx';
import Actions from "../../data/Actions.tsx";
import CardsContainerMixin from "./CardsContainerMixin.tsx";
import { CardColors } from './../../CommonVars.tsx';

var ArrowIcon = require("./../../../images/icon_arrow_8x5.svg?name=ArrowIcon");

var CARD_TYPES_WITH_CARDS = ['from', 'count', 'min', 'max', 'avg', 'exists', 'parentheses', 'if']; // 'let', 'var' removed

var hoverCard = (event) => {
  $('.card-hovering').removeClass('card-hovering');
  var f = (n, count) => count > 100 ? null : (n && !n.is('body') && (n.hasClass('card') && !n.hasClass('single-card') ? n : f(n.parent(), count + 1)));
  var c = f($(event.target), 0);
  if(c)
  {
    c.addClass('card-hovering');
  }
};
$('body').mousemove(_.throttle(hoverCard, 100));

var Card = React.createClass({
	mixins: [PanelMixin, CardsContainerMixin],

	propTypes:
	{
		card: React.PropTypes.object.isRequired,
    index: React.PropTypes.number.isRequired,
    parentId: React.PropTypes.string,
    singleCard: React.PropTypes.bool, // indicates it's not in a list, it's just a single card
	},

	getDefaultProps():any
	{
		return {
			drag_x: false,
			drag_y: true,
			reorderOnDrag: true,
			handleRef: 'handle',
      useDropZoneManager: true,
      dropDataPropKey: 'card',
      cardsPropKeyPath: ['card', 'cards'],
      parentIdPropKeyPath: ['card', 'id'],
      dropZoneRef: 'cardBody',
		};
	},
  
	getInitialState()
	{
		return {
			open: true,
      ref: 'card-' + this.props.card.id,
      id: this.props.card.id,
      menuOptions:
      [
        {
          text: 'Copy',
          onClick: this.handleCopy,
        },
        {
          text: 'Hide',
          onClick: this.handleTitleClick,
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
  
	handleTitleClick()
	{
		if(!this.state.moved)
		{
			// this.state.moved is updated in panelMixin
      
      if(this.state.open)
      {
        Util.animateToHeight(this.refs.cardBody, 0);
      }
      else
      {
        Util.animateToAutoHeight(this.refs.cardBody); 
      }
      
			this.setState({
				open: !this.state.open,
			});
		}
	},
  
  hasCardsArea(): boolean
  {
    return !! CARD_TYPES_WITH_CARDS.find(type => type === this.props.card.type);
  },
  
  handleDelete()
  {
    Util.animateToHeight(this.refs[this.state.ref], 0);
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
  
  renderAddCard(isBottom?: boolean)
  {
    if(this.props.singleCard)
    {
      return null;
    }
    
    return (
      <div
        className={'card-add-card-btn' + (isBottom ? ' card-add-card-btn-bottom' : '')}
        onClick={isBottom ? this.addCardBelow : this.addCardAbove}
      >
        {
          (isBottom ? this.state.addingCardBelow : this.state.addingCardAbove) ? '-' : '+'
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
		}
    
    var content = <div>This card has not been implemented yet.</div>;
    if(CardComponent)
    {
      content = <CardComponent {...this.props} draggingOver={this.state.draggingOver} draggingPlaceholder={this.state.draggingPlaceholder} />
    }

		var contentToDisplay = (
			<div className={'card-content' + (this.props.singleCard ? ' card-content-single' : '')}>
				{content}
			</div>
		);

		var title = Util.titleForCard(this.props.card);
    
		return this.renderPanel((
			<div
        className={'card' + (!this.state.open ? ' card-closed' : '') + (this.props.singleCard ? ' single-card' : '')}
        ref={this.state.ref}
        rel={'card-' + this.props.card.id}
        >
        { !this.props.singleCard &&
          <CreateCardTool
            index={this.props.index}
            parentId={this.props.parentId}
            open={this.state.addingCardAbove}
            onMinimize={this.minimizeCreateCard}
          />
        }
				{ this.renderAddCard() }
        <div
          className={'card-inner ' + (this.props.singleCard ? 'card-single' : '')}
          style={this.state.bodyStyle}
        >
          { !this.props.singleCard &&
  					<div
              className='card-title'
              ref='handle'
              onClick={this.handleTitleClick}
              style={this.state.titleStyle}
              >
              <ArrowIcon className="card-arrow-icon" />
              { title }
              <Menu options={this.state.menuOptions} />
  					</div>
          }
          <div className='card-body' ref='cardBody'>
  					{ contentToDisplay }
          </div>
				</div>
        { this.renderAddCard(true) }
        { !this.props.singleCard &&
          <CreateCardTool
            index={this.props.index + 1}
            parentId={this.props.parentId}
            open={this.state.addingCardBelow}
            onMinimize={this.minimizeCreateCard}
          />
        }
			</div>
			));
	},
});

export default Card;