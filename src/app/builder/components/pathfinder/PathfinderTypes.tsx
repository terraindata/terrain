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

import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import { BaseClass, New } from '../../../Classes';

class PathC extends BaseClass
{
  source: Source;
  filter: Filter;
  score: Score;
}
export type Path = PathC & IRecord<PathC>;
export const _Path = (config?: {[key:string]: any}) => 
  New<Path>(new PathC(config), config);

class SourceC extends BaseClass
{
  dataSource: DataSource = _ElasticDataSource();
  count: number | string = 'all';
  start: number = 0;
}
export type Source = SourceC & IRecord<SourceC>;
export const _Source = (config?: {[key:string]: any}) => 
  New<Source>(new SourceC(config), config);

abstract class DataSource extends BaseClass
{
  // ... shared data source attributes go here
  abstract getFieldAutocompleteOptions: 
    (context?: AutocompleteContext) => List<AutocompleteOption>;
}

type AutocompleteContext = any;

class ElasticDataSourceC extends DataSource
{
  indexes: List<string> = List([]);
  types: List<string> = List([]);
  
  getFieldAutocompleteOptions = (context?: any) =>
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
export const _ElasticDataSource = (config?: {[key:string]: any}) => 
  New<ElasticDataSource>(new ElasticDataSourceC(config), config);



/**
 * Section: Classes representing parts of the view
 */

class AutocompleteOptionC extends BaseClass
{
  name: string = '';
  metaContent: any = '';
}
export type AutocompleteOption = AutocompleteOptionC & IRecord<AutocompleteOptionC>;
export const _AutocompleteOption = (config?: {[key:string]: any}) => 
  New<AutocompleteOption>(new AutocompleteOptionC(config), config);
