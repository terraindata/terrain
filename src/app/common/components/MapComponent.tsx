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

// tslint:disable:no-var-requires restrict-plus-operands prefer-const

import * as classNames from 'classnames';
import GoogleMap from 'google-map-react';
import { List } from 'immutable';
import { divIcon } from 'leaflet';
import * as _ from 'lodash';
import * as React from 'react';
import { Circle, Map, Marker, Polyline, Popup, TileLayer, ZoomControl } from 'react-leaflet';
import PlacesAutocomplete from 'react-places-autocomplete';

import Actions from '../../builder/data/BuilderActions';
import Autocomplete from './Autocomplete';
import RoutingMachine from './RoutingMachine';
const { geocodeByAddress, geocodeByLatLng, getLatLng } = require('../../util/MapUtil.js');
import { cardStyle, Colors, fontColor, getCardColors } from '../Colors';
import BuilderTextbox from './BuilderTextbox';
import CheckBox from './CheckBox';
import Dropdown from './Dropdown';
import './MapComponentStyle.less';
import TerrainComponent from './TerrainComponent';

export interface Props
{
  location?: [number, number];
  address?: string;
  onChange?: (value) => void;
  markLocation?: boolean;
  secondLocation?: [number, number] | number[];
  routing?: boolean;
  showDirectDistance?: boolean;
  showSearchBar?: boolean;
  secondAddress?: string;
  zoomControl?: boolean;
  distance?: number;
  distanceUnit?: string;
  showDistanceCircle?: boolean;
  geocoder?: string;
  keyPath?: KeyPath;
  hideSearchSettings?: boolean;
  inputs?: any;
  textKeyPath?: KeyPath;
}

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
    errorLatitude: boolean,
    errorLongitude: boolean,
    trafficDistance: number,
    trafficTime: number,
    inputName: string,
    usingInput: boolean,
    zoom: number,
    focused: boolean,
  } = {
    address: this.props.address !== undefined && this.props.address !== '' ? this.props.address : '',
    searchByCoordinate: false,
    error: null,
    latitude: this.props.location !== undefined && this.props.location[0] !== undefined ? this.props.location[0].toString() : '',
    longitude: this.props.location !== undefined && this.props.location[1] !== undefined ? this.props.location[1].toString() : '',
    errorLatitude: false,
    errorLongitude: false,
    trafficDistance: 0.0,
    trafficTime: 0.0,
    inputName: this.props.address !== undefined && this.props.address !== '' && this.props.address[0] === '@' ? this.props.address : '@',
    usingInput: (this.props.address !== undefined && this.props.address !== ''
      && this.props.address[0] === '@' && this.props.address !== '@'),
    zoom: 15,
    focused: false,
  };

  public geoCache = {};
  public reverseGeoCache = {};

  public componentWillReceiveProps(nextProps)
  {
    if (this.state.usingInput)
    {
      const currentInputs = this.props.inputs && this.props.inputs.toJS ? this.props.inputs.toJS() : this.props.inputs;
      const nextInputs = nextProps.inputs && nextProps.inputs.toJS ? nextProps.inputs.toJS() : nextProps.inputs;
      const currInputs = this.parseInputs(currentInputs);
      const inputs = this.parseInputs(nextInputs);
      if (!_.isEqual(inputs, currInputs) && inputs[this.state.inputName] !== undefined)
      {
        let value = inputs[this.state.inputName];
        value = value.toJS !== undefined ? value.toJS() : value;
        if (value !== undefined && value.location !== undefined && value.address !== undefined)
        {
          this.handleLocationChange(value.location, value.address, this.state.inputName);
        }
      }
    }

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
      // If the location changes with no address (i.e. in cards) fill in the address via reverse-geo
      if ((nextProps.address === undefined || nextProps.address === '') && !this.state.usingInput)
      {
        // TODO Make this use the correct geo coder
        geocodeByLatLng('google', { lat: nextProps.location[0], lng: nextProps.location[1] })
          .then((results: any) =>
          {
            if (results[0] !== undefined)
            {
              this.setState({
                address: results[0].formatted_address,
              });
            }
          })
          .catch((error) => this.setState({ error }));
      }
    }
  }

  public parseInputs(inputsToParse?)
  {
    let inputs = {};
    const toParse = inputsToParse !== undefined ? inputsToParse : this.props.inputs;
    if (toParse === undefined || toParse === null)
    {
      return {};
    }
    toParse.forEach((input) =>
    {
      inputs['@' + input.key] = input.value;
    });
    return inputs;
  }

  public onAddressChange(address: string)
  {
    this.setState({ address });
  }

  public onPhotonChange(result)
  {
    const location = result.features[0].geometry.coordinates;
    this.handleLocationChange([location[1], location[0]], this.state.address);
  }

  public handleLocationChange(location, address, inputName?)
  {
    this.geoCache[address] = location;
    this.reverseGeoCache[location.toString()] = address;
    if (this.props.onChange !== undefined)
    {
      this.props.onChange({ location, address });
    }
    if (this.props.keyPath !== undefined)
    {
      Actions.change(this.props.keyPath, location);
      const addr = inputName ? inputName : address;
      Actions.change(this.props.textKeyPath, addr);
    }
  }

  public handleFormSubmit()
  {
    if (this.geoCache[this.state.address] !== undefined)
    {
      this.handleLocationChange(this.geoCache[this.state.address], this.state.address);
      return;
    }
    if (this.props.geocoder === 'photon')
    {
      geocodeByAddress('photon', this.state.address, this.onPhotonChange);
    }
    else
    {
      geocodeByAddress('google', this.state.address)
        .then((results) => getLatLng(results[0]))
        .then((latLng) => this.handleLocationChange([latLng.lat, latLng.lng], this.state.address))
        .catch((error) => this.setState({ error }));
    }
  }

  public changeSearchMode()
  {
    this.setState({
      searchByCoordinate: !this.state.searchByCoordinate,
    });
  }

  public onPhotonReverseChange(result)
  {
    const { housenumber, street, city, state, country } = result.features[0].properties;
    const { lat, lon } = result.features[0].geometry.coordinates;
    const address = housenumber + ' ' + street + ', ' + city + ', ' + state + ', ' + country;
    this.handleLocationChange([lat, lon], address);
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

      if (this.reverseGeoCache[[lat, lng].toString()] !== undefined)
      {
        this.handleLocationChange([lat, lng], this.reverseGeoCache[[lat, lng].toString()]);
        return;
      }

      if (this.props.geocoder === 'photon')
      {
        geocodeByLatLng('photon', { lat, lng }, this.onPhotonReverseChange);
      }
      else
      {
        geocodeByLatLng('google', { lat, lng })
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
              this.handleLocationChange([lat, lng], results[0].formatted_address);
            }
          })
          .catch((error) => this.setState({ error }));
      }
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
    if (this.props.distance !== undefined && this.props.distanceUnit !== undefined
      && UNIT_CONVERSIONS[this.props.distanceUnit] !== undefined)
    {
      return this.props.distance * UNIT_CONVERSIONS[this.props.distanceUnit];
    }
    return 0;
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

  public renderMarker(address, location)
  {
    return (
      <Marker
        position={location}
        icon={markerIcon}
      >
        {
          address !== '' && address !== undefined ?
            <Popup>
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
    let center;
    let bounds;
    if (this.props.secondLocation !== undefined)
    {
      bounds = [this.props.location, this.props.secondLocation];
    }
    else
    {
      center = this.props.location;
    }
    const mapProps = bounds !== undefined ? { bounds } : { center };
    return (
      <div className='input-map-wrapper'>
        <Map
          {...mapProps}
          zoomControl={this.props.zoomControl}
          zoom={this.state.zoom}
          ref='map'
          onViewportChanged={this.setZoomLevel}
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
              this.renderMarker(this.props.address, this.props.location)
              :
              null
          }
          {
            this.props.secondLocation !== undefined && this.props.showDirectDistance ?
              this.renderMarker(this.props.secondAddress, this.props.secondLocation)
              :
              null
          }
          {
            this.props.showDistanceCircle ?
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

  public changeLocationInput(inputName)
  {
    // TODO move this code somewhere else
    if (inputName !== undefined && inputName !== '' && inputName[0] === '@')
    {
      this.setState({
        inputName,
        usingInput: true,
      });
      const inputs = this.parseInputs();
      if (inputs[inputName] !== undefined)
      {
        let value = inputs[inputName];
        value = value.toJS !== undefined ? value.toJS() : value;
        if (value !== undefined && value.location !== undefined && value.address !== undefined)
        {
          this.handleLocationChange(value.location, value.address, inputName);
        }
      }
    }
    else
    {
      this.setState({
        address: inputName,
        usingInput: false,
        inputName: '@',
      });
    }
  }

  public handleFocus()
  {
    this.setState({
      focused: true,
    });
  }

  public handleBlur()
  {
    this.setState({
      focused: false,
    });
  }

  public renderSearchBar()
  {
    const inputProps = {
      value: this.state.address,
      onChange: this.onAddressChange,
      onFocus: this.handleFocus,
      onBlur: this.handleBlur,
    };
    const style = this.props.hideSearchSettings ? { marginBottom: '0px' } : {};
    // if there are inputs and the first key typed in is @, render an autocomplete that has the inputs as choices
    // when an input is selected, set the value of the map to be that value
    // make sure to not change input address (@location) to the actual address
    if (this.props.inputs !== undefined && this.state.address !== undefined &&
      this.state.address !== '' && this.state.address[0] === '@')
    {
      const inputs = this.parseInputs();
      return (
        <Autocomplete
          value={this.state.inputName} // consider adding new state variable to be the input name
          options={List(_.keys(inputs))}
          onChange={this.changeLocationInput}
          onFocus={this.handleFocus}
          onBlur={this.handleBlur}
          className='map-input-autocomplete'
        />
      );
    }

    return (
      <div>
        {
          this.state.searchByCoordinate ?
            this.renderCoordinateInputs()
            :
            <form
              onSubmit={this.handleFormSubmit}
              style={style}
            >
              <PlacesAutocomplete
                inputProps={inputProps}
                onEnterKeyDown={this.handleFormSubmit}
              />
            </form>
        }
        {
          this.props.hideSearchSettings ?
            null
            :
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
        }
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
    if (this.props.secondLocation !== undefined)
    {
      const dist = this.directDistance(this.props.location, this.props.secondLocation);
      const { trafficDistance, trafficTime } = this.state;
    }
    return (
      <div>
        {
          this.props.showSearchBar ?
            this.renderSearchBar()
            :
            null
        }
        {this.renderMap()}
      </div>
    );
  }
}

// Getting the distance values
// <div>
//     <div>Direct distance: {(dist / 1609.34).toFixed(1)} miles </div>
//     <div>Traffic distance: {(trafficDistance / 1609.34).toFixed(1)} miles </div>
//     <div>Traffic time: {this.formatTime(trafficTime)}</div>
//   </div>

export default MapComponent;
