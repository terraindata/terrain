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
// tslint:disable:import-spacing max-classes-per-file strict-boolean-expressions

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;

import { MidwayError } from 'shared/error/MidwayError';
import { AllBackendsMap } from 'src/database/AllBackends';
import BackendInstance from 'src/database/types/BackendInstance';
import MidwayQueryResponse from 'src/database/types/MidwayQueryResponse';
import { _Query, Query, queryForSave } from 'src/items/types/Query';
import { Ajax } from 'util/Ajax';

import { makeConstructor, makeExtendedConstructor, recordForSave, WithIRecord } from 'src/app/Classes';

abstract class QueryManagerC
{
  protected abstract set: (k, v) => QueryManagerC;
  private readonly queryPending: boolean = false;
  private readonly queryId: ID = null;
  private readonly xhr: XMLHttpRequest = null;
  private readonly onSelfChange: (newQueryManager) => void = null;

  public isQueryPending()
  {
    return this.queryPending;
  }

  public abortQuery(suppressChanges = false): ((self) => QueryManagerC) | null // returns a side effect function if suppress is true
  {
    if (this.xhr != null)
    {
      this.xhr.abort();
    }
    const sideEffect = (self) => self.set('queryPending', false).set('xhr', null);

    if (suppressChanges)
    {
      return sideEffect;
    }
    else
    {
      this.onSelfChange(sideEffect(this));
      return null;
    }
  }

  public sendQuery(query, db, responseHandler, errorHandler)
  {
    const delayedFn = this.abortQuery(true);
    const eql = AllBackendsMap[query.language].parseTreeToQueryString(
      query,
      {
        replaceInputs: true,
      },
    );

    const { queryId, xhr } = Ajax.query(
      eql,
      db,
      responseHandler,
      errorHandler,
    );

    const newQueryManager = delayedFn(this).set('queryId', queryId)
      .set('xhr', xhr).set('queryPending', true);
    this.onSelfChange(newQueryManager);
  }
}
export type QueryManager = WithIRecord<QueryManagerC>;
export const _QueryManager = makeExtendedConstructor(QueryManagerC, true);
