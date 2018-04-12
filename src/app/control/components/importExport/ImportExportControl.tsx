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
import memoizeOne from 'memoize-one';
import * as React from 'react';

import TerrainComponent from 'common/components/TerrainComponent';
import { CredentialConfig, SchedulerConfig } from 'control/ControlTypes';
import * as FileImportTypes from 'fileImport/FileImportTypes';
import ScheduleControlList from './ScheduleControlList';
import TemplateControlList from './TemplateControlList';

import { Server, ServerMap } from 'schema/SchemaTypes';
import { SchemaState } from 'schema/SchemaTypes';
import Util from 'util/Util';
import ControlActions from '../../data/ControlActions';
import ControlStore from '../../data/ControlStore';
import RouteSelector from 'app/common/components/RouteSelector';

import './ImportExportControl.less';

const { List, Map } = Immutable;
type Template = FileImportTypes.Template;

export interface Props
{
  placeholder?: string;
  servers: ServerMap;
  schema: SchemaState;
}

class ImportExportControl extends TerrainComponent<Props>
{
  public state: {
    servers: ServerMap;
    importTemplates: List<Template>;
    exportTemplates: List<Template>;
    schedules: List<SchedulerConfig>;
    credentials: List<CredentialConfig>;
  } = {
      servers: Map<string, Server>(),
      importTemplates: List([]),
      exportTemplates: List([]),
      schedules: List([]),
      credentials: List([]),
    };

  constructor(props)
  {
    super(props);
    this._subscribe(ControlStore, {
      stateKey: 'importTemplates',
      storeKeyPath: ['importTemplates'],
    });
    this._subscribe(ControlStore, {
      stateKey: 'exportTemplates',
      storeKeyPath: ['exportTemplates'],
    });
    this._subscribe(ControlStore, {
      stateKey: 'schedules',
      storeKeyPath: ['importExportScheduledJobs'],
    });
    this._subscribe(ControlStore, {
      stateKey: 'credentials',
      storeKeyPath: ['importExportCredentials'],
    });
    this.getImportSchedules = memoizeOne(this.getImportSchedules);
    this.getExportSchedules = memoizeOne(this.getExportSchedules);
  }

  public getImportSchedules(schedules: List<SchedulerConfig>): List<SchedulerConfig>
  {
    return schedules.filter((v: SchedulerConfig) => v.jobType === 'import').toList();
  }

  public getExportSchedules(schedules: List<SchedulerConfig>): List<SchedulerConfig>
  {
    return schedules.filter((v: SchedulerConfig) => v.jobType === 'export').toList();
  }

  public componentDidMount()
  {
    ControlActions.importExport.fetchTemplates(false);
    ControlActions.importExport.fetchTemplates(true);
    ControlActions.importExport.fetchSchedules();
    ControlActions.importExport.fetchCredentials();
  }

  public formatDayValue(value, setIndex)
  {
    return 'Every Day';
  }

  public formatTimeValue(value, setIndex)
  {
    return 'Every minute';
  }

  public getSchedulerOptionSets(schedule)
  {
    // Schedule name + ETL Template Options

    // Status options (active/diabled)

    // Day Options
    const dayOptions = List([
      {
        value: 'everyday',
        displayName: 'Every Day',
      },
      {
        value: 'everyweekday',
        displayName: 'Every weekday',
      },
      {
        value: 'dayofweek',
        displayName: 'Specific day(s) of week',
        component: <div>Picker goes here!</div>
      },
      {
        value: 'dayofmonth',
        displayName: 'Specific day(s) of month',
        component: <div>Picker goes here!</div>,
      }
    ]);
    const dayOptionSet = {
      key: 'day',
      options: dayOptions,
      forceFloat: true,
      getCustomDisplayName: this.formatDayValue,
      shortNameText: 'Day',
      headerText: '',
      column: true,
    };

    // Time Options
    const timeOptions = List([
      {
        value: 'everyminute',
        displayName: 'Every Minute',
      },
      {
        value: 'everyhour',
        displayName: 'Every Hour',
        component: <div>Picker goes here!</div>
      },
      {
        value: 'hoursofday',
        dispayName: 'Specific Hour(s) of the Day',
        component: <div> Picker goes here!</div>
      }
    ]);
    const timeOptionSet = {
      key: 'time',
      options: dayOptions,
      forceFloat: true,
      getCustomDisplayName: this.formatTimeValue,
      shortNameText: 'Time',
      headerText: '',
      column: true,
    };

    // Run now / Pause

    // Schedule log
    return List([
      dayOptionSet,
      timeOptionSet,
    ]);
  }

  /*
    optionSets?: List<RouteSelectorOptionSet>;
    values: List<any>;
    getOptionSets?: () => List<RouteSelectorOptionSet>;
    relevantData?: any; // If this data changes, have to recalculate option sets
    onChange: (key: number, value: any) => void;
    canEdit: boolean;
    footer?: El;
    forceOpen?: boolean; // force it to be open no matter whwat
    defaultOpen?: boolean; // default to open when the component mounts (but don't force open)
    large?: boolean;
    semilarge?: boolean;
    noShadow?: boolean;
    autoFocus?: boolean;
    hideLine?: boolean;
    canDelete?: boolean;
    showWarning?: boolean;
    warningMessage?: string;
    onDelete?: () => void;
    onToggleOpen?: (open: boolean) => void;
  */

  public handleScheduleChange(key, value)
  {
    console.log('key', key, 'value', value);
  }

  public render()
  {
    const { schema } = this.props;
    return (
      <div className='import-export-token-control-page'>
        <RouteSelector
          optionSets={this.getSchedulerOptionSets(null)}
          values={List(['day', 'time'])}
          onChange={this.handleScheduleChange}
          canEdit={true}
        />
      </div>
    );
  }
}

export default Util.createContainer(
  ImportExportControl,
  ['schema'],
  {},
);
