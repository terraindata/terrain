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
// tslint:disable:no-var-requires max-classes-per-file
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { instanceFnDecorator } from 'shared/util/Classes';

import ObjectForm from 'common/components/ObjectForm';
import DatabasePicker from 'etl/common/components/DatabasePicker';
import FileConfigForm from 'etl/common/components/FileConfigForm';
import UploadFileButton from 'etl/common/components/UploadFileButton';
import AlgorithmSelector from 'library/components/AlgorithmSelector';
import { LibraryState } from 'library/LibraryTypes';
import { _FileConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import
{
  FileConfig as FileConfigI, HttpOptions,
  SftpOptions, SinkOptionsType, Sinks, SourceOptionsType,
  Sources, SQLOptions,
} from 'shared/etl/types/EndpointTypes';
import { FileTypes, Languages } from 'shared/etl/types/ETLTypes';

const { List } = Immutable;

export interface Props
{
  isSource?: boolean;
  endpoint: SinkConfig | SourceConfig;
  onChange: (newConfig: SinkConfig | SourceConfig, apply?: boolean) => void;
}

const fileTypeList = List([FileTypes.Json, FileTypes.Csv, FileTypes.Xml]);

abstract class EndpointFormBase<State, P extends Props = Props> extends TerrainComponent<P>
{
  public abstract inputMap: InputDeclarationMap<State>;
  public showFileConfig = true; // override this to hide

  constructor(props)
  {
    super(props);
    this.handleFileConfigChange = this.handleFileConfigChange.bind(this);
    this.handleOptionsFormChange = this.handleOptionsFormChange.bind(this);
  }

  // By default, options state is indentical form to the endpoint options object
  // Override this
  public optionsToFormState(options: SinkOptionsType<any> | SourceOptionsType<any>): State
  {
    return options;
  }

  public formStateToOptions(newState: State): SinkOptionsType<any> | SourceOptionsType<any>
  {
    return newState;
  }

  public render()
  {
    const { fileConfig, options } = this.props.endpoint;
    const inputState = this.optionsToFormState(options);
    return (
      <div>
        <DynamicForm
          inputMap={this.inputMap}
          inputState={inputState}
          onStateChange={this.handleOptionsFormChange}
        />
        {
          this.showFileConfig ?
            <FileConfigForm
              fileConfig={fileConfig}
              onChange={this.handleFileConfigChange}
            /> : null
        }
      </div>
    );
  }

  public handleOptionsFormChange(formState: State, apply?: boolean)
  {
    const { onChange, endpoint } = this.props;
    const newOptions = this.formStateToOptions(formState);
    onChange(endpoint.set('options', newOptions), apply);
  }

  private handleFileConfigChange(config: FileConfig, apply?: boolean)
  {
    const { onChange, endpoint } = this.props;
    onChange(endpoint.set('fileConfig', config), apply);
  }
}

type UploadState = SourceOptionsType<Sources.Upload>;
class UploadEndpoint extends EndpointFormBase<UploadState>
{
  public inputMap: InputDeclarationMap<UploadState> = {
    file: {
      type: DisplayType.Custom,
      style: { padding: '0px' },
      options: {
        render: this.renderFilePicker,
      },
    },
  };

  public renderFilePicker(state: UploadState, disabled: boolean)
  {
    return (
      <UploadFileButton
        file={state.file}
        onChange={this.handleFileChange}
      />
    );
  }

  public handleFileChange(file: File)
  {
    const { onChange, endpoint } = this.props;
    const newOptions = { file };
    onChange(endpoint.set('options', newOptions));
  }
}

type AlgorithmState = SourceOptionsType<Sources.Algorithm>;
class AlgorithmEndpointC extends EndpointFormBase<AlgorithmState>
{
  public showFileConfig = false;
  public state: {
    ids: List<number>,
  };
  public defaultIds = List([-1, -1, -1]);

  public inputMap: InputDeclarationMap<AlgorithmState> = {
    algorithmId: {
      type: DisplayType.Custom,
      options: {
        render: this.renderAlgorithmSelector,
      },
    },
  };

  constructor(props)
  {
    super(props);
    const { algorithmId } = props.endpoint.options;
    this.state = {
      ids: this.computeIds(algorithmId),
    };
  }

  public optionsToFormState(options: SinkOptionsType<any> | SourceOptionsType<any>)
  {
    return _.extend({}, options, { ids: this.state.ids });
  }

  public computeIds(algorithmId)
  {
    if (algorithmId === -1 || algorithmId == null)
    {
      return this.defaultIds;
    }

    const { library } = this.props as any;
    const algorithm = (library as LibraryState).algorithms.get(algorithmId);

    if (algorithm == null)
    {
      return this.defaultIds;
    }

    return List([algorithm.categoryId, algorithm.groupId, algorithmId]);
  }

  public componentWillReceiveProps(nextProps)
  {
    const { algorithmId } = nextProps.endpoint.options;
    const ids = this.computeIds(algorithmId);
    if (!ids.equals(this.defaultIds))
    {
      this.setState({
        ids,
      });
    }
  }

  public renderAlgorithmSelector(state: AlgorithmState, disabled: boolean)
  {
    const { library } = this.props as any;
    const { algorithmId } = state;
    const algorithm = (library as LibraryState).algorithms.get(algorithmId);
    let ids = this.state.ids;
    if (algorithm != null)
    {
      ids = List([algorithm.categoryId, algorithm.groupId, algorithmId]) as List<number>;
    }

    return (
      <AlgorithmSelector
        ids={ids}
        onChangeSelection={this.handleSelectionChange}
      />
    );
  }

  public handleSelectionChange(ids: List<number>)
  {
    const { onChange, endpoint } = this.props;
    const newOptions = { algorithmId: ids.get(2) };
    this.setState({
      ids,
    });
    onChange(endpoint.set('options', newOptions));
  }
}
const AlgorithmEndpoint = Util.createContainer(
  AlgorithmEndpointC,
  ['library'],
  {},
);

type SftpState = SftpOptions;
class SftpEndpoint extends EndpointFormBase<SftpState>
{
  public inputMap: InputDeclarationMap<SftpState> = {
    filepath: {
      type: DisplayType.TextBox,
      displayName: 'Filepath',
    },
    credentialId: {
      type: DisplayType.NumberBox,
      displayName: 'Credential ID',
    },
  };
}

interface HttpState extends Partial<HttpOptions>
{
  accept: string;
  contentType: string;
}

const httpMethods = List(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);

class HttpEndpointForm extends EndpointFormBase<HttpOptions>
{
  public inputMap: InputDeclarationMap<HttpOptions> = {
    method: {
      type: DisplayType.Pick,
      displayName: 'Method',
      options: {
        pickOptions: (s) => httpMethods,
        indexResolver: (value) => httpMethods.indexOf(value),
      },
    },
    headers: {
      type: DisplayType.Custom,
      widthFactor: 7,
      options: {
        render: this.renderHeadersForm,
      },
    },
    params: {
      type: DisplayType.Custom,
      widthFactor: 7,
      options: {
        render: this.renderParamsForm,
      },
    },
  };

  public renderHeadersForm(state: HttpOptions, disabled)
  {
    return (
      <ObjectForm
        object={state.headers}
        onChange={this.handleHeadersChange}
        label='Headers'
      />
    );
  }

  public handleHeadersChange(newHeaders, apply?: boolean)
  {
    const { options } = this.props.endpoint;
    const newFormState: HttpOptions = _.extend({}, options);
    newFormState.headers = newHeaders;
    this.handleOptionsFormChange(newFormState, apply);
  }

  public renderParamsForm(state: HttpOptions, disabled)
  {
    return (
      <ObjectForm
        object={state.params}
        onChange={this.handleParamsChange}
        label='Parameters'
      />
    );
  }

  public handleParamsChange(newParams, apply?: boolean)
  {
    const { options } = this.props.endpoint;
    const newFormState: HttpOptions = _.extend({}, options);
    newFormState.params = newParams;
    this.handleOptionsFormChange(newFormState, apply);
  }
}

type DownloadState = SinkOptionsType<Sinks.Download>;
class DownloadEndpoint extends EndpointFormBase<DownloadState>
{
  public inputMap: InputDeclarationMap<DownloadState> = {

  };
}

type DatabaseState = SinkOptionsType<Sinks.Database>;

class DatabaseEndpoint extends EndpointFormBase<DatabaseState>
{
  public showFileConfig = false;
  public inputMap: InputDeclarationMap<DatabaseState> = {
    serverId: {
      type: DisplayType.Custom,
      widthFactor: 5,
      style: { padding: '0px' },
      options: {
        render: this.renderDatabasePicker,
      },
    },
  };

  public renderDatabasePicker(state: DatabaseState, disabled: boolean)
  {
    const { language, serverId, database, table } = state;
    return (
      <DatabasePicker
        language={state.language}
        serverId={serverId != null ? serverId : -1}
        database={database != null ? database : ''}
        table={'data'}
        onChange={this.handleDbPickerChange}
        constantHeight={true}
      />
    );
  }

  public handleDbPickerChange(serverId: ID, database: string, table: string, language: Languages)
  {
    const { onChange, endpoint } = this.props;
    const newOptions = { serverId, database, table, language };
    onChange(endpoint.set('options', newOptions));
  }
}

type FsState = SinkOptionsType<Sinks.Fs>;
class FsEndpoint extends EndpointFormBase<FsState>
{
  public inputMap: InputDeclarationMap<FsState> = {};
}

type SQLState = SQLOptions;
class SQLEndpoint extends EndpointFormBase<SQLState>
{
  public inputMap: InputDeclarationMap<SQLState> = {
    query: {
      type: DisplayType.TextBox,
      displayName: 'Query',
    },
  };
}

// exports
type FormLookupMap<E extends string> =
  {
    [k in E]: React.ComponentClass<Props>
  };

export const SourceFormMap: FormLookupMap<Sources> =
  {
    [Sources.Upload]: UploadEndpoint,
    [Sources.Algorithm]: AlgorithmEndpoint,
    [Sources.Sftp]: SftpEndpoint,
    [Sources.Http]: HttpEndpointForm,
    [Sources.Fs]: FsEndpoint,
    [Sources.Mysql]: SQLEndpoint,
    [Sources.Postgresql]: SQLEndpoint,
  };

export const SinkFormMap: FormLookupMap<Sinks> =
  {
    [Sinks.Download]: DownloadEndpoint,
    [Sinks.Database]: DatabaseEndpoint,
    [Sinks.Sftp]: SftpEndpoint,
    [Sinks.Http]: HttpEndpointForm,
    [Sinks.Fs]: FsEndpoint,
  };
