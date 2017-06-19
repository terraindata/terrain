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

import EQLSpec from './EQLSpec';
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
 * Used to convert old EQLSpec into new EQLSpec
 */
export default class EQLConverter
{

  private undefinedTypes: { [name: string]: boolean };
  private clauses: { [name: string]: ESClause };
  private text: string;

  public constructor(clauseConfiguration: any = EQLSpec)
  {
    clauseConfiguration = JSON.parse(JSON.stringify(clauseConfiguration));

    this.undefinedTypes = {};
    this.clauses = {};

    this.text = `// Copyright 2017 Terrain Data, Inc.

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

const EQLSpec: ESClause[] =
  [`;

    // winston.info(JSON.stringify(clauseConfiguration));
    Object.keys(clauseConfiguration).forEach(
      (key: string): void => this.defineType(key, clauseConfiguration[key]));

    // TODO: validate id references and other settings
    this.text += '];\n';
    this.text += 'export default EQLSpec;\n';
    console.log(this.text);
  }

  public defineType(type: string, settings: any): void
  {
    // winston.info('defining "' + id + '"');

    // this.declareType(type, settings);

    const typeString: string = JSON.stringify(type);
    const def: any = settings.def;
    delete settings.def;

    switch (type)
    {
      case 'null':
      case 'boolean':
      case 'number':
      case 'string':
      case 'base':
      case 'any':
        this.defineBaseType(settings, type, typeString);
        break;

      default:
        if (typeof (def) === 'object')
        {
          // structured object id
          this.text += 'new ESStructureClause(' + typeString + ',';

          this.text += JSON.stringify(def) + ',';

          let required = [];
          if (settings.required !== undefined)
          {
            required = settings.required;
            delete settings.required;
          }
          this.text += JSON.stringify(required) + ',';

          this.text += JSON.stringify(settings) + ')';
        }
        else if (typeof (def) === 'string')
        {
          switch (def)
          {
            case 'enum':
              this.text += 'new ESEnumClause(' + typeString + ',';

              this.text += JSON.stringify(settings.values) + ',';
              delete settings.values;

              this.text += JSON.stringify(settings) + ')';

              break;

            case 'variant':
              this.text += 'new ESVariantClause(' + typeString + ',';

              this.text += JSON.stringify(settings.subtypes) + ',';
              delete settings.subtypes;

              this.text += JSON.stringify(settings) + ')';

              break;

            default:
              // reference clause
              if (!this.defineBaseType(settings, def, typeString))
              {
                console.log('non-base reference clause: ' + typeString);

                this.text += 'new ESReferenceClause(' + typeString + ',';
                this.text += JSON.stringify(def) + ',';
                this.text += JSON.stringify(settings) + ')';
              }
              break;
          }
        }
        else
        {
          throw new Error('Unknown clause "' + 'typename:' + String(type) + ',' + 'def:' + String(def) + ' ".');
        }
        break;
    }

    this.text += ',\n';
  }

  public defineBaseType(settings: any, type: string, typeString: string): boolean
  {
    switch (type)
    {
      case 'null':
        this.renameValues(settings);
        this.text += 'new ESNullClause(' + typeString + ',' + JSON.stringify(settings) + ')';
        break;
      case 'boolean':
        this.renameValues(settings);
        this.text += 'new ESBooleanClause(' + typeString + ',' + JSON.stringify(settings) + ')';
        break;
      case 'number':
        this.renameValues(settings);
        this.text += 'new ESNumberClause(' + typeString + ',' + JSON.stringify(settings) + ')';
        break;
      case 'string':
        this.renameValues(settings);
        this.text += 'new ESStringClause(' + typeString + ',' + JSON.stringify(settings) + ')';
        break;
      case 'base':
        this.renameValues(settings);
        this.text += 'new ESBaseClause(' + typeString + ',' + JSON.stringify(settings) + ')';
        break;
      case 'any':
        this.renameValues(settings);
        this.text += 'new ESAnyClause(' + typeString + ',' + JSON.stringify(settings) + ')';
        break;
      default:

        if (type.endsWith('[]'))
        {
          // array
          const elementType: string = type.substring(0, type.length - 2);
          this.text +=
            'new ESArrayClause(' +
            typeString +
            ',' +
            JSON.stringify(elementType) +
            ',' +
            JSON.stringify(settings) +
            ')';
          break;
        }

        if (type.startsWith('{'))
        {
          // map
          const components: string[] = type.substring(1, type.length - 1).split(':');
          this.text +=
            'new ESMapClause(' +
            typeString +
            ',' +
            JSON.stringify(components[0]) +
            ',' +
            JSON.stringify(components[1]) +
            ',' +
            JSON.stringify(settings) +
            ')';
          break;
        }

        return false;
    }

    return true;
  }

  public renameValues(settings: any): void
  {
    settings.suggestions = settings.values;
    delete settings.values;
  }

  public declareType(type: string, settings: any = {}): void
  {
    // if (this.clauses[type] !== undefined)
    // {
    //   return; // already declared
    // }
    //
    // // winston.info('declare "' + id + '"');
    // settings.type = type;
    // let clause: ESClause | null = null;
    // switch (type)
    // {
    //   case 'null':
    //     clause = new ESNullClause(settings);
    //     break;
    //   case 'boolean':
    //     clause = new ESBooleanClause(settings);
    //     break;
    //   case 'number':
    //     clause = new ESNumberClause(settings);
    //     break;
    //   case 'string':
    //     clause = new ESStringClause(settings);
    //     break;
    //   case 'base':
    //     clause = new ESBaseClause(settings);
    //     break;
    //   case 'any':
    //     clause = new ESAnyClause(settings);
    //     break;
    //
    //   default:
    //     this.validateTypename(type);
    //
    //     if (type.endsWith('[]'))
    //     {
    //       // array
    //       clause = new ESArrayClause(settings, type.substring(0, type.length - 2));
    //     }
    //     else if (type.startsWith('{'))
    //     {
    //       // map
    //       if (type.charAt(0) !== '{' || type.charAt(type.length - 1) !== '}' ||
    //         type.indexOf(' ') !== -1)
    //       {
    //         throw new Error('Unsupported map type "' + type + '".');
    //       }
    //
    //       const components: string[] = type.substring(1, type.length - 1).split(':');
    //       clause = new ESMapClause(settings, components[0], components[1], this);
    //     }
    //     else
    //     {
    //       // undefined reference id
    //       this.undefinedTypes[type] = true;
    //     }
    //     break;
    // }
    //
    // if (clause !== null)
    // {
    //   this.clauses[type] = clause;
    // }
  }

}
