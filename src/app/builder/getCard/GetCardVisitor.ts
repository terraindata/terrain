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

// tslint:disable:no-console
// tslint:enable:allow-null-union
// tslint:enable:allow-undefined-union

import { List } from 'immutable';
import * as _ from 'lodash';

import * as CommonElastic from '../../../../shared/database/elastic/syntax/CommonElastic';
import * as BlockUtils from '../../../blocks/BlockUtils';
import { Display, DisplayType } from '../../../blocks/displays/Display';
import { TQLFn } from '../../../blocks/types/Block';
import { _card, Card, InitFn } from '../../../blocks/types/Card';
import { AutocompleteMatchType, ElasticBlockHelpers } from '../../../database/elastic/blocks/ElasticBlockHelpers';
import { Backend } from '../../../database/types/Backend';
import { Colors, getCardColors } from '../../colors/Colors';

import ElasticKeyBuilderTextbox from '../../common/components/ElasticKeyBuilderTextbox';
import SpecializedCreateCardTool from '../components/cards/SpecializedCreateCardTool';

import ESClauseType from '../../../../shared/database/elastic/parser/ESClauseType';

import ESAnyClause from '../../../../shared/database/elastic/parser/clauses/ESAnyClause';
import ESArrayClause from '../../../../shared/database/elastic/parser/clauses/ESArrayClause';
import ESBaseClause from '../../../../shared/database/elastic/parser/clauses/ESBaseClause';
import ESBooleanClause from '../../../../shared/database/elastic/parser/clauses/ESBooleanClause';
import ESClause from '../../../../shared/database/elastic/parser/clauses/ESClause';
import ESEnumClause from '../../../../shared/database/elastic/parser/clauses/ESEnumClause';
import ESFieldClause from '../../../../shared/database/elastic/parser/clauses/ESFieldClause';
import ESIndexClause from '../../../../shared/database/elastic/parser/clauses/ESIndexClause';
import ESMapClause from '../../../../shared/database/elastic/parser/clauses/ESMapClause';
import ESNullClause from '../../../../shared/database/elastic/parser/clauses/ESNullClause';
import ESNumberClause from '../../../../shared/database/elastic/parser/clauses/ESNumberClause';
import ESObjectClause from '../../../../shared/database/elastic/parser/clauses/ESObjectClause';
import ESPropertyClause from '../../../../shared/database/elastic/parser/clauses/ESPropertyClause';
import ESReferenceClause from '../../../../shared/database/elastic/parser/clauses/ESReferenceClause';
import ESScriptClause from '../../../../shared/database/elastic/parser/clauses/ESScriptClause';
import ESStringClause from '../../../../shared/database/elastic/parser/clauses/ESStringClause';
import ESStructureClause from '../../../../shared/database/elastic/parser/clauses/ESStructureClause';
import ESTypeClause from '../../../../shared/database/elastic/parser/clauses/ESTypeClause';
import ESVariantClause from '../../../../shared/database/elastic/parser/clauses/ESVariantClause';
import ESWildcardStructureClause from '../../../../shared/database/elastic/parser/clauses/ESWildcardStructureClause';
import EQLConfig from '../../../../shared/database/elastic/parser/EQLConfig';
import ESClauseVisitor from '../../../../shared/database/elastic/parser/ESClauseVisitor';

const KEY_INLINE_DISPLAYS = [
  DisplayType.TEXT,
  DisplayType.CARDTEXT,
  DisplayType.NUM,
  DisplayType.DROPDOWN,
];

// Clause types that have static keys
const STATIC_KEY_CLAUSE_TYPES = [
  ESClauseType.ESStructureClause,
  ESClauseType.ESWildcardStructureClause,
];

const KEY_DISPLAY: Display =
  {
    displayType: DisplayType.TEXT,
    key: 'key',
    autoDisabled: true, // TODO consider autocomplete for key?
    className: 'card-muted-input card-elastic-key-input',
    component: ElasticKeyBuilderTextbox,
    style: {
      maxWidth: 100,
    },
  };

const STATIC_KEY_DISPLAY: Display =
  {
    displayType: DisplayType.LABEL,
    key: 'key',
    style: {
      maxWidth: 100,
      fontSize: 16,
    },
    className: 'card-elastic-key-label',
  };

/**
 *
 */
export default class GetCardVisitor extends ESClauseVisitor<any>
{

