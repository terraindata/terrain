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

import * as classNames from 'classnames';
import { List } from 'immutable';
import { divIcon, point } from 'leaflet';
import * as _ from 'lodash';
import * as React from 'react';
import { Circle, Map, Marker, Polyline, Popup, Rectangle, TileLayer } from 'react-leaflet';

import Switch from 'common/components/Switch';
import Actions from '../../builder/data/BuilderActions';
import { backgroundColor, Colors } from '../../colors/Colors';
import MapUtil from '../../util/MapUtil';
import Autocomplete from './Autocomplete';
import './MapComponentStyle.less';
import PlacesAutocomplete from './PlacesAutocomplete';
import TerrainComponent from './TerrainComponent';

export interface Props
{
  geocoder: string;
  inputValue?: string; // What is rendered in the search bar (input, address, other)
  coordinates?: any; // The coordinates that are used to create the map
  distance?: number; // How large the distance circle shoudl be
  distanceUnit?: string; // Unit for above distance
  inputs?: any; // inputs so that it can tell what is an input
  onChange?: (inputValue, coordinates?) => void;
  canEdit: boolean;
}

// for map markers, distances must be converted to meters
const UNIT_CONVERSIONS =
  {
    mi: 1609.34,
    yd: 0.9144,
    ft: 0.3048,
    in: 0.0254,
    km: 1000,
    m: 1,
    cm: .01,
    mm: .001,
    nmi: 1852,
    miles: 1609.34,
    yards: 0.9144,
    feet: 0.3048,
    inch: 0.0254,
    kilometers: 1000,
    meters: 1,
    centimeters: .01,
    millimeters: .001,
    nauticalmiles: 1852,
    NM: 1852,
  };

class MapComponent extends TerrainComponent<Props>
{

  public state: {
    zoom: number;
  }
  = {
    zoom: 15;
  };

  public geoCache = {};
  public reverseGeoCache = {};

  public componentWillReceiveProps(nextProps)
  {
//
  }

  // Update state with the address and actual coordinates
  public geocode(address)
  {
    if (this.geoCache[address] !== undefined)
    {
      this.props.onChange(address, this.geoCache[address]);
      return;
    }
    if (this.props.geocoder === 'photon')
    {
      MapUtil.geocodeByAddress('photon', address, (result) =>
      {
        this.props.onChange(address, {lat: result[1], lon: result[0]});
      });
    }
    else
    {
      MapUtil.geocodeByAddress('google', address)
        .then((results) => MapUtil.getLatLng(results[0]))
        .then((latLng: any) => this.props.onChange(address, {lat: latLng.lat, lon: latLng.lng}))
        .catch((error) => this.setState({ error }));
    }
  }

  public reverseGeocode(coordinates)
  {
//
  }

  public convertDistanceToMeters()
  {
    if (this.props.distance !== undefined &&
      this.props.distanceUnit !== undefined &&
      UNIT_CONVERSIONS[this.props.distanceUnit] !== undefined &&
      !isNaN(this.props.distance)
    )
    {
      return this.props.distance * UNIT_CONVERSIONS[this.props.distanceUnit];
    }
    return 0;
  }

  public handleInputValueChange(value)
  {
    this.props.onChange(value);
  }

  public renderMarker(address, location)
  {
     const icon = divIcon({
      html: `<svg class="map-marker-icon" version="1.1" id="Capa_1"
        xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="512px" height="512px"
        viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
        <g><path d="M256,0C167.641,0,96,71.625,96,160c0,24.75,5.625,48.219,15.672,69.125C112.234,230.313,256,512,256,512l142.594-279.375
        C409.719,210.844,416,186.156,416,160C416,71.625,344.375,0,256,0z M256,256c-53.016,0-96-43-96-96s42.984-96,96-96
        c53,0,96,43,96,96S309,256,256,256z"/>
        <circle cx="257" cy="161" r="94" stroke="black" stroke-width="0" fill="white" />
        </g></svg>
    `,
      iconSize: [40, 40],
      className: 'map-marker-container',
    });
    return (
      <Marker
        position={location}
        icon={icon}
        riseOnHover={true}
      >
        {
          address !== '' && address !== undefined ?
            <Popup
              className='map-component-popup'
              closeButton={false}
              offset={point(0, -33)}
              autoPan={false}
            >
              <span>{address}</span>
            </Popup>
            :
            null
        }
      </Marker>
    );
  }

  public setZoomLevel(viewport?: { center: [number, number], zoom: number })
  {
    if (viewport !== undefined && viewport.zoom !== undefined)
    {
      this.setState({
        zoom: viewport.zoom,
      });
    }
  }

  public renderMap()
  {
\    const { coordinates, inputValue } = this.props;
    let location = MapUtil.getCoordinatesFromGeopoint(coordinates);
    if (location === undefined || location[0] === undefined || location[1] === undefined)
    {
      location = [0, 0];
    }
    return (
      <Map
        center={location}
        zoom={this.state.zoom}
        onViewportChanged={this.setZoomLevel}
      >
          {
            this.renderMarker(inputValue, location)
          }
          <Circle
            center={location}
            radius={this.convertDistanceToMeters()}
            stroke={true}
            color={Colors().builder.cards.categories.filter}
            width={7}
            fillColor={Colors().builder.cards.categories.filter}
            fillOpacity={0.2}
          />
        <TileLayer
          attribution="&amp;copy <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </Map>
    );
  }

  public renderSearchBar()
  {
    const inputProps = {
      value: this.props.inputValue,
      onChange: this.handleInputValueChange,
      disabled: this.props.canEdit === false,
    };
    const inputStyle = this.props.canEdit === false ? _.extend({}, backgroundColor(Colors().darkerHighlight)) : {};
    return (
      <PlacesAutocomplete
        inputProps={inputProps}
        onSelect={this.geocode}
        styles={{ input: inputStyle }}
        geocoder={this.props.geocoder}
        classNames={{ root: 'map-component-address-input' }}
      />
    );
  }

  public render()
  {
    return (
      <div>
         {this.renderSearchBar()}
         {this.renderMap()}
      </div>
    );
  }
}

export default MapComponent;
