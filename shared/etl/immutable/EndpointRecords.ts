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

// Copyright 2018 Terrain Data, Inc.
// tslint:disable:max-classes-per-file strict-boolean-expressions import-spacing

import { Map } from 'immutable';
import * as _ from 'lodash';
import { makeConstructor, makeExtendedConstructor, WithIRecord } from 'shared/util/Classes';

import { getFileType, guessFileOptionsHelper } from 'shared/etl/FileUtil';
import
{
  FileConfig as FileConfigI,
  SinkConfig as SinkConfigI,
  SinkOptionsDefaults, SinkOptionsType,
  Sinks,
  SourceConfig as SourceConfigI,
  SourceOptionsDefaults, SourceOptionsType,
  Sources,
} from 'shared/etl/types/EndpointTypes';

import { FileTypes } from 'shared/etl/types/ETLTypes';
import { InputConfig, RootInputConfig as RootInputConfigI } from 'shared/etl/types/InputTypes';
import { PostProcessConfig, RootPostProcessConfig as RootPostProcessConfigI } from 'shared/etl/types/PostProcessTypes';

class FileConfigC implements FileConfigI
{
  public fileType: FileTypes = FileTypes.Json;
  public hasCsvHeader = true;
  public jsonNewlines = false;
  public xmlPath = null;
  public jsonPath = null;
  public fieldOrdering = null;
  public isPlaFeed = false;
  public ignoreQuotes = false;
}

class RootInputConfigC implements RootInputConfigI
{
  public inputs: InputConfig[] = null;
}

class RootPostProcessConfigC implements RootPostProcessConfigI
{
  public transformations: PostProcessConfig[] = null;
}

export type FileConfig = WithIRecord<FileConfigC>;
export type RootPostProcessConfig = WithIRecord<RootPostProcessConfigC>;
export type RootInputConfig = WithIRecord<RootInputConfigC>;
export const _FileConfig = makeConstructor(FileConfigC);
export const _RootInputConfig = makeConstructor(RootInputConfigC);
export const _RootPostProcessConfig = makeConstructor(RootPostProcessConfigC);
export const SOURCE_DEFAULT_NAME = 'Source';

class SourceConfigC implements SourceConfigI
{
  public type = null;
  public name = SOURCE_DEFAULT_NAME;
  public fileConfig = _FileConfig();
  public options = {} as any;
  public integrationId = -1;
  public rootInputConfig = _RootInputConfig();
  public rootPostProcessConfig = _RootPostProcessConfig();

  public verifyIntegrity(): boolean
  {
    if (this.type == null)
    {
      return false;
    }
    else if (this.fileConfig == null)
    {
      return false;
    }
    return true;
  }

  public guessFileOptions(): Partial<FileConfig>
  {
    const options = this.options;
    switch (this.type)
    {
      case Sources.Upload:
        if (options.file != null)
        {
          if (options.file.type == null || options.file.type.length === 0)
          {
            return guessFileOptionsHelper(options.file.name);
          }
          return {
            fileType: getFileType(options.file),
          };
        }
        else
        {
          return null;
        }
      case Sources.Sftp:
        return guessFileOptionsHelper(options.filepath);
      default:
        return null;
    }
  }

  public description(algorithms?: Map<ID, ItemWithName>): string
  {
    return getEndpointDescription(this as any, algorithms);
  }
}
export type SourceConfig = WithIRecord<SourceConfigC>;
export const _SourceConfig = makeExtendedConstructor(SourceConfigC, true, {
  fileConfig: _FileConfig, rootInputConfig: _RootInputConfig, rootPostProcessConfig: _RootPostProcessConfig,
},
  (cfg?, deep?) =>
  {
    const config = cfg || {};
    const defaults: Partial<SourceConfig> = {};
    if (config.type !== undefined)
    {
      defaults.options = SourceOptionsDefaults[config.type];
    }
    return _.extend(defaults, config);
  },
);

export const SINK_DEFAULT_NAME = 'Destination';
class SinkConfigC implements SinkConfigI
{
  public type = null;
  public name = SINK_DEFAULT_NAME;
  public fileConfig = _FileConfig();
  public options = {} as any;
  public integrationId = -1;
  public rootInputConfig = _RootInputConfig();
  public rootPostProcessConfig = _RootPostProcessConfig();

  public verifyIntegrity(): boolean
  {
    if (this.type == null)
    {
      return false;
    }
    else if (this.fileConfig == null)
    {
      return false;
    }
    return true;
  }

  public guessFileOptions(): Partial<FileConfig>
  {
    const options: any = this.options;
    switch (this.type)
    {
      case Sinks.Download:
        return guessFileOptionsHelper(options.filename);
      case Sinks.Sftp:
        return guessFileOptionsHelper(options.filepath);
      default:
        return null;
    }
  }

  public description()
  {
    return getEndpointDescription(this as any);
  }
}
export type SinkConfig = WithIRecord<SinkConfigC>;
export const _SinkConfig = makeExtendedConstructor(SinkConfigC, true, {
  fileConfig: _FileConfig, rootInputConfig: _RootInputConfig, rootPostProcessConfig: _RootPostProcessConfig,
},
  (cfg?, deep?) =>
  {
    const config = cfg || {};
    const defaults: Partial<SourceConfig> = {};
    if (config.type !== undefined)
    {
      defaults.options = SinkOptionsDefaults[config.type];
    }
    return _.extend(defaults, config);
  },
);

export interface ItemWithName
{
  [k: string]: any;
  name: string;
}

export function getEndpointDescription(
  endpoint: SourceConfig | SinkConfig,
  algorithms?: Map<ID, ItemWithName>,
): string
{
  switch (endpoint.type)
  {
    case Sinks.Fs:
    case Sources.Fs: {
      return `Local File System`;
    }
    case Sinks.Http:
    case Sources.Http: {
      const options = endpoint.options as SourceOptionsType<Sources.Http>;
      const text = String(options.method);
      return `'${text}' Integration ${endpoint.integrationId}`;
    }
    case Sinks.Sftp:
    case Sources.Sftp: {
      const options = endpoint.options as SourceOptionsType<Sources.Sftp>;
      const text = `${options.filepath}`;
      return `SFTP Server ${text}`;
    }
    case Sources.Upload: {
      return 'User Uploaded File';
    }
    case Sources.Algorithm: {
      const options = endpoint.options as SourceOptionsType<Sources.Algorithm>;
      let text = String(options.algorithmId);
      if (algorithms !== undefined && algorithms.has(options.algorithmId))
      {
        text = String(algorithms.get(options.algorithmId).name);
      }
      return `Algorithm '${text}'`;
    }
    case Sinks.Database: {
      const options = endpoint.options as SinkOptionsType<Sinks.Database>;
      return `${options.language} Database '${options.database}', '${options.table}'`;
    }
    case Sinks.Download: {
      return 'Download in Browser';
    }
    default:
      return String(endpoint.type);
  }
}