  public static getCardType(clause: ESClause | string): string
  {
    if (clause instanceof ESClause)
    {
      return 'eql' + clause.type;
    } else
    {
      return 'eql' + clause;
    }
  }

  protected static seedCard(clause: ESClause,
    obj: {
      [field: string]: any;
      static: {
        colors?: string[]; // optional, filled below
        title?: string; // optional, filled below

        preview: string | ((c: Card) => string);
        display: Display | Display[];
        tql: TQLFn;
        singleType?: boolean;
        typeName?: string;
        accepts?: List<string>;

        getChildTerms?: (card: Card, schemaState) => List<string>;
        getNeighborTerms?: (card: Card, schemaState) => List<string>;
        getParentTerms?: (card: Card, schemaState) => List<string>;

        metaFields?: string[];
        init?: InitFn;
      };
    }): any
  {
    // hide the title for elastic
    if (obj['noTitle'] === undefined)
    {
      obj['noTitle'] = true;
    }

    // fill in simple defaults, but allow overrides
    obj['static'] = _.extend({
      title: clause.name,
      clause,
      colors: getCardColors(clause.path[0], Colors().border2),
      language: 'elastic',
      description: clause.desc,
      url: clause.url,
    }, obj['static']);

    if (true) // switch this on for wrapper card approach
    {
      if (obj['key'] === undefined)
      {
        obj['key'] = '';
      }

      // prepend the display with our standard key text display
      const objStatic = obj['static'];
      const display = objStatic['display'];
      const keyDisplay = STATIC_KEY_CLAUSE_TYPES.indexOf(clause.clauseType) !== -1 ?
        _.extend({}, STATIC_KEY_DISPLAY, { label: clause.type }) : KEY_DISPLAY;
      if (display === undefined)
      {
        objStatic['display'] = keyDisplay;
      }
      else if (Array.isArray(display))
      {
        (display as Display[]).unshift(keyDisplay);
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
              keyDisplay,
              display,
            ],
          };
        }
        else
        {
          objStatic['display'] = [
            keyDisplay,
            objStatic['display'],
          ] as any;
        }
      }
    }

    return _card(obj as any);
  }

  protected static initCardValueFromTemplate(blocksConfig, extraConfig?, skipTemplate?)
  {
    const config = {};
    if (skipTemplate !== true && extraConfig && extraConfig.template)
    {
      config['value'] = String(extraConfig.template);
    }
    return config;
  }

  // map the card type name ('eql' + clausename) to the card
  public elasticElasticCards: { [type: string]: any };
  // an array of the card type name
  public elasticElasticCardDeckTypes: string[];

  private clauses: { [name: string]: ESClause };
  private config: EQLConfig;
  private colorIndex: number;

  // Map a variant clause type name to a list of non-variant clauses reached from the variant clause.
  private variantClauseMapping: { [clauseType: string]: string[] } = {};

  private customCardTypesMap: { [elasticClauseType: string]: string[] } = {
    sort_clause: ['elasticScore'],
    query: ['elasticFilter', 'elasticDistance'],
  };

  public constructor(config: EQLConfig)
  {
    super();
    this.elasticElasticCards = {};
    this.elasticElasticCardDeckTypes = [];

    this.config = config;

    this.clauses = this.config.getClauses();

    // first, populate the variant clause map, since it will be used by getCard
    this.computeVariantClauses(this.clauses);

    _.mapValues(
      this.clauses,
      (clause) =>
      {
        this.getCard(clause);
      });
  }

  public getCard(clause: ESClause): any
  {
    const cardType: string = GetCardVisitor.getCardType(clause);
    let card = this.elasticElasticCards[cardType];
    if (card !== undefined)
    {
      return card;
    }

    card = clause.accept(this);

    if (card === null) // no card for this clause type
    {
      return;
    }

    this.elasticElasticCardDeckTypes.push(cardType);
    this.elasticElasticCards[cardType] = card;
    return card;
  }

  public visitESClause(clause: ESClause): any
  {
    return null;
  }

  public visitESAnyClause(clause: ESAnyClause): any
  {
    // TODO try an inline approach
    return GetCardVisitor.seedCard(clause, {
      cards: List([]),

      static:
      {
        colors: getCardColors(clause.path[0], Colors().builder.cards.anyClause),
        title: clause.type + ' (Variant)',
        tql: (block, tqlFn, tqlConfig) =>
        {
          return tqlFn(block['cards'].get(0), tqlConfig); // straight pass-through
        },

        display:
        {
          displayType: DisplayType.CARDS,
          key: 'cards',
          singleChild: true,
        },
        preview: '',
      },
    });
  }

  public visitESArrayClause(clause: ESArrayClause): any
  {
    const accepts = this.getCardTypes([clause.elementID], clause);
    return GetCardVisitor.seedCard(clause, {
      cards: List([]),

      static:
      {
        colors: getCardColors(clause.path[0], Colors().builder.cards.arrayClause),
        preview: '[cards.size] ' + clause.type + '(s)',
        accepts,
        display:
        {
          displayType: DisplayType.CARDS,
          key: 'cards',
          accepts,
        },

        init: (blocksConfig, extraConfig?, skipTemplate?) =>
        {
          const config = {};
          let template;
          if (extraConfig !== undefined && extraConfig.template)
          {
            template = extraConfig.template;
          } else if (clause.template)
          {
            template = clause.template;
          }

          // template : [ card1, card2, ...]
          const cards = _.compact(
            _.map(
              template,
              (templateValue, templateIndex) =>
              {
                //                console.log("Array ->" + templateIndex + " : " + templateValue);
                const cardTypeName = GetCardVisitor.getCardType(clause.elementID);
                return BlockUtils.make(
                  blocksConfig, cardTypeName,
                  {
                    key: String(templateIndex),
                    template: templateValue,
                  },
                );
              }));
          config['cards'] = List(cards);
          return config;
        },

        tql: (block, tqlFn, tqlConfig) =>
        {
          return block['cards'].map((card) => tqlFn(card, tqlConfig)).toArray();
        },
      },
    });
  }

  public visitESBaseClause(clause: ESBaseClause): any
  {
    return GetCardVisitor.seedCard(clause, {
      value: clause.template === undefined ? '' : String(clause.template),
      colors: getCardColors(clause.path[0], Colors().builder.cards.baseClause),
      static: {
        init: GetCardVisitor.initCardValueFromTemplate,
        colors: getCardColors(clause.path[0], Colors().builder.cards.baseClause),
        preview: '[value]',
        display: {
          displayType: DisplayType.TEXT,
          key: 'value',
        },
        tql: (block) => CommonElastic.parseESValue(block['value']),
        singleType: false,
      },
    });
  }

  public visitESBooleanClause(clause: ESBooleanClause): any
  {
    return GetCardVisitor.seedCard(clause, {
      key: clause.name,
      value: clause.template === undefined ? 'true' : String(clause.template),

      static: {
        init: GetCardVisitor.initCardValueFromTemplate,
        colors: getCardColors(clause.path[0], Colors().builder.cards.booleanClause),
        preview: '[value]',
        display: {
          displayType: DisplayType.DROPDOWN,
          key: 'value',
          options: List([
            'false',
            'true',
          ]),
        },
        tql: (boolBlock) => !!boolBlock['value'],
        singleType: true,
        typeName: 'boolean',
      },
    });
  }

  public visitESEnumClause(clause: ESEnumClause): any
  {
    return GetCardVisitor.seedCard(clause, {
      key: clause.name,
      value: clause.template === undefined ? String(clause.values[0]) : String(clause.template),
      colors: getCardColors(clause.path[0], Colors().builder.cards.enumClause),
      static: {
        init: GetCardVisitor.initCardValueFromTemplate,
        colors: getCardColors(clause.path[0], Colors().builder.cards.enumClause),
        preview: '[value]',
        display: {
          displayType: DisplayType.DROPDOWN,
          key: 'value',
          options: List(clause.values),
          dropdownUsesRawValues: true,
        },
        tql: (block) => block['value'],
        singleType: true,
        typeName: typeof clause.values[0],
      },
    });
  }

  public visitESFieldClause(clause: ESFieldClause): any
  {
    return GetCardVisitor.seedCard(clause, {
      value: clause.template === undefined ? '' : String(clause.template),
      static: {
        init: GetCardVisitor.initCardValueFromTemplate,
        colors: getCardColors(clause.path[0], Colors().builder.cards.fieldClause),
        preview: '[value]',
        display: {
          displayType: DisplayType.TEXT,
          key: 'value',
          getAutoTerms: (schemaState): List<string> =>
          {
            return ElasticBlockHelpers.autocompleteMatches(schemaState, AutocompleteMatchType.Field);
          },
        },
        tql: (stringBlock) => stringBlock['value'],
        singleType: true,
        typeName: 'string',
      },
    });
  }

  public visitESIndexClause(clause: ESIndexClause): any
  {
    return GetCardVisitor.seedCard(clause, {
      key: 'index',
      value: clause.template === undefined ? '' : String(clause.template),
      static: {
        init: GetCardVisitor.initCardValueFromTemplate,
        colors: getCardColors(clause.path[0], Colors().builder.cards.indexClause),
        preview: '[value]',
        display: {
          displayType: DisplayType.TEXT,
          key: 'value',
          getAutoTerms: (schemaState): List<string> =>
          {
            return ElasticBlockHelpers.autocompleteMatches(schemaState, AutocompleteMatchType.Index);
          },
        },
        tql: (stringBlock) => stringBlock['value'],
        singleType: true,
        typeName: 'string',
      },
    });
  }

  public visitESMapClause(clause: ESMapClause): any
  {
    const accepts = this.getCardTypes([clause.valueType], clause);

    return GetCardVisitor.seedCard(clause, {
      cards: List([]),
      childrenHaveKeys: true,

      // TODO incorporate nameType into the keys

      static:
      {
        colors: getCardColors(clause.path[0], Colors().builder.cards.mapClause),
        preview: '[cards.size] properties',
        display:
        {
          displayType: DisplayType.CARDS,
          key: 'cards',
          accepts,
        },
        accepts,
        init: (blocksConfig, extraConfig?, skipTemplate?) =>
        {
          let template;
          if (extraConfig !== undefined && extraConfig.template !== undefined)
          {
            template = extraConfig.template;
          } else if (clause.template)
          {
            template = clause.template;
          }

          if (template && skipTemplate !== true)
          {
            // create the card list from the template
            const cards = _.compact(
              _.map(
                template,
                (templateValue, templateKey) =>
                {
                  //              console.log(templateKey + ":" + templateValue);
                  const cardKeyType = templateKey.split(':');
                  let cardTypeName = cardKeyType[1];
                  if (!cardTypeName.startsWith('elastic'))
                  {
                    cardTypeName = GetCardVisitor.getCardType(cardKeyType[1]);
                  }
                  if (blocksConfig[cardTypeName] !== undefined)
                  {
                    return BlockUtils.make(
                      blocksConfig, cardTypeName,
                      {
                        key: cardKeyType[0],
                        template: templateValue,
                        // value: templateValue === null ? undefined : templateValue,
                        // all base cards have a 'value' key
                      },
                    );
                  }
                  else
                  {
                    console.log('No block for ' + String(templateKey), cardTypeName, templateValue);
                  }
                },
              ),
            );

            return { cards: List(cards) };
          }
          return {};
        },
        tql: (block, tqlFn, tqlConfig) =>
        {
          const json = {};
          block['cards'].map(
            (card) =>
            {
              json[card['key']] = tqlFn(card, tqlConfig);
            },
          );
          return json;
        },
      },
    });
  }

  public visitESNullClause(clause: ESNullClause): any
  {
    return GetCardVisitor.seedCard(clause, {
      value: 'null',
      noTitle: false,
      static: {
        colors: getCardColors(clause.path[0], Colors().builder.cards.nullClause),
        preview: '[value]',
        display: [],
        tql: () => null,
        singleType: true,
        typeName: 'null',
      },
    });
  }

  public visitESNumberClause(clause: ESNumberClause): any
  {
    return GetCardVisitor.seedCard(clause, {
      value: clause.template == null || clause.template === undefined
        ? '0' : String(clause.template),
      static: {
        init: GetCardVisitor.initCardValueFromTemplate,
        preview: '[value]',
        colors: getCardColors(clause.path[0], Colors().builder.cards.numberClause),
        display: {
          displayType: DisplayType.NUM,
          key: 'value',
          // TODO autocomplete?
        },
        tql: (numBlock) => +numBlock['value'],
        singleType: true,
        typeName: 'number',
      },
    });
  }

  public visitESObjectClause(clause: ESObjectClause): any
  {
    return GetCardVisitor.seedCard(clause, {
      cards: List([]),
      childrenHaveKeys: true,

      static:
      {
        colors: getCardColors(clause.path[0], Colors().builder.cards.objectClause),
        preview: '[cards.size] properties',
        display:
        {
          displayType: DisplayType.CARDS,
          key: 'cards',
        },

        tql: (block, tqlFn, tqlConfig) =>
        {
          const json = {};
          block['cards'].map(
            (card) =>
            {
              json[card['key']] = tqlFn(card, tqlConfig);
            },
          );
          return json;
        },
      },
    });
  }

  public visitESPropertyClause(clause: ESPropertyClause): any
  {
    return this.visitESStringClause(clause);
  }

  public visitESReferenceClause(clause: ESReferenceClause): any
  {
    const delegateClause: ESClause = clause.delegateClause;
    const delegateCard = this.getCard(clause.delegateClause);

    const card = _.extend({}, delegateCard, {
      type: GetCardVisitor.getCardType(delegateClause),
    });

    return card;
  }

  public visitESScriptClause(clause: ESScriptClause): any
  {
    return this.visitESStructureClause(clause);
  }

  public visitESStringClause(clause: ESStringClause): any
  {
    return GetCardVisitor.seedCard(clause, {
      value: clause.template === undefined ? '' : String(clause.template),
      static: {
        init: GetCardVisitor.initCardValueFromTemplate,
        colors: getCardColors(clause.path[0], Colors().builder.cards.stringClause),
        preview: '[value]',
        display: {
          displayType: DisplayType.TEXT,
          key: 'value',
          // TODO autocomplete
        },
        tql: (stringBlock) => stringBlock['value'],
        singleType: true,
        typeName: 'string',
      },
    });
  }

  public visitESWildcardStructureClause(clause: ESWildcardStructureClause): any
  {
    return this.visitESStructureClause(clause);
  }

  public visitESStructureClause(clause: ESStructureClause): any
  {
    // accepts are overwritten by getChildOptions
    const accepts = this.getCardTypes(_.values(clause.structure), clause);

    const init = (blocksConfig, extraConfig?, skipTemplate?) =>
    {
      const config = {
        childOptionClickHandler: (card, option: { text: string, key: string, type: string }): Card =>
        {
          // reducer to apply the option to the card
          return card.update('cards', (cards) =>
            cards.push(
              BlockUtils.make(
                blocksConfig, option.type,
                {
                  key: option.key,
                },
              ),
            ),
          );
        },
      };

      let template;
      if (extraConfig && extraConfig.template)
      {
        template = extraConfig.template;
      } else if (clause.template)
      {
        template = clause.template;
      }

      if (template && skipTemplate !== true)
      {
        // create the card list from the template
        const cards = _.compact(
          _.map(
            template,
            (templateValue, templateKey) =>
            {
              //              console.log(templateKey + ":" + templateValue);
              const cardKeyType = templateKey.split(':');
              let cardTypeName = cardKeyType[1];
              if (!cardTypeName.startsWith('elastic'))
              {
                cardTypeName = GetCardVisitor.getCardType(cardKeyType[1]);
              }
              if (blocksConfig[cardTypeName])
              {
                return BlockUtils.make(
                  blocksConfig, cardTypeName,
                  {
                    key: cardKeyType[0],
                    template: templateValue,
                    // value: templateValue === null ? undefined : templateValue,
                    // all base cards have a 'value' key
                  },
                );
              }
              else
              {
                console.log('No block for ' + String(templateKey), cardTypeName, templateValue);
              }
            },
          ),
        );

        config['cards'] = List(cards);
      }

      return config;
    };
    return GetCardVisitor.seedCard(clause,
      {
        cards: List([]),
        // provide options of all possible card types (overwrite static.accepts)
        getChildOptions: (card, backend: Backend) =>
        {
          const seen = new Set();
          const result = [];
          const handler = (key: string) =>
          {
            if (!seen.has(key))
            {
              seen.add(key);

              const clauseType = clause.structure[key];

              if (card['cards'].find((p) => p.key === key) === undefined)
              {
                const cardTypes = this.getCardTypes([clauseType]);
                cardTypes.map((cardType) =>
                  result.push({
                    text: key + ': ' + (backend.blocks[cardType].static['title'] as string),
                    key,
                    type: cardType,
                  }),
                );
              }
            }
          };

          if (this.customCardTypesMap[clause.type] !== undefined)
          {
            // TODO consolidate this code with above code block, DRY
            this.customCardTypesMap[clause.type].forEach(
              (cardType) =>
              {
                const cardConfig = backend.blocks[cardType];
                const key: string = cardConfig['key'];

                if (card['cards'].find((p) => p.key === key) === undefined)
                {
                  result.push({
                    text: key + ': ' + (cardConfig.static['title'] as string),
                    key,
                    type: cardType,
                  });
                }
              },
            );
          }

          clause.suggestions.forEach(handler);
          clause.required.forEach(handler);
          Object.keys(clause.structure).forEach(handler);

          return List(result);
        },

        childOptionClickHandler: null, // set in init()

        childrenHaveKeys: true,

        static:
        {
          tql: (block, tqlTranslationFn, tqlConfig) =>
          {
            const json: object = {};
            block['cards'].map(
              (card) =>
              {
                _.extend(json, {
                  [card['key']]: tqlTranslationFn(card, tqlConfig),
                });
              },
            );
            return json;
          },
          colors: getCardColors(clause.path[0], Colors().builder.cards.structureClause),
          preview: '[cards.size] Properties',

          accepts,
          init,

          display: [
            {
              displayType: DisplayType.CARDS,
              key: 'cards',
              hideCreateCardTool: true,
            },
            {
              provideParentData: true, // need this to grey out the type dropdown
              displayType: DisplayType.COMPONENT,
              component: SpecializedCreateCardTool,
              key: null,
              // help: ManualConfig.help['score'],
            },
          ],
        },
      },
    );
  }

  public visitESTypeClause(clause: ESTypeClause): any
  {
    return GetCardVisitor.seedCard(clause, {
      key: 'type',
      value: clause.template === undefined ? '' : String(clause.template),
      static: {
        init: GetCardVisitor.initCardValueFromTemplate,
        colors: getCardColors(clause.path[0], Colors().builder.cards.typeClause),
        preview: '[value]',
        display: {
          displayType: DisplayType.TEXT,
          key: 'value',
          getAutoTerms: (schemaState): List<string> =>
          {
            return ElasticBlockHelpers.autocompleteMatches(schemaState, AutocompleteMatchType.Type);
          },
        },
        tql: (stringBlock) => stringBlock['value'],
        singleType: true,
        typeName: 'boolean',
      },
    });
  }

  // Because we have already computed a list of causes reached from the variant clause
  public visitESVariantClause(clause: ESVariantClause): any
  {
    return null;
  }

  // For computing a variant clause to final subtypes mapping.
  // Get a list of non-variant clauses reached from this variant clause.
  private computeVariantClauses(clauses: { [name: string]: ESClause })
  {
    const variantClauses: { [clauseType: string]: ESClause } = {};
    _.mapValues(clauses, (clause, key) =>
    {
      if (clause.clauseType === ESClauseType.ESVariantClause)
      {
        variantClauses[clause.type] = clause;
      }
    },
    );

    const getClauseTypesForVariant = (clause: ESVariantClause): string[] =>
    {
      let types: string[] = [];
      _.mapValues(clause.subtypes, (subtype) =>
      {
        if (variantClauses[subtype] !== undefined)
        {
          types = types.concat(getClauseTypesForVariant(clauses[subtype] as ESVariantClause));
        }
        else
        {
          types.push(subtype);
        }
      });

      return types;
    };

    this.variantClauseMapping = _.mapValues(variantClauses, getClauseTypesForVariant);
  }

  // We need to replace occurrences of variant card types with their final types
  // We also need to splice in some custom types
  private getCardTypes(initialClauseTypes: string[], forClause?: ESClause): List<string>
  {
    // all clause types reached from the initialClauseTypes
    let clauseTypes: string[] = [];
    initialClauseTypes.map((childType) =>
    {
      if (this.variantClauseMapping[childType] !== undefined)
      {
        // variant clause, substitute
        clauseTypes = clauseTypes.concat(this.variantClauseMapping[childType]);
      }
      else
      {
        clauseTypes.push(childType);
      }
    });

    // turn clause type names to card type names
    let cardTypes = clauseTypes.map((type) =>
    {
      const cardTypeName = GetCardVisitor.getCardType(type);
      if (this.clauses[type] !== undefined)
      {
        return cardTypeName;
      }
      console.log('Card ' + cardTypeName + ' is missing.');
      return null;
    });

    // add custom card names to the card type names
    if (forClause !== undefined && this.customCardTypesMap[forClause.type] !== undefined)
    {
      cardTypes = this.customCardTypesMap[forClause.type].concat(cardTypes);
    }

    return List(cardTypes);
  }
}
