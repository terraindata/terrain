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
import BuilderTextbox from 'app/common/components/BuilderTextbox';
import Dropdown from 'app/common/components/Dropdown';
import { List, Map } from 'immutable';
import * as React from 'react';
import BuilderActions from '../../../data/BuilderActions';
import PathfinderText from '../PathfinderText';
import { ADVANCED } from '../PathfinderTypes';

export interface AdvancedAggregationDisplay
{
  title: string;
  items: AdvancedAggregationItem | AdvancedAggregationItem[];
  // Display items on the same line
  inline: boolean;
  // This is for groups of items where only one can be active at a time
  // e.g. for percentiles, there are two ways of setting accuracy (compression and number of sig figs)
  // but only one can be used
  onlyOne?: boolean;
  radioKey?: string; // Keeps track of which radio item is selected
}

export interface AdvancedAggregationItem
{
  text?: string;
  inputType?: 'single' | 'multi' | 'range' | 'dropdown' | 'map';
  tooltipText?: string;
  component?: (...args) => El; // Some advanced items need to be custom built
  key: string;
  placeholder?: string;
  options?: List<string>;
  optionDisplayNames?: Map<string, any>;
  isNumber?: boolean;
  fieldOptions?: boolean; // Use the fields as options
  textOptions?: List<string>; // Options to use if the field is a text (could change how this is set up)
}

