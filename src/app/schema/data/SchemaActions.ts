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

// tslint:disable:no-shadowed-variable strict-boolean-expressions no-unused-expression
import * as _ from 'lodash';
import SchemaActionTypes from 'schema/data/SchemaActionTypes';
import * as SchemaParser from 'schema/data/SchemaParser';
import * as SchemaTypes from 'schema/SchemaTypes';
import Ajax from 'util/Ajax';
import AjaxM1 from 'util/AjaxM1';
import Util from 'util/Util';
import BackendInstance from '../../../database/types/BackendInstance';
import { ItemStatus } from '../../../items/types/Item';

const $ = (type: string, payload: any) =>
{
  return { type, payload };
};

const SchemaActions =
  {
    fetch:
    () => (dispatch) =>
    {
      dispatch($(SchemaActionTypes.fetch, {}));
      Ajax.getDbs(
        (dbs: object) =>
        {
          const m1Dbs: BackendInstance[] = [];
          const m2Dbs: BackendInstance[] = [];
          _.map((dbs as any),
            (db: BackendInstance) =>
            {
              if (db.source === 'm1')
              {
                m1Dbs.push(db);
              }
              else
              {
                m2Dbs.push(db);
              }
            },
          );
          // Group all m1Dbs under a server e.g. "Other Databases"
          // The m2Dbs are servers, so need to do parsing differently
          dispatch(SchemaActions.serverCount(Object.keys(m2Dbs).length));
          _.map((dbs as any),
            (db: BackendInstance) =>
              (db.source === 'm1' ? AjaxM1.schema_m1 : Ajax.schema)(
                db['id'],
                (schemaData, error) =>
                {
                  if (!error)
                  {
                    if (db.source === 'm2')
                    {
                      if (db['type'] === 'mysql')
                      {
                        // Don't support MySQL for now
                        // SchemaParser.parseMySQLDb(db, schemaData, SchemaActions.setServer);
                      }
                      else if (db['type'] === 'elastic')
                      {
                        SchemaParser.parseElasticDb(db, schemaData, SchemaActions.setServer, dispatch);
                      }
                    }
                    else
                    {
                      // Don't support old midway for now
                      // SchemaParser.parseMySQLDbs_m1(db, schemaData, SchemaActions.addDbToServer);
                    }
                  }
                },
                (error) =>
                {
                  // TODO consider handling individual DB errors
                }),
          );
        },
        (dbError) =>
        {
          dispatch(SchemaActions.error(JSON.stringify(dbError)));
        },
      );
    },

    serverCount:
    (serverCount: number) =>
      $(SchemaActionTypes.serverCount, { serverCount }),

    error:
    (error: string) =>
      $(SchemaActionTypes.error, { error }),

    setServer:
    (
      payload: SchemaTypes.SetServerActionPayload,
    ) =>
      $(SchemaActionTypes.setServer, payload),

    addDbToServer:
    (
      payload: SchemaTypes.AddDbToServerActionPayload,
    ) =>
      $(SchemaActionTypes.addDbToServer, payload),

    highlightId:
    (id: ID, inSearchResults: boolean) =>
      $(SchemaActionTypes.highlightId, {
        id,
        inSearchResults,
      }),

    selectId:
    (id: ID) =>
      $(SchemaActionTypes.selectId, {
        id,
      }),

  };

export default SchemaActions;
