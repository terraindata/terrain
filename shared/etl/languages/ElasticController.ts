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
// tslint:disable:no-var-requires import-spacing strict-boolean-expressions

import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import * as _ from 'lodash';

import { LanguageInterface } from 'shared/etl/languages/LanguageControllers';
import { ElasticTypes } from 'shared/etl/types/ETLElasticTypes';
import { FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import TypeUtil from 'shared/etl/TypeUtil';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import EngineUtil from 'shared/transformations/util/EngineUtil';
import { KeyPath } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';

class ElasticController implements LanguageInterface
{
  public language = Languages.Elastic;

  public changeFieldTypeSideEffects(engine: TransformationEngine, fieldId: number, newType)
  {
    const elasticProps = engine.getFieldProp(fieldId, List(['elastic']));
    if (elasticProps !== undefined)
    {
      const newProps = _.extend({}, elasticProps, {
        elasticType: ElasticTypes.Auto,
      });
      engine.setFieldProp(fieldId, List(['elastic']), newProps);
    }
  }

  public autodetectFieldTypes(engine: TransformationEngine, documents: List<object>)
  {
    // const docs = EngineUtil.preprocessDocuments(documents);
    // engine.getAllFieldIDs().forEach((id) =>
    // {
    //   if (engine.getFieldProp(id, List(['elastic', 'isPrimaryKey'])))
    //   {
    //     return;
    //   }
    //   const ikp = engine.getInputKeyPath(id);
    //   const okp = engine.getOutputKeyPath(id);

    //   let values = [];
    //   docs.forEach((doc) =>
    //   {
    //     const vals = yadeep.get(engine.transform(doc), okp);
    //     values = values.concat(vals);
    //   });
    //   const repType = EngineUtil.getRepresentedType(id, engine);
    //   if (repType === 'string')
    //   {
    //     const type = TypeUtil.getCommonElasticType(values);
    //     if (type === ElasticTypes.GeoPoint)
    //     {
    //       engine.appendTransformation(TransformationNodeType.CastNode, List([ikp]), { toTypename: 'object' });
    //       engine.setFieldType(id, 'object');
    //       const latField = engine.addField(ikp.push('lat'), 'number');
    //       const longField = engine.addField(ikp.push('lon'), 'number');
    //       engine.setOutputKeyPath(latField, okp.push('lat'));
    //       engine.setOutputKeyPath(longField, okp.push('lon'));
    //       EngineUtil.castField(engine, latField, 'number');
    //       EngineUtil.castField(engine, longField, 'number');
    //     }
    //     engine.setFieldProp(id, List(['elastic', 'elasticType']), type);
    //   }
    //   else if (repType === 'number')
    //   {
    //     const type = TypeUtil.getCommonElasticNumberType(values);
    //     engine.setFieldProp(id, List(['elastic', 'elasticType']), type);
    //   }
    // });
  }
}

export default new ElasticController();
