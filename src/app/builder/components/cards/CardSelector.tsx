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
import * as Radium from 'radium';
import * as React from 'react';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;
const Color = require('color');

import TerrainComponent from 'common/components/TerrainComponent';
import { Card, CardConfig } from 'src/blocks/types/Card';
import { AllBackendsMap } from 'src/database/AllBackends';
import { backgroundColor, borderColor, cardHoverBackground, cardStyle, Colors, fontColor, getStyle } from '../../../colors/Colors';

import CreateCardOption from './CreateCardOption';
import './CreateCardTool.less';

export interface Props
{
  cardTypeList: List<string>;
  open: boolean;
  card: Card; // the card that is doing the creating
  language: string;
  handleCardClick: (block, index) => void;
  overrideText?: List<{
    text: string;
    type: string;
  }>; // can override the options displayed
}

function getCardCategory(card: Card): string
{
  if (card === undefined)
  {
    return '';
  }
  else if (card.static.clause === undefined)
  {
    return card.key;
  }
  else
  {
    return card === undefined ? '' : card.static.clause.path[0];
  }
}

// if suggestion: if parent card.static.clause.suggestions contains overrideText[index][key]

const cardCategoryColors = Colors().builder.cards.categories;

const categories =
[
  {name: 'suggested', color: Colors().text2},
  {name: 'filter', color: Colors().builder.cards.categories.filter},
  {name: 'sort', color: Colors().builder.cards.categories.sort},
  {name: 'other', color: Colors().text3},
  {name: 'all', color: Colors().text3},
];

@Radium
class CardSelector extends TerrainComponent<Props>
{
  public state: {
    searchValue: string;
    focusedIndex: number;
    inputElement: any;
    cardSelectorElement: any;
    computedHeight: number;
    possibleCategories: List<string>;
  } = {
    searchValue: '',
    focusedIndex: -1,
    inputElement: undefined,
    cardSelectorElement: undefined,
    computedHeight: -1,
    possibleCategories: List([]),
  };

  public computeAvailableCategories(cardTypeList: List<string>, overideText?: List<any>)
  {
    return [];
  }

  public handleSearchTextboxChange(ev: any)
  {
    if (this.state.cardSelectorElement !== undefined && this.state.cardSelectorElement !== null)
    {
      this.setState({
        computedHeight: Math.max(this.state.cardSelectorElement.clientHeight, this.state.computedHeight),
      });
    }
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

  public registerCardSelector(cardSelectorElement)
  {
    this.setState({
      cardSelectorElement,
    });
  }

  public renderCardOption(type: string, index: number)
  {
    const { overrideText } = this.props;

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

  public renderCardOptions()
  {
    return this.props.cardTypeList.map(this.renderCardOption);
  }

  // public renderCategory(color: string, key: string)
  // {
  //   if (key === 'parameter' || key === 'compound' || key === 'suggest')
  //   {
  //     return undefined;
  //   }

  //   return (
  //     <div
  //       className='card-category-list-item'
  //       style={_.extend({},
  //         fontColor(color),
  //         backgroundColor(Colors().bg2, cardHoverBackground(color, Colors().bg3)),
  //         borderColor(Colors().border1),
  //         getStyle('borderLeftColor', color),
  //       )}
  //       key={key}
  //     >
  //       {key}
  //     </div>
  //   );
  // }

  public renderCategory(item, index)
  {
    return (
      <div
        className='card-category-list-item'
        style={_.extend({},
          fontColor(item.color),
          backgroundColor(Colors().bg2, cardHoverBackground(item.color, Colors().bg3)),
          borderColor(Colors().border1),
          getStyle('borderLeftColor', item.color),
        )}
        key={item.name}
      >
        {item.name}
      </div>
    );
  }

  public renderCategoryOptions()
  {
    return (
      <div className='card-category-list'>
        {categories.map(this.renderCategory)}
      </div>
    );
  }

  public componentWillReceiveProps(nextProps)
  {
    if (this.props.cardTypeList !== nextProps.cardTypeList || !nextProps.open)
    {
      this.setState({
        computedHeight: -1,
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

    return (
      <div
        className={classNames({
          'create-card-selector': true,
          'create-card-selector-open': this.props.open,
          'create-card-selector-focused': this.state.focusedIndex !== -1,
        })}
        ref='selector'
        style={backgroundColor(Colors().bg1)}
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
          <div className='create-card-selector-column' style={borderColor(Colors().border1)}>
            <div className='create-card-column-title' style ={columnTitleStyle}>
              Cards
            </div>
            <div
              className='create-card-selector-inner'
              ref={this.registerCardSelector}
              style={_.extend({},
                borderColor(Colors().border1), this.state.computedHeight === -1 ?
                {} :
                {
                  height: this.state.computedHeight,
                })}
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
