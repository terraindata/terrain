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
// tslint:disable:no-var-requires

import * as _ from 'lodash';
import * as React from 'react';

import Util from 'util/Util';

import DatabasePicker from 'etl/common/components/DatabasePicker';
import { WalkthroughActions } from 'etl/walkthrough/ETLWalkthroughRedux';
import { WalkthroughState } from 'etl/walkthrough/ETLWalkthroughTypes';
import { _FileConfig, _SinkConfig } from 'shared/etl/immutable/EndpointRecords';
import { SinkOptionsType, Sinks } from 'shared/etl/types/EndpointTypes';
import { FileTypes, Languages } from 'shared/etl/types/ETLTypes';
import { ETLStepComponent, StepProps, TransitionParams } from './ETLStepComponent';
import './ETLStepComponent.less';

interface Props extends StepProps
{
  // injected props
  walkthrough?: WalkthroughState;
}

type DbOptions = SinkOptionsType<'Database'>;

class PickDatabaseStep extends ETLStepComponent
{
  public static onRevert(params: TransitionParams)
  {
    params.act({
      actionType: 'setState',
      state: {
        sink: _SinkConfig(),
      },
    });
  }

  public static onArrive(params: TransitionParams)
  {
    params.act({
      actionType: 'setState',
      state: {
        sink: _SinkConfig({
          type: Sinks.Database,
          fileConfig: _FileConfig({
            fileType: FileTypes.Json,
            jsonNewlines: false,
          }),
          options: {
            language: Languages.Elastic,
            table: 'data',
          },
        }),
      },
    });
  }

  public render()
  {
    const { walkthrough } = this.props;
    const { serverId, database, table } = walkthrough.sink.options as DbOptions;
    const serverPicked = serverId != null;
    const databasePicked = database != null;
    const tablePicked = table != null;
    return (
      <div className='etl-transition-column etl-walkthrough-db-step'>
        <DatabasePicker
          language={Languages.Elastic}
          serverId={serverId != null ? serverId : ''}
          database={database != null ? database : ''}
          table={table != null ? table : ''}
          onChange={this.handleDbPickerChange}
          constantHeight={true}
        />
        <div className='etl-step-next-button-spacer'>
          {
            this._renderNextButton(
              serverPicked && databasePicked && tablePicked,
              serverId !== '' && database !== '' && table !== '',
            )
          }
        </div>
      </div>
    );
  }

  public handleDbPickerChange(serverId: string, database: string, table: string, language: Languages)
  {
    const changedOptions: Partial<DbOptions> = {
      serverId,
      database,
      table,
    };
    const options = this.props.walkthrough.sink.options;

    this.props.act({
      actionType: 'setEndpointOptions',
      sinkOptions: _.extend({}, options, changedOptions),
    });
  }
}

const transitionRowHeight = '28px';
export default Util.createTypedContainer(
  PickDatabaseStep,
  ['walkthrough'],
  { act: WalkthroughActions },
);
