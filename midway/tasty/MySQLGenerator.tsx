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

export default class MySQLGenerator
{
  public static generate(node): string
  {
    return new MySQLGenerator(node).queryString;
  }

  public queryString: string;
  private indentation: number;

  constructor(query: TastyQuery)
  {
    this.queryString = '';
    this.indentation = 0;

    this.queryString += 'SELECT ';
    this.indent();

    const columns = [];

    if (query.isSelectingAll())
    {
      this.queryString += '* '; // handle "select all" condition
    } else
    {
      // put selected vars into the select list
      if (query.selected != null)
      {
        this.appendStandardClause(
          null,
          false,
          query.selected,
          (column) =>
          {
            columns.push(column);
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
        (alias) => {
          columns.push(alias.name);
          this.appendSubexpression(alias.query);
          this.queryString += ' AS ';
          this.queryString += this.escapeString(alias.name);
        },
        () => {
          this.queryString += ', ';
          this.newLine();
        });

      this.queryString += ' ';
    }

    // write FROM clause
    this.newLine();
    this.queryString += 'FROM ';
    this.queryString += this.escapeString(query.table._tastyTableName);

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
        this.queryString += 'LIMIT ' + query.numTaken;
        if (query.numSkipped !== 0)
        {
          this.queryString += ' ';
        }
      }

      if (query.numSkipped !== 0)
      {
        this.queryString += 'OFFSET ' + query.numSkipped;
      }
    }

    this.queryString += ';';
  }

  private newLine()
  {
    this.queryString += '\n';
    for (let i = 0; i < this.indentation; ++i)
    {
      this.queryString += '  ';
    }
  }

  private indent()
  {
    this.indentation++;
  }

  private unindent()
  {
    this.indentation = Math.max(this.indentation - 1, 0);
  }

  private appendStandardClause(clauseName, onNewLine, elements, onEach, onSeparator)
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
    for (let i = 0; ; )
    {
      onEach(elements[i]);

      ++i;
      if (i >= elements.length)
      {
        break;
      }

      onSeparator();
    }
    this.unindent();
  }

  private appendSubexpression(node)
  {
    this.indent();
    this.appendExpression(node);
    this.unindent();
  }

  private appendExpression(node)
  {
    // depth first in order
    if (!(node.type in SQLGenerator.TypeMap))
    {
      throw new Error('Node type "' + node.type + '" is not supported by MySQLGenerator.');
    }

    const sqlTypeInfo = SQLGenerator.TypeMap[node.type];
    const fix = sqlTypeInfo.fix;
    if (node.numChildren === 0)
    {
      // base case
      if (fix !== SQLGenerator.FixEnum.nullary)
      {
        throw new Error("Non-operator node that isn't nullary.");
      }

      this.queryString += this.sqlName(node);
    } else
    {
      // recursive case

      if (fix === SQLGenerator.FixEnum.prefix)
      {
        if (node.value.length !== 1)
        {
          throw new Error('Prefix operator of type "' + node.type + '" has the wrong number of operators.');
        }

        this.queryString += this.sqlName(node);
        this.queryString += ' ';
        this.appendExpression(node.lhs);
      } else if (fix === SQLGenerator.FixEnum.postfix)
      {
        if (node.value.length !== 1)
        {
          throw new Error('Postfix operator of type "' + node.type + '" has the wrong number of operators.');
        }

        this.appendExpression(node.lhs);
        this.queryString += ' ';
        this.queryString += this.sqlName(node);
      } else if (fix === SQLGenerator.FixEnum.infix)
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
      } else if (fix === SQLGenerator.FixEnum.infixWithoutSpaces)
      {
        if (node.value.length !== 2)
        {
          throw new Error('InfixWithoutSpaces operator of type "' + node.type
          + '" has the wrong number of operators.');
        }

        this.appendExpression(node.lhs);
        this.queryString += this.sqlName(node);
        this.appendExpression(node.rhs);
      } else
      {
        throw new Error('Operator node "' + node.type + '" is not a known fix type.');
      }
    }
  }

  private sqlName(node): string
  {
    const sqlTypeInfo = SQLGenerator.TypeMap[node.type];
    if (sqlTypeInfo.sqlName !== null)
    {
      return sqlTypeInfo.sqlName;
    }

    if (node.type === 'reference')
    {
      return this.escapeString(node.value);
    }
    if (node.type === 'string')
    {
      return "'" + this.escapeString(node.value) + "'";
    }
    if (node.type === 'number')
    {
      return node.value.toString();
    }
    if (node.type === 'boolean')
    {
      return node.value ? 'TRUE' : 'FALSE';
    }

    throw new Error('Unsupported node type "' + node.type + '".');
  }

  private escapeString(value: string): string
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
        case "'":
        case '\\':
        case '%':
        return '\\' + char;
        default:
        return char;
      }
    });
  }
}
