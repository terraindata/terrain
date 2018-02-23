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
import { List, Map } from 'immutable';
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import './RouteSelectorStyle.less';
import { FloatingInput, LARGE_FONT_SIZE, FONT_SIZE } from './FloatingInput';
import FadeInOut from './FadeInOut';
import DrawerAnimation from './DrawerAnimation';
import { ResultsConfig, _ResultsConfig } from 'shared/results/types/ResultsConfig';
import Hit from 'builder/components/results/Hit.tsx';
import Util from 'util/Util';
import KeyboardFocus from './KeyboardFocus';


export interface RouteSelectorOption
{
  value: any;
  displayName?: string | number | El;
  color?: string;
  sampleData: List<any>;
  extraContent?: string | El;
  icon?: any;
  closeOnPick?: boolean; // close the picker when this option is picked
}

export interface RouteSelectorOptionSet
{
  key: string;
  options: List<RouteSelectorOption>;
  hasOther?: boolean;
  focusOtherByDefault?: boolean;
  shortNameText: string;
  headerText: string;
  
  hasSearch?: boolean; // NOTE not compatible with hasOther
  column?: boolean; // force a column layout
  hideSampleData?: boolean; // hide sample data, even if it's present
  getCustomDisplayName?: (value, setIndex: number) => string | undefined;
  
  valueComponent?: React.Component;
}

export interface Props
{
  optionSets: List<RouteSelectorOptionSet>;
  values: List<any>;
  onChange: (key: number, value: any) => void;
  canEdit: boolean;

  forceOpen?: boolean; // force it to be open no matter whwat
  defaultOpen?: boolean; // default to open when the component mounts (but don't force open)
  large?: boolean;
  noShadow?: boolean;
}

@Radium
export class RouteSelector extends TerrainComponent<Props>
{
  state = {
    open: !! this.props.defaultOpen,
    searches: List<string>([]),
    
    focusedSetIndex: this.props.defaultOpen ? 0 : -1,
    focusedOptionIndex: 0,
    
    columnRefs: Map<number, any>({}),
    optionRefs: Map({}),
    pickerRef: null,
    
    // TODO re-add animation / picked logic
    // picked: false,
    // pickedIndex: -1,
    // valueRef: null,
    // animationEl: null,
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
        className='routeselector-wrapper'
      >
        {
          this.renderVeil()
        }
        <div
          className={classNames({
            'routeselector': true,
            'routeselector-large': props.large,
            // 'routeselector-picked': state.picked,
          })}
        >
          {
            this.renderBoxValue()
          }
          {
            this.renderPicker()
          }
        </div>
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
    
    return (
      <div
        className={classNames({
          'routeselector-box-values': true,
          'routeselector-box-values-open': this.isOpen(),
          'routeselector-box-values-force-open': props.forceOpen,
        })}
      >
        {
          props.optionSets.map((optionSet, index) => (
            <div
              className={classNames({
                'routeselector-box-value': true,
                'noselect': true,
                'routeselector-box-value-open': this.isOpen(),
                'routeselector-box-value-force-open': props.forceOpen,
              })}
              key={optionSet.key}
              onClick={this._fn(this.handleSingleBoxValueClick, index)}
              style={getStyle('width', (100 / props.optionSets.size) + '%')}
            >
              <FloatingInput
                label={optionSet.shortNameText}
                isTextInput={false}
                value={this.getDisplayName(index)}
                onClick={this.handleBoxValueClick}
                canEdit={props.canEdit}
                large={props.large}
                noBorder={true}
              />
                {/*getValueRef={this.handleValueRef}
                forceFloat={state.picked}*/}
            </div>
          ))
        }
        <div
          className='routeselector-close'
        >
          Close
        </div>
      </div>
    );
  }
  
