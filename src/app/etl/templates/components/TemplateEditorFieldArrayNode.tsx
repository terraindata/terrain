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

// tslint:disable:no-var-requires
import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import ExpandableView from 'common/components/ExpandableView';
import { TemplateEditorActions } from 'etl/templates/data/TemplateEditorRedux';
import { _TemplateField, TemplateEditorState, TemplateField } from 'etl/templates/TemplateTypes';
import { TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';
import './TemplateEditorField.less';
import TemplateEditorFieldPreview from './TemplateEditorFieldPreview';

import ArrayPreview from './preview/ArrayPreview';
const AddIcon = require('images/icon_add.svg');

export interface Props extends TemplateEditorFieldProps
{
  depth: number;
  label?: string;
  renderNestedFields?: (preview: any, displayKeyPath: KeyPath) => any;
  injectedContent?: any;
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

@Radium
class TemplateEditorFieldArrayNodeC extends TemplateEditorField<Props>
{
  public state: {
    expandableViewOpen: boolean;
  } = {
      expandableViewOpen: false,
    };

  public renderArrayChildren()
  {
    const { field, preview, depth, displayKeyPath } = this.props;
    if (!Array.isArray(preview))
    {
      return (
        <TemplateEditorFieldArrayNode
          {...this._passProps({
            preview: null,
            displayKeyPath: displayKeyPath.push(0),
          }) }
          renderNestedFields={this.props.renderNestedFields}
          depth={depth + 1}
          label={`N/A`}
        />
      );
    }
    else if (preview.length === 0)
    {
      return (
        <TemplateEditorFieldArrayNode
          {...this._passProps({
            preview: null,
            displayKeyPath: displayKeyPath.push(0),
          }) }
          renderNestedFields={this.props.renderNestedFields}
          depth={depth + 1}
          label={`List Empty`}
        />
      );
    }
    else
    {
      const previewList = List(preview);
      return previewList.map((value, index) =>
      {
        return (
          <TemplateEditorFieldArrayNode
            {...this._passProps({
              preview: value,
              displayKeyPath: displayKeyPath.push(index),
            }) }
            key={index}
            renderNestedFields={this.props.renderNestedFields}
            depth={depth + 1}
            label={`${index + 1} of ${previewList.size}`}
          />
        );
      }).toList();
    }
  }

  public render()
  {
    const { field, canEdit, preview, depth, label, displayKeyPath, injectedContent } = this.props;
    let content = null;
    const simpleArrayDisplay: boolean = !this._isNested() && depth + 1 === this._arrayDepth();

    if (depth === this._arrayDepth() && this._isNested())
    {
      content = this.props.renderNestedFields(preview, displayKeyPath);
    }
    else if (simpleArrayDisplay)
    {
      content = (
        <div className='editor-array-item'>
          <ArrayPreview items={preview} style={fontColor(Colors().text2)} />
        </div>
      );
    }
    else
    {
      content = (
        <div style={depth !== 0 ? getStyle('marginLeft', '24px') : null}>
          {this.renderArrayChildren()}
        </div>
      );
    }

    const childrenComponent = content !== null ?
      <div className='editor-array-children'>
        {depth !== 0 ? <div className='editor-array-seperator'> {label} </div > : null}
        {content}
      </div> : null;

    if (depth === 0)
    {
      const previewComponent = (
        <TemplateEditorFieldPreview
          hidePreviewValue={!simpleArrayDisplay}
          displayValueOverride={simpleArrayDisplay ? content : null}
          {...this._passProps() }
        />
      );
      const childrenStyle = (canEdit === true && field.isIncluded === false) ?
        getStyle('opacity', '0.5') : {};
      return (
        <ExpandableView
          content={previewComponent}
          open={this.state.expandableViewOpen}
          onToggle={this.handleExpandArrowClicked}
          injectedContent={injectedContent}
          children={simpleArrayDisplay ? null : childrenComponent}
          style={childrenStyle}
        />
      );
    }
    else
    {
      return childrenComponent;
    }
  }

  public handleExpandArrowClicked()
  {
    this.setState({
      expandableViewOpen: !this.state.expandableViewOpen,
    });
  }

}

const TemplateEditorFieldArrayNode = Util.createTypedContainer(
  TemplateEditorFieldArrayNodeC,
  ['templateEditor'],
  { act: TemplateEditorActions },
);

export default TemplateEditorFieldArrayNode;
