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

import * as SQLGenerator from './SQLGenerator';
import TastyQuery from './TastyQuery';

export default class ElasticSearchGenerator
{
    queryObject: any;
    tableName: string;

    constructor(query)
    {
        this.queryObject = {};
        this.tableName = query.table.name;

        //from clause
        if (query.numSkipped != null)
            this.queryObject['from'] = query.numSkipped;

        //size clause
        if (query.numTaken != null)
            this.queryObject['size'] = query.numTaken;

        //stored_fields clause
        if (!query.isSelectingAll())
        {
            let storedFields = this.getSubclauseList(this.queryObject, 'stored_fields');
            for (let i  = 0; i < query.selected.length; ++i)
            {
                let column = query.selected[i];
                let columnName = this.getColumnName(column);
                storedFields.push(columnName);
            }
        }

        //
        //     //put alias expressions into the select list
        //     this.appendStandardClause(
        //         null,
        //         true,
        //         query.aliases,
        //         (alias) =>
        //         {
        //             columns.push(alias.name);
        //             this.appendSubexpression(alias.query);
        //             this.queryString += ' AS ';
        //             this.queryString += this.escapeString(alias.name);
        //         },
        //         () =>
        //         {
        //             this.queryString += ', ';
        //             this.newLine();
        //         });
        //
        //     this.queryString += ' ';
        // }

        // //write FROM clause
        // this.newLine();
        // this.queryString += 'FROM ';
        // this.queryString += this.escapeString(query.table.__tableName);

        //filter clause
        if (query.filters.length > 0)
        {
            let filterClause = this.getNestedSubclauseObject(this.queryObject, 'query', 'filter');
            for (let i = 0; i < query.filters.length; ++i)
            {
                let filter = query.filters[i];
                this.accumulateFilters(filterClause, filter);
            }
        }

        //sort clause
        if (query.sorts.length > 0)
        {
            let sortClause = this.getSubclauseList(this.queryObject, 'sort');

            for (let i = 0; i < query.sorts.length; ++i)
            {
                let sort = query.sorts[i];

                let clause = new Object();
                let column = this.getColumnName(sort.node);
                clause[column] = (sort.order == 'asc' ? 'asc' : 'desc');

                sortClause.push(clause);
            }
        }
    }

    static convert(node)
    {
        return new ElasticSearchGenerator(node).queryObject;
    }

    //private ----

    accumulateFilters(filterClause, expression)
    {
        //https://www.elastic.co/guide/en/elasticsearch/guide/current/combining-filters.html#bool-filter
        //currently only supports the basic operators, with the column on the lhs, as well as && and ||

        console.log(expression.toString());
        if (expression.numChildren != 2)
            throw new Error('Filtering on non-binary expression "' + JSON.stringify(expression) + '".');

        //NB: could be made to accept the column on the rhs too, but currently only supports column on lhs
        let columnName = this.getColumnName(expression.lhs);
        let value = expression.rhs.value; //could be checked for validity

        if (expression.type == '==')
        {
            this.addFilterTerm(filterClause, 'bool', 'must', columnName, value);
        }
        else if (expression.type == '!=')
        {
            this.addFilterTerm(filterClause, 'bool', 'must_not', columnName, value);
        }
        else if (expression.type == '<')
        {
            this.setRangeClauseIfLesser(filterClause, columnName, 'lt', value);
        } else if (expression.type == '<=')
        {
            this.setRangeClauseIfLesser(filterClause, columnName, 'lte', value);
        } else if (expression.type == '>')
        {
            this.setRangeClauseIfGreater(filterClause, columnName, 'gt', value);
        } else if (expression.type == '>=')
        {
            this.setRangeClauseIfGreater(filterClause, columnName, 'gte', value);
        } else if (expression.type == '&&')
        {
            this.accumulateFilters(filterClause, expression.lhs);
            this.accumulateFilters(filterClause, expression.rhs);
        }
        else if (expression.type == '||')
        {
            let shouldClause = this.getSubclauseList(filterClause, 'should');
            this.accumulateFilters(shouldClause, expression.lhs);
            this.accumulateFilters(shouldClause, expression.rhs);
        }
        else
        {
            throw new Error('Filtering on unsupported expression "' + JSON.stringify(expression) + '".');
        }
    }

    getSubclauseList(parentClause, clauseName)
    {
        if (!(clauseName in parentClause))
            parentClause[clauseName] = [];
        return parentClause[clauseName];
    }

    getSubclauseObject(parentClause, clauseName)
    {
        if (!(clauseName in parentClause))
            parentClause[clauseName] = {};
        return parentClause[clauseName];
    }

    getNestedSubclauseObject(parentClause, clauseName, subclauseName)
    {
        let clause = this.getSubclauseObject(parentClause, clauseName);
        return this.getSubclauseObject(clause, subclauseName);
    }

    getNestedSubclauseList(parentClause, clauseName, subclauseName)
    {
        let clause = this.getSubclauseObject(parentClause, clauseName);
        return this.getSubclauseList(clause, subclauseName);
    }

    setRangeClauseIfLesser(filterClause, columnName, filterOperator, value)
    {
        let columnClause = this.getNestedSubclauseObject(filterClause, 'range', columnName);
        if (!(filterOperator in columnClause) || value < columnClause[filterOperator])
            columnClause[filterOperator] = value;
    }

    setRangeClauseIfGreater(filterClause, columnName, filterOperator, value)
    {
        let columnClause = this.getNestedSubclauseObject(filterClause, 'range', columnName);
        if (!(filterOperator in columnClause) || value > columnClause[filterOperator])
            columnClause[filterOperator] = value;
    }

    addFilterTerm(filterClause, clause, subclause, columnName, value)
    {
        let subclause = this.getNestedSubclauseList(filterClause, clause, subclause);
        let termKVP = new Object();
        termKVP[columnName] = value;
        subclause.push({term: termKVP});
    }

    getColumnName(expression)
    {
        if (expression.type != '.' || expression.numChildren != 2)
            throw new Error('Could not find column name in expression "' + JSON.stringify(expression) + '".');

        let table = expression.lhs;
        let column = expression.rhs;

        if (table.type != 'reference')
            throw new Error('Could not find table name in expression "' + JSON.stringify(expression) + '".');
        if (table.value != this.tableName)
            throw new Error('Filter expression filters on something other than the queried table "' + JSON.stringify(expression) + '".');
        if (column.type != 'reference')
            throw new Error('Could not find column name in expression "' + JSON.stringify(expression) + '".');

        return column.value;
    }
}
