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
import AuthStore from './../../auth/data/AuthStore';
import Autocomplete from './../../common/components/Autocomplete';
import CheckBox from './../../common/components/CheckBox';
import Dropdown from './../../common/components/Dropdown';
import Loading from './../../common/components/Loading';
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
  columnTypes: List<IMMap<string, any>>;

  columnOptions: List<string>;
  templates: List<FileImportTypes.Template>;
  transforms: List<FileImportTypes.Transform>;
  file: File;
  chunkQueue: List<FileImportTypes.Chunk>;
  streaming: boolean;
  uploadInProgress: boolean;
  elasticUpdate: boolean;
}

@Radium
class FileImportPreview extends TerrainComponent<Props>
{
  public state: {
    templateId: number,
    templateText: string,
    templateOptions: List<string>,
    editColumnId: number,
  } = {
    templateId: -1,
    templateText: '',
    templateOptions: List([]),
    editColumnId: -1,
  };

  public componentDidMount()
  {
    Actions.fetchTemplates();
    this.setState({
      templateOptions: this.props.templates.map((template, i) => template.name),
    });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (!this.props.templates.equals(nextProps.templates))
    {
      this.setState({
        templateOptions: nextProps.templates.map((template, i) => String(template.id) + ': ' + template.name),
      });
    }
  }

