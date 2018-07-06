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

import ESParameterFiller from 'shared/database/elastic/parser/EQLParameterFiller';
import ESJSONType from 'shared/database/elastic/parser/ESJSONType';
import { ESParameterType } from 'shared/database/elastic/parser/ESParameter';
import ESParameterSubstituter from 'shared/database/elastic/parser/ESParameterSubstituter';
import ESPropertyInfo from 'shared/database/elastic/parser/ESPropertyInfo';
import CardsToCodeOptions from 'shared/database/types/CardsToCodeOptions';
import ESClause from './clauses/ESClause';
import EQLConfig from './EQLConfig';
import ESJSONParser from './ESJSONParser';
import ESParser from './ESParser';
import ESParserError from './ESParserError';
import ESValueInfo from './ESValueInfo';

export const ESInterpreterDefaultConfig = new EQLConfig();

/**
 * An instrumented interpreter that takes the output of ESJSONParser and
 * decorates the results with ES-specific information.
 */
export default class ESInterpreter
{
  /*
   * Same as Input.tsx::toInputMap.
   */
  public static toInputMap(inputs: [any]): object
  {
    const inputMap: object = {};
    inputs.map((input) =>
    {
      let value: any;
      try
      {
        value = JSON.parse(input.value);
      }
      catch (e)
      {
        value = input.value;
      }
      inputMap[input.key] = value;
    });
    return inputMap;
  }

  public config: EQLConfig; // query language description
  public params: { [name: string]: null | ESClause }; // input parameter clause types
  public parser: ESParser | null; // source parser

  // If isDirty is true, it means some valueInfo nodes are updated, but we haven't synchronized all nodes and re-interpreted the tree.
  // this.reInterpreting() resets the isDirty to false by synchronizing all nodes, generating queries, and remarking the tree.
  public isDirty: boolean;
  // Indicating whether this instance has been updated since born.
  public isMutated: boolean;
  public rootValueInfo: ESValueInfo;
  // The generated query string
  public query: string;
  // The generated query string in which parameters are substituted with the input params.
  public finalQuery: string;
  public errors: ESParserError[];

  /**
   * Runs the interpreter on the given query string. Read needed data by calling the
   * public member functions below. You can also pass in an existing ESJSONParser
   * to run the interpreter on it's result.
   *
   * 1) parse
   * 2) interpret
   *
   * @param query the query string or parser to interpret
   * @param config the spec config to use
   * @param params parameter map to use
   */
  public constructor(query: string | ESParser,
    params: { [name: string]: any } = {},
    config: EQLConfig = ESInterpreterDefaultConfig)
  {
    this.config = config;
    this.params = params;
    this.errors = [];
    this.finalQuery = null;
    this.query = null;
    this.isMutated = false;
    this.isDirty = false;

    if (typeof query === 'string')
    {
      this.parser = new ESJSONParser(query) as ESParser;
      if (this.parser.hasError())
      {
        this.accumulateError(null, 'Failed to parse the query ' + query);
        return;
      }
      this.rootValueInfo = this.parser.getValueInfo();
    } else if (query instanceof ESParser)
    {
      this.parser = query;
      this.rootValueInfo = this.parser.getValueInfo();
    } else
    {
      this.parser = null;
      this.accumulateError(null, 'The input must be a query, an ESJSONParser object, or an ESValueInfo');
      return;
    }

    try
    {
      this.generateQueries();
      this.mark();
    } catch (e)
    {
      this.accumulateError(this.rootValueInfo, 'Failed to mark the json object ' + String(e.message));
    }
  }

  public accumulateError(info: ESValueInfo | null, message: string, isWarning: boolean = false): void
  {
    let token: any = null;
    if (info !== null && info !== undefined && info.tokens.length > 0)
    {
      token = info.tokens[0];
    }
    const e = new ESParserError(token, info, message, isWarning);
    this.errors.push(e);
    if (this.parser !== null)
    {
      this.parser.accumulateError(e);
    }
  }

  public hasInterpretingError()
  {
    return this.errors.length > 0;
  }

  public hasJSONParsingError()
  {
    return this.parser === null || this.parser.hasError();
  }

  public hasError()
  {
    return this.hasInterpretingError() || this.hasJSONParsingError();
  }

  public getInterpretingErrorMessages(): string[]
  {
    const ret: string[] = [];
    for (const e of this.errors)
    {
      ret.push(e.message);
    }
    return ret;
  }

  public getErrors(): string[]
  {
    return this.getInterpretingErrorMessages().concat(this.parser.getErrorMessages());
  }

  public toCode(options: CardsToCodeOptions): string
  {
    if (options.replaceInputs === true)
    {
      return this.finalQuery;
    } else
    {
      return this.query;
    }
  }

  /**
   *
   * @param {ESValueInfo} parent
   * @param {string | number} index: when the index is number, delete the array element,
   * otherwise delete the field element.
   * NOTE: the deleted array element will be replaced with undefined
   */
  public deleteChild(parent: ESValueInfo, index: string | number)
  {
    if (typeof index === 'string')
    {
      if (parent.objectChildren[index] !== undefined)
      {
        delete parent.objectChildren[index];
        this.isDirty = true;
      }
    } else
    {
      if (parent.arrayChildren[index] !== undefined)
      {
        delete parent.arrayChildren[index];
        this.isDirty = true;
      }
    }
  }

