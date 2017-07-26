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

// tslint:disable:no-empty strict-boolean-expressions no-console

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as Radium from 'radium';
import * as React from 'react';
import * as io from 'socket.io-client';
import * as _ from 'underscore';
import { backgroundColor, buttonColors, Colors, fontColor, link } from '../../common/Colors';
import Util from '../../util/Util';
import Autocomplete from './../../common/components/Autocomplete';
import Dropdown from './../../common/components/Dropdown';
import TerrainComponent from './../../common/components/TerrainComponent';
import Actions from './../data/FileImportActions';
import * as FileImportTypes from './../FileImportTypes';
import './FileImportPreview.less';
import FileImportPreviewColumn from './FileImportPreviewColumn';
import FileImportPreviewRow from './FileImportPreviewRow';
const { List } = Immutable;

export interface Props
{
  previewRows: List<List<string>>;
  columnsCount: number;
  primaryKey: number;

  columnsToInclude: List<boolean>;
  columnNames: List<string>;
  columnTypes: List<FileImportTypes.ColumnTypesTree>;
  columnOptions: List<string>;
  templates: List<FileImportTypes.Template>;
  transforms: List<FileImportTypes.Transform>;
  blob: File;
}

@Radium
class FileImportPreview extends TerrainComponent<Props>
{
  public state: {
    templateId: number,
    templateText: string,
    editColumnId: number,
    resetLocalColumnNames: boolean,
    blobCount: number,
    chunkQueue: List<string>,
  } = {
    templateId: -1,
    templateText: '',
    editColumnId: -1,
    resetLocalColumnNames: false,
    blobCount: 0,
    chunkQueue: List([]),
  };

  public componentDidMount()
  {
    Actions.getTemplates();
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    this.setState({
      // resetLocalColumnNames: this.props.columnNames.size !== nextProps.columnNames.size,
      resetLocalColumnNames: !this.props.columnNames.equals(nextProps.columnNames),
    });
  }

  public handleEditColumnChange(editColumnId: number)
  {
    this.setState({
      editColumnId,
    });
  }

  public handleTemplateChange(templateId: number)
  {
    this.setState({
      templateId,
    });
  }

  public handleAutocompleteTemplateChange(templateText: string)
  {
    this.setState({
      templateText,
    });
  }

  public handleLoadTemplate()
  {
    if (this.state.templateId === -1)
    {
      alert('Please select a template to load');
      return;
    }
    if (!this.props.columnNames.equals(List(this.props.templates.get(this.state.templateId).originalNames)))
    {
      console.log(this.props.templates.get(this.state.templateId).originalNames);
      alert('Incompatible column names with template');
      return;
    }
    Actions.loadTemplate(this.state.templateId);
  }

  public handleSaveTemplate()
  {
    if (!this.state.templateText)
    {
      alert('Please enter a template name');
      return;
    }
    Actions.saveTemplate(this.state.templateText);
    Actions.getTemplates();
  }

  public checkChunk(chunk: string)
  {
    this.setState({
      chunkQueue: this.state.chunkQueue.push(chunk),
    });
  }

  public readFile(file: Blob)
  {
    const fr = new FileReader();
    fr.readAsText(file);
    const self = this;
    fr.onloadend = (target) =>
    {
      console.log('fr.result: ', fr.result);
      this.checkChunk(fr.result);
    };
  }

