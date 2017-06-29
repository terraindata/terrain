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

import { _block, Block, TQLTranslationFn } from '../../../blocks/types/Block';
import BlockUtils from '../../../blocks/BlockUtils';
import { _card, Card, CardString, CardConfig } from '../../../blocks/types/Card';
import { Input, InputType } from '../../../blocks/types/Input';
import * as CommonElastic from '../syntax/CommonElastic';
import { Display, DisplayType } from '../../../blocks/displays/Display';
import * as CommonBlocks from '../../../blocks/CommonBlocks';
const { _wrapperCard, _aggregateCard, _valueCard, _aggregateNestedCard } = CommonBlocks;

import EQLConfig from '../parser/EQLConfig';
import ESClause from '../parser/ESClause';
import ESEnumClause from '../parser/ESEnumClause';
import ESStructureClause from '../parser/ESStructureClause';

import Colors from '../../../../src/app/common/Colors';

const { List, Map } = Immutable;
const L = () => List([]);

const clauses = (new EQLConfig()).getClauses();
const { valueTypes } = CommonElastic;

let colorIndex = 0;
const numColors = 21;

export const ElasticElasticCards: { [type: string]: any } = {};
export const ElasticElasticCardDeckTypes: string[] = [];
const referenceCards: ESClause[] = [];

_.mapObject(
  clauses,
  
  (clause, key) =>
  {
    const card = clause.getCard();

    if (card)
    {
      if (typeof card === 'string')
      {
        referenceCards.push(clause);
      }
      else
      {
        const colorKey = ((++colorIndex) % numColors) + 1;
        card['static']['colors'] = [
          Colors().builder.cards['card' + colorKey],
          Colors().builder.cards['card' + colorKey + 'BG'],
        ];

        ElasticElasticCards[clause.getCardType()] = card;
      }

      ElasticElasticCardDeckTypes.push(clause.getCardType());
    }

    const blocks = clause.getSupplementalBlocks();
    _.mapObject(blocks, (val, key) =>
    {
      ElasticElasticCards[key] = val;
    });
  },
);

// add reference card types
referenceCards.map((clause) =>
{
  const type = clause.getCardType();
  const cardDef = ElasticElasticCards[clause.getCard()];
  if (cardDef)
  {
    const refCardDef = _.extend({}, cardDef, {
      type,
    });
    const colorKey = ((++colorIndex) % numColors) + 1;
    refCardDef['static'] = _.extend({},
      refCardDef['static'], 
      {
        colors:  [
          Colors().builder.cards['card' + colorKey],
          Colors().builder.cards['card' + colorKey + 'BG'],
        ],
        title: clause.name,
        // TODO add url, description, etc.
      }
    );
    ElasticElasticCards[type] = refCardDef;
  }
  else
  {
    console.log('No ref card def for ' + type);
    // TODO this should probably throw an error
  }
});

const getDisplayForType = (type: string, canBeCards?: boolean): Display | Display[] =>
{
  switch (type)
  {
    case valueTypes.text:
    case valueTypes.number:
      return {
        displayType: type === valueTypes.text ? 
          DisplayType.TEXT : DisplayType.NUM,
        key: 'value',
        getAutoTerms: (schemaState) =>
        {
          // TODO autocomplete
          return Immutable.List([]);
        }
        // autoDisabled: true,
      };
      
    case valueTypes.bool:
      return {
        displayType: DisplayType.DROPDOWN,
        key: 'value',
        options: Immutable.List(['false', 'true']),
      }
    
    case valueTypes.null:
      return [];
  }
}

//   const cardType = 'elasticElastic' + type;
//   const { def, desc, url, values, template, required, name } = clause;
  
//   if (clause instanceof ESStructureClause)
//   {
//     console.log('structure');
//   }
  
//   // if ()
  
//   if(typeof def === 'string')
//   {
//     let singleValueConfig: {
//       type: string;
//       default: any;
//       canBeCards?: boolean;
//       autocomplete?: any; // TODO
//     } = null;
    
//     switch(def)
//     {
//       case 'any':
//         singleValueConfig = {
//           type: CommonElastic.valueTypes.text, // TODO switch to auto?,
//           default: template || '',
//           canBeCards: true,
//         };
//         break;

//       case 'null':
//         singleValueConfig = {
//           type: CommonElastic.valueTypes.null,
//           default: template || '',
//         }
//         break;

//       case 'boolean':
//         singleValueConfig = {
//           type: CommonElastic.valueTypes.bool,
//           default: template || 1,
//         }
//         break;

//       case 'number':
//         singleValueConfig = {
//           type: CommonElastic.valueTypes.number,
//           default: template || 0,
//         }
//         break;

//       case 'string':
//         singleValueConfig = {
//           type: CommonElastic.valueTypes.text,
//           default: template || '',
//         }
//         break;

//       case 'base':
//         break;

//       case 'field':
//         break;

//       case 'query':
//         break;

//       case 'field_type':
//         break;

//       case 'enum':
//         break;

//       case 'variant':
//         break;

//       case 'term_value':
//         break;

//       case 'term_values':
//         break;

//       case 'painless':
//         break;
      
//       default:
        
//     }
    
//     if (singleValueConfig)
//     {
//       let display = getDisplayForType(singleValueConfig.type);
      
//       ElasticElasticCards[cardType] = _card({
//         value: singleValueConfig.default,
        
//         static:
//         {
//           title: name || type,
//           colors: ['#456', '#789'],
//           language: 'elastic',
//           preview: '[value]',
          
//           tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
//           {
//             let value = block['value'];
            
//             if(singleValueConfig.type === valueTypes.number)
//             {
//               value = +value;
//             }
            
//             if(singleValueConfig.type === valueTypes.bool)
//             {
//               value = !! value;
//             }
            
//             if(singleValueConfig.type === valueTypes.null)
//             {
//               value = null;
//             }
            
//             if(value['_isBlock'])
//             {
//               value = tqlTranslationFn(value['_isBlock'], tqlConfig);
//             }
            
//             return {
//               [type]: value,
//             };
//           },
          
//           display,
//         },
//       });
//     }
//   }
// });


export default ElasticElasticCards;
