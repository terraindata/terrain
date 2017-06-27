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

import * as _ from 'underscore';
import * as Immutable from 'immutable';

import EQLConfig from './EQLConfig';
import ESClause from './ESClause';
import ESInterpreter from './ESInterpreter';
import ESPropertyInfo from './ESPropertyInfo';
import ESValueInfo from './ESValueInfo';
import { Display, DisplayType } from '../../../blocks/displays/Display';
import { Block, _block } from '../../../blocks/types/Block';
import { Card } from '../../../blocks/types/Card';
import CommonBlocks from '../../../blocks/CommonBlocks';
import BlockUtils from '../../../blocks/BlockUtils';
import ElasticBlocks from '../blocks/ElasticBlocks';
import SpecializedCreateCardTool from '../../../../src/app/builder/components/cards/SpecializedCreateCardTool';

/**
 * A clause with a well-defined structure.
 */
export default class ESStructureClause extends ESClause
{
  public structure: { [name: string]: string };
  public required: any[];

  public constructor(type: string, structure: { [name: string]: string }, required: string[], settings: any)
  {
    super(type, settings);
    this.structure = structure;
    this.required = required;
  }

  public init(config: EQLConfig): void
  {
    Object.keys(this.structure).forEach(
      (key: string): void =>
      {
        config.declareType(this.structure[key]);
      });
  }

  public mark(interpreter: ESInterpreter, valueInfo: ESValueInfo): void
  {
    valueInfo.clause = this;

    const value = valueInfo.value;
    if (typeof (value) !== 'object')
    {
      interpreter.accumulateError(valueInfo, 'Clause must be an object, but found a ' + typeof (value) + ' instead.');
      return;
    }

    if (Array.isArray(value))
    {
      interpreter.accumulateError(valueInfo, 'Clause must be an object, but found an array instead.');
      return;
    }

    const children: { [name: string]: ESPropertyInfo } = valueInfo.objectChildren;

    // mark properties
    Object.keys(children).forEach(
      (name: string): void =>
      {
        const viTuple: ESPropertyInfo = children[name] as ESPropertyInfo;

        if (!this.structure.hasOwnProperty(name))
        {
          interpreter.accumulateError(viTuple.propertyName, 'Unknown property.', true);
          return;
        }

        if (viTuple.propertyValue !== null)
        {
          interpreter.config.getClause(this.structure[name]).mark(interpreter, viTuple.propertyValue);
        }
      });

    // check required members
    this.required.forEach((name: string): void =>
    {
      if (children[name] !== undefined)
      {
        interpreter.accumulateError(valueInfo, 'Missing required property "' + name + '"');
      }
    });
  }
  
  
  
