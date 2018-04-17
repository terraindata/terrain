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
import * as React from 'react';
import SchedulerApi from 'scheduler/SchedulerApi';
import XHR from 'util/XHR';

class Scheduler<T> extends TerrainComponent<T> {

  public schedulerApi: SchedulerApi = new SchedulerApi(XHR.getInstance());

  public constructor(props)
  {
    super(props);
    this.state = {
      responseText: '',
      schedules: null,
      id: '',
    };
  }

  public createSchedule(this)
  {
    this.schedulerApi.createSchedule({
      cron: '0 0 1 1 *',
      meta: '',
      name: 'Schedule',
      tasks: {
        cancel: false, // whether the tree of tasks should be cancelled
        jobStatus: 0, // 0: not running, 1: running, 2: paused
        name: 'Import', // name of the task i.e. 'import'
        onFailure: 3, // id of task to execute on failure
        onSuccess: 2, // id of next task to execute (default should be next in array)
        params: { templateId: -1 }, // input parameters for the task
        paused: 4, // where in the tree of tasks the tasks are paused
        taskId: 5, // maps to a statically declared task
      },
    })
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
        this.getSchedules();
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public getSchedules()
  {
    this.schedulerApi.getSchedules()
      .then((response) =>
      {
        this.setState({
          responseText: JSON.stringify(response),
          schedules: response.data,
        });
      })
      .catch((error) =>
      {
        console.log(error);
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public getSchedule(id: number)
  {
    this.schedulerApi.getSchedule(id)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public updateSchedule(id: number, newSchedule?)
  {
    newSchedule = newSchedule || { name: 'Jmansor Schedule Modified' };
    this.schedulerApi.updateSchedule(id, newSchedule)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
        this.getSchedules();
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public deleteSchedule(id?: number)
  {
    this.schedulerApi.deleteSchedule(id)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
        this.getSchedules();
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public duplicateSchedule(id?: number)
  {
    this.schedulerApi.duplicateSchedule(id)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
        this.getSchedules();
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public getScheduleLog(id: number)
  {
    this.schedulerApi.getScheduleLog(id)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
        this.getSchedules();
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public pauseSchedule(id: number)
  {
    this.schedulerApi.pauseSchedule(id)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
        this.getSchedules();
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public unpauseSchedule(id: number)
  {
    this.schedulerApi.unpauseSchedule(id)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
        this.getSchedules();
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public runSchedule(id: number)
  {
    this.schedulerApi.runSchedule(id)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
        this.getSchedules();
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public setScheduleStatus(id: number)
  {
    this.schedulerApi.setScheduleStatus(id, false)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
        this.getSchedules();
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public handleIdChange(e)
  {
    this.setState({
      id: e.target.value,
    });
  }

  public render()
  {
    const { id } = this.state;
    return (
      <div>
        id: <input style={{ width: 50 }} onChange={this.handleIdChange} value={id} />
        <ul>
          <li onClick={() => this.createSchedule()}>ScheduleApi.createSchedule()</li>
          <li onClick={() => this.getSchedules()}>SchedulerApi.getSchedules()</li>
          <li onClick={() => this.getSchedule(id)}>SchedulerApi.getSchedules({id})</li>
          <li onClick={() => this.updateSchedule(id)}>SchedulerApi.updateSchedule({id})</li>
          <li onClick={() => this.deleteSchedule(id)}>SchedulerApi.deleteSchedules({id})</li>
          <li onClick={() => this.duplicateSchedule(id)}>SchedulerApi.duplicateSchedules({id})</li>
          <li onClick={() => this.getScheduleLog(id)}>SchedulerApi.getScheduleLog({id})</li>
          <li onClick={() => this.pauseSchedule(id)}>SchedulerApi.pauseSchedule({id})</li>
          <li onClick={() => this.unpauseSchedule(id)}>SchedulerApi.unpauseSchedule({id})</li>
          <li onClick={() => this.runSchedule(id)}>SchedulerApi.runSchedule({id})</li>
          <li onClick={() => this.setScheduleStatus(id)}>SchedulerApi.setScheduleStatus({id})</li>
        </ul>
        <div>
          {this.state.responseText}
        </div>
        <div>
          {
            this.state.schedules !== null ?
              (
                this.state.schedules.map((s) =>
                  <div key={s.id}>{s.id} - {s.name} - {s.running ? 'running' : 'not running'} - {s.shouldRunNext.toString()}</div>,
                )
              ) : null
          }
        </div>
      </div>
    );
  }
}

export default Scheduler;
