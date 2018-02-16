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
import * as classNames from 'classnames';
import * as React from 'react';
import BuilderActions from './../../builder/data/BuilderActions';
import TerrainComponent from './../../common/components/TerrainComponent';
import Util from 'util/Util';
import './RadioButtons.less';

export interface RadioButtonOption
{
  key: string;
  display: string | El;
}

export interface Props
{
  selected: string;
  options: List<RadioButtonOption>;
  onSelectOption?: (key?: string, radioKey?: string) => void;
  keyPath?: KeyPath;
  radioKey?: string;
  action?: (keyPath, value) => void;
  builderActions?: typeof BuilderActions;
}

class RadioButtons extends TerrainComponent<Props>
{

  public handleSelectOption(option)
  {
    if (this.props.onSelectOption !== undefined)
    {
      this.props.onSelectOption(option, this.props.radioKey);
    }
    if (this.props.keyPath !== undefined)
    {
      if (this.props.action !== undefined)
      {
        this.props.action(this.props.keyPath, option);
      }
      else
      {
        this.props.builderActions.change(this.props.keyPath, option);
      }
    }
  }

  public renderOption(option: RadioButtonOption)
  {
    return (
      <div key={option.key} className='radio-button-option'>
        <div
          onClick={this._fn(this.handleSelectOption, option.key)}
          className={classNames({
            'radio-button': true,
            'radio-button-selected': option.key === this.props.selected,
          })}
        >
        </div>
        {option.display}
        <br />
      </div>
    );
  }

  public render()
  {
    return (
      <div>
        {this.props.options.map(this.renderOption)}
      </div>
    );
  }
}

export default Util.createTypedContainer(
  RadioButtons,
  [],
  { builderActions: BuilderActions }
);
