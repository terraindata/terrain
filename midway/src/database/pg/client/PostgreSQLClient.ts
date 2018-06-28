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

import * as pg from 'pg';
import pgErrors = require('pg-error-constants');

import { DatabaseControllerStatus } from '../../DatabaseControllerStatus';
import PostgreSQLConfig from '../PostgreSQLConfig';
import PostgreSQLController from '../PostgreSQLController';

import { IsolationLevel, TransactionHandle } from '../../../tasty/TastyDB';

/**
 * An client which acts as a selective isomorphic wrapper around
 * the postgres js API
 */
class PostgreSQLClient
{
  private controller: PostgreSQLController;
  private config: PostgreSQLConfig;
  private delegate: pg.Pool;
  private transactionClients: { [k: number]: pg.PoolClient } = {};
  private nextTransactionIndex = 0;

  constructor(controller: PostgreSQLController, config: PostgreSQLConfig)
  {
    this.controller = controller;
    this.config = config;

    this.controller.setStatus(DatabaseControllerStatus.CONNECTING);

    const client = new pg.Client(config);
    client.connect((connectErr: any) =>
    {
      // database does not exist, create a new one
      if (connectErr !== null && connectErr.code === '3D000')
      {
        // checkpoint the specified database, and connect to the system 'postgres' database to
        // be able to create the specified database
        const newDatabase = config.database;
        config.database = 'postgres';
        const newClient = new pg.Client(config);
        newClient.connect((connectErr2) =>
        {
          // restore the specified database
          config.database = newDatabase;
          if (connectErr2 != null)
          {
            throw connectErr2;
          }

          // create the specified database
          this.controller.log('Creating new database ', newDatabase);
          newClient.query('create database ' + newDatabase, (queryErr) =>
          {
            if (queryErr != null)
            {
              throw queryErr;
            }

            // create a pg connection pool
            this.delegate = this.createPool(config);
            newClient.end();
          });
        });
      }
      else
      {
        this.delegate = this.createPool(config);
      }
      client.end();
    });
  }

  public async isConnected(): Promise<boolean>
  {
    this.controller.log('PostgreSQLClient.isConnected');
    return new Promise<boolean>((resolve, reject) =>
    {
      this.controller.setStatus(DatabaseControllerStatus.CONNECTING);
      if (this.delegate === undefined)
      {
        return resolve(false);
      }

      this.delegate.connect((err: any, client, done) =>
      {
        if (err !== null && err !== undefined)
        {
          if (err.code === pgErrors.INVALID_PASSWORD
            || err.code === pgErrors.INVALID_AUTHORIZATION_SPECIFICATION)
          {
            this.controller.setStatus(DatabaseControllerStatus.ACCESS_DENIED);
          }
          else if (err.code === pgErrors.CONNECTION_EXCEPTION
            || err.code === pgErrors.CONNECTION_FAILURE
            || err.code === pgErrors.CONNECTION_DOES_NOT_EXIST)
          {
            this.controller.setStatus(DatabaseControllerStatus.CONN_TIMEOUT);
          }
          else
          {
            this.controller.setStatus(DatabaseControllerStatus.DISCONNECTED);
          }
          return resolve(false);
        }

        this.controller.setStatus(DatabaseControllerStatus.CONNECTED);
        resolve(true);
      });
    });
  }

  public query(queryString: string, handle?: TransactionHandle, params?: any[], callback?: any): pg.Query
  {
    if (handle !== undefined)
    {
      this.controller.log('PostgreSQLClient.query (transaction ' + handle.toString() + ')', queryString, params);
      return this.transactionClients[handle].query(queryString, params as any, callback);
    }
    else
    {
      this.controller.log('PostgreSQLClient.query', queryString, params);
      return this.delegate.query(queryString, params as any, callback);
    }
  }

  public async startTransaction(): Promise<TransactionHandle>
  {
    const client = await this.delegate.connect();
    const handle = this.nextTransactionIndex;
    this.nextTransactionIndex++;
    this.controller.log('PostgreSQLClient.startTransaction (transaction ' + handle.toString() + ')');
    this.transactionClients[handle] = client;
    return handle;
  }

  public async endTransaction(handle: TransactionHandle): Promise<void>
  {
    this.controller.log('PostgreSQLClient.endTransaction (transaction ' + handle.toString() + ')');
    this.transactionClients[handle].release();
    delete this.transactionClients[handle];
  }

  public end(callback: () => void): void
  {
    this.controller.log('PostgreSQLClient.end');
    this.controller.setStatus(DatabaseControllerStatus.DISCONNECTING);
    callback();
    this.delegate.end(() =>
    {
      this.controller.setStatus(DatabaseControllerStatus.DISCONNECTED);
    });
  }

  public getConfig(): PostgreSQLConfig
  {
    return this.config;
  }

  private createPool(config: PostgreSQLConfig)
  {
    const delegate = new pg.Pool(config);
    delegate.on('acquire', (connection: pg.PoolClient) =>
    {
      this.controller.log('PostgreSQLClient', 'Connection acquired ');
    });

    delegate.on('remove' as any, (connection: pg.PoolClient) =>
    {
      this.controller.log('PostgreSQLClient', 'Connection released ');
    });

    return delegate;
  }
}

export default PostgreSQLClient;
