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

// tslint:disable:no-var-requires strict-boolean-expressions max-line-length

import * as classNames from 'classnames';
import { tooltip } from 'common/components/tooltip/Tooltips';
import { List } from 'immutable';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import { server } from '../../../../midway/src/Midway';
import { backgroundColor, buttonColors, Colors, disabledButtonColors, fontColor } from '../../colors/Colors';
import Modal from '../../common/components/Modal';
import { isValidIndexName, isValidTypeName } from './../../../../shared/database/elastic/ElasticUtil';
import { CSVTypeParser } from './../../../../shared/etl/CSVTypeParser';
import { parseCSV, ParseCSVConfig, parseNewlineJSONSubset, parseObjectListJSONSubset } from './../../../../shared/Util';
import Autocomplete from './../../common/components/Autocomplete';
import Dropdown from './../../common/components/Dropdown';
import TerrainComponent from './../../common/components/TerrainComponent';
import { databaseId, tableId } from './../../schema/SchemaTypes';
import * as SchemaTypes from './../../schema/SchemaTypes';
import has = Reflect.has;
import Util from './../../util/Util';
import Actions from './../data/FileImportActions';
import FileImportStore from './../data/FileImportStore';
import * as FileImportTypes from './../FileImportTypes';
import { Steps } from './../FileImportTypes';
import './FileImport.less';
import FileImportPreview from './FileImportPreview';

const HTML5Backend = require('react-dnd-html5-backend');

const ArrowIcon = require('./../../../images/icon_carrot.svg');
const PREVIEW_CHUNK_SIZE = FileImportTypes.PREVIEW_CHUNK_SIZE;

export interface Props
{
  schema: SchemaTypes.SchemaState;
  params?: any;
  location?: any;
  router?: any;
  route?: any;
}

interface State
{
  fileImportState: FileImportTypes.FileImportState;
  columnOptionNames: List<string>;
  stepId: number;
  servers?: SchemaTypes.ServerMap;
  serverNames: List<string>;
  serverIndex: number;
  dbs?: SchemaTypes.DatabaseMap;
  dbNames: List<string>;
  tables?: SchemaTypes.TableMap;
  tableNames: List<string>;
  fileSelected: boolean;
}

@Radium
class FileImport extends TerrainComponent<any>
{
  public state: State;

  constructor(props)
  {
    super(props);

    const { schema } = props;

    this.state = {
      fileImportState: FileImportStore.getState(),
      columnOptionNames: List([]),
      stepId: 0,
      serverIndex: -1,
      dbNames: List([]),
      tableNames: List([]),
      fileSelected: false,
      servers: schema.servers,
      dbs: schema.databases,
      tables: schema.tables,
      serverNames: schema.servers.keySeq().toList(),
    };

    this._subscribe(FileImportStore, {
      stateKey: 'fileImportState',
    });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    const { schema } = nextProps;

    this.setState({
      servers: schema.servers,
      dbs: schema.databases,
      tables: schema.tables,
      serverNames: schema.servers.keySeq().toList(),
    });
  }

  public setError(err: string)
  {
    Actions.setErrorMsg(err);
  }

  public incrementStep()
  {
    this.setState({
      stepId: this.state.stepId + 1,
    });
  }

  public decrementStep()
  {
    const { file, filetype } = this.state.fileImportState;
    if (filetype === 'csv' && this.state.stepId - 1 === Steps.CsvJsonOptions)
    {
      this.parseFile(file, filetype, false, false, false);
    }
    this.setState({
      stepId: this.state.stepId - 1,
    });
  }

  public handleServerChange(serverIndex: number)
  {
    const { servers, serverNames } = this.state;
    const serverName = serverNames.get(serverIndex);
    this.setState({
      serverIndex,
      dbNames: List(servers.get(serverName).databaseIds.map((db) =>
        db.split('/').pop(),
      )),
    });

    Actions.changeServer(this.state.servers.get(serverName).connectionId, serverName);
    this.incrementStep();
  }

  public handleAutocompleteDbChange(dbName: string)
  {
    const { dbs } = this.state;
    const { serverName } = this.state.fileImportState;
    this.setState({
      tableNames: dbName && dbs.get(databaseId(serverName, dbName)) ?
        List(dbs.get(databaseId(serverName, dbName)).tableIds.map((table) =>
          table.split('.').pop(),
        ))
        :
        List([]),
    });

    Actions.changeDbName(dbName);
  }

