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

// tslint:disable:no-var-requires max-classes-per-file

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as Radium from 'radium';
import * as React from 'react';
import { Card } from '../../../../blocks/types/Card';
import { backgroundColor, cardStyle, Colors } from '../../../colors/Colors';
import Actions from '../../data/BuilderActions';
import TerrainComponent from './../../../common/components/TerrainComponent';
import './CardsDeck.less';

import { AllBackendsMap } from '../../../../database/AllBackends';

const { List, Map } = Immutable;
const ExpandIcon = require('./../../../../images/icon_expand_12x12.svg?name=ExpandIcon');
import { DragSource } from 'react-dnd';

export interface Props
{
  open: boolean;
  language: string;
}

class CardsDeck extends TerrainComponent<Props>
{
  public state: {
    search: string;
  } = {
      search: '',
    };

  public componentWillReceiveProps(nextProps: Props)
  {
    if (!this.props.open && nextProps.open)
    {
      this.refs['search']['focus']();
    }
  }

  public handleSearchChange(evt)
  {
    this.setState({
      search: evt.target.value,
    });
  }

  public render()
  {
    const ordering = AllBackendsMap[this.props.language].cardsDeck;
    const cards = AllBackendsMap[this.props.language].blocks;
    if (ordering === undefined)
    {
      throw new Error('Unable to find backend of type ' + this.props.language);
    }
    return (
      <div
        className='cards-deck'
        style={backgroundColor(Colors().builder.deck.background)}
      >
        <div
          className='cards-deck-search-wrapper'
        >
          <input
            type='text'
            ref='search'
            className='cards-deck-search'
            placeholder='Search Cards'
            value={this.state.search}
            onChange={this.handleSearchChange}
          />
        </div>
        <div
          className='cards-deck-inner'
        >
          {
            ordering.map((group: List<string>, index) =>
              <div
                className='cards-deck-group'
                key={index}
              >
                {
                  group.map((cardType: string) =>
                    <CardDeckCard
                      card={cards[cardType]}
                      search={this.state.search}
                      key={cardType}
                      type={cardType}
                    />,
                  )
                }
              </div>,
            )
          }
        </div>
      </div>
    );
  }
}

interface CardProps
{
  card: Card;
  search: string;
  key: string;

  isDragging?: boolean;
  connectDragPreview?: (a?: any) => void;
  connectDragSource?: (el: El) => El;
}

@Radium
class CardDeckCardComponent extends TerrainComponent<CardProps>
{
  public render()
  {
    const { card } = this.props;
    const data = card.static;
    const search = this.props.search.toLowerCase();
    const hidden: boolean = data.title.toLowerCase().indexOf(search) !== 0;

    return this.props.connectDragSource(
      <div
        className={classNames({
          'cards-deck-card': true,
          'cards-deck-card-hidden': hidden,
        })}
        style={cardStyle(data.colors[0], Colors().bg3, data.colors[1], true)}
      >
        {
          data.title
        }
      </div>,
    );
  }
}

// Drag and Drop (the bass)

export interface CardItem
{
  type: string;
  new: boolean;
}

const cardSource =
  {
    canDrag: (props) => true,

    beginDrag: (props: CardProps): CardItem =>
    {
      setTimeout(() => $('body').addClass('body-card-is-dragging'), 100);
      // TODO unselect cards?

      const item: CardItem = {
        type: props.card.type,
        new: true,
      };

      Actions.dragCard(item);

      return item;
    },

    endDrag: () =>
    {
      $('body').removeClass('body-card-is-dragging');
      Actions.dragCard(null);
    },
  };

const dragCollect = (connect, monitor) =>
  ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
    connectDragPreview: connect.dragPreview(),
  });

const CardDeckCard = DragSource('CARD', cardSource, dragCollect)(CardDeckCardComponent);

export default CardsDeck;
