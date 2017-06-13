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

import * as fs from 'fs';
import * as winston from 'winston';
import { makePromiseCallback } from '../../../app/Util';
import ESAnyClause from './ESAnyClause';
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

  public static async getDefault(): Promise<EQLConfig>
  {
    if (EQLConfig.defaultConfig === undefined)
    {
      const configString: any = await new Promise((resolve, reject) =>
      {
        fs.readFile(__dirname + '/ESQueryStructure.json', makePromiseCallback(resolve, reject));
      });

      EQLConfig.defaultConfig = new EQLConfig(JSON.parse(configString));
    }

    return EQLConfig.defaultConfig;
  }

  private static defaultConfig: EQLConfig;

  private undefinedTypes: { [name: string]: boolean };
  private clauses: { [name: string]: ESClause };

  public constructor(clauseConfiguration: any)
  {
    this.undefinedTypes = {};
    this.clauses = {};

    winston.info(JSON.stringify(clauseConfiguration));
    Object.keys(clauseConfiguration).forEach(
      (id: string): void =>
      {
        winston.info('defining "' + id + '"');

        const settings: any = clauseConfiguration[id];
        this.declareType(id, settings);
        if (this.clauses[id] !== undefined)
        {
          return;
        }

        const type: any = settings.type;
        let clause: ESClause;
        if (typeof (type) === 'object')
        {
          // structured object id
          clause = new ESStructureClause(settings, this);
        }
        else if (typeof (type) === 'string')
        {
          switch (type)
          {
            case 'enum':
              clause = new ESEnumClause(settings, this);
              break;
            case 'variant':
              clause = new ESVariantClause(settings, this);
              break;
            default:
              // reference clause
              clause = new ESReferenceClause(settings, this);
              break;
          }
        }
        else
        {
          throw new Error('Unknown clause type "' + String(type) + '".');
        }

        winston.info('registering clause "' + id + '"');
        this.clauses[id] = clause;
        delete this.undefinedTypes[id];
      },
    );

    // TODO: validate id references and other settings
  }

  public declareType(id: string, settings: any = {}): void
  {
    if (this.clauses[id] !== undefined)
    {
      return; // already declared
    }

    winston.info('declare "' + id + '"');
    settings.id = id;
    let clause: ESClause | null = null;
    switch (id)
    {
      case 'null':
        clause = new ESNullClause(settings);
        break;
      case 'boolean':
        clause = new ESBooleanClause(settings);
        break;
      case 'number':
        clause = new ESNumberClause(settings);
        break;
      case 'string':
        clause = new ESStringClause(settings);
        break;
      case 'base':
        clause = new ESBaseClause(settings);
        break;
      case 'any':
        clause = new ESAnyClause(settings);
        break;

      default:
        this.validateTypename(id);

        if (id.endsWith('[]'))
        {
          // array
          clause = new ESArrayClause(settings, id.substring(0, id.length - 2));
        }
        else if (id.startsWith('{'))
        {
          // map
          if (id.charAt(0) !== '{' || id.charAt(id.length - 1) !== '}' ||
            id.indexOf(' ') !== -1)
          {
            throw new Error('Unsupported map id "' + id + '".');
          }

          const components: string[] = id.substring(1, id.length - 1).split(':');
          clause = new ESMapClause(settings, components[0], components[1], this);
        }
        else
        {
          // undefined reference id
          this.undefinedTypes[id] = true;
        }
        break;
    }

    if (clause !== null)
    {
      this.clauses[id] = clause;
    }
  }

  public validateTypename(type: string): void
  {
    if (type.match(/^(?:[a-zA-Z0-9_]+(:?\[])?|{[a-zA-Z0-9_]+:[a-zA-Z0-9_]+})$/gim) === null)
    {
      throw new Error('Type names must be composed only of letters, numbers, and underscores. Type "' +
        String(type) +
        '" is an invalid type name.');
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

}
