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

var fakeElement = {};

fakeElement.constanants = 'b c d f g k l m n p q r s t v x z'.split(' ');
fakeElement.vowels = 'a e i o u y'.split(' ');
fakeElement.categories = 'alkali alkaline-earth lanthanoid actinoid transition post-transition'.split(' ');
fakeElement.suffices = 'on ium ogen'.split(' ');

fakeElement.getRandom = function( property ) {
  var values = fakeElement[ property ];
  return values[ Math.floor( Math.random() * values.length ) ];
};

fakeElement.create = function() {
  var widthClass = Math.random()*10 > 6 ? 'width2' : 'width1';
      heightClass = Math.random()*10 > 6 ? 'height2' : 'height1';
      category = fakeElement.getRandom('categories');
      className = 'element fake metal ' + category + ' ' + widthClass + ' ' + heightClass;
      letter1 = fakeElement.getRandom('constanants').toUpperCase();
      letter2 = fakeElement.getRandom('constanants');
      symbol = letter1 + letter2;
      name = letter1 + fakeElement.getRandom('vowels') + letter2 + fakeElement.getRandom('vowels') + fakeElement.getRandom('constanants') + fakeElement.getRandom('suffices');
      number = ~~( 21 + Math.random() * 100 );
      weight = ~~( number * 2 + Math.random() * 15 );
      
  return '<div class="' + className + '" data-symbol="' + symbol + 
    '" data-category="' + category + '"><p class="number">' + number + 
    '</p><h3 class="symbol">' + symbol + '</h3><h2 class="name">' + name + 
    '</h2><p class="weight">' + weight + '</p></div>';
};

fakeElement.getGroup = function() {
  var i = Math.ceil( Math.random()*3 + 1 ),
      newEls = '';
  while ( i-- ) {
    newEls += fakeElement.create();
  }
  return newEls;
};