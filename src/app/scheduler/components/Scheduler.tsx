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
import SchedulerAjax from 'scheduler/SchedulerAjax';
import Api from 'util/Api';

class Scheduler extends TerrainComponent<any> {

  public schedulerAjax: SchedulerAjax = new SchedulerAjax(Api.getInstance());
  public constructor(props)
  {
    super(props);
    this.state = { responseText: '' };
  }

  public getConnections()
  {
    this.schedulerAjax.getConnections()
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error)
    {
        console.error(error);
      });
  }

  public createScheduler()
  {
    this.schedulerAjax.createScheduler({
      interval: '0 0 1 1 *',
      lastRun: '',
      Meta: '',
      Name: 'Jmansor Scheduler',
      pausedFilename: 'scheduler.log',
      Priority: 1,
      Running: false,
      shouldRunNext: false,
      Tasks: JSON.stringify({
        cancel: false, // whether the tree of tasks should be cancelled
        id: 1, // unique id that identifies this task to other tasks in the input array of TaskConfigs
        jobStatus: 0, // 0: not running, 1: running, 2: paused
        name: 'Import', // name of the task i.e. 'import'
        onFailure: 3, // id of task to execute on failure
        onSuccess: 2, // id of next task to execute (default should be next in array)
        params: { param1: 'a' }, // input parameters for the task
        paused: 4, // where in the tree of tasks the tasks are paused
        taskId: 5, // maps to a statically declared task
      }),
      templateId: 1,
      workerId: 0,
    })
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error)
    {
        console.error(error);
      });
  }

  public render()
  {
    return (
      <div>
        <ul>
          <li onClick={this.getConnections.bind(this)}>SchedulerAjax.getConnections()</li>
          <li onClick={this.createScheduler.bind(this)}>SchedulerAjax.createScheduler()</li>
        </ul>
        <div>
          {this.state.responseText}
        </div>
      </div>
    );
  }
}

export default Scheduler;
