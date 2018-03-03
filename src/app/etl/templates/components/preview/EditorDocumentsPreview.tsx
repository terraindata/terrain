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
// tslint:disable:no-var-requires import-spacing
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import UploadFileButton from 'etl/common/components/UploadFileButton';
import { _FileConfig, _SourceConfig, FileConfig, SourceConfig } from 'etl/EndpointTypes';
import DocumentsHelpers from 'etl/helpers/DocumentsHelpers';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateTypes';
import { getFileType, guessJsonFileOptions } from 'shared/etl/FileUtil';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes } from 'shared/etl/types/ETLTypes';

import DocumentPreview from './DocumentPreview';
import './EditorDocumentsPreview.less';
const { List } = Immutable;

export interface Props
{
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

@Radium
class EditorDocumentsPreview extends TerrainComponent<Props>
{
  public state: {
    file: File,
  } = {
      file: null,
    };

  public renderDocument(document, index)
  {
    return (
      <DocumentPreview index={index} key={index} />
    );
  }

  public renderNoDocuments()
  {
    const { template } = this.props.templateEditor;
    const source = template.sources.get('primary');
    let fixPrompt = null;
    if (source != null)
    {
      if (source.type === Sources.Upload)
      {
        fixPrompt = (
          <div className='no-documents-fix-prompt'>
            <UploadFileButton
              file={this.state.file}
              onChange={this.handleFileChange}
            />
          </div>
        );
      }
    }

    return (
      <div className='template-editor-no-documents'>
        <div className='no-documents-section'>
          Unable to Load Documents
        </div>
        {fixPrompt}
      </div>
    );
  }

  public render()
  {
    const { documents } = this.props.templateEditor.uiState;
    if (documents.size === 0)
    {
      return this.renderNoDocuments();
    }
    else
    {
      return (
        <div className='template-editor-documents-container'>
          <div className='documents-area' tabIndex={-1}>
            {documents.map(this.renderDocument)}
          </div>
        </div>
      );
    }
  }

  public onDocumentsFetchedFactory(newConfig: SourceConfig)
  {
    const { act, templateEditor } = this.props;
    return (documents: List<object>) =>
    {
      const newTemplate = templateEditor.template.setIn(['sources', 'primary'], newConfig);
      act({
        actionType: 'setTemplate',
        template: newTemplate,
      });
    };
  }

  public onDocumentsFetchError()
  {
    // todo figure out this error
  }

  public handleFileChange(file: File)
  {
    this.setState(file);
    const fileType = getFileType(file);
    const { act } = this.props;
    const newSourceConfig = _SourceConfig({
      type: Sources.Upload,
      fileConfig: _FileConfig({
        fileType,
      }),
    });
    DocumentsHelpers.fetchDocuments(newSourceConfig,
      file,
      this.onDocumentsFetchedFactory(newSourceConfig),
      this.onDocumentsFetchError,
    );
  }
}

export default Util.createContainer(
  EditorDocumentsPreview,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
