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

// tslint:disable:no-var-requires prefer-const strict-boolean-expressions no-unused-expression

// an invisible area covering the upper or lower half of a card, sensing that a card can be dropped
import * as React from 'react';
import { DropTarget } from 'react-dnd';
import TerrainComponent from '../../../common/components/TerrainComponent';
import './CardDragPreview.less';
const classNames = require('classnames');
import { BuilderState } from 'builder/data/BuilderState';
import Util from 'util/Util';
import * as BlockUtils from '../../../../blocks/BlockUtils';
import { AllBackendsMap } from '../../../../database/AllBackends';
import { CardItem } from './CardComponent';
import { cardWillWrap, onCardDrop } from './CardDropArea';

interface CDPProps
{
  cardItem: CardItem;
  visible: boolean;
  isInList?: boolean; // takes up physical space in a list of cards
  keyPath: KeyPath;
  index: number;
  beforeDrop?: (item: CardItem, targetProps: CDPProps) => void;
  accepts?: List<string>;
  language: string;

  // if set, wrapper cards which can wrap this type of card can be dropped to wrap it
  wrapType?: string;
  wrapUp?: boolean; // wrap placeholder should extend up

  connectDropTarget?: (el: El) => El;
  singleChild?: boolean; // can't have neighbors, but could still drop a wrapper card
  handleCardDrop?: (type: string) => any;

  builder?: BuilderState;
}

class CardDragPreview extends TerrainComponent<CDPProps>
{
  public noCardColors: string[] = ['#aaa', '#aaa'];

  public state: {
    justDropped: boolean;
    language: string;
  } = {
      justDropped: false,
      language: this.props.builder.query.language,
    };

  public timeout: any;

  public componentWillReceiveProps(nextProps: CDPProps)
  {
    if (this.props.cardItem && !nextProps.cardItem)
    {
      // was dropped
      this.setState({
        justDropped: true,
      });
      this.timeout = setTimeout(() => this.setState({ justDropped: false }), 200);
    }
  }

  public componentWillUnmount()
  {
    this.timeout && clearTimeout(this.timeout);
  }

  public render()
  {
    const item = this.props.cardItem;
    let colors: string[];
    let title: string;
    let preview: string;

    const Blocks = AllBackendsMap[this.props.builder.query.language].blocks;

    if (!item)
    {
      return <div />;
    }

    if (item)
    {
      const { type } = item;
      if (Blocks[type])
      {
        colors = Blocks[type].static.colors;
        title = Blocks[type].static.title;
        preview = 'New';
        if (!item['new'])
        {
          preview = BlockUtils.getPreview(item.props.card);
        }
      }
    }
    else
    {
      colors = this.noCardColors;
      preview = 'None';
      title = 'None';
    }

    let { visible, cardItem } = this.props;

    if (visible && cardItem.props
      && cardItem.props.keyPath === this.props.keyPath)
    {
      if (cardItem.props.index === this.props.index || cardItem.props.index === this.props.index - 1)
      {
        visible = false;
      }
    }

    const willWrap = this.props.cardItem
      && cardWillWrap(this.props, this.props.cardItem.type);

    return this.props.connectDropTarget(
      <div
        className={classNames({
          'card-drag-preview': true,
          'card-drag-preview-visible': visible,
          'card-drag-preview-in-list': this.props.isInList,
          'card-drag-preview-dropped': this.state.justDropped,
          'card-drag-preview-wrap': willWrap,
          'card-drag-preview-wrap-up': willWrap && this.props.wrapUp,
        })}

        style={{
          background: '#fff',
          borderColor: colors[0],
        }}
      >
        <div
          className='card-title card-title-closed'
          style={{
            background: colors[0],
          }}
        >
          <div className='card-title-inner'>
            {
              title
            }
          </div>
          <div
            className='card-preview'
          >
            {
              preview
            }
          </div>
        </div>
        <div
          className='card-drag-preview-wrap-handle'
          style={{
            borderColor: colors[0],
          }}
        >
          <div
            className='card-drag-preview-wrap-handle-inner'
            style={{
              background: colors[0],
            }}
          />
        </div>
      </div>,
    );
  }
}

const cardPreviewTarget =
  {
    canDrop(targetProps: CDPProps, monitor)
    {
      return true;
    },

    drop: (targetProps: CDPProps, monitor, component) =>
    {
      onCardDrop(targetProps, monitor, component);
    },
  };

const cardPreviewCollect = (connect, monitor) =>
  ({
    connectDropTarget: connect.dropTarget(),
    // isOver: monitor.isOver({ shallow: true }),
    // canDrop: monitor.isOver({ shallow: true }) && monitor.canDrop(),
    // item: monitor.getItem(),
  });

const CardDragPreviewContainer = Util.createTypedContainer(
  CardDragPreview,
  ['builder'],
  {},
);

const CDP = DropTarget('CARD', cardPreviewTarget, cardPreviewCollect)(CardDragPreviewContainer) as any;

export default CDP;
