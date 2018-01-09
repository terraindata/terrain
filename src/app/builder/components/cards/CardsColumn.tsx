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
import * as React from 'react';
import InfoArea from '../../../common/components/InfoArea';
import Util from '../../../util/Util';
import Actions from '../../data/BuilderActions';
import { scrollAction } from '../../data/BuilderScrollStore';
import Switch from './../../../common/components/Switch';
import TerrainComponent from './../../../common/components/TerrainComponent';
import CardDropArea from './CardDropArea';
import CardsArea from './CardsArea';
import './CardsColumn.less';
import CardsDeck from './CardsDeck';
const Dimensions = require('react-dimensions');
import { Cards } from '../../../../blocks/types/Card';
import { AllBackendsMap } from '../../../../database/AllBackends';
import { ElasticBlocks } from '../../../../database/elastic/blocks/ElasticBlocks';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../colors/Colors';
import { ColorsActions } from './../../../colors/data/ColorsRedux';
const { List, Map } = Immutable;
const ExpandIcon = require('./../../../../images/icon_expand_12x12.svg?name=ExpandIcon');

export interface Props
{
  cards: Cards;
  language: string;
  deckOpen: boolean;
  queryId: ID;
  canEdit: boolean;
  addColumn: (number, string?) => void;
  columnIndex: number;
  cardsAndCodeInSync: boolean;

  containerWidth?: number;
  containerHeight?: number;

  colorsActions: typeof ColorsActions;

}

class CardsColumn extends TerrainComponent<Props>
{
  public state: {
    keyPath: KeyPath;
  } = {
      keyPath: this.computeKeyPath(this.props),
    };

  public innerHeight: number = -1;

  public componentDidMount()
  {
    this.handleScroll();
  }

  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.cards-deck-knob .cards-deck-knob-icon',
      style: { fill: Colors().text3, background: Colors().bg3 },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.cards-deck-knob .cards-deck-knob-icon &:hover',
      style: { 'fill': Colors().bg3, 'background-color': Colors().text3 },
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

    if (nextProps.containerHeight !== this.props.containerHeight
      || nextProps.containerWidth !== this.props.containerWidth)
    {
      this.handleScroll();
    }
  }

  public createCards()
  {
    Actions.change(this.state.keyPath, this.getFirstCards());
    // _.map(this.getFirstCards(),
    //   (blockConfig: object, index: number) =>
    //   {
    //     Actions.create(this.state.keyPath, index, blockConfig['type']);
    //   });
  }

  // public renderTopbar()
  // {
  //   return (
  //     <div
  //       className='cards-area-top-bar'
  //       style={backgroundColor(Colors().bg2)}
  //     >
  //       <div className='cards-area-white-space' />
  //       <Switch
  //         first='Standard'
  //         second='Tuning'
  //         onChange={this._toggle('tuningMode')}
  //         small={true}
  //       />
  //     </div>
  //   );
  // }

  public toggleDeck()
  {
    Actions.toggleDeck(!this.props.deckOpen);
  }

  public handleScroll()
  {
    // TODO improve make faster
    const el = $('#cards-column');
    const start = el.offset().top;
    const totalHeight = document.getElementById('cards-column-inner').clientHeight;
    scrollAction(start, el.height(), el.scrollTop(), totalHeight);
  }

  public componentWillUpdate()
  {
    const inner = document.getElementById('cards-column-inner');
    if (inner)
    {
      const height = inner.clientHeight;
      if (height !== this.innerHeight)
      {
        if (this.innerHeight !== -1)
        {
          this.handleScroll();
        }
        this.innerHeight = height;
      }
    }
  }

  public handleCardDrop(cardType: string)
  {
    const theCard = ElasticBlocks[cardType];
    if (theCard !== undefined)
    {
      return theCard['key'];
    }
    return '';
  }

  public render()
  {
    const { props } = this;
    const { cards, canEdit } = props;
    const { keyPath } = this.state;
    const canHaveDeck = canEdit;
    return (
      <div
        className={classNames({
          'cards-column': true,
          'cards-column-deck-open': canHaveDeck && this.props.deckOpen,
          'cards-column-has-tql-parse-error': !this.props.cardsAndCodeInSync,
        })}
      >
        {
          canHaveDeck &&
          <CardsDeck
            open={this.props.deckOpen}
            language={this.props.language}
          />
        }
        <div
          className={classNames({
            'cards-column-cards-area': true,
            'cards-column-cards-area-faded': !this.props.cardsAndCodeInSync,
          })}
          onScroll={this.handleScroll}
          id='cards-column'
        >
          <div
            id='cards-column-inner'
          >
            <CardDropArea
              half={true}
              lower={true}
              index={cards.size}
              keyPath={keyPath}
              heightOffset={12}
              accepts={this.getPossibleCards()}
              language={this.props.language}
              handleCardDrop={this.handleCardDrop}
            />
            <CardsArea
              cards={cards}
              language={this.props.language}
              keyPath={keyPath}
              canEdit={canEdit}
              addColumn={this.props.addColumn}
              columnIndex={this.props.columnIndex}
              noCardTool={true}
              accepts={this.getPossibleCards()}
              handleCardDrop={this.handleCardDrop}
            />
            {
              !cards.size ? /* "Create your first card." */
                <InfoArea
                  large={"There aren't any cards in this query."}
                  button={canEdit && 'Create a starter set of cards'}
                  onClick={this.createCards}
                  inline={false}
                />
                : null
            }
          </div>
        </div>
        {
          canHaveDeck &&
          <div
            className='cards-deck-knob'
            onClick={this.toggleDeck}
          >
            <ExpandIcon
              className='cards-deck-knob-icon'
              style={borderColor(Colors().border1)}
            />
            <div
              className='cards-deck-knob-text'
              style={fontColor(Colors().text3)}
            >
              Card Deck
            </div>

          </div>
        }

        <div
          className='cards-column-tql-parse-error'
          style={altStyle()}
        >
          {
            'There is a parsing error with your code.' || 'All good!'
          }
        </div>
      </div>
    );
  }

  private getPossibleCards()
  {
    return AllBackendsMap[this.props.language].topLevelCards;
  }

  private getFirstCards(): Cards
  {
    return AllBackendsMap[this.props.language].getRootCards();
  }

}

// <CardDropArea
//   half={true}
//   index={0}
//   keyPath={keyPath}
//   height={12}
//   accepts={this.getPossibleCards()}
// />

// wasn't able to get this to work but will leave it around in case some
//  bright eyed dev comes along and find the solution

// interface InnerProps
// {
//   onChange: () => void;

//   children?: any;
//   containerWidth?: number;
//   containerHeight?: number;
// }
// class _CardsColumnInner extends TerrainComponent<InnerProps>
// {
//   componentWillReceiveProps(nextProps:InnerProps)
//   {
//     if(nextProps.containerHeight !== this.props.containerHeight)
//     {
//       console.log('asdf');
//       // size of the content changed
//       this.props.onChange();
//     }
//     console.log('gpp', nextProps.containerHeight);
//   }

//   render()
//   {
//     console.log('mdc', this.props.containerHeight);
//     return (
//       <div
//         id='cards-column-inner'
//       >
//         {
//           this.props.children
//         }
//       </div>
//     );
//   }
// }

// const CardsColumnInner = Dimensions()(_CardsColumnInner);

export default Util.createContainer(
  Dimensions()(CardsColumn),
  [],
  {
    colorsActions: ColorsActions,
  },
);
