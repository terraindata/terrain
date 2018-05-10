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
import 'builder/components/pathfinder/filter/PathfinderFilter.less';
import 'builder/components/pathfinder/Pathfinder.less';
import Section from 'common/components/Section';
import SimpleTable, { BadgeColumn, ButtonColumn } from 'common/components/SimpleTable';
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import { JobsActions } from 'jobs/data/JobsRedux';
import
{
  getAbortedJobs,
  getFailedJobs,
  getPendingJobs,
  getRunningJobs,
  getSuccessfulJobs,
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
      expanded: Immutable.Map({
        successful: false,
        failed: false,
        pending: false,
        running: true,
        aborted: false,
      }),
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
      default:
        return '#fff';
    }
  }

  public expandSection(isExpanded, section)
  {
    const { expanded } = this.state;
    this.setState({ expanded: expanded.set(section, !isExpanded) });
  }

  public handleJobViewLog(colKey, rowData)
  {
    console.error(rowData);
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
        />,
      },
      viewlog: {
        columnKey: 'viewlog',
        columnLabel: '',
        component: <ButtonColumn
          label={'View Log'}
          onClick={this.handleJobViewLog}
        />,
      },
    };

    return (
      <div className='jobs'>
        <div className='job-lists'>
          <Section
            title={'Succesful Jobs'}
            canExpand={true}
            onExpand={(isExpanded) => this.expandSection(isExpanded, 'successful')}
            expanded={this.state.expanded.get('successful')}
            contentCount={successfulJobs.count()}
          >
            <SimpleTable
              columnsConfig={jobsHeader}
              data={successfulJobs}
            />
          </Section>

          <Section
            title={'Failed Jobs'}
            canExpand={true}
            onExpand={(isExpanded) => this.expandSection(isExpanded, 'failed')}
            expanded={this.state.expanded.get('failed')}
            contentCount={failedJobs.count()}
          >
            <SimpleTable
              columnsConfig={jobsHeader}
              data={failedJobs}
            />
          </Section>

          <Section
            title={'Pending Jobs'}
            canExpand={true}
            onExpand={(isExpanded) => this.expandSection(isExpanded, 'pending')}
            expanded={this.state.expanded.get('pending')}
            contentCount={pendingJobs.count()}
          >
            <SimpleTable
              columnsConfig={jobsHeader}
              data={pendingJobs}
            />
          </Section>

          <Section
            title={'Running Jobs'}
            canExpand={true}
            onExpand={(isExpanded) => this.expandSection(isExpanded, 'running')}
            expanded={this.state.expanded.get('running')}
            contentCount={runningJobs.count()}
          >
            <SimpleTable
              columnsConfig={jobsHeader}
              data={runningJobs}
            />
          </Section>

          <Section
            title={'Aborted Jobs'}
            canExpand={true}
            onExpand={(isExpanded) => this.expandSection(isExpanded, 'aborted')}
            expanded={this.state.expanded.get('aborted')}
            contentCount={abortedJobs.count()}
          >
            <SimpleTable
              columnsConfig={jobsHeader}
              data={abortedJobs}
            />
          </Section>
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
