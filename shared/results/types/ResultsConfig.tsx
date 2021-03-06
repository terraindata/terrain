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

// tslint:disable:variable-name max-classes-per-file member-access strict-boolean-expressions

import Util from 'app/util/Util';
import { List, Map } from 'immutable';
import { createRecordType } from 'shared/util/Classes';

export class Format
{
  type: string = '';
  template: string = '';
  showRaw: boolean = false;
  showField: boolean = false;
  config?: ResultsConfig = undefined; // For nested results
  set: (f: string, v: any) => Format;
  setIn: (f: string[], v: any) => Format;
}
const Format_Record = createRecordType(new Format(), 'FormatC');
export const _Format = (config?: any) =>
{
  config = Util.asJS(config);
  if (config && config['config'])
  {
    config['config'] = _ResultsConfig(config['config']);
  }
  return new Format_Record(config || {}) as any as Format;
};

export class ResultsConfig
{
  thumbnail: string = '';
  name: string = '';
  score: string = '';
  fields: List<string> = List([]);
  enabled: boolean = false;
  formats: IMMap<string, Format> = Map<string, Format>();
  primaryKeys: List<string> = List(['_id']);
  thumbnailWidth: number = 200;
  smallThumbnailWidth: number = 55;

  set: (f: string, v: any) => ResultsConfig;
  setIn: (f: string[], v: any) => ResultsConfig;
  toJS: () => any;
}
const ResultsConfig_Record = createRecordType(new ResultsConfig(), 'ResultsConfig');
export const _ResultsConfig = (config?: any) =>
{
  let conf = new ResultsConfig_Record(config || {}) as any as ResultsConfig;

  conf = conf.set('formats', Map<string, Format>(conf.formats));
  conf = conf
    .set('formats', conf.formats.map((format) => _Format(format)))
    .set('fields', List(conf.fields))
    .set('primaryKeys', List(conf.primaryKeys));

  return conf;
};
export const DefaultResultsConfig = _ResultsConfig();

export default ResultsConfig;
