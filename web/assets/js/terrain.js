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


// $(window).hashchange(function() {
// 	switch(location.hash.substr(1)) {
// 		case "home":
// 		case "dashboard":
// 		// case ""
// 	}
// });

// $(document).ready(function() {
// 	var points = [];
// 	for(var i = 0; i < 5; i ++) {
// 		points.push(1 - Math.pow((i*2/10), 2));
// 	}
// 	$("#chart").barline({
// 		// Data
// 		labels: ["$0", "$100", "$200", "$300", "$400", "$500", "$600", "$700", "$800", "$900+"],
// 		bars: [0.44,0.65,1.0,0.58,0.68,0.38,0.24,0.12,0.22],
// 		barRange: [0,20],
// 		points: points,
// 		pointRange: [0,1],
// 		barToPointRatio: 2
// 	}, {
// 		// Options
// 		color: "#47ffa7",
// 		width: 500,
// 		height: 250
// 	}, function() {
// 		// Change Function
// 		// console.log("Changed.");
// 	});

// 	$("#weight").slicer([
// 		// data
// 	{
// 		value: 50,
// 		color: "#ff47a7",
// 		editable: true,
// 		slider: true
// 	}, {
// 		value: 30,
// 		color: "#47ffa7"
// 	}, {
// 		value: 20,
// 		color: "#47a7ff"
// 	}], {
// 		// options
// 		width: "500px",
// 		height: "40px"
// 	}, function() {
// 		// select function
// 	});
// })