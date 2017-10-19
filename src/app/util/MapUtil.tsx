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

//  tslint:disable:no-bitwise no-console

'use strict';

import Util from './Util';

const MapUtil = {
  geocodeByAddress(g, address, callback?): any
  {
    if (g === 'google')
    {
      const google = (window as any).google;
      const geocoder = new google.maps.Geocoder();
      const OK = google.maps.GeocoderStatus.OK;

      return new Promise((resolve, reject) =>
      {
        geocoder.geocode({ address }, (results, status) =>
        {
          if (status !== OK)
          {
            if (callback)
            {
              callback({ status }, null, results);
              return;
            }
            reject(status);
          }

          if (callback)
          {
            const latLng = {
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
            };
            callback(null, latLng, results);
          }
          resolve(results);
        });
      });
    }
    else
    {
      MapUtil.ajax(callback, { q: address }, 'https://photon.komoot.de/api/?', false);
    }
  },

  ajax(callback, params, url: string, reverse: boolean)
  {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url + MapUtil.buildQueryString(params), true);

    xhr.onload = (e) =>
    {
      if (xhr.status === 200)
      {
        if (callback)
        {
          let raw = xhr.response;
          raw = JSON.parse(raw);
          let value;
          if (reverse)
          {
            const { housenumber, street, city, state, country } = raw.features[0].properties;
            const { lat, lon } = raw.features[0].geometry.coordinates;
            const address = String(housenumber) + ' ' + String(street) + ', ' +
              String(city) + ', ' + String(state) + ', ' + String(country);
            value = { address, location: [lat, lon] };
          }
          else
          {
            value = raw.features[0].geometry.coordinates;
          }
          callback.call(xhr, value);
        }
      }
    };
    xhr.send();
  },

  buildQueryString(params): string
  {
    const queryString = [];
    for (const key in params)
    {
      if (params[key])
      {
        queryString.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
      }
    }
    return queryString.join('&');
  },

  getLatLng(result)
  {
    return new Promise((resolve, reject) =>
    {
      try
      {
        const latLng = {
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
        };
        resolve(latLng);
      } catch (e)
      {
        reject(e);
      }
    });
  },

  geocodeByLatLng(g, location, callback?): any
  {
    if (g === 'google')
    {
      const google = (window as any).google;
      const geocoder = new google.maps.Geocoder();
      const OK = google.maps.GeocoderStatus.OK;

      return new Promise((resolve, reject) =>
      {
        geocoder.geocode({ location }, (results, status) =>
        {
          if (status !== OK)
          {
            if (callback)
            {
              callback({ status }, null, results);
              return;
            }

            reject(status);
          }

          if (callback)
          {
            const address = results[0].formatted_address;
            callback(null, address, results);
          }

          resolve(results);
        });
      });
    }
    else
    {
      MapUtil.ajax(callback, { lat: location.lat, lon: location.lng }, 'https://photon.komoot.de/reverse?', true);
    }
  },

  getBounds(geohash)
  {
    if (geohash.length === 0)
    {
      return null;
    }

    geohash = geohash.toLowerCase();

    let evenBit = true;
    let latMin = -90;
    let latMax = 90;
    let lonMin = -180;
    let lonMax = 180;

    for (let i = 0; i < geohash.length; i++)
    {
      const chr = geohash.charAt(i);
      const idx = '0123456789bcdefghjkmnpqrstuvwxyz'.indexOf(chr);
      if (idx === -1)
      {
        return null;
      }

      for (let n = 4; n >= 0; n--)
      {
        const bitN = idx >> n & 1;
        if (evenBit)
        {
          // longitude
          const lonMid = (lonMin + lonMax) / 2;
          if (bitN === 1)
          {
            lonMin = lonMid;
          } else
          {
            lonMax = lonMid;
          }
        } else
        {
          // latitude
          const latMid = (latMin + latMax) / 2;
          if (bitN === 1)
          {
            latMin = latMid;
          } else
          {
            latMax = latMid;
          }
        }
        evenBit = !evenBit;
      }
    }

    const bounds = {
      sw: { lat: latMin, lon: lonMin },
      ne: { lat: latMax, lon: lonMax },
    };

    return bounds;
  },

  // Given a geohash return the lat and long for it
  decodeGeohash(geohash)
  {
    const bounds = MapUtil.getBounds(geohash);
    if (bounds === null)
    {
      return null;
    }

    const latitudeMin = bounds.sw.lat;
    const longitudeMin = bounds.sw.lon;
    const latitudeMax = bounds.ne.lat;
    const longitudeMax = bounds.ne.lon;

    // cell centre
    let lat: any = (latitudeMin + latitudeMax) / 2;
    let lon: any = (longitudeMin + longitudeMax) / 2;

    // round to close to centre without excessive precision: ⌊2-log10(Δ°)⌋ decimal places
    lat = lat.toFixed(Math.floor(2 - Math.log(latitudeMax - latitudeMin) / Math.LN10));
    lon = lon.toFixed(Math.floor(2 - Math.log(longitudeMax - longitudeMin) / Math.LN10));

    return { lat: Number(lat), lon: Number(lon) };
  },

  // given a geopoint (4 formats in elastic) returns the coordinates as an array of numbers
  getCoordinatesFromGeopoint(geopoint: any)
  {
    let lat: number;
    let lon: number;
    geopoint = Util.asJS(geopoint);
    // string = geohash or 0,0 format
    if (typeof geopoint === 'string')
    {
      if (geopoint.split(',').length > 1)
      {
        const coords = geopoint.split(',');
        lat = parseFloat(coords[0].replace(/ /g, ''));
        lon = parseFloat(coords[1].replace(/ /g, ''));
        console.assert(!isNaN(lat) && !isNaN(lon));
      }
      else
      {
        const coords = MapUtil.decodeGeohash(geopoint);
        if (coords !== null)
        {
          lat = coords.lat;
          lon = coords.lon;
        }
      }
    }
    // object type for geopoint
    else if (geopoint.lat !== undefined && geopoint.lon !== undefined)
    {
      lat = geopoint.lat;
      lon = geopoint.lon;
    }
    // array type for geopoint
    else if (geopoint[0] !== undefined && geopoint[1] !== undefined)
    {
      lat = geopoint[1];
      lon = geopoint[0];
    }
    return [lat, lon];
  },

};
export default MapUtil;
