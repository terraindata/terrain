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
import * as SpotlightTypes from 'app/builder/data/SpotlightTypes';
import Util from 'app/util/Util';
import * as React from 'react';
import MapComponent from '../../common/components/MapComponent';
import TerrainComponent from '../../common/components/TerrainComponent';
import { BuilderState } from '../data/BuilderState';

const ArrowIcon = require('./../../../images/icon_arrow_8x5.svg?name=ArrowIcon');

export interface Props
{
  keyPath: KeyPath;
  data: any;
  canEdit: boolean;
  helpOn: boolean;
  parentKeyPath: KeyPath;
  // injected props
  spotlights?: SpotlightTypes.SpotlightState;
}

class BuilderMapComponent extends TerrainComponent<Props>
{
  public state:
    {
      showExpanded: boolean,
      inputs: any,
    } = {
      showExpanded: false,
      inputs: null,
    };

  public componentWillReceiveProps(nextProps)
  {
    if (nextProps.builder.query.inputs !== this.state.inputs)
    {
      this.setState({
        inputs: nextProps.builder.query.inputs,
      });
    }
  }

  public render()
  {
    const { distance, distanceUnit, geopoint, map_text, field } = this.props.data;
    const spotlights = this.props.spotlights.spotlights;
    return (
      <div className='cards-builder-map-component'>
        <MapComponent
          keyPath={this.props.keyPath}
          location={geopoint.toJS !== undefined ? geopoint.toJS() : geopoint}
          address={map_text !== undefined ? map_text : ''}
          markLocation={true}
          showDistanceCircle={true}
          showSearchBar={true}
          zoomControl={true}
          distance={parseFloat(distance)}
          distanceUnit={distanceUnit}
          geocoder='google'
          hideSearchSettings={true}
          inputs={this.state.inputs}
          textKeyPath={this._ikeyPath(this.props.parentKeyPath, 'map_text')}
          spotlights={spotlights}
          field={field}
          keepAddressInSync={true}
          canEdit={this.props.canEdit}
          colorMarker={true}
          className={'builder-map-component-wrapper'}
        />
      </div>
    );
  }
}
export default Util.createTypedContainer(
  BuilderMapComponent,
  ['builder', 'spotlights'],
  {},
);
