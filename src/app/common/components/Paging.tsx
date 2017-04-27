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

require('./Paging.less');
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as _ from 'underscore';
import PureClasss from '../../common/components/PureClasss';
import Util from '../../util/Util';

const HOVER_TIMEOUT_TIME = 1000;

export interface Props
{
  page: number;
  pages: number;
  onChange: (page: number) => void;

  onHover?: (page: number) => boolean;
  onHoverEnd?: () => void;
}

class Paging extends PureClasss<Props>
{
  constructor(props: Props) {
    super(props);
    Util.bind(this, 'changePage', 'handlePageClick', 'handleAllPages',
      'goFirst', 'goPrevious', 'goNext', 'goLast',
      'handlePageMouseOver', 'handleMouseOut',
      'goHover', 'handleFirstHover', 'handlePreviousHover',
      'handleNextHover', 'handleLastHover');
      // 'handleHoverTimeout', 'clearHoverTimeout');
    this.state = {
      open: false,

      overPage: null,
      // hoverTimeout: null,
    };
  }

  pageFromEvent(event): number
  {
    return parseInt(Util.rel(event.target), 10);
  }

  changePage(page): void
  {
    this.setState({
      open: false,
    });

    if (page !== this.props.page && page > 0 && page <= this.props.pages)
    {
      this.props.onChange(page);
    }
  }

  handlePageClick(event): void
  {
    this.changePage(this.pageFromEvent(event));
  }

  handleAllPages(): void
  {
    this.setState({
      open: ! this.state.open,
    });
  }

  goFirst(): void
  {
    this.changePage(1);
  }

  goPrevious(): void
  {
    this.changePage(this.props.page - 1);
  }

  goNext(): void
  {
    this.changePage(this.props.page + 1);
  }

  goLast(): void
  {
    this.changePage(this.props.pages);
  }

  // mouseovers

  goHover(page): void
  {
    if (this.props.onHover && this.props.onHover(page))
    {
      this.setState({
        overPage: page,
        // hoverTimeout: setTimeout(this.handleHoverTimeout, HOVER_TIMEOUT_TIME),
      });
    }
  }

  handlePageMouseOver(event): void
  {
    this.goHover(this.pageFromEvent(event));
  }

  handleFirstHover(): void
  {
    this.goHover(1);
  }

  handlePreviousHover(): void
  {
    if (this.props.page !== 1)
    {
      this.goHover(this.props.page - 1);
    }
  }

  handleNextHover(): void
  {
    if (this.props.page !== this.props.pages)
    {
      this.goHover(this.props.page + 1);
    }
  }

  handleLastHover(): void
  {
    this.goHover(this.props.pages);
  }

  handleMouseOut(event): void
  {
    // this.clearHoverTimeout();

    this.setState({
      overPage: null,
      // hoverTimeout: null,
    });

    if (this.props.onHoverEnd)
    {
      this.props.onHoverEnd();
    }
  }

  // In the future, if we want some kind of "long hover to go into"
  //  when dragging, here's a start at the code for it

  // handleHoverTimeout()
  // {
  //   this.changePage(this.state.overPage);
  // }

  // clearHoverTimeout()
  // {
  //   if(this.state.hoverTimeout)
  //   {
  //     clearTimeout(this.state.hoverTimeout);
  //   }
  // }

  // componentWillUnmount()
  // {
  //   this.clearHoverTimeout();
  // }

  render() {
    return (
      <div className={Util.objToClassname(
        {
          'paging': true,
          'paging-open': this.state.open,
        })}>
        <div
          className="paging-first"
          onClick={this.goFirst}
          onMouseOver={this.handleFirstHover}
          onMouseOut={this.handleMouseOut}
          >
            &lt;&lt;
        </div>
        <div
          className="paging-previous"
          onClick={this.goPrevious}
          onMouseOver={this.handlePreviousHover}
          onMouseOut={this.handleMouseOut}
          >
            &lt;
        </div>
        <div className="paging-pages">
          {
            _.range(1, this.props.pages + 1).map((page) =>
            {
              if (!this.state.open && this.props.page - page > 3) {
                return null;
              }

              return (
              <div
                className={Util.objToClassname(
                {
                  'paging-page': true,
                  'paging-page-selected': page === this.props.page,
                  'paging-page-hover': page === this.state.overPage,
                })}
                onClick={this.handlePageClick}
                onMouseOver={this.handlePageMouseOver}
                onMouseOut={this.handleMouseOut}
                key={page}
                rel={page + ''}
                >
                {page}
              </div>
              );
            })
          }
        </div>
        <div className="paging-all-pages" onClick={this.handleAllPages}>
          { this.state.open ? '-' : '...' }
        </div>
        <div
          className="paging-next"
          onClick={this.goNext}
          onMouseOver={this.handleNextHover}
          onMouseOut={this.handleMouseOut}
          >
            &gt;
        </div>
        <div
          className="paging-last"
          onClick={this.goLast}
          onMouseOver={this.handleLastHover}
          onMouseOut={this.handleMouseOut}
          >
            &gt;&gt;
        </div>
      </div>
    );
  }
}
export default Paging;
