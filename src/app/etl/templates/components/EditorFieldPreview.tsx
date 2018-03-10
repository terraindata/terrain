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
// tslint:disable:no-var-requires import-spacing strict-boolean-expressions

import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import Menu from 'common/components/Menu';
import { tooltip } from 'common/components/tooltip/Tooltips';
import { TemplateField } from 'etl/templates/FieldTypes';

import { mapDispatchKeys, mapStateKeys, TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';

import './TemplateEditorField.less';

export interface Props extends TemplateEditorFieldProps
{
  hidePreviewValue?: boolean;
  displayValueOverride?: any;
  labelOverride?: string;
}

@Radium
class EditorFieldPreview extends TemplateEditorField<Props>
{
  public state: {
    hovered: boolean;
    menuOpen: boolean;
  } = {
    hovered: false,
    menuOpen: false,
  };

  public menuOptions = List([
    {
      text: 'Edit this Field',
      onClick: () => null,
    },
    {
      text: 'Move this Field',
      onClick: () => null,
    },
  ]);

  public render()
  {
    const { canEdit, preview, hidePreviewValue, displayValueOverride, labelOverride } = this.props;
    const field = this._field();
    const settingsOpen = this._settingsAreOpen();
    const labelStyle = settingsOpen ?
      fontColor(Colors().active, Colors().active)
      :
      fontColor(Colors().text2, Colors().text1);

    const previewText = preview === undefined || preview === null ? 'N/A' : preview.toString();
    const previewContent = (displayValueOverride === undefined || displayValueOverride === null) ?
      previewText : displayValueOverride;

    const showMenu = this.state.hovered || this.state.menuOpen;

    return (
      <div className='template-editor-field-block'>
        <div className='field-preview-row'>
          <div
            className='field-preview-label-group'
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
            style={labelStyle}
          >
            <div className={classNames({
              'field-preview-label': true,
            })}
              onClick={this.handleLabelClicked}
            >
              {labelOverride != null ? labelOverride : field.name}
            </div>
            <div
              className={classNames({
                'field-preview-menu': true,
                'field-preview-menu-hidden': !showMenu,
              })}
            >
              <Menu
                options={this.menuOptions}
                small={true}
                openRight={true}
                onChangeState={this._setStateWrapper('menuOpen')}
              />
            </div>
          </div>
          {
            !hidePreviewValue &&
            <div
              className={classNames({
                'field-preview-value': true,
              })}
              style={fontColor(Colors().text2)}
            >
              {previewContent}
            </div>
          }
        </div>
      </div>
    );
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

  public handleLabelClicked()
  {
    if (this._settingsAreOpen())
    {
      this.props.act({
        actionType: 'closeSettings',
      });
    }
    else
    {
      this.props.act({
        actionType: 'setDisplayState',
        state: {
          settingsFieldId: this.props.fieldId,
          settingsDisplayKeyPath: this.props.displayKeyPath,
        },
      });
    }
  }
}

const emptyOptions = List([]);

export default Util.createTypedContainer(
  EditorFieldPreview,
  mapStateKeys,
  mapDispatchKeys,
);
