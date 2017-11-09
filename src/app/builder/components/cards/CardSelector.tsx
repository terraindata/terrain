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
import { Card, CardConfig, getCardCategory, getCardTitle } from 'src/blocks/types/Card';
import { AllBackendsMap } from 'src/database/AllBackends';
import { backgroundColor, borderColor, cardHoverBackground, cardStyle, Colors, fontColor, getStyle } from '../../../colors/Colors';

import { CreateCardOption, searchForText } from './CreateCardOption';
import './CreateCardTool.less';

// function getCardCategory(card: CardConfig): string
// {
//   if (card === undefined)
//   {
//     return '';
//   }
//   else if (card.static === undefined || card.static.clause === undefined)
//   {
//     return card.key;
//   }
//   else
//   {
//     return card.static.clause.path[0];
//   }
// }

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
    innerSelectorElement: any;
    computedHeight: number;
    currentCategory: CardCategory;
    optionMap: IMMap<number, any>; // this is to allow proper scrolling when arrow keys are pressed
  } = {
    searchValue: '',
    focusedIndex: 0,
    inputElement: undefined,
    categoryListElement: undefined,
    innerSelectorElement: undefined,
    computedHeight: -1,
    currentCategory: categories.get(0),
    optionMap: Map(),
  };

  constructor(props)
  {
    super(props);
    this.computeAvailableCategories = memoizeOne(this.computeAvailableCategories);
    this.getCardSuggestionSet = memoizeOne(this.getCardSuggestionSet);
    this.computeOptionCategories = memoizeOne(this.computeOptionCategories);
    this.computeCardOptions = memoizeOne(this.computeCardOptions);
    this.changeCategoryWrapper = _.memoize(this.changeCategoryWrapper, (item: CardCategory) => item.name);
    const available = this.computeAvailableCategories(this.props.cardTypeList, this.props.card);
    this.state.currentCategory = available.get(0);
    // even if there are no cards, 'all' will always be there.

    const indexList = this.getCardOptions().map((v, i) => v.index).toList();
    const currentListIndex = indexList.indexOf(this.state.focusedIndex);
    if (currentListIndex === -1 && indexList.size > 0)
    {
      this.state.focusedIndex = indexList.get(0);
    }
  }

  // (memoized) return a set that contains the suggested types
  public getCardSuggestionSet(creatingCard: CardConfig): Set<string>
  {
    const suggestions: string[] = creatingCard.static.clause.suggestions;
    return Set(List(suggestions));
  }

  // (memoized) return list of categories where there exist cards that fall under that category.
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
  public computeOptionCategories(cardTypeList: List<string>, creatingCard: CardConfig): List<Set<string>>
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
    const optionHeight = 72; // should match height of option
    const potentialSelectorHeight = cardListLength * optionHeight;
    const categoryHeight = this.state.categoryListElement !== undefined ?
      this.state.categoryListElement.clientHeight : 0;

    return Math.max(categoryHeight, Math.min(potentialSelectorHeight, optionHeight * 5)) + 'px';
  }

  public handleEnterKey()
  {
    const type = this.props.cardTypeList.get(this.state.focusedIndex);
    const optionCard = AllBackendsMap[this.props.language].blocks[type] as CardConfig;
    this.props.handleCardClick(optionCard, this.state.focusedIndex);
  }

  public handleArrowKey(event)
  {
    const indexList = this.getCardOptions().map((v, i) => v.index).toList();
    const currentListIndex = indexList.indexOf(this.state.focusedIndex);

    if (indexList.size > 0 && currentListIndex !== -1)
    {
      let newFocusedListIndex = -1;
      if (event.keyCode === 40) // down (go 'up' the list since list is top to bottom)
      {
        newFocusedListIndex = Math.min(currentListIndex + 1, indexList.size - 1);
      }
      else if (event.keyCode === 38) // up (go 'down' the list)
      {
        newFocusedListIndex = Math.max(currentListIndex - 1, 0);
      }

      const focusedIndex = indexList.get(newFocusedListIndex);
      const elem = this.state.optionMap.get(focusedIndex);
      if (elem !== null && elem !== undefined)
      {
        const scrollTop = this.state.innerSelectorElement.scrollTop;
        const topToTopDistance =
          scrollTop - (elem.offsetTop - elem.clientHeight / 2.0 - 3);
        // minus three for the border width (2px + integer truncation)
        const bottomToBottomDistance =
          scrollTop + this.state.innerSelectorElement.clientHeight
          - (elem.offsetTop + elem.clientHeight / 2.0);
        if (topToTopDistance > 0 || bottomToBottomDistance < 0)
        {
          const newScrollTop =
            scrollTop - (event.keyCode === 38 ? topToTopDistance : bottomToBottomDistance);
          $(this.state.innerSelectorElement).animate({ scrollTop: newScrollTop }, { duration: 150, queue: false });
        }
      }

      this.setState({
        focusedIndex,
      });
    }
  }

  public handleCtrlArrowKey(event)
  {
    const availableCategories = this.computeAvailableCategories(this.props.cardTypeList, this.props.card);
    const categoryIndex = availableCategories.indexOf(this.state.currentCategory);

    if (availableCategories.size > 0 && categoryIndex !== -1)
    {
      let newIndex = categoryIndex;
      if (event.keyCode === 38) // up (decrease index, since list items displayed top to bottom)
      {
        newIndex = Math.max(categoryIndex - 1, 0);
      }
      else if (event.keyCode === 40) // down
      {
        newIndex = Math.min(categoryIndex + 1, availableCategories.size - 1);
      }

      const newCategory = availableCategories.get(newIndex);
      this.changeCategoryWrapper(newCategory)(); // get the click handler for the category and 'click' it.
    }
  }

  // it is not possible to use the KeyboardFocus component since our input element needs focus
  public handleKeyDown(event)
  {

    if (event.keyCode === 13) // enter
    {
      this.handleEnterKey();
    }

    if (event.keyCode === 38 || event.keyCode === 40) // up and down
    {
      if (event.ctrlKey)
      {
        this.handleCtrlArrowKey(event);
      }
      else
      {
        this.handleArrowKey(event);
      }
    }

  }

  public handleSearchTextboxChange(ev: any)
  {
    const indexList = this.getCardOptions({ searchValue: ev.target.value }).map((v, i) => v.index).toList();
    const currentListIndex = indexList.indexOf(this.state.focusedIndex);
    let focusedIndex = this.state.focusedIndex;
    if (currentListIndex === -1 && indexList.size > 0)
    {
      focusedIndex = indexList.get(0);
    }
    this.setState({
      searchValue: ev.target.value,
      focusedIndex,
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

  public getCardOptions(overrides:
    {
      categoryName?: string,
      searchValue?: string,
      focusedIndex?: number,
    } = {},
  ): List<{ index: number, option: any }>
  {
    const options = this.computeCardOptions(
      this.props.cardTypeList,
      this.props.overrideText,
      this.computeOptionCategories(this.props.cardTypeList, this.props.card),
      overrides.categoryName || this.state.currentCategory.name,
      this.props.language,
      overrides.searchValue || this.state.searchValue,
      overrides.focusedIndex || this.state.focusedIndex,
      this.props.handleCardClick,
    );
    return options;
  }

  // (memoized) parameterize all these variables so we can memioze by arguments
  public computeCardOptions(
    cardTypeList: List<string>,
    overrideText,
    optionCategories,
    currentCategory,
    language,
    searchValue,
    focusedIndex,
    handleCardClick,
  ): List<{ index: number, option: any }>
  {
    return cardTypeList.map((type: string, index: number) =>
    {
      const optionCard = AllBackendsMap[language].blocks[type] as CardConfig;
      const title = (overrideText && overrideText.get(index) && overrideText.get(index).text)
        || getCardTitle(optionCard);
      const description = optionCard.static.description || 'Create a ' + title + ' card.';
      const searchResult = searchForText(title, description, searchValue);

      if (optionCategories.get(index).has(currentCategory) && searchResult)
      {
        return {
          index, option: (
            <CreateCardOption
              title={searchResult[0]}
              description={searchResult[1]}
              card={optionCard}
              index={index}
              outerRef={(elem) =>
              {
                if (elem !== null)
                {
                  this.setState((prevState, props) =>
                  {
                    return { optionMap: prevState.optionMap.set(index, elem) };
                  });
                }
              }}
              onClick={handleCardClick}
              isFocused={focusedIndex === index}
              key={index.toString()}
            />
          ),
        };
      }
      return null;
    }).filter((val) => val !== null).toList();
  }

  public renderCategory(item: CardCategory, index: number)
  {
    let categoryStyle = _.extend({},
      fontColor(item.color),
      borderColor(Colors().bg1),
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
        backgroundColor(Colors().bg3, cardHoverBackground(item.color, Colors().bg3)),
      );
    }

    return (
      <div
        className='card-category-list-item'
        style={categoryStyle}
        key={index}
        onClick={this.changeCategoryWrapper(item)}
      >
        {item.name}
      </div>
    );
  }

  // memoized higher order function that handles category click
  public changeCategoryWrapper(item: CardCategory)
  {
    return () =>
    {
      this.state.inputElement.focus();

      const indexList = this.getCardOptions({ categoryName: item.name }).map((v, i) => v.index);
      let focusedIndex = this.state.focusedIndex;
      if (item.name !== this.state.currentCategory.name && indexList.size > 0)
      {
        focusedIndex = indexList.get(0);
      }

      $(this.state.innerSelectorElement).animate({ scrollTop: 0 }, { duration: 150, queue: false });

      this.setState({
        currentCategory: item,
        focusedIndex,
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
      getStyle('outline', 'none'),
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
        onKeyDown={this.handleKeyDown}
        tabIndex={-1}
      >
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
              ref={this._setStateWrapper('innerSelectorElement')}
            >
              {
                isEmpty &&
                <div className='create-card-empty'>
                  There are no remaining cards that can be created here.
                </div>
              }
              {
                this.getCardOptions().map((v, i) => v.option)
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
