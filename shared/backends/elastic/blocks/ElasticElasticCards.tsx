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

import * as _ from 'underscore';
import * as Immutable from 'immutable';
const { List, Map } = Immutable;
const L = () => List([]);
import { _block, Block, TQLTranslationFn } from '../../../blocks/types/Block';
import BlockUtils from '../../../blocks/BlockUtils';
import { _card, Card, CardString, CardConfig } from '../../../blocks/types/Card';
import { Input, InputType } from '../../../blocks/types/Input';
import CommonElastic from '../syntax/CommonElastic';
import { Display, DisplayType, firstSecondDisplay, getCardStringDisplay, letVarDisplay, stringValueDisplay, valueDisplay, wrapperDisplay, wrapperSingleChildDisplay } from '../../../blocks/displays/Display';
import CommonBlocks from '../../../blocks/CommonBlocks';
const { _wrapperCard, _aggregateCard, _valueCard, _aggregateNestedCard } = CommonBlocks;

import EQLConfig from '../parser/EQLConfig';
import ESClause from '../parser/ESClause';
import ESStructureClause from '../parser/ESStructureClause';
import ESEnumClause from '../parser/ESEnumClause';

import Colors from '../../../../src/app/common/Colors';

const clauses = (new EQLConfig()).getClauses();
console.log(clauses);

const { valueTypes } = CommonElastic;

let colorIndex = 0;
const numColors = 21;

const ElasticElasticCards: { [type: string]: any } = 
  _.omit(
    _.mapObject(clauses, 
      (clause) => 
      {
        const card = clause.getCard();
        const colorKey = ((++colorIndex) % numColors) + 1;
        
        if (card)
        {
          card['static']['colors'] = [
            Colors().builder.cards['card' + colorKey],
            Colors().builder.cards['card' + colorKey + 'BG'],
          ];
        }
        
        return card;
      }
    ),
    
    (card) => !card // omit if the value was falsy
  );

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


_card({
  index: '',
  from: 0,
  rootType: '',
  rootSize: 100,

  body: '',
  sort: '',

  cards: L(),

  static:
  {
    title: 'Root',
    colors: ['#456', '#789'],
    preview: '[index], [rootType]',
    language: 'elastic',

    tql: (rootBlock: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
    {
      return {
        index: rootBlock['index'],
        type: rootBlock['rootType'],
        from: rootBlock['from'],
        size: rootBlock['rootSize'],
      };
    },

    display:
    [
      {
        displayType: DisplayType.TEXT,
        key: 'index',
        getAutoTerms: (schemaState) =>
        {
          return Immutable.List(['movies', 'baseball', 'zazzle']);
        }
        // autoDisabled: true,
      },
      {
        displayType: DisplayType.TEXT,
        key: 'rootType',
        autoDisabled: true,
      },
      {
        displayType: DisplayType.NUM,
        key: 'from',
        autoDisabled: true,
      },
      {
        displayType: DisplayType.NUM,
        key: 'rootSize',
        autoDisabled: true,
      },

      {
        displayType: DisplayType.CARDS,
        key: 'cards',
      },
    ]
  },
});

export default ElasticElasticCards;
