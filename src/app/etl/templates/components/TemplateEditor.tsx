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
import { backgroundColor, Colors, fontColor } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { MultiModal } from 'common/components/overlay/MultiModal';
import TemplateEditorFieldNode from 'etl/templates/components/TemplateEditorFieldNode';
import { TemplateEditorActions } from 'etl/templates/data/TemplateEditorRedux';
import
{
  _ExportTemplate,
  _TemplateField,
  ELASTIC_TYPES,
  ETLTemplate,
  TEMPLATE_TYPES,
  TemplateEditorState,
} from 'etl/templates/TemplateTypes';
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
  public componentDidMount()
  {
    let template = _ExportTemplate({
      templateId: 1,
      templateName: 'Test Template',
    });
    template = template.setIn(['rootField', 'children', 0],
      _TemplateField({ name: 'productId', type: ELASTIC_TYPES.TEXT, isPrimaryKey: true, isAnalyzed: false }));
    template = template.setIn(['rootField', 'children', 1],
      _TemplateField({ name: 'product_info', type: ELASTIC_TYPES.NESTED }));
    template = template.setIn(['rootField', 'children', 1, 'children', 0],
      _TemplateField({ name: 'value' }));
    template = template.setIn(['rootField', 'children', 1, 'children', 1],
      _TemplateField({ name: 'other_value', type: ELASTIC_TYPES.LONG }));

    this.props.act({
      actionType: 'loadTemplate',
      template,
    });
  }

  public setModalRequests(requests)
  {
    this.props.act({
      actionType: 'setModalRequests',
      requests,
    });
  }

  public render()
  {
    const template: ETLTemplate = this.props.templateEditor.template;
    const titleTypeText = template.type === TEMPLATE_TYPES.IMPORT ? 'Import' : 'Export';
    return (
      <div className='template-editor-root-container'>
        <div className='template-editor-title-bar'>
          <div className='template-editor-editor-title'> Edit {titleTypeText} Template </div>
          <div className='template-editor-preview-title'> {titleTypeText} Preview </div>
        </div>
        <TemplateEditorFieldNode
          keyPath={List([])}
          field={template.rootField}
          canEdit={true}
        />
        <MultiModal
          requests={this.props.templateEditor.modalRequests}
          setRequests={this.setModalRequests}
        />
      </div>
    );
  }
}

export default Util.createContainer(
  ETLExportDisplay,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
