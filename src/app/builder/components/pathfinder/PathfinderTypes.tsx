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
const { List, Map } = Immutable;
import { BaseClass, New } from '../../../Classes';

export const PathfinderSteps =
  [
    'Source',
    'Filter',
    'Score',
  ];

class PathC extends BaseClass
{
  public source: Source = _Source();
  public filter: Filter = _Filter();
  public score: Score = _Score();
  public step: string = PathfinderSteps[0];
}
export type Path = PathC & IRecord<PathC>;
export const _Path = (config?: { [key: string]: any }) =>
{
  let path = New<Path>(new PathC(config || {}), config);
  path = path
    .set('source', _Source(path['source']))
    .set('score', _Score(path['score']))
    .set('filter', _Filter(path['filter']));
  return path;
};

class FilterC extends BaseClass
{
  public minMatches: number | string = 'all';
  public lines: List<FilterLine> = List<FilterLine>([]);
}
export type Filter = FilterC & IRecord<FilterC>;
export const _Filter = (config?: { [key: string]: any }) =>
  New<Filter>(new FilterC(config), config);

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
  public transformData: any = {}; // TODO

  public sortOrder: string = 'desc'; // only used for certain types
}
export type ScoreLine = ScoreLineC & IRecord<ScoreLineC>;
export const _ScoreLine = (config?: { [key: string]: any }) =>
  New<ScoreLine>(new ScoreLineC(config), config);

class FilterLineC extends LineC
{
  // Members for when it is a single line condition
  public field: string = ''; // autocomplete
  public method: string = ''; // autocomplete
  public value: string | number = 0;

  // Members for when it is a group of filter conditions
  public filter: Filter = null;
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

class SourceC extends BaseClass
{
  public dataSource: DataSource = _ElasticDataSource();
  public count: number | string = sourceCountOptions.get(0);
  public countIndex: number = 0;
  public start: number = 0;
}
export type Source = SourceC & IRecord<SourceC>;
export const _Source = (config?: { [key: string]: any }) =>
  New<Source>(new SourceC(config), config);

abstract class DataSource extends BaseClass
{
  // ... shared data source attributes go here
  public abstract getFieldAutocompleteOptions:
  (context?: AutocompleteContext) => List<AutocompleteOption>;

  public name: string = '';
}

/* Consider splitting this into its own class */

type AutocompleteContext = any;

class ElasticDataSourceC extends DataSource
{
  public indexes: List<string> = List([]);
  public types: List<string> = List([]);

  public getFieldAutocompleteOptions = (context?: any) =>
  {
    return List([
      _AutocompleteOption({
        name: 'Inventory',
      }),
      _AutocompleteOption({
        name: 'Reviews',
      }),
      _AutocompleteOption({
        name: 'Title',
      }),
      _AutocompleteOption({
        name: 'Description',
      }),
    ]);
  }
}
export type ElasticDataSource = ElasticDataSourceC & IRecord<ElasticDataSourceC>;
export const _ElasticDataSource = (config?: { [key: string]: any }) =>
  New<ElasticDataSource>(new ElasticDataSourceC(config), config);

/**
 * Section: Classes representing parts of the view
 */

class AutocompleteOptionC extends BaseClass
{
  public name: string = '';
  public metaContent: any = '';
}
export type AutocompleteOption = AutocompleteOptionC & IRecord<AutocompleteOptionC>;
export const _AutocompleteOption = (config?: { [key: string]: any }) =>
  New<AutocompleteOption>(new AutocompleteOptionC(config), config);
