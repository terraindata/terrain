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

import { TemplateEditorActions } from 'etl/templates/data/TemplateEditorRedux';
import { _TemplateField, TemplateEditorState, TemplateField } from 'etl/templates/TemplateTypes';
import TemplateEditorFieldNode from './TemplateEditorFieldNode';

import './TemplateEditorDocumentsPreview.less';
const { List } = Immutable;
const Color = require('color');
const ShowIcon = require('images/icon_search.svg');

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
    this.getVeilStyle = _.memoize(this.getVeilStyle, (bg: string, active: boolean) => active ? bg : bg + '!');
  }

  public renderDocument(document: object, index: number)
  {
    const { previewIndex, documents, template } = this.props.templateEditor;
    const border = index === previewIndex ?
      borderColor(Colors().inactiveHover, Colors().inactiveHover) :
      borderColor('rgba(0,0,0,0)', Colors().activeHover);
    const previewDocument = index < documents.size && documents.size > 0 ? documents.get(index) : null;
    const bgColor = Colors().bg3;
    return (
      <div
        className='preview-document'
        key={index}
        style={_.extend({}, backgroundColor(bgColor), border)}
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
        <div
          key={`fader ${index}`}
          className='preview-document-fader'
          style={this.getFaderStyle(bgColor)}
        />
        <div
          key={`veil ${index}`}
          className='preview-document-veil'
          style={this.getVeilStyle(bgColor, index === previewIndex)}
        >
          <ShowIcon className='preview-document-icon' width='64px' />
        </div>
      </div>
    );
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

  public getVeilStyle(bg: string, active: boolean)
  {
    const hoverCol = scaleAlpha(bg, 0.5);
    const defaultCol = scaleAlpha(bg, 0.0);
    if (active)
    {
      const activeCol = scaleAlpha(Colors().active, 0.7);
      return [backgroundColor(hoverCol, hoverCol), fontColor(activeCol, activeCol)];
    }
    else
    {
      const activeCol = scaleAlpha(Colors().inactiveHover, 0.5);
      return [backgroundColor(defaultCol, hoverCol), fontColor('rgba(0,0,0,0)', activeCol)];
    }
  }

  public getFaderStyle(bg: string)
  {
    const colObj = Color(bg);
    const minFade = colObj.alpha(colObj.alpha());
    const maxFade = colObj.alpha(0);
    return getStyle('background', `linear-gradient(${maxFade.toString()}, ${minFade.toString()})`);
  }
}

function scaleAlpha(color, factor)
{
  const colObj = Color(color);
  return colObj.alpha(colObj.alpha() * factor).toString();
}

export default Util.createContainer(
  TemplateEditorDocumentsPreview,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
