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

// tslint:disable:restrict-plus-operands strict-boolean-expressions no-var-requires member-ordering no-console no-unused-expression member-access max-line-length

import * as classNames from 'classnames';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import * as Highlight from 'react-highlighter';

import { backgroundColor, borderColor, cardStyle, Colors, fontColor, getStyle } from 'app/colors/Colors';
import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import { CardConfig } from 'src/blocks/types/Card';

import './CreateCardOption.less';

const Color = require('color');

export interface Props
{
  index: number;
  card: CardConfig;
  onClick: (card: CardConfig, index: number) => void;
  title: string;
  description: string;
  isFocused?: boolean;
  outerRef?: (elem) => void;
}

export function searchForText(title: string, description: string, searchText: string): any[] | boolean
{
  title = capitalize(title);
  const searchValueLowerCase = searchText.toLowerCase();
  if (searchText === '')
  {
    return [title, description];
  }
  else
  {
    if (title.toLowerCase().indexOf(searchValueLowerCase) !== -1 || description.toLowerCase().indexOf(searchValueLowerCase) !== -1)
    {
      return [
        <Highlight search={searchText} matchElement='span' matchStyle={matchStyle}>
          {title}
        </Highlight>,
        <Highlight search={searchText} matchElement='span' matchStyle={matchStyle}>
          {description}
        </Highlight>,
      ];
    }
    else
    {
      return false;
    }
  }
}

// https://stackoverflow.com/questions/4878756/how-to-capitalize-first-letter-of-each-word-like-a-2-word-city
function capitalize(str)
{
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

const matchStyle = {
  backgroundColor: Colors().inactiveHover,
  color: '#FFF',
};

@Radium
export class CreateCardOption extends TerrainComponent<Props>
{
  private handleClick()
  {
    this.props.onClick(this.props.card, this.props.index);
  }

  public render()
  {
    const { card } = this.props;

    if (!card)
    {
      console.warn('Missing card type: ', card);
      // TODO throw error instead
      return null;
    }

    const leftRightColor = this.props.isFocused ? Colors().inactiveHover : Colors().bg3;
    const topBottomColor = this.props.isFocused ? Colors().inactiveHover : Colors().bg1;
    const mainStyle = _.extend({},
      getStyle('borderTopColor', topBottomColor),
      getStyle('borderBottomColor', topBottomColor),
      getStyle('borderRightColor', leftRightColor),
      getStyle('borderLeftColor', leftRightColor),
      fontColor(Colors().text2, Colors().text1),
      backgroundColor(Colors().bg3, Colors().highlight),
    );
    const titleStyle = _.extend({},
      fontColor(card.static.colors[0]),
    );

    return (
      <div
        className={classNames({
          'create-card-option': true,
        })}
        onClick={this.handleClick}
        style={mainStyle}
        key='create-option'
        ref={this.props.outerRef}
      >
        <div
          className='create-card-option-title'
          key='create-title'
          style={titleStyle}
        >
          {
            this.props.title
          }
        </div>
        {
          tooltip(
            <div className='create-card-option-description'> {this.props.description} </div>,
            {
              html:
              <span className='create-card-option-description-tooltip'>
                {card.static.description}
              </span>,
              size: 'small',
              position: 'left',
            },
          )
        }
      </div>
    );
  }
}
