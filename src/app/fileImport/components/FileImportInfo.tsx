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
import * as Immutable from 'immutable';
import * as React from 'react';
const { List } = Immutable;
import BackendInstance from './../../../../shared/backends/types/BackendInstance';
import Dropdown from './../../common/components/Dropdown';
import PureClasss from './../../common/components/PureClasss';
import UserThumbnail from './../../users/components/UserThumbnail';
import Util from './../../util/Util';
import Actions from './../data/FileImportActions';
import FileImportTypes from './../FileImportTypes';
import { FileImportState } from './../data/FileImportStore';

export interface Props
{
  canSelectTarget: boolean;
  targetIndex: number;
  targets: List<string>;
  canImport: boolean;
}

class FileImportInfo extends PureClasss<Props>
{
  public handleTargetChange(targetIndex: number)
  {
    Actions.changeTarget(targetIndex);
  }

  public handleSaveFile(file)
  {
    // console.log(file);
    // console.log(file.target);
    // console.log(file.target.files[0]);
    // console.log(file.target.files[0].type);
    // console.log(file.target.files[0].name);

    const fr = new FileReader();
    fr.readAsText(file.target.files[0]);
    fr.onloadend = () => {
      // const obj = JSON.parse(saveFile);
      Actions.saveFile(fr.result);
    }
  }

  public handleUploadFile()
  {
    if (this.props.canImport)
    {
      Actions.uploadFile();
    }
    else
    {
      alert("Please select a file to upload and a target database");
    }
  }

  public render()
  {
    const { canSelectTarget } = this.props;

    return (
      <div>
        <div>
          <input ref="file" type="file" onChange={this.handleSaveFile} />
        </div>
        <div>
          <h3>Target</h3>
        </div>
        <div>
          <Dropdown
            selectedIndex={this.props.targetIndex}
            options={this.props.targets}
            onChange={this.handleTargetChange}
            canEdit={canSelectTarget}
          />
        </div>
        <div>
          <h3 onClick={this.handleUploadFile}>Import</h3>
        </div>
      </div>
    );
  }
}

export default FileImportInfo;
