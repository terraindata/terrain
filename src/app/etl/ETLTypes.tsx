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
// tslint:disable:import-spacing max-classes-per-file

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import { makeConstructor, makeExtendedConstructor, recordForSave, WithIRecord } from 'src/app/Classes';

import { TemplateTypes } from 'shared/etl/TemplateTypes';

class ETLStateC
{

}
export type ETLState = WithIRecord<ETLStateC>;
export const _ETLState = makeConstructor(ETLStateC);

export enum ViewState
{
  Start,
  Import,
  Export,
  NewExport,
  PickExportTemplate,
  PickExportAlgorithm,
  PickExportSource,
  PickExportDestination,
  ExportDestination,
  NewImport,
  PickImportTemplate,
  PickLocalFile,
  PickImportSource,
  ImportDestination,
  PickDatabase,
  PickImportDestination,
  Finish,
}
const V = ViewState; // just an alias to make below easier to read
const ViewGraph = {
  [V.Start]: [ V.Import, V.Export ],
  // export
  [V.Export]: [ V.NewExport, V.PickExportTemplate ],
  [V.PickExportTemplate]: [ V.Finish ],
  [V.NewExport]: [ V.PickExportAlgorithm, V.PickExportSource /* custom */ ],
  [V.PickExportAlgorithm]: [ V.ExportDestination ],
  [V.PickExportSource]: [ V.ExportDestination ],
  [V.ExportDestination]: [ V.PickExportDestination, V.Finish /*local*/ ],
  [V.PickExportDestination]: [ V.Finish ],
  // import
  [V.Import]: [ V.NewImport, V.PickImportTemplate ],
  [V.PickImportTemplate]: [ V.Finish ],
  [V.NewImport]: [ V.PickLocalFile, V.PickImportSource ],
  [V.PickLocalFile]: [ V.ImportDestination ],
  [V.PickImportSource]: [ V.ImportDestination ],
  [V.ImportDestination]: [ V.PickDatabase, V.PickImportDestination /* custom */ ],
  [V.PickDatabase]: [ V.Finish ],
  [V.PickImportDestination]: [ V.Finish ],
};

class WalkthroughStateC
{
  public Step: ViewState = ViewState.Start;
  public type: TemplateTypes = null;
  public source: any = null;
  public sink: any = null;
  public chosenTemplateId: ID = -1;
}
export type WalkThroughState = WithIRecord<WalkThroughStateC>;
export const _WalkThroughState = makeConstructor(WalkThroughStateC);
