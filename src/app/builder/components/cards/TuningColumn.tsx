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
import Actions from '../../data/BuilderActions';
import { scrollAction } from '../../data/BuilderScrollStore';
import Switch from './../../../common/components/Switch';
import TerrainComponent from './../../../common/components/TerrainComponent';
import CardDropArea from './CardDropArea';
import CardsArea from './CardsArea';
import './CardsColumn.less';
import CardsDeck from './CardsDeck';
const Dimensions = require('react-dimensions');
import { AllBackendsMap } from '../../../../database/AllBackends';
import { altStyle, backgroundColor, Colors, fontColor } from '../../../common/Colors';
import { BuilderState, BuilderStore } from '../../data/BuilderStore';

import { Cards } from '../../../../blocks/types/Card';
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
}

class TuningColumn extends TerrainComponent<Props>
{
  public state: {
    keyPath: KeyPath;
    allCards: Cards,
    shouldUpdate: boolean,
  } = {
    keyPath: this.computeKeyPath(this.props),
    allCards: List([]),
    shouldUpdate: true,
  };

  public tuningCards: Cards = List([]);

  public innerHeight: number = -1;

  public constructor(props: Props)
  {
    super(props);
    this._subscribe(BuilderStore, {
      updater: (state: BuilderState) =>
      {
        if (!_.isEqual(this.state.allCards, state.query.cards) && this.state.shouldUpdate)
        {
          this.tuningCards = List([]);
          this.updateTuningCards(state.query.cards);
          this.setState({
            allCards: state.query.cards,
          });
        }
      },
    });
  }

  // public orderCards()
  // {
  //   let lastPos = this.tuningCards.size - 1;
  //   this.tuningCards = List(this.tuningCards.sortBy((card) => {
  //     if (card.tuningIndex === undefined)
  //     {
  //       lastPos += 1;
  //       return lastPos - 1;
  //     }
  //     return card.tuningIndex;
  //   })) as Cards;
  //   console.log(this.tuningCards);
  //   this.setState({
  //     shouldUpdate: false,
  //   });
  //   let index = 0;
  //   const keyPaths = BuilderStore.getState().cardKeyPaths;
  //   this.tuningCards.forEach((card) => {
  //     if (keyPaths.get(card.id) !== undefined)
  //     {
  //       Actions.change(keyPaths.get(card.id).push('tuningIndex'), index);
  //       index += 1;
  //     }
  //   });
  //   this.setState({
  //     shouldUpdate: true,
  //   });
  // }

  /*

          const keyPaths = BuilderStore.getState().cardKeyPaths;
        if (keyPaths.get(card.id) !== undefined)
        {
          console.log('time to update the index...'); // if it was undefined before (maybe don't do this here .....)
          // Actions.change(keyPaths.get(card.id).push('tuningIndex'), this.tuningCards.size - 1);
        }
        */

  /*
     before the render (or after tuning cards is updated), go through each of the cards in the list
     if the tuningIndex is defined leave it
     if the tuningIndex is undefined set that card to be at the end of the list
     adjust the list so the indexes are in order (if you removed the first card or something, have to shift down)
     set all new indexes with Actions
     render in that order
  */

  public updateTuningCards(cards)
  {
    cards.forEach((card) =>
    {
      if (card.tuning)
      {
        this.tuningCards = this.tuningCards.push(card);
      }
      if (card.cards !== undefined && card.cards.size > 0)
      {
        this.updateTuningCards(card.cards);
      }
      if (card.weights !== undefined && card.weights.size > 0)
      {
        this.updateTuningCards(card.weights);
      }
    });
  }

  public computeKeyPath(props: Props): KeyPath
  {
    return List(this._keyPath('query', 'cards'));
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.queryId !== this.props.queryId)
    {
      this.setState({
        keyPath: this.computeKeyPath(nextProps),
      });
    }
  }

  public afterDrop(item, targetProps)
  {
    // console.log('card drop boooom');
  }

  public render()
  {
    const { canEdit, language, addColumn, columnIndex } = this.props;
    const { keyPath } = this.state;
    return (
      <div
        className='cards-column'
      >
        <div
          className='cards-column-cards-area'

          id='cards-column'
        >
          <div
            id='cards-column-inner'
          >
            <CardsArea
              cards={this.tuningCards}
              language={language}
              keyPath={keyPath}
              canEdit={canEdit}
              addColumn={addColumn}
              columnIndex={columnIndex}
              noCardTool={true}
              accepts={this.getPossibleCards()}
              tuningMode={true}
            />
            <CardDropArea
              half={true}
              lower={true}
              index={this.tuningCards.size}
              keyPath={keyPath}
              heightOffset={0}
              accepts={this.getPossibleCards()}
              language={this.props.language}
              afterDrop={this.afterDrop}
            />
          </div>
        </div>
      </div>
    );
  }

  private getPossibleCards()
  {
    return AllBackendsMap[this.props.language].cardsList;
  }
}

export default Dimensions()(TuningColumn);