  public handleAutocompleteTableChange(tableName: string)
  {
    const { tables } = this.state;
    const { serverName, dbName } = this.state.fileImportState;
    this.setState({
      columnOptionNames: tableName && tables.get(tableId(serverName + '/' + dbName, tableName)) ?
        List(tables.get(tableId(serverName + '/' + dbName, tableName)).columnIds.map((column) =>
          column.split('.').pop(),
        ))
        :
        List([]),
    });

    Actions.changeTableName(tableName);
  }

  public parseJson(file: string, isNewlineSeparatedJSON: boolean): object[]
  {
    let items: object[] = [];
    if (isNewlineSeparatedJSON)
    {
      const newlineJSON: object[] | string = parseNewlineJSONSubset(file, FileImportTypes.NUMBER_PREVIEW_ROWS);
      if (typeof newlineJSON === 'string')
      {
        Actions.setErrorMsg(newlineJSON);
        return undefined;
      }
      items = newlineJSON;
    }
    else
    {
      try
      {
        items = parseObjectListJSONSubset(file, FileImportTypes.NUMBER_PREVIEW_ROWS);
      }
      catch (e)
      {
        Actions.setErrorMsg(String(e));
        return undefined;
      }
      if (!Array.isArray(items))
      {
        Actions.setErrorMsg('Input JSON file must parse to an array of objects.');
        return undefined;
      }
    }
    return items;
  }

  public parseCsv(file: string, hasCsvHeader: boolean): object[]
  {
    if (hasCsvHeader)
    {
      const testDuplicateConfig: ParseCSVConfig = {
        preview: 1,
        hasHeaderRow: false,
        error: this._fn(this.setError),
      };

      const columnHeaders: object[] = parseCSV(file, testDuplicateConfig);
      if (columnHeaders === undefined)
      {
        return undefined;
      }
      const colHeaderSet: Set<string> = new Set();
      const duplicateHeaderSet: Set<string> = new Set();
      _.map(columnHeaders[0] as string[], (colHeader) =>
      {
        if (colHeaderSet.has(colHeader))
        {
          duplicateHeaderSet.add(colHeader);
        }
        else
        {
          colHeaderSet.add(colHeader);
        }
      });
      if (duplicateHeaderSet.size > 0)
      {
        alert('duplicate column names not allowed: ' + JSON.stringify(Array.from(duplicateHeaderSet)));
        return undefined;
      }
    }
    const config: ParseCSVConfig = {
      preview: FileImportTypes.NUMBER_PREVIEW_ROWS,
      hasHeaderRow: hasCsvHeader,
      error: this._fn(this.setError),
    };
    return parseCSV(file, config);
  }

  public parseFile(file: File, filetype: string, hasCsvHeader: boolean, isNewlineSeparatedJSON: boolean, incrementStep?: boolean)
  {
    const fileToRead: Blob = file.slice(0, PREVIEW_CHUNK_SIZE);
    const fr = new FileReader();
    fr.readAsText(fileToRead);
    fr.onloadend = () =>
    {
      // assume preview fits in one chunk
      let items: object[];
      switch (filetype)
      {
        case 'json':
          items = this.parseJson(fr.result, isNewlineSeparatedJSON);
          break;
        case 'csv':
          items = this.parseCsv(fr.result, hasCsvHeader);
          break;
        default:
      }
      if (items === undefined)
      {
        return;
      }

      let columnNames: string[] = [];
      switch (filetype)
      {
        case 'json':
          const columnNamesSet: Set<string> = new Set();
          for (const obj of items)
          {
            for (const key of Object.keys(obj))
            {
              columnNamesSet.add(key);
            }
          }
          columnNames = Array.from(columnNamesSet);
          break;
        case 'csv':
          columnNames = _.map(items[0] as any, (value, index) =>
            !hasCsvHeader ? 'column ' + String(index) : index, // csv's with no header row will be named 'column 0, column 1...'
          ) as string[];
          break;
        default:
      }

      const columnNamesToMap: string[] =
        filetype === 'json' || (filetype === 'csv' && hasCsvHeader) ?
          columnNames
          :
          _.range(columnNames.length).map((num) => num.toString());

      let previewColumns;
      switch (filetype)
      {
        case 'csv':
          previewColumns = columnNamesToMap.map((name) =>
            List(items.map((item) => item[name])));
          break;
        case 'json':
          previewColumns = columnNamesToMap.map((name) =>
            List(items.map((item) =>
            {
              if (typeof item[name] === 'string')
              {
                return item[name];
              }
              else
              {
                return JSON.stringify(item[name]);
              }
            })));
          break;
        default:
      }
      if (previewColumns === undefined)
      {
        return;
      }
      const typeParser = new CSVTypeParser();
      const types: string[][] = previewColumns.map((column) => typeParser.getBestTypeFromArrayAsArray(column));
      const treeTypes: FileImportTypes.ColumnTypesTree[] = types.map(this.buildColumnTypesTreeFromArray);

      Actions.chooseFile(filetype, file.size, List(previewColumns), List(columnNames), List(treeTypes));
      this.setState({
        fileSelected: true,
      });
      if (incrementStep !== false)
      {
        this.incrementStep();
      }
    };
  }

