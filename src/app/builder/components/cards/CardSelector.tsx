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

// tslint:disable:restrict-plus-operands strict-boolean-expressions no-var-requires

import * as classNames from 'classnames';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';

import * as Immutable from 'immutable';
const { List, Map, Set } = Immutable;
type Set<T> = Immutable.Set<T>;

const Color = require('color');

import TerrainComponent from 'common/components/TerrainComponent';
import { Card, CardConfig } from 'src/blocks/types/Card';
import { AllBackendsMap } from 'src/database/AllBackends';
import { backgroundColor, borderColor, cardHoverBackground, cardStyle, Colors, fontColor, getStyle } from '../../../colors/Colors';

import CreateCardOption from './CreateCardOption';
import './CreateCardTool.less';

function getCardCategory(card: CardConfig): string
{
  if (card === undefined)
  {
    return '';
  }
  else if (card.static === undefined || card.static.clause === undefined)
  {
    return card.key;
  }
  else
  {
    return card.static.clause.path[0];
  }
}

interface CardCategory
{
  name: string;
  color: string;
}

const categories: List<CardCategory> = List(
  [
    { name: 'suggested', color: Colors().text2 }, // special category
    { name: 'all', color: Colors().text2 }, // special category
    { name: 'filter', color: Colors().builder.cards.categories.filter },
    { name: 'sort', color: Colors().builder.cards.categories.sort },
    { name: 'match', color: Colors().builder.cards.categories.match },
    { name: 'aggregation', color: Colors().builder.cards.structureClause },
    { name: 'geo', color: Colors().builder.cards.categories.geo },
    { name: 'primary', color: Colors().builder.cards.categories.primary },
    { name: 'control', color: Colors().builder.cards.categories.control },
    { name: 'score', color: Colors().builder.cards.categories.score },
    { name: 'script', color: Colors().builder.cards.categories.script },
    { name: 'compound', color: Colors().builder.cards.categories.compound },
    { name: 'join', color: Colors().builder.cards.categories.join },
    { name: 'parameter', color: Colors().builder.cards.categories.parameter },
    { name: 'other', color: Colors().text2 }, // special category
  ]);

const categoryCounter: IMMap<string, number> = Map(categories.map((v, i) => [v.name, 0]));
// Convenient starting point for optimization.
// It is an immutable map mapping category names to how many cards there are in each category

export interface Props
{
  cardTypeList: List<string>;
  open: boolean;
  card: CardConfig; // the card that is doing the creating
  language: string;
  overrideWidth?: any; // overrides the width of the create card selector
  handleCardClick: (block, index) => void;
  overrideText?: List<{
    text: string;
    type: string;
  }>; // can override the options displayed
}

@Radium
class CardSelector extends TerrainComponent<Props>
{
  public state: {
    searchValue: string;
    focusedIndex: number;
    inputElement: any;
    categoryListElement: any;
    computedHeight: number;
    currentCategory: CardCategory;
  } = {
    searchValue: '',
    focusedIndex: -1,
    inputElement: undefined,
    categoryListElement: undefined,
    computedHeight: -1,
    currentCategory: categories.get(0),
  };

  constructor(props)
  {
    super(props);
    this.computeAvailableCategories = memoizeOne(this.computeAvailableCategories);
    this.getCardSuggestionSet = memoizeOne(this.getCardSuggestionSet);
    this.calculateOptionCategories = memoizeOne(this.calculateOptionCategories);
    this.categoryClickedWrapper = _.memoize(this.categoryClickedWrapper, (item: CardCategory) => item.name);
    const available = this.computeAvailableCategories(this.props.cardTypeList, this.props.card);
    this.state.currentCategory = available.get(0);
    // even if there are no cards, 'all' will always be there.
  }

  // (memoized) return a set that contains the suggested types
  public getCardSuggestionSet(creatingCard: CardConfig): Set<string>
  {
    const suggestions: string[] = creatingCard.static.clause.suggestions;
    return Set(List(suggestions));
  }

  // (memoized) return list ofcategories where there exist cards that fall under that category.
  // Category 'all' is always in this list.
  public computeAvailableCategories(cardTypeList: List<string>, creatingCard: CardConfig): List<CardCategory>
  {
    const counts = categoryCounter.toJS();
    const suggestionSet = this.getCardSuggestionSet(creatingCard);
    cardTypeList.forEach((v, i) =>
    {
      const card = AllBackendsMap[this.props.language].blocks[v] as CardConfig;
      const category = getCardCategory(card);
      if (counts[category] !== undefined)
      {
        counts[category] += 1;
      }
      else
      {
        counts['other'] += 1;
      }
      if (suggestionSet.has(category))
      {
        counts['suggested'] += 1;
      }
      counts['all'] += 1;
    });
    return categories.filter((v, i) => counts[v.name] > 0 || v.name === 'all').toList();
  }

  // (memoized) that returns a list of the categories that each card falls under
  public calculateOptionCategories(cardTypeList: List<string>, creatingCard: CardConfig): List<Set<string>>
  {
    const suggestionSet = this.getCardSuggestionSet(creatingCard);
    return cardTypeList.map((v, i) =>
    {
      const card = AllBackendsMap[this.props.language].blocks[v] as CardConfig;
      const category = getCardCategory(card);
      const cardCategories = ['all'];
      if (suggestionSet.has(category))
      {
        cardCategories.push('suggested');
      }
      cardCategories.push(categoryCounter.has(category) ? category : 'other');
      return Set(cardCategories);
    }).toList();
  }

