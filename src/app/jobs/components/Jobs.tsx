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
// tslint:disable:no-console no-var-requires
import 'builder/components/pathfinder/filter/PathfinderFilter.less';
import 'builder/components/pathfinder/Pathfinder.less';
import { Colors, getStyle } from 'colors/Colors';
import Modal from 'common/components/Modal';
import Section from 'common/components/Section';
import SimpleTable, { BadgeColumn, ButtonColumn } from 'common/components/SimpleTable';
import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import * as Immutable from 'immutable';
import { JobsActions } from 'jobs/data/JobsRedux';
import
{
  getCompletedJobs,
  getPendingJobs,
  getRunningJobs,
} from 'jobs/data/JobsSelectors';
import * as TerrainLog from 'loglevel';
import * as React from 'react';
import Util from 'util/Util';
import MidwayError from '../../../../shared/error/MidwayError';
import './Jobs.less';
const InfoIcon = require('images/icon_info.svg');

const INTERVAL = 60000;

class Jobs extends TerrainComponent<any> {

  public interval;

  public constructor(props)
  {
    super(props);
    this.state = {
      responseText: '',
      jobs: null,
      id: '',
      expanded: Immutable.Map({
        completed: true,
        pending: false,
        running: true,
      }),
      logsModalOpen: false,
      jobLogs: Immutable.Map({}),
    };
  }

  public componentDidMount()
  {
    this.getJobs();
    this.interval = setInterval(this.getJobs, INTERVAL);
  }

  public componentWillUnmount()
  {
    clearInterval(this.interval);
  }

  public getJobs()
  {
    this.props.jobsActions({ actionType: 'getJobs' })
      .then((response) =>
      {
        TerrainLog.debug('Get all jobs: ' + JSON.stringify(response));
        this.setState({ responseText: JSON.stringify(response), jobs: response.data });
      })
      .catch((error: MidwayError) =>
      {
        TerrainLog.debug('Got error when getting all jobs: ' + error.getDetail());
        this.setState({ responseText: error });
      });
  }

  public calculateJobDuration(job)
  {
    let duration = '';
    if (job.endTime !== null)
    {
      const startMoment = Util.moment(job.startTime).startOf('minute');
      const endMoment = Util.moment(job.endTime).startOf('minute');

      const durationUnits = endMoment.preciseDiff(startMoment, true);
      // minute is the minimum granularity
      duration = '< 1 minute';
      const moreThanAMinute = durationUnits.minutes > 0 ||
        durationUnits.hours > 0 ||
        durationUnits.days > 0 ||
        durationUnits.months > 0 ||
        durationUnits.years > 0;
      if (moreThanAMinute)
      {
        duration = endMoment.preciseDiff(startMoment);
      }
    }

    return duration;
  }

  public getStatusColor(status)
  {
    return Colors().jobStatuses[status];
  }

  public getLogLevelColor(level)
  {
    return Colors().logLevels[level];
  }

  public expandSection(isExpanded, section)
  {
    const { expanded } = this.state;
    this.setState({ expanded: expanded.set(section, !isExpanded) });
  }

  public handleJobViewLog(colKey, rowData)
  {
    this.props.jobsActions({
      actionType: 'getJobLogs',
      jobId: rowData.id,
    })
      .then((jobLogs) =>
      {
        const parsedJobLogs = this.parseJobLogContents(jobLogs);

        let logLines = Immutable.Map();
        parsedJobLogs.map((line, index) => logLines = logLines.set(index, line));

        this.setState({
          logsModalOpen: true,
          jobLogs: logLines,
        });
      });
  }

  public handleJobViewLogClose()
  {
    this.setState({
      jobLogs: Immutable.Map(),
      logsModalOpen: false,
    });
  }

  public handleJobCancel(colKey, rowData)
  {
    this.props.jobsActions({
      actionType: 'cancelJob',
      jobId: rowData.id,
    });
  }

  public messageWithDetail(message: string, detail: string): El
  {
    return (
      <div>
        {
          message
        }
        {
          tooltip(
            <InfoIcon
              className='job-log-info-icon'
              style={getStyle('fill', Colors().active)}
            />,
            detail,
          )
        }
      </div>
    );
  }

