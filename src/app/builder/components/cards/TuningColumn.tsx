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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as React from 'react';
import BuilderActions from '../../data/BuilderActions';
import { scrollAction } from '../../data/BuilderScrollStore';
import Switch from './../../../common/components/Switch';
import TerrainComponent from './../../../common/components/TerrainComponent';
import CardDropArea from './CardDropArea';
import CardsArea from './CardsArea';
import './CardsColumn.less';
import CardsDeck from './CardsDeck';
const Dimensions = require('react-dimensions');
import { forAllCards } from '../../../../blocks/BlockUtils';
import { Cards } from '../../../../blocks/types/Card';
import { AllBackendsMap } from '../../../../database/AllBackends';
import { altStyle, backgroundColor, Colors, fontColor } from '../../../colors/Colors';
import InfoArea from '../../../common/components/InfoArea';
import Modal from '../../../common/components/Modal';
import Util from '../../../util/Util';
import { BuilderState } from '../../data/BuilderStore';
const { List, Map } = Immutable;

export interface Props
{
  language: string;
  queryId: ID;
  canEdit: boolean;
  addColumn: (number, string?) => void;
  columnIndex: number;

  containerWidth?: number;
  containerHeight?: number;
  tuning?: boolean;

  builder?: BuilderState;
  builderActions?: typeof BuilderActions;
}

class TuningColumn extends TerrainComponent<Props>
{
  public state: {
    keyPath: KeyPath;
    allCards: Cards,
    tuningOrder: List<string>,
    showNoCardsModal: boolean,
    noCardsMessage: string,
  } = {
      keyPath: this.computeKeyPath(this.props),
      allCards: List([]),
      tuningOrder: List([]),
      showNoCardsModal: false,
      noCardsMessage: '',
    };

  public tuningCards: Cards = List([]);
  public tuningIds: List<string> = List([]);
  public prevTuningIds: List<string> = List([]);
  public tempTuningOrder: List<string> = List([]);

  public setTuningCards(newCards)
  {
    // Set up buffers for getting tuning cards
    this.tempTuningOrder = this.state.tuningOrder;
    this.prevTuningIds = this.state.tuningOrder;
    this.tuningIds = List([]);
    this.tuningCards = List([]);
    // Get cards that were added to tuning
    this.updateTuningCards(newCards);
    // Remove any cards that were removed from tuning
    this.removeCardsFromBuffer();
    this.setState({
      allCards: newCards,
      tuningOrder: this.tempTuningOrder,
    });
    // Update tuning order in TerrainStore
    this.changeTuningOrder(this.tempTuningOrder);
  }

  public componentWillMount()
  {
    const order = this.props.builder.query.tuningOrder;
    this.setState({
      tuningOrder: order !== undefined ? List(order) : List([]),
    });
  }

  public changeTuningOrder(newOrder)
  {
    if (!_.isEqual(newOrder, this.props.builder.query.tuningOrder))
    {
      this.props.builderActions.change(List(this._keyPath('query', 'tuningOrder')),
        newOrder);
    }
  }

  public componentWillUnmount()
  {
    this.changeTuningOrder(this.state.tuningOrder);
  }

  // Sort tuning cards using tuning order
  public sortTuningCards()
  {
    this.tuningCards = this.tuningCards.sortBy((card) =>
      this.state.tuningOrder.indexOf(card.id),
    ).toList();
  }

  // Look for cards that have been removed from tuning and remove them from order
  public removeCardsFromBuffer()
  {
    this.prevTuningIds.forEach((id) =>
    {
      if (this.tuningIds.indexOf(id) === -1)
      {
        const index = this.tempTuningOrder.indexOf(id);
        this.tempTuningOrder = this.tempTuningOrder.remove(index);
      }
    });
  }

  public updateTuningCards(cards)
  {
    forAllCards(cards, (card, keyPath) =>
    {
      if (card.tuning)
      {
        this.tuningCards = this.tuningCards.push(card);
        this.tuningIds = this.tuningIds.push(card.id);
        if (this.prevTuningIds.indexOf(card.id) === -1)
        {
          this.tempTuningOrder = this.tempTuningOrder.push(card.id);
        }
      }
    });
  }