  public updateChild(parent: ESValueInfo, index: string | number, newChild: ESValueInfo | ESPropertyInfo)
  {
    this.deleteChild(parent, index);
    this.addChild(parent, index, newChild);
  }

  /**
   * NOTE: the caller should make sure that the type of the value is same as the type of node's value
   */
  public updateValue(node: ESValueInfo, value: any)
  {
    node.value = value;
    this.isDirty = true;
  }

  public addChild(parent: ESValueInfo, index: string | number, newChild: ESValueInfo | ESPropertyInfo)
  {
    if (typeof index === 'string')
    {
      if (parent.objectChildren[index] === undefined)
      {
        if (newChild instanceof ESPropertyInfo)
        {
          parent.addObjectChild(index, newChild);
          this.isDirty = true;
        } else if (newChild instanceof ESValueInfo)
        {
          // we have to create a ESPropertyInfo
          const childName = new ESJSONParser(JSON.stringify(index)).getValueInfo();
          childName.card = newChild.card;
          const propertyInfo = new ESPropertyInfo(childName, newChild);
          parent.addObjectChild(index, propertyInfo);
          this.isDirty = true;
        }
      }
    } else
    {
      if (parent.arrayChildren[index] === undefined)
      {
        parent.addArrayChild(newChild as ESValueInfo, index);
        this.isDirty = true;
      }
    }
  }

  public reInterpreting()
  {
    if (this.isDirty === false)
    {
      return;
    }
    try
    {
      this.rootValueInfo.recursivelyVisit((element) => true, this.linkValueInfo);
      this.isDirty = false;
      this.isMutated = true;
      this.generateQueries();
      this.mark();
    }
    catch (e)
    {
      this.accumulateError(this.rootValueInfo, 'Failed to re-interpret the json object ' + String(e.message));
    }
  }

  public adjustQuerySize(scrollSize: number, maxHit: number, hitsPage: number, appendResults: boolean): string
  {
    const query = this.rootValueInfo.value;
    if (appendResults)
    {
      let from = (hitsPage - 1) * scrollSize;
      if (query.hasOwnProperty('from'))
      {
        from += query['from'];
      }
      let size = Math.min(scrollSize, maxHit - from);
      if (query.hasOwnProperty('size'))
      {
        size = Math.min(query['size'] - from, size);
      }

      this.updateChild(this.rootValueInfo, 'size', new ESValueInfo(ESJSONType.number, size >= 0 ? size : 0));
      this.updateChild(this.rootValueInfo, 'from', new ESValueInfo(ESJSONType.number, from));
    }
    else
    {
      const size = Math.min(maxHit, hitsPage * scrollSize);
      if (query.hasOwnProperty('size'))
      {
        const updatedSize = Math.min(query['size'], size);
        this.updateChild(this.rootValueInfo, 'size', new ESValueInfo(ESJSONType.number, updatedSize));
      }
    }
    this.reInterpreting();
    return this.finalQuery;
  }

  public normalizeTerrainScriptWeight()
  {

  }

  private linkValueInfo(node: ESValueInfo)
  {
    let newValue;
    switch (node.jsonType)
    {
      case ESJSONType.array:
        newValue = [];
        node.forEachElement((element: ESValueInfo) =>
        {
          newValue.push(element.value);
        });
        node.value = newValue;
        return;
      case ESJSONType.object:
        newValue = {};
        node.forEachProperty((element: ESPropertyInfo) =>
        {
          newValue[element.propertyName.value] = element.propertyValue.value;
        });
        node.value = newValue;
        break;
      default:
        return;
    }
  }

  private mark()
  {
    const root: ESValueInfo = this.rootValueInfo;
    if (root.clause === undefined)
    {
      root.clause = this.config.getClause('body');
    }
    root.recursivelyVisit(
      (info: ESValueInfo): boolean =>
      {
        if (info.clause !== undefined)
        {
          info.clause.mark(this, info);
        }
        return true;
      },
    );
  }

  private generateQueries()
  {
    const root = this.rootValueInfo;
    this.query = ESParameterSubstituter.generate(root,
      (paramValueInfo: ESValueInfo, runtimeParam?: string, inTerms?: boolean): string =>
      {
        return '@' + String(paramValueInfo.parameter);
      });

    // generate the final query string while marking the parameter value.
    this.finalQuery = ESParameterFiller.generate(root, this.params,
      (source: ESValueInfo, type: ESParameterType, value: string | Error) =>
      {
        if (value instanceof Error)
        {
          this.accumulateError(source, value.message);
        } else
        {
          const parsedValue = new ESJSONParser(value);
          if (parsedValue.hasError())
          {
            this.accumulateError(source, 'Failed to parse the parameter value ' + value);
          } else
          {
            source.parameterType = type;
            source.parameterValue = new ESJSONParser(value);
          }
        }
        return true;
      });
  }
}
