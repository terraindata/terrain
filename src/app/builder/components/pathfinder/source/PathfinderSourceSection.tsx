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

// Copyright 2018 Terrain Data, Inc.

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions no-console

import PathfinderText from 'app/builder/components/pathfinder/PathfinderText';
import BuilderActions from 'app/builder/data/BuilderActions';
import SingleRouteSelector from 'app/common/components/SingleRouteSelector';
import { List } from 'immutable';
import * as React from 'react';
import
{
  ChoiceOption, ElasticDataSource, PathfinderContext, PathfinderSteps,
  Source,
} from '../PathfinderTypes';
import TerrainComponent from './../../../../common/components/TerrainComponent';

import Util from 'util/Util';

export interface Props
{
  pathfinderContext: PathfinderContext;
  keyPath: KeyPath;
  onStepChange: (oldStep: PathfinderSteps) => void;
  source: Source;
  onSourceChange: (source: string) => void;
  builderActions?: typeof BuilderActions;
}

class PathfinderSourceSection extends TerrainComponent<Props>
{
  public state: {
    dataSourceOptions: List<ChoiceOption>,
  } = {
      dataSourceOptions: List([]),
    };

  public componentWillMount()
  {
    // TODO should probably move these source options to props, not state
    this.setState({
      dataSourceOptions: this.getDataSourceOptions(),
    });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (this.props.pathfinderContext !== nextProps.pathfinderContext)
    {
      this.setState({
        dataSourceOptions: this.getDataSourceOptions(nextProps.pathfinderContext),
      });
    }
  }

  public render()
  {
    const { source, step, canEdit } = this.props.pathfinderContext;
    const { dataSourceOptions } = this.state;

    const pickerIsForcedOpen = step === PathfinderSteps.Source;
    return (
      <div
        className='pf-section pf-source-section'
      >
        <SingleRouteSelector
          options={dataSourceOptions}
          value={(source.dataSource as any).index}
          onChange={this.handleSourcePathChange}
          canEdit={canEdit}
          shortNameText={PathfinderText.findSectionTitle}
          forceOpen={pickerIsForcedOpen}
          noShadow={pickerIsForcedOpen}
          hasOther={false}
          large={true}
          hideLine={true}
          forceFloat={true}
        />
        {
          // <LinearSelector
          //   options={List(['all', '1', '5', '10', '100'])}
          //   selected={source.count}
          //   keyPath={this._ikeyPath(this.props.keyPath.push('count'))}
          //   action={this.props.builderActions.changePath}
          //   canEdit={canEdit}
          //   allowCustomInput={true}
          //   hideOptions={true}
          // />
        }

      </div>
    );
  }

  private handleSourcePathChange(value)
  {
    const { props } = this;
    const keyPath = this._ikeyPath(props.keyPath, 'dataSource');
    const t = value.split('/');
    console.assert(t.length === 2); // 'serverID/index'
    props.builderActions.changePath(keyPath,
      (this.props.source.dataSource as ElasticDataSource).set('index', t[1]).set('server', t[0]));

    if (props.pathfinderContext.step === PathfinderSteps.Source)
    {
      props.onStepChange(props.pathfinderContext.step);
    }
    if (this.props.onSourceChange)
    {
      props.onSourceChange(t[1]);
    }
  }

  private getDataSourceOptions(overrideContext?: PathfinderContext): List<ChoiceOption>
  {
    const { schemaState, builderState, source } = (overrideContext || this.props.pathfinderContext);
    const options = source.dataSource.getChoiceOptions({ schemaState, builderState, type: 'source' });
    return options;
  }
}

export default Util.createTypedContainer(
  PathfinderSourceSection,
  [],
  { builderActions: BuilderActions },
);
