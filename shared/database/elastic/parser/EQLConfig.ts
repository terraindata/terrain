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

import ESArrayClause from './clauses/ESArrayClause';
import ESClause from './clauses/ESClause';
import ESMapClause from './clauses/ESMapClause';
import EQLSpec from './EQLSpec';

/**
 *
 */
export default class EQLConfig
{
  private clauses: { [name: string]: ESClause };

  public constructor(clauseConfiguration: ESClause[] = EQLSpec)
  {
    this.clauses = {};

    clauseConfiguration.forEach(
      (clause: ESClause): void =>
      {
        this.validateTypename(clause.type);
        this.clauses[clause.type] = clause;
      });

    clauseConfiguration.forEach(
      (clause: ESClause): void =>
      {
        clause.init(this);
      });
  }

  public declareType(type: string, settings: any = {}): void
  {
    if (this.clauses[type] !== undefined)
    {
      return; // already declared
    }

    // winston.info('declare "' + id + '"');
    settings.type = type;
    let clause: ESClause | null = null;

    this.validateTypename(type);

    if (type.endsWith('[]'))
    {
      // array
      clause = new ESArrayClause(type, type.substring(0, type.length - 2), settings);
    }
    else if (type.startsWith('{'))
    {
      // map
      if (type.charAt(0) !== '{' || type.charAt(type.length - 1) !== '}' ||
        type.indexOf(' ') !== -1)
      {
        throw new Error('Unsupported map type "' + type + '".');
      }

      const components: string[] = type.substring(1, type.length - 1).split(':');
      clause = new ESMapClause(type, components[0], components[1], settings);
    }
    else
    {
      // undefined reference id
      throw new Error('Unknown clause type: "' + type + '"');
    }

    if (clause !== null)
    {
      this.clauses[type] = clause;
    }
  }

  public validateTypename(name: string): void
  {
    if (name.match(/^(?:[a-zA-Z0-9_]+(:?\[])?|{[a-zA-Z0-9_]+:[a-zA-Z0-9_]+})$/gim) === null)
    {
      throw new Error('name names must be composed only of letters, numbers, and underscores. name "' +
        String(name) +
        '" is an invalid name name.');
    }
  }

  public getClause(id: string): ESClause
  {
    const clause: ESClause = this.clauses[id];
    if (clause !== undefined)
    {
      return clause;
    }
    else
    {
      throw new Error('Unknown clause id "' + id + '"');
    }
  }

  public getClauses(): { [name: string]: ESClause }
  {
    return this.clauses;
  }
}
