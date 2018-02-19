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

// tslint:disable:no-var-requires restrict-plus-operands no-unused-expression strict-boolean-expressions no-console

import * as Immutable from 'immutable';
import * as _ from 'lodash';
import List = Immutable.List;

import CommonSQL from '../../../../shared/database/mysql/syntax/CommonSQL';
import AjaxM1 from '../../../app/util/AjaxM1'; // TODO change / remove
import Query from '../../../items/types/Query';

import * as BlockUtils from '../../../blocks/BlockUtils';
import { Block } from '../../../blocks/types/Block';
import { Card, Cards, CardString } from '../../../blocks/types/Card';

const make = (blockConfig, extraConfig?: object) =>
{
  return BlockUtils.make(Blocks, blockConfig.type, extraConfig);
};

import Blocks from '../blocks/MySQLBlocks';

export default function SQLToCards(
  query: Query,
  queryReady: (query: Query) => void,
): Query
{
  const prevReq = query.getIn(['meta', 'parseTreeReq']);
  prevReq && typeof prevReq.abort === 'function' && prevReq.abort();

  const req = AjaxM1.parseTree(
    query.tql,
    query.db.id + '',
    parseTreeLoaded,
    parseTreeError,
    { // context
      query,
      queryReady,
    },
  ).xhr;

  return query
    .set('cardsAndCodeInSync', false)
    .setIn(['meta', 'parseTreeReq'], req);
}

const parseTreeLoaded = (response, context) =>
{
  let query: Query = context.query;
  const queryReady: (query: Query) => void = context.queryReady;

  const { error, result } = response;

  query = query.setIn(['meta', 'parseTreeReq'], null);

  if (error)
  {
    query = query
      .set('cardsAndCodeInSync', false);
  }
  else
  {
    query = query
      .set('cards', TQLToCards.convert(result, query.cards))
      .set('cardsAndCodeInSync', true);
  }

  // alert the state that the query needs to change
  queryReady(query);
};

const parseTreeError = (error, context) =>
{
  // TODO MOD confirm what format the error comes back as
  let query: Query = context.query;
  const queryReady: (query: Query) => void = context.queryReady;

  query = query.setIn(['meta', 'parseTreeReq'], null);
  query = query
    .set('cardsAndCodeInSync', false);

  // alert the state that the query needs to change
  queryReady(query);
};

const TQLToCards =
  {
    convert(statement: Statement, currentCards?: Cards): Cards
    {
      const statements = statement.statements.map(parseNodeAsCard);

      const cards: Cards = List(statements);

      if (currentCards)
      {
        return BlockUtils.reconcileCards(currentCards, cards);
      }

      return cards;
    },
  };

function parseNode(node: Node | string): CardString
{
  if (node === null || node === undefined)
  {
    return make(Blocks.tql);
  }

  if (typeof node !== 'object')
  {
    return node;
  }
  else
  {
    if (generalProcessors[node.op])
    {
      return generalProcessors[node.op](node);
    }

    if (sfwProcessors[node.op])
    {
      const sfw = parseNode(node.left_child) as Card;
      const rightNodes = flattenCommas(node.right_child);
      const card = sfwProcessors[node.op](rightNodes);
      if (typeof sfw !== 'object')
      {
        return card;
      }
      return sfw.set('cards',
        sfw['cards'].push(card),
      );
    }

    if (comparisonProcessors[node.op.toUpperCase()])
    {
      return comparisonProcessor(node);
    }

    console.log('no op', node);
    return make(Blocks.tql, {
      clause: node.op,
    });
  }
}

// same as parse node, but always returns a card
function parseNodeAsCard(node: Node | string): Card
{
  const val = parseNode(node);

  if (!val['_isCard'])
  {
    return make(Blocks.tql, {
      clause: val,
    });
  }

  return val as Card;
}

const andOrProcessor = (op: string) =>
  (node: Node): Card =>
  {
    const childNodes = flattenOp(op, node.left_child)
      .concat(flattenOp(op, node.right_child));
    return make(Blocks[op.toLowerCase()], {
      cards: List(
        childNodes.map(parseNodeAsCard),
      ),
    });
  };

