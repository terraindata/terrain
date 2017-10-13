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
import CheckBox from 'common/components/CheckBox';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, Colors } from '../../common/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import './MultiSwitch.less';
import SimpleRadio from './SimpleRadio';

interface Option
{
  value: string;
  label: string;
}

export interface Props
{
  options: List<string | Option>;

  // can pass the value in as an index, a string value, or an array of either
  //  (in the case of multiple selections)
  value: number | string | List<number> | List<string>;
  onChange: (value: number | string | List<number> | List<string>) => void;

  allowsMultiple?: boolean;
  usesValues?: boolean; // indicates if it uses values instead of indices

  small?: boolean;
  large?: boolean;
}

@Radium
class MultiSwitch extends TerrainComponent<Props>
{
  public constructor(props)
  {
    super(props);

    const { options } = this.props;

    const normalizedOptions = options.map((option) =>
    {
      if (typeof option === 'object')
      {
        return option;
      }
      else
      {
        return { value: option, label: option };
      }
    });

    this.state = {
      options: normalizedOptions,
    };
  }

  public optionIsOn(index: number): boolean
  {
    const { allowsMultiple, usesValues, value } = this.props;
    const { options } = this.state;

    const rawValue = usesValues ? options.get(index).value : index;

    if (allowsMultiple)
    {
      return (value as List<string | number>).contains(rawValue);
    }
    else
    {
      return rawValue === value;
    }
  }

  public handleSelect(index: number)
  {
    const { allowsMultiple, usesValues, onChange } = this.props;
    const { options } = this.state;
    let { value } = this.props;

    const rawValue = usesValues ? options.get(index).value : index;

    if (allowsMultiple)
    {
      let valueArray = value as List<string | number>;
      if (this.optionIsOn(index))
      {
        valueArray = valueArray.remove(valueArray.indexOf(rawValue));
      }
      else
      {
        valueArray = valueArray.push(rawValue);
      }
      value = valueArray as List<string> | List<number>;
    }
    else
    {
      value = rawValue;
    }

    this.props.onChange(value);
  }

  public render()
  {
    return (
      <div
        className={classNames({
          'multi-switch': true,
          'multi-switch-small': this.props.small,
          'multi-switch-large': this.props.large,
          'noselect': true,
        })}
        style={SWITCH_STYLE}
      >
        {
          this.state.options.map(this.renderOption)
        }
      </div>
    );
  }

  private renderOption(option: Option, index: number)
  {
    const isOn = this.optionIsOn(index);
    return (
      <div
        className={classNames({
          'multi-switch-option': true,
          'multi-switch-option-on': isOn,
        })}
        style={isOn ? ACTIVE_OPTION_STYLE : OPTION_STYLE}
        key={index}
        onClick={this._fn(this.handleSelect, index)}
      >
        {
          this.props.allowsMultiple ?
            <CheckBox
              checked={isOn}
              onChange={this._fn(this.handleSelect, index)}
              color={Colors().text1}
              label={option.label}
            />
            :
            <SimpleRadio
              on={isOn}
              large={this.props.large}
              small={this.props.small}
              label={option.label}
            />
        }
      </div>
    );
  }
}

const SWITCH_STYLE = {
  backgroundColor: Colors().bg3,
  color: Colors().text2,
};

const ACTIVE_OPTION_STYLE = {
  'color': Colors().text1,
  'backgroundColor': Colors().active,
  ':hover': {
    color: Colors().text1,
    backgroundColor: Colors().active,
  },
};

const OPTION_STYLE = {
  ':hover': {
    background: Colors().inactiveHover,
    color: Colors().inactiveHoverText,
  },
};

export default MultiSwitch;
