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
// tslint:disable:max-classes-per-file no-unused-expression

export enum Integrations
{
  Sftp = 'Sftp',
  Http = 'Http',
  Fs = 'Fs',
  Mysql = 'Mysql',
  Postgresql = 'Postgresql',
  Magento = 'Magento',
  GoogleAPI = 'GoogleAPI',
  Mailchimp = 'Mailchimp',
}

export interface IntegrationConfigBase
{
  id?: number;
  name: string;
  type: Integrations;
  authConfig: any;
  connectionConfig: any;
  createdBy: number;
  lastModified: any;
  readPermission: any;
  writePermission: any;
  meta?: any;
}

export interface AuthConfigTypes
{
  Sftp: {
    key: string;
  };
  Http: {
    jwt: string;
  };
  Fs: {
    user: string;
  };
  Mysql: {
    password: string;
  };
  Postgresql: {
    password: string;
  };
  Magento: {
    apiKey: string;
  };
  GoogleAPI: {
    privateKey: string;
  };
  Mailchimp: {
    apiKey: string;
  };
}

export interface ConnectionConfigTypes
{
  Sftp: {
    ip: string;
    port: number;
  };
  Http: {
    url: string;
  };
  Fs: {};
  Mysql: {
    user: string;
    host: string;
    port: number;
    database: string;
  };
  Postgresql: {
    user: string;
    host: string;
    port: number;
    database: string;
  };
  Magento: {
    apiUser: string;
  };
  GoogleAPI: {
    email: string;
  };
  Mailchimp: {
    host: string;
  };
}

export type AuthTypes = keyof AuthConfigTypes;
export type AuthConfigType<key extends AuthTypes> = AuthConfigTypes[key];
export type ConnectionTypes = keyof ConnectionConfigTypes;
export type ConnectionConfigType<key extends ConnectionTypes> = ConnectionConfigTypes[key];

// Type wizardry
type IntegrationNamingAssertion = {
  [K in keyof typeof Integrations]: K;
};
Integrations as IntegrationNamingAssertion;

type AuthAssertTypesExhaustive = {
  [K in Integrations]: AuthConfigTypes[K];
};
type ConnectionAssertTypesExhaustive = {
  [K in Integrations]: ConnectionConfigTypes[K];
};
