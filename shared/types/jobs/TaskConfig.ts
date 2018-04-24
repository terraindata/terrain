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

import * as stream from 'stream';

export class TaskConfig
{
  public cancel: boolean = false; // whether the tree of tasks should be cancelled
  public id: number = -1; // unique id that identifies this task to other tasks in the input array of TaskConfigs
  public jobStatus: number = 0; // 0: not running, 1: running, 2: paused
  public name: string = ''; // name of the task i.e. 'import'
  public onFailure?: number = null; // id of task to execute on failure
  public onSuccess?: number = null; // id of next task to execute (default should be next in array)
  public params: any = {}; // input parameters for the task
  public paused: number = null; // where in the tree of tasks the tasks are paused
  public taskId: number = null; // maps to a statically declared task
}

export enum TaskEnum
{
  taskDefaultExit,
  taskDefaultFailure,
  taskExport, // TODO implement this
  taskImport, // TODO implement this
}

export interface TaskInputConfig
{
  options?: TaskInputConfigTypes;
}

export interface TaskOutputConfig extends TaskInputConfig
{
  exit: boolean;
  status: boolean;
}

export interface TaskTreeConfig
{
  cancel: boolean;
  filename: string;
  jobStatus: number;
  paused: number;
}

interface TaskInputConfigTypes
{
  stream: stream.Readable;
}