  public computeMaxHeight(cardListLength: number): string
  {
    const potentialSelectorHeight = cardListLength * 70;
    const categoryHeight = this.state.categoryListElement !== undefined ?
      this.state.categoryListElement.clientHeight : 0;

    return Math.max(categoryHeight, Math.min(potentialSelectorHeight, 400)) + 'px';
  }

  public handleSearchTextboxChange(ev: any)
  {
    this.setState({
      searchValue: ev.target.value,
    });
  }

  public registerInputElement(inputElement)
  {
    this.setState({
      inputElement,
    });
    if (this.props.open && inputElement !== null && inputElement !== undefined)
    {
      inputElement.focus();
    }
  }

  public registerCategoryList(categorySelectorList)
  {
    this.setState({
      categorySelectorList,
    });
  }

  public renderCardOption(type: string, index: number)
  {
    const { overrideText } = this.props;

    const optionCategories = this.calculateOptionCategories(this.props.cardTypeList, this.props.card);
    const currentCategory = this.state.currentCategory.name;

    if (optionCategories.get(index).has(currentCategory))
    {
      return (
        <CreateCardOption
          card={AllBackendsMap[this.props.language].blocks[type] as CardConfig}
          index={index}
          searchText={this.state.searchValue}
          onClick={this.props.handleCardClick}
          overrideTitle={
            overrideText &&
            overrideText.get(index) &&
            overrideText.get(index).text
          }
          isFocused={this.state.focusedIndex === index}
          key={index.toString()}
        />
      );
    }
    return null; // null won't be rendered
  }

  public renderCardOptions()
  {
    return this.props.cardTypeList.map(this.renderCardOption);
  }

  public renderCategory(item: CardCategory, index: number)
  {
    let categoryStyle = _.extend({},
      fontColor(item.color),
      borderColor(Colors().border1),
      getStyle('borderLeftColor', item.color),
    );

    const cardHoverBg = cardHoverBackground(item.color, Colors().bg3);
    if (item === this.state.currentCategory)
    {
      categoryStyle = _.extend({}, categoryStyle,
        backgroundColor(cardHoverBg, cardHoverBg),
      );
    }
    else
    {
      categoryStyle = _.extend({}, categoryStyle,
        backgroundColor(Colors().bg2, cardHoverBackground(item.color, Colors().bg3)),
      );
    }

    return (
      <div
        className='card-category-list-item'
        style={categoryStyle}
        key={index}
        onClick={this.categoryClickedWrapper(item)}
      >
        {item.name}
      </div>
    );
  }

  // memoized higher order function that handles category click
  public categoryClickedWrapper(item: CardCategory)
  {
    return () =>
    {
      this.state.inputElement.focus();
      this.setState({
        currentCategory: item,
      });
    };
  }

  public renderCategoryOptions()
  {
    return (
      <div className='card-category-list' ref={this.registerCategoryList}>
        {this.computeAvailableCategories(this.props.cardTypeList, this.props.card).map(this.renderCategory)}
      </div>
    );
  }

  public componentWillReceiveProps(nextProps)
  {
    if (this.props.open !== nextProps.open)
    {
      this.setState({
        currentCategory: this.computeAvailableCategories(this.props.cardTypeList, this.props.card).get(0),
        searchValue: '',
      });
    }
    if (!this.props.open && nextProps.open &&
      this.state.inputElement !== null && this.state.inputElement !== undefined)
    {
      this.state.inputElement.focus();
    }
  }

  public render()
  {
    const isEmpty = this.props.cardTypeList.size === 0;

    const rootStyle = _.extend({},
      backgroundColor(Colors().bg1),
      this.props.overrideWidth ? getStyle('width', this.props.overrideWidth) : {},
    );
    const inputStyle = _.extend({},
      {
        borderColor: 'rgba(0,0,0,0)',
      },
    );
    const searchLineStyle = _.extend({},
      borderColor(Color(Colors().border1).alpha(0.25).toString()),
    );
    const columnTitleStyle = _.extend({},
      fontColor(Colors().text1),
      backgroundColor(Colors().inputBg),
    );

    const innerBg = cardHoverBackground(this.state.currentCategory.color, Colors().bg3);
    const selectorInnerStyle = _.extend({},
      borderColor(Colors().border1),
      getStyle('height', this.computeMaxHeight(this.props.cardTypeList.size)),
    );

    return (
      <div
        className={classNames({
          'create-card-selector': true,
          'create-card-selector-open': this.props.open,
          'create-card-selector-focused': this.state.focusedIndex !== -1,
        })}
        ref='selector'
        style={rootStyle}
      >
        <div className='inset-shadow-veil' />

        <div className='selectors-row'>
          <div className='card-category-selector'>
            <div className='create-card-column-title' style={columnTitleStyle}>
              Types
            </div>
            {
              this.renderCategoryOptions()
            }
          </div>
          <div className='create-card-selector-column'>
            <div className='create-card-column-title' style={columnTitleStyle}>
              Cards
            </div>
            <div
              className='create-card-selector-inner'
              style={selectorInnerStyle}
            >
              {
                isEmpty &&
                <div className='create-card-empty'>
                  There are no remaining cards that can be created here.
                </div>
              }
              {
                this.renderCardOptions()
              }
            </div>
          </div>
        </div>
        <div className='card-search-line'
          style={searchLineStyle}
        >
          <input
            className='card-search-input'
            placeholder='Search for a card'
            value={this.state.searchValue}
            ref={this.registerInputElement}
            onChange={this.handleSearchTextboxChange}
            style={inputStyle}
          />
        </div>

      </div>
    );
  }

}
export default CardSelector;
