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

// tslint:disable:restrict-plus-operands

import * as Immutable from 'immutable';
import { List } from 'immutable';
import * as _ from 'lodash';

import BuilderMapComponent from '../../../app/builder/components/BuilderMapComponent';
import { Colors, getCardColors } from '../../../app/colors/Colors';
import { DisplayType } from '../../../blocks/displays/Display';
import { Block, TQLTranslationFn } from '../../../blocks/types/Block';
import { _card } from '../../../blocks/types/Card';
import { AutocompleteMatchType, ElasticBlockHelpers } from '../../../database/elastic/blocks/ElasticBlockHelpers';

const esMapDistanceUnits = {
  mi: 'miles',
  yd: 'yards',
  ft: 'feet',
  in: 'inches',
  km: 'kilometers',
  m: 'meters',
  cm: 'centimeters',
  mm: 'millimeters',
  nmi: 'nautical miles',
};

const esMapDistanceTypes = [
  'arc',
  'plane',
];

export const elasticDistance = _card({
  distance: 0,
  key: 'geo_distance',
  field: '',
  distanceUnit: 'mi',
  distanceType: 'arc',
  geopoint: [0, 0],
  map_text: '',

  static: {
    language: 'elastic',
    title: 'Geo Distance',
    description: 'Terrain\'s custom card for filtering results by distance to a geo_point.',
    colors: getCardColors('filter', Colors().builder.cards.structureClause),
    preview: 'Geo Distance',

    tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
    {
      const point = block['geopoint'].toJS !== undefined ? block['geopoint'].toJS() : block['geopoint'];
      return {
        distance: (block['distance']).toString() + block['distanceUnit'],
        distance_type: block['distanceType'],
        [block['field']]: {
          lat: point[0],
          lon: point[1],
        },
      };
    },

    display:
      [
        {
          displayType: DisplayType.FLEX,
          key: 'distance_flex',
          flex:
            [
              {
                displayType: DisplayType.LABEL,
                key: 'distance_label',
                label: 'Distance:',
              },
              {
                displayType: DisplayType.NUM,
                key: 'distance',
                placeholder: 'distance',
                style: {
                  maxWidth: 110,
                  minWidth: 75,
                  marginLeft: 6,
                  marginBottom: 6,
                },
              },
              {
                displayType: DisplayType.DROPDOWN,
                key: 'distanceUnit',
                options: List(_.keys(esMapDistanceUnits) as string[]),
                optionsDisplayName: Immutable.Map<any, string>(esMapDistanceUnits) as any,
                dropdownUsesRawValues: true,
                autoDisabled: true,
                centerDropdown: true,
                style: {
                  maxWidth: 125,
                  minWidth: 95,
                  marginLeft: 6,
                  marginRight: 6,
                },
              },
              {
                displayType: DisplayType.LABEL,
                key: 'distance_type_label',
                label: 'Distance Type:',
                style: {
                  minWidth: 97,
                },
              },
              {
                displayType: DisplayType.DROPDOWN,
                key: 'distanceType',
                options: List(esMapDistanceTypes),
                dropdownUsesRawValues: true,
                autoDisabled: true,
                centerDropdown: true,
                style: {
                  maxWidth: 95,
                  minWidth: 75,
                  marginLeft: 6,
                },
              },
            ],
        },
        {
          displayType: DisplayType.TEXT,
          key: 'field',
          placeholder: 'Field',
          className: 'builder-comp-list-item-margin-bottom',
          getAutoTerms: (schemaState): List<string> =>
          {
            return ElasticBlockHelpers.autocompleteMatches(schemaState, AutocompleteMatchType.Field);
          },
        },
        {
          displayType: DisplayType.MAP,
          key: 'geopoint',
          component: BuilderMapComponent,
        },
      ],
  },
});

export default elasticDistance;
