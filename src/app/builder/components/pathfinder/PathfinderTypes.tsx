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

// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable

/*
  User Friendly Builder, Codename: Pathfinder
  Planned Data Model:
  Variant / Query has a Path (datastructure name open to change)
  Path has one of each section:
  - Source: Initial setup
  - Filter: Filtering in and out
  - Full Text Search: (maybe)
  - Score: For scoring and sorting
  - More: (planned) for Aggs, Facets, other things

  Source has:
    - datasource (where data is coming from. Changes for Elastic/SQL/etc.)
       implements autocomplete generating methods, which accept a context
    - start and count (i.e. skip / take)

  Reusable data types:
    - Lines. Pieces that can be added / deleted / potentially drag and dropped
        specific Lines implement this abstract class

  Filter has:
    - collection of Filter Lines, which specify each filter condition
    - minimum number of matches ("all", 0, 1, 2...)
    - Filter Lines can also be Filters themselves

  Full Text Search has: (if included)
    - same as Filter. Potentially, the weights only show up here, not in Filter.

  Score has:
    - collection of ScoreLines, which can specify a transform or linear score

  More has:
    TBD
 */

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map, Record } = Immutable;
import { SchemaState } from 'schema/SchemaTypes';
import ElasticBlockHelpers, { AutocompleteMatchType, FieldType } from '../../../../database/elastic/blocks/ElasticBlockHelpers';
import { BaseClass, New } from '../../../Classes';
import { AdvancedDropdownOption } from 'common/components/AdvancedDropdown';

export const PathfinderSteps =
  [
    'Source',
    'Filter',
    'Score',
  ];

class PathC extends BaseClass
{
  public source: Source = _Source();
  public filterGroup: FilterGroup = _FilterGroup();
  public score: Score = _Score();
  public step: string = PathfinderSteps[0];
  public more: More = _More();
}
export type Path = PathC & IRecord<PathC>;
export const _Path = (config?: { [key: string]: any }) =>
{
  let path = New<Path>(new PathC(config || {}), config);
  path = path
    .set('source', _Source(path['source']))
    .set('score', _Score(path['score']))
    .set('filterGroup', _FilterGroup(path['filterGroup']))
    .set('more', _More(path['more']));
  return path;
};

class FilterGroupC extends BaseClass
{
  public minMatches: number | string = 'all';
  public lines: List<FilterLine> = List<FilterLine>([]);
}
export type FilterGroup = FilterGroupC & IRecord<FilterGroupC>;
export const _FilterGroup = (config?: { [key: string]: any }) =>
  New<FilterGroup>(new FilterGroupC(config), config);

class ScoreC extends BaseClass
{
  public lines: List<ScoreLine> = List<ScoreLine>([]);
}
export type Score = ScoreC & IRecord<ScoreC>;
export const _Score = (config?: { [key: string]: any }) =>
{
  let score = New<Score>(new ScoreC(config || {}), config);
  score = score
    .set('lines', List(score['lines'].map((line) => _ScoreLine(line))));
  return score;
};

class LineC extends BaseClass
{
  public weight: number = 1;
}
export type Line = LineC & IRecord<LineC>;
export const _Line = (config?: { [key: string]: any }) =>
  New<Line>(new LineC(config), config);

class ScoreLineC extends LineC
{
  public field: string = ''; // autocomplete
  public type: string = 'transform';
  public transformData: TransformData = _TransformData();
  public expanded: boolean = true;

  public sortOrder: string = 'desc'; // only used for certain types
}
export type ScoreLine = ScoreLineC & IRecord<ScoreLineC>;
export const _ScoreLine = (config?: { [key: string]: any }) =>
{
  let scoreLine = New<ScoreLine>(new ScoreLineC(config), config);
  scoreLine = scoreLine
    .set('transformData', _TransformData(scoreLine['transformData']));
  return scoreLine;
};

class TransformDataC extends BaseClass
{
  public scorePoints: List<ScorePoint> = List([]);
  public domain: List<number> = List([0, 10]);
  public dataDomain: List<number> = List([0, 10]);
  public hasCustomDomain: boolean = false;
  public mode: string = 'linear';
}

export type TransformData = TransformDataC & IRecord<TransformDataC>;
export const _TransformData = (config?: { [key: string]: any }) =>
{
  let transform = New<TransformData>(new TransformDataC(config), config);
  transform = transform
    .set('scorePoints', List(transform['scorePoints'].map((p) => _ScorePoint(p))))
    .set('domain', List(transform['domain']));
  return transform;
};

class ScorePointC extends BaseClass
{
  public value: number = 0;
  public score: number = 0;
  public id: string = '';
  public type: string = 'scorePoint';
  public static: any = {
    language: 'elastic',
    metaFields: ['id'],
    tql: '$score, $value',
  };
}

