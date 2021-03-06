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

// Copyright 2018 Terrain Data, Inc.

// tslint:disable:strict-boolean-expressions no-var-requires class-name no-empty max-line-length no-unused-expression prefer-const

import './CardStyle.less';

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { DragSource } from 'react-dnd';
const { createDragPreview } = require('react-dnd-text-dragpreview');
import { BuilderState } from 'builder/data/BuilderState';
import { Display } from '../../../../blocks/displays/Display';
import { Card, getCardTitle } from '../../../../blocks/types/Card';
import { Menu, MenuOption } from '../../../common/components/Menu';
import Util from '../../../util/Util';
import BuilderActions from '../../data/BuilderActions';
import DragHandle from './../../../common/components/DragHandle';
import TerrainComponent from './../../../common/components/TerrainComponent';
import { BuilderScrollState, BuilderScrollStore } from './../../data/BuilderScrollStore';
import CardDropArea from './CardDropArea';

import { tooltip } from 'common/components/tooltip/Tooltips';
import CardHelpTooltip from './CardHelpTooltip';

const CDA = CardDropArea as any;
import { BuilderCardsState } from 'builder/data/BuilderCardsState';
import * as shallowCompare from 'react-addons-shallow-compare';
import * as BlockUtils from '../../../../blocks/BlockUtils';
import { AllBackendsMap } from '../../../../database/AllBackends';
import { borderColor, cardStyle, Colors, fontColor, getStyle } from '../../../colors/Colors';
import { ColorsActions } from '../../../colors/data/ColorsRedux';
import BuilderComponent from '../BuilderComponent';
import CreateCardTool from './CreateCardTool';

import { List } from 'immutable';

const ArrowIcon = require('images/icon_arrow_8x5.svg?name=ArrowIcon');
const HandleIcon = require('images/icon_more_12x3.svg?name=MoreIcon');
const HelpIcon = require('images/icon_help-1.svg?name=HelpIcon');
const TuningIcon = require('images/icon_tuning.svg?name=TuningIcon');

const CARD_OVERSCAN = 200;
const CARD_HEIGHT_MAP: { [id: string]: number } = {};

// title width when we don't show a title
const NO_TITLE_WIDTH = 74;

export interface Props
{
  card: Card;
  index: number;
  singleCard?: boolean; // for BuilderTextboxCards
  singleChild?: boolean; // for cards like Where that are wrappers but only accept 1 child

  canEdit: boolean;
  keyPath: KeyPath;
  accepts?: List<string>;

  addColumn?: (number, string?) => void;
  columnIndex?: number;
  helpOn?: boolean;

  isDragging?: boolean;
  connectDragPreview?: (a?: any) => void;
  connectDragSource?: (el: El) => El;

  display?: Display;

  handleCardDrop?: (type: string) => any;

  // Tuning column
  allowTuningDragAndDrop?: boolean;
  tuningMode?: boolean;
  handleCardReorder?: (card, index) => void;

  colorsActions: typeof ColorsActions;
  builder?: BuilderState;
  builderActions: typeof BuilderActions;
  builderCards?: BuilderCardsState;
}

@Radium
class _CardComponent extends TerrainComponent<Props>
{
  public state: {
    selected: boolean;
    hovering: boolean;
    closing: boolean;
    opening: boolean;

    scrollState: BuilderScrollState;
    keyPath: KeyPath;

    // for tuning DnD
    originalMouseY: number
    midpoints: number[];
    originalElTop: number;
    originalElBottom: number;
    moving: boolean;
    elHeight: number;
    siblingHeights: number[];
    minDY: number;
    maxDY: number;
    dY: number;
    index: number;
    cardTransition: boolean;
  };

  public refs: {
    [k: string]: Ref;
    card: Ref;
    cardInner: Ref;
    cardBody: Ref;
  };

  public dragPreview: any;

  public cardEl: HTMLElement;
  public renderTimeout: any;

