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
import GoogleMap from 'google-map-react';
import { List } from 'immutable';
import { divIcon } from 'leaflet';
import * as React from 'react';
import { Circle, Map, Marker, Polyline, Popup, TileLayer, ZoomControl } from 'react-leaflet';
import PlacesAutocomplete from 'react-places-autocomplete';

import RoutingMachine from './RoutingMachine';
const { geocodeByAddress, geocodeByLatLng, getLatLng } = require('../../util/MapUtil.js');
// import { geocodeByAddress, geocodeByLatLng, getLatLng } from '../../util/MapUtil.js';
import { cardStyle, Colors, fontColor, getCardColors } from '../Colors';
import BuilderTextbox from './BuilderTextbox';
import CheckBox from './CheckBox';
import Dropdown from './Dropdown';
import './MapComponentStyle.less';
import TerrainComponent from './TerrainComponent';

export interface Props
{
  location: [number, number];
  address: string;
  onChange: (value) => void;
  markLocation: boolean;
  showDistanceTools?: boolean;
  secondLocation?: [number, number];
  routing?: boolean;
  showDirectDistance?: boolean;
}

enum UNITS
{
  Meters,
  Kilometers,
  Miles,
  Feet,
}

const markerIcon = divIcon({
  html: `<?xml version="1.0" encoding="iso-8859-1"?><!-- Generator: Adobe Illustrator 16.0.0,
    SVG Export Plug-In . SVG Version: 6.00 Build 0)
    --><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"
    "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg class='map-marker-icon' version="1.1" id="Capa_1"
    xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="512px" height="512px"
    viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
    <g><path d="M256,0C167.641,0,96,71.625,96,160c0,24.75,5.625,48.219,15.672,69.125C112.234,230.313,256,512,256,512l142.594-279.375
    C409.719,210.844,416,186.156,416,160C416,71.625,344.375,0,256,0z M256,256c-53.016,0-96-43-96-96s42.984-96,96-96
    c53,0,96,43,96,96S309,256,256,256z"/>
    </g></svg>
`,
  iconSize: [40, 40],
  className: 'map-marker-container',
});

class MapComponent extends TerrainComponent<Props>
{

  public state: {
    address: string,
    searchByCoordinate: boolean,
    error?: any,
    latitude: string,
    longitude: string,
    distance?: string,
    selectedUnit: number,
    errorLatitude: boolean,
    errorLongitude: boolean,
    errorDistance: boolean,
    trafficDistance: number,
    trafficTime: number,
  } = {
    address: this.props.address !== undefined && this.props.address !== '' ? this.props.address : '',
    searchByCoordinate: false,
    error: null,
    latitude: this.props.location !== undefined ? this.props.location[0].toString() : '',
    longitude: this.props.location !== undefined ? this.props.location[1].toString() : '',
    distance: '0.0',
    selectedUnit: 0,
    errorLatitude: false,
    errorLongitude: false,
    errorDistance: false,
    trafficDistance: 0.0,
    trafficTime: 0.0,
  };

  public componentWillReceiveProps(nextProps)
  {
    if (this.props.address !== nextProps.address)
    {
      this.setState({
        address: nextProps.address,
      });
    }
    if (this.props.location !== nextProps.location)
    {
      this.setState({
        latitude: nextProps.location[0].toString(),
        longitude: nextProps.location[1].toString(),
      });
    }
  }

  public onAddressChange(address: string)
  {
    this.setState({ address });
  }

  public handleFormSubmit()
  {
    geocodeByAddress(this.state.address)
      .then((results) => getLatLng(results[0]))
      .then((latLng) => this.props.onChange({ location: [latLng.lat, latLng.lng], address: this.state.address }))
      .catch((error) => this.setState({ error }));
  }

  public changeSearchMode()
  {
    this.setState({
      searchByCoordinate: !this.state.searchByCoordinate,
    });
  }

  public handleCoordinateFormSubmit(e)
  {
    if (e.key === 'Enter')
    {
      if (isNaN(parseFloat(this.state.latitude)) ||
        isNaN(parseFloat(this.state.longitude)) ||
        this.state.latitude === '' ||
        this.state.longitude === ''
      )
      {
        return;
      }
      const lat = parseFloat(this.state.latitude);
      const lng = parseFloat(this.state.longitude);
      geocodeByLatLng({ lat, lng })
        .then((results: any) =>
        {
          if (results[0] === undefined)
          {
            this.setState({
              error: 'No results for the coordinates entered',
            });
          }
          else
          {
            this.props.onChange({ location: [lat, lng], address: results[0].formatted_address });
          }
        })
        .catch((error) => this.setState({ error }));
    }
  }

  public handleLatitudeChange(e)
  {
    let error = false;
    if (isNaN(e.target.value))
    {
      error = true;
    }
    this.setState({
      latitude: e.target.value,
      errorLatitude: error,
    });
  }

  public handleLongitudeChange(e)
  {
    let error = false;
    if (isNaN(e.target.value))
    {
      error = true;
    }
    this.setState({
      longitude: e.target.value,
      errorLongitude: error,
    });
  }

  public renderCoordinateInputs()
  {
    return (
      <div className='input-map-coordinates'>
        <input
          type='text'
          value={this.state.latitude}
          placeholder={'Latitude'}
          onChange={this.handleLatitudeChange}
          onKeyPress={this.handleCoordinateFormSubmit}
          className={classNames({
            'input-map-input-error': this.state.errorLatitude,
          })}
        />
        <input
          type='text'
          value={this.state.longitude}
          placeholder={'Latitude'}
          onChange={this.handleLongitudeChange}
          onKeyPress={this.handleCoordinateFormSubmit}
          className={classNames({
            'input-map-longitude': true,
            'input-map-input-error': this.state.errorLongitude,
          })}
        />
      </div>
    );
  }

