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

import * as Koa from 'koa';
import * as winston from 'winston';

import babelRegister = require('babel-register');
import convert = require('koa-convert');
import session = require('koa-generic-session');
import cors = require('kcors');
import srs = require('secure-random-string');

import ElasticConfig from '../database/elastic/ElasticConfig';
import ElasticController from '../database/elastic/ElasticController';

import MySQLConfig from '../database/mysql/MySQLConfig';
import MySQLController from '../database/mysql/MySQLController';

import SQLiteConfig from '../database/sqlite/SQLiteConfig';
import SQLiteController from '../database/sqlite/SQLiteController';

import * as Tasty from '../tasty/Tasty';
import './auth/Passport';
import CmdLineArgs from './CmdLineArgs';
import './Logging';
import Middleware from './Middleware';
import Router from './Router';

export let DB: Tasty.Tasty;

class App
{
  private DB: Tasty.Tasty;
  private app: Koa;

  constructor(config: any = CmdLineArgs)
  {
    this.DB = this.initializeDB(config.db.toLowerCase(), config.dsn.toLowerCase());
    DB = this.DB;

    this.app = new Koa();
    this.app.proxy = true;
    this.app.keys = [srs({ length: 256 })];
    this.app.use(cors());
    this.app.use(convert(session()));

    this.app.use(Middleware.bodyParser());
    this.app.use(Middleware.favicon('../src/app/favicon.ico'));
    this.app.use(Middleware.logger(winston));
    this.app.use(Middleware.responseTime());
    this.app.use(Middleware.passport.initialize());
    this.app.use(Middleware.passport.session());

    this.app.use(Router.routes());
  }

  public listen(port: number = CmdLineArgs.port)
  {
    return this.app.listen(port);
  }

  private dsnToConfig(type: string, dsn: string): SQLiteConfig | MySQLConfig | ElasticConfig
  {
    if (type === 'sqlite')
    {
      const config: SQLiteConfig = {
        filename: dsn,
      };
      return config;
    }
    else if (type === 'mysql')
    {
      // TODO: Convert DSN to a MySQLConfig object.
    }
    else if (type === 'elasticsearch' || type === 'elastic')
    {
      // TODO: Convert DSN to a ElasticConfig object.
    }
    else
    {
      throw new Error('Error parsing database connection parameters.');
    }
  }

  private initializeDB(type: string, dsn: string): Tasty.Tasty
  {
    winston.info('Initializing system database { type: ' + type + ' dsn: ' + dsn + ' }');
    if (type === 'sqlite')
    {
      const config = this.dsnToConfig(type, dsn) as SQLiteConfig;
      const controller = new SQLiteController(config, 0, 'NodewaySQLite');
      return controller.getTasty();
    }
    else if (type === 'mysql')
    {
      const config = this.dsnToConfig(type, dsn) as MySQLConfig;
      const controller = new MySQLController(config, 0, 'NodewayMySQL');
      return controller.getTasty();
    }
    else if (type === 'elasticsearch' || type === 'elastic')
    {
      const config = this.dsnToConfig(type, dsn) as ElasticConfig;
      const controller = new ElasticController(config, 0, 'NodewayElastic');
      return controller.getTasty();
    }
    else
    {
      throw new Error('Error initializing Nodeway system database.');
    }
  }
}

export default App;

// TODO list
// - import HTML rather than writing directly inline
// - kick off webpack dev server when in DEV mode (and kill it when server stops)
// - difference between prod and dev mode: prod references bundle.js static file