  public getRowsCard()
  {
    // let display: Display[] = [];
    // let initMap: {[key: string]: () => any};
    
    // const valueMap = _.mapObject(
    //   this.structure,
    //   (type, key) =>
    //   {
    //     // TODO if we want to shortcut some types, e.g.
    //     //  instead of "size" rendering a Size card, "size"
    //     //  just rendering a textbox with the size properties
        
    //     return null; 
    //     // return null so that the Record-class preserves the key,
    //     // and we can fill in a default value using init
        
    //     // if (this.template)
    //     // {
    //     //   // need to set up default value
    //     //   const defaultValue = this.template[key];
    //     //   if(defaultValue !== undefined)
    //     //   {
    //     //     if (defaultValue === null)
    //     //     {
    //     //       // need to create a clause card of the given key type
    //     //       // We do this by adding a function to init.
    //     //       initMap = initMap || {}; // initialize init
    //     //       initMap[key] = () => BlockUtils.make(ElasticBlocks['eql' + key]); // make card
    //     //       // TODO if deep nested objects, make sure they all get init'd
    //     //       //   could be done in init by checking the config
              
    //     //       return null; 
    //     //       // return null since init will fill in with a new object
    //     //       // on creation. We don't want each new Card to share the same
    //     //       // object reference. Returning null will preserve the key
    //     //       // in the Record class.
    //     //     }
            
    //     //     if (typeof defaultValue === 'object')
    //     //     {
    //     //       throw new Error('Nested object provided in template, unhandled case. ' +
    //     //         'Type: ' + this.type + ' - Template value: ' + defaultValue);
    //     //     }
            
    //     //     return this.template[key];
    //     //   }
    //     }
    //   );
    
    const propertyKeys = Immutable.List(_.keys(this.structure));
    
    return this.seedCard({
        properties: Immutable.List([]),
        
        // provide options of all possible card types
        childOptions: Immutable.List(_.map(
          this.structure,
          (type, key) =>
          ({
            text: key,
            type: 'eql' + type,
          })
        )),
        childOptionClickHandler: (card: Card, option: { text: string, type: string }): Card =>
        {
          // reducer to apply the option to the card
          return card.update('properties', properties =>
            properties.push(
              BlockUtils.make(
                ElasticBlocks[this.getBlockType()],
                {
                  key: option.text,
                  cardValue: BlockUtils.make(
                    ElasticBlocks[option.type]
                  )
                }
              )
            )
          );
        },
        
        static:
        {
          preview: '[properties.size] properties',
          display:
          [
            {
              displayType: DisplayType.ROWS,
              key: 'properties',
              english: 'property',
              factoryType: this.getBlockType(),
              provideParentData: true, // need this to grey out the type dropdown
              
              row: 
              {
                inner:
                {
                  displayType: DisplayType.DROPDOWN,
                  key: 'key',
                  
                  options: propertyKeys,
                  dropdownUsesRawValues: true,
                },
                
                below:
                {
                  displayType: DisplayType.CARDSFORTEXT,
                  key: 'cardValue',
                },
              },
              
            },
            {
              provideParentData: true, // need this to grey out the type dropdown
              displayType: DisplayType.COMPONENT,
              component: SpecializedCreateCardTool,
              key: null,
              // help: ManualConfig.help['score'],
            },
          ],
          
          tql: (card, tqlTranslationFn, tqlConfig) =>
          {
            const json: object = {};
            card.properties.map(
              (property) =>
              {
                _.extend(json, tqlTranslationFn(property, tqlConfig));
              }
            );
            return json;
          },
          
          init: () =>
          {
            if (this.template)
            {
              let properties = [];
              _.mapObject(
                this.template,
                (value: any, key: string) =>
                {
                  const clauseType = this.structure[key];
                  let card = BlockUtils.make(
                    ElasticBlocks['eql' + clauseType]
                  );
                  
                  if (value !== null)
                  {
                    card = card.set('value', value); // TODO confirm that this works
                  }
                  
                  const propertyBlock = BlockUtils.make(
                    ElasticBlocks[this.getBlockType()],
                    {
                      key,
                      cardValue: card,
                    }
                  );
                  
                  properties.push(propertyBlock);
                }
              );
              return {
                properties: Immutable.List(properties),
              };
            }
            return {};       
          },
        }
      }
    );
  }
  
  private getBlockType(): string
  {
    return this.type + 'ValueBlock';
  }
  
  public getSupplementalBlocks(): {[type: string]: Block}
  {
    return {
      [this.getBlockType()]: _block({
        key: '',
        // clauseType: '',
        cardValue: null,
        
        static:
        {
          tql: (block, tqlTranslationFn, tqlConfig) =>
          {
            return {
              [block['key']]: tqlTranslationFn(block['cardValue'], tqlConfig),
            };
          },
          language: 'elastic',
        },
      }),
    };
  }
  
  
  public getWrapperCard()
  {
    const accepts = Immutable.List(
      _.keys(this.structure).map(type => 'eql' + type)
    );
    
    
    let init: () => any;
    if (this.template)
    {
      // If there's a template, we need to create seed cards
      //  of the template types when this card is initialized.
      init = () =>
      {
        // create the card list from the template
        const cards = _.compact(
          _.map(
            this.template,
            (templateValue, templateKey) =>
            {
              const clauseType = templateKey === null ? templateValue : templateKey;
              if (ElasticBlocks['eql' + clauseType])
              {
                return BlockUtils.make(
                  ElasticBlocks['eql' + clauseType],
                  {
                    key: templateKey,
                    value: templateValue,
                    // all base cards have a 'value' key
                  }
                );
              }
              else
              {
                console.log('No block for ' + templateKey);
              }
            }
          )
        );
        
        return {
          cards: Immutable.List(cards),
        };
      }
    }
    
    return this.seedCard(
      CommonBlocks._wrapperCard({
        colors: [],
        title: this.type,
        language: 'elastic',
        tql: (block, tqlTranslationFn, tqlConfig) => {
          let json: object = {};
          block['cards'].map(
            (card) =>
            {
              _.extend(json, {
                [card['key']]: tqlTranslationFn(card, tqlConfig),
              });
            }
          );
          return json;
        },
        
        accepts,
        init,
      })
    );
  }
  
  public getCard()
  {
    // return this.getWrapperCard();
    return this.getRowsCard()
  }  
}
