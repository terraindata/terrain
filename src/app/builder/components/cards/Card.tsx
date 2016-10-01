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
import { DragSource } from 'react-dnd';
var { createDragPreview } = require('react-dnd-text-dragpreview');
import Util from '../../../util/Util.tsx';
import LayoutManager from "../layout/LayoutManager.tsx";
import ManualPopup from './../../../manual/components/ManualPopup.tsx';
import { Menu, MenuOption } from '../../../common/components/Menu.tsx';
import Actions from "../../data/BuilderActions.tsx";
import BuilderTypes from './../../BuilderTypes.tsx';
import { Display } from './../../BuilderDisplays.tsx';
import Store from "./../../data/BuilderStore.tsx";
import PureClasss from './../../../common/components/PureClasss.tsx';
import CardDropArea from './CardDropArea.tsx';
import CreateCardTool from './CreateCardTool.tsx';
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
  columnIndex?: number;
  
  isDragging?: boolean;
  connectDragPreview?: (a?:any) => void;
  connectDragSource?: (el: El) => El;

  helpOn?: boolean;
  display?: Display;
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
    
    cardIsClosed: boolean;
  }
  
  refs: {
    [k: string]: Ref;
    cardBody: Ref;
    cardInner: Ref;
    cardContent: Ref;
  }
  
  constructor(props:Props)
  {
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
          // {
          //   text: 'Copy',
          //   onClick: this.handleCopy,
          // },
          {
            text: 'Duplicate',
            onClick: this.handleDuplicate,
          },
          // {
          //   text: 'Hide',
          //   onClick: this.toggleClose,
          // },
          {
            text: 'Delete',
            onClick: this.handleDelete,
          },
        ]),
     
     cardIsClosed: this.props.card.closed,
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
    if(this.props.card.type === 'creating')
    {
      return;
    }
    
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
    Actions.change(
      this.getKeyPath().push('closed'), 
      !this.props.card.closed
    );
    
    // this.setState({
    //   open: ! this.state.open,
    // })
    
    if(!this.props.card.closed)
    {
      setTimeout(() => 
        Util.animateToHeight(this.refs.cardContent, 0, () =>
          this.setState({
            cardIsClosed: true,
          })
        ),
      300);
    }
    else
    {
      setTimeout(() => 
        Util.animateToAutoHeight(
          this.refs.cardContent,
          () =>
            this.setState({
              cardIsClosed: false,
            })
        ),
      300);
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
  
  handleDuplicate()
  {
    if(this.props.singleCard)
    {
      alert("Can't duplicate this card because it is not in a position where it can have neighborhing cards. Try moving it to another spot on the Builder and duplicating it there.");
      return;
    }
    
    let removeId = (block) => {
      if(Immutable.Iterable.isIterable(block))
      {
        if(block.get('id'))
        {
          block = block.set('id', '');
        }
        let b = block.map(removeId);
        if(!b)
        {
          //records don't have a map fn
          b = block.toMap().map(removeId);
        }
        return b;
      }
      
      return block;
    };
    
    let card = BuilderTypes.recordFromJS(BuilderTypes.recordsForServer(removeId(this.props.card)).toJS());
    
    Actions.create(this.props.keyPath, this.props.index + 1, card.type, card);
    
  }
  
  handleMouseMove(event)
  {
    event.stopPropagation();
    if(!this.state.hovering)
    {
      Actions.hoverCard(this.props.card.id);
    }
  }
  
  getKeyPath()
  {
    return this.props.singleCard
        ? this.props.keyPath
        : this._ikeyPath(this.props.keyPath, this.props.index);
  }
  
  handleCardToolClose()
  {
    if(this.props.index === null)
    {
      Actions.change(this.props.keyPath, '');
    }
    else
    {
      Actions.remove(this.props.keyPath, this.props.index);
    }
  }

	render()
  {
    if(this.props.card.type === 'creating')
    {
      // not a card at all, in fact. a create card marker
      console.log(this.props.display);
      return (
        <CreateCardTool
          canEdit={this.props.canEdit}
          index={this.props.index}
          keyPath={this.props.keyPath}
          open={true}
          onClose={this.handleCardToolClose}
          accepts={this.props.display && this.props.display.accepts}
        />
      );
    }
    
    var content = <BuilderComponent
      keys={this.state.allTerms}
      canEdit={this.props.canEdit}
      data={this.props.card}
      helpOn={this.props.helpOn}
      addColumn={this.props.addColumn}
      columnIndex={this.props.columnIndex}
      keyPath={this.getKeyPath()}
    />;

    let {card} = this.props;
		let {title} = card.static;
    const { isDragging, connectDragSource } = this.props;
    
    // TODO
    // <ManualPopup 
    //                 cardName={card.static.title} 
    //                 rightAlign={!this.props.canEdit}
    //                 addColumn={this.props.addColumn}
    //                 columnIndex={this.props.columnIndex}
    //               />
    
    return ( 
      <div
        className={classNames({
          'card': true,
          'card-dragging': isDragging,
          'card-closed' : this.props.card.closed,
          'single-card': this.props.singleCard,
          'card-selected': this.state.selected,
          'card-hovering': this.state.hovering,
          'card-is-closed': this.state.cardIsClosed,
          [card.type + '-card']: true,
        })}
        rel={'card-' + card.id}
        onMouseMove={this.handleMouseMove}
      >
        <div ref='cardContainer' className='card-container'>
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
                    'card-title-closed': this.props.card.closed,
                    'card-title-card-hovering': this.state.hovering,
                  })}
                  style={{
                    background: card.static.colors[0],
                  }}
                  onClick={this.handleTitleClick}
                  >
                  <ArrowIcon className="card-arrow-icon" onClick={this.toggleClose} />
                  <div className='card-title-inner'>
                    { title }
                  </div>
                  <div className={classNames({
                    'card-preview': true,
                    'card-preview-hidden': !this.props.card.closed,
                  })}>
                    { BuilderTypes.getPreview(card) }
                  </div>
                  
                </div>
              )
            }
            {
              this.props.canEdit && <Menu options={this.state.menuOptions} />
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
              <div
                className={'card-content' + (this.props.singleCard ? ' card-content-single' : '')}
                ref='cardContent'
              >
                {content}
              </div>
            </div>
          </div>
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
      childIds: BuilderTypes.getChildIds(props.card)
        .remove(props.card.id),
    };
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