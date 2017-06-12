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

import ESArrayClause from './ESArrayClause';
import ESBaseClause from './ESBaseClause';
import ESBooleanClause from './ESBooleanClause';
import ESClause from './ESClause';
import ESEnumClause from './ESEnumClause';
import ESMapClause from './ESMapClause';
import ESNullClause from './ESNullClause';
import ESNumberClause from './ESNumberClause';
import ESReferenceClause from './ESReferenceClause';
import ESStringClause from './ESStringClause';
import ESStructureClause from './ESStructureClause';
import ESVariantClause from './ESVariantClause';

/**
 *
 */
export default class EQLConfig
{
  private clauses: { [name: string]: ESClause };

  public constructor(clauseConfiguration: any)
  {
    this.clauses = {};
    Object.keys(clauseConfiguration).forEach(
      (id: string): void =>
      {
        const settings: any = clauseConfiguration[id];
        const type: string = settings.type as string;

        if (type.match(/^(?:[a-zA-Z0-9_]+(:?[])?|{[a-zA-Z0-9_]+:[a-zA-Z0-9_]+})$/gim) === null)
        {
          throw new Error('Type names must be composed only of letters, numbers, and underscores. Type "' +
            type +
            ' is an invalid type name.');
        }

        let clause: ESClause;
        if (Array.isArray(type))
        {
          // list of possible types
          clause = new ESVariantClause(id, settings);
        }
        else if (typeof (type) === 'object')
        {
          // structured object id
          clause = new ESStructureClause(id, settings);
        }
        else if (typeof (type) === 'string')
        {
          if (type === 'null')
          {
            clause = new ESNullClause(type, settings);
          }
          else if (type === 'boolean')
          {
            clause = new ESBooleanClause(type, settings);
          }
          else if (type === 'number')
          {
            clause = new ESNumberClause(type, settings);
          }
          else if (type === 'string')
          {
            clause = new ESStringClause(type, settings);
          }
          else if (type === 'base')
          {
            clause = new ESBaseClause(type, settings);
          }
          else if (type === 'enum')
          {
            clause = new ESEnumClause(id, settings);
          }
          else if (type.indexOf('[]', id.length - 2) !== -1)
          {
            // array
            clause = new ESArrayClause(id, settings, type.substring(0, id.length - 2));
          }
          else if (type.indexOf('}', id.length - 1) !== -1)
          {
            // map
            clause = new ESMapClause(id, settings, type);
          }
          else
          {
            // reference id
            clause = new ESReferenceClause(id, settings);
          }
        }
        else
        {
          throw new Error('Unknown clause type "' + String(type) + '".');
        }

        this.clauses[id] = clause;
      });

    // TODO: validate id references and other settings
  }

  public tryGetClause(id: string): ESClause | null
  {
    if (this.clauses.hasOwnProperty(id))
    {
      return this.clauses[id];
    }
    else
    {
      return null;
    }
  }

  public getClause(id: string): ESClause
  {
    if (this.clauses.hasOwnProperty(id))
    {
      return this.clauses[id];
    }
    else
    {
      throw new Error('Unknown clause id "' + id + '"');
    }
  }
}
