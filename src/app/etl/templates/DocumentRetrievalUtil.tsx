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
// tslint:disable:import-spacing
import * as Immutable from 'immutable';
import * as _ from 'lodash';

import { FileConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import
{
  _ElasticFieldSettings, _TemplateField,
  ElasticFieldSettings, TemplateField,
} from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import
{
  _TemplateEditorState,
  EditorDisplayState,
  ETLTemplate,
  TemplateEditorState,
} from 'etl/templates/TemplateTypes';
import { Algorithm } from 'library/LibraryTypes';
import ESInterpreter from 'shared/database/elastic/parser/ESInterpreter';
import { MidwayError } from 'shared/error/MidwayError';
import { getSampleRows } from 'shared/etl/FileUtil';

import { toInputMap } from 'src/blocks/types/Input';
import { AllBackendsMap } from 'src/database/AllBackends';
import MidwayQueryResponse from 'src/database/types/MidwayQueryResponse';

import { _Query, Query, queryForSave } from 'src/items/types/Query';
import { Ajax } from 'util/Ajax';

const { List, Map } = Immutable;

export function fetchDocumentsFromAlgorithm(
  algorithm: Algorithm,
  onLoad: (documents: List<object>) => void,
  onError: (ev: string | MidwayError) => void,
  limit?: number,
)
{
  let query = algorithm.query;
  query = query.set('parseTree', new ESInterpreter(query.tql, toInputMap(query.inputs)));

  const eql = AllBackendsMap[query.language].parseTreeToQueryString(
    query,
    {
      replaceInputs: true,
    },
  );
  const handleResponse = (response: MidwayQueryResponse) =>
  {
    let hits = List(_.get(response, ['result', 'hits', 'hits'], []))
      .map((doc, index) => doc['_source']);
    if (limit != null && limit > 0)
    {
      hits = hits.slice(0, limit);
    }
    onLoad(hits.toList());
  };

  const { queryId, xhr } = Ajax.query(
    eql,
    algorithm.db,
    handleResponse,
    onError,
  );
}

export function fetchDocumentsFromFile(
  file: File,
  config: FileConfig,
  onLoad: (documents: List<object>) => void,
  onError: (ev: string) => void,
  limit?: number,
)
{
  const handleResponse = (response: object[]) =>
  {
    onLoad(List(response));
  };
  getSampleRows(
    file,
    handleResponse,
    onError,
    limit,
    config.toJS(),
  );
}
