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

// tslint:disable:strict-boolean-expressions member-access

import * as classNames from 'classnames';
import { tooltip, TooltipProps } from 'common/components/tooltip/Tooltips';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import Dropdown from './Dropdown';

export interface AdvancedDropdownOption
{
  value: any;
  displayName: string | number | El;
  color?: string;
  tooltipContent?: string | El;
}

export interface Props
{
  options: List<AdvancedDropdownOption>;
  value: any;
  onChange: (value: any) => void;
  canEdit?: boolean;
  className?: string;
  centerAlign?: boolean;
  width?: string;
  directionBias?: number;
  wrapperTooltip?: string;
  placeholder?: string;
  textShouldBeNumber?: boolean;
  textboxWidth?: number;
  textPlaceholder?: string;

  floatingLabel?: string;
}

@Radium
class AdvancedDropdown extends TerrainComponent<Props>
{
  state = {
    computedOptions: this.getComputedOptions(this.props),
    computedIndex: this.getComputedIndex(this.props),
    computedTooltips: this.getComputedTooltips(this.props),
    showOther: this.getShowOther(this.props),
  };

  componentWillReceiveProps(nextProps: Props)
  {
    if (this.props.options !== nextProps.options || this.props.value !== nextProps.value)
    {
      const newState = {
        computedOptions: this.getComputedOptions(nextProps),
        computedIndex: this.getComputedIndex(nextProps),
        computedTooltips: this.getComputedTooltips(nextProps),
      };

      if (this.props.options !== nextProps.options)
      {
        // options changed, recompute showOther
        newState['showOther'] = this.getShowOther(nextProps);
        // Note: need to use this object / setting key paradigm so that we
        //  do not override any other calls to set the showother state that
        //  are currently in place.
      }
      // Note: do not update showOther if only the value changed
      // (see potential bug scenario at the end of this file)

      this.setState(newState);
    }
  }

  public componentDidUpdate(prevProps: Props, prevState)
  {
    if (!prevState.showOther && this.state.showOther)
    {
      // clicked other, invoke onChange to clear out value
      this.props.onChange('');
      // Note: the reason we do it this way is that calling the onChange from
      // within the change handler led to some weird
    }

    if (prevState.showOther && !this.state.showOther)
    {
      // we switch away from other, need to reupdate the index, as it
      //  will usually come second
      // Perhaps there is a better way to do this?
      this.setState({
        computedIndex: this.getComputedIndex(this.props),
      });
    }
  }

  public render()
  {
    const { props, state } = this;

    return (
      <div className='flex-container-center'>
        <Dropdown
          options={state.computedOptions}
          selectedIndex={state.computedIndex}
          onChange={this.handleDropdownChange}
          canEdit={props.canEdit}
          className={props.className}
          centerAlign={props.centerAlign}
          textColor={this.getColorForOption}
          width={props.width}
          directionBias={props.directionBias}
          tooltips={state.computedTooltips}
          wrapperTooltip={props.wrapperTooltip}
          placeholder={props.placeholder}
          floatingLabel={props.floatingLabel}
        />

        <div
          className='transition overflow-hidden'
          style={getStyle('width', state.showOther ? props.textboxWidth || 150 : 0)}
        >
          {
            state.showOther ?
              <input
                type='text'
                value={props.value}
                placeholder={this.props.textPlaceholder !== undefined ?
                  this.props.textPlaceholder : 'Custom value'}
                onChange={this.handleTextChange}
                className='transition box-size'
              />
              : null
          }
        </div>
      </div>
    );
  }

  private getComputedOptions(props: Props): List<string | number | El>
  {
    return props.options.map(
      (option) => option.displayName,
    ).toList().push('Other');
  }

  private getComputedIndex(props: Props): number
  {
    if (
      (this.state && this.state.showOther)
      || (!this.state && this.getShowOther(props)) // for initial render
    )
    {
      return props.options.size;
    }

    return props.options.findIndex((option) => option.value === props.value);
  }

  private getComputedTooltips(props: Props): List<string | El>
  {
    return props.options.map(
      (option) => option.tooltipContent,
    ).toList().push("Enter a value that's not in this list.");
  }

  private handleDropdownChange(index: number): void
  {
    const { options, onChange } = this.props;

    if (index === options.size)
    {
      // other
      this.setState({
        showOther: true,
      });
    }
    else
    {
      // not "other"
      this.setState({
        showOther: false,
      });
      onChange(options.get(index).value);
    }
  }

  private handleTextChange(event): void
  {
    let { value } = event.target;
    if (this.props.textShouldBeNumber && !Number.isNaN(+value) && value !== '')
    {
      value = +value;
    }
    this.props.onChange(value);
  }

  private getColorForOption(index): string | undefined
  {
    const option = this.props.options.get(index);
    if (option)
    {
      return option.color;
    }
    return undefined;
  }

  // Note: only use this when the dropdown options change, to prevent bugs
  // Potential bug in using it elsewhere:
  // - you click "other"
  // - when typing you enter a value that is in the options list
  // - the textbox disappears, dropdown is set to that value
  // - this makes some values impossible to type if their prefix is in the list
  // - would also make it impossible to have a value of "" in the list and use Other
  private getShowOther(props: Props): boolean
  {
    return !props.options.find(
      (option) => option.value === props.value,
    ) && props.value !== null; // null value means show a blank w/ placeholder
  }
}

export default AdvancedDropdown;
