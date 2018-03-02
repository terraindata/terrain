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

// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable no-var-requires

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
import Util from 'app/util/Util';
import { _Hit, Hit } from 'builder/components/results/ResultTypes';
// import TerrainTools from 'util/TerrainTools';
import { BuilderState } from 'builder/data/BuilderState';
import { AdvancedDropdownOption } from 'common/components/AdvancedDropdown';
import { SchemaState } from 'schema/SchemaTypes';
import { FieldType, FieldTypeMapping, ReverseFieldTypeMapping } from '../../../../../shared/builder/FieldTypes';
import ElasticBlockHelpers, { AutocompleteMatchType } from '../../../../database/elastic/blocks/ElasticBlockHelpers';
import { BaseClass, New } from '../../../Classes';
import PathfinderText from './PathfinderText';

export enum PathfinderSteps
{
  Source,
  Filter, // rename
  Score, // remove
  More, // remove
}

/**
 * Section: Classes representing parts of the view
 */

class ChoiceOptionC extends BaseClass
{
  public value: any = null; // a value to distinguish it to the parser
  public displayName: string | number | El = '';
  public color: string = null;
  public tooltipContent: string | El = null;
  public sampleData: List<Hit> = List([]);
  public meta: any = null; // metadata, no specific shape, used for helper functions
}
export type ChoiceOption = ChoiceOptionC & IRecord<ChoiceOptionC>;
export const _ChoiceOption = (config?: { [key: string]: any }) =>
  New<ChoiceOption>(new ChoiceOptionC(config), config);

class PathC extends BaseClass
{
  public source: Source = _Source();
  public filterGroup: FilterGroup = _FilterGroup();
  public softFilterGroup: FilterGroup = _FilterGroup();
  public score: Score = _Score();
  public step: PathfinderSteps = PathfinderSteps.Source;
  public more: More = _More();
  public nested: List<Path> = List([]);
  public name?: string = undefined; // name of the query, this is useful for when there is a groupJoin and inner queries have names
  public minMatches?: number = 0; // also helpful for inner-queries of groupjoins
}
export type Path = PathC & IRecord<PathC>;
export const _Path = (config?: { [key: string]: any }) =>
{
  let path = New<Path>(new PathC(config || {}), config);
  path = path.set('source', _Source(path.source));
  path = path.set('filterGroup', _FilterGroup(path.filterGroup));
  path = path.set('softFilterGroup', _FilterGroup(path.softFilterGroup));
  path = path.set('score', _Score(path.score));
  path = path.set('more', _More(path.more));
  path = path.set('nested', List(path.nested.map((n) => _Path(n))));
  return path;
};

class FilterGroupC extends BaseClass
{
  public minMatches: number | string = 'all';
  public name: string = 'Group';
  public collapsed: boolean = false;
  // Only maintained on the top-level group, keeps track of what number group we are on to create names
  public groupCount: number = 1;
  public lines: List<FilterLine> = List<FilterLine>([]);
}
export type FilterGroup = FilterGroupC & IRecord<FilterGroupC>;
export const _FilterGroup = (config?: { [key: string]: any }) =>
{
  let filterGroup = New<FilterGroup>(new FilterGroupC(config), config);
  filterGroup = filterGroup.set('lines',
    List(filterGroup.lines.map((line) => _FilterLine(line))));
  return filterGroup;
};

export enum ScoreType
{
  terrain = 'terrain',
  linear = 'linear',
  elastic = 'elastic',
  random = 'random',
  none = 'none',
}

export const ScoreTypesList =
  [
    ScoreType.terrain,
    ScoreType.linear,
    ScoreType.elastic,
    ScoreType.random,
    // ScoreType.none, // disabling
  ];

export const ScoreTypesChoices = List(ScoreTypesList.map(
  (type) =>
  {
    const textConfig = PathfinderText.scoreSectionTypes[type] || {
      title: type,
      tooltip: '',
    };

    return _ChoiceOption({
      value: type,
      displayName: textConfig.title,
      tooltipContent: textConfig.tooltip,
    });
  },
));

