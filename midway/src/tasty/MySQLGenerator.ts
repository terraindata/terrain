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

import TastyNode from '../tasty/TastyNode';
import TastyQuery from '../tasty/TastyQuery';

export const enum FixEnum
{
  nullary = 1,
  infix,
  infixWithoutSpaces,
  prefix,
  postfix,
}

export interface SQLGeneratorMapping
{
  readonly name: string;
  readonly fix: FixEnum;
}

function newSQLGeneratorMapping(name: string, fix: FixEnum): SQLGeneratorMapping
{
  return { name, fix };
}

export const TypeMap: Map<string, SQLGeneratorMapping> = new Map([
  ['boolean', newSQLGeneratorMapping('', FixEnum.nullary)],
  ['null', newSQLGeneratorMapping('NULL', FixEnum.nullary)],
  ['number', newSQLGeneratorMapping('', FixEnum.nullary)],
  ['reference', newSQLGeneratorMapping('', FixEnum.nullary)],
  ['string', newSQLGeneratorMapping('', FixEnum.nullary)],
  ['date', newSQLGeneratorMapping('', FixEnum.nullary)],

  ['filter', newSQLGeneratorMapping('WHERE', FixEnum.nullary)],
  ['select', newSQLGeneratorMapping('SELECT', FixEnum.nullary)],
  ['upsert', newSQLGeneratorMapping('REPLACE', FixEnum.nullary)],
  ['delete', newSQLGeneratorMapping('DELETE', FixEnum.nullary)],
  ['skip', newSQLGeneratorMapping('OFFSET', FixEnum.nullary)],
  ['sort', newSQLGeneratorMapping('ORDER BY', FixEnum.nullary)],
  ['take', newSQLGeneratorMapping('LIMIT', FixEnum.nullary)],

  ['.', newSQLGeneratorMapping('.', FixEnum.infixWithoutSpaces)],

  ['+', newSQLGeneratorMapping('+', FixEnum.infix)],
  ['-', newSQLGeneratorMapping('-', FixEnum.infix)],
  ['/', newSQLGeneratorMapping('/', FixEnum.infix)],
  ['*', newSQLGeneratorMapping('*', FixEnum.infix)],

  ['==', newSQLGeneratorMapping('=', FixEnum.infix)],
  ['!=', newSQLGeneratorMapping('<>', FixEnum.infix)],
  ['>', newSQLGeneratorMapping('>', FixEnum.infix)],
  ['<', newSQLGeneratorMapping('<', FixEnum.infix)],
  ['>=', newSQLGeneratorMapping('>=', FixEnum.infix)],
  ['<=', newSQLGeneratorMapping('<=', FixEnum.infix)],

  ['!', newSQLGeneratorMapping('NOT', FixEnum.prefix)],
  ['&&', newSQLGeneratorMapping('AND', FixEnum.infix)],
  ['||', newSQLGeneratorMapping('OR', FixEnum.infix)],

  ['isNull', newSQLGeneratorMapping('IS NULL', FixEnum.postfix)],
  ['isNotNull', newSQLGeneratorMapping('IS NOT NULL', FixEnum.postfix)],

  ['ascending', newSQLGeneratorMapping('ASC', FixEnum.postfix)],
  ['descending', newSQLGeneratorMapping('DESC', FixEnum.postfix)],
]);

export default class MySQLGenerator
{
  public statements: string[];
  public values: any[][];
  public queryString: string;
  private indentation: number;

  constructor()
  {
    this.statements = [];
    this.values = [];
    this.queryString = '';
    this.indentation = 0;
  }

