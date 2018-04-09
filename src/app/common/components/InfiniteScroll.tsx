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

// tslint:disable:restrict-plus-operands

import { List, Map } from 'immutable';
import * as React from 'react';
import TerrainComponent from './../../common/components/TerrainComponent';

export interface Props
{
  pageSize: number;
  totalSize: number;
  className: string;
  id?: string;
  children: any;
  onScrollBottom?: (hitsPage: number) => void;
}

class InfiniteScroll extends TerrainComponent<Props>
{
  public scrollTop;

  public state: {
    pages: number[],
    pageBreaks: List<number>,
  } = {
      pages: [0],
      pageBreaks: List([0]),
    };

  public checkScroll(e)
  {
    const elem = $(e.currentTarget);
    const lastPage = this.state.pages[this.state.pages.length - 1];
    // scrolled to the bottom, increment visible pages and set the new "top"
    const scrollUp = this.scrollTop > elem.scrollTop();
    this.scrollTop = elem.scrollTop();
    if (this.scrollTop === 0)
    {
      // This could occur if the parent forcefully resets the scroll top, must properly set scroll pages
      this.setState({
        pages: [0],
      });
      return;
    }
    if (elem[0].scrollHeight - elem.scrollTop() === elem.outerHeight())
    {
      if (lastPage * this.props.pageSize < this.props.totalSize)
      {
        this.setState({
          pages: [lastPage, lastPage + 1],
          pageBreaks: this.state.pageBreaks.set(lastPage + 1, elem.scrollTop()),
        });
        if (this.props.onScrollBottom !== undefined)
        {
          this.props.onScrollBottom(lastPage + 1);
        }
      }
    }
    // If it has scrolled up to "top", decrement visible pages
    else if (
      scrollUp &&
      this.state.pageBreaks.get(lastPage) >= elem.scrollTop() &&
      this.state.pages.indexOf(0) === -1
    )
    {
      const firstPage = this.state.pages[0];
      this.setState({
        pages: [firstPage - 1, firstPage],
      });
    }
  }

  public isVisible(index)
  {
    const { pages } = this.state;
    const firstPage = pages[0];
    const lastPage = pages[pages.length - 1];
    return index >= firstPage * this.props.pageSize &&
      index < lastPage * this.props.pageSize + this.props.pageSize;
  }

  public render()
  {
    const { pageSize } = this.props;
    const lastPage = this.state.pages[this.state.pages.length - 1];
    const { children } = this.props;
    // inject isVisible prop into all of the children, if they are too far down on the page
    // replace them with null
    const childrenWithProps = React.Children.map(children, (child: any, index) =>
    {
      if (!(index < lastPage * pageSize + pageSize))
      {
        return null;
      }
      return React.cloneElement(child, { isVisible: this.isVisible(index) });
    });
    return (
      <div
        className={this.props.className}
        onScroll={this.checkScroll}
        id={this.props.id}
      >
        {
          childrenWithProps
        }
      </div>
    );
  }
}

export default InfiniteScroll;