  private getDisplayName(optionSetIndex: number, optionIndex?: number)
  {
    const { values, optionSets } = this.props;
    const optionSet = optionSets.get(optionSetIndex);
    const options = optionSet.options;
    const wantsCurrentValue = optionIndex === undefined;
    
    if (wantsCurrentValue)
    {
      // default to current value
      const value = values.get(optionSetIndex);
      if (optionSet.getCustomDisplayName)
      {
        const name = optionSet.getCustomDisplayName(value, optionSetIndex);
        if (name !== undefined)
        {
          return name;
        }
      }
      
      optionIndex = options.findIndex((option) => option.value === value);
      
      if (optionIndex === -1)
      {
        // no value set, or unknown value
        return values.get(optionSetIndex);
      }
    }
    
    const option = options.get(optionIndex);
    
    if (option === undefined || option === null)
    {
      console.warn(`WARNING, non-existent option display name queried: ${optionIndex} from ${optionSetIndex}`);
      return "";
    }
    
    return option.displayName;
  }

  private handleBoxValueClick()
  {
    let open = !this.state.open;
    
    this.setState({
      open,
    });
    
    if (open)
    {
      // scroll the picker into view
      setTimeout(() =>
      {
        const el = ReactDOM.findDOMNode(this.state.pickerRef);
      
        if (el && false) // TODO LK
        {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
          });
        }
      }, 200);
    }
  }
  
  private handleSingleBoxValueClick(optionSetIndex)
  {
    this.setState({
      focusedSetIndex: optionSetIndex,
      focusedOptionIndex: 0,
    });
  }

  private renderPicker()
  {
    const { props, state } = this;
    
    const pickerInnerContent = (
      <div className='routeselector-picker-inner routeselector-multi-picker-inner'>
        {
          props.optionSets.map(this.renderOptionSet)
        }
      </div>
    );
    
    return (
      <DrawerAnimation
        open={this.isOpen()}
        maxHeight={400 /* coordinate this with LESS */ }
      >
        <div
          className={classNames({
            'routeselector-picker': true,
            'routeselector-picker-closed': !this.isOpen(),
            'routeselector-multi-picker': true,
            'routeselector-picker-no-shadow': props.noShadow,
          })}
          ref={this._fn(this._saveRefToState, 'pickerRef')}
        >
          {
            pickerInnerContent
          }
        </div>
      </DrawerAnimation>
    );
  }
  
  private renderOptionSet(optionSet: RouteSelectorOptionSet, index: number)
  {
    const { state, props } = this;
    const value = props.values.get(index);
    
    // counter passed down to renderOption to keep track of how many options are currently visible
    //  so that we can get the focused option index correct
    let visibleOptionCounter = { count: -1 };
    let incrementVisibleOptions = () => visibleOptionCounter.count ++;
    
    const showTextbox = optionSet.hasSearch || optionSet.hasOther;
    
    let textboxProps;
    if (optionSet.hasSearch)
    {
      textboxProps = {
        value: state.searches.get(index),
        label: 'Search Options',
        onChange: this._fn(this.handleOptionSearch, index),
        autoFocus: state.focusedSetIndex === index,
      };
    }
    if (optionSet.hasOther)
    {
      textboxProps = {
        value,
        label: 'Value', // TODO confirm copy
        onChange: this._fn(this.handleOtherChange, index),
        autoFocus: state.focusedSetIndex === index && optionSet.focusOtherByDefault,
      };
    }
    
    let valueComponentContent = null;
    if (optionSet.valueComponent)
    {
      let ValueComp = optionSet.valueComponent;
      
      valueComponentContent = (
        <div className='routeselector-value-component'>
          <ValueComp
            value={value}
          />
        </div>
      );
      // ({
      //   value,
      // });
    }
    
    return (
      <div
        className='routeselector-option-set'
        key={optionSet.key}
        style={getStyle('width', (100 / props.optionSets.size) + '%')}
      >
        <div
          className='routeselector-header'
        >
          {
            optionSet.headerText
          }
        </div>
        <div
          className='routeselector-util-row'
        >
          {/*TODO could hide this if it is not needed*/}
          {
            showTextbox ?
              <div
                className='routeselector-search'
              >
                <FloatingInput
                  {...textboxProps}
                  isTextInput={true}
                  canEdit={this.props.canEdit}
                  onKeyDown={this.handleInputKeyDown}
                  onFocus={this.handleOptionSearchFocus}
                  id={index}
                />
              </div>
            :
              <KeyboardFocus
                index={0 /* we handle index manipulation internally in this class */}
                length={0}
                onIndexChange={_.noop}
                onSelect={_.noop}
                onKeyDown={this.handleInputKeyDown}
                onFocus={this._fn(this.handleOptionSearchFocus, index)}
                onFocusLost={this._fn(this.handleOptionSearchFocusLost, index)}
                focusOverride={this.state.focusedSetIndex === index}
              />
          }
        </div>
        {
          valueComponentContent
        }
        <div
          className={classNames({
            'routeselector-options': true,
            'routeselector-options-column': optionSet.column,
          })}
          ref={this._fn(this.attachColumnRef, index)}
        >
          {
            optionSet.options.map(this._fn(this.renderOption, index, visibleOptionCounter, incrementVisibleOptions))
          }
        </div>
      </div>
    )
  }
  
  private handleOtherChange(optionSetIndex: number, searchValue: string)
  {
    this.handleValueChange(optionSetIndex, searchValue);
  }
  
  private handleOptionSearch(optionSetIndex: number, searchValue: string)
  {
    this.setState({
      searches: this.state.searches.set(optionSetIndex, searchValue),
    });
  }
  
  private handleOptionSearchFocus(optionSetIndex: number)
  {
    let focusedOptionIndex = 0;
    
    const focusedSet = this.props.optionSets.get(optionSetIndex);
    if (focusedSet && focusedSet.focusOtherByDefault)
    {
      focusedOptionIndex = -1;
    }
    
    this.setState({
      focusedSetIndex: optionSetIndex,
      focusedOptionIndex,
    });
  }
  
  private handleOptionSearchFocusLost(optionSetIndex: number)
  {
    setTimeout(() => 
    {
      if (this.state.focusedSetIndex === optionSetIndex)
      {
        this.setState({
          focusedSetIndex: -1,
        });
      }
    }, 200);
  }
  
  private handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>)
  {
    const { keyCode } = e;
    const { optionSets } = this.props;
    
    let { focusedOptionIndex, focusedSetIndex } = this.state;
    let tabbed = false;
    let entered = false;
    let escaped = false;
    
    // express desired change in appropriate index
    switch (keyCode)
    {
      case 40:
        // down
        focusedOptionIndex += 1;
        break;
      case 38:
        // up
        focusedOptionIndex -= 1;
        break;
      case 37:
        // left
        // focusedSetIndex -= 1;
        break;
      case 39:
        // right
        // focusedSetIndex += 1;
        break;
      case 27:
        // esc
        escaped = true;
        break;
      case 9:
        // tab
        focusedSetIndex += 1;
        tabbed = true;
        break;
      case 13:
        // enter
        entered = true;
        break;
      default:
        const set = optionSets.get(focusedSetIndex);
        if (set && set.hasOther)
        {
          // keydown occured in a value textbox
          //  reset the focused index so that the user doesn't hit enter
          //   thinking they are using the value when they're actually focused
          //   on an option
          focusedOptionIndex = -1;
        }
    }
    
    // gate between allowable values
    focusedSetIndex = Util.valueMinMax(focusedSetIndex, 0, optionSets.size - 1);
    
    if (escaped)
    {
      this.close();
      return;
    }
    
    if (focusedSetIndex !== -1)
    {
      focusedOptionIndex = Util.valueMinMax(focusedOptionIndex, -1, optionSets.get(focusedSetIndex).options.size - 1);
    }
    else
    {
      focusedOptionIndex = -1;
    }
    
    
    if (entered)
    {
      if (focusedOptionIndex !== -1)
      {
        const options = optionSets.get(focusedSetIndex).options;
        
        // Need to find which option was highlit when enter was pressed
        let realOptionIndex = 0;
        let visibleOptionsIndex = -1;
        while (visibleOptionsIndex < focusedOptionIndex && realOptionIndex < options.size)
        {
          if (this.shouldShowOption(options.get(realOptionIndex), this.state.searches.get(focusedSetIndex)))
          {
            visibleOptionsIndex ++;
          }
          realOptionIndex ++;
        }
        realOptionIndex -= 1;
        
        this.handleOptionClick(focusedSetIndex, options.get(realOptionIndex).value);
      }
      
      focusedSetIndex ++;
      focusedOptionIndex = 0;
      
      const nextSet = optionSets.get(focusedSetIndex);
      if (nextSet && nextSet.focusOtherByDefault)
      {
        focusedOptionIndex = -1;
      }
      
      if (focusedSetIndex >= optionSets.size)
      {
        // entered out
        this.close();
      }
    }
    
    // TODO handle tabbing OUT of routeselector
    
    this.setState({
      focusedSetIndex,
      focusedOptionIndex,
    });
    
    // TODO make this more declarative, to avoid forced reflow
    setTimeout(() =>
    {
      const el = document.getElementsByClassName('routeselector-option-focused')[0];
      
      if(el)
      {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    }, 100);
  }
  
  private renderOption(optionSetIndex: number, visibleOptionCounter: { count: number }, incrementVisibleOptions: () => void,
    option: RouteSelectorOption, index: number)
  {
    const { props, state } = this;
    const optionSet = props.optionSets.get(optionSetIndex);
    const search = state.searches.get(optionSetIndex);
    const isShowing = this.shouldShowOption(option, search);
    
    if (isShowing)
    {
      incrementVisibleOptions();
    }
    
    const visibleOptionsIndex = visibleOptionCounter.count;
    
    return (
      <div 
        className='routeselector-option-wrapper'
        key={index}
      >
        <FadeInOut
          open={isShowing}
        >
          <div
            className={classNames({
              'routeselector-option': true,
              'routeselector-option-selected': props.values.get(optionSetIndex) === option.value,
              'routeselector-option-focused': state.focusedOptionIndex === visibleOptionsIndex
                && optionSetIndex === state.focusedSetIndex
                && state.focusedOptionIndex !== -1
                && state.focusedSetIndex !== -1,
              // 'routeselector-option-picked': this.state.pickedIndex === index, // when it's just been picked
            })}
            onClick={this._fn(this.handleOptionClick, optionSetIndex, option.value)}
            
          >
            <div
              className='routeselector-option-name'
              style={OPTION_NAME_STYLE}
              ref={'option-'+index}
            >
              {
                option.icon !== undefined &&
                  <div className='routeselector-option-icon'>
                    {
                      option.icon
                    }
                  </div>
              }
              <div className='routeselector-option-name-inner'>
                {
                  option.displayName
                }
              </div>
            </div>
            
            {
              option.sampleData && !optionSet.hideSampleData &&
                <div className='routeselector-data'>
                  <div className='routeselector-data-header'>
                    Sample Data
                  </div>
                  {
                    option.sampleData.map(this.renderSampleDatum)
                  }
                  {
                    option.sampleData.size === 0 &&
                      <div
                      >
                        {/* TODO styling */}
                        No data available
                      </div>
                  }
                </div>
            }
          </div>
        </FadeInOut>
      </div>
    );
  }
  
  private shouldShowOption(option: RouteSelectorOption, search: string)
  {
    if (!search || search.length === 0)
    {
      return true;
    }
    
    const searchFields = [option.value, option.displayName];

    if (
      searchFields.findIndex(
      (field) => 
      {
        if (typeof field === 'string')
        {
          return field.toUpperCase().indexOf(search.toUpperCase()) >= 0;
        }
        
        return false;
      }
      ) >= 0)
    {
      return true;
    }
    
    return false;
  }
  
  private handleOptionClick(optionSetIndex: number, value: any)
  {
    const { state, props } = this;
    
    this.handleValueChange(optionSetIndex, value);
    
    this.setState({
      // searches: state.searches.set(optionSetIndex, ''), // this would clear the search when an option is chosen
      focusedSetIndex: optionSetIndex + 1,
      focusedOptionIndex: 0,
    });
    
    const option = props.optionSets.get(optionSetIndex).options.find((option) => option.value === value);
    
    if (optionSetIndex === props.optionSets.size - 1 || (option && option.closeOnPick))
    {
      this.close();
    }
    
    // TODO re-add animations
    
    // if (state.picked)
    // {
    //   // double clicked
    //   return;
    // }
    
    // let animationEl = null;
    
    // if (pickedIndex !== this.getCurrentIndex())
    // {
    //   // animation, if we're changing value
      
    //   const optionBox = ReactDOM.findDOMNode(this.refs['option-' + pickedIndex]).getBoundingClientRect();
    //   const valueEl = ReactDOM.findDOMNode(state.valueRef);
    //   const valueBox = valueEl.getBoundingClientRect();
      
    //   const option = this.props.options.get(pickedIndex);
      
    //   animationEl = $("<div>" + option.displayName + "</div>")
    //     .addClass("routeselector-option-name")
    //     .css("position", "fixed")
    //     .css("color", OPTION_NAME_STYLE.color)
    //     .css("font-size", OPTION_NAME_STYLE.fontSize)
    //     .css("left", optionBox.left)
    //     .css("top", optionBox.top)
    //     .css("width", optionBox.width)
    //     // .css("height", optionBox.height)
    //     .css("box-sizing", "border-box")
    //     .css("z-index", 9999)
    //     ;
        
    //   $("body").append(animationEl);
      
    //   animationEl.animate(
    //     {
    //       left: valueBox.left,
    //       top: valueBox.top,
    //       width: valueBox.width,
    //       // height: valueBox.height, // can make it collapse to 0
    //       padding: '20px 18px 4px 18px',
    //       fontSize: props.large ? LARGE_FONT_SIZE : FONT_SIZE,
    //     }, 
    //     700, 
    //     () =>
    //     {
    //       // use a timeout to make the end of the animation smooth
    //       setTimeout(() => {
    //         $(valueEl).css("opacity", 1);
    //         this.handleValueChange(this.state.pickedIndex);
    //       }, 150);
          
    //     }
    //   );
      
    //   $(valueEl).css("opacity", 1);
    //   $(valueEl).animate({
    //       opacity: 0,
    //     },
    //     200);
    // }
    // else
    // {
    //   // close without dispatching a value change
    //   setTimeout(() => {
          // this.close();
    //   }, 850);
    // }
    
    // this.setState({
    //   picked: true,
    //   pickedIndex,
    //   animationEl,
    // });
  }
  
  private handlePickAnimationEnd()
  {
    
  }
  
  private cleanUpAnimation()
  {
    // if (this.state.animationEl !== null)
    // {
    //   this.state.animationEl.remove();
    // }
  }
  
  private handleValueChange(optionSetIndex: number, value: any)
  {
    const { props } = this;
    props.onChange(optionSetIndex, value);
    // setTimeout(this.cleanUpAnimation, 150);
  }
  
  private renderSampleDatum(data: any, index: number)
  {
    return (
      <Hit
        hit={data}
        resultsConfig={_ResultsConfig() /* TODO, use a suitable results config here */}
        index={index}
        primaryKey={data._id}
        onExpand={_.noop}
        allowSpotlights={false}
        onSpotlightAdded={_.noop}
        onSpotlightRemoved={_.noop}
        key={index}
      />
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
        className={'routeselector-veil' + (isOpen ? '-open' : '')} 
        onClick={this.handleVeilClick}
      />
    );
  }
  
  private handleVeilClick()
  {
    this.close();
  }
  
  private close()
  {
    this.setState({
      open: false,
      picked: false,
      pickedIndex: -1,
      searches: this.state.searches.map(() => ''), // clear searches
      focusedSetIndex: -1,
      focusedOptionIndex: -1,
    });
  }
  
  private handleValueRef(valueRef)
  {
    this.setState({
      valueRef,
    });
  }
  
  private attachColumnRef(optionSetIndex, columnRef)
  {
    this.setState({
      columnRefs: this.state.columnRefs.set(optionSetIndex, columnRef),
    });
  }
  
  private attachOptionRef(setIndex, optionIndex, optionRef)
  {
    let { optionRefs } = this.state;
    
    if (!optionRefs.get(setIndex))
    {
      optionRefs = optionRefs.set(setIndex, Map({}));
    }
    
    this.setState({
      columnRefs: optionRefs.setIn([setIndex, optionIndex], optionRef),
    });
  }
}

const OPTION_NAME_STYLE = {
  fontSize: 24,
  color: Colors().active,
};

export default RouteSelector;
