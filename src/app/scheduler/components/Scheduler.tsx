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
// tslint:disable:no-console
import TerrainComponent from 'common/components/TerrainComponent';
import {List, Map} from 'immutable';
import * as React from 'react';
import SchedulerAjax from 'scheduler/SchedulerAjax';
import Api from 'util/Api';
import PathfinderCreateLine from 'app/builder/components/pathfinder/PathfinderCreateLine';
import './Schedule.less';
import RouteSelector from 'app/common/components/RouteSelector';

class Scheduler extends TerrainComponent<any>
{
  public schedulerAjax: SchedulerAjax = new SchedulerAjax(Api.getInstance());
  public state: {
    schedules: List<any>;
  } = {
    schedules: List([])
  };

  public constructor(props)
  {
    super(props);
    this.getSchedules();
  }

  public getSchedules()
  {
    this.schedulerAjax.getSchedules()
      .then((response) =>
      {
        console.log('response ', response);
        this.setState({
          schedules: response,
        })
      })
      .catch((error) =>
       {
        console.log(error);
      });
  }

  public getConnections()
  {
    this.schedulerAjax.getConnections()
      .then((response) =>
      {
        console.log('response ', response);
      })
      .catch((error) =>
       {
        console.log(error);
      });
  }

  public handleCreateSchedule()
  {
    this.schedulerAjax.createScheduler({
      interval: '0 0 1 1 *',
      meta: 'Schedule 1',
      name: '',
      pausedFilename: '',
      tasks: JSON.stringify({
        cancel: false, // whether the tree of tasks should be cancelled
        jobStatus: 0, // 0: not running, 1: running, 2: paused
        name: 'Import', // name of the task i.e. 'import'
        onFailure: 3, // id of task to execute on failure
        onSuccess: 2, // id of next task to execute (default should be next in array)
        params: { param1: 'a' }, // input parameters for the task
        paused: 4, // where in the tree of tasks the tasks are paused
        taskId: 5, // maps to a statically declared task
      }),
      templateId: 1,
    })
      .then((response) =>
      {
        // Action here to add the schedule to redux store

        this.setState({
          schedules: this.state.schedules.push(response[0]),
        });
      })
      .catch((error) =>
    {
        console.log('error', error);
      });
  }

  public getOptionSets()
  {
    const idOptionSet = {
      options: List([]),
      shortNameText: 'Id',
      key: 'id',
    }
    return List([idOptionSet]);
  }

  public handleDeleteSchedule(index: number)
  {
    this.schedulerAjax.deleteSchedule(this.state.schedules[index].id)
      .then((response) =>
      {
        this.getSchedules();
      })
      .catch((error) =>
      {
        console.log('error', error);
      });
  }

  public render()
  {
    const { schedules } = this.state;
    return (
      <div className='schedule-list-wrapper'>
        {
          schedules.map((schedule, i) =>
            <RouteSelector
              optionSets={this.getOptionSets()}
              values={List([schedule.id])}
              key={i}
              canDelete={true}
              canEdit={true}
              onDelete={this._fn(this.handleDeleteSchedule, i)}
              onChange={(a, b) => {}}
            />
          )
        }
        <PathfinderCreateLine
          text='Add Schedule'
          canEdit={true}
          onCreate={this.handleCreateSchedule}
          showText={true}
        />
      </div>
    );
  }
}

export default Scheduler;
