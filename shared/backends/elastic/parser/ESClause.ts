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

import EQLConfig from './EQLConfig';
import ESInterpreter from './ESInterpreter';
import ESValueInfo from './ESValueInfo';
import * as _ from 'underscore';
import { Card, _card } from '../../../blocks/types/Card';
import { Block, TQLFn } from '../../../blocks/types/Block';
import { Display, DisplayType } from '../../../blocks/displays/Display';
import ElasticKeyBuilderTextbox from '../../../../src/app/common/components/ElasticKeyBuilderTextbox';

/**
 * Represents an Elastic Search query clause
 */
abstract class ESClause
{
  public type: string; // type name
  public name: string; // human type name
  public desc: string; // clause description
  public url: string; // clause documentation url

  /**
   * Type definition for this clause. It should be one of these:
   * + A parent type name that this clause inherits from (ex: boost inherits from number)
   * + An object containing all allowed properties and their types.
   *   (a null property value means the type is the same as the name of the property)
   */
  public def: string | { [key: string]: string | null };

  public template: any; // template for this clause type

  protected settings;

  /**
   * + null types mean custom or disabled type validation
   * + no name means use name with underscores removed
   * + null value in type means same name as property name
   * + typename with [] after it means array
   * + typename with {} after it means object of type
   * + type "enum" uses "values" member to list enumerated values
   * + array type means any of these types
   * + object type means structured def definition
   * + string type references another def
   *
   * @param type the name to refer to this clause (type)
   * @param settings the settings object to initialize it from
   */
  public constructor(type: string, settings: any)
  {
    this.type = type;
    this.settings = settings;

    this.setPropertyFromSettings(settings, 'name', () => this.type.replace('_', ' '));
    this.setPropertyFromSettings(settings, 'desc', () => '');
    this.setPropertyFromSettings(settings, 'url', () => '');
    this.setPropertyFromSettings(settings, 'def', () => 'value');
    this.setPropertyFromSettings(settings, 'template', () => null);
  }

  public init(config: EQLConfig): void
  {
    // default is to do nothing
  }

  public abstract mark(interpreter: ESInterpreter, valueInfo: ESValueInfo): void;

  private setPropertyFromSettings(settings: any, name: string, defaultValueFunction: any): void
  {
    if (settings[name] !== undefined)
    {
      this[name] = settings[name];
    }
    else
    {
      this[name] = defaultValueFunction();
    }
  }
  
  protected seedCard(obj: {
    [field: string]: any;

    static: {
      colors?: string[]; // optional, filled below
      title?: string; // optional, filled below
      
      preview: string | ((c: Card) => string);
      display: Display | Display[];
      tql: TQLFn;
      accepts?: List<string>;

      getChildTerms?: (card: Card, schemaState) => List<string>;
      getNeighborTerms?: (card: Card, schemaState) => List<string>;
      getParentTerms?: (card: Card, schemaState) => List<string>;

      metaFields?: string[];

      init?: () => {
        [k: string]: any;
      };
    };
  }): any
  {
    // fill in simple defaults, but allow overrides
    obj['static'] = _.extend({
      title: this.name,
      colors: [],
      language: 'elastic',
      
      anythingAccepts: true, // TODO remove after testing
    }, obj['static']);
    
    if(true) // switch this on for wrapper card approach
    {
      if(obj['key'] !== undefined)
      {
        throw new Error('Key method was already defined for block ' + this.type);
      }
      // Define a key, which will be optionally used to supply the key
      //  for a key/val pair, if one is needed
      obj['key'] = '';
      
      // prepend the display with our standard key text display
      const objStatic = obj['static'];
      const display = objStatic['display'];
      if (!display)
      {
        objStatic['display'] = KEY_DISPLAY;
      }
      else if (Array.isArray(display))
      {
        (display as Display[]).unshift(KEY_DISPLAY);
      }
      else
      {
        if (KEY_INLINE_DISPLAYS.indexOf(display.displayType) !== -1)
        {
          // we should inline this display
          objStatic['display'] = {
            displayType: DisplayType.FLEX,
            key: null,
            flex: [
              KEY_DISPLAY,
              display,
            ],
          }
        }
        else
        {
          objStatic['display'] = [
            KEY_DISPLAY,
            objStatic['display'],
          ] as any;
        }
      }
    }
    
    return _card(obj as any);
  }
  
  public getCard(): any
  {
    return null;
  }
  
  
  public getSupplementalBlocks(): {[type: string]: Block}
  {
    return {};
  }
  
  public getCardType(): string
  {
    return 'eql' + this.type;
  }
}

const KEY_INLINE_DISPLAYS = [
  DisplayType.TEXT,
  DisplayType.CARDTEXT,
  DisplayType.NUM,
  DisplayType.DROPDOWN,
];

const KEY_DISPLAY: Display =
{
  displayType: DisplayType.TEXT,
  key: 'key',
  autoDisabled: true, // TODO consider autocomplete for key?
  className: 'card-muted-input card-elastic-key-input',
  component: ElasticKeyBuilderTextbox,
};

export default ESClause;
