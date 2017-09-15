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

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var geocodeByAddress = exports.geocodeByAddress = function geocodeByAddress(g, address, callback) {
  if (g === 'google')
  {
    var geocoder = new google.maps.Geocoder();
    var OK = google.maps.GeocoderStatus.OK;

    return new Promise(function (resolve, reject) {
      geocoder.geocode({ address: address }, function (results, status) {
        if (status !== OK) {
          // TODO: Remove callback support in the next major version.
          if (callback) {
            console.warn('Deprecated: Passing a callback to geocodeByAddress is deprecated. Please see "https://github.com/kenny-hibino/react-places-autocomplete#geocodebyaddress-api"');
            callback({ status: status }, null, results);
            return;
          }
          reject(status);
        }

        // TODO: Remove callback support in the next major version.
        if (callback) {
          var latLng = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng()
          };
          console.warn('Deprecated: Passing a callback to geocodeByAddress is deprecated. Please see "https://github.com/kenny-hibino/react-places-autocomplete#geocodebyaddress-api"');
          callback(null, latLng, results);
        }
        resolve(results);
      });
    });
  }
  else
  {
    ajax(callback, {q: address}, 'http://localhost:2322/api?');
  }
};

var ajax = function (callback, params, url) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url + buildQueryString(params), true);

  xhr.onload = function(e) {
      if (this.status === 200) {
          if (callback) {
              var raw = this.response;
              raw = JSON.parse(raw);
              callback.call(this, raw);
          }
      }
      delete this.xhr;
  };
  xhr.send();
};

var buildQueryString = function (params) {
  var queryString = [];
  for (var key in params) {
      if (params[key]) {
          queryString.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
      }
  }
  return queryString.join('&');
};


var getLatLng = exports.getLatLng = function getLatLng(result) {
  return new Promise(function (resolve, reject) {
    try {
      var latLng = {
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng()
      };
      resolve(latLng);
    } catch (e) {
      reject(e);
    }
  });
};

var geocodeByLatLng = exports.geocodeByLatLng = function geocodeByLatLng(g, location, callback) {
  if (g === 'google')
  {
    var geocoder = new google.maps.Geocoder();
    var OK = google.maps.GeocoderStatus.OK;

    return new Promise(function (resolve, reject) {
      geocoder.geocode({ location: location }, function (results, status) {
        if (status !== OK) {

          // TODO: Remove callback support in the next major version.
          if (callback) {
            console.warn('Deprecated: Passing a callback to geocodeByAddress is deprecated. Please see "https://github.com/kenny-hibino/react-places-autocomplete#geocodebyplaceid-api"');
            callback({ status: status }, null, results);
            return;
          }

          reject(status);
        }

        // TODO: Remove callback support in the next major version.
        if (callback) {;
          var address = results[0].formatted_address;
          console.warn('Deprecated: Passing a callback to geocodeByPlaceId is deprecated. Please see "https://github.com/kenny-hibino/react-places-autocomplete#geocodebyplaceid-api"');
          callback(null, address, results);
        }

        resolve(results);
      });
    });
  }
  else
  {
    ajax(callback, {lat: location.lat, lon: location.lng}, 'http://localhost:2322/reverse?');
  }
};

var geocodeByPlaceId = exports.geocodeByPlaceId = function geocodeByPlaceId(placeId, callback) {
  var geocoder = new google.maps.Geocoder();
  var OK = google.maps.GeocoderStatus.OK;

  return new Promise(function (resolve, reject) {
    geocoder.geocode({ placeId: placeId }, function (results, status) {
      if (status !== OK) {

        // TODO: Remove callback support in the next major version.
        if (callback) {
          console.warn('Deprecated: Passing a callback to geocodeByAddress is deprecated. Please see "https://github.com/kenny-hibino/react-places-autocomplete#geocodebyplaceid-api"');
          callback({ status: status }, null, results);
          return;
        }

        reject(status);
      }

      // TODO: Remove callback support in the next major version.
      if (callback) {
        var latLng = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        };
        console.warn('Deprecated: Passing a callback to geocodeByPlaceId is deprecated. Please see "https://github.com/kenny-hibino/react-places-autocomplete#geocodebyplaceid-api"');
        callback(null, latLng, results);
      }

      resolve(results);
    });
  });
};


var getBounds = function (geohash) {
  if (geohash.length === 0) {
    return null;
  };

  geohash = geohash.toLowerCase();

  var evenBit = true;
  var latMin =  -90, latMax =  90;
  var lonMin = -180, lonMax = 180;

  for (var i=0; i<geohash.length; i++) {
      var chr = geohash.charAt(i);
      var idx = '0123456789bcdefghjkmnpqrstuvwxyz'.indexOf(chr);
      if (idx == -1) {
        return null;
      };

      for (var n=4; n>=0; n--) {
          var bitN = idx >> n & 1;
          if (evenBit) {
              // longitude
              var lonMid = (lonMin+lonMax) / 2;
              if (bitN == 1) {
                  lonMin = lonMid;
              } else {
                  lonMax = lonMid;
              }
          } else {
              // latitude
              var latMid = (latMin+latMax) / 2;
              if (bitN == 1) {
                  latMin = latMid;
              } else {
                  latMax = latMid;
              }
          }
          evenBit = !evenBit;
      }
  }

  var bounds = {
      sw: { lat: latMin, lon: lonMin },
      ne: { lat: latMax, lon: lonMax },
  };

  return bounds;
};


// Given a geohash return the lat and long for it
var decodeGeohash = exports.decodeGeohash = function decodeGeohash(geohash) {
    var bounds = getBounds(geohash); 
    if (bounds === null)
    {
      return null;
    }

    var latMin = bounds.sw.lat, lonMin = bounds.sw.lon;
    var latMax = bounds.ne.lat, lonMax = bounds.ne.lon;

    // cell centre
    var lat = (latMin + latMax)/2;
    var lon = (lonMin + lonMax)/2;

    // round to close to centre without excessive precision: ⌊2-log10(Δ°)⌋ decimal places
    lat = lat.toFixed(Math.floor(2-Math.log(latMax-latMin)/Math.LN10));
    lon = lon.toFixed(Math.floor(2-Math.log(lonMax-lonMin)/Math.LN10));

    return { lat: Number(lat), lon: Number(lon) };
};