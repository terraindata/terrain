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
// tslint:disable:max-classes-per-file

/**
 *  Keep this file around as long as there are customer instances on template versions v4 or v5
 */

import * as GraphLib from 'graphlib';
import { List, Map } from 'immutable';
import * as _ from 'lodash';

type WayPoint = string | number;
type KeyPath = List<WayPoint>;
const KeyPath = (args: WayPoint[] = []) => List<WayPoint>(args);

export class TransformationNode
{
  public id: number;
  public typeCode: any;
  public fields: List<KeyPath>;
  public meta: object;

  public constructor(
    id: number,
    fields: List<KeyPath>,
    options: object = {},
    typeCode: any,
  )
  {
    this.id = id;
    this.fields = fields;
    this.meta = options;
  }
}

export class TransformationEngine
{
  /**
   * Creates a TransformationEngine from a serialized representation
   * (either a JSON object or stringified JSON object).
   *
   * @param {object | string} json   The serialized representation to
   *                                 deserialize into a working engine.
   * @returns {TransformationEngine} A deserialized, ready-to-go engine.
   */
  public static load(json: object | string): TransformationEngine
  {
    const parsedJSON: object = typeof json === 'string' ? TransformationEngine.parseSerializedString(json as string) : json as object;
    const e: TransformationEngine = new TransformationEngine();
    e.dag = GraphLib.json.read(parsedJSON['dag']);
    e.doc = parsedJSON['doc'];
    e.uidField = parsedJSON['uidField'];
    e.uidNode = parsedJSON['uidNode'];
    e.fieldNameToIDMap = Map<KeyPath, number>(parsedJSON['fieldNameToIDMap']);
    e.IDToFieldNameMap = Map<number, KeyPath>(parsedJSON['IDToFieldNameMap']);
    e.fieldTypes = Map<number, string>(parsedJSON['fieldTypes']);
    e.fieldEnabled = Map<number, boolean>(parsedJSON['fieldEnabled']);
    e.fieldProps = Map<number, object>(parsedJSON['fieldProps']);
    return e;
  }

  /**
   * A helper function to process a Transformation Node's meta object
   * from a raw JS object into an object whose newFieldKeyPaths field
   * is properly turned into an immutable list of keypaths
   *
   * @param {object} meta The deserialized meta object
   * @returns {object} The converted meta object
   */
  private static makeMetaImmutable(meta: object): object
  {
    if (meta['newFieldKeyPaths'] !== undefined)
    {
      const newFieldKeyPaths = List(meta['newFieldKeyPaths'])
        .map((val: string[]) => KeyPath(val)).toList();
      return _.extend({}, meta, {
        newFieldKeyPaths,
      });
    }
    else
    {
      return meta;
    }
  }

  /**
   * A helper function to parse a string representation of a
   * `TransformationEngine` into a working, fully-typed engine
   * (stringified JS objects lose all type information, so it
   * must be restored here...).
   *
   * @param {string} s The serialized string to parse into an engine.
   * @returns {object} An intermediate object that undergoes further
   *                   processing in `load` to finish converting
   *                   to a `TransformationEngine`.
   */
  private static parseSerializedString(s: string): object
  {
    const parsed: object = JSON.parse(s);
    parsed['fieldNameToIDMap'] = parsed['fieldNameToIDMap'].map((v) => [KeyPath(v[0]), v[1]]);
    parsed['IDToFieldNameMap'] = parsed['IDToFieldNameMap'].map((v) => [v[0], KeyPath(v[1])]);
    for (let i: number = 0; i < parsed['dag']['nodes'].length; i++)
    {
      const raw: object = parsed['dag']['nodes'][i]['value'];
      parsed['dag']['nodes'][i]['value'] =
        new TransformationNode(
          raw['id'],
          List<KeyPath>(raw['fields'].map((item) => KeyPath(item))),
          TransformationEngine.makeMetaImmutable(raw['meta']),
          raw['typeCode'],
        );
    }
    return parsed;
  }

  private dag: GraphLib.Graph = new GraphLib.Graph({ directed: true });
  private doc: object = {};
  private uidField: number = 0;
  private uidNode: number = 0;
  private fieldNameToIDMap: Map<KeyPath, number> = Map<KeyPath, number>();
  private IDToFieldNameMap: Map<number, KeyPath> = Map<number, KeyPath>();
  private fieldTypes: Map<number, string> = Map<number, string>();
  private fieldEnabled: Map<number, boolean> = Map<number, boolean>();
  private fieldProps: Map<number, object> = Map<number, object>();

  /**
   * Constructor for `TransformationEngine`.
   *
   * @param {object} doc An optional example document that, if
   *                     passed, is used to generate initial
   *                     field IDs and mappings
   */
  constructor(doc?: object)
  {

  }

  public clone(): TransformationEngine
  {
    return TransformationEngine.load(this.toJSON());
  }

  /**
   * Converts the current engine to an equivalent JSON representation.
   *
   * @returns {object} A JSON representation of `this`.
   */
  public toJSON(): object
  {
    // Note: dealing with a lot of Immutable data structures so some
    // slightly verbose syntax is required to convert to plain JS arrays
    return {
      dag: GraphLib.json.write(this.dag),
      doc: this.doc,
      uidField: this.uidField,
      uidNode: this.uidNode,
      fieldNameToIDMap: this.fieldNameToIDMap.map((v: number, k: KeyPath) => [k, v]).toArray(),
      IDToFieldNameMap: this.IDToFieldNameMap.map((v: KeyPath, k: number) => [k, v]).toArray(),
      fieldTypes: this.fieldTypes.map((v: string, k: number) => [k, v]).toArray(),
      fieldEnabled: this.fieldEnabled.map((v: boolean, k: number) => [k, v]).toArray(),
      fieldProps: this.fieldProps.map((v: object, k: number) => [k, v]).toArray(),
    };
  }
}
