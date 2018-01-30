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
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { TemplateEditorActions } from 'etl/templates/data/TemplateEditorRedux';
import { _TemplateField, TemplateEditorState, TemplateField } from 'etl/templates/TemplateTypes';
import TemplateEditorFieldNode from './TemplateEditorFieldNode';

import './TemplateEditorDocumentsPreview.less';
const { List } = Immutable;

export interface Props
{
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

@Radium
class TemplateEditorDocumentsPreview extends TerrainComponent<Props>
{
  constructor(props)
  {
    super(props);
    this.handleDocumentClickedFactory = _.memoize(this.handleDocumentClickedFactory);
  }

  public renderDocument(document: object, index: number)
  {
    const { previewIndex, documents, template } = this.props.templateEditor;
    const border = index === previewIndex ?
      borderColor(Colors().inactiveHover, Colors().inactiveHover) :
      borderColor('rgba(0,0,0,0)', Colors().activeHover);
    const previewDocument = index < documents.size && documents.size > 0 ? documents.get(index) : null;
    return (
      <div
        className='preview-document'
        key={index}
        style={_.extend({}, backgroundColor(Colors().bg3), border)}
        onClick={this.handleDocumentClickedFactory(index)}
      >
        <div className='preview-document-spacer'>
          <TemplateEditorFieldNode
            keyPath={List([])}
            field={template.rootField}
            canEdit={false}
            preview={previewDocument}
          />
        </div>
        <div className='preview-document-fader' />
      </div>
    );
    /*<div className='preview-document-index-label'> {index + 1} </div>*/
  }

  public render()
  {
    return (
      <div className='template-editor-documents-container'>
        <div className='documents-area' tabIndex={-1}>
          {this.props.templateEditor.documents.map(this.renderDocument)}
        </div>
      </div>
    );
  }

  // memoized
  public handleDocumentClickedFactory(index): () => void
  {
    return () =>
    {
      this.props.act({
        actionType: 'setPreviewIndex',
        index,
      });
    };
  }

}

export default Util.createContainer(
  TemplateEditorDocumentsPreview,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
