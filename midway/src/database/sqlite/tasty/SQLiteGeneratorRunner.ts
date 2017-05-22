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

import TastyNode from '../../../tasty/TastyNode';
import TastyNodeTypes from '../../../tasty/TastyNodeTypes';
import TastyQuery from '../../../tasty/TastyQuery';
import SQLGenerator from '../../SQLGenerator';

/**
 * Generates SQLite queries from TastyQuery objects.
 * Don't use this class directly: use SQLiteGenerator instead.
 */
export default class SQLiteGeneratorRunner
{
  private generator: SQLGenerator;

  constructor(query: TastyQuery)
  {
    this.generator = new SQLGenerator();
    if (query.command.tastyType === TastyNodeTypes.select || query.command.tastyType === TastyNodeTypes.delete)
    {
      this.generator.appendExpression(query.command);
      this.generator.indent();

      const columns: TastyNode[] = [];
      if (query.isSelectingAll())
      {
        this.generator.queryString += ' * '; // handle "select all" condition
      }
      else
      {
        // put selected vars into the select list
        if (query.selected.length > 0)
        {
          this.generator.queryString += ' ';
          this.generator.appendStandardClause(
            null,
            false,
            query.selected,
            (column) =>
            {
              columns.push(column);
              this.generator.appendSubexpression(column);
            },
            () =>
            {
              this.generator.queryString += ', ';
            });
        }

        // put alias expressions into the select list
        this.generator.appendStandardClause(
          null,
          true,
          query.aliases,
          (alias) =>
          {
            columns.push(alias.name);
            this.generator.appendSubexpression(alias.query);
            this.generator.queryString += ' AS ';
            this.generator.queryString += this.generator.escapeString(alias.name);
          },
          () =>
          {
            this.generator.queryString += ', ';
            this.generator.newLine();
          });

        this.generator.queryString += ' ';
      }

      // write FROM clause
      this.generator.newLine();
      this.generator.queryString += 'FROM ';
      this.generator.queryString += this.generator.escapeString(query.table.getTableName());

      // write WHERE clause
      if (query.filters.length > 0)
      {
        this.generator.appendStandardClause(
          'WHERE',
          true,
          query.filters,
          (filter) =>
          {
            this.generator.appendSubexpression(filter);
          },
          () =>
          {
            this.generator.newLine();
            this.generator.queryString += ' AND ';
          });
      }

      // write ORDER BY clause
      if (query.sorts.length > 0)
      {
        this.generator.appendStandardClause(
          'ORDER BY',
          true,
          query.sorts,
          (sort) =>
          {
            this.generator.appendSubexpression(sort.node);
            this.generator.queryString += ' ';
            this.generator.queryString += (sort.order === 'asc' ? 'ASC' : 'DESC');
          },
          () =>
          {
            this.generator.queryString += ', ';
          });
      }

      if (query.numTaken !== 0 || query.numSkipped !== 0)
      {
        this.generator.newLine();

        if (query.numTaken !== 0)
        {
          this.generator.queryString += 'LIMIT ' + query.numTaken.toString();
          if (query.numSkipped !== 0)
          {
            this.generator.queryString += ' ';
          }
        }

        if (query.numSkipped !== 0)
        {
          this.generator.queryString += 'OFFSET ' + query.numSkipped.toString();
        }
      }
    }
    else if (query.command.tastyType === TastyNodeTypes.upsert)
    {
      if (query.upserts.length > 0)
      {
        const inserts: object[] = [];
        const upserts: object[] = [];

        // partition upsert objects into those which have primary keys and those which do not
        const primaryKeys = query.table.getPrimaryKeys();
        for (const obj of query.upserts)
        {
          if ((primaryKeys.length === 1) && (obj[primaryKeys[0]] === undefined))
          {
            inserts.push(obj);
          }
          else
          {
            upserts.push(obj);
          }
        }

        this.generateUpsertQuery(query, upserts, false);
        this.generator.queryString = '';
        this.generateUpsertQuery(query, inserts, true);
      }
      this.generator.queryString = '';
    }

    this.generator.accumulateStatement(this.generator.queryString);
  }

  public getStatements()
  {
    return this.generator.statements;
  }

  private generateUpsertQuery(query: TastyQuery, upserts: object[], lastId: boolean)
  {
    if (upserts.length === 0)
    {
      return;
    }

    this.generator.appendExpression(query.command);
    this.generator.queryString += ' ';
    this.generator.indent();

    // write INTO clause
    this.generator.newLine();
    this.generator.queryString += 'INTO ';
    this.generator.queryString += this.generator.escapeString(query.table.getTableName());

    const baseQuery = this.generator.queryString;

    const columns: string[] = query.table.getColumnNames();
    let definedColumnsList: string[] = [];
    let definedColumnsSet: Set<string> = new Set();
    let accumulatedUpdates: object[] = [];

    for (const obj of upserts)
    {
      // check if this object has the same set of defined cols as the previous one
      for (const col of columns)
      {
        const isInObj: boolean = obj.hasOwnProperty(col);
        const isInDefined: boolean = definedColumnsSet.has(col);
        if (isInObj !== isInDefined)
        {
          this.generator.accumulateUpsert(definedColumnsList, accumulatedUpdates);

          this.generator.queryString = baseQuery;
          definedColumnsList = this.generator.getDefinedColumns(columns, obj);
          definedColumnsSet = new Set();
          for (const definedCol of definedColumnsList)
          {
            definedColumnsSet.add(definedCol);
          }
          accumulatedUpdates = [];
        }
      }

      accumulatedUpdates.push(obj);
    }

    this.generator.accumulateUpsert(definedColumnsList, accumulatedUpdates);
    if (lastId)
    {
      this.generator.accumulateStatement('SELECT last_insert_rowid() as id');
    }
  }
}
