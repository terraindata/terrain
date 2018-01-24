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

// tslint:disable:no-empty strict-boolean-expressions no-var-requires

import * as classNames from 'classnames';
import { List } from 'immutable';
import * as Radium from 'radium';
import * as React from 'react';

import { Card, Cards } from '../../../../blocks/types/Card';
import BuilderActions from '../../data/BuilderActions';
import { BuilderState } from '../../data/BuilderStore';
import { CardComponent, CardItem } from '../cards/CardComponent';
import TerrainComponent from './../../../common/components/TerrainComponent';
import CardDragPreview from './CardDragPreview';
import CreateCardTool from './CreateCardTool';
import Util from 'util/Util';

const AddIcon = require('./../../../../images/icon_add_7x7.svg?name=AddIcon');

export interface Props
{
  cards: Cards;
  canEdit: boolean;
  keyPath: KeyPath;
  language: string;

  addColumn?: (number, string?) => void;
  columnIndex?: number;
  className?: string;
  connectDropTarget?: (el: JSX.Element) => JSX.Element;
  helpOn?: boolean;
  accepts?: List<string>;
  card?: any;
  noCardTool?: boolean;
  singleChild?: boolean;
  hideCreateCardTool?: boolean;
  handleCardDrop?: (type: string) => any;

  // Tuning column
  tuningMode?: boolean;
  allowTuningDragAndDrop?: boolean;
  handleCardReorder?: (card, index) => void;

  builder?: BuilderState;
  builderActions?: typeof BuilderActions;
}

interface KeyState
{
  keyPath: KeyPath;
}

interface State extends KeyState
{
  cardToolOpen: boolean;
  isDraggingCardOver: boolean;
  draggingOverIndex: number;
  draggingCardItem: CardItem | null;
}

@Radium
class CardsArea extends TerrainComponent<Props>
{
  public state: State = {
    keyPath: null,
    cardToolOpen: true,
    isDraggingCardOver: false,
    draggingOverIndex: -1,
    draggingCardItem: null,
  };

  constructor(props: Props)
  {
    super(props);
    this.state.cardToolOpen = props.cards.size === 0;
  }

  public componentWillReceiveProps(nextProps)
  {
    if (nextProps.builder.draggingCardItem !== null &&
      nextProps.builder.draggingOverKeyPath === this.props.keyPath)
    {
      // dragging over
      if (nextProps.builder.draggingOverIndex !== this.state.draggingOverIndex)
      {
        this.setState({
          isDraggingCardOver: true,
          draggingOverIndex: nextProps.builder.draggingOverIndex,
          draggingCardItem: nextProps.builder.draggingCardItem,
        });
      }
    }
    else
    {
      // not dragging over
      if (this.state.isDraggingCardOver)
      {
        this.setState({
          isDraggingCardOver: false,
          draggingOverIndex: -1,
          draggingCardItem: null,
        });
      }
    }
  }

  public copy() { }

  public clear() { }

  public createFromCard()
  {
    this.props.builderActions.create(this.props.keyPath, 0, 'sfw');
  }

  public toggleCardTool()
  {
    this.setState({
      cardToolOpen: !this.state.cardToolOpen,
    });
  }

  public render()
  {
    const { props } = this;
    const { cards, canEdit } = props;
    const renderCardTool = !this.props.noCardTool && (!this.props.singleChild || cards.size === 0);

    const { isDraggingCardOver, draggingCardItem, draggingOverIndex } = this.state;
    const { keyPath } = this.props;

    return (
      <div>
        <div
          className={classNames({
            'cards-area': true,
            [this.props.className]: !!this.props.className,
          })}

        >
          {
            cards.filter((card: Card) => card.hidden === false).map((card: Card, index: number) =>
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
                  language={this.props.language}
                  handleCardDrop={this.props.handleCardDrop}
                  builder={this.props.builder}
                  builderActions={this.props.builderActions}
                />
                <CardComponent
                  card={card}
                  language={this.props.language}
                  index={index}
                  singleCard={false}
                  canEdit={this.props.canEdit}
                  keyPath={this.props.keyPath}
                  accepts={this.props.accepts}
                  singleChild={this.props.singleChild}

                  addColumn={this.props.addColumn}
                  columnIndex={this.props.columnIndex}
                  helpOn={this.props.helpOn}
                  handleCardDrop={this.props.handleCardDrop}
                  tuningMode={this.props.tuningMode}
                  allowTuningDragAndDrop={this.props.allowTuningDragAndDrop}
                  handleCardReorder={this.props.handleCardReorder}
                />
              </div>,
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
            language={this.props.language}
            handleCardDrop={this.props.handleCardDrop}
            builder={this.props.builder}
            builderActions={this.props.builderActions}
          />

          {
            !this.props.hideCreateCardTool &&
            !this.props.tuningMode &&
            renderCardTool &&
            <CreateCardTool
              language={this.props.language}
              canEdit={this.props.canEdit}
              keyPath={this.props.keyPath}
              index={props.cards.size}
              open={this.state.cardToolOpen}
              className='nested-create-card-tool-wrapper'
              accepts={this.props.accepts}
              data={this.props.card}
              onToggle={this._toggle('cardToolOpen')}
              hidePlaceholder={this.props.singleChild}
              cannotClose={cards.size === 0}
              handleCardDrop={this.props.handleCardDrop}
            />
          }

        </div>
      </div>
    );
  }
}

export default Util.createTypedContainer(
  CardsArea,
  ['builder'],
  { builderActions: BuilderActions },
);
