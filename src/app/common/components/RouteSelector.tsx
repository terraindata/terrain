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

// tslint:disable:strict-boolean-expressions member-access no-var-requires no-console

import Button from 'app/common/components/Button';
import Ajax from 'app/util/Ajax';
import Hit from 'builder/components/results/Hit.tsx';
import * as classNames from 'classnames';
import { tooltip, TooltipProps } from 'common/components/tooltip/Tooltips';
import { List, Map } from 'immutable';
import * as $ from 'jquery';
import * as Radium from 'radium';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { _ResultsConfig, ResultsConfig } from 'shared/results/types/ResultsConfig';
import * as _ from 'underscore';
import Util from 'util/Util';
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import DrawerAnimation from './DrawerAnimation';
import FadeInOut from './FadeInOut';
import { FloatingInput, FONT_SIZE, LARGE_FONT_SIZE } from './FloatingInput';
import KeyboardFocus from './KeyboardFocus';
import './RouteSelectorStyle.less';
import SearchInput from './SearchInput';

const RemoveIcon = require('images/icon_close_8x8.svg?name=RemoveIcon');
const InfoIcon = require('images/icon_info.svg');

export interface RouteSelectorOption
{
  value: any;
  displayName?: string | number | El;
  color?: string;
  sampleData?: List<any>;
  tooltip?: string;
  icon?: any;
  closeOnPick?: boolean; // close the picker when this option is picked
  component?: El | string;
}

export interface RouteSelectorOptionSet
{
  key: string;
  options: List<RouteSelectorOption>;
  hasOther?: boolean;
  focusOtherByDefault?: boolean;
  shortNameText?: string;
  headerText?: string;
  forceFloat?: boolean;
  isButton?: boolean;
  onButtonClick?: () => void;
  canUseButton?: boolean;
  icon?: El;
  hasSearch?: boolean; // NOTE not compatible with hasOther
  column?: boolean; // force a column layout
  hideSampleData?: boolean; // hide sample data, even if it's present
  getCustomDisplayName?: (value, setIndex: number) => string | undefined;

  getValueComponent?: (props: { value: any }) => React.ReactElement<any>;
}

export interface Props
{
  optionSets?: List<RouteSelectorOptionSet>;
  values: List<any>;
  getOptionSets?: () => List<RouteSelectorOptionSet>;
  relevantData?: any; // If this data changes, have to recalculate option sets
  onChange: (key: number, value: any) => void;
  canEdit: boolean;
  footer?: El;
  forceOpen?: boolean; // force it to be open no matter whwat
  defaultOpen?: boolean; // default to open when the component mounts (but don't force open)
  large?: boolean;
  semilarge?: boolean;
  noShadow?: boolean;
  autoFocus?: boolean;
  hideLine?: boolean;
  canDelete?: boolean;
  showWarning?: boolean;
  useTooltip?: boolean;
  warningMessage?: string;
  onDelete?: () => void;
  onToggleOpen?: (open: boolean) => void;
}

export class RouteSelector extends TerrainComponent<Props>
{
  state = {
    open: !!this.props.defaultOpen,
    searches: List<string>([]),

    focusedSetIndex: this.props.defaultOpen ? 0 : -1,
    focusedOptionIndex: 0,

    columnRefs: Map<number, any>({}),
    pickerRef: null,
    resultsConfig: Map({}),
    optionSets: List<RouteSelectorOptionSet>([]),
    // optionRefs: Map({}), // not needed for now, but keeping some logic around

    // TODO re-add animation / picked logic
    // picked: false,
    // pickedIndex: -1,
    // valueRef: null,
    // animationEl: null,
  };

  constructor(props)
  {
    super(props);
  }

  shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  }

  public componentDidMount()
  {
    // if (this.props.optionSets && !this.props.optionSets.get(0).hideSampleData)
    // {
    //   this.getResultConfigs(this.props.optionSets.get(0).options);
    // }
    this.setState({
      optionSets: this.props.optionSets !== undefined ?
        this.props.optionSets : this.props.getOptionSets(),
    },
      () =>
      {
        if (this.state.optionSets.get(0) && !this.state.optionSets.get(0).hideSampleData)
        {
          this.getResultConfigs(this.state.optionSets.get(0).options);
        }
      });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (!_.isEqual(this.props.relevantData, nextProps.relevantData))
    {
      this.setState({
        optionSets: this.props.getOptionSets(),
      });
    }
    else if (this.props.optionSets !== nextProps.optionSets)
    {
      this.setState({
        optionSets: nextProps.optionSets,
      });
    }
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
            'routeselector-semi-large': props.semilarge,
            'routeselector-open': this.isOpen(),
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
        style={getStyle('borderBottom', this.isOpen() ?
          '1px solid #eee' : props.hideLine ? 'none' : undefined)}
      >
        {
          props.showWarning &&
          tooltip(
            <InfoIcon
              className='routeselector-warning-icon'
              style={getStyle('fill', Colors().error)}
            />,
            props.warningMessage,
          )
        }
        {
          state.optionSets.map((optionSet, index) => (
            <div
              className={classNames({
                'routeselector-box-value': true,
                'noselect': true,
                'routeselector-box-value-open': this.isOpen(),
                'routeselector-box-value-force-open': props.forceOpen,
              })}
              key={optionSet.key}
              onClick={
                this._fn(this.handleSingleBoxValueClick, index)
                /* could try Mousedown to make it slightly snappier,
                but this led to weird issues with closing it */
              }
              style={getStyle('width', String(100 / state.optionSets.size + 3) + '%')}
            >
              {
                optionSet.isButton ?
                  <Button
                    text={this.getDisplayName(index)}
                    onClick={optionSet.onButtonClick}
                    icon={optionSet.icon}
                    disabled={!optionSet.canUseButton}
                  />
                  :
                  <FloatingInput
                    label={optionSet.shortNameText}
                    isTextInput={false}
                    value={this.getDisplayName(index)}
                    onClick={this.handleBoxValueClick}
                    canEdit={props.canEdit}
                    large={props.large}
                    semilarge={props.semilarge}
                    noBorder={true}
                    forceFloat={optionSet.forceFloat}
                    extendRight={true}
                    useTooltip={this.props.useTooltip}
                  />
              }
              {/*getValueRef={this.handleValueRef}
                forceFloat={state.picked}*/}
            </div>
          ))
        }
        <div
          className='routeselector-close'
          onClick={this.toggle}
        >
          Done
        </div>
        {
          (this.props.canDelete && this.props.canEdit && !this.state.open) &&
          <div
            onClick={this.props.onDelete}
            className='routeselector-delete close'
          >
            <RemoveIcon />
          </div>
        }
      </div>
    );
  }

  private getDisplayName(optionSetIndex: number, optionIndex?: number)
  {
    const { values } = this.props;
    const { optionSets } = this.state;
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

      optionIndex = options.findIndex((opt) => opt.value === value);

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
      return '';
    }

    return option.displayName;
  }

  private handleBoxValueClick()
  {
    this.toggle();
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

    return (
      <DrawerAnimation
        open={this.isOpen()}
        maxHeight={props.large ? 300 : 350 /* coordinate this with LESS */}
      >
        <div
          className={classNames({
            'routeselector-picker': true,
            'routeselector-picker-closed': !this.isOpen(),
            'routeselector-picker-no-shadow': props.noShadow,
          })}
          ref={this._fn(this._saveRefToState, 'pickerRef')}
        >
          <div className='routeselector-picker-inner'>
            {
              state.optionSets.map(this.renderOptionSet)
            }
          </div>
          {
            props.footer &&
            <div
              className='routeselector-picker-footer'
              style={borderColor(Colors().blockOutline)}
            >
              {props.footer}
            </div>
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
    const visibleOptionCounter = { count: -1 };
    const incrementVisibleOptions = () => visibleOptionCounter.count++;

    const showTextbox = optionSet.hasSearch || optionSet.hasOther;

    let textboxContent = null;
    if (optionSet.hasSearch)
    {
      textboxContent = (
        <SearchInput
          value={state.searches.get(index)}
          onChange={this._fn(this.handleOptionSearch, index)}
          autoFocus={state.focusedSetIndex === index || props.autoFocus}
          canEdit={true}
          onKeyDown={this.handleInputKeyDown}
          onFocus={this.handleOptionSearchFocus}
          id={index}
        />
      );
    }
    if (optionSet.hasOther)
    {
      textboxContent = (
        <FloatingInput
          value={value}
          label={'Value' /* TODO confirm copy */}
          onChange={this._fn(this.handleOtherChange, index)}
          debounce={true}
          autoFocus={(state.focusedSetIndex === index && optionSet.focusOtherByDefault) || props.autoFocus}
          isTextInput={true}
          canEdit={this.props.canEdit}
          onKeyDown={this.handleInputKeyDown}
          onFocus={this.handleOptionSearchFocus}
          id={index}
        />
      );
    }

    let getValueComponentContent = null;
    if (optionSet.getValueComponent)
    {
      getValueComponentContent = (
        <div className='routeselector-value-component'>
          {
            optionSet.getValueComponent({ value })
          }
        </div>
      );
    }
    return (
      <div
        className='routeselector-option-set'
        key={optionSet.key}
        style={getStyle('width', String(100 / state.optionSets.size + 3) + '%')}
      >
        {
          optionSet.headerText &&
          <div
            className='routeselector-header'
          >
            {
              optionSet.headerText
            }
          </div>
        }

        {
          showTextbox ?
            <div
              className='routeselector-util-row'
            >
              <div
                className='routeselector-search'
              >
                {
                  textboxContent
                }
              </div>
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

        {
          getValueComponentContent
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

          {
            optionSet.options.size > 3 &&
            [
              /*Add fodder, to help items space horizontally evenly. These will not appear*/
              <div key='1' className='routeselector-option-wrapper' />,
              <div key='2' className='routeselector-option-wrapper' />,
              <div key='3' className='routeselector-option-wrapper' />,
            ]
          }
          {
            <div
              className='routeselector-options-gradient'
            />
          }
        </div>
      </div>
    );
  }

  private handleOtherChange(optionSetIndex: number, searchValue: string)
  {
    this.handleValueChange(optionSetIndex, searchValue);
    this.setState({
      searches: this.state.searches.set(optionSetIndex, searchValue),
    });
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

    const focusedSet = this.state.optionSets.get(optionSetIndex);
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
    const { optionSets } = this.state;

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
            visibleOptionsIndex++;
          }
          realOptionIndex++;
        }
        realOptionIndex -= 1;

        this.handleOptionClick(focusedSetIndex, options.get(realOptionIndex).value);
      }

      focusedSetIndex++;
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

      if (el)
      {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    }, 100);
  }

  private divWrapper(isShowing, children)
  {
    if (!isShowing)
    {
      return null;
    }

    return (
      <div>
        {
          children
        }
      </div>
    );
  }

  private fadeInOutWrapper(isShowing, children)
  {
    return (
      <FadeInOut
        open={isShowing}
      >
        {
          children
        }
      </FadeInOut>
    );
  }

  private renderOption(optionSetIndex: number, visibleOptionCounter: { count: number }, incrementVisibleOptions: () => void,
    option: RouteSelectorOption, index: number)
  {
    const { props, state } = this;
    const optionSet = state.optionSets.get(optionSetIndex);
    const search = state.searches.get(optionSetIndex);
    const isShowing = this.shouldShowOption(option, search);
    const isSelected = props.values.get(optionSetIndex) === option.value;

    if (isShowing)
    {
      incrementVisibleOptions();
    }

    const visibleOptionsIndex = visibleOptionCounter.count;

    // We only want to render the FadeInOuts when we are searching a list
    // otherwise, render in a plain div
    // this is a performance improvement
    // const wrapperFn = this.state.focusedSetIndex === optionSetIndex
    //   ? this.fadeInOutWrapper : this.divWrapper;
    const wrapperFn = this.divWrapper;
    const focused = state.focusedOptionIndex === visibleOptionsIndex
      && optionSetIndex === state.focusedSetIndex
      && state.focusedOptionIndex !== -1
      && state.focusedSetIndex !== -1;
    const style = option.color ? fontColor(option.color) : isSelected ? OPTION_NAME_SELECTED_STYLE : OPTION_NAME_STYLE;
    return (
      <div
        className='routeselector-option-wrapper'
        key={index}
      >
        {
          wrapperFn(isShowing,
            <div
              className={classNames({
                'routeselector-option': true,
                'routeselector-option-selected': isSelected,
                'routeselector-option-focused': focused,
                // 'routeselector-option-picked': this.state.pickedIndex === index, // when it's just been picked
              })}
              onClick={this._fn(this.handleOptionClick, optionSetIndex, option.value)}
            >
              {
                (option.sampleData === undefined || optionSet.hideSampleData) &&
                <div
                  className='routeselector-option-name'
                  key={'optionz-' + String(index) + '-' + String(optionSetIndex)}
                >
                  {
                    option.icon !== undefined &&
                    <div className='routeselector-option-icon'>
                      {
                        option.icon
                      }
                    </div>
                  }
                  {
                    tooltip(
                      <div
                        className='routeselector-option-name-inner'
                        style={style}
                      >
                        {
                          option.displayName
                        }
                      </div>,
                      option.tooltip,
                    )}
                  <FadeInOut
                    open={isSelected}
                  >
                    {
                      option.component
                    }
                  </FadeInOut>
                </div>
              }
              {
                option.sampleData && !optionSet.hideSampleData &&
                <div
                  className='routeselector-data'
                  style={isSelected ? backgroundColor(Colors().active) : {}}
                >
                  <div
                    className='routeselector-data-header'
                    style={isSelected ? fontColor(Colors().fontWhite) : {}}
                  >
                    {option.displayName}
                  </div>
                  {
                    option.sampleData.slice(0, 1).map((data, i) =>
                      this.renderSampleDatum(data, i, String(option.value)),
                    )
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
            </div>,
          )
        }
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
        },
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

    const option = state.optionSets.get(optionSetIndex).options.find((opt) => opt.value === value);

    if (option && option.closeOnPick)
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
    //       left: valuBox.left,
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
    //
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
    if (this.props.canEdit)
    {
      const { props } = this;
      props.onChange(optionSetIndex, value);
    }
    // setTimeout(this.cleanUpAnimation, 150);
  }

  private getResultConfigs(options)
  {
    let resultsConfig = Map();
    options.forEach((option, i) =>
    {
      Ajax.getResultsConfig(option.value, (resp) =>
      {
        if (resp.length > 0)
        {
          resp[0]['fields'] = JSON.parse(resp[0]['fields']);
          resp[0]['formats'] = JSON.parse(resp[0]['formats']);
          resp[0]['primaryKeys'] = JSON.parse(resp[0]['primaryKeys']);
          resp[0]['enabled'] = true;
          resultsConfig = resultsConfig.set(option.value, _ResultsConfig(resp[0]));
        }
        if (i === options.size - 1)
        {
          this.setState({
            resultsConfig,
          });
        }
      });
    });
  }

  private renderSampleDatum(data: any, index: number, dataIndex: string)
  {
    const config = this.state.resultsConfig.get(dataIndex);
    return (
      <Hit
        hit={data}
        resultsConfig={config && _ResultsConfig(config) || undefined}
        index={index}
        dataIndex={dataIndex}
        primaryKey={data._id}
        onExpand={_.noop}
        allowSpotlights={false}
        onSpotlightAdded={_.noop}
        onSpotlightRemoved={_.noop}
        key={index}
        isVisible={true}
        hideNested={true}
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
    // const column: any = $('#pf-column')[0];
    return (
      <div
        className={'routeselector-veil' + (isOpen ? '-open' : '')}
        onClick={this.handleVeilClick}
      // style={column ? {
      //   height: column.offsetHeight,
      //   width: Number(column.offsetWidth) + 25,
      //   top: column.offsetTop,
      //   left: Number(column.offsetLeft) - 25,
      // } : {}}
      />
    );
  }

  private handleVeilClick()
  {
    this.close();
  }

  private handleCloseClick()
  {
    if (this.state.open)
    {
      this.close();
    }
    else
    {
      //
    }
  }

  private open()
  {
    if (!this.props.canEdit)
    {
      return;
    }
    this.setState({
      open,
    });
    if (this.props.onToggleOpen)
    {
      this.props.onToggleOpen(true);
    }
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
    if (this.props.onToggleOpen)
    {
      this.props.onToggleOpen(false);
    }
  }

  private toggle()
  {
    if (this.state.open)
    {
      this.close();
    }
    else
    {
      this.open();
    }
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

  // private attachOptionRef(setIndex, optionIndex, optionRef)
  // {
  //   let { optionRefs } = this.state;

  //   if (!optionRefs.get(setIndex))
  //   {
  //     optionRefs = optionRefs.set(setIndex, Map({}));
  //   }

  //   this.setState({
  //     columnRefs: optionRefs.setIn([setIndex, optionIndex], optionRef),
  //   });
  // }
}

const OPTION_NAME_STYLE = {
  color: Colors().fontColor2,
};

const OPTION_NAME_SELECTED_STYLE = {
  color: Colors().active,
};

export default RouteSelector;
