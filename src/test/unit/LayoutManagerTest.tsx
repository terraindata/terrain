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

// tslint:disable:no-var-requires restrict-plus-operands no-reference

/// <reference path="../../../shared/typings/tsd.d.ts" />

import * as _ from 'lodash';
import * as test from 'tape';
// import * as TestUtils from 'react-addons-test-utils';
const TestUtils = require('react-addons-test-utils');
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import LayoutManager from '../../app/builder/components/layout/LayoutManager';

// Because some of these tests will test size and positioning,
//  we need to render them into a real document, because the
//  React Test Utils does not render elements with size and position
const createFrame = (width, height) =>
{
  const frame = document.createElement('div');
  frame.style.position = 'absolute';
  frame.style.top = '0';
  frame.style.left = '0';
  frame.style.width = width + 'px';
  frame.style.height = height + 'px';
  document.body.appendChild(frame);
  return frame;
};

const cleanupFrame = (frame) =>
{
  document.body.removeChild(frame);
};

test('LayoutManager renders columns', (t) =>
{
  const layout = {
    fullHeight: true,
    columns: [
      {
        content: <div className='test-col' style={{ height: '100%' }}>1</div>,
        width: 20,
      },
      {
        content: <div className='test-col' style={{ height: '100%' }}>2</div>,
      },
      {
        content: <div className='test-col' style={{ height: '100%' }}>3</div>,
        colSpan: 2,
      },
      {
        content: <div className='test-col' style={{ height: '100%' }}>4</div>,
      },
    ],
  };

  const width = 1000;
  const height = 500;
  const colOffset = 20;
  const colLeftFactor = [-1, 0, 1, 3];
  const colWidthFactor = [-1, 1, 2, 1];
  const numColsFactor = 4;
  const frame = createFrame(width, height);
  ReactDOM.render(<LayoutManager layout={layout} />, frame);

  const divs = frame.querySelectorAll('.test-col');
  t.equal(divs.length, 4, 'renders all columns');

  _.map(divs, (div, index) =>
  {
    t.equal(div.textContent, (index + 1) + '', 'correct content');
    t.equal(div.getBoundingClientRect().height, height, 'full height');
    if (colLeftFactor[index] === -1)
    {
      // offset column
      t.equal(div.getBoundingClientRect().left,
        0, 'correct left');
      t.equal(div.getBoundingClientRect().width,
        colOffset, 'correct width');
    }
    else
    {
      t.equal(div.getBoundingClientRect().left,
        colOffset + (width - colOffset) / numColsFactor * colLeftFactor[index], 'correct left');
      t.equal(div.getBoundingClientRect().width,
        (width - colOffset) / numColsFactor * colWidthFactor[index], 'correct width');
    }
  });

  cleanupFrame(frame);

  t.end();
});

test('LayoutManager renders rows', (t) =>
{
  const layout = {
    rows: [
      {
        content: <div className='test-row' style={{ height: '20px' }}>1</div>,
      },
      {
        content: <div className='test-row' style={{ height: '40px' }}>2</div>,
        rowSpan: 2,
      },
      {
        content: <div className='test-row' style={{ height: '20px' }}>3</div>,
      },
    ],
  };

  const width = 1000;
  const height = 500;
  const rowHeight = 20;
  const rowTopFactor = [0, 1, 3];
  const rowHeightFactor = [1, 2, 1];
  const numRowsFactor = 4;
  const frame = createFrame(width, height);
  ReactDOM.render(<LayoutManager layout={layout} />, frame);

  const divs = frame.querySelectorAll('.test-row');
  t.equal(divs.length, 3, 'renders all rows');

  _.map(divs, (div, index) =>
  {
    t.equal(div.textContent, (index + 1) + '', 'correct content');
    t.equal(div.getBoundingClientRect().left, 0, 'correct left');
    t.equal(div.getBoundingClientRect().width, width, 'correct width');
    t.equal(div.getBoundingClientRect().top,
      rowHeight * rowTopFactor[index], 'correct top');
    t.equal(div.getBoundingClientRect().height,
      rowHeight * rowHeightFactor[index], 'correct height');
  });

  cleanupFrame(frame);

  t.end();
});
