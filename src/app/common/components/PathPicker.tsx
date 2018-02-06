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
import * as ReactDOM from 'react-dom';
import * as $ from 'jquery';
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import './PathPickerStyle.less';
import { FloatingInput, LARGE_FONT_SIZE, FONT_SIZE } from './FloatingInput';
import FadeInOut from './FadeInOut';

export interface PathPickerOption
{
  value: any;
  displayName?: string | number | El;
  color?: string;
  sampleData: List<any>;
  extraContent?: string | El;
}

export interface Props
{
  options: List<PathPickerOption>;
  value: any;
  onChange: (value: any) => void;
  canEdit?: boolean;

  shortNameText: string;
  headerText: string;

  forceOpen?: boolean;
  hasOther?: boolean;
  large?: boolean;
  noShadow?: boolean;

  // wrapperTooltip?: string;
}

@Radium
class PathPicker extends TerrainComponent<Props>
{
  state = {
    showOther: false,
    open: false,
    picked: false,
    pickedIndex: -1,
    valueRef: null,
    animationEl: null,
  };

  componentWillReceiveProps(nextProps: Props)
  {
    //
  }

  public componentDidUpdate(prevProps: Props, prevState)
  {
    //
  }

  public render()
  {
    const { props, state } = this;

    return (
      <div
        className={classNames({
          'pathpicker': true,
          'pathpicker-picked': state.picked,
        })}
      >
        {
          this.renderVeil()
        }
        {
          this.renderBoxValue()
        }
        {
          this.renderPicker()
        }
      </div>
    );
  }
  
  private isOpen()
  {
    return this.state.open || this.props.forceOpen;
  }

  private renderBoxValue()
  {
    const { props, state } = this;
    
    const currentIndex = this.getCurrentIndex();
    let renderedValue = this.renderValue('short', currentIndex);

    return (
      <div
        className={classNames({
          'pathpicker-box-value': true,
          'noselect': true,
          'pathpicker-box-value-open': this.isOpen(),
          'pathpicker-box-value-force-open': props.forceOpen,
        })}
      >
        <FloatingInput
          label={props.shortNameText}
          isTextInput={false}
          value={renderedValue}
          onClick={this.handleBoxValueClick}
          canEdit={props.canEdit}
          large={props.large}
          noBorder={true}
          getValueRef={this.handleValueRef}
          forceFloat={state.picked}
        />
        <div
          className='pathpicker-close'
        >
          Close
        </div>
      </div>
    );
  }

  private renderValue(type: 'short' | 'long', index: number)
  {
    const { props, state } = this;
    let showOther = false;
    let value;
    let option;
    
    if (index === -1)
    {
      // value not present
      showOther = true;
      value = props.value;
    }
    else
    {
      option = props.options.get(index);
      value = option.displayName;
    }
    
    // NOTE: If, in the future, you return a styled element from here,
    //  it may cause funkiness with FloatingLabel, which will think that
    //  there is a value even when it is blank.
    
    return value;
  }

  private handleBoxValueClick()
  {
    this.setState({
      open: !this.state.open,
    });
  }

  private getCurrentIndex(): number
  {
    const { props, state } = this;
    return props.options.findIndex(
      (option) => option.value === props.value);
  }

  private renderPicker()
  {
    const { props, state } = this;
    
    if(!this.isOpen()) return null;

    return (
      <div
        className={classNames({
          'pathpicker-picker': true,
          'pathpicker-picker-no-shadow': props.noShadow,
        })}
      >
        <div className='pathpicker-picker-inner'>
          <div
            className='pathpicker-header'
          >
            {
              props.headerText
            }
          </div>
          <div
            className='pathpicker-options'
          >
            {
              props.options.map(this.renderOption)
            }
          </div>
        </div>
      </div>
    );
  }
  
