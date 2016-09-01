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
import * as Immutable from 'immutable';
import { DragSource, DropTarget } from 'react-dnd';
var { createDragPreview } = require('react-dnd-text-dragpreview');
import Util from '../../../util/Util.tsx';
import LayoutManager from "../layout/LayoutManager.tsx";
import CreateCardTool from './CreateCardTool.tsx';
// import Menu from '../../../common/components/Menu.tsx';
import ManualPopup from './../../../manual/components/ManualPopup.tsx';
import { Menu, MenuOption } from '../../../common/components/Menu.tsx';
import Actions from "../../data/BuilderActions.tsx";
import BuilderTypes from './../../BuilderTypes.tsx';
import Store from "./../../data/BuilderStore.tsx";
import PureClasss from './../../../common/components/PureClasss.tsx';
import CardDropArea from './CardDropArea.tsx';

import BuilderComponent from '../BuilderComponent.tsx';

var ArrowIcon = require("./../../../../images/icon_arrow_8x5.svg?name=ArrowIcon");

interface Props
{
  card: BuilderTypes.ICard;
  index: number;
  singleCard?: boolean;

  keys: List<string>;
  canEdit: boolean;
  keyPath: KeyPath;

  addColumn?: (number, string?) => void;
  colIndex?: number;
  
  isDragging?: boolean;
  connectDragPreview?: (a?:any) => void;
  connectDragSource?: (el: El) => El;

  helpOn?: boolean;
}

class Card extends PureClasss<Props>
{
  state: {
    open: boolean;
    id: ID;
    selected: boolean;
    hovering: boolean;
    menuOptions: List<MenuOption>;
    
    cardTerms: List<string>;
    allTerms: List<string>;
    
    // CreateCardTool
    addingCardBelow?: boolean;
    addingCardAbove?: boolean;
  }
  
  refs: {
    [k: string]: Ref;
    cardBody: Ref;
    cardInner: Ref;
  }
  
  constructor(props:Props)
  {
      // var darkCardColor = CardColors[this.props.card.type] ? CardColors[this.props.card.type][0] : CardColors['none'][0];
      // var lightCardColor = CardColors[this.props.card.type] ? CardColors[this.props.card.type][1] : CardColors['none'][1];
      // if(this.props.card.faded)
      // {
      //   darkCardColor = this.hex2rgba(darkCardColor);
      //   lightCardColor = this.hex2rgba(lightCardColor);
      // }
      // var borderColor = this.props.card.highlighted ? '#f4ff00' : darkCardColor;
      // var borderWidth = this.props.card.highlighted ? '2px' : '1px';
    // return {
    super(props);
    let cardTerms = this.getCardTerms(props.card);
    
    this.state = {
      open: true,
      id: this.props.card.id,
      selected: false,
      hovering: false,
      cardTerms,
      allTerms: props.keys.merge(cardTerms),
      menuOptions:
        Immutable.List([
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
        ]),
    };
    
    this._subscribe(Store, {
      stateKey: 'selected',
      storeKeyPath: ['selectedCardIds', props.card.id],
    });
    
    this._subscribe(Store, {
      updater: (state) =>
      {
        if(state.hoveringCardId === this.props.card.id)
        {
          this.setState({
            hovering: true,
          });
        }
        else
        {
          this.setState({
            hovering: false,
          });
        }

      }
    });
  }
  
  getCardTerms(card:BuilderTypes.ICard): List<string>
  {
    var terms: List<string> = Immutable.List([]);
    
    if(card.static.getChildTerms)
    {
      terms = card.static.getChildTerms(card);
    }
    
    if(card.static.getNeighborTerms)
    {
      terms = terms.merge(card.static.getNeighborTerms(card));
    }
    
    return terms;
  }
  