export type ScorePoint = ScorePointC & IRecord<ScorePointC>;
export const _ScorePoint = (config?: { [key: string]: any }) =>
  New<ScorePoint>(new ScorePointC(config), config);

class MoreC extends BaseClass
{
  public aggregations: List<AggregationLine> = List([]);
}

export type More = MoreC & IRecord<MoreC>;
export const _More = (config?: { [key: string]: any }) =>
{
  let more = New<More>(new MoreC(config || {}), config);
  more = more
    .set('aggregations', List(more['aggregations'].map((agg) => _AggregationLine(agg))));
  return more;
};

class AggregationLineC extends BaseClass
{
  public field: string = '';
  public name: string = '';
  // Type is the human readable version of elasticType
  // e.g. type = Full Statistics, elasticType = extended_stats
  public elasticType: string = '';
  public type: string = '';
  public advanced: any = Map<string, any>({});
  public expanded: boolean = false;
}

export type AggregationLine = AggregationLineC & IRecord<AggregationLineC>;
export const _AggregationLine = (config?: { [key: string]: any }) =>
{
  let aggregation = New<AggregationLine>(new AggregationLineC(config || {}), config);
  const advanced = {};
  _.keys(aggregation['advanced']).map((key) =>
  {
    advanced[key] = Immutable.fromJS(aggregation['advanced'][key]);
    // if (Array.isArray(aggregation['advanced'][key]))
    // {
    //   advanced[key] = List(aggregation['advanced'][key]);
    // }
    // else
    // {
    //   advanced[key] = aggregation['advanced'][key];
    // }
  });
  aggregation = aggregation
    .set('advanced', Map(advanced));
  return aggregation;
};

class FilterLineC extends LineC
{
  // Members for when it is a single line condition
  public field: string = ''; // autocomplete
  public method: string = ''; // autocomplete
  public value: string | number = 0;

  // Members for when it is a group of filter conditions
  public filterGroup: FilterGroup = null;
}
export type FilterLine = FilterLineC & IRecord<FilterLineC>;
export const _FilterLine = (config?: { [key: string]: any }) =>
  New<FilterLine>(new FilterLineC(config), config);

export const sourceCountOptions = List([
  'all',
  1,
  2,
  3,
  5,
  10,
  50,
  100,
  'other',
]);

export const sourceCountDropdownOptions = List<AdvancedDropdownOption>([
  {
    value: 'all',
    displayName: 'all',
  },
  {
    value: 1,
    displayName: 1,
  },
  {
    value: 2,
    displayName: 2,
  },
  {
    value: 3,
    displayName: 3,
  },
  {
    value: 5,
    displayName: 5,
  },
  {
    value: 10,
    displayName: 10,
  },
  {
    value: 100,
    displayName: 100,
  },
  {
    value: 1000,
    displayName: 1000,
  },
]);

class SourceC extends BaseClass
{
  public dataSource: DataSource = _ElasticDataSource();
  public count: number | string = sourceCountOptions.get(0);
  public start: number = 0;
}
export type Source = SourceC & IRecord<SourceC>;
export const _Source = (config?: { [key: string]: any }) =>
  New<Source>(new SourceC(config), config);

abstract class DataSource extends BaseClass
{
  // ... shared data source attributes go here
  public abstract getChoiceOptions:
  (context?: ChoiceContext) => List<ChoiceOption>;

  public name: string = '';
}

// This class contains shared render-time information
//  about the current overall context of Pathfinder
class PathfinderContextC extends BaseClass
{
  public source: Source = null;
  public step: string = null;
  public canEdit: boolean = null;
  public schemaState: SchemaState = null;
}
export type PathfinderContext = PathfinderContextC & IRecord<PathfinderContextC>;
export const _PathfinderContext = (config?: { [key: string]: any }) =>
  New<PathfinderContext>(new PathfinderContextC(config), config);

/* Consider splitting these things below into its own class */

// This type union shows what contexts and parameters are allowable
//  for autocompletes and dropdowns
type ChoiceContext = {
  type: 'source',
  schemaState: SchemaState,
} | {
    type: 'transformFields',
    source: Source,
    schemaState: SchemaState,
  } | {
    type: 'fields',
    source: Source,
    schemaState: SchemaState,
  } | {
    type: 'comparison',
    source: Source,
    schemaState: SchemaState,
    field: string,
  } | {
    type: 'value',
    source: Source,
    schemaState: SchemaState,
    field: string,
  };

class ElasticDataSourceC extends DataSource
{
  public indexes: List<string> = List([]);
  public types: List<string> = List([]);

