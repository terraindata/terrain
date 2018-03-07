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

import Dropdown from 'common/components/Dropdown';
import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import ExpandableView from 'common/components/ExpandableView';
import { instanceFnDecorator } from 'src/app/Classes';

import { _FileConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { ETLTemplate, TemplateEditorState } from 'etl/templates/TemplateTypes';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes } from 'shared/etl/types/ETLTypes';

import EndpointForm from 'etl/common/components/EndpointForm';
// import { SourceFormMap } from 'etl/common/components/EndpointOptions';

const { List, Map } = Immutable;

export interface Props
{
  isSource?: boolean;
  // below from container
  sources: ETLTemplate['sources'];
  sinks: ETLTemplate['sinks'];
  act?: typeof TemplateEditorActions;
}

class EndpointSection extends TerrainComponent<Props>
{
  public state: {
    expandableState: Immutable.Map<string, boolean>;
    endpoints: ETLTemplate['sources'] | ETLTemplate['sinks'];
  };

  constructor(props)
  {
    super(props);

    this.state = {
      expandableState: Map(),
      endpoints: props.isSource ? props.sources : props.sinks,
    }
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
    return (
      <div className='endpoint-type-block'>
        <div
          className='endpoint-type-title'
          style={getStyle('borderBottom', `1px solid ${Colors().border1}`)}
        >
          {isSource ? 'Sources' : 'Sinks'}
        </div>
        {endpoints.map(this.renderEndpoint).toList()}
      </div>
    );
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
        endpoints: endpoints.set(key, endpoint)
      });
    }
  }

}


export default Util.createContainer(
  EndpointSection,
  [
    ['templateEditor', 'template', 'sources'],
    ['templateEditor', 'template', 'sinks'],
  ],
  { act: TemplateEditorActions },
);