  private renderOption(option: PathPickerOption, index: number)
  {
    return (
      <div
        className={classNames({
          'pathpicker-option': true,
          'pathpicker-option-selected': this.getCurrentIndex() === index,
          'pathpicker-option-picked': this.state.pickedIndex === index, // when it's just been picked
        })}
        key={index}
        onClick={this._fn(this.handleOptionClick, index)}
      >
        <div
          className='pathpicker-option-name'
          style={OPTION_NAME_STYLE}
          ref={'option-'+index}
        >
          {
            option.displayName
          }
        </div>
        
        {
          option.sampleData && 
            <div className='pathpicker-data'>
              <div className='pathpicker-data-header'>
                Sample Data
              </div>
              {
                option.sampleData.map(this.renderSampleDatum)
              }
            </div>
        }
      </div>
    );
  }
  
  private handleOptionClick(pickedIndex: number)
  {
    const { state, props } = this;
    
    if (state.picked)
    {
      // double clicked
      return;
    }
    
    let animationEl = null;
    
    if (pickedIndex !== this.getCurrentIndex())
    {
      // animation, if we're changing value
      
      const optionBox = ReactDOM.findDOMNode(this.refs['option-' + pickedIndex]).getBoundingClientRect();
      const valueEl = ReactDOM.findDOMNode(state.valueRef);
      const valueBox = valueEl.getBoundingClientRect();
      
      const option = this.props.options.get(pickedIndex);
      
      animationEl = $("<div>" + option.displayName + "</div>")
        .addClass("pathpicker-option-name")
        .css("position", "fixed")
        .css("color", OPTION_NAME_STYLE.color)
        .css("font-size", OPTION_NAME_STYLE.fontSize)
        .css("left", optionBox.left)
        .css("top", optionBox.top)
        .css("width", optionBox.width)
        // .css("height", optionBox.height)
        .css("box-sizing", "border-box")
        .css("z-index", 9999)
        ;
        
      $("body").append(animationEl);
      
      animationEl.animate(
        {
          left: valueBox.left,
          top: valueBox.top,
          width: valueBox.width,
          // height: valueBox.height, // can make it collapse to 0
          padding: '20px 18px 4px 18px',
          fontSize: props.large ? LARGE_FONT_SIZE : FONT_SIZE,
        }, 
        700, 
        () =>
        {
          // use a timeout to make the end of the animation smooth
          setTimeout(() => {
            $(valueEl).css("opacity", 1);
            this.handleValueChange(this.state.pickedIndex);
          }, 150);
          
        }
      );
      
      $(valueEl).css("opacity", 1);
      $(valueEl).animate({
          opacity: 0,
        },
        200);
    }
    else
    {
      // close without dispatching a value change
      setTimeout(() => {
        this.setState({
          open: false,
          picked: false,
          pickedIndex: -1,
        });
      }, 850);
    }
    
    this.setState({
      picked: true,
      pickedIndex,
      animationEl,
    });
  }
  
  private handlePickAnimationEnd()
  {
    
  }
  
  private cleanUpAnimation()
  {
    if (this.state.animationEl !== null)
    {
      this.state.animationEl.remove();
    }
  }
  
  private handleValueChange(optionIndex: number)
  {
    const { props } = this;
    const option = props.options.get(optionIndex);
    props.onChange(option.value);
    this.setState({
      open: false,
      picked: false,
      pickedIndex: -1,
    });
    
    setTimeout(this.cleanUpAnimation, 150);
  }
  
  private renderSampleDatum(data: any, index: number)
  {
    // TODO coordinate formatting with ResultsArea
    return (
      <div
        className='pathpicker-data-piece'
        key={index}
      >
        {
          _.map(data, (value, field) => (
            <div
              className='pathpicker-data-row'
              key={field}
            >
              <div className='pathpicker-data-field'>
                {
                  field
                }
              </div>
              <div className='pathpicker-data-value'>
                {
                  value
                }
              </div>
            </div>
          ))
        }
      </div>
    );
  }
  
  private renderVeil()
  {
    if (this.props.noShadow)
    {
      return null;
    }
    
    const isOpen = this.isOpen();
    return (
      <div 
        className={'pathpicker-veil' + (isOpen ? '-open' : '')} 
        onClick={this.handleVeilClick}
      />
    );
  }
  
  private handleVeilClick()
  {
    this.setState({
      open: false,
    });
  }
  
  private handleValueRef(valueRef)
  {
    this.setState({
      valueRef,
    });
  }
}

const OPTION_NAME_STYLE = {
  fontSize: 24,
  color: Colors().active,
};

export default PathPicker;