  public convertDistanceToMeters()
  {
    if (isNaN(parseFloat(this.state.distance)) || this.state.distance === '')
    {
      return 0;
    }
    const distance = parseFloat(this.state.distance);
    switch (this.state.selectedUnit)
    {
      case UNITS.Meters:
        return distance;
      case UNITS.Kilometers:
        return 1000 * distance;
      case UNITS.Miles:
        return 1609.34 * distance;
      case UNITS.Feet:
        return 0.3048 * distance;
      default:
        return this.state.distance;
    }
  }

  public radians(degrees)
  {
    return degrees * Math.PI / 180;
  }

  // returns linnear distance between two coordinate points in METERS
  public directDistance(firstLocation, secondLocation)
  {
    const R = 6371e3; // meters
    const phi1 = this.radians(firstLocation[0]);
    const phi2 = this.radians(secondLocation[0]);
    const deltaPhi = this.radians(secondLocation[0] - firstLocation[0]);
    const deltaLambda = this.radians(secondLocation[1] - firstLocation[1]);

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  public getMapRef()
  {
    const reactMap: any = this.refs.map;
    return reactMap.leafletElement;
  }

  public renderMap()
  {
    return (
      <div className='input-map-wrapper'>
        <Map
          center={this.props.location}
          zoom={10}
          ref='map'
        >
          {
            this.props.routing ?
              <RoutingMachine
                to={this.props.location}
                from={this.props.secondLocation}
                getMapRef={this.getMapRef}
                markerIcon={markerIcon}
                setTrafficData={this.setTrafficData}
              />
              :
              null
          }
          {
            this.props.markLocation && !this.props.routing ?
              <Marker
                position={this.props.location}
                icon={markerIcon}
              >
                <Popup>
                  <span>{this.props.address}</span>
                </Popup>
              </Marker>
              :
              null
          }
          {
            this.props.showDistanceTools ?
              <Circle
                center={this.props.location}
                radius={this.convertDistanceToMeters()}
              />
              :
              null
          }
          {
            this.props.secondLocation !== undefined && this.props.showDirectDistance ?
              <Polyline
                positions={[this.props.location, this.props.secondLocation]}
              />
              :
              null
          }
          <TileLayer
            url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          />
        </Map>
      </div>
    );

  }

  public setTrafficData(distance: number, time: number)
  {
    this.setState({
      trafficDistance: distance,
      trafficTime: time,
    });
  }

  public handleDistanceChange(e)
  {
    let error = false;
    if (isNaN(parseFloat(e.target.value)))
    {
      error = true;
    }
    this.setState({
      distance: e.target.value,
      errorDistance: error,
    });
  }

  public handleUnitChange(index)
  {
    this.setState({
      selectedUnit: index,
    });
  }

  public handleDistanceKeyDown(e)
  {
    if (isNaN(parseFloat(this.state.distance)))
    {
      return;
    }
    const dist = parseFloat(this.state.distance);
    if (e.key === 'ArrowUp')
    {
      this.setState({
        distance: (dist + 1).toString(),
      });
    }
    if (e.key === 'ArrowDown' && dist >= 1)
    {
      this.setState({
        distance: (dist - 1).toString(),
      });
    }
  }

  public renderDistanceTools()
  {
    return (
      <div className='input-map-distance-tools'>
        <input
          type='text'
          value={this.state.distance}
          onChange={this.handleDistanceChange}
          onKeyDown={this.handleDistanceKeyDown}
          className={classNames({
            'input-map-distance-tools-input': true,
            'input-map-input-error': this.state.errorDistance,
          })}
        />
        <Dropdown
          options={List(['m', 'km', 'mi', 'ft'])}
          selectedIndex={this.state.selectedUnit}
          className='input-map-distance-tools-dropdown'
          canEdit={true}
          onChange={this.handleUnitChange}
        />
      </div>
    );
  }

  public formatTime(seconds)
  {
    const hours = (seconds / 3600);
    const minutes = (hours % 1) * 60;
    return Math.floor(hours).toString() + ' hours ' + Math.round(minutes).toString() + ' minutes';
  }

  public render()
  {
    const dist = this.directDistance(this.props.location, this.props.secondLocation);
    const { trafficDistance, trafficTime } = this.state;
    const inputProps = {
      value: this.state.address,
      onChange: this.onAddressChange,
    };
    return (
      <div>
        {this.state.searchByCoordinate ?
          this.renderCoordinateInputs()
          :
          <form onSubmit={this.handleFormSubmit}>
            <PlacesAutocomplete
              inputProps={inputProps}
              onEnterKeyDown={this.handleFormSubmit}
            />
          </form>
        }
        <div className='input-map-search-settings-row' >
          <CheckBox
            checked={this.state.searchByCoordinate}
            onChange={this.changeSearchMode}
            className='input-map-checkbox'
          />
          <label
            onClick={this.changeSearchMode}
            className='input-map-checkbox-label'
          >
            Search by coordinate
            </label>
        </div>
        {
          this.props.showDistanceTools ?
            this.renderDistanceTools()
            :
            null
        }
        <div>
          <div>Direct distance: {(dist / 1609.34).toFixed(1)} miles </div>
          <div>Traffic distance: {(trafficDistance / 1609.34).toFixed(1)} miles </div>
          <div>Traffic time: {this.formatTime(trafficTime)}</div>
        </div>
        {this.renderMap()}
      </div>
    );
  }
}

export default MapComponent;