  public generateSelectQuery(query: TastyQuery, placeholder: boolean)
  {
    this.appendExpression(query.command);
    this.indent();

    if (query.isSelectingAll())
    {
      this.queryString += ' * '; // handle "select all" condition
    }
    else
    {
      // put selected vars into the select list
      if (query.selected.length > 0)
      {
        this.queryString += ' ';
        this.appendStandardClause(
          null,
          false,
          query.selected,
          (column) =>
          {
            this.appendSubexpression(column);
          },
          () =>
          {
            this.queryString += ', ';
          });
      }

      // put alias expressions into the select list
      this.appendStandardClause(
        null,
        true,
        query.aliases,
        (alias) =>
        {
          this.appendSubexpression(alias.query);
          this.queryString += ' AS ';
          this.queryString += this.escapeString(alias.name);
        },
        () =>
        {
          this.queryString += ', ';
          this.newLine();
        });

      this.queryString += ' ';
    }

    // write FROM clause
    this.newLine();
    this.queryString += 'FROM ';
    this.queryString += this.escapeString(query.table.getTableName());

    // write WHERE clause
    if (query.filters.length > 0)
    {
      this.appendStandardClause(
        'WHERE',
        true,
        query.filters,
        (filter) =>
        {
          this.appendSubexpression(filter);
        },
        () =>
        {
          this.newLine();
          this.queryString += ' AND ';
        });
    }

    // write ORDER BY clause
    if (query.sorts.length > 0)
    {
      this.appendStandardClause(
        'ORDER BY',
        true,
        query.sorts,
        (sort) =>
        {
          this.appendSubexpression(sort.node);
          this.queryString += ' ';
          this.queryString += (sort.order === 'asc' ? 'ASC' : 'DESC');
        },
        () =>
        {
          this.queryString += ', ';
        });
    }

    if (query.numTaken !== 0 || query.numSkipped !== 0)
    {
      this.newLine();

      if (query.numTaken !== 0)
      {
        this.queryString += 'LIMIT ' + query.numTaken.toString();
        if (query.numSkipped !== 0)
        {
          this.queryString += ' ';
        }
      }

      if (query.numSkipped !== 0)
      {
        this.queryString += 'OFFSET ' + query.numSkipped.toString();
      }
    }
    this.accumulateStatement(this.queryString);
  }

  public generateUpsertQuery(query: TastyQuery, upserts: object[], placeholder: boolean)
  {
    this.appendExpression(query.command);
    this.queryString += ' ';
    this.indent();

    // write INTO clause
    this.newLine();
    this.queryString += 'INTO ';
    this.queryString += this.escapeString(query.table.getTableName());

    const baseQuery = this.queryString;
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
          this.accumulateUpsert(definedColumnsList, accumulatedUpdates, placeholder);

          this.queryString = baseQuery;
          definedColumnsList = this.getDefinedColumns(columns, obj);
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

    this.accumulateUpsert(definedColumnsList, accumulatedUpdates, placeholder);
    this.queryString = '';
  }

  public accumulateStatement(queryString: string): void
  {
    if (queryString !== '')
    {
      queryString += ';';
      this.statements.push(queryString);
    }
  }

  public getDefinedColumns(columns: string[], obj: object): string[]
  {
    const definedColumns: string[] = [];
    for (const col of columns)
    {
      if (obj.hasOwnProperty(col))
      {
        definedColumns.push(col);
      }
    }
    return definedColumns;
  }

  public accumulateUpsert(columns: string[], accumulatedUpdates: object[], placeholder: boolean): void
  {
    if (accumulatedUpdates.length <= 0)
    {
      return;
    }

    const values: any[] = [];
    let query = this.queryString;
    query += ' (' + columns.join(', ') + ') VALUES ';

    let first: boolean = true;
    for (const obj of accumulatedUpdates)
    {
      if (!first)
      {
        query += ',';
      }
      first = false;

      query += '(';
      query += columns.map(
        (col: string) =>
        {
          if (placeholder === true)
          {
            values.push(obj[col]);
            return '?';
          }
          else
          {
            return this.sqlName(TastyNode.make(obj[col]));
          }
        }).join(', ');
      query += ')';
    }
    this.values.push(values);
    this.accumulateStatement(query);
  }

  public newLine()
  {
    this.queryString += '\n';
    for (let i = 0; i < this.indentation; ++i)
    {
      this.queryString += '  ';
    }
  }

  public indent()
  {
    this.indentation++;
  }

  public unindent()
  {
    this.indentation = Math.max(this.indentation - 1, 0);
  }

