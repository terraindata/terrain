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

// tslint:disable

/* Used with MapComponent to route between two locations
Include RoutingMachine into route component and add 
<RoutingMachine with props for to and from locations, a function that 
returns a ref to the Leaflet Map, a markerIcon and a function that accepts the 
route distance and time */

// import { PropTypes } from 'react';
// import { MapComponent, MapLayer } from 'react-leaflet';
// import 'leaflet-routing-machine';
// import { isEqual } from 'lodash';
// import TerrainComponent from './TerrainComponent';

// export interface Props
// {
//   to: [number, number] | number[];
//   from: [number, number] | number[];
//   getMapRef: () => any; // returns a reference to a leaflet map component
//   markerIcon: any;
//   setTrafficData: (distance: number, time: number) => void;
// }

// export default class RoutingMachine extends MapComponent
// {
//   // The linter fails without these properties...
//   public props: Props;
//   public setState;
//   public forceUpdate;
//   public state = {};
//   public context;
//   public refs;

//   public componentWillMount()
//   {
//     super.componentWillMount();
//     const { to, from, getMapRef, markerIcon, setTrafficData } = (this as any).props;
//     const map = getMapRef();
//     const waypoints = [
//       (window as any).L.latLng(from[0], from[1]),
//       (window as any).L.latLng(to[0], to[1]),
//     ];

//     (this as any).leafletElement = (window as any).L.Routing.control({
//       plan: (window as any).L.Routing.plan(waypoints, {
//         createMarker: function(i, wp)
//         {
//           return (window as any).L.marker(wp.latLng, {
//             draggable: false,
//             icon: markerIcon,
//             addWaypoints: false,
//           });
//         },
//       }),
//       router: (window as any).L.Routing.mapbox('pk.eyJ1IjoibGJyb3Vja21hbiIsImEiOiJjajc5ZXJlMDMwMWljMnFwbHQ4Z3cxdWxxIn0.WHg8thw4YmlCQe-I5vUKjg'),
//       show: false,
//       collapsible: false,
//       lineOptions: {
//         styles: [{ color: 'blue', opacity: 1, weight: 5, }]
//       },
//     }).addTo(map);

//     (this as any).leafletElement.on('routesfound', function(e)
//     {
//       var routes = e.routes;
//       setTrafficData(routes[0].summary.totalDistance, routes[0].summary.totalTime);
//     });
//   }

//   public createLeafletElement(props) { }

//   public componentWillReceiveProps(newProps)
//   {
//     const { to, from } = newProps;
//     if (!isEqual(from, (this as any).props.from) || !isEqual(to, (this as any).props.to))
//     {
//       (this as any).leafletElement.getPlan().setWaypoints([
//         (window as any).L.latLng(from[0], from[1]),
//         (window as any).L.latLng(to[0], to[1]),
//       ]);
//     }
//   }

//   public render()
//   {
//     return null;
//   }
// }
