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

// tslint:disable:no-var-requires

import * as classNames from 'classnames';
import * as React from 'react';
import TerrainComponent from './../../common/components/TerrainComponent';
import './MapComponentStyle.less';
import { Map, Marker, Popup, TileLayer } from 'react-leaflet';
import GoogleMap from 'google-map-react';
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';

export interface Props
{
  location?: [number, number];
  address?: string;
}

class MapComponent extends TerrainComponent<Props>
{
  public state: {
    address: string,
    latitude: number,
    longitude: number,
  } = {
     address: '524 Ramona Street',
     latitude: 0.0,
     longitude: 0.0,
  };

public onAddressChange(address: string)
  {
    this.setState({ address });
  }

  public handleFormSubmit()
  {
    geocodeByAddress(this.state.address)
      .then((results) => getLatLng(results[0]))
      .then((latLng) => this.setState({ latitude: latLng.lat, longitude: latLng.lng }))
      .catch((error) => console.log('Error', error));
  }

  public render()
  {
     const inputProps = {
        value: this.state.address,
        onChange: this.onAddressChange,
      };
      return (
        <div>
          <form onSubmit={this.handleFormSubmit}>
            <PlacesAutocomplete
              inputProps={inputProps}
              onEnterKeyDown={this.handleFormSubmit}
            />
          </form>
          <div className='input-map-wrapper'>
            <Map center={[this.state.latitude, this.state.longitude]} zoom={18}>
              <TileLayer
                url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              />
            </Map>
          </div>
        </div>
      );
  }
}

export default MapComponent;