class ScoreC extends BaseClass
{
  public lines: List<ScoreLine> = List<ScoreLine>([]);
  public type: ScoreType = ScoreType.terrain;
  public seed: number = 10; // For random scoring
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
  public weight: number = 20;
  public weightSet: boolean = false;
}
export type Line = LineC & IRecord<LineC>;
export const _Line = (config?: { [key: string]: any }) =>
  New<Line>(new LineC(config), config);

class ScoreLineC extends LineC
{
  public field: string = ''; // autocomplete
  public transformData: TransformData = _TransformData();
  public expanded: boolean = true;

  public sortOrder: 'desc' | 'asc' = 'desc'; // only used for certain types
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
  public references: List<string> = List([]); // What should this query be referred to in other queries (@parent in US query)
}

export type More = MoreC & IRecord<MoreC>;
export const _More = (config?: { [key: string]: any }) =>
{
  let more = New<More>(new MoreC(config || {}), config);
  more = more
    .set('aggregations', List(more['aggregations'].map((agg) => _AggregationLine(agg))))
    .set('references', List(more['references']));

  return more;
};

class AggregationLineC extends BaseClass
{
  public field: string = '';
  public name: string = '';
  public fieldType: FieldType = FieldType.Any;
  // Type is the human readable version of elasticType
  // e.g. type = Full Statistics, elasticType = extended_stats
  public elasticType: string = '';
  public type: string = '';
  public advanced: any = Map<string, any>({});
  public expanded: boolean = false;
  public sampler: Sample = undefined;
  public filters: FilterGroup = undefined;
  public nested: List<AggregationLine> = undefined;
  public scripts: List<Script> = undefined;
}

export type AggregationLine = AggregationLineC & IRecord<AggregationLineC>;
export const _AggregationLine = (config?: { [key: string]: any }) =>
{
  let aggregation = New<AggregationLine>(new AggregationLineC(config || {}), config);
  const advanced = {};
  _.keys(aggregation['advanced']).map((key) =>
  {
    advanced[key] = Immutable.fromJS(aggregation['advanced'][key]);
  });
  if (aggregation['sampler'] !== undefined)
  {
    aggregation = aggregation.set('sampler', _Sample(aggregation['sampler']));
  }
  if (aggregation['filters'] !== undefined)
  {
    aggregation = aggregation.set('filters', _FilterGroup(aggregation['filters']));
  }
  if (aggregation['nested'] !== undefined)
  {
    aggregation = aggregation.set('nested', List(aggregation['nested'].map((agg) => _AggregationLine(agg))));
  }
  if (aggregation['scripts'] !== undefined)
  {
    aggregation = aggregation.set('scripts', List(aggregation['scripts'].map((script) => _Script(script))));
  }
  aggregation = aggregation
    .set('advanced', Map(advanced));
  return aggregation;
};

class SampleC extends BaseClass
{
  public sampleType: string = 'global';
  public numSamples: number = 100;
  public diverseField: string = '';
}
export type Sample = SampleC & IRecord<SampleC>;
export const _Sample = (config?: { [key: string]: any }) =>
  New<Sample>(new SampleC(config), config);

class ScriptC extends BaseClass
{
  public id: string = '';
  public script: string = '';
}
export type Script = ScriptC & IRecord<ScriptC>;
export const _Script = (config?: { [key: string]: any }) =>
  New<Script>(new ScriptC(config), config);

class FilterLineC extends LineC
{
  // Members for when it is a single line condition
  public field: string = null; // autocomplete
  public fieldType: FieldType = null;
  public comparison: string = null; // autocomplete
  public value: string | number | DistanceValue = null;
  public valueType: ValueType = null;
  public boost: number = 1;