  public handleUploadFile()
  {
    Actions.uploadFile();

    let blobStart = 0;
    console.log('filesize: ', this.props.blob.size);
    while (blobStart < 10000)
    {
      console.log('blobStart: ', blobStart);
      const chunk = this.props.blob.slice(blobStart, blobStart + FileImportTypes.SLICE_SIZE);
      this.readFile(chunk);
      blobStart += 1000;
    }

    console.log('setting up socket...');
    const socket = io('http://localhost:3300/');
    socket.on('connect', () =>
    {
      //
    });
    socket.on('ready', () =>
    {
      socket.send(this.state.chunkQueue.shift());
      this.setState({
        chunkQueue: this.state.chunkQueue.shift(),
      });
    });
    socket.on('finished', () =>
    {
      socket.emit('finished');
      socket.close();
    });

    /*
    let blobStart = 0;
    let blobEnd = 0;
    let count = 0;

    console.log('filesize: ', this.props.blob.size);
    while (blobStart < 10000)
    {
      console.log('blobStart: ', blobStart);
      const chunk = this.props.blob.slice(blobStart, blobStart + FileImportTypes.SLICE_SIZE);
      const result = this.readFile(chunk);
      console.log(result);
      blobStart += 1000;
    }

    const socket = io('http://localhost:3300/');
    socket.on('connect', () =>
    {
      //
    });
    socket.on('ready', (data) =>
    {
      // TODO: stream data
      console.log('sending data!!!!');

      const fr = new FileReader();
      let blobStart = 0;
      let blobEnd = 0;
      let count = 0;

      while (blobStart < this.props.blob.size)
      {
        const chunk = this.props.blob.slice(blobStart, FileImportTypes.SLICE_SIZE);
        fr.readAsText(chunk);
        fr.onloadend = () =>
        {
          while (count < FileImportTypes.MAX_CHUNK_SIZE)
          {
            if (blobStart + count > this.props.blob.size)
            {
              break;
            }
            else if (fr.result.charAt(count) === '\n')
            {
              blobEnd = count;
            }
            count++;
          }
          blobStart += blobEnd;
        };

        socket.send(this.props.blob.slice(blobStart, blobStart + blobEnd));
      }

      socket.emit('finished');
      socket.close();   // TODO: fix
    }); */
  }

  public render()
  {
    console.log(this.props.blob);
    console.log(this.state.chunkQueue);
    return (
      <div
        className='fi-preview'
      >
        <div
          className='fi-preview-template'
        >
          <div
            className='fi-preview-load'
          >
            <div
              className='fi-load-button'
              onClick={this.handleLoadTemplate}
              style={buttonColors()}
              ref='fi-load-button'
            >
              Load Template
            </div>
            <Dropdown
              selectedIndex={this.state.templateId}
              options={List<string>(this.props.templates.map((template, i) => template.name))}
              onChange={this.handleTemplateChange}
              className={'fi-load-dropdown'}
              canEdit={true}
            />
          </div>

          <div
            className='fi-preview-save'
          >
            <div
              className='fi-save-button'
              onClick={this.handleSaveTemplate}
              style={buttonColors()}
              ref='fi-save-button'
            >
              Save Template
            </div>
            <Autocomplete
              value={this.state.templateText}
              options={null}
              onChange={this.handleAutocompleteTemplateChange}
              placeholder={'template name'}
              className={'fi-save-autocomplete'}
              disabled={false}
            />
          </div>
        </div>

        <div
          className='fi-preview-table-container'
        >
          <div
            className='fi-preview-columns-container'
          >
            {
              this.props.columnNames.map((value, key) =>
                <FileImportPreviewColumn
                  key={key}
                  columnId={key}
                  isIncluded={this.props.columnsToInclude.get(key)}
                  columnType={JSON.parse(JSON.stringify(this.props.columnTypes.get(key)))}
                  isPrimaryKey={this.props.primaryKey === key}
                  columnNames={this.props.columnNames}
                  columnOptions={this.props.columnOptions}
                  editing={key === this.state.editColumnId}
                  resetLocalColumnNames={this.state.resetLocalColumnNames}
                  handleEditColumnChange={this.handleEditColumnChange}
                />,
              ).toArray()
            }
          </div>
          <div
            className='fi-preview-rows-container'
          >
            {
              this.props.previewRows.map((items, key) =>
                <FileImportPreviewRow
                  key={key}
                  items={items}
                />,
              )
            }
          </div>
        </div>
        <div
          className='fi-preview-import-button'
          onClick={this.handleUploadFile}
          style={buttonColors()}
        >
          Import
        </div>
      </div>
    );
  }
}

export default FileImportPreview;
