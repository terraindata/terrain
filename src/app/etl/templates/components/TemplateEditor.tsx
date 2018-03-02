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

import MidwayError from 'shared/error/MidwayError';

import { MultiModal } from 'common/components/overlay/MultiModal';
import { ETLActions } from 'etl/ETLRedux';
import ETLRouteUtil from 'etl/ETLRouteUtil';
import { ETLState } from 'etl/ETLTypes';
import EditorDocumentsPreview from 'etl/templates/components/preview/EditorDocumentsPreview';
import EditorPreviewControl from 'etl/templates/components/preview/EditorPreviewControl';
import RootFieldNode from 'etl/templates/components/RootFieldNode';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { ETLTemplate, TemplateEditorState } from 'etl/templates/TemplateTypes';
import './TemplateEditor.less';

const { List } = Immutable;

export interface Props
{
  // below from container
  templateEditor?: TemplateEditorState;
  editorAct?: typeof TemplateEditorActions;
  etl?: ETLState;
  etlAct?: typeof ETLActions;
}

@Radium
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
    if (previewDocument == null)
    {
      return {};
    }
    return engine.transform(previewDocument);
  }

  public getDocument()
  {
    const { template } = this.props.templateEditor;
    const { documents, previewIndex, engineVersion } = this.props.templateEditor.uiState;
    const previewDocument = previewIndex < documents.size && documents.size > 0 ? documents.get(previewIndex) : null;
    return this.transformDocument(previewDocument, template.transformationEngine, engineVersion);
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
            <div className='template-editor-title-bar-spacer' />
            <div className='template-editor-title'>
              Preview
            </div>
            <div className='template-editor-preview-control-spacer'>
              <EditorPreviewControl />
            </div>
          </div>
          <div
            className='template-editor'
            style={[
              backgroundColor(Colors().bg3),
              getStyle('boxShadow', `1px 1px 5px ${Colors().boxShadow}`),
            ]}
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
    return (
      <div className='template-editor-column preview-documents-column'>
        <div className='template-editor-title-bar' />
        <EditorDocumentsPreview />
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
        <div
          className='editor-top-bar-item'
          style={itemStyle}
          onClick={this.handleSaveClicked}
          key='save'
        >
          Save
        </div>
      </div>
    );
  }

  public render()
  {
    const { previewIndex, documents, modalRequests } = this.props.templateEditor.uiState;
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
          requests={modalRequests}
          setRequests={this.setModalRequests}
        />
      </div>
    );
  }

  public handleSaveClicked()
  {
    const { template } = this.props.templateEditor;
    const { etlAct, editorAct } = this.props;

    const handleLoad = (savedTemplates: List<ETLTemplate>) =>
    {
      if (savedTemplates.size > 0)
      {
        const savedTemplate = savedTemplates.get(0);
        editorAct({
          actionType: 'setTemplate',
          template: savedTemplate,
        });
        editorAct({
          actionType: 'rebuildFieldMap',
        });
        if (savedTemplate.id !== template.id) // if its a save, or something weird happens
        {
          ETLRouteUtil.gotoEditTemplate(savedTemplate.id);
        }
      }
      else
      {
        // todo handle error
      }
    };
    const handleError = (ev) =>
    {
      // TODO
    };

    let templateForSave = template;
    if (template.id === -1) // then its a new template
    {
      // temp stuff get rid of this TODO
      const randstring = Math.random().toString(36).substring(2, 7);
      templateForSave = templateForSave.set('templateName', `Test Template${randstring}`);

      etlAct({
        actionType: 'createTemplate',
        template: templateForSave,
        onLoad: handleLoad,
        onError: handleError,
      });
    }
    else
    {
      etlAct({
        actionType: 'saveTemplate',
        template: templateForSave,
        onLoad: handleLoad,
        onError: handleError,
      });
    }
  }
}

const emptyList = List([]);

export default Util.createContainer(
  TemplateEditor,
  [
    ['templateEditor'],
    ['etl'],
  ],
  {
    editorAct: TemplateEditorActions,
    etlAct: ETLActions,
  },
);