  // Members for when it is a group of filter conditions
  public filterGroup: FilterGroup = null;
}
export type FilterLine = FilterLineC & IRecord<FilterLineC>;
export const _FilterLine = (config?: { [key: string]: any }) =>
{
  let filterLine = New<FilterLine>(new FilterLineC(Util.asJS(config)), Util.asJS(config));
  if (config && config.filterGroup !== null && config.filterGroup !== undefined)
  {
    filterLine = filterLine.set('filterGroup', _FilterGroup(config.filterGroup));
  }
  if (config && config.value !== null && typeof config.value !== 'string' && typeof config.value !== 'number')
  {
    filterLine = filterLine.set('value', _DistanceValue(config.value));
  }
  return filterLine;
};

export const BoostOptions = List([
  _ChoiceOption({
    value: 0,
    displayName: 0,
  }),
  _ChoiceOption({
    value: 1,
    displayName: 1,
  }),
  _ChoiceOption({
    value: 2,
    displayName: 2,
  }),
  _ChoiceOption({
    value: 3,
    displayName: 3,
  }),
  _ChoiceOption({
    value: 5,
    displayName: 5,
  }),
  _ChoiceOption({
    value: 10,
    displayName: 10,
  }),
]);

class DistanceValueC extends BaseClass
{
  public location: [number, number] = [0, 0];
  public address: string = '';
  public distance?: number = 10;
  public units?: string = 'mi';
}

export type DistanceValue = DistanceValueC & IRecord<DistanceValueC>;
export const _DistanceValue = (config?: { [key: string]: any }) =>
  New<DistanceValue>(new DistanceValueC(config), config);

export type ValueType = 'number' | 'text' | 'date' | 'input' | 'location';

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
{
  let source = New<Source>(new SourceC(config), config);
  source = source.set('dataSource', _ElasticDataSource(source.dataSource));
  return source;
};

abstract class DataSource extends BaseClass
{
  // ... shared data source attributes go here

  // Given some context,
  public abstract getChoiceOptions:
    (context?: ChoiceContext) => List<ChoiceOption>;

  public abstract dataTypeToFieldType:
    (dataType: string) => FieldType;

  public name: string = '';
}

// This class contains shared render-time information
//  about the current overall context of Pathfinder
class PathfinderContextC extends BaseClass
{
  public source: Source = null;
  public step: PathfinderSteps = null;
  public canEdit: boolean = null;
  public schemaState: SchemaState = null;
  public builderState: BuilderState = null;
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
  builderState: BuilderState,
} | {
    type: 'fields',
    source: Source,
    schemaState: SchemaState,
    builderState: BuilderState,
    subtype?: 'transform' | 'match',
  } | {
    type: 'comparison',
    source: Source,
    schemaState: SchemaState,
    builderState: BuilderState,
    field: string,
    fieldType?: FieldType,
  } | {
    type: 'valueType',
    source: Source,
    schemaState: SchemaState,
    builderState: BuilderState,
    field: string,
    comparison: string,
  } | {
    type: 'input',
    builderState: BuilderState,
    // TODO builder state
  };

class ElasticDataSourceC extends DataSource
{
  public index: string = '';

  // TODO remove
  public types: List<string> = List([]);

