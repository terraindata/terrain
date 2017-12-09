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
import * as Radium from 'radium';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../colors/Colors';
import InfoArea from '../../../common/components/InfoArea';
import TerrainComponent from './../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import { SchemaState } from 'schema/SchemaTypes';
import TerrainStore from 'store/TerrainStore';
import Util from 'util/Util';
import ColorsActions from '../../../colors/data/ColorsActions';
import PathfinderFilterSection from './filter/PathfinderFilterSection';
import PathfinderMoreSection from './more/PathfinderMoreSection';
import './Pathfinder.less';
import { _PathfinderContext, Path, Source } from './PathfinderTypes';
import PathfinderScoreSection from './score/PathfinderScoreSection';
import PathfinderSourceSection from './source/PathfinderSourceSection';
import PathfinderStepSection from './step/PathfinderStepSection';

export interface Props
{
  path: Path;
  canEdit: boolean;
  schema: SchemaState;
}

@Radium
class PathfinderColumn extends TerrainComponent<Props>
{
  public state = {
    pathfinderContext: _PathfinderContext(this.getPathfinderContext(this.props)),
  };

  public componentWillReceiveProps(nextProps: Props)
  {
    this.setState({
      pathfinderContext: Util.reconcileContext(this.state.pathfinderContext,
        this.getPathfinderContext(nextProps)),
    });
  }

  public componentWillMount()
  {
    ColorsActions.setStyle('.pf-section-title',
      { color: Colors().text1 });
  }

  public getPathfinderContext(props: Props)
  {
    return {
      canEdit: props.canEdit,
      source: props.path.source,
      step: props.path.step,
      schemaState: props.schema,
    };
  }

  public getKeyPath()
  {
    return List(['query', 'path']);
  }

  public render()
  {
    const { path, canEdit } = this.props;
    const keyPath = this.getKeyPath();
    const { pathfinderContext } = this.state;
    return (
      <div
        className='pathfinder-column'
        style={[
          backgroundColor(Colors().bg3),
          fontColor(Colors().text3),
        ]}
      >
        <PathfinderSourceSection
          pathfinderContext={pathfinderContext}
          keyPath={keyPath.push('source')}
        />

        <PathfinderFilterSection
          pathfinderContext={pathfinderContext}
          filterGroup={path.filterGroup}
          keyPath={keyPath.push('filterGroup')}
        />

        <PathfinderScoreSection
          pathfinderContext={pathfinderContext}
          score={path.score}
          keyPath={keyPath.push('score')}
        />

        <PathfinderMoreSection
          pathfinderContext={pathfinderContext}
          more={path.more}
          keyPath={keyPath.push('more')}
        />

        {
          // <PathfinderStepSection
          //         pathfinderContext={pathfinderContext}
          //         path={path}
          //       />
        }
      </div>
    );
  }
}

export default Util.createContainer(
  PathfinderColumn,
  ['schema'],
  {},
);
