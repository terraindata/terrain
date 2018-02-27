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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import PathfinderText from 'app/builder/components/pathfinder/PathfinderText';
import BuilderActions from 'app/builder/data/BuilderActions';
import AdvancedDropdown from 'app/common/components/AdvancedDropdown';
import Autocomplete from 'app/common/components/Autocomplete';
import Dropdown from 'app/common/components/Dropdown';
import SingleRouteSelector from 'app/common/components/SingleRouteSelector';
import PathfinderSectionTitle from '../PathfinderSectionTitle';
import
{
  _ElasticDataSource, ChoiceOption, Path, PathfinderContext, PathfinderSteps,
  Source, sourceCountDropdownOptions, sourceCountOptions,
} from '../PathfinderTypes';

import FloatingInput from 'app/common/components/FloatingInput';
import Util from 'util/Util';

export interface Props
{
  pathfinderContext: PathfinderContext;
  keyPath: KeyPath;
  onStepChange: (oldStep: PathfinderSteps) => void;
  source: Source;

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
        className='pf-section'
      >
        <SingleRouteSelector
          options={dataSourceOptions}
          value={source.dataSource.index}
          onChange={this.handleSourcePathChange}
          canEdit={canEdit}
          shortNameText={'Find'}
          headerText={'Choose which data to use in your algorithm'}
          forceOpen={pickerIsForcedOpen}
          noShadow={pickerIsForcedOpen}
          hasOther={false}
          large={true}
        />
      </div>
    );
  }

  private handleSourcePathChange(value)
  {
    const { props } = this;
    const keyPath = props.keyPath.push('dataSource');

    // BuilderActions.changePath(keyPath, value);
    props.builderActions.changePath(keyPath.push('index'), value);
    // BuilderActions.changePath(keyPath.push('types'), value.tableIds);

    if (props.pathfinderContext.step === PathfinderSteps.Source)
    {
      props.onStepChange(props.pathfinderContext.step);
    }
  }

  private handleCountChange(value: string | number)
  {
    this.props.builderActions.changePath(this.props.keyPath.push('count'), value);
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
