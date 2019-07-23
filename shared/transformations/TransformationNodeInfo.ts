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

import { List, Map } from 'immutable';
import { FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNode from 'shared/transformations/TransformationNode';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import * as Utils from 'shared/transformations/util/EngineUtils';

export default abstract class TransformationNodeInfo
{
  public abstract typeCode: TransformationNodeType;

  public abstract humanName: string;
  public abstract description: string;
  public abstract nodeClass: new (...args: any[]) => TransformationNode;

  public editable: boolean = false;
  public creatable: boolean = false;
  public visible: boolean = true;

  protected newType: FieldTypes;

  // override this
  protected availInfo: {
    allowedTypes?: FieldTypes[];
    arrayOf?: FieldTypes[]; // if the field is an array
    isNamed?: boolean; // if undefined, don't check. if false, ensure not named, if true, ensure named
  };

  /*
   * Todo, turn these functions into visitors to be more consistent?
   */
  public isAvailable(engine: TransformationEngine, fieldId: number, tree: Map<number, List<number>>): boolean
  {
    if (this.availInfo !== undefined)
    {
      const { allowedTypes, arrayOf, isNamed } = this.availInfo;
      const etlType = Utils.fields.fieldType(fieldId, engine);
      if (allowedTypes !== undefined)
      {
        if (allowedTypes.indexOf(etlType) === -1)
        {
          return false;
        }
      }
      if (arrayOf !== undefined)
      {
        if (etlType !== FieldTypes.Array || tree.get(fieldId) == null || tree.get(fieldId).size === 0)
        {
          return false;
        }
        const childType = Utils.fields.fieldType(tree.get(fieldId).get(0), engine);
        if (arrayOf.indexOf(childType) === -1)
        {
          return false;
        }
      }
      if (isNamed !== undefined)
      {
        if (Utils.path.isNamed(engine.getFieldPath(fieldId)) !== isNamed)
        {
          return false;
        }
      }
      return true;
    }
    return true;
  }

  public computeNewFieldType(engine?: TransformationEngine, node?: TransformationNode, index?: number): FieldTypes
  {
    if (this.newType === undefined)
    {
      if (engine !== undefined && node !== undefined)
      {
        const firstField = node.fields.get(0).id;
        return Utils.fields.fieldType(firstField, engine);
      }
      else
      {
        return FieldTypes.String;
      }
    }
    return this.newType;
  }

  public computeNewSourceType(engine?: TransformationEngine, node?: TransformationNode, index?: number): FieldTypes | null
  {
    return null;
  }

  public shortSummary(meta: object): string
  {
    return this.humanName;
  }
}
