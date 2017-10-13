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

// tslint:disable:strict-boolean-expressions

import * as _ from 'lodash';
import * as React from 'react';

import * as Color from 'color';

import { backgroundColor, Colors, fontColor, getStyle } from 'common/Colors';
import TerrainComponent from 'common/components/TerrainComponent';
import './CardHelpTooltip.less';

export interface Props
{
  staticInfo: any;
  errors: List<string>;
}

export default class CardHelpTooltip extends TerrainComponent<Props>
{
  public render()
  {
    const cardColor = (this.props.staticInfo.colors && this.props.staticInfo.colors[0]) || Colors().altText1;
    const titleStyle = _.extend({},
      backgroundColor(Colors().bg3),
      fontColor(cardColor),
      getStyle('borderLeftColor', cardColor),
      getStyle('borderTopColor', Colors().highlight),
      getStyle('borderRightColor', Colors().highlight),
      getStyle('borderBottomColor', Colors().highlight),
    );
    let errorMessage = 'Error: ';
    let cardHasError = false;
    if (this.props.errors && this.props.errors.size > 0)
    {
      cardHasError = true;
      this.props.errors.map(
        (msg, key) =>
        {
          errorMessage += msg;
        });
    }
    return (
      <div className='card-help-tooltip'>
        {
          this.props.staticInfo.title &&
          <div className='card-help-title' style={titleStyle}>
            {this.props.staticInfo.title}
          </div>
        }
        <div className='card-description'>
          {this.props.staticInfo.description}
        </div>
        {
          cardHasError &&
          <div className='card-errorMessage'>
            {errorMessage}
          </div>
        }
        {
          <div className='card-help-link'>
            <a target='_blank' href={this.props.staticInfo.url}> Learn More </a>
          </div>
        }
      </div>
    );
  }
}