  public getChoiceOptions = (context: ChoiceContext): List<ChoiceOption> =>
  {
    // TODO this function needs to be refactored
    const server = context.builderState.db.name;

    if (context.type === 'source')
    {
      // we need to make it clear what parts of Source are tracked
      const sources = context.schemaState.databases.toList().filter(
        (db) => db.serverId === server,
      ).map(
        (db) =>
        {
          return _ChoiceOption({
            displayName: db.name,
            value: db.id,
          });
        },
      ).toList();
      // Get examples for each data source by looking at the example results of their types
      const sourceExamples = {};
      sources.forEach((source) =>
      {
        const databaseId = source.value; // String(source.value.serverId) + '/' + String(source.value.name);
        const types = context.schemaState.tables.toList().filter((table) =>
          table.databaseId === databaseId,
        );
        types.forEach((type) =>
        {
          if (sourceExamples[databaseId])
          {
            sourceExamples[databaseId] = sourceExamples[databaseId].concat(type.sampleData);
          }
          else
          {
            sourceExamples[databaseId] = type.sampleData;
          }
        });
      });
      return sources.map((source) =>
      {
        const databaseId = source.value; // String(source.value.serverId) + '/' + String(source.value.name);

        const sampleData = sourceExamples[databaseId];

        return _ChoiceOption({
          displayName: source.displayName,
          value: source.value,
          sampleData: List(sampleData),
        });
      }).toList();
    }

    if (context.type === 'fields')
    {
      if (context.subtype === 'transform' || context.subtype === 'match')
      {
        let defaultOptions: List<ChoiceOption>;
        let acceptableFieldTypes: string[];

        if (context.subtype === 'transform')
        {
          // TODO when reorganizing, move these to some better, constant space
          defaultOptions = List([
            _ChoiceOption({
              displayName: '_score',
              value: '_score',
              sampleData: List([]),
              meta: {
                fieldType: FieldType.Numerical,
              }
            }),
            _ChoiceOption({
              displayName: '_size',
              value: '_size',
              sampleData: List([]),
              meta: {
                fieldType: FieldType.Numerical,
              }
            }),
          ]);
          acceptableFieldTypes =
            [ // TODO shouldn't these be FieldTypes?
              'long',
              'double',
              'short',
              'byte',
              'integer',
              'half_float',
              'float',
            ];
        }
        else if (context.subtype === 'match')
        {
          defaultOptions = List();
          acceptableFieldTypes = ['text'];
        }

        const { dataSource } = context.source;
        const { index, types } = dataSource as any;

        if (!index)
        {
          return defaultOptions;
        }

        const acceptableCols = context.schemaState.columns.filter(
          (column) => column.serverId === String(server) &&
            column.databaseId === String(index) &&
            acceptableFieldTypes.indexOf(column.datatype) !== -1,
        );

        let acceptableOptions: List<ChoiceOption> = acceptableCols.map((col) =>
        {
          return _ChoiceOption({
            displayName: col.name,
            value: col.name,
            sampleData: col.sampleData,
          });
        }).toList();

        let fieldNames = acceptableOptions.map((f) => f.value).toList();
        fieldNames = Util.orderFields(fieldNames, context.schemaState, -1, index);
        acceptableOptions = acceptableOptions.sort((a, b) => fieldNames.indexOf(a.value) - fieldNames.indexOf(b.value)).toList();

        return acceptableOptions.concat(defaultOptions).toList();
      }

      // Else, regular fields, include everything

      const metaFields = ['_index', '_type', '_uid', '_id',
        '_source', '_size',
        '_all', '_field_names',
        '_parent', '_routing',
        '_meta', '_score'];
      const defaultOptions = List(metaFields.map((option) =>
      {
        return _ChoiceOption({
          displayName: option,
          value: option,
          sampleData: List([]),
          meta: {
            fieldType: ['_score', '_size'].indexOf(option) !== -1 ? FieldType.Numerical : FieldType.Text,
          },
          icon: fieldTypeToIcon[FieldType.Any], // TODO
        });
      }));
      const { dataSource } = context.source;
      const { index } = dataSource as any;
      if (index)
      {
        const cols = context.schemaState.columns.filter(
          (column) => column.serverId === String(server) &&
            column.databaseId === String(index));
        let fields = List([]);
        cols.forEach((col) =>
        {
          const fieldType = ReverseFieldTypeMapping[col.datatype];
          // If a column is nested, pull out the properties of that column to be filtered on
          if (fieldType === FieldType.Nested)
          {
            _.keys(col.properties).forEach((property) =>
            {
              const { type } = col.properties[property];
              fields = fields.push(
                _ChoiceOption({
                  displayName: col.name + '.' + property,
                  value: col.name + '.' + property,
                  sampleData: List([]),
                  icon: fieldTypeToIcon[type],
                  meta: {
                    fieldType: ReverseFieldTypeMapping[type],
                  },
                }),
              );
            });
          }
          fields = fields.push(_ChoiceOption({
            displayName: col.name,
            value: col.name,
            sampleData: col.sampleData,
            icon: fieldTypeToIcon[fieldType],
            meta: {
              fieldType,
            },
          }));
        });
        // Sort fields (Sort their names, then use that to sort the choice options)
        let fieldNames = fields.map((f) => f.value).toList();
        fieldNames = Util.orderFields(fieldNames, context.schemaState, -1, index);
        fields = fields.sort((a, b) => fieldNames.indexOf(a.value) - fieldNames.indexOf(b.value)).toList();
        return fields.concat(defaultOptions).toList();
      }
      return defaultOptions;
    }

    if (context.type === 'comparison')
    {
      const { field, fieldType, schemaState, source } = context;
      let options = ElasticComparisons;
      if (fieldType !== null && fieldType !== undefined)
      {
        options = options.filter((opt) => opt.fieldTypes.indexOf(fieldType) !== -1);
      }

      return List(options.map((c) => _ChoiceOption(c)));
    }
    if (context.type === 'input')
    {
      // TODO use current builder state
      const inputs = context.builderState.query.inputs;
      return inputs.map((input) =>
        _ChoiceOption({
          displayName: '@' + String(input.key),
          value: '@' + String(input.key),
        }),
      ).toList();
    }

    throw new Error('Unrecognized context for autocomplete matches: ' + JSON.stringify(context));
  }

