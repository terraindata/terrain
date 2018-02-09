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
import FadeInOut from 'common/components/FadeInOut';

import ExpandableView from 'common/components/ExpandableView';
import { TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateTypes';
import { TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';
import './TemplateEditorField.less';
import TemplateEditorFieldArrayNode from './TemplateEditorFieldArrayNode';
import TemplateEditorFieldPreview from './TemplateEditorFieldPreview';
import TemplateEditorFieldSettings from './TemplateEditorFieldSettings';

const CloseIcon = require('images/icon_carrot.svg');

export interface Props extends TemplateEditorFieldProps
{
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

@Radium
class TemplateEditorFieldNodeC extends TemplateEditorField<Props>
{
  public state: {
    expandableViewOpen: boolean;
  } = {
      expandableViewOpen: false,
    };

  public renderChildFields(preview: any, displayKeyPath: KeyPath)
  {
    const { field, keyPath, canEdit } = this.props;
    return field.getSubfields().map((value, index) =>
    {
      const newKeyPath = keyPath.push('children', index);
      const childPreview = preview !== undefined && preview !== null ? preview[value.name] : null;
      return (
        <TemplateEditorFieldNode
          {...this._passProps({
            keyPath: newKeyPath,
            field: value,
            canEdit: field.isIncluded && canEdit,
            preview: childPreview,
            displayKeyPath: displayKeyPath.push(index),
          }) }
          key={index}
        />
      );
    }).toList();
  }

  public renderCloseLine()
  {
    return (
      <div
        className='template-editor-close-row'
        style={[borderColor(Colors().text3, Colors().text2), fontColor(Colors().text3, Colors().text2)]}
        onClick={this.handleCloseDrawer}
      >
        <div className='settings-drawer-close-line' style={getStyle('marginRight', '12px')} />
        <CloseIcon
          className='settings-drawer-close-icon'
          width='16px' height='16px'
        />
        <div className='settings-drawer-close-line' style={getStyle('marginLeft', '12px')} />
      </div>
    );
  }

  public renderSettingsContainer()
  {
    const showSettings = this._settingsAreOpen();
    return (
      <FadeInOut open={showSettings}>
        <div className='injected-content-container'>
          {showSettings ?
            <div className='injected-content-content' style={[backgroundColor(Colors().bg3), borderColor(Colors().border1)]}>
              <TemplateEditorFieldSettings
                {...this._passProps() }
              />
              {this.renderCloseLine()}
            </div> : null
          }
        </div>
      </FadeInOut>
    );
  }

  public render()
  {
    const { field, keyPath, canEdit, preview, displayKeyPath } = this.props;
    if (field.isRoot(keyPath))
    {
      return (
        <div className='template-editor-children-container'>
          {this.renderChildFields(preview, displayKeyPath)}
        </div>
      );
    }

    let children = null;
    let content = null;
    const injectedContent = this.renderSettingsContainer();

    if (field.isArray())
    {
      return (
        <TemplateEditorFieldArrayNode
          depth={0}
          renderNestedFields={this.renderChildFields}
          injectedContent={injectedContent}
          {...this._passProps() }
        />
      );
    }
    else if (field.isNested())
    {
      children = this.renderChildFields(preview, displayKeyPath);
      content = (
        <TemplateEditorFieldPreview
          hidePreviewValue={true}
          {...this._passProps() }
        />
      );
    }
    else
    {
      content = (
        <TemplateEditorFieldPreview
          {...this._passProps() }
        />
      );
    }
    const childrenComponent = children === null ? null :
      <div className='template-editor-children-container'>
        {children}
      </div>;
    const childrenStyle = (canEdit === true && field.isIncluded === false) ?
      getStyle('opacity', '0.5') : {};

    return (
      <ExpandableView
        content={content}
        open={this.state.expandableViewOpen}
        onToggle={this.handleExpandArrowClicked}
        children={childrenComponent}
        injectedContent={injectedContent}
        style={childrenStyle}
      />
    );
  }

  public handleExpandArrowClicked()
  {
    this.setState({
      expandableViewOpen: !this.state.expandableViewOpen,
    });
  }

  public handleCloseDrawer()
  {
    this.props.act({
      actionType: 'closeSettings',
    });
  }
}

const TemplateEditorFieldNode = Util.createTypedContainer(
  TemplateEditorFieldNodeC,
  ['templateEditor'],
  { act: TemplateEditorActions },
);

export default TemplateEditorFieldNode;
