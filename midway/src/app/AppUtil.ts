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

import * as request from 'request';
import * as _ from 'lodash';

import ESInterpreter from '../../../shared/database/elastic/parser/ESInterpreter';
import { ItemConfig } from '../app/items/ItemConfig';
import { items } from '../app/items/ItemRouter';

import ESScriptClause from 'shared/database/elastic/parser/clauses/ESScriptClause';
import ESValueInfo from 'shared/database/elastic/parser/ESValueInfo';
import ESClauseType from 'shared/database/elastic/parser/ESClauseType';

export function doRequest(url)
{
  return new Promise((resolve, reject) =>
  {
    request(url, (error, res, body) =>
    {
      if ((error === null || error === undefined) && res.statusCode === 200)
      {
        resolve(body);
      }
      else
      {
        if (error === null || error === undefined)
        {
          error = 'Received status ' + String(res.statusCode) + " on Midway's request.";
        }
        reject(error);
      }
    });
  });
}

export function updateObject<T>(obj: T, newObj: T): T
{
  for (const key in newObj)
  {
    if (newObj.hasOwnProperty(key))
    {
      obj[key] = newObj[key];
    }
  }
  return obj;
}

export function verifyParameters(parameters: any, required: string[]): void
{
  if (parameters === undefined)
  {
    throw new Error('No parameters found.');
  }

  for (const key of required)
  {
    if (parameters.hasOwnProperty(key) === false)
    {
      throw new Error('Parameter "' + key + '" not found in request object.');
    }
  }
}

export async function getQueryFromAlgorithm(algorithmId: number): Promise<string>
{
  return new Promise<string>(async (resolve, reject) =>
  {
    const algorithms: ItemConfig[] = await items.get(algorithmId);
    if (algorithms.length === 0)
    {
      return reject('Algorithm not found.');
    }

    try
    {
      if (algorithms[0].meta !== undefined)
      {
        const query = JSON.parse(algorithms[0].meta as string)['query'];
        const inputMap = ESInterpreter.toInputMap(query.inputs);
        const queryTree = new ESInterpreter(query.tql, inputMap);
        if (queryTree.hasError())
        {
          return reject('Errors when interpreting the query:' + JSON.stringify(queryTree.getErrors()));
        }

        try
        {
          const queryString = queryTree.toCode({ replaceInputs: true });
          return resolve(queryString);
        }
        catch (e)
        {
          return reject('Error when the interpreter generates the code:' + JSON.stringify(e));
        }
      }
    }
    catch (e)
    {
      return reject('Malformed algorithm');
    }
  });
}

export async function getDBFromAlgorithm(algorithmId: number): Promise<number>
{
  return new Promise<number>(async (resolve, reject) =>
  {
    const algorithms: ItemConfig[] = await items.get(algorithmId);
    if (algorithms.length === 0)
    {
      return reject('Algorithm not found.');
    }

    try
    {
      if (algorithms[0].meta !== undefined)
      {
        return resolve(JSON.parse(algorithms[0].meta as string)['db']['id']);
      }
    }
    catch (e)
    {
      return reject('Malformed algorithm');
    }
  });
}

export function computeMaximumAlgorithmScore(query: string | object): number | undefined
{
  if (typeof query === 'object')
  {
    query = JSON.stringify(query);
  }

  const queryTree = new ESInterpreter(query);

  if (queryTree.hasError())
  {
    throw new Error('Errors when interpreting the query:' + JSON.stringify(queryTree.getErrors()));
  }

  const rootInfo: ESValueInfo = queryTree.rootValueInfo;
  // find all script clauses and see if they are the terrain script
  try {
    let maxToReturn;
    let minDepth;
    rootInfo.recursivelyVisit((element: ESValueInfo, depth: number) => {
      if (element.clause.clauseType === ESClauseType.ESScriptClause)
      {
        let max = 0;
        const clause = element.clause as ESScriptClause;
        if (clause.getScriptName(element) === 'Terrain.Score.PWL')
        {
          if (_.get(element.value, ['params', 'factors']) !== undefined)
          {
            const factors = element.value.params.factors;
            if (Array.isArray(factors))
            {
              for (const { weight } of factors)
              {
                if (typeof weight === 'number')
                {
                  max += weight;
                }
                else
                {
                  throw new Error('weight of Terrain.Score.PWL script malformed');
                }
              }
            }
          }
          else
          {
            throw new Error('Could not find factors in Terrain.Score.PWL script');
          }
          if (maxToReturn === undefined)
          {
            minDepth = depth;
            maxToReturn = max;
          }
          else if (depth < minDepth)
          {
            minDepth = depth;
            maxToReturn = max;
          }
        }
      }
      return true;
    });
    return maxToReturn;
  }
  catch (e)
  {
    throw new Error('Error while attempting to compute maximum algorithm score ' + String(e));
  }
}