const generalProcessors: {
  [opType: string]: (
    node: Node,
  ) => CardString,
} = {
    'FROM':
      (node) =>
      {
        const tables = _.compact(
          flattenCommas(node.child)
            .map(
              (tableNode) =>
              {
                if (!tableNode)
                {
                  return null;
                }
                if (typeof tableNode !== 'object' || tableNode.op !== 'AS')
                {
                  return make(Blocks.table, {
                    table: tableNode,
                  });
                }
                else
                {
                  return make(Blocks.table, {
                    table: parseNode(tableNode.left_child),
                    alias: tableNode.right_child,
                  });
                }
              },
          ));

        let cards = List([]);
        if (tables.length)
        {
          // If there are no tables, this is an empty From statement, and we shouldn't make a card for it
          cards = List([
            make(Blocks.from, {
              tables: List(tables),
            }),
          ]);
        }

        return make(Blocks.sfw, {
          cards,
        });
      },

    'SELECT':
      (node) =>
      {
        const sfw = parseNode(node.left_child) as Card;
        const fieldNodes = flattenCommas(node.right_child);
        const fieldBlocks: Block[] = fieldNodes.map(
          (fieldNode) =>
            make(
              Blocks.field,
              {
                field: parseNode(fieldNode),
              },
            ),
        );
        return sfw.set('fields', Immutable.List(fieldBlocks));
      },

    '.':
      (node) =>
      {
        return node.left_child + '.' + node.right_child;
      },

    'CALL':
      (node) =>
      {
        let type = node.left_child as string;

        if (typeof type === 'string')
        {
          type = type.trim().toLowerCase();

          if (type === 'date')
          {
            return '"' + parseNode(node.right_child) + '"';
          }

          if (type === 'linear_score')
          {
            const weightNodes = flattenCommas(node.right_child);
            let weights = List([]);
            for (let i = 0; i < weightNodes.length; i += 2)
            {
              weights = weights.push(
                make(Blocks.weight, {
                  weight: parseNode(weightNodes[i]),
                  key: parseNode(weightNodes[i + 1]),
                }),
              );
            }
            return make(Blocks.score, {
              weights,
            });
          }

          if (type === 'linear_transform')
          {
            const scorePointNodes = flattenCommas(node.right_child);
            let scorePoints = List([]);

            for (let i = 1; i < scorePointNodes.length; i += 2)
            {
              scorePoints = scorePoints.push(
                make(Blocks.scorePoint, {
                  score: parseNode(scorePointNodes[i]),
                  value: parseNode(scorePointNodes[i + 1]),
                }),
              );
            }
            return make(Blocks.transform, {
              input: parseNode(scorePointNodes[0]),
              scorePoints,
            });
          }

          if (Blocks[type])
          {
            return make(Blocks[type], {
              value: parseNode(node.right_child),
            });
          }
        }
        return make(Blocks.tql, { clause: 'call' });
      },

    'call':
      (node) =>
      {
        let type = node.left_child as string;
        if (typeof type === 'string')
        {
          type = type.trim();

          if (type === 'linear_score')
          {
            const weightNodes = flattenCommas(node.right_child);
            let weights = List([]);
            for (let i = 0; i < weightNodes.length; i += 2)
            {
              weights = weights.push(
                make(Blocks.weight, {
                  weight: parseNode(weightNodes[i]),
                  key: parseNode(weightNodes[i + 1]),
                }),
              );
            }
            return make(Blocks.score, {
              weights,
            });
          }

          if (type === 'linear_transform')
          {
            const scorePointNodes = flattenCommas(node.right_child);
            let scorePoints = List([]);

            for (let i = 1; i < scorePointNodes.length; i += 2)
            {
              scorePoints = scorePoints.push(
                make(Blocks.scorePoint, {
                  score: scorePointNodes[i],
                  value: scorePointNodes[i + 1],
                }),
              );
            }
            return make(Blocks.transform, {
              input: parseNode(scorePointNodes[0]),
              scorePoints,
            });
          }

          if (Blocks[type])
          {
            return make(Blocks[type], {
              value: parseNode(node.right_child),
            });
          }
        }

        return make(Blocks.tql, { clause: 'call' });
      },

    'DISTINCT':
      (node) =>
        make(Blocks.distinct, {
          value: parseNode(node.child),
        }),

    'EXPR':
      (node) =>
        parseNode(node.child),

    'AS':
      (node) =>
        make(Blocks.as, {
          value: parseNode(node.left_child),
          alias: node.right_child,
        }),

    'AND':
      andOrProcessor('AND'),

    'OR':
      andOrProcessor('OR'),

    'EXISTS':
      (node) =>
        make(
          Blocks.exists,
          {
            cards: List([
              parseNodeAsCard(node.child),
            ]),
          },
        ),

    'NOT':
      (node) =>
        make(
          Blocks.not,
          {
            cards: List([
              parseNodeAsCard(node.child),
            ]),
          },
        ),

    // TODO migrate to card when available
    'IS NOT NULL':
      (node) =>
        node.child + ' IS NOT NULL',

    '+':
      (node) =>
        parseMathNode(node, '+', Blocks.add),

    '-':
      (node) =>
      {
        // could be negative, or could be subract
        if (node.child)
        {
          // negative
          const contents = parseNode(node.child);
          if (typeof contents !== 'object')
          {
            return '-' + contents;
          }

          return make(Blocks.subtract,
            {
              fields: List([
                make(Blocks.field, {
                  field: '0',
                }),
                make(Blocks.field, {
                  field: contents,
                }),
              ]),
            });
        }
        return parseMathNode(node, '-', Blocks.subtract);
      },

    '*':
      (node) =>
        parseMathNode(node, '*', Blocks.multiply),

    '/':
      (node) =>
        parseMathNode(node, '/', Blocks.divide),

  };