  public computeKeyPath(props: Props): KeyPath
  {
    return List(this._keyPath('query', 'cards'));
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (!_.isEqual(this.state.allCards, nextProps.builder.query.cards))
    {
      this.setTuningCards(nextProps.builder.query.cards);
    }

    if (nextProps.queryId !== this.props.queryId)
    {
      this.setState({
        keyPath: this.computeKeyPath(nextProps),
      });
    }
  }

  public handleCardReorder(card, index)
  {
    const oldIndex = this.state.tuningOrder.indexOf(card.id);
    if (oldIndex === index)
    {
      return;
    }
    let newOrder = List([]);
    if (index < oldIndex)
    {
      newOrder = this.state.tuningOrder.insert(index, card.id).remove(oldIndex + 1);
    }
    else
    {
      newOrder = this.state.tuningOrder.remove(oldIndex).insert(index, card.id);
    }
    this.setState({
      tuningOrder: newOrder,
    });
    this.changeTuningOrder(newOrder);
  }

  public findCardType(cards, type)
  {
    forAllCards(cards, (card, kp) =>
    {
      if (card.type === type)
      {
        this.tuningCards = this.tuningCards.push(card);
        this.tuningIds = this.tuningIds.push(card.id);
        this.tempTuningOrder = this.tempTuningOrder.push(card.id);
        const keyPaths = Immutable.Map(this.props.builder.query.cardKeyPaths);
        if (keyPaths.get(card.id) !== undefined)
        {
          const keyPath = Immutable.List(keyPaths.get(card.id));
          this.props.builderActions.change(keyPath.push('tuning'), true);
        }
      }
    });
  }

  public addScoreCards()
  {
    this.findCardType(this.state.allCards, 'elasticScore');
    if (this.tuningCards.size === 0)
    {
      this.setState({
        showNoCardsModal: true,
        noCardsMessage: 'There are currently no Terrain Score cards in your query',
      });
    }
  }

  public addFilterCards()
  {
    this.findCardType(this.state.allCards, 'elasticFilter');
    if (this.tuningCards.size === 0)
    {
      this.setState({
        showNoCardsModal: true,
        noCardsMessage: 'There are currently no Terrain Filter cards in your query',
      });
    }
  }

  public addScoreAndFilterCards()
  {
    this.findCardType(this.state.allCards, 'elasticFilter');
    this.findCardType(this.state.allCards, 'elasticScore');
    if (this.tuningCards.size === 0)
    {
      this.setState({
        showNoCardsModal: true,
        noCardsMessage: 'There are currently no Terrain Score or Filter cards in your query',
      });
    }
  }

  public closeModal()
  {
    this.setState({
      showNoCardsModal: false,
    });
  }

  public renderNoCardsModal()
  {
    return (
      <Modal
        open={this.state.showNoCardsModal}
        message={this.state.noCardsMessage}
        title={'No Cards to Add'}
        onClose={this.closeModal}
      />
    );
  }

  public render()
  {
    const { canEdit, language, addColumn, columnIndex } = this.props;
    const { keyPath } = this.state;
    this.sortTuningCards();
    return (
      <div
        className='cards-column'
      >
        <div
          className='tuning-column-cards-area'

          id='cards-column'
        >
          <div
            id='cards-column-inner'
          >
            {this.renderNoCardsModal()}
            <CardsArea
              cards={this.tuningCards}
              language={language}
              keyPath={keyPath}
              canEdit={canEdit}
              addColumn={addColumn}
              columnIndex={columnIndex}
              noCardTool={true}
              tuningMode={true}
              handleCardReorder={this.handleCardReorder}
              ref='cardsArea'
              allowTuningDragAndDrop={true}
            />
            {
              !this.tuningCards.size ?
                <InfoArea
                  large={'Build a customized control panel by adding cards to the tuning column that you are most likely to change'}
                  small={'Add cards to this view by selecting individual cards or by choosing one of the following'}
                  buttons={['Add Terrain Score Cards', 'Add Terrain Filter Cards', 'Add Terrain Score and Filter Cards']}
                  buttonFunctions={[this.addScoreCards, this.addFilterCards, this.addScoreAndFilterCards]}
                  inline={false}
                />
                : null
            }
          </div>
        </div>
      </div>
    );
  }
}

const TuningColumnContainer = Util.createTypedContainer(
  TuningColumn,
  ['builder'],
  { builderActions: BuilderActions },
);

export default Dimensions()(TuningColumnContainer);