  constructor(props: Props)
  {
    super(props);

    this.state = {
      selected: false,
      hovering: false,
      closing: false,
      opening: false,
      // For tuning column DnD
      moving: false,
      originalMouseY: 0,
      originalElTop: 0,
      originalElBottom: 0,
      elHeight: 0,
      midpoints: [],
      siblingHeights: [],
      minDY: 0,
      maxDY: 0,
      dY: 0,
      index: 0,
      cardTransition: true,
      scrollState: BuilderScrollStore.getState(),
      keyPath: props.keyPath,
    };
  }

  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.card-drag-handle svg',
      style: { fill: Colors().iconColor },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.card-title .menu-icon-wrapper svg',
      style: { fill: Colors().iconColor },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.card-minimize-icon .st0',
      style: { fill: Colors().iconColor },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.card-help-icon',
      style: { fill: Colors().iconColor },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.card-tuning-icon',
      style: { stroke: Colors().iconColor },
    });

    // TODO
    // this._subscribe(Store, {
    //   stateKey: 'selected',
    //   storeKeyPath: ['selectedCardIds', props.card.id],
    // });

    this._subscribe(BuilderScrollStore, {
      stateKey: 'scrollState',
      isMounted: true,
    });

    this.setState({
      keyPath: this.getKeyPath(),
    });

  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.builderCards.hoveringCardId === this.props.card.id && !this.state.hovering)
    {
      this.setState({
        hovering: true,
      });
    }
    else if (nextProps.builderCards.hoveringCardId !== this.props.card.id && this.state.hovering)
    {
      this.setState({
        hovering: false,
      });
    }

    if (this.props.keyPath !== nextProps.keyPath || this.props.index !== nextProps.index)
    {
      if (!nextProps.tuningMode)
      {
        const newKeyPath = nextProps.singleCard ? nextProps.keyPath
          : this._ikeyPath(nextProps.keyPath, nextProps.index);
        this.setState({
          keyPath: newKeyPath,
        });
        this.props.builderActions.updateKeyPath(nextProps.card.id, newKeyPath);
      }
    }
    if ((nextProps.card.closed !== this.props.card.closed && !nextProps.tuningMode) ||
      (nextProps.card.tuningClosed !== this.props.card.tuningClosed && nextProps.tuningMode))
    {
      if (this.state.closing || this.state.opening)
      {
        // completed closing / opening
        this.setState({
          closing: false,
          opening: false,
        });
      }
      else
      {
        // closed it from some outside source? need to close here
        this.toggleClose(null);
      }
    }
    this.setState({
      cardTransition: true,
    });
  }

  public componentDidMount()
  {
    if (this.props.card.type === 'creating')
    {
      return;
    }

    this.dragPreview = createDragPreview(
      getCardTitle(this.props.card) + ' (' + BlockUtils.getPreview(this.props.card) + ')',
      {
        // backgroundColor: this.props.card.static.colors[0],
        // borderColor: this.props.card.static.colors[0],
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
        paddingTop: 7,
        paddingRight: 12,
        paddingBottom: 9,
        paddingLeft: 12,
        borderRadius: 10,
      });

    this.props.connectDragPreview(this.dragPreview);
  }

  public shouldComponentUpdate(nextProps, nextState)
  {
    const { builder, builderCards } = this.props;
    const { builder: nextBuilder, builderCards: nextBuilderCards } = nextProps;

    if (nextBuilderCards === builderCards &&
      nextBuilder.draggingCardItem === builder.draggingCardItem &&
      nextBuilder.draggingOverIndex === builder.draggingOverIndex &&
      nextBuilder.draggingOverKeyPath === builder.draggingOverKeyPath)
    {
      return shallowCompare(this, nextProps, nextState);
    }
    else
    {
      if (nextProps.builderCards !== this.props.builderCards)
      {
        return nextProps.builderCards.hoveringCardId === nextProps.card.id
          || this.props.builderCards.hoveringCardId === nextProps.card.id;
      }
      else
      {
        return nextBuilder.draggingCardItem !== null &&
          nextBuilder.draggingOverIndex !== -1 &&
          nextBuilder.draggingOverKeyPath !== null &&
          nextBuilder.draggingOverKeyPath.count() > 0 &&
          (
            nextBuilder.draggingCardItem === nextProps.card ||
            builder.draggingCardItem === nextProps.card ||
            nextBuilder.draggingOverIndex === nextProps.index ||
            builder.draggingOverIndex === nextProps.index
          );
      }
    }
  }

  public getMenuOptions(): List<MenuOption>
  {
    const options: List<MenuOption> =
      List([
        // {
        //   text: 'Copy',
        //   onClick: this.handleCopy,
        // },
        {
          text: 'Duplicate',
          onClick: this.handleDuplicate,
        },
        {
          text: this.props.card.disabled ? 'Enable' : 'Disable',
          onClick: this.handleDisable,
        },
        {
          text: 'Delete',
          onClick: this.handleDelete,
        },
      ]);

    return options;
  }

  public toggleClose(event)
  {
    if (this.state.closing || this.state.opening)
    {
      return; // I just don't want to deal
    }
    const key = this.props.tuningMode ? 'tuningClosed' : 'closed';
    const closed = this.props.tuningMode ? this.props.card.tuningClosed : this.props.card.closed;
    let keyPath = this.getKeyPath();
    if (this.props.tuningMode)
    {
      const keyPaths = Immutable.Map(this.props.builder.query.cardKeyPaths);
      if (keyPaths.get(this.props.card.id) !== undefined)
      {
        keyPath = Immutable.List(keyPaths.get(this.props.card.id));
      }
    }

    if (!closed)
    {
      this.setState({
        closing: true,
      });

      // animate just the body for normal cards,
      //  the entire card for cards inside textboxes
      const ref = this.props.singleCard ? this.refs.card : this.refs.cardBody;
      Util.animateToHeight(ref, 0, () =>
      {
        // do this after the animation so the rest of the app picks up on it
        this.props.builderActions.change(
          keyPath.push(key),
          true,
        );
      });
    }
    else
    {
      this.setState({
        opening: true,
      });

      // need to set a timeout so that the Card's render first
      //  executes (from the opening:true setState) and adds in the
      //  card body, for us to animate to.
      // If you know a better way, please oh please implement it
      setTimeout(() =>
        Util.animateToAutoHeight(this.refs.cardBody, () =>
        {
          // do this after the animation so the rest of the app picks up on it
          this.props.builderActions.change(
            keyPath.push(key),
            false,
          );
        }),
        250,
      );
    }

    event && event.preventDefault();
    event && event.stopPropagation();
  }

  public handleTitleClick(event)
  {
    // TODO decide how selection mechanics work.
    //  consider limiting selection to neighbors.
    // if(!this.props.canEdit)
    // {
    //   return;
    // }

    // event.stopPropagation();
    // event.preventDefault();
    // this.props.builderActions.selectCard(this.props.card.id, event.shiftKey, event.altKey);
  }

  public handleDelete()
  {
    Util.animateToHeight(this.refs.cardInner, 0);
    setTimeout(() =>
      this.props.builderActions.remove(this.props.keyPath, this.props.index)
      , 250);
  }

  public handleCopy()
  {
  }

  public handleDuplicate()
  {
    if (this.props.singleCard || this.props.singleChild)
    {
      alert(
        'Can\'t duplicate this card because it is not in a position where it can have neighborhing cards. Try moving it to another spot on the Builder and duplicating it there.');
      return;
    }

    const removeId = (block) =>
    {
      if (Immutable.Iterable.isIterable(block))
      {
        if (block.get('id'))
        {
          block = block.set('id', '');
        }
        let b = block.map(removeId);
        if (!b)
        {
          // records don't have a map fn
          b = block.toMap().map(removeId);
        }
        return b;
      }

      return block;
    };

    const card = BlockUtils.recordFromJS(
      BlockUtils.cardsForServer(removeId(this.props.card)),
      AllBackendsMap[this.props.card.static.language].blocks,
    );

    this.props.builderActions.create(this.props.keyPath, this.props.index + 1, card.type, card);
  }

  public handleDisable()
  {
    const keyPath = this.getKeyPath();
    this.props.builderActions.change(
      keyPath.push('disabled'),
      !this.props.card.disabled,
    );
  }

  public handleMouseMove(event)
  {
    event.stopPropagation();
    if (!this.state.hovering)
    {
      this.props.builderActions.hoverCard(this.props.card.id);
    }
  }

  public handleCardDrag(event)
  {
    this.setState({
      dY: this.shiftSiblings(event, true).dY,
    });
    event.preventDefault();
    event.stopPropagation();
  }

  public shiftSiblings(evt, shiftSiblings: boolean): ({ dY: number, index: number })
  {
    const dY = Util.valueMinMax(evt.pageY - this.state.originalMouseY, this.state.minDY, this.state.maxDY);

    let index: number;

    if (dY < 0)
    {
      // if dragged up, search from top down
      for (
        index = 0;
        this.state.midpoints[index] < this.state.originalElTop + dY;
        index++
      )
      {

      }
    }
    else
    {
      for (
        index = this.state.midpoints.length - 1;
        this.state.midpoints[index] > this.state.originalElBottom + dY;
        index--
      )
      {

      }
    }
    if (shiftSiblings)
    {
      const sibs = this.getSiblings();
      sibs.forEach((sib, i) =>
      {
        if (i === this.state.index)
        {
          return;
        }
        let shift = 0;
        if (index < this.state.index)
        {
          if (i >= index && i < this.state.index)
          {
            shift = 1;
          }
        }
        else
        {
          if (i > this.state.index && i <= index)
          {
            shift = -1;
          }
        }
        sib['style'].top = shift * this.state.elHeight;
      });
    }
    return {
      dY,
      index,
    };
  }

  public getSiblings()
  {
    if (!this.refs['card'])
    {
      return [];
    }
    const children = Util.siblings(Util.parentNode(this.refs['card']));
    let cards = [];
    for (let i = 0; i < children.length; ++i)
    {
      if (children[i].childNodes.length > 1)
      {
        cards.push(children[i].childNodes[1]);
      }
    }
    return cards;
  }

  public handleMouseDown(event)
  {
    if (!this.props.tuningMode)
    {
      return;
    }
    // for tuning mode, dragging and dropping cards will just reorder them (in tuner)
    // but have no effect on the actual layout of cards in builder
    $('body').on('mouseup', this.handleMouseUp);
    $('body').on('mouseleave', this.handleMouseUp);
    $('body').on('mousemove', this.handleCardDrag);
    const el = this.refs['card'];
    const cr = el['getBoundingClientRect']();
    const parent = Util.parentNode(Util.parentNode(Util.parentNode((this.refs['card']))));
    const parentCr = parent['getBoundingClientRect']();
    const minDY = parentCr.top - cr.top;
    const maxDY = parentCr.bottom - cr.bottom;

    const cards = this.getSiblings();
    let midpoints = [];
    let siblingHeights = [];
    cards.forEach((card) =>
    {
      const c = card['getBoundingClientRect']();
      midpoints.push(((c.top as number) + (c.bottom as number)) / 2);
      siblingHeights.push((c.bottom as number) - (c.top as number));
    });
    this.setState({
      originalMouseY: event.pageY,
      midpoints,
      originalElTop: cr.top,
      originalElBottom: cr.bottom,
      elHeight: cr.height,
      siblingHeights,
      minDY,
      maxDY,
      dY: 0,
      index: cards.indexOf(el),
      moving: true,
    });
    event.preventDefault();
  }

  public handleMouseUp(event)
  {
    if (!this.props.tuningMode)
    {
      return;
    }
    $('body').off('mouseup', this.handleMouseUp);
    $('body').off('mouseleave', this.handleMouseUp);
    $('body').off('mousemove', this.handleCardDrag);
    if (this.props.handleCardReorder)
    {
      const { index } = this.shiftSiblings(event, false);
      $('.card-transition').removeClass('card-transition');
      const sibs = this.getSiblings();
      _.range(0, sibs.length).map((i) =>
        sibs[i]['style'].top = 0,
      );
      this.props.handleCardReorder(this.props.card, index);
      this.setState({
        moving: false,
      });
    }
  }

  public getKeyPath()
  {
    const newKeyPath = this.props.singleCard
      ? this.props.keyPath
      : this._ikeyPath(this.props.keyPath, this.props.index);
    if (!this.props.tuningMode)
    {
      this.props.builderActions.updateKeyPath(this.props.card.id, newKeyPath);
    }
    return newKeyPath;
  }

  public handleCardToolClose()
  {
    if (this.props.index === null)
    {
      this.props.builderActions.change(this.props.keyPath, '');
    }
    else
    {
      this.props.builderActions.remove(this.props.keyPath, this.props.index);
    }
  }

  public componentWillUnmount()
  {
    this.renderTimeout && clearTimeout(this.renderTimeout);
  }

  public toggleTuning()
  {
    if (this.props.tuningMode)
    {
      const keyPaths = Immutable.Map(this.props.builder.query.cardKeyPaths);
      if (keyPaths.get(this.props.card.id) !== undefined)
      {
        const keyPath = Immutable.List(keyPaths.get(this.props.card.id));
        this.props.builderActions.change(keyPath.push('tuning'), false);
      }
    }
    else
    {
      this.props.builderActions.change(this.getKeyPath().push('tuning'), !this.props.card.tuning);
    }
  }

  public render()
  {
    const { id } = this.props.card;
    this.cardEl = $('cards-column-cards-area #' + this.props.card.id) as any; // memoize?
    if (this.cardEl)
    {
      const { columnTop, columnHeight, columnScroll } = this.state.scrollState;
      const visibleStart = columnScroll - CARD_OVERSCAN;
      const visibleEnd = columnScroll + columnHeight + CARD_OVERSCAN;

      let cardStart = 0;
      let el = this.cardEl;
      do
      {
        cardStart += el.offsetTop;
        el = el.offsetParent as any;
      } while (el && el.id !== 'cards-column');

      if (el)
      {
        // if cards are nested inside position:relative/absolute components, you will
        //  need to loop through offsetParent until you reach the column, summing offsetTop
        const cardHeight = this.cardEl.clientHeight;
        const cardEnd = cardStart + cardHeight;

        CARD_HEIGHT_MAP[id] = cardHeight;

        if ((cardEnd < visibleStart || cardStart > visibleEnd) && !this.props.tuningMode)
        {
          // TODO fix bug here where you have the CreateCardTool open
          //  and scroll to the bottom of the column and it expands
          //  cardHeight ad infinitum
          return (
            <div
              className='card card-placeholder card-transition'
              id={id}
              style={{
                height: cardHeight,
              }}
            />
          );
        }
      }
    }
    else if (!this.props.tuningMode)
    {
      this.renderTimeout = setTimeout(() =>
      {
        this.setState({ random: Math.random() });
      }, 15);

      return (
        <div
          className='card card-placeholder card-transition'
          id={id}
          style={{
            minHeight: CARD_HEIGHT_MAP[id] || 50,
          }}
        />
      );
    }

    if (this.props.card.type === 'creating')
    {
      // not a card at all, in fact. a create card marker
      return (
        <div
          id={id}
        >
          <CreateCardTool
            canEdit={this.props.canEdit}
            index={this.props.index}
            keyPath={this.props.keyPath}
            open={true}
            onClose={this.handleCardToolClose}
            accepts={this.props.display && this.props.display.accepts}
            data={this.props.card}
            language={this.props.card.static.language}
            handleCardDrop={this.props.handleCardDrop}
          />
        </div>
      );
    }

    let keyPath = this.state.keyPath;
    if (this.props.tuningMode)
    {
      const keyPaths = Immutable.Map(this.props.builder.query.cardKeyPaths);
      if (keyPaths.get(this.props.card.id) !== undefined)
      {
        keyPath = Immutable.List(keyPaths.get(this.props.card.id));
      }
    }
    let style = null;
    if (this.state.moving)
    {
      style = _.extend({}, CARD_COMPONENT_MOVING_STYLE, {
        top: this.state.dY,
        zIndex: 999999,
      });
    }

    if (this.props.card.disabled)
    {
      style = _.extend(style === null ? {} : style, {
        opacity: 0.25,
        zIndex: 999999,
      });
    }

    const content = <BuilderComponent
      canEdit={this.props.canEdit}
      data={this.props.card}
      helpOn={this.props.helpOn}
      addColumn={this.props.addColumn}
      columnIndex={this.props.columnIndex}
      keyPath={keyPath}
      language={this.props.card.static.language}
      textStyle={fontColor(this.props.card.static.colors[0])}
      handleCardDrop={this.props.handleCardDrop}
      tuningMode={this.props.tuningMode}
    />;

    const { card } = this.props;
    const { title } = card.static;
    const { isDragging, connectDragSource } = this.props;

    let canMove = false;
    if (this.props.tuningMode && this.props.allowTuningDragAndDrop)
    {
      canMove = true;
    }
    if (!this.props.tuningMode && this.props.canEdit && !card['cannotBeMoved'])
    {
      canMove = true;
    }
    const closed = this.props.tuningMode ? this.props.card.tuningClosed : this.props.card.closed;
    return (
      <div
        className={classNames({
          'card': true,
          'card-dragging': isDragging,
          'card-closed': closed,
          'single-card': this.props.singleCard,
          'card-selected': this.state.selected,
          'card-hovering': this.state.hovering,
          'card-closing': this.state.closing,
          'card-opening': this.state.opening,
          'card-no-title': card['noTitle'],
          [card.type + '-card']: true,
          'card-moving': this.state.moving,
          'card-transition': this.state.cardTransition,
        })}
        ref='card'
        id={id}
        onMouseMove={this.handleMouseMove}
        style={style}
      >
        {!this.props.tuningMode &&
          <CDA
            half={true}
            keyPath={this.props.keyPath}
            index={this.props.index}
            accepts={this.props.accepts}
            wrapType={this.props.card.type}
            singleChild={this.props.singleChild || this.props.singleCard}
            language={card.static.language}
            handleCardDrop={this.props.handleCardDrop}
            builder={this.props.builder}
            builderActions={this.props.builderActions}
          />
        }
        <div
          className={classNames({
            'card-inner': true,
            'card-inner-hovering': this.state.hovering,
            'card-inner-with-title': !card['noTitle'],
            'single-card-inner': this.props.singleCard,
          })}
          style={cardStyle(
            card.static.colors[0],
            card.static.colors[1],
            undefined,
            undefined,
            this.state.hovering,
          )}
          ref='cardInner'
        >
          <div className='card-title-row'>
            <div
              className={classNames({
                'card-title': true,
                'card-title-closed': ((closed && !this.state.opening) || this.state.closing),
                'card-title-card-hovering': this.state.hovering,
              })}
              style={{
                // shrink the width if the card does not have a title
                // width: card['noTitle'] ? NO_TITLE_WIDTH : undefined,
                width: NO_TITLE_WIDTH,
              }}
              onClick={this.handleTitleClick}
            >
              {
                canMove &&
                <div
                  className='card-drag-handle'
                  onMouseDown={this.handleMouseDown}
                >
                  <DragHandle
                    hiddenByDefault={!this.state.hovering}
                    connectDragSource={connectDragSource}
                    key={'handle-' + (this.props.card !== undefined ? this.props.card.id : Math.random().toString())}
                  />
                </div>
              }
              {
                this.state.hovering &&
                <ArrowIcon className='card-minimize-icon' onClick={this.toggleClose} />
              }
              {
                this.props.canEdit &&
                !this.props.tuningMode &&
                !card['cannotBeMoved'] &&
                <Menu
                  options={this.getMenuOptions()}
                  openRight={true}
                />
              }
              {
                !(this.props.card && this.props.card['noTitle']) && !closed &&
                <div
                  className='card-title-inner'
                  style={{
                    color: card.static.colors[0],
                  }}
                >
                  {
                    title
                  }
                </div>
              }

              {
                (closed) ?
                  <div className={classNames({
                    'card-preview': true,
                    'card-preview-hidden': this.state.opening,
                  })}>
                    {getCardTitle(this.props.card) + ' (' + BlockUtils.getPreview(this.props.card) + ')'}
                  </div>
                  :
                  null
              }
            </div>
            {
              <div
                className='card-tuning-wrapper'
                onClick={this.toggleTuning}
              >
                {
                  tooltip(
                    <TuningIcon
                      className={classNames({
                        'card-tuning-icon': true,
                        'card-tuning-icon-on': card.tuning,
                        'card-tuning-icon-off': this.props.tuningMode && !card.tuning,
                      })}
                      style={card.tuning ? getStyle('stroke', Colors().active, Colors().activeHover) : {}}
                    />,
                    card.tuning || this.props.tuningMode ? 'Remove this card from the tuning column'
                      : 'Add this card to the tuning column',
                  )
                }
              </div>
            }

            {
              this.props.canEdit &&
              !card['cannotBeMoved'] &&
              (this.state.hovering || card.errors.size > 0) &&
              <div className='card-help-wrapper'>
                {
                  tooltip(
                    <HelpIcon className={classNames(card.errors.size > 0 ? 'card-error-icon' : 'card-help-icon')} />,
                    {
                      html: <CardHelpTooltip staticInfo={card.static} errors={card.errors} />,
                      trigger: 'click',
                      position: 'top-end',
                      interactive: true,
                      theme: 'faded',
                      delay: 0,
                    },
                  )
                }
              </div>
            }
          </div>
          {
            (!closed || this.state.opening) &&
            <div
              className='card-body-wrapper'
              ref='cardBody'
            >
              <div
                className='card-body'

              >
                {
                  content
                }
              </div>
            </div>
          }
        </div>
        {!this.props.tuningMode &&
          <CDA
            half={true}
            lower={true}
            keyPath={this.props.keyPath}
            index={this.props.index}
            accepts={this.props.accepts}
            wrapType={this.props.card.type}
            singleChild={this.props.singleChild || this.props.singleCard}
            language={card.static.language}
            handleCardDrop={this.props.handleCardDrop}
            builder={this.props.builder}
            builderActions={this.props.builderActions}
          />
        }
      </div>
    );
  }
}

