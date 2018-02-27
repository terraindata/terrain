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

import { List, Map } from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import TerrainComponent from './../../common/components/TerrainComponent';
import { RouteSelector, RouteSelectorOption as _RouteSelectorOption, RouteSelectorOptionSet } from './RouteSelector';

export type RouteSelectorOption = _RouteSelectorOption;

export interface Props
{
  options: List<RouteSelectorOption>;
  value: any;
  onChange: (value: any) => void;
  canEdit?: boolean;

  shortNameText: string;
  headerText: string;

  forceOpen?: boolean;
  defaultOpen?: boolean;
  hasOther?: boolean;
  large?: boolean;
  noShadow?: boolean;
  focusOtherByDefault?: boolean;
  hasSearch?: boolean;
  hideSampleData?: boolean;
  column?: boolean;
}

export class SingleRouteSelector extends TerrainComponent<Props>
{
  state = {
    values: List([this.props.value]),
    optionSets: this.getOptionSets(this.props),
  };
  public optionSetKeys = [
    'options',
    'hasOther',
    'focusOtherByDefault',
    'shortNameText',
    'headerText',
    'hasSearch',
    'column',
    'hideSampleData',
  ];

  // keys that play a factor in the option set
  public optionSetKeys = [
    'options',
    'hasOther',
    'focusOtherByDefault',
    'shortNameText',
    'headerText',
    'hasSearch',
    'column',
    'hideSampleData',
  ];

  componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.value !== this.props.value)
    {
      this.setState({
        values: List([nextProps.value]),
      });
    }

    if (this.optionSetKeys.findIndex((key) => nextProps[key] !== this.props[key]) !== -1)
    {
      // an option set property changed; re-memoize
      this.setState({
        optionSets: this.getOptionSets(nextProps),
      });
    }
  }

  public getOptionSets(props: Props): List<RouteSelectorOptionSet>
  {
    return List([{
      key: 'v', // unused
      options: props.options,
      hasOther: props.hasOther,
      focusOtherByDefault: props.focusOtherByDefault,
      shortNameText: props.shortNameText,
      headerText: props.headerText,
      hasSearch: props.hasSearch,
      column: props.column,
      hideSampleData: props.hideSampleData,
    }]);
  }

  public render()
  {
    const { props, state } = this;

    return (
      <RouteSelector
        optionSets={state.optionSets}
        values={state.values}
        onChange={this.handleChange}
        canEdit={props.canEdit}

        forceOpen={props.forceOpen}
        defaultOpen={props.defaultOpen}
        large={props.large}
        noShadow={props.noShadow}
      />
    );
  }

  private handleChange(key, value)
  {
    this.props.onChange(value);
  }
}

export default SingleRouteSelector;