  public buildColumnTypesTreeFromArray(typeArr: string[]): FileImportTypes.ColumnTypesTree
  {
    const typeObj = {};
    typeObj['type'] = typeArr[0];
    if (typeArr.length > 1)
    {
      typeArr.shift();
      typeObj['innerType'] = this.buildColumnTypesTreeFromArray(typeArr);
    }
    return FileImportTypes._ColumnTypesTree(typeObj);
  }

  public handleSelectFile(file)
  {
    const fileSelected = !!file.target.files[0];
    if (!fileSelected)
    {
      return;
    }
    this.setState({
      fileSelected: false,
    });

    const filetype: string = file.target.files[0].name.split('.').pop();
    if (FileImportTypes.FILE_TYPES.indexOf(filetype) === -1)
    {
      alert('Invalid filetype: ' + String(filetype));
      return;
    }
    Actions.saveFile(file.target.files[0], filetype);

    if (filetype === 'csv')
    {
      this.parseFile(file.target.files[0], filetype, false, false);
    }
    else
    {
      this.incrementStep();
    }
  }

  public handleSelectFileButtonClick()
  {
    this.refs['file']['value'] = null; // prevent file-caching
    this.refs['file']['click']();
  }

  public handleCsvHeaderChoice(hasCsvHeader: boolean)
  {
    Actions.changeHasCsvHeader(hasCsvHeader);
    const { file, filetype } = this.state.fileImportState;
    this.parseFile(file, filetype, hasCsvHeader, false);
  }

  public handleJSONFormatChoice(isNewlineSeparatedJSON: boolean)
  {
    Actions.changeIsNewlineSeparatedJSON(isNewlineSeparatedJSON);
    const { file, filetype } = this.state.fileImportState;
    this.parseFile(file, filetype, false, isNewlineSeparatedJSON);
  }

  public handleSelectDb(dbName: string)
  {
    const msg = isValidIndexName(dbName);
    if (msg)
    {
      Actions.setErrorMsg(msg);
      return;
    }
    this.incrementStep();
  }

  public handleSelectTable(tableName: string)
  {
    const msg = isValidTypeName(tableName);
    if (msg)
    {
      Actions.setErrorMsg(msg);
      return;
    }
    this.incrementStep();
  }

  public onFileImportSuccess()
  {
    this.setState({
      stepId: Steps.Success,
    });
  }

  public importAnotherFile()
  {
    this.setState({
      stepId: Steps.ChooseFile,
    });
  }

  public renderSelect()
  {
    return (
      <div>
        <div
          className='flex-container fi-content-choose'
        >
          <input ref='file' type='file' accept='.csv,.json' name='abc' onChange={this.handleSelectFile} />
          <div
            className='fi-content-choose-button large-button'
            onClick={this.handleSelectFileButtonClick}
            style={buttonColors()}
            ref='fi-content-choose-button'
          >
            Choose File
          </div>
        </div>
      </div>
    );
  }

  public renderCsv()
  {
    const { previewColumns } = this.state.fileImportState;
    return (
      <div
        className='fi-content-csv-wrapper'
      >
        <div
          className='fi-content-csv'
        >
          <div
            className='fi-content-csv-option button'
            onClick={this._fn(this.handleCsvHeaderChoice, true)}
            style={buttonColors()}
            ref='fi-yes-button'
          >
            Yes
          </div>
          <div
            className='fi-content-csv-option button'
            onClick={this._fn(this.handleCsvHeaderChoice, false)}
            style={buttonColors()}
            ref='fi-no-button'
          >
            No
          </div>
        </div>
        <div
          className='fi-content-preview-columns-wrapper'
        >
          <div
            className='flex-container fi-content-preview-columns'
          >
            {
              previewColumns.map((column, columnKey) =>
                <div
                  key={columnKey}
                  className='flex-container fi-content-preview-columns-column'
                >
                  {
                    column.map((item, itemKey) =>
                      <div
                        key={columnKey + itemKey}
                        className='fi-content-preview-columns-column-cell'
                        style={[
                          fontColor(Colors().text1),
                          backgroundColor(Colors().bg2),
                        ]}
                      >
                        <div
                          className='fi-content-preview-columns-column-cell-text'
                        >
                          {
                            item
                          }
                        </div>
                      </div>,
                    )
                  }
                </div>,
              )
            }
          </div>
        </div>
      </div>
    );
  }

