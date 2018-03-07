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

const Color = require('color');
import Dropdown from 'common/components/Dropdown';
import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import ExpandableView from 'common/components/ExpandableView';
import { instanceFnDecorator } from 'src/app/Classes';
import Quarantine from 'util/RadiumQuarantine';

import { _FileConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import DocumentsHelpers from 'etl/helpers/DocumentsHelpers';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { ETLTemplate, TemplateEditorState } from 'etl/templates/TemplateTypes';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes } from 'shared/etl/types/ETLTypes';

import EndpointForm from 'etl/common/components/EndpointForm';

const { List, Map } = Immutable;

export interface Props
{
  isSource?: boolean;
  // below from container
  sources: ETLTemplate['sources'];
  sinks: ETLTemplate['sinks'];
  act?: typeof TemplateEditorActions;
}

type EndpointsType = ETLTemplate['sources'] | ETLTemplate['sinks'];
class EndpointSection extends TerrainComponent<Props>
{
  public state: {
    expandableState: Immutable.Map<string, boolean>;
    endpoints: EndpointsType;
  };

  constructor(props)
  {
    super(props);
    this.state = {
      expandableState: Map(),
      endpoints: props.isSource ? props.sources : props.sinks,
    };
  }

  public componentWillReceiveProps(nextProps)
  {
    const { isSource } = this.props;
    const newEndpoints = isSource ? nextProps.sources : nextProps.sinks;
    const oldEndpoints = isSource ? this.props.sources : this.props.sinks;

    if (newEndpoints !== oldEndpoints || isSource !== nextProps.isSource)
    {
      this.setState({
        endpoints: newEndpoints,
      });
    }
  }

  public renderEndpoint(endpoint: SourceConfig | SinkConfig, key)
  {
    const { isSource } = this.props;

    const content = (
      <div
        className='endpoint-name-section'
        style={fontColor(Colors().text2)}
        onClick={this.expandableToggleFactory(key)}
      >
        {key}
      </div>
    );
    const childContent = (
      <EndpointForm
        isSource={isSource}
        endpoint={endpoint}
        onChange={this.handleEndpointChangeFactory(key)}
      />
    );

    return (
      <ExpandableView
        key={key}
        content={content}
        open={this.isEndpointOpen(key)}
        children={childContent}
        onToggle={this.expandableToggleFactory(key)}
      />
    );
  }

  public render()
  {
    const { isSource } = this.props;
    const { endpoints } = this.state;

    const buttonsDisabled = endpoints === (isSource ? this.props.sources : this.props.sinks);

    return (
      <div className='endpoint-section'>
        <Quarantine>
          <div
            className='endpoint-type-title'
            style={getStyle('borderBottom', `1px solid ${Colors().border1}`)}
          >
            <div className='endpoint-type-title-text'>
              {isSource ? 'Sources' : 'Sinks'}
            </div>
            <div className='endpoint-apply-section'>
              <div
                key='cancel'
                className={classNames({
                  'options-column-button': true,
                  'options-column-button-disabled': buttonsDisabled,
                })}
                style={getButtonStyle(false, buttonsDisabled)}
                onClick={this.handleCancelChanges}
              >
                Cancel
              </div>
              <div
                key='apply'
                className={classNames({
                  'options-column-button': true,
                  'options-column-button-disabled': buttonsDisabled,
                })}
                style={getButtonStyle(true, buttonsDisabled)}
                onClick={this.handleApplyChanges}
              >
                Apply
              </div>
            </div>
          </div>
        </Quarantine>
        {endpoints.map(this.renderEndpoint).toList()}
      </div>
    );
  }

  public handleCancelChanges()
  {
    const { sources, sinks, isSource } = this.props;
    const newEndpoints = isSource ? sources : sinks;
    this.setState({
      endpoints: newEndpoints,
    });
  }

  public handleApplyChanges()
  {
    const { sources, sinks, isSource, act } = this.props;
    const { endpoints } = this.state;

    if (isSource)
    {
      const { newKeys, deletedKeys, differentKeys } =
        getChangedKeys(isSource ? sources : sinks, endpoints);

      act({
        actionType: 'setSources',
        sources: endpoints,
      });
      deletedKeys.forEach((key) =>
      {
        act({
          actionType: 'deleteInMergeDocuments',
          key,
        });
      });
      newKeys.forEach((key) =>
      {
        DocumentsHelpers.fetchDocuments(endpoints.get(key), key);
      });
      differentKeys.forEach((key) =>
      {
        DocumentsHelpers.fetchDocuments(endpoints.get(key), key);
      });
    }
    else
    {
      act({
        actionType: 'setSinks',
        sinks: endpoints,
      });
    }
  }

  // closed by default, since expandableState is empty
  public isEndpointOpen(key: string)
  {
    return Boolean(this.state.expandableState.get(key));
  }

  @instanceFnDecorator(_.memoize)
  public expandableToggleFactory(key: string)
  {
    return () =>
    {
      const { expandableState } = this.state;
      this.setState({
        expandableState: expandableState.set(key, !this.isEndpointOpen(key)),
      });
    };
  }

  @instanceFnDecorator(_.memoize)
  public handleEndpointChangeFactory(key: string)
  {
    return (endpoint: SourceConfig | SinkConfig) =>
    {
      const { endpoints } = this.state;
      this.setState({
        endpoints: endpoints.set(key, endpoint),
      });
    };
  }
}

function getChangedKeys(original: EndpointsType, next: EndpointsType)
{
  const differentKeys = [];
  const deletedKeys = [];
  const newKeys = [];
  original.forEach((value, key) =>
  {
    if (next.has(key))
    {
      if (original.get(key) !== next.get(key))
      {
        differentKeys.push(key);
      }
    }
    else
    {
      deletedKeys.push(key);
    }
  });
  next.forEach((value, key) =>
  {
    if (!original.has(key))
    {
      newKeys.push(key);
    }
  });
  return {
    differentKeys: List(differentKeys),
    deletedKeys: List(deletedKeys),
    newKeys: List(newKeys),
  };
}

// memoized
let getButtonStyle = (active: boolean, disabled: boolean)
{
  if (active)
  {
    return disabled ? [
      fontColor(Colors().activeText),
      backgroundColor(Colors().activeHover, Colors().activeHover),
      borderColor(Colors().altBg2),
    ] : [
        backgroundColor(Colors().active, Colors().activeHover),
        borderColor(Colors().active, Colors().activeHover),
        fontColor(Colors().activeText),
      ];
  }
  else
  {
    return disabled ? [
      fontColor(Colors().text3, Colors().text3),
      backgroundColor(Color(Colors().bg2).alpha(0.5).toString(), Color(Colors().bg2).alpha(0.5).toString()),
      borderColor(Colors().bg2),
    ] : [
        fontColor(Colors().text2, Colors().text3),
        backgroundColor(Colors().bg2, Color(Colors().bg2).alpha(0.5).toString()),
        borderColor(Colors().bg1),
      ];
  }
};
function resolveBooleans(a, b)
{
  return a ? (b ? 'tt' : 'tf') : (b ? 'ft' : 'ff');
}
getButtonStyle = _.memoize(getButtonStyle, resolveBooleans);

export default Util.createContainer(
  EndpointSection,
  [
    ['templateEditor', 'template', 'sources'],
    ['templateEditor', 'template', 'sinks'],
  ],
  { act: TemplateEditorActions },
);
