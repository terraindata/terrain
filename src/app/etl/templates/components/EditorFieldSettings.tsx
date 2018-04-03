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

import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { Languages } from 'shared/etl/types/ETLTypes';

import ElasticFieldSettings from './ElasticFieldSettings';
import FieldMainSettings from './FieldMainSettings';
import FieldSettingsTransformations from './FieldSettingsTransformations';
import { mapDispatchKeys, mapStateKeys, TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';

import './FieldSettings.less';

export type Props = TemplateEditorFieldProps;

const CloseIcon = require('images/icon_close.svg');

enum ViewCategory
{
  Settings,
  Transformations,
  Elastic,
}

@Radium
class EditorFieldSettings extends TemplateEditorField<Props>
{
  public state: {
    currentCategory: ViewCategory,
  } = {
      currentCategory: ViewCategory.Settings,
    };

  constructor(props)
  {
    super(props);
    this.changeViewFactory = _.memoize(this.changeViewFactory);
  }

  public renderCategory(category: ViewCategory, title: string)
  {
    return (
      <div
        className='field-settings-category'
        key={category}
        style={this.state.currentCategory === category ? activeStyle : inactiveStyle}
        onClick={this.changeViewFactory(category)}
      >
        {title}
      </div>
    );
  }

  public renderTitleBar()
  {
    return (
      <div
        className='field-settings-title-bar'
        style={[backgroundColor(Colors().bg3), borderColor(Colors().border1)]}
      >
        <div className='field-settings-title-filler' />
        {this.renderCategory(ViewCategory.Settings, 'Settings')}
        {this.renderCategory(ViewCategory.Transformations, 'Transform')}
        {
          ... this.renderExtraCategories()
        }
        <div className='field-settings-title-filler' />
        <div
          className='field-settings-close-button'
          style={fontColor(Colors().text3, Colors().text2)}
          key='close'
          onClick={this.handleCloseSettings}
        >
          <CloseIcon width='12px' height='12px' />
        </div>
      </div>
    );
  }

  public renderExtraCategories(): any[]
  {
    const language = this._getCurrentLanguage();
    const categories = [];
    if (language === Languages.Elastic)
    {
      categories.push(this.renderCategory(ViewCategory.Elastic, 'Elastic'));
    }
    return categories;
  }

  public render()
  {
    return (
      <div className='template-editor-field-settings' style={fontColor(Colors().text2)}>
        {this.renderTitleBar()}
        <div className='field-settings-section'>
          {
            this.state.currentCategory === ViewCategory.Settings ?
              <FieldMainSettings
                {...this._passProps()}
              />
              : null
          }
          {
            this.state.currentCategory === ViewCategory.Transformations ?
              <FieldSettingsTransformations
                {...this._passProps()}
              /> : null
          }
          {
            this.state.currentCategory === ViewCategory.Elastic ?
              <ElasticFieldSettings
                {...this._passProps()}
              /> : null
          }
        </div>
      </div>
    );
  }

  public changeViewFactory(category: ViewCategory)
  {
    return () =>
    {
      this.setState({
        currentCategory: category,
      });
    };
  }

  public handleCloseSettings()
  {
    this.props.act({
      actionType: 'closeSettings',
    });
  }
}

const activeStyle = fontColor(Colors().active, Colors().active);
const inactiveStyle = fontColor(Colors().text2, Colors().inactiveHover);

export default Util.createTypedContainer(
  EditorFieldSettings,
  mapStateKeys,
  mapDispatchKeys,
);