  public getChoiceOptions = (context: ChoiceContext): List<ChoiceOption> =>
  {
    if (context.type === 'source')
    {
      return context.schemaState.tables.valueSeq().map((table) =>
      {
        return _ChoiceOption({
          name: context.schemaState.databases.get(table.databaseId).name + ' / ' + table.name,
          value: table,
          metaContent: null,
        });
      },
      ).toList();
    }

    if (context.type === 'transformFields')
    {
      // TODO need to actually use Source
      return ElasticBlockHelpers.autocompleteMatches(context.schemaState, AutocompleteMatchType.Transform).map(
        (value) =>
        {
          return _ChoiceOption({
            name: value,
            value,
          });
        },
      ).toList();
    }

    if (context.type === 'fields')
    {
      // TODO need to actually use Source
      return ElasticBlockHelpers.autocompleteMatches(context.schemaState, AutocompleteMatchType.Field).map(
        (value) =>
        {
          return _ChoiceOption({
            name: value,
            value,
          });
        },
      ).toList();
    }

    throw new Error('Unrecognized context for autocomplete matches: ' + JSON.stringify(context));
  }
}
export type ElasticDataSource = ElasticDataSourceC & IRecord<ElasticDataSourceC>;
export const _ElasticDataSource = (config?: { [key: string]: any }) =>
  New<ElasticDataSource>(new ElasticDataSourceC(config), config);

/**
 * Section: Classes representing parts of the view
 */

class ChoiceOptionC extends BaseClass
{
  public name: string = '';
  public metaContent: any = '';
  public value: any = null; // a value to distinguish it to the parser
}
export type ChoiceOption = ChoiceOptionC & IRecord<ChoiceOptionC>;
export const _ChoiceOption = (config?: { [key: string]: any }) =>
  New<ChoiceOption>(new ChoiceOptionC(config), config);

/*
  Aggregation Types:
*/

// The advanced sections of aggregations have lines that fall into these types
export enum ADVANCED
{
  Missing,
  Sigma,
  Percentiles,
  PercentileRanks,
  Accuracy,
  Name,
  Ranges,
  Format,
  ExtendedRange,
  MinDocCount,
  Order,
  Size,
  Error,
  Distance,
  Origin,
  Precision,
  IncludeExclude,
  Type,
}

// The data that needs to be stored for each type of advanced field
export const ADVANCED_MAPPINGS =
  {
    [ADVANCED.Missing]: { missing: 0, ignoreMissing: true },
    [ADVANCED.Sigma]: { sigma: 2 },
    [ADVANCED.Percentiles]: { percentiles: List([1, 5, 25, 50, 75, 95, 99]) },
    [ADVANCED.PercentileRanks]: { values: List([]) },
    [ADVANCED.Accuracy]: { accuracyType: 'compression', compression: 100, number_of_significant_value_digits: 3 },
    [ADVANCED.Name]: { name: '' },
    [ADVANCED.Ranges]: { rangeType: 'interval', interval: 10, ranges: List([]) },
    [ADVANCED.Format]: { format: 'MM/dd/yyyy', timezone: '' },
    [ADVANCED.ExtendedRange]: { offset: 0, min: '', max: '' },
    [ADVANCED.MinDocCount]: { min_doc_count: 0 },
    [ADVANCED.Order]: { order: 'asc' },
    [ADVANCED.Size]: { size: 10 },
    [ADVANCED.Error]: { show_term_doc_count_error: 'false' },
    [ADVANCED.Origin]: { origin: [30, 100], origin_address: '' },
    [ADVANCED.Distance]: { unit: 'meters', distance_type: 'arc' },
    [ADVANCED.Precision]: { precision: 5 },
    [ADVANCED.IncludeExclude]: { include: List([]), exclude: List([]) },
    [ADVANCED.Type]: { geoType: 'geo_distance' },
  };

interface AggregationData
{
  elasticType: string | List<string>; // Some (like facets) will have more than one elastic type
  advanced: List<ADVANCED> | Map<string, List<ADVANCED>>; // Advanced settings that will appear in the expanded section
  acceptedTypes: List<FieldType>; // The types of fields that can be aggregated on
  fieldTypesToElasticTypes?: Map<FieldType | string, List<string>>; // Maps the field type (text, number...) to elastic types
}