  public dataTypeToFieldType = (dataType: string) =>
  {
    return +_.findKey(FieldTypeMapping, (dataTypes) => dataTypes.indexOf(dataType) !== -1);
  }
}
export type ElasticDataSource = ElasticDataSourceC & IRecord<ElasticDataSourceC>;
export const _ElasticDataSource = (config?: { [key: string]: any }) =>
{
  let elasticSource = New<ElasticDataSource>(new ElasticDataSourceC(config), config);
  elasticSource = elasticSource.set('types', List(elasticSource['types']));
  return elasticSource;
};
≈
const ElasticComparisons = [
  {
    value: 'exists',
    displayName: 'exists',
    fieldTypes: List(
      [FieldType.Numerical,
      FieldType.Text,
      FieldType.Date,
      FieldType.Geopoint,
      FieldType.Ip,
      FieldType.Nested,
      ]),
  },
  {
    value: 'equal',
    displayName: '=', // TerrainTools.isFeatureEnabled(TerrainTools.OPERATORS) ? 'equals' : '=',
    fieldTypes: List([FieldType.Numerical, FieldType.Text]),
  },
  {
    value: 'contains',
    displayName: 'contains',
    fieldTypes: List([FieldType.Text]),
  },
  {
    value: 'notequal',
    displayName: '≠', // TerrainTools.isFeatureEnabled(TerrainTools.OPERATORS) ? 'does not equal' : '≠',
    fieldTypes: List([FieldType.Text, FieldType.Numerical]),
  },
  {
    value: 'isin',
    displayName: 'is in',
    fieldTypes: List([FieldType.Text, FieldType.Numerical, FieldType.Date]),
  },
  {
    value: 'isnotin',
    displayName: 'is not in',
    fieldTypes: List([FieldType.Text, FieldType.Numerical, FieldType.Date]),
  },
  {
    value: 'notcontain',
    displayName: 'does not contain',
    fieldTypes: List([FieldType.Text]),
  },
  {
    value: 'greater',
    displayName: '>', // TerrainTools.isFeatureEnabled(TerrainTools.OPERATORS) ? 'is greater than' : '>',
    fieldTypes: List([FieldType.Numerical]),
  },
  {
    value: 'less',
    displayName: '<', // TerrainTools.isFeatureEnabled(TerrainTools.OPERATORS) ? 'is less than' : '<',
    fieldTypes: List([FieldType.Numerical]),
  },
  {
    value: 'greaterequal',
    displayName: '≥', // TerrainTools.isFeatureEnabled(TerrainTools.OPERATORS) ? 'is greater than or equal to' : '≥',
    fieldTypes: List([FieldType.Numerical]),
  },
  {
    value: 'lessequal',
    displayName: '≤', // TerrainTools.isFeatureEnabled(TerrainTools.OPERATORS) ? 'is less than or equal to' : '≤',
    fieldTypes: List([FieldType.Numerical]),
  },
  {
    value: 'alphabefore',
    displayName: 'comes before',
    fieldTypes: List([FieldType.Text]),
  },
  {
    value: 'alphaafter',
    displayName: 'comes after',
    fieldTypes: List([FieldType.Text]),
  },
  {
    value: 'datebefore',
    displayName: 'starts before',
    fieldTypes: List([FieldType.Date]),
  },
  {
    value: 'dateafter',
    displayName: 'starts after',
    fieldTypes: List([FieldType.Date]),
  },
  {
    value: 'located',
    displayName: 'is located within',
    fieldTypes: List([FieldType.Geopoint]),
  },
];

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
  TermsType,
}

