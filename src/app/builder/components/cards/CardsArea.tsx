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

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as _ from 'underscore';
import * as $ from 'jquery';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Util from '../../../util/Util.tsx';
import Actions from "../../data/BuilderActions.tsx";
import {BuilderStore, BuilderState} from "../../data/BuilderStore.tsx";
import {Card, CardItem} from "../cards/Card.tsx";
import CreateCardTool from "./CreateCardTool.tsx";
import PureClasss from './../../../common/components/PureClasss.tsx';
import BuilderTypes from '../../BuilderTypes.tsx';
type ICard = BuilderTypes.ICard;
type ICards = BuilderTypes.ICards;
let {List} = Immutable;
import CardDropArea from './CardDropArea.tsx';
import CardDragPreview from './CardDragPreview.tsx';
var AddIcon = require("./../../../../images/icon_add_7x7.svg?name=AddIcon");

interface Props
{
  cards: ICards;
  canEdit: boolean;
  keyPath: KeyPath;
  
  addColumn?: (number, string?) => void;
  columnIndex?: number;
  className?: string;
  connectDropTarget?: (el:JSX.Element) => JSX.Element;
  helpOn?: boolean;
  accepts?: List<string>;
  noCardTool?: boolean;
  singleChild?: boolean;
}

interface KeyState {
  keyPath: KeyPath;
}

interface State extends KeyState {
  learningMode: boolean;
  cardToolOpen: boolean;
  isDraggingCardOver: boolean;
  draggingOverIndex: number;
  draggingCardItem: CardItem;
}

class CardsArea extends PureClasss<Props>
{
  state: State = {
    keyPath: null,
    learningMode: this.props.helpOn,
    cardToolOpen: true,
    isDraggingCardOver: false,
    draggingOverIndex: -1,
    draggingCardItem: null,
  };

  constructor(props:Props)
  {
    super(props);
    this.state.cardToolOpen = props.cards.size === 0;
    
    this._subscribe(BuilderStore, {
      updater: (state: BuilderState) =>
      {
        if(state.draggingCardItem && state.draggingOverKeyPath === this.props.keyPath)
        {
          // dragging over
          if(state.draggingOverIndex !== this.state.draggingOverIndex)
          {
            this.setState({
              isDraggingCardOver: true,
              draggingOverIndex: state.draggingOverIndex,
              draggingCardItem: state.draggingCardItem,
            });
          }
        }
        else
        {
          // not dragging over
          if(this.state.isDraggingCardOver)
          {
            this.setState({
              isDraggingCardOver: false,
              draggingOverIndex: -1,
              draggingCardItem: null,
            })
          }
        }
      }
    });
  }
  
  componentWillReceiveProps(nextProps:Props)
  {
    this.setState({
      cardToolOpen: nextProps.cards.size === 0,
    });
  }
  
  copy() {}
  
  clear() {}
  
  createFromCard()
  {
    Actions.create(this.props.keyPath, 0, 'sfw');
  }
  
  toggleView()
  {
    this.setState({
      learningMode: !this.state.learningMode,
    })
  }
  
  toggleCardTool()
  {
    this.setState({
      cardToolOpen: !this.state.cardToolOpen,
    });
  }

  render()
  {
    let {props} = this;
    let {cards, canEdit} = props;
    var renderCardTool = !this.props.noCardTool && (!this.props.singleChild || cards.size === 0);
    
    let {isDraggingCardOver, draggingCardItem, draggingOverIndex} = this.state;
    let {keyPath} = this.props;
    
    return (
      <div> 
        <div
          className={classNames({
            'cards-area': true,
            [this.props.className]: !!this.props.className,
          })}
        >
          {
            cards.map((card:ICard, index:number) =>
              <div
                key={card.id}
              >
                <CardDragPreview
                  cardItem={draggingCardItem}
                  isInList={true}
                  visible={isDraggingCardOver && draggingOverIndex === index}
                  index={index}
                  keyPath={keyPath}
                  accepts={this.props.accepts}
                  singleChild={this.props.singleChild}
                  wrapType={card.type}
                />
                <Card
                  card={card}
                  index={index}
                  singleCard={false}
                  canEdit={this.props.canEdit}
                  keyPath={this.props.keyPath}
                  accepts={this.props.accepts}
                  singleChild={this.props.singleChild}
                  
                  addColumn={this.props.addColumn}
                  columnIndex={this.props.columnIndex}
                  helpOn={this.state.learningMode || this.props.helpOn}
                />
              </div>
            )
          }
          
          <CardDragPreview
            cardItem={draggingCardItem}
            isInList={true}
            visible={isDraggingCardOver && draggingOverIndex === cards.size}
            index={cards.size}
            keyPath={keyPath}
            accepts={this.props.accepts}
            singleChild={this.props.singleChild}
            wrapType={this.props.singleChild && cards && cards.size === 1 && cards.get(0).type}
            wrapUp={true}
          />
          
          {
            renderCardTool &&
              <CreateCardTool
                canEdit={this.props.canEdit}
                keyPath={this.props.keyPath}
                index={props.cards.size}
                open={this.state.cardToolOpen}
                className='nested-create-card-tool-wrapper'
                accepts={this.props.accepts}
                onToggle={this._toggle('cardToolOpen')}
                hidePlaceholder={this.props.singleChild || cards.size === 0}
                cannotClose={cards.size === 0}
              />
          }
          
        </div>
      </div>
    );
  }
}

export default CardsArea;