export const AdvancedDisplays = Map<ADVANCED | string, AdvancedAggregationDisplay>({
  [ADVANCED.Sigma]: {
    title: PathfinderText.aggregation.sigma.title,
    onlyOne: false,
    items: {
      text: PathfinderText.aggregation.sigma.text,
      inputType: 'single',
      tooltipText: PathfinderText.aggregation.sigma.tooltipText,
      key: 'sigma',
    },
  },
  [ADVANCED.Accuracy]: {
    title: PathfinderText.aggregation.accuracy.title,
    onlyOne: true,
    radioKey: 'accuracyType',
    items: [
      {
        text: PathfinderText.aggregation.accuracy.text1,
        inputType: 'single',
        tooltipText: PathfinderText.aggregation.accuracy.tooltipText1,
        key: 'compression',
      },
      {
        text: PathfinderText.aggregation.accuracy.text2,
        inputType: 'single',
        tooltipText: PathfinderText.aggregation.accuracy.tooltipText2,
        key: 'number_of_significant_value_digits',
      },
    ],
  },
  [ADVANCED.Percentiles]: {
    title: PathfinderText.aggregation.percentile.title,
    onlyOne: false,
    items: {
      text: PathfinderText.aggregation.percentile.text,
      inputType: 'multi',
      tooltipText: PathfinderText.aggregation.percentile.tooltipText,
      key: 'percents',
      isNumber: true,
    },
  },
  [ADVANCED.PercentileRanks]: {
    title: PathfinderText.aggregation.percentileRanks.title,
    onlyOne: false,
    items: {
      text: PathfinderText.aggregation.percentileRanks.text,
      inputType: 'multi',
      tooltipText: PathfinderText.aggregation.percentileRanks.tooltipText,
      key: 'values',
      isNumber: true,
    },
  },
  [ADVANCED.Name]: {
    title: 'Name',
    onlyOne: false,
    items: {
      text: '',
      inputType: 'single',
      tooltipText: '',
      key: 'name',
      placeholder: 'Name',
    },
  },
  [ADVANCED.Size]: {
    title: PathfinderText.aggregation.size.title,
    onlyOne: false,
    items:
      {
        text: PathfinderText.aggregation.size.text,
        inputType: 'single',
        tooltipText: PathfinderText.aggregation.size.tooltipText,
        key: 'size',
      },
  },
  [ADVANCED.Ranges]: {
    title: PathfinderText.aggregation.ranges.title,
    onlyOne: true,
    radioKey: 'rangeType',
    items: [
      {
        text: PathfinderText.aggregation.ranges.text1,
        inputType: 'single',
        tooltipText: PathfinderText.aggregation.ranges.tooltipText1,
        key: 'interval',
      },
      {
        text: PathfinderText.aggregation.ranges.text2,
        inputType: 'range',
        tooltipText: PathfinderText.aggregation.ranges.tooltipText2,
        key: 'ranges',
      },
    ],
  },
  [ADVANCED.ExtendedRange]:
    {
      title: PathfinderText.aggregation.extendedRange.title,
      onlyOne: false,
      items: [
        {
          text: PathfinderText.aggregation.extendedRange.text1,
          inputType: 'single',
          tooltipText: PathfinderText.aggregation.extendedRange.tooltipText1,
          key: 'offset',
        },
        {
          text: PathfinderText.aggregation.extendedRange.text2,
          inputType: 'single',
          key: 'min',
          tooltipText: PathfinderText.aggregation.extendedRange.tooltipText2,
        },
        {
          text: PathfinderText.aggregation.extendedRange.text3,
          inputType: 'single',
          key: 'max',
          tooltipText: PathfinderText.aggregation.extendedRange.tooltipText3,
        },
      ],
    },
  [ADVANCED.MinDocCount]:
    {
      title: PathfinderText.aggregation.minDocCount.title,
      onlyOne: false,
      items: {
        text: PathfinderText.aggregation.minDocCount.text,
        inputType: 'single',
        key: 'min_doc_count',
        tooltipText: PathfinderText.aggregation.minDocCount.tooltipText,
      },
    },
  [ADVANCED.Order]:
    {
      title: PathfinderText.aggregation.order.title,
      onlyOne: false,
      inline: true,
      items: [
        {
          text: PathfinderText.aggregation.order.text1,
          options: List(['_key', '_count']),
          textOptions: List(['_term', '_count']),
          key: 'sortField',
          inputType: 'dropdown',
          tooltipText: PathfinderText.aggregation.order.tooltipText,
        },
        {
          text: PathfinderText.aggregation.order.text2,
          options: List(['asc', 'desc']),
          optionDisplayNames: Map({ asc: 'ascending', desc: 'descending' }),
          inputType: 'dropdown',
          key: 'order',
        },
        {
          text: PathfinderText.aggregation.order.text3,
          inputType: '',
          key: '',
        },
      ],
    },
  [ADVANCED.Format]:
    {
      title: PathfinderText.aggregation.format.title,
      onlyOne: false,
      items: [
        {
          text: PathfinderText.aggregation.format.text1,
          inputType: 'single',
          key: 'format',
          tooltipText: PathfinderText.aggregation.format.tooltipText1,
        },
        {
          text: PathfinderText.aggregation.format.text2,
          inputType: 'single',
          key: 'timezone',
          tooltipText: PathfinderText.aggregation.format.tooltipText2,
        }],
    },
  [ADVANCED.Error]:
    {
      title: PathfinderText.aggregation.error.title,
      onlyOne: false,
      items: {
        text: PathfinderText.aggregation.error.text,
        inputType: 'dropdown',
        key: 'show_term_doc_count_error',
        options: List(['true', 'false']),
        tooltipText: PathfinderText.aggregation.error.tooltipText,
      },
    },
  [ADVANCED.Distance]:
    {
      title: PathfinderText.aggregation.distance.title,
      onlyOne: false,
      items: [
        {
          text: PathfinderText.aggregation.distance.text1,
          inputType: 'dropdown',
          key: 'unit',
          options: List(['miles', 'yards', 'feet', 'inches', 'kilometers',
            'meters', 'centimeters', 'millimeters', 'nautical miles']),
          tooltipText: PathfinderText.aggregation.distance.tooltipText1,
        },
        {
          text: PathfinderText.aggregation.distance.text2,
          inputType: 'dropdown',
          key: 'distance_type',
          options: List(['arc', 'plane']),
          tooltipText: PathfinderText.aggregation.distance.tooltipText2,
        },
      ],
    },
  [ADVANCED.Origin]:
    {
      title: PathfinderText.aggregation.origin.title,
      onlyOne: false,
      items: {
        text: PathfinderText.aggregation.origin.text,
        inputType: 'map',
        key: 'origin',
        textKey: 'origin_address',
        tooltipText: PathfinderText.aggregation.origin.tooltipText,
      },
    },
  [ADVANCED.Precision]:
    {
      title: PathfinderText.aggregation.precision.title,
      onlyOne: false,
      items: {
        text: PathfinderText.aggregation.precision.text,
        inputType: 'single',
        key: 'precision',
        tooltipText: PathfinderText.aggregation.precision.tooltipText,
      },
    },
  [ADVANCED.IncludeExclude]:
    {
      title: PathfinderText.aggregation.includeExclude.title,
      onlyOne: false,
      items: [
        {
          text: PathfinderText.aggregation.includeExclude.text1,
          inputType: 'multi',
          key: 'include',
          isNumber: false,
          tooltipText: PathfinderText.aggregation.includeExclude.tooltipText1,
        },
        {
          text: PathfinderText.aggregation.includeExclude.text2,
          inputType: 'multi',
          key: 'exclude',
          isNumber: false,
          tooltipText: PathfinderText.aggregation.includeExclude.tooltipText2,
        },
      ],
    },
  [ADVANCED.Type]:
    {
      title: PathfinderText.aggregation.type.title,
      onlyOne: true,
      radioKey: 'geoType',
      items: [
        {
          text: PathfinderText.aggregation.type.text1,
          inputType: '',
          key: 'geo_distance',
          tooltipText: PathfinderText.aggregation.type.tooltipText1,
        },
        {
          text: PathfinderText.aggregation.type.text2,
          inputType: '',
          key: 'geo_hash',
          tooltipText: PathfinderText.aggregation.type.tooltipText2,
        }],
    },
  [ADVANCED.TermsType]:
    {
      title: PathfinderText.aggregation.termsType.title,
      onlyOne: true,
      radioKey: 'termsType',
      items: [
        {
          text: PathfinderText.aggregation.termsType.text1,
          inputType: '',
          key: 'terms',
          tooltipText: PathfinderText.aggregation.termsType.tooltipText1,
        },
        {
          text: PathfinderText.aggregation.termsType.text2,
          inputType: '',
          key: 'significant_terms',
          tooltipText: PathfinderText.aggregation.termsType.tooltipText2,
        }],
    },
  [ADVANCED.Missing]: {
    title: PathfinderText.aggregation.missing.title,
    onlyOne: false,
    items: {
      component: (props: any, item: AdvancedAggregationItem, onChange: (index: number) => void) =>
      {
        const { fieldName, keyPath, canEdit, advancedData } = props;
        const { key } = item;
        const replace = advancedData.get(key) !== undefined;
        const value = advancedData.get(key);
        return (
          <div className='pf-aggregation-missing'>
            <span>{PathfinderText.aggregation.missing.text} {fieldName}, </span>
            <Dropdown
              options={List(['ignore it', 'replace it'])}
              selectedIndex={replace ? 1 : 0}
              onChange={onChange}
              canEdit={canEdit}
            />
            {
              replace ? <span>with</span> : null
            }
            {
              replace ?
                <BuilderTextbox
                  value={value}
                  keyPath={this._ikeyPath(keyPath, key)}
                  canEdit={canEdit}
                  action={BuilderActions.changePath}
                />
                : null
            }
          </div>
        );
      },
      key: 'missing',
    },
  },
});