// The data that needs to be stored for each type of advanced field
export const ADVANCED_MAPPINGS =
  {
    [ADVANCED.Missing]: {},
    [ADVANCED.Sigma]: { sigma: 2 },
    [ADVANCED.Percentiles]: { percents: List([1, 5, 25, 50, 75, 95, 99]) },
    [ADVANCED.PercentileRanks]: { values: List([]) },
    [ADVANCED.Accuracy]: { accuracyType: 'compression', compression: 100, number_of_significant_value_digits: 3 },
    [ADVANCED.Name]: { name: '' },
    [ADVANCED.Ranges]: { rangeType: 'interval', interval: 10, ranges: List([]) },
    [ADVANCED.Format]: { format: 'MM/dd/yyyy', timezone: '' },
    [ADVANCED.ExtendedRange]: { offset: 0, min: '', max: '' },
    [ADVANCED.MinDocCount]: { min_doc_count: 0 },
    [ADVANCED.Order]: { order: 'desc', sortField: '' },
    [ADVANCED.Size]: { size: 10 },
    [ADVANCED.Error]: { show_term_doc_count_error: 'false' },
    [ADVANCED.Origin]: { origin: [30, 100], origin_address: '' },
    [ADVANCED.Distance]: { unit: 'meters', distance_type: 'arc' },
    [ADVANCED.Precision]: { precision: 5 },
    [ADVANCED.IncludeExclude]: { include: List([]), exclude: List([]) },
    [ADVANCED.Type]: { geoType: 'geo_distance' },
    [ADVANCED.TermsType]: { termsType: 'terms' },
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
          terms: List([ADVANCED.Name, ADVANCED.Missing, ADVANCED.TermsType, ADVANCED.Size, ADVANCED.MinDocCount, ADVANCED.IncludeExclude,
          ADVANCED.Order]),
          significant_terms: List([ADVANCED.Name, ADVANCED.Missing, ADVANCED.TermsType,
          ADVANCED.Size, ADVANCED.MinDocCount, ADVANCED.IncludeExclude,
          ADVANCED.Order]),
        }),
      acceptedTypes: List([FieldType.Any]),
      fieldTypesToElasticTypes: Map({
        [FieldType.Numerical]: List(['histogram', 'range']),
        [FieldType.Date]: List(['date_histogram', 'date_range']),
        [FieldType.Geopoint]: List(['geo_distance', 'geo_hash']),
        [FieldType.Text]: List(['terms', 'significant_terms']),
        [FieldType.Ip]: List(['ip_range']),
      }),
    },
});

const TextIcon = require('./../../../../images/icon_textDropdown.svg');
const DateIcon = require('./../../../../images/icon_dateDropdown.svg');
const NumberIcon = require('./../../../../images/icon_numberDropdown.svg');
// TODO need more icons

const fieldTypeToIcon =
  {
    [FieldType.Any]: TextIcon, // TODO
    [FieldType.Date]: DateIcon,
    [FieldType.Geopoint]: TextIcon, // TODO
    [FieldType.Ip]: TextIcon,
    [FieldType.Numerical]: NumberIcon,
    [FieldType.Text]: TextIcon,
  };
