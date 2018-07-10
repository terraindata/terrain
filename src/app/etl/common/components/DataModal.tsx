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

// tslint:disable:no-var-requires switch-default strict-boolean-expressions

import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import { List } from 'immutable';
import * as React from 'react';

import * as _ from 'lodash';
import { backgroundColor, Colors, fontColor, getStyle } from '../../../colors/Colors';
import { ColorsActions } from '../../../colors/data/ColorsRedux';
import './DataModal.less';

export interface Props
{
  sectionTitle?: string | El;
  sectionType: string;
  sectionOptions: List<any>;
  sectionBoxes: List<any>;
  sectionTitles?: List<any>;
  width: string;
  height: string;
  strictFormatting?: boolean;
  dynamicTitle: boolean;
  onChange?: (value: any) => void;
}

export default class DataModal extends TerrainComponent<Props>
{
  constructor(props)
  {
    super(props);
    this.state = {
      currentOptionIndex: 0,
    };
  }

  public shouldComponentUpdate(nextProps, nextState)
  {
    if (!_.isEqual(nextState.currentOption, this.state.currentOption))
    {
      return true;
    }
    else
    {
      return (this.props !== nextProps) || (this.state !== nextState);
    }
  }

  public onTabChange(optionName)
  {
    if (this.props.onChange !== null)
    {
      this.props.onChange(optionName);
    }
    this.setState(
      {
        currentOptionIndex: this.props.sectionOptions.indexOf(optionName),
      },
    );
  }

  public renderSectionTab(options)
  {
    return (
      <div className='option-tabs'>
        {this.props.sectionOptions.map((optionName, i) =>
          <div
            className='option-button'
            key={i}
            onClick={this._fn(this.onTabChange, optionName)}
            style={{
              color: (this.state.currentOptionIndex === this.props.sectionOptions.indexOf(optionName)) ?
                Colors().mainBlue : Colors().sectionEditButton,
              background: Colors().bg,
            }}
          >
            {optionName}
          </div>,
        )
        }
      </div>
    );
  }

  public renderSectionInfo()
  {
    if (this.props.strictFormatting)
    {
      return (
        <div className='info-body' style={{ background: Colors().bg }}>
          <pre>{this.props.sectionBoxes.get(this.state.currentOptionIndex)}</pre>
        </div>
      );
    }
    else
    {
      return (
        <div className='info-body' style={{ background: Colors().bg }}>
          {this.props.sectionBoxes.get(this.state.currentOptionIndex)}
        </div>
      );
    }
  }

  public renderTitle()
  {
    const visualTitle = this.props.dynamicTitle ? this.props.sectionTitles.get(this.state.currentOptionIndex) :
      this.props.sectionTitle;
    return (
      <div className='info-header' style={{ color: Colors().mainSectionTitle }}>
        {visualTitle}
      </div>
    );
  }

  public render()
  {
    // console.log(this.props.sectionOptions.get(0));
    // console.log(this.state.currentOption);
    return (
      <div
        className='info-container'
        style={{ background: Colors().blockBg, height: this.props.height, width: this.props.width }}
      >
        <div className='info-header-bar'>
          {this.renderTitle()}
          {this.renderSectionTab(this.props.sectionOptions)}
        </div>
        {this.renderSectionInfo()}
      </div>
    );
  }
}
