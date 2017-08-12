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

// tslint:disable:no-empty max-classes-per-file strict-boolean-expressions max-line-length no-var-requires

import * as Immutable from 'immutable';
import * as Radium from 'radium';
import './ResultsConfigStyle.less';
const { List, Map } = Immutable;
import * as classNames from 'classnames';
import * as React from 'react';
import { DragSource, DropTarget } from 'react-dnd';
import * as _ from 'underscore';
import { _Format, _ResultsConfig, Format, ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import Query from '../../../../items/types/Query';
import { backgroundColor, borderColor, Colors, fontColor, getStyle, link } from '../../../common/Colors';
import InfoArea from '../../../common/components/InfoArea';
import FileImportPreviewColumn from '../../../fileImport/components/FileImportPreviewColumn';
import Ajax from '../../../util/Ajax';
import Util from '../../../util/Util';
import Result from '../results/Result';
import Switch from './../../../common/components/Switch';
import TerrainComponent from './../../../common/components/TerrainComponent';
import { MAX_RESULTS, Results } from './ResultTypes';

const Color = require('color');

const CloseIcon = require('./../../../../images/icon_close_8x8.svg?name=CloseIcon');
const GearIcon = require('./../../../../images/icon_gear.svg?name=GearIcon');
const TextIcon = require('./../../../../images/icon_text_12x18.svg?name=TextIcon');
const ImageIcon = require('./../../../../images/icon_profile_16x16.svg?name=ImageIcon');
const HandleIcon = require('./../../../../images/icon_handle.svg?name=HandleIcon');

export interface Props
{
  query: Query;
  results: Results;
  fields: List<string>;
  onClose: () => void;
  handleESresultExport: () => void;
}

@Radium
export class ResultsExportComponent extends TerrainComponent<Props>
{
  public state: {
  } = {
  };

  constructor(props: Props)
  {
    super(props);
  }

  public componentWillReceiveProps(nextProps: Props)
  {
  }

  public handleClose()
  {
    this.props.onClose();
  }

  public render()
  {
    const shadowStyle = getStyle('boxShadow', '1px 2px 14px ' + Colors().boxShadow);
    const mainBg = backgroundColor(Colors().bg1);
    const mainFontColor = fontColor(Colors().text2);
    const placeholderStyle = [
      fontColor(Colors().text1),
      borderColor(Colors().border1),
      backgroundColor(Colors().bg1),
    ];

    // console.log(this.props.results);
    // console.log(this.props.fields);
    return (
      <div className='results-config-wrapper'>
        <div
          className={classNames({
            'results-config': true,
            'results-config-disabled': false,
          })}
          style={[mainBg, borderColor(Colors().border2)]}
        >
          <div className='results-config-bar' style={[mainBg, borderColor(Colors().border1)]}>
            <div className='results-config-title' style={mainFontColor}>
              Export Results
            </div>
            <div key={'results-export-button'}
              className='results-config-switch'
              style={[
                fontColor(Colors().text1),
                borderColor(Colors().border1, Colors().border3),
                backgroundColor(Colors().bg3),
              ]}
              onClick={this.props.handleESresultExport}
            >
              Export
            </div>
            <div key={'results-config-button'}
              className='results-config-button'
              style={[
                fontColor(Colors().text1),
                borderColor(Colors().border1, Colors().border3),
                backgroundColor(Colors().bg3),
              ]}
              onClick={this.handleClose}
            >
              Done
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ResultsExportComponent;
