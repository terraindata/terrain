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
// tslint:disable:no-var-requires max-classes-per-file

import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { instanceFnDecorator } from 'shared/util/Classes';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';
const { List, Map } = Immutable;

import Modal from 'common/components/Modal';
import { tooltip } from 'common/components/tooltip/Tooltips';
import Quarantine from 'util/RadiumQuarantine';

import { DynamicForm } from 'common/components/DynamicForm';
import GraphHelpers from 'etl/helpers/GraphHelpers';
import NestedView from 'etl/templates/components/field/NestedView';
import { TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateEditorTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';

import * as Utils from 'shared/transformations/util/EngineUtils';

const AddIcon = require('images/icon_add.svg');
import './TemplateEditorField.less';

interface Props
{
  path: KeyPath;
  preview: any;
  isRoot?: boolean;
  // below from container
  // templateEditor?: TemplateEditorState;
  editorAct?: typeof TemplateEditorActions;
}

interface FormState
{
  name: string;
  index?: string | number;
}

class UnrecognizedField extends TerrainComponent<Props>
{
  public state: {
    hovered: boolean;
  } = {
    hovered: false,
  };

  public renderTypeIcon()
  {
    return (
      <div
        className='unrecognized-field-type-icon'
      >
        ?
      </div>
    );
  }

  public renderPreviewValue()
  {
    return (
      <div
        className={classNames({
          'field-preview-value': true,
        })}
      >
        {this.props.preview}
      </div>
    );
  }

  public renderRow()
  {
    const labelStyle = fontColor(Colors().text3);
    return (
      <div
        className='editor-field-main-row'
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        <div className='template-editor-field-block'>
          <div className='field-preview-row' style={labelStyle}>
            <Quarantine>
              <div
                className='unrecognized-field-add'
                onClick={this.handleAddClicked}
                style={[
                  {
                    width: this.props.isRoot ? '76px' : '52px',
                    opacity: this.state.hovered ? 1.0 : 0,
                  },
                  fontColor(Colors().text3, Colors().text2),
                ]}
              >
                <AddIcon/>
              </div>
            </Quarantine>
            <div className='field-preview-label-group'>
              {
                this.renderTypeIcon()
              }
              <div
                className={classNames({
                  'field-preview-label': true,
                })}
                key='label'
              >
                {this.props.path.last()}
              </div>
            </div>
            {
              this.renderPreviewValue()
            }
          </div>
        </div>
      </div>
    );
  }

  public render()
  {
    return (
      <NestedView
        content={this.renderRow()}
        open={false}
        onToggle={noOp}
        onDrop={noOp}
        hideControls={true}
        keyPath={this.props.path}
        canDrag={false}
      />
    );
  }

  public handleAddClicked()
  {
    this.props.editorAct({
      actionType: 'setDisplayState',
      state: {
        addUnrecognizedPath: this.props.path,
      },
    });
  }

  public handleMouseEnter()
  {
    this.setState({
      hovered: true,
    });
  }

  public handleMouseLeave()
  {
    this.setState({
      hovered: false,
    });
  }
}

const noOp = () => null;
const SEED_KEY_PATH = List([]);

export default Util.createTypedContainer(
  UnrecognizedField,
  [],
  { editorAct: TemplateEditorActions },
);