function parseMathNode(node: Node, op: string, mathCardBlock): Card
{
  const nodes = flattenOp(op, node);
  const fields = nodes.map(parseNode).map(
    (fieldValue) =>
      make(Blocks.field,
        {
          field: fieldValue,
        }),
  );

  return make(
    mathCardBlock,
    {
      fields: List(fields),
    },
  );
}

const comparisonProcessors = _.reduce(
  CommonSQL.OperatorTQL,
  (memo, val: string) =>
  {
    memo[val.toUpperCase()] = true;
    return memo;
  }, {},
);

function comparisonProcessor(node: Node): Card
{
  return make(Blocks.comparison, {
    first: parseNode(node.left_child),
    second: parseNode(node.right_child),
    operator: + _.findKey(CommonSQL.OperatorTQL,
      (op: string) => op.toUpperCase() === node.op.toUpperCase(),
    ),
  });
}

// The following types are contained with the From card,
//  are above the From node on the parse tree, and have
//  meta data stored in their right node
const sfwProcessors: {
  [opType: string]: (
    rightNodes: Array<Node | string>, // already flattened
  ) => CardString,
} = {

    TAKE:
      (rightNodes) =>
        make(Blocks.take, {
          value: rightNodes[0],
        }),

    SKIP:
      (rightNodes) =>
        make(Blocks.skip, {
          value: rightNodes[0],
        }),

    SORT:
      (sortNodes) =>
        make(Blocks.sort, {
          sorts: List(
            sortNodes.map(
              (node) =>
              {
                let config: any = {
                  property: node,
                };
                if (typeof node === 'object')
                {
                  config = {
                    property: parseNode(node.child),
                    direction: node.op === 'ASC' ? CommonSQL.Direction.ASC : CommonSQL.Direction.DESC,
                  };
                }
                return make(Blocks.sortBlock, config);
              },
            ),
          ),
        }),

    GROUP:
      (fieldNodes) =>
        make(Blocks.groupBy, {
          fields: List(
            fieldNodes.map(
              (node) =>
                make(Blocks.field, {
                  field: parseNode(node),
                }),
            ),
          ),
        }),

    FILTER:
      (childNodes) =>
        make(
          Blocks.where,
          {
            // filter doesn't use commas, will only have one node
            cards: List([
              parseNodeAsCard(childNodes[0]),
            ]),
          },
        ),

    HAVING:
      (childNodes) =>
        make(
          Blocks.having,
          {
            cards: List([
              parseNodeAsCard(childNodes[0]),
            ]),
          },
        ),
  };

// takes a tree of a certain op (e.g. commas, and/or)
//  and turns it into an array of Node
function flattenOp(op: string, node: Node | string): Array<Node | string>
{
  if (typeof node !== 'object' || !node || node.op !== op)
  {
    return [node];
  }
  else
  {
    return flattenOp(op, node.left_child).concat(
      flattenOp(op, node.right_child),
    );
  }
}

function flattenCommas(node: Node | string)
{
  return flattenOp(',', node);
}

interface Statement
{
  node_type: string;
  statements: Node[];
}

interface Node
{
  node_type: string;
  op: string;
  left_child?: Node | string;
  right_child?: Node | string;
  child?: Node;
}