  public onColumnNameChange(columnId: number, localColumnName: string): boolean
  {
    // If column name entered already exists when autocomplete box goes out of focus, return false to roll back change
    // otherwise, if the name has actually changed - set the new name and add the rename transform and return true
    if (this.props.columnNames.delete(columnId).contains(localColumnName))
    {
      alert('column name: ' + localColumnName + ' already exists, duplicate column names are not allowed');
      return false;
    }

    if (this.props.columnNames.get(columnId) !== localColumnName)
    {
      Actions.setColumnName(columnId, this.props.columnNames.get(columnId), localColumnName);
      Actions.addTransform(
        {
          name: 'rename',
          colName: this.props.columnNames.get(columnId),
          args: {
            newName: localColumnName,
          },
        },
      );
      return true;
    }
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
    const templateNames = List(this.props.templates.get(this.state.templateId).originalNames);
    let isCompatible = true;
    const unmatchedTemplateNames = [];
    const unmatchedTableNames = this.props.columnNames.toArray();
    templateNames.map((templateName) =>
    {
      if (!this.props.columnNames.contains(templateName))
      {
        isCompatible = false;
        unmatchedTemplateNames.push(templateName);
      }
      else
      {
        unmatchedTableNames.splice(unmatchedTableNames.indexOf(templateName), 1);
      }
    });

    if (!isCompatible)
    {
      alert('Incompatible template, unmatched column names:\n' + JSON.stringify(unmatchedTemplateNames) + '\n and \n'
        + JSON.stringify(unmatchedTableNames));
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
  }

  /* parse the chunk to last new line character and add it to queue of chunks to be streamed
   * save the leftover chunk and append it to the front of the next chunk */
  // public parseChunk(chunk: string, isLast: boolean)
  // {
  //   if (isLast)
  //   {
  //     console.log('final chunk');
  //     this.setState({
  //       streamed: true,
  //     });
  //     Actions.updateQueue(chunk, chunk.length);
  //   }
  //   else
  //   {
  //     let index = 0;
  //     let end = 0;
  //     while (index < chunk.length)
  //     {
  //       if (chunk.charAt(index) === '\n')
  //       {
  //         end = index;
  //       }
  //       index++;
  //     }
  //     // console.log('chunk size: ', chunk.length);
  //     // console.log('chunk: ', chunk);
  //     // console.log('parsed chunk: ', chunk.substring(0, end));
  //     console.log('nextChunk: ', chunk.substring(end, chunk.length));
  //
  //     Actions.updateQueue(chunk, end);
  //   }
  // }

  public readChunk(chunk: Blob, id: number, isLast: boolean)
  {
    const fr = new FileReader();
    fr.readAsText(chunk);
    fr.onloadend = () =>
    {
      Actions.enqueueChunk(fr.result, id, isLast);
    };
  }

  public stream()
  {
    // let test: List<string> = List([]);
    // test = test.set(5, 'test');
    // console.log('test: ', test);
    //
    // test = test.set(1, 'test2');
    // console.log(test.first());
    let id = 0;

    console.log('setting up socket...');
    const socket = io(MIDWAY_HOST + '/', { path: '/import_streaming' });
    socket.on('connect', () =>
    {
      console.log('connected');
    });
    socket.on('request_auth', () =>
    {
      const authState = AuthStore.getState();
      socket.emit('auth', {
        id: authState.id,
        accessToken: authState.accessToken,
      });
    });
    socket.on('ready', () =>
    {
      console.log('ready');
      console.log('queue: ', this.props.chunkQueue);
      if (!this.props.chunkQueue.isEmpty())      // assume filereader parses chunks faster than backend processes them
      {
        console.log('chunk: ', this.props.chunkQueue.get(id));
        socket.send(this.props.chunkQueue.get(id));
        // Actions.dequeueChunk();
        id++;
      }
      else
      {
        console.log('finished');
        socket.emit('finished');
      }
    });
    socket.on('midway_error', (err) =>
    {
      console.log('error from midway: ' + String(err));
      // TODO: handle error analogously as from Ajax request (in non-streaming case)
      alert(String(err));
    });
    socket.on('midway_success', () =>
    {
      console.log('upsert successful!');
      // TODO: handle success analogously as from Ajax request (in non-streaming case)
      Actions.changeUploadInProgress();
      alert('successful');
    });
  }

  public handleElasticUpdateChange()
  {
    Actions.changeElasticUpdate();
  }

  public handleUploadFile()
  {
    Actions.uploadFile();

    if (this.props.streaming)
    {
      console.log('filesize: ', this.props.file.size);

      let fileStart = FileImportTypes.CHUNK_SIZE;   // 1 chunk read for preview already
      let id = 1;
      while (fileStart < this.props.file.size)
      {
        console.log('fileStart: ', fileStart);
        const chunk = this.props.file.slice(fileStart, fileStart + FileImportTypes.CHUNK_SIZE);
        this.readChunk(chunk, id, fileStart + FileImportTypes.CHUNK_SIZE > this.props.file.size);
        fileStart += FileImportTypes.CHUNK_SIZE;
        id++;
      }
      this.stream();
    }
  }

  public renderTemplate()
  {
    return (
      <div
        className='flex-container fi-preview-template'
      >
        <div
          className='flex-container fi-preview-template-wrapper'
        >
          <div
            className='flex-shrink fi-preview-template-button'
            onClick={this.handleLoadTemplate}
            style={buttonColors()}
            ref='fi-preview-template-button-load'
          >
            Load Template
          </div>
          <Dropdown
            selectedIndex={this.state.templateId}
            options={this.state.templateOptions}
            onChange={this.handleTemplateChange}
            className={'flex-shrink fi-preview-template-load-dropdown'}
            canEdit={true}
          />
        </div>

        <div
          className='flex-container fi-preview-template-wrapper'
        >
          <div
            className='flex-shrink fi-preview-template-button'
            onClick={this.handleSaveTemplate}
            style={buttonColors()}
            ref='fi-preview-template-button-save'
          >
            Save Template
          </div>
          <Autocomplete
            value={this.state.templateText}
            options={null}
            onChange={this.handleAutocompleteTemplateChange}
            placeholder={'template name'}
            className={'flex-shrink fi-preview-template-save-autocomplete'}
            disabled={false}
          />
        </div>
      </div>
    );
  }

  public renderTable()
  {
    return (
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
                columnName={this.props.columnNames.get(key)}
                columnNames={this.props.columnNames}
                isIncluded={this.props.columnsToInclude.get(key)}
                columnType={this.props.columnTypes.get(key)}
                isPrimaryKey={this.props.primaryKey === key}
                columnOptions={this.props.columnOptions}
                editing={key === this.state.editColumnId}
                handleEditColumnChange={this.handleEditColumnChange}
                onColumnNameChange={this.onColumnNameChange}
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
    );
  }

  public render()
  {
    return (
      <div
        className='fi-preview'
      >
        {this.renderTemplate()}
        {this.renderTable()}
        <div
          className='fi-import-button-wrapper'
        >
          <div
            className='fi-preview-update'
          >
            <CheckBox
              checked={this.props.elasticUpdate}
              onChange={this.handleElasticUpdateChange}
            />
            <span
              className='clickable'
              onClick={this.handleElasticUpdateChange}
            >
              Join against any existing entries
            </span>
          </div>
          <div
            className='fi-preview-import-button'
            onClick={this.handleUploadFile}
            style={buttonColors()}
          >
            Import
          </div>
        </div>
        {
          this.props.uploadInProgress &&
          <div className='fi-preview-loading-container'>
            <Loading
              width={100}
              height={100}
              loading={this.props.uploadInProgress}
              loaded={false}
              onLoadedEnd={null}
            />
          </div>
        }
      </div>
    );
  }
}

export default FileImportPreview;
