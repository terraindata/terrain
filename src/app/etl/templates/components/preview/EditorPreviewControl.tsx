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
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { Colors, fontColor } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateEditorTypes';

import './EditorPreviewControl.less';
const ArrowIcon = require('images/icon_arrow.svg');

export interface Props
{
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

@Radium
class EditorPreviewControl extends TerrainComponent<Props>
{
  public render()
  {
    const { templateEditor } = this.props;
    const { previewIndex } = templateEditor.uiState;
    const documents = templateEditor.getPreviewDocuments();
    const indexSelectorText = documents.size > 0 ?
      `${previewIndex + 1} of ${documents.size}` :
      'no preview available';

    const canIncrement = documents.size > 0 && previewIndex + 1 < documents.size;
    const canDecrement = documents.size > 0 && previewIndex > 0;

    const leftArrowStyle = canDecrement ? enabledArrowStyle : disabledArrowStyle;
    const rightArrowStyle = canIncrement ? enabledArrowStyle : disabledArrowStyle;

    return (
      <div className='template-editor-preview-control'>
        <div className='preview-control-row' >
          <div
            className='preview-control-arrow-styler'
            style={leftArrowStyle}
            onClick={this.handleDecrementDocument}
            key='left-arrow'
          >
            <ArrowIcon className='preview-control-arrow-icon arrow-icon-left' />
          </div>
          <div className='preview-control-document-number' style={fontColor(Colors().text2)}>
            {indexSelectorText}
          </div>
          <div
            className='preview-control-arrow-styler'
            style={rightArrowStyle}
            onClick={this.handleIncrementDocument}
            key='right-arrow'
          >
            <ArrowIcon className='preview-control-arrow-icon arrow-icon-right' />
          </div>
        </div>
      </div>
    );
  }

  public handleDecrementDocument()
  {
    const { templateEditor } = this.props;
    const { previewIndex } = templateEditor.uiState;
    const documents = templateEditor.getPreviewDocuments();

    if (previewIndex > 0)
    {
      this.props.act({
        actionType: 'closeSettings',
      });
      this.props.act({
        actionType: 'setDisplayState',
        state: {
          previewIndex: previewIndex - 1,
        },
      });
    }
  }

  public handleIncrementDocument()
  {
    const { templateEditor } = this.props;
    const { previewIndex } = templateEditor.uiState;
    const documents = templateEditor.getPreviewDocuments();

    if (previewIndex + 1 < documents.size)
    {
      this.props.act({
        actionType: 'closeSettings',
      });
      this.props.act({
        actionType: 'setDisplayState',
        state: {
          previewIndex: previewIndex + 1,
        },
      });
    }
  }
}

const enabledArrowStyle = _.extend({}, fontColor(Colors().text3, Colors().text2));
const disabledArrowStyle = _.extend({}, fontColor(Colors().text3, Colors().text3));

export default Util.createContainer(
  EditorPreviewControl,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
