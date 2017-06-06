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

require('./CardsColumn.less');
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as React from 'react';
import * as _ from 'underscore';
import InfoArea from '../../../common/components/InfoArea';
import Util from '../../../util/Util';
import Actions from '../../data/BuilderActions';
import { scrollAction } from '../../data/BuilderScrollStore';
import PureClasss from './../../../common/components/PureClasss';
import Switch from './../../../common/components/Switch';
import CardDropArea from './CardDropArea';
import CardsArea from './CardsArea';
import CardsDeck from './CardsDeck';
const Dimensions = require('react-dimensions');
import { AllBackendsMap } from '../../../../../shared/backends/AllBackends';

import { Card, Cards } from '../../../../../shared/blocks/types/Card';
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
  parseError: string;

  containerWidth?: number;
  containerHeight?: number;
}

class CardsColumn extends PureClasss<Props>
{
  state: {
    keyPath: KeyPath;
    learningMode: boolean;
  } = {
    keyPath: this.computeKeyPath(this.props),
    learningMode: false,
  };

  componentDidMount()
  {
    this.handleScroll();
  }

  computeKeyPath(props: Props): KeyPath
  {
    return List(this._keyPath('query', 'cards'));
  }

  componentWillReceiveProps(nextProps: Props)
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

  getPossibleCards()
  {
    return AllBackendsMap[this.props.language].topLevelCards;
  }

  getFirstCard()
  {
    const type = AllBackendsMap[this.props.language].topLevelCards.get(0);
    return AllBackendsMap[this.props.language].blocks[type];
  }

  createCard()
  {
    Actions.create(this.state.keyPath, 0, this.getFirstCard().type);
  }

  toggleLearningMode()
  {
    this.setState({
      learningMode: !this.state.learningMode,
    });
  }

  renderTopbar()
  {
    return (
      <div className="cards-area-top-bar">
        <div className="cards-area-white-space" />
        <Switch
          first="Standard"
          second="Learning"
          onChange={this.toggleLearningMode}
          selected={this.state.learningMode ? 2 : 1}
          small={true}
        />
      </div>
    );
  }

  toggleDeck()
  {
    Actions.toggleDeck(!this.props.deckOpen);
  }

  handleScroll()
  {
    // TODO improve make faster
    const el = $('#cards-column');
    const start = el.offset().top;
    const totalHeight = document.getElementById('cards-column-inner').clientHeight;
    scrollAction(start, el.height(), el.scrollTop(), totalHeight);
  }

  componentWillUpdate()
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

  innerHeight: number = -1;
  render()
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
          'cards-column-has-tql-parse-error': !!this.props.parseError,
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
          id="cards-column"
        >
          <div
            id="cards-column-inner"
          >
            <CardDropArea
              half={true}
              lower={true}
              index={cards.size}
              keyPath={keyPath}
              heightOffset={12}
              accepts={this.getPossibleCards()}
              language={this.props.language}
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
            />
            {
              !cards.size ? /* "Create your first card." */
                <InfoArea
                  large={"There aren't any cards in this query."}
                  button={canEdit && 'Create a ' + this.getFirstCard().static.title + ' Card'}
                  onClick={this.createCard}
                  inline={false}
                />
                : null
            }
          </div>
        </div>
        {
          canHaveDeck &&
          <div
            className="cards-deck-knob"
            onClick={this.toggleDeck}
          >
            <ExpandIcon
              className="cards-deck-knob-icon"
            />
            <div className="cards-deck-knob-text">
              Card Deck
              </div>
          </div>
        }

        <div
          className="cards-column-tql-parse-error"
        >
          {
            'There is a parsing error with your TQL.' || 'All good!'
          }
        </div>
      </div>
    );
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
// class _CardsColumnInner extends PureClasss<InnerProps>
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

export default Dimensions()(CardsColumn);
