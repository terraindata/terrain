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

// tslint:disable:restrict-plus-operands strict-boolean-expressions

import { Query } from '../../../../items/types/Query';
import {FilterGroup, More, Path, Score, Source } from './PathfinderTypes';
// import ESConverter from '../../../../shared/database/elastic/formatter/ESConverter';
// import ESParameterFiller from '../../../../shared/database/elastic/parser/EQLParameterFiller';
// import ESInterpreter from '../../../../shared/database/elastic/parser/ESInterpreter';
// import ESJSONParser from '../../../../shared/database/elastic/parser/ESJSONParser';
// import ESValueInfo from '../../../../shared/database/elastic/parser/ESValueInfo';
// import { Input, isInput, toInputMap } from '../../../blocks/types/Input';
import { elasticTransform, scorePoint } from 'database/elastic/blocks/ElasticTransformCard';
import TransformUtil, { NUM_CURVE_POINTS } from 'app/util/TransformUtil';

export function parsePath(path: Path): string
{
  const baseQuery = {
    query: {},
    sort: {},
    from: 0,
    size: 1000,
    track_scores: true,
  }
  const sourceInfo = parseSource(path.source);
  baseQuery.from = sourceInfo.from;
  baseQuery.size = sourceInfo.size;
  baseQuery.query = {
    bool: {
      filter: [
        {
          term: {
            _index: sourceInfo.index.split('/')[1]
          }
        }
      ]
    }
  }
  console.log(JSON.stringify(baseQuery));
  const sortObj = parseScore(path.score);
  baseQuery.sort = sortObj;
  return JSON.stringify(baseQuery, null, 2);
}

function parseSource(source: Source): any
{
  return {
    from: source.start,
    size: typeof source.count !== 'string' ? source.count : 1000,
    index: (source.dataSource as any).index
  };
}

function parseScore(score: Score): any
{
  const sortObj = {
    _script: {
      type: 'number',
      order: 'desc',
      script: {
        stored: 'Terrain.Score.PWL',
        params: {
          factors: []
        }
      }
    }
  };
  const factors = score.lines.map((line) => {
    let ranges = [];
    let outputs = [];
    let data;
    const min = line.transformData.dataDomain[0];
    const max = line.transformData.dataDomain[1];
    const numPoints = 31;
    if (line.transformData['mode'] === 'normal' &&
       line.transformData['scorePoints'].size === NUM_CURVE_POINTS.normal)
    {
      data = TransformUtil.getNormalData(numPoints, line.transformData['scorePoints'].toJS(), min, max);
    }
    else if (line.transformData['mode'] === 'exponential' && line.transformData['scorePoints'].size === NUM_CURVE_POINTS.exponential)
    {
      data = TransformUtil.getExponentialData(numPoints, line.transformData['scorePoints'].toJS());
    }
    else if (line.transformData['mode'] === 'logarithmic' && line.transformData['scorePoints'].size === NUM_CURVE_POINTS.logarithmic)
    {
      data = TransformUtil.getLogarithmicData(numPoints, line.transformData['scorePoints'].toJS(), min, max);
    }
    else if (line.transformData['mode'] === 'sigmoid' && line.transformData['scorePoints'].size === NUM_CURVE_POINTS.sigmoid)
    {
      data = TransformUtil.getSigmoidData(numPoints, line.transformData['scorePoints'].toJS(), min, max);
    }
    else
    {
      ranges = line.transformData['scorePoints'].map((scorePt) => scorePt.value).toArray();
      outputs = line.transformData['scorePoints'].map((scorePt) => scorePt.score).toArray();
    }

    if (data !== undefined)
    {
      ranges = data.ranges;
      outputs = data.outputs;
    }
    return {
      a: 0,
      b: 1,
      weight: typeof line.weight === 'string' ? parseFloat(line.weight) : line.weight,
      numerators: [[line.field, 1]],
      denominators: [],
      ranges,
      outputs,
    };
  }).toArray();
    console.log(factors);
    sortObj._script.script.params.factors = factors;
    return sortObj;
}

function parseFilters(filterGroup: FilterGroup)
{
  //
}

function parseMore(more: More)
{
  //
}
