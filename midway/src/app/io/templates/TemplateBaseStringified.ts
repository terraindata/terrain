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

import ConfigType from '../../ConfigType';
import { TemplateBase } from './TemplateBase';

export class TemplateBaseStringified extends ConfigType
{
  public columnTypes: string = '';
  public dbid: number = -1;
  public dbname: string = '';
  public id?: number = undefined;
  public name: string = '';
  public originalNames: string = '';
  public persistentAccessToken?: string = undefined;
  public primaryKeyDelimiter: string = '';
  public primaryKeys: string = '';
  public tablename: string = '';
  public transformations: string = '';

  constructor(template: TemplateBase)
  {
    super();
    this.columnTypes = template.columnTypes !== undefined ? template.columnTypes.toString() : '';
    this.dbid = template.dbid;
    this.dbname = template.dbname;
    this.id = template.id;
    this.name = template.name;
    this.originalNames = template.originalNames !== undefined ? template.originalNames.toString() : '';
    this.persistentAccessToken = template.persistentAccessToken;
    this.primaryKeys = template.primaryKeys !== undefined ? template.primaryKeys.toString() : '';
    this.tablename = template.tablename;
    this.transformations = template.transformations !== undefined ? template.transformations.toString() : '';
  }
}
