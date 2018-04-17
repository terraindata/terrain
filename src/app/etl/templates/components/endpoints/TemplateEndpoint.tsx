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
import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import ExpandableView from 'common/components/ExpandableView';
import { tooltip } from 'common/components/tooltip/Tooltips';
import { instanceFnDecorator } from 'shared/util/Classes';
import Quarantine from 'util/RadiumQuarantine';

import EndpointForm from 'etl/common/components/EndpointForm';
import { _FileConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import DocumentsHelpers from 'etl/helpers/DocumentsHelpers';
import GraphHelpers from 'etl/helpers/GraphHelpers';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { ETLTemplate, SinksMap, SourcesMap } from 'etl/templates/TemplateTypes';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes } from 'shared/etl/types/ETLTypes';

const LoadedIcon = require('images/icon_checkMark.svg');
const ErrorIcon = require('images/icon_info.svg');

import
{
  EditorDisplayState,
  FetchStatus,
  FieldMap,
  TemplateEditorState,
} from 'etl/templates/TemplateEditorTypes';

import './EndpointSection.less';

const { List, Map } = Immutable;

export interface Props
{
  endpointKey: string;
  endpoint: SourceConfig | SinkConfig;
  isSource: boolean;
  onEndpointChange: (endpoint: SourceConfig | SinkConfig) => void;
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

type EndpointsType = SourcesMap | SinksMap;
type LooseEndpointsType = Immutable.Map<string, SourceConfig | SinkConfig>;

class TemplateEndpoint extends TerrainComponent<Props>
{
  public state: {
    open: boolean,
  } = {
      open: true,
    };

  public renderStatus()
  {
    const { isSource, templateEditor, endpointKey } = this.props;
    if (!isSource)
    {
      return null;
    }
    const status = templateEditor.getSourceFetchStatus(endpointKey);
    let inner = null;
    let style = {};
    let tooltipText = '';

    switch (status)
    {
      case FetchStatus.Error:
        inner = <ErrorIcon />;
        style = fontColor(Colors().error);
        tooltipText = 'Error while trying to load documents';
        break;
      case FetchStatus.Loading:
        inner = '...';
        style = fontColor(Colors().text2);
        tooltipText = 'Loading Source...';
        break;
      case FetchStatus.Loaded:
        inner = <LoadedIcon />;
        style = fontColor(Colors().active);
        tooltipText = 'Documents Loaded Successfully';
        break;
      default:
        style = fontColor(Colors().text2);
    }
    return tooltip(
      <div
        className='endpoint-fetch-status'
        style={style}
      >
        {inner}
      </div>,
      tooltipText,
    );
  }

  public render()
  {
    const { isSource, templateEditor, endpointKey, onEndpointChange, endpoint } = this.props;
    const { template } = templateEditor;
    const name = isSource ? template.getSourceName(endpointKey) : template.getSinkName(endpointKey);

    const content = (
      <div
        className='endpoint-name-section'
        style={fontColor(Colors().text2)}
        onClick={this.handleToggle}
      >
        {name}
        {this.renderStatus()}
      </div>
    );
    const childContent = (
      <EndpointForm
        isSource={isSource}
        endpoint={endpoint}
        onChange={onEndpointChange}
      />
    );

    return (
      <ExpandableView
        content={content}
        open={this.state.open}
        children={childContent}
        onToggle={this.handleToggle}
      />
    );
  }

  public handleToggle()
  {
    this.setState({
      open: !this.state.open,
    });
  }
}

export default Util.createContainer(
  TemplateEndpoint,
  [
    ['templateEditor'],
  ],
  { act: TemplateEditorActions },
);
