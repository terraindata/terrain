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
import { instanceFnDecorator } from 'src/app/Classes';

import { _FileConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { ETLTemplate, TemplateEditorState } from 'etl/templates/TemplateTypes';
import
{
  FileConfig as FileConfigI, HttpOptions,
  SftpOptions, SinkOptionsType, Sinks,
  SourceOptionsType, Sources,
} from 'shared/etl/types/EndpointTypes';
import { FileTypes } from 'shared/etl/types/ETLTypes';

import './EndpointOptions.less';

const { List } = Immutable;

export interface Props
{
  isSource?: boolean;
  endpoint: SinkConfig | SourceConfig;
  onChange: (newConfig: SinkConfig | SourceConfig) => void;
}

const fileTypeList = List([FileTypes.Json, FileTypes.Csv]);

function fixUndefined<S>(inputMap: InputDeclarationMap<S>, object: S): S
{
  const fixes = {};
  for (const key of Object.keys(inputMap))
  {
    if (object[key] === undefined)
    {
      if (inputMap[key].type === DisplayType.CheckBox)
      {
        fixes[key] = true;
      }
      else if (inputMap[key].type === DisplayType.Pick)
      {
        fixes[key] = -1;
      }
      else
      {
        fixes[key] = '';
      }
    }
  }
  return _.extend({}, object, fixes);
}

abstract class EndpointForm<State> extends TerrainComponent<Props>
{
  public abstract inputMap: InputDeclarationMap<State>;

  public fileConfigInputMap: InputDeclarationMap<FileConfigI> =
    {
      fileType: {
        type: DisplayType.Pick,
        displayName: 'File Type',
        group: 'row1',
        options: {
          pickOptions: (s: FileConfigI) => fileTypeList,
          indexResolver: (value) => fileTypeList.indexOf(value),
        },
      },
      hasCsvHeader: {
        type: DisplayType.CheckBox,
        displayName: 'File Has CSV Header',
        group: 'row1',
        shouldShow: (s: FileConfigI) => s.fileType === FileTypes.Csv ? DisplayState.Active : DisplayState.Hidden,
      },
      jsonNewlines: {
        type: DisplayType.CheckBox,
        displayName: 'Objects seperated by newlines',
        group: 'row1',
        shouldShow: (s: FileConfigI) => s.fileType === FileTypes.Json ? DisplayState.Active : DisplayState.Hidden,
      },
    };

  constructor(props)
  {
    super(props);
    // this.optionsToFormState = this.optionsToFormState.bind(this);
    // this.formStateToOptions = this.optionsToFormState.bind(this);
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

  @instanceFnDecorator(memoizeOne)
  public fileConfigToFormState(config: FileConfig): FileConfigI
  {
    const { fileType, hasCsvHeader, jsonNewlines } = config;
    return {
      fileType,
      hasCsvHeader,
      jsonNewlines,
    };
  }

  public render()
  {
    const { fileConfig, options } = this.props.endpoint;
    const inputState = fixUndefined(this.inputMap, this.optionsToFormState(options));
    return (
      <div>
        <DynamicForm
          inputMap={this.inputMap}
          inputState={inputState}
          onStateChange={this.handleOptionsFormChange}
        />
        <DynamicForm
          inputMap={this.fileConfigInputMap}
          inputState={this.fileConfigToFormState(fileConfig)}
          onStateChange={this.handleFileConfigChange}
        />
      </div>
    );
  }

  private handleFileConfigChange(configState: FileConfigI)
  {
    const { onChange, endpoint } = this.props;
    const newFileConfig = _FileConfig(configState);
    onChange(endpoint.set('fileConfig', newFileConfig));
  }

  private handleOptionsFormChange(formState: State)
  {
    const { onChange, endpoint } = this.props;
    const newOptions = this.formStateToOptions(formState);
    onChange(endpoint.set('options', newOptions));
  }
}

type UploadState = SourceOptionsType<Sources.Upload>;
class UploadEndpoint extends EndpointForm<UploadState>
{
  public inputMap: InputDeclarationMap<UploadState> = {};
}

type AlgorithmState = SourceOptionsType<Sources.Algorithm>;

class AlgorithmEndpoint extends EndpointForm<AlgorithmState>
{
  public inputMap: InputDeclarationMap<AlgorithmState> = {
    algorithmId: {
      type: DisplayType.NumberBox,
      displayName: 'Algorithm Id',
    },
  };
}

type SftpState = SftpOptions;

class SftpEndpoint extends EndpointForm<SftpState>
{
  public inputMap: InputDeclarationMap<SftpState> = {
    ip: {
      type: DisplayType.TextBox,
      displayName: 'IP Address',
      group: 'addr row',
    },
    port: {
      type: DisplayType.NumberBox,
      displayName: 'Port',
      group: 'addr row',
    },
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

class HttpEndpoint extends EndpointForm<HttpState>
{
  public inputMap: InputDeclarationMap<HttpState> = {
    url: {
      type: DisplayType.TextBox,
      displayName: 'URL',
    },
    methods: {
      type: DisplayType.Pick,
      displayName: 'Methods',
      options: {
        pickOptions: (s) => httpMethods,
        indexResolver: (value) => httpMethods.indexOf(value),
      },
    },
    accept: {
      type: DisplayType.TextBox,
      displayName: 'Accept',
      group: 'headers',
    },
    contentType: {
      type: DisplayType.TextBox,
      displayName: 'Content Type',
      group: 'headers',
    },
  };

  public optionsToFormState(options: HttpOptions): HttpState
  {
    const { url, methods } = options;
    const headers = _.get(options, 'headers', {});
    return {
      url,
      methods,
      accept: headers['accept'],
      contentType: headers['contentType'],
    };
  }

  public formStateToOptions(newState: HttpState): HttpOptions
  {
    const { url, methods, accept, contentType } = newState;
    return {
      url,
      methods,
      headers: {
        accept,
        contentType,
      },
    };
  }
}

type DownloadState = SinkOptionsType<Sinks.Download>;
class DownloadEndpoint extends EndpointForm<DownloadState>
{
  public inputMap: InputDeclarationMap<DownloadState> = {

  };
}

type DatabaseState = SinkOptionsType<Sinks.Database>;

class DatabaseEndpoint extends EndpointForm<DatabaseState>
{
  public inputMap: InputDeclarationMap<DatabaseState> = {
    // todo
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
    [Sources.Http]: HttpEndpoint,
  };

export const SinkFormMap: FormLookupMap<Sinks> =
  {
    [Sinks.Download]: DownloadEndpoint,
    [Sinks.Database]: DatabaseEndpoint,
    [Sinks.Sftp]: SftpEndpoint,
    [Sinks.Http]: HttpEndpoint,
  };