const CARD_COMPONENT_MOVING_STYLE = _.extend({},
  borderColor(Colors().active),
);

// Drag and Drop (the bass)

export interface CardItem
{
  props?: Props;
  childIds?: IMMap<ID, boolean>;
  new?: boolean;
  type?: string;
}

const cardSource =
{
  canDrag: (props) => props.canEdit,

  beginDrag: (props: Props): CardItem =>
  {
    // TODO
    setTimeout(() => $('body').addClass('body-card-is-dragging'), 100);
    const item: CardItem = {
      props,
      childIds: BlockUtils.getChildIds(props.card)
        .remove(props.card.id),
      type: props.card.type,
    };

    props.builderActions.dragCard(item);

    return item;
  },
  // select card?

  endDrag: (props) =>
  {
    $('body').removeClass('body-card-is-dragging');
    props.builderActions.dragCard(null);
  },
};

const dragCollect = (connect, monitor) =>
  ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
    connectDragPreview: connect.dragPreview(),
  });

const CardContainer = Util.createContainer(
  _CardComponent,
  ['builder', 'builderCards'],
  {
    colorsActions: ColorsActions,
    builderActions: BuilderActions,
  },
);

export const CardComponent = DragSource('CARD', cardSource, dragCollect)(CardContainer);

export default CardComponent;
