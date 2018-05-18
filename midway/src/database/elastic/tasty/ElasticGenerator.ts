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

// Copyright 2018 Terrain Data, Inc.

import bodybuilder = require('bodybuilder');
import * as Elastic from 'elasticsearch';
import TastyNode from '../../../tasty/TastyNode';
import TastyNodeTypes from '../../../tasty/TastyNodeTypes';
import TastyQuery from '../../../tasty/TastyQuery';
import ElasticQuery from './ElasticQuery';

/**
 * Generates elastic queries from TastyQuery objects.
 * Don't use this class directly: use ElasticGenerator instead.
 */
export class ElasticGenerator
{
  public esQuery: ElasticQuery;

  constructor(query: TastyQuery)
  {
    this.esQuery = {} as ElasticQuery;
    this.esQuery.index = query.table.getDatabaseName();
    this.esQuery.table = query.table.getTableName();
    this.esQuery.primaryKeys = query.table.getPrimaryKeys();
    this.esQuery.fields = query.table.getColumnNames();
    switch (query.command.tastyType)
    {
      case (TastyNodeTypes.select):
        this.esQuery.op = 'select';
        this.esQuery.params = this.constructSelectQuery(query);
        break;
      case (TastyNodeTypes.upsert):
        this.esQuery.op = 'upsert';
        this.esQuery.params = this.constructUpsertQuery(query);
        break;
      case (TastyNodeTypes.delete):
        this.esQuery.op = 'delete';
        this.esQuery.params = this.constructDeleteQuery(query);
        break;
      default:
        throw new Error('Unknown command in the query:' + query.toString());
    }
  }

  private constructDeleteQuery(query: TastyQuery): object[]
  {
    return this.constructSelectQuery(query);
  }

  private constructUpsertQuery(query: TastyQuery): object[]
  {
    return query.upserts;
  }

  private constructSelectQuery(query: TastyQuery): object[]
  {
    const queryParam: Elastic.SearchParams = {} as Elastic.SearchParams;

    // set table (index) name
    queryParam.index = query.table.getDatabaseName();
    queryParam.type = query.table.getTableName();

    // from clause
    if (query.numSkipped !== 0)
    {
      queryParam.from = query.numSkipped;
    }

    // size clause
    if (query.numTaken !== 0)
    {
      queryParam.size = query.numTaken;
    }

    // start the body
    const body = bodybuilder();

    // stored_fields clause
    if (!query.isSelectingAll())
    {
      const sourceFields: any[] = [];
      for (let i = 0; i < query.selected.length; ++i)
      {
        const column = query.selected[i];
        const columnName = this.getColumnName(column);
        sourceFields.push(columnName);
      }
      body.rawOption('_source', sourceFields);
    }

    if (query.aliases.length !== 0)
    {
      throw new Error('Aliases are not yet supported by ElasticGenerator.');
    }

    if (query.filters.length > 0)
    {
      for (let i = 0; i < query.filters.length; ++i)
      {
        const filter = query.filters[i];
        this.accumulateFilters(body, filter);
      }
    }

    // sort clause
    if (query.sorts.length > 0)
    {
      for (let i = 0; i < query.sorts.length; ++i)
      {
        const sort = query.sorts[i];
        const column = this.getColumnName(sort.node);
        const order = (sort.order === 'asc' ? 'asc' : 'desc');
        body.sort(column, order);
      }
    }
    queryParam['body'] = body.build();
    return [queryParam];
  }

  private accumulateFilters(body: bodybuilder, expression: TastyNode)
  {
    // https://www.elastic.co/guide/en/elasticsearch/guide/current/combining-filters.html#bool-filter
    // currently only supports the basic operators, with the column on the lhs, as well as && and ||

    if (expression.numChildren !== 2)
    {
      throw new Error('Filtering on non-binary expression "' + JSON.stringify(expression) + '".');
    }

    // NB: could be made to accept the column on the rhs too, but currently only supports column on lhs
    const columnName = this.getColumnName(expression.lhs);
    const value = expression.rhs.value; // could be checked for validity

    if (expression.type === '==')
    {
      body.filter('match', columnName, value);
    }
    else if (expression.type === '!=')
    {
      body.notQuery('match', columnName, value);
    }
    else if (expression.type === '<')
    {
      body.filter('range', columnName, { lt: value });
    }
    else if (expression.type === '<=')
    {
      body.filter('range', columnName, { lte: value });
    }
    else if (expression.type === '>')
    {
      body.filter('range', columnName, { gt: value });
    }
    else if (expression.type === '>=')
    {
      body.filter('range', columnName, { gte: value });
    }
    else if (expression.type === '&&')
    {
      const leftQuery = bodybuilder();
      this.accumulateFilters(leftQuery, expression.lhs);
      const rightQuery = bodybuilder();
      this.accumulateFilters(rightQuery, expression.rhs);
      body.andFilter(leftQuery);
      body.andFilter(rightQuery);
    }
    else if (expression.type === '||')
    {
      const leftQuery = bodybuilder();
      this.accumulateFilters(leftQuery, expression.lhs);
      const rightQuery = bodybuilder();
      this.accumulateFilters(rightQuery, expression.rhs);
      body.orFilter(leftQuery);
      body.orFilter(rightQuery);
    }
    else
    {
      throw new Error('Filtering on unsupported expression "' + JSON.stringify(expression) + '".');
    }
  }

  private getColumnName(expression: TastyNode)
  {
    if (expression.type !== '.' || expression.numChildren !== 2)
    {
      throw new Error('Could not find column name in expression "' + JSON.stringify(expression) + '".');
    }

    const table = expression.lhs;
    const column = expression.rhs;

    if (table.type !== 'reference')
    {
      throw new Error('Could not find table name in expression "' + JSON.stringify(expression) + '".');
    }
    if (table.value !== this.esQuery.table)
    {
      throw new Error('Filter expression filters on something other than the queried table "' +
        JSON.stringify(expression) + '".');
    }

    if (column.type !== 'reference')
    {
      throw new Error('Could not find column name in expression "' + JSON.stringify(expression) + '".');
    }

    return column.value;
  }
}

export default ElasticGenerator;
