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
import * as Radium from 'radium';
import * as React from 'react';
import { CardConfig } from '../../../../blocks/types/Card';
import { borderColor, cardStyle, Colors } from '../../../colors/Colors';
import TerrainComponent from '../../../common/components/TerrainComponent';
import './CreateCardOption.less';

export interface Props
{
  index: number;
  card: CardConfig;
  onClick: (card: CardConfig, index: number) => void;
  overrideTitle?: string;
  isFocused?: boolean;
}

@Radium
class CreateCardOption extends TerrainComponent<Props>
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
      console.log('Missing card type: ', card);
      // TODO throw error instead
      return null;
    }

    const text = this.props.overrideTitle || card.static.title;

    return (
      <div
        className={classNames({
          'create-card-option': true,
          'create-card-option-focused': this.props.isFocused,
        })}
        onClick={this.handleClick}
        style={
          borderColor(Colors().bg3, Colors().inactiveHover)
        }
        key='create-option'
      >
        <div
          className='create-card-option-button'
          style={cardStyle(card.static.colors[0], Colors().bg3, null, true)}
          key='create-button'
        >
          {
            text
          }
        </div>
        <div
          className='create-card-option-description'
        >
          {
            card.static.description || 'Create a ' + card.static.title + ' card.'
          }
        </div>
      </div>
    );
  }
}
export default CreateCardOption;
