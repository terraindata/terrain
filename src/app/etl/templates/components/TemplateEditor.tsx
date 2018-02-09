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

import { recordForSave } from 'src/app/Classes';

import { MultiModal } from 'common/components/overlay/MultiModal';
import TemplateEditorDocumentsPreview from 'etl/templates/components/TemplateEditorDocumentsPreview';
import TemplateEditorFieldNode from 'etl/templates/components/TemplateEditorFieldNode';
import TemplateEditorFieldSettings from 'etl/templates/components/TemplateEditorFieldSettings';
import TemplateEditorPreviewControl from 'etl/templates/components/TemplateEditorPreviewControl';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';

import { _TemplateField, ElasticFieldSettings, TemplateField } from 'etl/templates/FieldTypes';
import { _ExportTemplate, ETLTemplate, TemplateEditorState } from 'etl/templates/TemplateTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

import { createTreeFromEngine, NoArrayDocuments, testSerialization, treeFromDocument } from '../TemplateUtil';
import './TemplateEditor.less';

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

  public initFromDocs(documents, name = 'No Title')
  {
    if (!Array.isArray(documents) || documents.length === 0)
    {
      return;
    }
    const firstDoc = documents[0];
    const engine = new TransformationEngine(firstDoc);
    const rootField = createTreeFromEngine(engine);

    const template = _ExportTemplate({
      templateId: -1,
      templateName: name,
      transformationEngine: engine,
      rootField,
    });

    // this.props.act({
    //   actionType: 'loadTemplate',
    //   template: testSerialization(template),
    // });
    this.props.act({
      actionType: 'loadTemplate',
      template,
    });

    this.props.act({
      actionType: 'setDocuments',
      documents: List(documents),
    });
  }

  public testInit()
  {
    this.initFromDocs(NoArrayDocuments);
  }

  public componentDidMount()
  {
    this.testInit();
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
    const transformedPreviewDocument = template.transformationEngine.transform(previewDocument);
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
                preview={transformedPreviewDocument}
                displayKeyPath={emptyList}
              />
            </div>
          </div>
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

  public renderTopBar()
  {
    const itemStyle = [backgroundColor(Colors().fadedOutBg, Colors().darkerHighlight)];
    return (
      <div className='template-editor-top-bar'>
        <div className='editor-top-bar-item' style={itemStyle} key='undo'>
          Undo
        </div>
        <div className='editor-top-bar-item' style={itemStyle} key='redo'>
          Redo
        </div>
        <div className='editor-top-bar-item' style={itemStyle} key='save'>
          Save
        </div>
      </div>
    );
  }

  public render()
  {
    const { previewIndex, documents } = this.props.templateEditor;
    const showEditor = previewIndex >= 0 && previewIndex < documents.size;
    return (
      <div className='template-editor-root-container'>
        <div className='template-editor-width-spacer'>
          {this.renderTopBar()}
          <div className='template-editor-columns-area'>
            {this.renderEditorSection(showEditor)}
            {this.renderDocumentsSection()}
          </div>
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
