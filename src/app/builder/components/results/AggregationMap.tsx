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

// tslint:disable:

import * as _ from 'lodash';
import { List } from 'immutable';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import TerrainComponent from '../../../common/components/TerrainComponent';
import MapUtil from '../../../util/MapUtil';
import MapComponent from './../../../common/components/MapComponent2';
export interface Props
{
  data: any;
  colors: [string, string];
  containerWidth?: number;
}

class AggregationMap extends TerrainComponent<Props>
{
  public findKey(obj, k)
  {
    const keys = _.keys(obj);
    for (let i = 0; i < keys.length; i++)
    {
      const key = keys[i];
      const value = obj[key];
      if (key === k)
      {
        return value;
      }
      else if (_.isObject(value))
      {
        return this.findKey(value, k);
      }
    }
  }

  public parseData(data)
  {

    // Geo_bounds TODO: possibly recursively search for geo_bounds (could be multiple ?)
    if (data.bounds !== undefined)
    {
      return {
        boundingRectangles: List([{
          bottomRight: data.bounds.bottom_right,
          topLeft: data.bounds.top_left,
        }]),
        bounds: [data.bounds.bottom_right, data.bounds.top_left],
      };
    }
    else if (data.location !== undefined)
    {
      return {
        coordinates: data.location,
      };
    }
    else if (data.buckets !== undefined)
    {
      let buckets = data.buckets;
      if (!Array.isArray(buckets))
      {
        buckets = _.keys(buckets).map((key) => _.extend({}, { key }, buckets[key]));
      }
      if (buckets.length > 0 && buckets[0])
      {
        if (this.findKey(buckets[0], 'bounds') !== undefined)
        {
          const latitudes = [];
          const longitudes = [];
          const boundingRectangles = buckets.map((bucket) =>
          {
            const bounds = this.findKey(bucket, 'bounds');
            latitudes.push(bounds.bottom_right.lat);
            latitudes.push(bounds.top_left.lat);
            longitudes.push(bounds.bottom_right.lon);
            longitudes.push(bounds.top_left.lon);
            const name = String(bucket.key) + ': ' + String(bucket.doc_count);
            return {
              bottomRight: bounds.bottom_right,
              topLeft: bounds.top_left,
              name,
            };
          });
          const totalBottomRight = [Math.min.apply(null, latitudes), Math.min.apply(null, longitudes)];
          const totalTopLeft = [Math.max.apply(null, latitudes), Math.max.apply(null, longitudes)];
          return {
            boundingRectangles: List(boundingRectangles),
            bounds: [totalBottomRight, totalTopLeft],
            location: [0, 0],
          };
        }
        else if (this.findKey(buckets[0], 'location') !== undefined)
        {
          const latitudes = [];
          const longitudes = [];
          const multiLocations = buckets.map((bucket) =>
          {
            const location = this.findKey(bucket, 'location');
            latitudes.push(location.lat);
            longitudes.push(location.lon);
            const name = String(bucket.key) + ': ' + String(bucket.doc_count);
            return {
              coordinates: location,
              index: -1,
              name,
              color: 'black'
            };
          });
          const totalBottomRight = [Math.min.apply(null, latitudes), Math.min.apply(null, longitudes)];
          const totalTopLeft = [Math.max.apply(null, latitudes), Math.max.apply(null, longitudes)];
          return {
            markers: List(multiLocations),
            bounds: [totalBottomRight, totalTopLeft],
            location: [0, 0],
          };
        }
      }
    }
    else
    {
      return { location: [0, 0] };
    }
  }

  public shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(nextProps.data, this.props.data);
  }

  public render()
  {
    const props = this.parseData(this.props.data);
    // boundingRectanges
    // bounds
    // multilocations
    return (
      <MapComponent
        {...props}
        geocoder='photon'
        canEdit={false}
        hideSearchBar={true}
      />
    );
  }
}

export default AggregationMap;
