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

import * as Immutable from 'immutable';
import BrowserTypes from './../BrowserTypes.tsx';
import { patty, ellen, U2, u3, u4, u5, u6, u7 } from './../../users/data/UserFixtures.tsx';

export const v000 = BrowserTypes.newVariant("a00", "g0", "v000", "Desktop, V 3.0", "4/02/2016 4:44:44pm", "ellen", BrowserTypes.EVariantStatus.Live);
export const v001 = BrowserTypes.newVariant("a00", "g0", "v001", "Desktop, V 3.1", "4/12/2016 4:44:44pm", "patty", BrowserTypes.EVariantStatus.Live);
export const v002 = BrowserTypes.newVariant("a00", "g0", "v002", "Desktop, V 3.2", "4/22/2016 4:44:44pm", "ellen", BrowserTypes.EVariantStatus.Approve);
export const v003 = BrowserTypes.newVariant("a00", "g0", "v003", "Desktop, V 3.3", "4/24/2016 5:25:00pm", "patty", BrowserTypes.EVariantStatus.Design);
export const v004 = BrowserTypes.newVariant("a00", "g0", "v004", "Desktop, Experimental", "4/02/2016 4:44:44pm", "patty", BrowserTypes.EVariantStatus.Design);
export const v005 = BrowserTypes.newVariant("a00", "g0", "v005", "Desktop, V 1.0", "1/02/2016 4:44:44pm", "ellen", BrowserTypes.EVariantStatus.Archive);
export const v006 = BrowserTypes.newVariant("a00", "g0", "v006", "Desktop, V 2.0", "2/02/2016 4:44:44pm", "patty", BrowserTypes.EVariantStatus.Archive);
export const v007 = BrowserTypes.newVariant("a00", "g0", "v007", "Desktop, V 2.1", "3/02/2016 4:44:44pm", "U2", BrowserTypes.EVariantStatus.Archive);
export const v008 = BrowserTypes.newVariant("a00", "g0", "v008", "Desktop, V 2.2", "3/10/2016 4:44:44pm", "ellen", BrowserTypes.EVariantStatus.Archive);
export const v009 = BrowserTypes.newVariant("a00", "g0", "v009", "Desktop, V 2.3", "3/16/2016 4:44:44pm", "U2", BrowserTypes.EVariantStatus.Archive);

export const a00 = BrowserTypes.newAlgorithm("g0", "a00", "Desktop", "4/24/2016 5:25:00pm", "patty",
  Immutable.Map({v000, v001, v002, v003, v004, v005, v006, v007, v008, v009}),
  Immutable.List(["v000", "v001", "v002", "v003", "v004", "v005", "v006", "v007", "v008", "v009"]));
export const a01 = BrowserTypes.newAlgorithm("g0", "a01", "Desktop, New User", "4/23/2016 1:22:00pm", "U2");
export const a02 = BrowserTypes.newAlgorithm("g0", "a02", "Mobile", "4/22/2016 3:25:00pm", "ellen");
export const a03 = BrowserTypes.newAlgorithm("g0", "a03", "Mobile, New User", "3/24/2016 5:25:00pm", "patty");

export const g0 = BrowserTypes.newGroup("g0", "Product Search", "4/24/2016 5:25:00pm", "patty", 
  Immutable.List(["patty", "ellen", "U2"]),
  Immutable.Map({a00, a01, a02, a03}),
  Immutable.List(['a00', 'a01', 'a02', 'a03']))
export const g1 = BrowserTypes.newGroup("g1", "Maker Search", null, null,
  Immutable.List(["U2", "u3", "u4", "u5"]))
export const g2 = BrowserTypes.newGroup("g2", "Marketing", null, null, 
  Immutable.List(["patty", "ellen", "U2", "u3", "u4", "u5", "u6", "u7"]))
export const g3 = BrowserTypes.newGroup("g3", "Interns", null, null, 
  Immutable.List(["patty", "ellen", "U2", "u3"]))
export const g4 = BrowserTypes.newGroup("g4", "Huh?", null, null, 
  Immutable.List(["u6", "u7"]))

