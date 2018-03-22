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
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, Colors, fontColor } from '../../../colors/Colors';
import TerrainComponent from './../../../common/components/TerrainComponent';
const { List } = Immutable;
import BuilderActions from 'app/builder/data/BuilderActions';
import { ColorsActions } from 'app/colors/data/ColorsRedux';
import { ColorsState } from 'app/colors/data/ColorsTypes';
import FadeInOut from 'app/common/components/FadeInOut';
import { tooltip } from 'app/common/components/tooltip/Tooltips';
import { BuilderState } from 'builder/data/BuilderState';
import withScrolling, { createHorizontalStrength, createVerticalStrength } from 'react-dnd-scrollzone';
import { SchemaState } from 'schema/SchemaTypes';
import Util from 'util/Util';
import PathfinderFilterSection from './filter/PathfinderFilterSection';
import PathfinderMoreSection from './more/PathfinderMoreSection';
import './Pathfinder.less';
import { _PathfinderContext, _Script, Path, PathfinderSteps, Source } from './PathfinderTypes';
import PathfinderScoreSection from './score/PathfinderScoreSection';
import PathfinderSourceSection from './source/PathfinderSourceSection';

const ScrollingComponent = withScrolling('div');

export interface Props
{
  path: Path;
  canEdit: boolean;
  schema: SchemaState;
  keyPath?: KeyPath;
  parentSource?: Source;
  parentName?: string;
  colorsActions: typeof ColorsActions;
  colors: ColorsState;
  toSkip?: number;
  builder: BuilderState;
  onSourceChange?: (source: string) => void;
  builderActions?: typeof BuilderActions;
}
const linearHorizontalStrength = createHorizontalStrength(0);
const linearVerticalStrength = createVerticalStrength(75);
@Radium
class PathfinderArea extends TerrainComponent<Props>
{
  public state = {
    pathfinderContext: _PathfinderContext(this.getPathfinderContext(this.props)),
  };

