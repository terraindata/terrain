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

import { MultiModal } from 'common/components/overlay/MultiModal';
import { ETLActions } from 'etl/ETLRedux';
import AddFieldModal from 'etl/templates/components/AddFieldModal';
import DocumentsPreviewColumn from 'etl/templates/components/columns/DocumentsPreviewColumn';
import EditorColumnBar from 'etl/templates/components/columns/EditorColumnBar';
import { EndpointsColumn, StepsColumn } from 'etl/templates/components/columns/OptionsColumn';
import ExtractFieldModal from 'etl/templates/components/ExtractFieldModal';
import MoveFieldModal from 'etl/templates/components/MoveFieldModal';
import EditorPreviewControl from 'etl/templates/components/preview/EditorPreviewControl';
import RootFieldNode from 'etl/templates/components/RootFieldNode';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { ColumnOptions, columnOptions, TemplateEditorState } from 'etl/templates/TemplateEditorTypes';
import { ETLTemplate } from 'etl/templates/TemplateTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';

import EditorActionsSection from './EditorActionsSection';
import EditorColumnActionsSection from './EditorColumnActionsSection';

import './TemplateEditor.less';

import Quarantine from 'util/RadiumQuarantine';

const { List } = Immutable;

export interface Props
{
  onSave: (template: ETLTemplate, isSaveAs: boolean) => void;
  onSwitchTemplate: (template: ETLTemplate) => void;
  onExecuteTemplate: (template: ETLTemplate) => void;
  // below from container
  templateEditor?: TemplateEditorState;
  editorAct?: typeof TemplateEditorActions;
}

class TemplateEditor extends TerrainComponent<Props>
{
  constructor(props)
  {
    super(props);
    this.transformDocument = memoizeOne(this.transformDocument);
  }

  public setModalRequests(requests)
  {
    this.props.editorAct({
      actionType: 'setModalRequests',
      requests,
    });
  }

  // gets memoizedOne'd
  public transformDocument(previewDocument, engine, engineVersion)
  {
    if (previewDocument == null || engine == null)
    {
      return {};
    }
    try
    {
      return engine.transform(previewDocument);
    }
    catch (e)
    {
      return {};
    }

  }

  public getDocument()
  {
    const { templateEditor } = this.props;
    const { previewIndex, engineVersion } = templateEditor.uiState;
    const documents = templateEditor.getPreviewDocuments();
    const previewDocument = previewIndex < documents.size && documents.size > 0 ? documents.get(previewIndex) : null;
    return this.transformDocument(previewDocument, templateEditor.getCurrentEngine(), engineVersion);
  }

  public renderTitleActions()
  {
    return (
      <EditorColumnActionsSection />
    );
  }

  public renderEditorSection(showEditor: boolean = true)
  {
    const transformedPreviewDocument = this.getDocument();
    if (!showEditor)
    {
      return <div className='template-editor-column main-document-column-hidden' />;
    }
    else
    {
      return (
        <div className='template-editor-column main-document-column'>
          <div className='template-editor-title-bar'>
            {this.renderTitleActions()}
            <div className='template-editor-preview-control-spacer'>
              <EditorPreviewControl />
            </div>
          </div>
          <div
            className='template-editor'
            style={_.extend({},
              backgroundColor(Colors().bg3),
              getStyle('boxShadow', `1px 1px 5px ${Colors().boxShadow}`),
            )}
            tabIndex={-1}
          >
            <div className='template-editor-full-area'>
              <RootFieldNode
                preview={transformedPreviewDocument}
                noInteract={false}
              />
            </div>
          </div>
        </div>
      );
    }
  }

  public renderDocumentsSection()
  {
    const { columnState } = this.props.templateEditor.uiState;
    return (
      <div className='template-editor-column preview-documents-column'>
        <div className='template-editor-title-bar'>
          <EditorColumnBar />
        </div>
        {columnState === ColumnOptions.Preview ? <DocumentsPreviewColumn /> : null}
        {columnState === ColumnOptions.Endpoints ? <EndpointsColumn /> : null}
        {columnState === ColumnOptions.Steps ? <StepsColumn /> : null}
      </div>
    );
  }

  public renderTopBar()
  {
    return (
      <EditorActionsSection
        onSave={this.props.onSave}
        onSwitchTemplate={this.props.onSwitchTemplate}
        onExecuteTemplate={this.props.onExecuteTemplate}
      />
    );
  }

  public render()
  {
    const {
      previewIndex,
      modalRequests,
      moveFieldId,
      addFieldId,
    } = this.props.templateEditor.uiState;

    const showEditor = previewIndex >= 0;
    const fieldModalProps = {
      canEdit: true,
      noInteract: false,
      preview: null,
      displayKeyPath: emptyList,
    };

    return (
      <div className='template-editor-root-container'>
        <div style={{ display: 'flex', width: '100%' }}>
          {this.renderTopBar()}
        </div>
        <div className='template-editor-width-spacer'>
          <div className='template-editor-columns-area'>
            {this.renderEditorSection(showEditor)}
            {this.renderDocumentsSection()}
          </div>
        </div>
        <MoveFieldModal
          fieldId={moveFieldId}
          {...fieldModalProps}
        />
        <AddFieldModal
          fieldId={addFieldId}
          {...fieldModalProps}
        />
        <ExtractFieldModal />
        <MultiModal
          requests={modalRequests}
          setRequests={this.setModalRequests}
        />
      </div>
    );
  }
}

const emptyList = List([]);

export default Util.createContainer(
  TemplateEditor,
  ['templateEditor'],
  {
    editorAct: TemplateEditorActions,
  },
);
