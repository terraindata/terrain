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

class Scheduler extends TerrainComponent<any> {

  public schedulerAjax: SchedulerApi = new SchedulerApi(XHR.getInstance());

  public constructor(props)
  {
    super(props);
    this.state = {
      responseText: '',
      id: '',
    };
  }

  public createScheduler()
  {
    this.schedulerAjax.createScheduler({
      interval: '0 0 1 1 *',
      name: 'Jmansor Scheduler',
      priority: 1,
      tasks: [],
      workerId: 10,
    })
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public getSchedulers()
  {
    this.schedulerAjax.getSchedulers()
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public getScheduler(id?: number)
  {
    this.schedulerAjax.getScheduler(id)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public deleteScheduler(id?: number)
  {
    this.schedulerAjax.deleteScheduler(id)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public duplicateScheduler(id?: number)
  {
    this.schedulerAjax.duplicateScheduler(id)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
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
    })
  }

  public render()
  {
    const { id } = this.state;
    return (
      <div>
        id: <input style={{ width: 50 }} onChange={this.handleIdChange} value={id} />
        <ul>
          <li onClick={() => this.createScheduler()}>SchedulerApi.createScheduler()</li>
          <li onClick={() => this.getSchedulers()}>SchedulerApi.getSchedulers()</li>
          <li onClick={() => this.getScheduler(id)}>SchedulerApi.getSchedulers({id})</li>
          <li onClick={() => this.deleteScheduler(id)}>SchedulerApi.deleteSchedulers({id})</li>
          <li onClick={() => this.duplicateScheduler(id)}>SchedulerApi.duplicateSchedulers({id})</li>
        </ul>
        <div>
          {this.state.responseText}
        </div>
      </div>
    );
  }
}

export default Scheduler;