  componentWillReceiveProps(nextProps:Props)
  {
    var allTerms = this.props.keys;
    var {cardTerms} = this.state;
    var changed = false;
    
    if(nextProps.card !== this.props.card)
    {
      // check for new terms
      let terms = this.getCardTerms(nextProps.card);
      if(!this.state.cardTerms.equals(terms))
      {
        changed = true;
        cardTerms = terms;
      }
    }
    
    if(this.props.keys !== nextProps.keys || changed)
    {
      changed = true;
      allTerms = nextProps.keys.merge(cardTerms);
    }
    
    
    if(changed)
    {
      this.setState({
        cardTerms,
        allTerms,
      });
    }
  }
  
  dragPreview: any;
  componentDidMount()
  {
    this.dragPreview = createDragPreview(
      this.props.card.static.title + ' (' + BuilderTypes.getPreview(this.props.card) + ')',
    {
      backgroundColor: this.props.card.static.colors[1],
      borderColor: this.props.card.static.colors[0],
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
  }
  
  // hex2rgba(color: string)
  // {
  //     var r, g, b;
  //     if(color.charAt(0) == '#')
  //     {
  //       color = color.substr(1);
  //     }

  //     r = color.charAt(0) +'' + color.charAt(1);
  //     g = color.charAt(2) + '' + color.charAt(3);
  //     b = color.charAt(4) + '' + color.charAt(5);

  //     r = parseInt( r,16 );
  //     g = parseInt( g,16 );
  //     b = parseInt( b ,16);
  //     return "rgba(" + r + "," + g + "," + b + ", 0.4)"; 
  // }

  // componentWillReceiveProps(nextProps:any) {
  //     var darkCardColor = CardColors[nextProps.card.type] ? CardColors[nextProps.card.type][0] : CardColors['none'][0];
  //     var lightCardColor = CardColors[nextProps.card.type] ? CardColors[nextProps.card.type][1] : CardColors['none'][1];
      
  //     if(nextProps.card.faded)
  //     {
  //       darkCardColor = this.hex2rgba(darkCardColor);
  //       lightCardColor = this.hex2rgba(lightCardColor);
  //     }
  //     var borderColor = nextProps.card.highlighted ? '#f4ff00' : darkCardColor;
  //     var borderWidth = nextProps.card.highlighted ? '2px' : '1px';

  //     this.setState({
  //       titleStyle: {
  //       background: darkCardColor,
  //     },
  //     bodyStyle: {
  //       background: lightCardColor,
  //       borderColor: borderColor,
  //       borderWidth: borderWidth,
  //     },
  //     })
  // },
  
  handleDraggedAway()
  {
    // Util.animateToHeight(this.refs['cardContainer'], 0);
  }
  
  handleDropped()
  {
    // Util.animateToAutoHeight(this.refs['cardContainer']);
  }
  
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
	}
  
  handleTitleClick(event)
  {
    // TODO decide how selection mechanics work.
    //  consider limiting selection to neighbors.
    // if(!this.props.canEdit)
    // {
    //   return;
    // }
    
    // event.stopPropagation();
    // event.preventDefault();
    // Actions.selectCard(this.props.card.id, event.shiftKey, event.altKey);
  }
  
  handleDelete()
  {
    Util.animateToHeight(this.refs.cardInner, 0);
    setTimeout(() =>
      Actions.remove(this.props.keyPath, this.props.index)
    , 250);
  }
  
  handleCopy()
  {
  }
  
  addCardBelow()
  {
    this.setState({
      addingCardBelow: !this.state.addingCardBelow,
    });
  }
  
  addCardAbove()
  {
    this.setState({
      addingCardAbove: !this.state.addingCardAbove,
    });
  }
  
  minimizeCreateCard()
  {
    this.setState({
      addingCardAbove: false,
      addingCardBelow: false,
    });
  }
  
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
  }
  
  handleMouseMove(event)
  {
    event.stopPropagation();
    Actions.hoverCard(this.props.card.id);
  }

