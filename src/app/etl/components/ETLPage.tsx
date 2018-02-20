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
// tslint:disable:no-var-requires strict-boolean-expressions

import TerrainComponent from 'common/components/TerrainComponent';
import * as Radium from 'radium';
import * as React from 'react';
import { browserHistory } from 'react-router';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import ETLExportDisplay from 'etl/components/ETLExportDisplay';
import './ETLPage.less';

export interface Props
{
  children?: any;
  placeholder?: any;
}

// const enum ViewState
// { // temporary stand in. TODO: use a combination of routing and redux
//   SHOW_BUTTONS,
//   SHOW_IMPORT,
//   SHOW_EXPORT,
// }

@Radium
export default class ETLPage extends TerrainComponent<Props>
{
  // public state: {
  //   view: ViewState;
  // } = {
  //     view: ViewState.SHOW_BUTTONS,
  //   };

  public renderButtons()
  {
    return (
      <div className='button-holder' style={backgroundColor(Colors().bg3)}>
        <div
          key='import'
          className='test-button'
          style={[backgroundColor(Colors().active, Colors().activeHover), fontColor(Colors().activeText)]}
          onClick={this.handleImportClicked}
        >
          Test Import Button
        </div>
        <div
          key='export'
          className='test-button'
          style={[backgroundColor(Colors().active, Colors().activeHover), fontColor(Colors().activeText)]}
          onClick={this.handleExportClicked}
        >
          Test Export Button
        </div>
      </div>
    );
  }

  public renderImport()
  {
    return 'implement me please';
  }

  public renderExport()
  {
    return <ETLExportDisplay />;
  }

  public render()
  {
    return (
      <div className='etl-page-root'>
        {/*(this.state.view === ViewState.SHOW_BUTTONS && this.renderButtons()) ||
          (this.state.view === ViewState.SHOW_IMPORT && this.renderImport()) ||
          (this.state.view === ViewState.SHOW_EXPORT && this.renderExport())*/
        }
        {
          this.props.children == null ?
            this.renderButtons() :
            this.props.children
        }
      </div>
    );
  }

  public handleImportClicked()
  {
    browserHistory.push(`/etl/import`);
    // this.setState({
    //   view: ViewState.SHOW_IMPORT,
    // });
  }

  public handleExportClicked()
  {
    browserHistory.push(`/etl/export`);
    // this.setState({
    //   view: ViewState.SHOW_EXPORT,
    // });
  }
}