  public appendStandardClause(clauseName: string | null, onNewLine: boolean, elements, onEach, onSeparator)
  {
    // skip empty clauses
    if (elements.length === 0)
    {
      return;
    }

    if (onNewLine)
    {
      this.newLine();
    }

    // ignore null clause names
    if (clauseName != null)
    {
      if (!onNewLine)
      {
        this.queryString += ' ';
      }
      this.queryString += clauseName + ' ';
    }

    this.indent();
    for (let i = 0; i < elements.length; ++i)
    {
      onEach(elements[i]);

      if (i < elements.length - 1)
      {
        onSeparator();
      }
    }
    this.unindent();
  }

  public appendSubexpression(node: TastyNode)
  {
    this.indent();
    this.appendExpression(node);
    this.unindent();
  }

  public appendExpression(node: TastyNode)
  {
    // depth first in order
    const sqlTypeInfo = TypeMap.get(node.type);
    if (sqlTypeInfo === undefined)
    {
      throw new Error('Node type "' + node.type + '" is not supported by SQLiteGeneratorRunner.');
    }

    const fix = sqlTypeInfo.fix;
    if (node.numChildren === 0)
    {
      // base case
      if (fix !== FixEnum.nullary)
      {
        throw new Error('Non-operator node that isn\'t nullary.');
      }

      this.queryString += this.sqlName(node);
    }
    else
    {
      // recursive case

      if (fix === FixEnum.prefix)
      {
        if (node.value.length !== 1)
        {
          throw new Error('Prefix operator of type "' + node.type + '" has the wrong number of operators.');
        }

        this.queryString += this.sqlName(node);
        this.queryString += ' ';
        this.appendExpression(node.lhs);
      }
      else if (fix === FixEnum.postfix)
      {
        if (node.value.length !== 1)
        {
          throw new Error('Postfix operator of type "' + node.type + '" has the wrong number of operators.');
        }

        this.appendExpression(node.lhs);
        this.queryString += ' ';
        this.queryString += this.sqlName(node);
      }
      else if (fix === FixEnum.infix)
      {
        if (node.value.length !== 2)
        {
          throw new Error('Infix operator of type "' + node.type + '" has the wrong number of operators.');
        }

        this.appendExpression(node.value[0]);
        this.queryString += ' ';
        this.queryString += this.sqlName(node);
        this.queryString += ' ';
        this.appendExpression(node.rhs);
      }
      else if (fix === FixEnum.infixWithoutSpaces)
      {
        if (node.value.length !== 2)
        {
          throw new Error('InfixWithoutSpaces operator of type "' + node.type
            + '" has the wrong number of operators.');
        }

        this.appendExpression(node.lhs);
        this.queryString += this.sqlName(node);
        this.appendExpression(node.rhs);
      }
      else
      {
        throw new Error('Operator node "' + node.type + '" is not a known fix type.');
      }
    }
  }

  public escapeString(value: string): string
  {
    return value.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g,
      (char) =>
      {
        switch (char)
        {
          case '\0':
            return '\\0';
          case '\x08':
            return '\\b';
          case '\x09':
            return '\\t';
          case '\x1a':
            return '\\z';
          case '\n':
            return '\\n';
          case '\r':
            return '\\r';
          case '\"':
            return '\"\"';
          case '\'':
            return '\'\'';
          case '\\':
          case '%':
            return '\\' + char;
          default:
            return char;
        }
      });
  }

  private sqlName(node: TastyNode): string
  {
    const sqlTypeInfo = TypeMap.get(node.type);
    if (sqlTypeInfo === undefined)
    {
      throw new Error('Undefined node type.');
    }

    if (sqlTypeInfo.name !== '')
    {
      return sqlTypeInfo.name;
    }

    if (node.type === 'reference')
    {
      return this.escapeString(node.value);
    }
    if (node.type === 'string')
    {
      return '\'' + this.escapeString(node.value) + '\'';
    }
    if (node.type === 'number')
    {
      return node.value.toString();
    }
    if (node.type === 'boolean')
    {
      return node.value === true ? '1' : '0';
    }
    if (node.type === 'date')
    {
      return '\'' + this.escapeString(node.value.toISOString().slice(0, 19).replace('T', ' ')) + '\'';
    }

    throw new Error('Unsupported node type "' + node.type + '".');
  }
}
