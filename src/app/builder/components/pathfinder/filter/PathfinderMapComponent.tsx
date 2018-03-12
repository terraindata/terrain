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

// tslint:disable:strict-boolean-expressions restrict-plus-operands prefer-const no-var-requires
import BuilderActions from 'app/builder/data/BuilderActions';
import { BuilderState } from 'app/builder/data/BuilderState';
import * as SpotlightTypes from 'app/builder/data/SpotlightTypes';
import MapComponent, { units } from 'app/common/components/MapComponent';
import TerrainComponent from 'app/common/components/TerrainComponent';
import MapUtil from 'app/util/MapUtil';
import Util from 'app/util/Util';
import { List } from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import { _DistanceValue, DistanceValue, FilterLine } from '../PathfinderTypes';

export interface Props
{
  keyPath: KeyPath;
  data: any;
  canEdit: boolean;
  filterLine: FilterLine;
  onChange: (keyPath: KeyPath, filterLine, notDirty: boolean, fieldChange: boolean) => void;

  // injected props
  spotlights?: SpotlightTypes.SpotlightState;
  builder?: BuilderState;
  builderActions?: typeof BuilderActions;
}

class BuilderMapComponent extends TerrainComponent<Props>
{
  public state:
    {
      inputs: any,
    } = {
      inputs: null,
    };

  public componentWillReceiveProps(nextProps)
  {
    if (nextProps.builder.query && nextProps.builder.query.inputs !== this.state.inputs)
    {
      this.setState({
        inputs: nextProps.builder.query.inputs,
      });
    }
  }

  // TODO ADD ZOOM STATE SAVING
  public handleZoomChange(zoom)
  {
    let filterLine;

    if (this.props.filterLine.value && this.props.filterLine.value['zoom'] !== undefined)
    {
      filterLine = this.props.filterLine
        .setIn(List(['value', 'zoom']), zoom);
    }
    else
    {
      filterLine = this.props.filterLine
        .set('value', _DistanceValue({ zoom }));
    }
    this.props.onChange(this.props.keyPath, filterLine, false, false);
  }

  public handleMapChange(coordinates, inputValue)
  {
    let filterLine;
    if (this.props.filterLine.value && this.props.filterLine.value['address'] !== undefined)
    {
      filterLine = this.props.filterLine
        .setIn(List(['value', 'location']), coordinates)
        .setIn(List(['value', 'address']), inputValue);
    }
    else
    {
      filterLine = this.props.filterLine
        .set('value', _DistanceValue({ location: coordinates, address: inputValue }));
    }
    this.props.onChange(this.props.keyPath, filterLine, false, false);
  }

  public spotlightsToMarkers()
  {
    const spotlights = Util.asJS(this.props.spotlights.spotlights);
    const spotlightMarkers = (_.keys(spotlights)).map((key) =>
    {
      const spotlight = spotlights[key];
      return {
        coordinates: spotlight.fields[this.props.data.field],
        name: spotlight.name,
        index: spotlight.rank + 1,
        color: spotlight.color,
      };
    });
    return List(spotlightMarkers);
  }

  public render()
  {
    const { data, canEdit } = this.props;
    return (
      <MapComponent
        geocoder='google'
        inputValue={data && data.address || ''}
        coordinates={data && data.location !== undefined ? data.location : undefined}
        distance={data && data.distance || 0}
        distanceUnit={data && data.units || 'miles'}
        wrapperClassName={'pf-filter-map-component-wrapper'}
        // fadeInOut={true}
        onChange={this.handleMapChange}
        debounce={true}
        canEdit={canEdit}
        inputs={this.state.inputs}
        markers={this.spotlightsToMarkers()}
        onZoomChange={this.handleZoomChange}
        zoom={(data && data.zoom !== undefined) ? data.zoom : 15}
      />
    );
  }
}
export default Util.createTypedContainer(
  BuilderMapComponent,
  ['builder', 'spotlights'],
  { builderActions: BuilderActions },
);