// Each human readable aggregation type is mapped to its elastic type (or types),
// the type of fields it can accept (numbers, text...), and the advanced fields it can accept
export const AggregationTypes = Map<string, AggregationData>({
  ['average of']:
  {
    elasticType: 'avg', advanced: List([ADVANCED.Name, ADVANCED.Missing]),
    acceptedTypes: List([FieldType.Numerical, FieldType.Date]),
  },
  minimum:
  {
    elasticType: 'min', advanced: List([ADVANCED.Name, ADVANCED.Missing]),
    acceptedTypes: List([FieldType.Numerical, FieldType.Date]),
  },
  maximum:
  {
    elasticType: 'max', advanced: List([ADVANCED.Name, ADVANCED.Missing]),
    acceptedTypes: List([FieldType.Numerical, FieldType.Date]),
  },
  ['sum of']:
  {
    elasticType: 'sum', advanced: List([ADVANCED.Name, ADVANCED.Missing]),
    acceptedTypes: List([FieldType.Numerical, FieldType.Date]),
  },
  ['number of values of']:
  {
    elasticType: 'value_count', advanced: List([ADVANCED.Name, ADVANCED.Missing]),
    acceptedTypes: List([FieldType.Any]),
  },
  ['approx. number of values of']:
  {
    elasticType: 'cardinality', advanced: List([ADVANCED.Name, ADVANCED.Missing]),
    acceptedTypes: List([FieldType.Any]),
  },
  ['geographic center of']:
  {
    elasticType: 'geo_centroid', advanced: List([ADVANCED.Name, ADVANCED.Missing]),
    acceptedTypes: List([FieldType.Geopoint]),
  },
  ['geographic bounds of']:
  {
    elasticType: 'geo_bounds', advanced: List([ADVANCED.Name, ADVANCED.Missing]),
    acceptedTypes: List([FieldType.Geopoint]),
  },
  ['percentiles of']:
  {
    elasticType: 'percentiles', advanced:
    List([ADVANCED.Name, ADVANCED.Missing, ADVANCED.Percentiles, ADVANCED.Accuracy]),
    acceptedTypes: List([FieldType.Numerical, FieldType.Date]),
  },
  ['percentiles of values of']:
  {
    elasticType: 'percentile_ranks', advanced:
    List([ADVANCED.Name, ADVANCED.Missing, ADVANCED.PercentileRanks, ADVANCED.Accuracy]),
    acceptedTypes: List([FieldType.Numerical, FieldType.Date]),
  },
  ['basic statistics for']:
  {
    elasticType: 'stats', advanced: List([ADVANCED.Name, ADVANCED.Missing]),
    acceptedTypes: List([FieldType.Numerical, FieldType.Date]),
  },
  ['full statistics for']:
  {
    elasticType: 'extended_stats', advanced: List([ADVANCED.Name, ADVANCED.Missing, ADVANCED.Sigma]),
    acceptedTypes: List([FieldType.Numerical, FieldType.Date]),
  },
  ['facets for']:
  {
    elasticType: List(['histogram', 'range', 'date_histogram', 'date_range', 'terms',
      'significant_terms', 'ip_range', 'geo_distance', 'geo_hash']), advanced:
    Map({
      histogram: List([ADVANCED.Name, ADVANCED.Missing, ADVANCED.Ranges, ADVANCED.ExtendedRange, ADVANCED.MinDocCount,
      ADVANCED.Order]),
      range: List([ADVANCED.Name, ADVANCED.Missing, ADVANCED.Ranges]),
      date_range: List([ADVANCED.Name, ADVANCED.Missing, ADVANCED.Ranges, ADVANCED.Format]),
      date_histogram: List([ADVANCED.Name, ADVANCED.Missing, ADVANCED.Ranges, ADVANCED.ExtendedRange, ADVANCED.MinDocCount,
      ADVANCED.Order, ADVANCED.Format]),
      ip_range: List([ADVANCED.Name, ADVANCED.Missing, ADVANCED.Ranges]),
      geo_distance: List([ADVANCED.Name, ADVANCED.Type, ADVANCED.Missing, ADVANCED.Ranges, ADVANCED.Origin, ADVANCED.Distance]),
      geo_hash: List([ADVANCED.Name, ADVANCED.Type, ADVANCED.Missing, ADVANCED.Size, ADVANCED.Precision]),
      terms: List([ADVANCED.Name, ADVANCED.Missing, ADVANCED.Size, ADVANCED.MinDocCount, ADVANCED.IncludeExclude,
      ADVANCED.Order])
    }),
    acceptedTypes: List([FieldType.Any]),
    fieldTypesToElasticTypes: Map({
      [FieldType.Numerical]: List(['histogram', 'range']),
      [FieldType.Date]: List(['date_histogram', 'date_range']),
      [FieldType.Geopoint]: List(['geo_distance', 'geo_hash']),
      [FieldType.Text]: List(['terms', 'significant_terms']),
      [FieldType.Ip]: List(['ip_range']),
    })
  }
});