  public renderJSON()
  {
    return (
      <div
        className='fi-content-json-wrapper'
      >
        <div
          className='fi-content-json'
        >
          {
            tooltip(
              <div
                className='fi-content-json-option button'
                onClick={() => this.handleJSONFormatChoice(true)}
                style={buttonColors()}
                ref='fi-yes-button'
              >
                Newline
          </div>,
              'The rows in your file are separated by new lines')
          }
          {tooltip(
            <div
              className='fi-content-json-option button'
              onClick={() => this.handleJSONFormatChoice(false)}
              style={buttonColors()}
              ref='fi-no-button'
            >
              Object list
          </div>
            , 'The rows in your file are separated by commas (Your file is a syntactically-correct JSON file)')
          }
        </div>
      </div>
    );
  }

  public renderSteps()
  {
    const { filetype } = this.state.fileImportState;
    const stepTitle: string =
      this.state.stepId === Steps.CsvJsonOptions ?
        FileImportTypes.STEP_TWO_TITLES[filetype === 'csv' ? 0 : filetype === 'json' ? 1 : undefined]
        :
        FileImportTypes.STEP_TITLES[this.state.stepId];

    return (
      <div className='fi-step'>
        <div className='fi-step-name'>
          {
            FileImportTypes.STEP_NAMES[this.state.stepId]
          }
        </div>
        {
          <div className='fi-step-title'>
            {
              stepTitle
            }
          </div>
        }
      </div>
    );
  }

  public renderContent()
  {
    const { fileImportState } = this.state;
    const { filetype, filesize, serverName, serverId, dbName, tableName } = fileImportState;

    const { previewColumns, columnNames, columnsToInclude, columnTypes, primaryKeys, primaryKeyDelimiter } = fileImportState;
    const { templates, transforms, uploadInProgress, elasticUpdate, requireJSONHaveAllFields, exportRank, objectKey } = fileImportState;
    // const { previewRows, columnNames, columnsToInclude, columnTypes, primaryKeys, primaryKeyDelimiter } = fileImportState;
    // const { templates, transforms, uploadInProgress, elasticUpdate, requireJSONHaveAllFields, exportRank, objectKey } = fileImportState;

    let content;
    switch (this.state.stepId)
    {
      case Steps.ChooseFile:
        content = this.renderSelect();
        break;
      case Steps.CsvJsonOptions:
        content = filetype === 'csv' ? this.renderCsv() : filetype === 'json' ? this.renderJSON() : undefined;
        break;
      case Steps.SelectServer:
        content =
          <Dropdown
            selectedIndex={serverId !== -1 ? this.state.serverIndex : -1}
            options={this.state.serverNames}
            onChange={this.handleServerChange}
            canEdit={true}
            unmountOnChange={true}
          />;
        break;
      case Steps.SelectDb:
        content = [
          <Autocomplete
            value={dbName}
            options={this.state.dbNames}
            onChange={this.handleAutocompleteDbChange}
            placeholder={'index'}
            disabled={false}
            onEnter={this._fn(this.handleSelectDb)}
            onSelectOption={this._fn(this.handleSelectDb)}
            key={'fi-content-autocomplete-db'}
          />,
          <div
            className='fi-content-subtext'
            key={'fi-content-subtext-db'}
          >
            <span
              className='fi-content-subtext-text'
            >
              {
                FileImportTypes.STEP_SUBTEXT.DATABASE_SUBTEXT
              }
            </span>
          </div>,
        ];
        break;
      case Steps.SelectTable:
        content = [
          <Autocomplete
            value={tableName}
            options={this.state.tableNames}
            onChange={this.handleAutocompleteTableChange}
            placeholder={'type'}
            disabled={false}
            onEnter={this._fn(this.handleSelectTable)}
            onSelectOption={this._fn(this.handleSelectTable)}
            key={'fi-content-autocomplete-table'}
          />,
          <div
            className='fi-content-subtext'
            key={'fi-content-subtext-table'}
          >
            <span
              className='fi-content-subtext-text'
            >
              {
                FileImportTypes.STEP_SUBTEXT.TABLE_SUBTEXT
              }
            </span>
          </div>,
        ];
        break;
      case Steps.Preview:
        content =
          <FileImportPreview
            exporting={false}
            previewColumns={previewColumns}
            primaryKeys={primaryKeys}
            primaryKeyDelimiter={primaryKeyDelimiter}
            columnNames={columnNames}
            columnsToInclude={columnsToInclude}
            columnTypes={columnTypes}
            templates={templates}
            transforms={transforms}
            columnOptions={this.state.columnOptionNames}
            uploadInProgress={uploadInProgress}
            filetype={filetype}
            requireJSONHaveAllFields={requireJSONHaveAllFields}
            objectKey={objectKey}
            exportRank={exportRank}
            elasticUpdate={elasticUpdate}
            showProgressBar={filesize > FileImportTypes.MIN_PROGRESSBAR_FILESIZE}
            handleFileImportSuccess={this.onFileImportSuccess}
            router={this.props.router}
            route={this.props.route}
            existingIndexAndType={this.state.dbNames.contains(dbName) && this.state.tableNames.contains(tableName)}
          />;
        break;
      case Steps.Success:
        content =
          <div className='fi-import-success-wrapper'>
            <div
              className='fi-import-success-header'
              style={
                [fontColor(Colors().active)]
              }
            >
              Success!
              </div>
            <div className='fi-import-success-info'>
              Your data were successfully imported into
                <div className='fi-import-success-info-row fi-import-success-info-row-top'> <span>Server:</span> {serverName} </div>
              <div className='fi-import-success-info-row'> <span>Index:</span> {dbName} </div>
              <div className='fi-import-success-info-row'> <span>Type:</span> {tableName} </div>
            </div>
            <div
              className='fi-import-success-button button'
              onClick={this.importAnotherFile}
              style={buttonColors()}
            >
              Import Another File
              </div>
          </div>;
        break;
      default:
    }

    return (
      <div
        className='fi-content'
        style={backgroundColor(this.state.stepId === Steps.ChooseFile ? Colors().bg1 : Colors().bg3)}
      >
        {
          content
        }
      </div>
    );
  }

