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
import SimpleTable, { BadgeColumn } from 'common/components/SimpleTable';
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import { JobsActions } from 'jobs/data/JobsRedux';
import {
  getFailedJobs,
  getSuccessfulJobs,
  getPendingJobs,
  getRunningJobs,
  getAbortedJobs,
} from 'jobs/data/JobsSelectors';
import * as React from 'react';
import Util from 'util/Util';
import './Jobs.less';

class Jobs extends TerrainComponent<any> {
  public constructor(props)
  {
    super(props);
    this.state = {
      responseText: '',
      jobs: null,
      id: '',
    };
  }

  public componentDidMount()
  {
    this.getJobs();
  }

  public getJobs()
  {
    this.props.jobsActions({ actionType: 'getJobs' })
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response), jobs: response.data });
      })
      .catch((error) =>
      {
        console.error(error);
        this.setState({ responseText: error });
      });
  }

  public getStatusColor(status)
  {
    switch (status)
    {
      case 'SUCCESS':
        return '#94be6b';
      case 'ABORTED':
        return '#ffa8b9';
      case 'RUNNING':
        return '#1eb4fa';
      case 'FAILURE':
        return '#ea526f';
      case 'PAUSED':
        return '#ff8a5b';
      case 'PENDING':
        return '#cccccc';
    }
  }

  public render()
  {
    const {
      successfulJobs,
      failedJobs,
      pendingJobs,
      runningJobs,
      abortedJobs,
    } = this.props;
    const { id } = this.state;

    const jobsHeader = {
      id: {
        columnKey: 'id',
        columnLabel: 'Id',
      },
      name: {
        columnKey: 'name',
        columnLabel: 'Name',
      },
      status: {
        columnKey: 'status',
        columnLabel: '',
        component: <BadgeColumn
          getColor={this.getStatusColor}
        />
      },
    };

    return (
      <div className="jobs">
        <div className="job-lists">
          <h2>Successful Jobs</h2>
          <SimpleTable
            columnsConfig={jobsHeader}
            data={successfulJobs}
          />

          <h2>Failed Jobs</h2>
          <SimpleTable
            columnsConfig={jobsHeader}
            data={failedJobs}
          />

          <h2>Pending Jobs</h2>
          <SimpleTable
            columnsConfig={jobsHeader}
            data={pendingJobs}
          />

          <h2>Running Jobs</h2>
          <SimpleTable
            columnsConfig={jobsHeader}
            data={runningJobs}
          />

          <h2>Aborted Jobs</h2>
          <SimpleTable
            columnsConfig={jobsHeader}
            data={abortedJobs}
          />
        </div>
      </div>
    );
  }
}

export default Util.createTypedContainer(
  Jobs,
  {
    successfulJobs: getSuccessfulJobs,
    failedJobs: getFailedJobs,
    pendingJobs: getPendingJobs,
    runningJobs: getRunningJobs,
    abortedJobs: getAbortedJobs,
  },
  { jobsActions: JobsActions },
);
