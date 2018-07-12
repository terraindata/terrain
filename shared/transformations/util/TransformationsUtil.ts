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
import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;

import { FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import EngineUtil from 'shared/transformations/util/EngineUtil';
import Topology from 'shared/transformations/util/TopologyUtil';
import { KeyPath, KeyPathUtil as PathUtil } from 'shared/util/KeyPath';

// return true if the given keypath would be a valid new child field under provided fieldId
// if fieldId is not provided or -1, then it does not consider the new field as a child field
// (e.g. a root level field)
export function validateNewFieldName(
  engine: TransformationEngine,
  fieldId: number,
  newKeyPath: KeyPath,
):
  {
    isValid: boolean,
    message: string,
  }
{
  if (newKeyPath.last() === '')
  {
    return {
      isValid: false,
      message: 'Invalid Name. Names cannot be empty',
    };
  }
  if (newKeyPath.last() === -1)
  {
    return {
      isValid: false,
      message: 'Invalid Name. Name cannot be \'*\'',
    };
  }
  const otherId = engine.getFieldID(newKeyPath);
  if (otherId !== undefined && otherId !== fieldId)
  {
    return {
      isValid: false,
      message: 'Invalid Name. This field already exists',
    };
  }

  if (fieldId !== undefined && fieldId !== -1)
  {
    const parentType = EngineUtil.fieldType(fieldId, engine);
    if (parentType !== FieldTypes.Object && parentType !== FieldTypes.Array)
    {
      return {
        isValid: false,
        message: 'Invalid Rename. Parent fields is not a nested object',
      };
    }
  }

  return {
    isValid: true,
    message: '',
  };
}

export function validateRename(
  engine: TransformationEngine,
  fieldId: number,
  newKeyPath: KeyPath,
):
  {
    isValid: boolean,
    message: string,
  }
{
  const existingKp = engine.getFieldPath(fieldId);
  const failIndex = newKeyPath.findIndex((value) => value === '');
  if (failIndex !== -1)
  {
    return {
      isValid: false,
      message: 'Invalid Rename. Names cannot be empty',
    };
  }
  if (typeof newKeyPath.last() === 'number')
  {
    return {
      isValid: false,
      message: 'Invalid Rename. Name cannot end with a number',
    };
  }
  const otherId = engine.getFieldID(newKeyPath);
  if (otherId !== undefined && otherId !== fieldId)
  {
    return {
      isValid: false,
      message: 'Invalid Rename. This field already exists',
    };
  }
  else if (!PathUtil.isNamed(existingKp))
  {
    return {
      isValid: false,
      message: 'Invalid Rename. Cannot rename a dynamic field',
    };
  }

  if (!Topology.areFieldsLocal(existingKp, newKeyPath))
  {
    return {
      isValid: false,
      message: 'Invalid Rename. Cannot move field between array levels',
    };
  }

  for (let i = 1; i < newKeyPath.size; i++)
  {
    const kpToTest = newKeyPath.slice(0, i).toList();
    const parentId = engine.getFieldID(kpToTest);
    if (parentId !== undefined)
    {
      const parentType = EngineUtil.fieldType(parentId, engine);
      if (parentType !== FieldTypes.Object && parentType !== FieldTypes.Array)
      {
        return {
          isValid: false,
          message: 'Invalid Rename. One of the ancestor fields is not a nested object',
        };
      }
    }
  }

  return {
    isValid: true,
    message: '',
  };
}
