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

import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, Colors, fontColor } from '../../../colors/Colors';
import TerrainComponent from './../../../common/components/TerrainComponent';
const { List } = Immutable;
import BuilderActions from 'app/builder/data/BuilderActions';
import { ColorsActions } from 'app/colors/data/ColorsRedux';
import { ColorsState } from 'app/colors/data/ColorsTypes';
import FadeInOut from 'app/common/components/FadeInOut';
import FloatingInput from 'app/common/components/FloatingInput';
import { SchemaState } from 'schema/SchemaTypes';
import Util from 'util/Util';
import PathfinderFilterSection from './filter/PathfinderFilterSection';
import PathfinderMoreSection from './more/PathfinderMoreSection';
import './Pathfinder.less';
import { _PathfinderContext, Path, PathfinderSteps } from './PathfinderTypes';
import PathfinderScoreSection from './score/PathfinderScoreSection';
import PathfinderSourceSection from './source/PathfinderSourceSection';

export interface Props
{
  path: Path;
  canEdit: boolean;
  schema: SchemaState;
  keyPath?: KeyPath;
  colorsActions: typeof ColorsActions;
  colors: ColorsState;
  toSkip?: number;
}

@Radium
class PathfinderArea extends TerrainComponent<Props>
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

  public getPathfinderContext(props: Props)
  {
    return {
      canEdit: props.canEdit,
      source: props.path.source,
      step: props.path.step,
      schemaState: props.schema,
    };
  }

  public incrementStep(oldStep)
  {
    if (oldStep < PathfinderSteps.More)
    {
      BuilderActions.changePath(this.getKeyPath().push('step'), this.props.path.step + 1);
    }
  }

  public getKeyPath()
  {
    return this.props.keyPath !== undefined ? this.props.keyPath : List(['query', 'path']);
  }

  public changePathName(value)
  {
    BuilderActions.changePath(this.getKeyPath().push('name'), value);
  }

  public render()
  {
    const { path } = this.props;
    const keyPath = this.getKeyPath();
    const { pathfinderContext } = this.state;
    return (
      <div
        className='pf-area'
      >
        <FadeInOut
          children={
            <div
              className='pf-column-name-background'
              style={backgroundColor(Colors().sidebarBg)}
            >
              <FloatingInput
                value={path.name}
                onChange={this.changePathName}
                label={'Algorithm Name'}
                isTextInput={true}
                canEdit={pathfinderContext.canEdit}
                className='pf-column-name'
              />
            </div>
          }
          open={path.name !== undefined}
        />
        <div className='pathfinder-column-content'>
          <PathfinderSourceSection
            pathfinderContext={pathfinderContext}
            keyPath={keyPath.push('source')}
            onStepChange={this.incrementStep}
            source={path.source}
          />
          
          <FadeInOut
            open={path.step >= PathfinderSteps.Filter}
          >
            <PathfinderFilterSection
              pathfinderContext={pathfinderContext}
              filterGroup={path.filterGroup}
              keyPath={keyPath.push('filterGroup')}
              onStepChange={this.incrementStep}
              toSkip={this.props.toSkip}
            />
          </FadeInOut>
          
          <FadeInOut
            open={path.step >= PathfinderSteps.Score}
          >
            <PathfinderScoreSection
              pathfinderContext={pathfinderContext}
              score={path.score}
              keyPath={keyPath.push('score')}
              onStepChange={this.incrementStep}
            />
          </FadeInOut>
          
          <FadeInOut
            open={path.step >= PathfinderSteps.More}
          >
            <PathfinderMoreSection
              pathfinderContext={pathfinderContext}
              more={path.more}
              path={path}
              keyPath={keyPath.push('more')}
              toSkip={this.props.toSkip !== undefined ? this.props.toSkip : 3}
            />
          </FadeInOut>
        </div>
      </div>
    );
  }
}

export default Util.createContainer(
  PathfinderArea,
  ['schema', 'colors'],
  {
    colorsActions: ColorsActions,
  },
);
