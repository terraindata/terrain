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
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { MultiModal } from 'common/components/overlay/MultiModal';
import TemplateEditorDocumentsPreview from 'etl/templates/components/TemplateEditorDocumentsPreview';
import TemplateEditorFieldNode from 'etl/templates/components/TemplateEditorFieldNode';
import TemplateEditorFieldSettings from 'etl/templates/components/TemplateEditorFieldSettings';
import TemplateEditorPreviewControl from 'etl/templates/components/TemplateEditorPreviewControl';
import { TemplateEditorActions } from 'etl/templates/data/TemplateEditorRedux';
import
{
  _ElasticFieldSettings, _ExportTemplate, _TemplateField,
  ETLTemplate, TemplateEditorState, TemplateField,
} from 'etl/templates/TemplateTypes';
import './TemplateEditor.less';

import { SampleDocuments, treeFromDocument } from './TemporaryUtil';

const { List } = Immutable;

export interface Props
{
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

@Radium
class ETLExportDisplay extends TerrainComponent<Props>
{
  public componentDidMount()
  {
    let template = _ExportTemplate({
      templateId: 1,
      templateName: 'Test Template',
    });
    template = template.set('rootField', treeFromDocument(SampleDocuments[0]));
    this.props.act({
      actionType: 'loadTemplate',
      template,
    });

    this.props.act({
      actionType: 'setDocuments',
      documents: List(SampleDocuments),
    });
  }

  public setModalRequests(requests)
  {
    this.props.act({
      actionType: 'setModalRequests',
      requests,
    });
  }

  public renderEditorSection(showEditor: boolean = true)
  {
    const { template, documents, previewIndex } = this.props.templateEditor;
    const previewDocument = previewIndex < documents.size && documents.size > 0 ? documents.get(previewIndex) : null;

    if (!showEditor)
    {
      return <div className='template-editor-column main-document-column-hidden' />;
    }
    else
    {
      return (
        <div className='template-editor-column main-document-column'>
          <div className='template-editor-title-bar'>
            <div className='template-editor-title-bar-spacer' />
            <div className='template-editor-title'>
              Preview
            </div>
            <div className='template-editor-preview-control-spacer'>
              <TemplateEditorPreviewControl />
            </div>
          </div>
          <div
            className='template-editor'
            style={backgroundColor(Colors().bg3)}
            tabIndex={-1}
          >
            <div className='template-editor-full-area'>
              <TemplateEditorFieldNode
                keyPath={emptyList}
                field={template.rootField}
                canEdit={true}
                noInteract={false}
                preview={previewDocument}
                displayKeyPath={emptyList}
              />
            </div>
          </div>
          {this.renderSettingsSection()}
        </div>
      );
    }
  }

  public renderDocumentsSection()
  {
    return (
      <div className='template-editor-column preview-documents-column'>
        <div className='template-editor-title-bar' />
        <TemplateEditorDocumentsPreview />
      </div>
    );
  }

  public render()
  {
    const { previewIndex, documents } = this.props.templateEditor;
    const showEditor = previewIndex >= 0 && previewIndex < documents.size;
    return (
      <div className='template-editor-root-container'>
        <div className='template-editor-columns-area'>
          {this.renderEditorSection(showEditor)}
          {this.renderDocumentsSection()}
        </div>
        <MultiModal
          requests={this.props.templateEditor.modalRequests}
          setRequests={this.setModalRequests}
        />
      </div>
    );
  }

}

const emptyList = List([]);

export default Util.createContainer(
  ETLExportDisplay,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
