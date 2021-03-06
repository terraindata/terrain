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
// tslint:disable:max-classes-per-file import-spacing
import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import * as Radium from 'radium';
import * as React from 'react';
import { withRouter } from 'react-router';

import * as download from 'downloadjs';
import { Algorithm, LibraryState } from 'library/LibraryTypes';
import TerrainStore from 'src/app/store/TerrainStore';
import Util from 'util/Util';

import ETLHelpers from './ETLHelpers';

import { ETLActions } from 'etl/ETLRedux';
import ETLRouteUtil from 'etl/ETLRouteUtil';
import TemplateEditor from 'etl/templates/components/TemplateEditor';
import { EngineProxy, FieldProxy } from 'etl/templates/EngineProxy';
import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { _FileConfig, _SinkConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import
{
  _ETLEdge, _ETLNode, _ETLProcess,
  _MergeJoinOptions, ETLEdge, ETLNode, ETLProcess, MergeJoinOptions,
} from 'shared/etl/immutable/ETLProcessRecords';
import { ETLTemplate, templateForBackend } from 'shared/etl/immutable/TemplateRecords';
import { SinksMap, SourcesMap } from 'shared/etl/immutable/TemplateRecords';
import { MigrationTestFile } from 'shared/etl/migrations/TemplateVersions';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes, NodeTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import DocumentsHelpers from './DocumentsHelpers';

class TestGenerator extends ETLHelpers
{
  /*
   *  Generates a file with the current documents, engine, and result
   */
  public saveTestCase(name: string = 'TemplateTest')
  {
    const engine = this._templateEditor.getCurrentEngine();
    const documents = this._templateEditor.uiState.documents;
    const inputs = [];
    const results = [];
    const templateString = templateForBackend(this._template);
    let pass = 0;
    let fail = 0;
    documents.forEach((doc) =>
    {
      try
      {
        const result = engine.transform(doc);
        results.push(result);
        pass++;
      }
      catch (e)
      {
        fail++;
        results.push('FAIL');
      }
      inputs.push(doc);
    });
    if (pass + fail === 0)
    {
      return 'No Documents To Test';
    }
    else
    {
      const overallFile: MigrationTestFile = {
        testName: name,
        numDocs: pass + fail,
        numFailed: fail,
        whichEdge: this._templateEditor.uiState.currentEdge,
        inputDocs: inputs,
        outputDocs: results,
        template: templateString,
      };

      download(JSON.stringify(overallFile, null, 2), name + '.json', 'application/json');

      return `Created Test File with ${pass + fail} documents`;
    }
  }
}

export default new TestGenerator(TerrainStore);
