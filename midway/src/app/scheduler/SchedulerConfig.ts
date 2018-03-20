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

import ConfigType from '../ConfigType';

export class SchedulerConfig extends ConfigType
{
  public id: number = undefined;                        // scheduled job ID
  public interval: string = undefined;                  // time interval between scheduled runs
  public lastRun: string = undefined;                   // when the scheduled job last ran
  public meta: string = undefined;                      // meta
  public name: string = undefined;                      // name of the schedule
  public pausedFilename: string = undefined;            // filename of the stored paused output
  public priority: number = undefined;                  // priority of the scheduled job
  public running: boolean = undefined;                  // whether the task is running or not (TODO: lock this)
  public shouldRunNext: boolean = undefined;            // whether the job should run again or not
  public tasks: string = undefined;                     // a stringified representation of TaskConfig[]
  public templateId: number = undefined;                // ETL template ID to use
  public workerId: number = undefined;                  // for clustering, denotes the node ID

  constructor(props: object)
  {
    super();
    ConfigType.initialize(this, props);
  }
}

export default SchedulerConfig;