	render()
  {
    var content = <BuilderComponent
      keys={this.state.allTerms}
      canEdit={this.props.canEdit}
      data={this.props.card}
      helpOn={this.props.helpOn}
      addColumn={this.props.addColumn}
      colIndex={this.props.colIndex}
      keyPath={
        this.props.singleCard
        ? this.props.keyPath
        : this._ikeyPath(this.props.keyPath, this.props.index)
      }
    />;

		var contentToDisplay = (
			<div className={'card-content' + (this.props.singleCard ? ' card-content-single' : '')}>
				{content}
			</div>
		);
    
    var manualPopupStyle = this.props.canEdit ? {} : {right: '4px'}
		//var title = Util.titleForCard(this.props.card);

    let {card} = this.props;
		let {title} = card.static;
    const { isDragging, connectDragSource } = this.props;
    
    return ( 
      <div
        className={classNames({
          'card': true,
          'card-dragging': isDragging,
          'card-closed' : !this.state.open,
          'single-card': this.props.singleCard,
          'card-selected': this.state.selected,
          [card.type + '-card']: true,
        })}
        rel={'card-' + card.id}
        onMouseMove={this.handleMouseMove}
      >
        <div ref='cardContainer' className='card-container'>
          { !this.props.singleCard &&
            <CreateCardTool
              {...this.props}
              open={this.state.addingCardAbove}
              onMinimize={this.minimizeCreateCard}
            />
          }
          { this.renderAddCard() }
          <div
            className={'card-inner ' + (this.props.singleCard ? 'single-card-inner' : '')}
            style={{
              background: card.static.colors[1],
              borderColor: card.static.colors[0],
            }}
            ref='cardInner'
          >
            {
              connectDragSource(
                <div
                  className={classNames({
                    'card-title': true,
                    'card-title-closed': !this.state.open,
                    'card-title-card-hovering': this.state.hovering,
                  })}
                  style={{
                    background: card.static.colors[0],
                  }}
                  onClick={this.handleTitleClick}
                  >
                  <ArrowIcon className="card-arrow-icon" onClick={this.toggleClose} />
                  { title }
                  <span className={classNames({
                    'card-preview': true,
                    'card-preview-hidden': this.state.open
                  })}>
                    { BuilderTypes.getPreview(card) }
                  </span>
                  <ManualPopup 
                    cardName={card.static.title.replace(' / ', ' ')} 
                    style={manualPopupStyle}
                    addColumn={this.props.addColumn}
                    index={this.props.colIndex}
                  />
                  {
                    this.props.canEdit && <Menu options={this.state.menuOptions} />
                  }
                </div>
              )
            }
            <CardDropArea
              half={true}
              keyPath={this.props.keyPath}
              index={this.props.index}
            />
            <CardDropArea
              half={true}
              lower={true}
              keyPath={this.props.keyPath}
              index={this.props.index}
            />
            <div className='card-body' ref='cardBody'>
              { contentToDisplay }
            </div>
          </div>
          { this.renderAddCard(true) }
          { !this.props.singleCard &&
            <CreateCardTool
              {...this.props}
              index={this.props.index + 1}
              open={this.state.addingCardBelow}
              onMinimize={this.minimizeCreateCard}
            />
          }
        </div>
      </div>
    );
	}
}


// Drag and Drop (the bass)

export interface CardItem
{
  props: Props;
  childIds: Map<ID, boolean>;
}

const cardSource = 
{
  canDrag: (props) => props.canEdit,
  
  beginDrag: (props: Props): CardItem =>
  {
    setTimeout(() => $('body').addClass('body-card-is-dragging'), 100);
    return {
      props,
      childIds: BuilderTypes.getChildIds(props.card),
    }
  },
  // select card?
  
  endDrag: () =>
  {
    $('body').removeClass('body-card-is-dragging');
  }
}

const dragCollect = (connect, monitor) =>
({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
  connectDragPreview: connect.dragPreview()
});


export default DragSource('CARD', cardSource, dragCollect)(Card);