  public parseJobLogContents(jobLogs)
  {
    let contents = [];
    if (jobLogs.contents !== '' && jobLogs.contents !== undefined)
    {
      try
      {
        contents = jobLogs.contents.split('\n').map(((logLine) =>
        {
          const parsed = JSON.parse(logLine);
          // Try to format messages better
          if (parsed.message)
          {
            if (parsed.message.indexOf('Processing source') === 0)
            {
              parsed.message = this.messageWithDetail('Processing source', parsed.message);
            }
            else if (parsed.message.indexOf('Processing sink') === 0)
            {
              parsed.message = this.messageWithDetail('Processing sink', parsed.message);
            }
            else if (parsed.message.indexOf('successful') !== -1 &&
              parsed.message.indexOf('failed') !== -1)
            {
              try
              {
                const obj = JSON.parse(parsed.message);
                parsed.message = 'Successful: ' + String(obj.successful) + ', Failed: ' + String(obj.failed);
              }
              catch (e) { }
            }
            // Format the timestamp to be human readable
            parsed.timestamp = Util.formatDate(parsed.timestamp, true);
          }
          return parsed;
        }
        ));
      }
      catch (e)
      {
        contents = [jobLogs.contents];
      }
    }
    return contents;
  }

  public render()
  {
    const {
      completedJobs,
      pendingJobs,
      runningJobs,
      loading,
    } = this.props;
    const { id, logsModalOpen, jobLogs } = this.state;
    const jobsHeader = [
      {
        columnKey: 'name',
        columnLabel: 'Name',
        columnRelativeSize: 2,
      },
      {
        columnKey: 'status',
        columnLabel: 'Status',
        component: <BadgeColumn
          getColor={this.getStatusColor}
        />,
      },
      {
        columnKey: 'startTime',
        columnLabel: 'Start',
        formatter: (job) => Util.formatDate(job.startTime, true),
      },
      {
        columnKey: 'duration',
        columnLabel: 'Duration',
        formatter: (job) => this.calculateJobDuration(job),
      },
      {
        columnKey: 'endTime',
        columnLabel: 'End',
        formatter: (job) => Util.formatDate(job.endTime, true),
      },
      {
        columnKey: 'viewlog',
        columnLabel: '',
        component: <ButtonColumn
          label={'View Log'}
          onClick={this.handleJobViewLog}
        />,
      },
    ];

    const jobCancelColumn = {
      columnKey: 'cancel',
      columnLabel: '',
      component: <ButtonColumn
        label={'Cancel'}
        onClick={this.handleJobCancel}
      />,
    };

    const defaultOrder = {
      columnKey: 'createdAt',
      direction: 'desc' as 'asc' | 'desc',
    };

    return (
      <div className='jobs'>
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
            defaultOrder={defaultOrder}
            loading={loading}
            loadingMessage={'Loading your jobs...'}
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
            // columnsConfig={jobsHeader.concat(jobCancelColumn)}
            columnsConfig={jobsHeader}
            data={runningJobs}
            defaultOrder={defaultOrder}
            loading={loading}
            loadingMessage={'Loading your jobs...'}
          />
        </Section>

        <Section
          title={'Completed Jobs'}
          canExpand={true}
          onExpand={(isExpanded) => this.expandSection(isExpanded, 'completed')}
          expanded={this.state.expanded.get('completed')}
          contentCount={completedJobs.count()}
        >
          <SimpleTable
            columnsConfig={jobsHeader}
            data={completedJobs}
            defaultOrder={defaultOrder}
            loading={loading}
            loadingMessage={'Loading your jobs...'}
          />
        </Section>

        {
          logsModalOpen ?
            (
              <Modal
                open={true}
                onClose={this.handleJobViewLogClose}
                wide={true}
                title={'Job Log'}
              >
                <SimpleTable
                  columnsConfig={[
                    { columnKey: 'timestamp', columnLabel: 'Date' },
                    {
                      columnKey: 'level',
                      columnLabel: 'Level',
                      component: <BadgeColumn getColor={this.getLogLevelColor} />,
                    },
                    { columnKey: 'message', columnLabel: 'Message', columnRelativeSize: 3 },
                  ]}
                  data={jobLogs}
                />
              </Modal>
            ) : null
        }
      </div>
    );
  }
}

export default Util.createTypedContainer(
  Jobs,
  {
    completedJobs: getCompletedJobs,
    pendingJobs: getPendingJobs,
    runningJobs: getRunningJobs,
    loading: (state) => state.get('jobs').loading,
  },
  { jobsActions: JobsActions },
);
