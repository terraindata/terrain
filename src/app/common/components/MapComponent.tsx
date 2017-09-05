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
import { divIcon } from 'leaflet';
import * as React from 'react';
import { Map, Marker, Popup, TileLayer } from 'react-leaflet';
import PlacesAutocomplete, { geocodeByAddress, geocodeByLatLng, getLatLng } from 'react-places-autocomplete';
import { cardStyle, Colors, fontColor, getCardColors } from '../Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import BuilderTextbox from './BuilderTextbox';
import CheckBox from './CheckBox';
import './MapComponentStyle.less';

export interface Props
{
  location: [number, number];
  address: string;
  onChange: (value) => void;
  markLocation: boolean;
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
  } = {
    address: this.props.address !== undefined && this.props.address !== '' ? this.props.address : '',
    searchByCoordinate: false,
    error: null,
    latitude: this.props.location !== undefined ? this.props.location[0].toString() : '',
    longitude: this.props.location !== undefined ? this.props.location[1].toString() : '',
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

  // TODO CHECK IF THEY ARE NUMBERS
  public handleLatitudeChange(e)
  {
    this.setState({
      latitude: e.target.value,
    });
  }

  public handleLongitudeChange(e)
  {
    this.setState({
      longitude: e.target.value,
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
        />
        <input
          className='input-map-longitude'
          type='text'
          value={this.state.longitude}
          placeholder={'Latitude'}
          onChange={this.handleLongitudeChange}
          onKeyPress={this.handleCoordinateFormSubmit}
        />
      </div>
    );
  }

  public render()
  {
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
          />
          <label onClick={this.changeSearchMode}>
            Search by coordinate
            </label>
        </div>
        <div className='input-map-wrapper'>
          <Map center={this.props.location} zoom={18}>
            {
              this.props.markLocation ?
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