  public renderNav()
  {
    const { stepId, fileSelected } = this.state;
    const { serverName, dbName, tableName } = this.state.fileImportState;
    let nextEnabled: boolean = false;
    let backEnabled: boolean = true;
    let errorMsg: string = '';
    switch (stepId)
    {
      case Steps.ChooseFile:
        nextEnabled = fileSelected;
        backEnabled = false;
        break;
      case Steps.CsvJsonOptions:
        nextEnabled = false;
        break;
      case Steps.SelectServer:
        errorMsg = 'No server selected';
        nextEnabled = !!serverName;
        break;
      case Steps.SelectDb:
        errorMsg = isValidIndexName(dbName);
        nextEnabled = !errorMsg;
        break;
      case Steps.SelectTable:
        errorMsg = isValidTypeName(tableName);
        nextEnabled = !errorMsg;
        break;
      case Steps.Preview:
        break;
      case Steps.Success:
        backEnabled = false;
        break;
      default:
    }

    return (
      <div
        className='flex-container fi-nav'
      >
        {
          backEnabled &&
          <div
            className='fi-back-button button'
            onClick={this.decrementStep}
            style={buttonColors()}
            ref='fi-back-button'
          >
            <ArrowIcon
              className='back'
            />
            Back
          </div>
        }
        {
          stepId > Steps.CsvJsonOptions && stepId < Steps.Preview &&
          <div
            className='fi-next-button button'
            onClick={nextEnabled ? this.incrementStep : this._fn(this.setError, errorMsg)}
            style={[
              nextEnabled ? buttonColors() : disabledButtonColors(),
              fontColor(Colors().text1),
            ]}
            ref='fi-next-button'
          >
            Next
            <ArrowIcon
              className='next'
            />
          </div>
        }
      </div>
    );
  }

  public renderError()
  {
    const { errorMsg } = this.state.fileImportState;
    return (
      <Modal
        open={!!errorMsg}
        message={errorMsg}
        error={true}
        onClose={this._fn(this.setError, '')}
      />
    );
  }

  public render()
  {
    return (
      <div
        className='file-import'
      >
        <div
          className={classNames({
            'file-import-inner': true,
            'file-import-inner-server-step': this.state.stepId === Steps.SelectServer,
            'file-import-inner-scroll': this.state.stepId === Steps.Preview,
          })}
        >
          {this.renderError()}
          {this.renderSteps()}
          {this.renderContent()}
          {this.renderNav()}
        </div>
      </div>
    );
  }
}

// ReactRouter does not like the output of DragDropContext, hence the `any` cast
const FileImportContainer = Util.createContainer(FileImport, ['schema'], {});
const ExportFileImport = DragDropContext(HTML5Backend)(FileImportContainer) as any;

export default ExportFileImport;