  public shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(nextProps, this.props) || !_.isEqual(this.state, nextState);
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    const { pathfinderContext } = this.state;
    if (pathfinderContext.canEdit !== nextProps.canEdit ||
      pathfinderContext.source !== nextProps.path.source ||
      pathfinderContext.step !== nextProps.path.step ||
      pathfinderContext.schemaState !== nextProps.schema ||
      pathfinderContext.builderState.db !== nextProps.builder.db ||
      pathfinderContext.parentSource !== nextProps.parentSource ||
      pathfinderContext.parentName !== nextProps.parentName
    )
    {
      this.setState({
        pathfinderContext: Util.reconcileContext(this.state.pathfinderContext,
          this.getPathfinderContext(nextProps)),
      });
    }
  }

  public getPathfinderContext(props: Props)
  {
    return {
      canEdit: props.canEdit,
      source: props.path.source,
      step: props.path.step,
      schemaState: props.schema,
      builderState: props.builder,
      parentSource: props.parentSource,
      parentName: props.parentName,
    };
  }

  public incrementStep(oldStep)
  {
    if (oldStep < PathfinderSteps.More)
    {
      this.props.builderActions.changePath(this.getKeyPath().push('step'), this.props.path.step + 1);
    }
  }

  public getKeyPath()
  {
    return this.props.keyPath !== undefined ? this.props.keyPath : List(['query', 'path']);
  }

  public changePathData(key, value)
  {
    this.props.builderActions.changePath(this.getKeyPath().push(key), value);
  }

  // This disables horizontal scrolling
  public hStrength(box, point)
  {
    return linearHorizontalStrength(box, point);
  }

  public vStrength(box, point)
  {
    return linearVerticalStrength(box, point);
  }

  public handleAddScript(fieldName, lat, lon, name): string
  {
    // Get the name for the script, based on the other script names
    let scriptName = '';
    const scriptNames = this.props.path.more.scripts.map((script) => script.name).toList();
    if (scriptNames.indexOf(name) === -1)
    {
      scriptName = name;
    }
    // If the name is taken, append a number to it (1, 2, 3...) based on the other script names
    else
    {
      let i = 1;
      while (scriptNames.indexOf(name + '_' + String(i)) !== -1)
      {
        i++;
      }
      scriptName = name + '_' + String(i);
    }
    // Create a new script and add it to scripts
    const newScript = _Script({
      name: scriptName,
      params: [
        {
          name: 'lat',
          value: lat,
        },
        {
          name: 'lon',
          value: lon,
        },
      ],
      script: `0.01 * Math.round(doc['${fieldName}'].arcDistance(params.lat, params.lon) * 0.0621371)`,
      userAdded: false,
    });
    // Return the name of the script to the filter line that created it
    this.props.builderActions.changePath(
      this._ikeyPath(this.props.keyPath, 'more', 'scripts'),
      this.props.path.more.scripts.push(newScript),
      true,
    );
    return scriptName;
  }

  public handleUpdateScript(fieldName, scriptName, lat?, lon?)
  {
    const { scripts } = this.props.path.more;
    const oldScript = scripts.filter((script) => script.name === scriptName).toList().get(0);
    let params: any = oldScript.params;
    if (lat !== undefined && lon !== undefined)
    {
      params = [
        {
          name: 'lat',
          value: lat,
        },
        {
          name: 'lon',
          value: lon,
        },
      ];
    }
    const newScript = _Script({
      name: scriptName,
      params: Util.asJS(params),
      script: `0.01 * Math.round(doc['${fieldName}'].arcDistance(params.lat, params.lon) * 0.0621371)`,
      userAdded: false,
    });
    this.props.builderActions.changePath(
      this._ikeyPath(this.props.keyPath, 'more', 'scripts'),
      scripts.push(newScript),
      true,
    );
  }

  public handleDeleteScript(scriptName: string)
  {
    const { scripts } = this.props.path.more;
    const scriptNames = scripts.map((script) => script.name).toList();
    const scriptIndex = scriptNames.indexOf(scriptName);
    this.props.builderActions.changePath(
      this._ikeyPath(this.props.keyPath, 'more', 'scripts'),
      scripts.splice(scriptIndex, 1),
      true,
    );
  }

  public render()
  {
    const { path, toSkip } = this.props;
    const keyPath = this.getKeyPath();
    const { pathfinderContext } = this.state;

    return (
      <ScrollingComponent
        className='pf-area'
        horizontalStrength={this.hStrength}
        verticalStrength={this.vStrength}
      >
        <div className='pathfinder-column-content'>
          <PathfinderSourceSection
            pathfinderContext={pathfinderContext}
            keyPath={this._ikeyPath(keyPath, 'source')}
            onStepChange={this.incrementStep}
            source={path.source}
            onSourceChange={this.props.onSourceChange}
          />

          <FadeInOut
            open={path.step >= PathfinderSteps.Filter}

          >
            <PathfinderFilterSection
              pathfinderContext={pathfinderContext}
              filterGroup={path.filterGroup}
              keyPath={this._ikeyPath(keyPath, 'filterGroup')}
              onStepChange={this.incrementStep}
              toSkip={toSkip}
              onAddScript={this.handleAddScript}
              onDeleteScript={this.handleDeleteScript}
              onUpdateScript={this.handleUpdateScript}
            />
            <PathfinderFilterSection
              isSoftFilter={true}
              pathfinderContext={pathfinderContext}
              filterGroup={path.softFilterGroup}
              keyPath={this._ikeyPath(keyPath, 'softFilterGroup')}
              onStepChange={this.incrementStep}
              toSkip={toSkip}
            />
            <PathfinderScoreSection
              pathfinderContext={pathfinderContext}
              score={path.score}
              keyPath={this._ikeyPath(keyPath, 'score')}
              onStepChange={this.incrementStep}
            />
            <PathfinderMoreSection
              pathfinderContext={pathfinderContext}
              more={path.more}
              path={path}
              keyPath={this._ikeyPath(keyPath, 'more')}
              toSkip={toSkip !== undefined ? toSkip : 3}
            />
          </FadeInOut>
        </div>
      </ScrollingComponent>
    );
  }
}

export default Util.createContainer(
  PathfinderArea,
  ['builder', 'schema', 'colors'],
  {
    colorsActions: ColorsActions,
    builderActions: BuilderActions,
  },
);
