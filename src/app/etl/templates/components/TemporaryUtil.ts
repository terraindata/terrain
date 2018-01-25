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
// tslint:disable:no-var-requires import-spacing
import
{
  _ElasticFieldSettings, _ExportTemplate, _TemplateField,
  ETLTemplate, TemplateEditorState, TemplateField,
} from 'etl/templates/TemplateTypes';
import * as Immutable from 'immutable';
import { ELASTIC_TYPES, TEMPLATE_TYPES } from 'shared/etl/templates/TemplateTypes';
const { List } = Immutable;

export const SampleDocuments = [
  {
    'Product Name': 'Food',
    'Product ID': 123,
    'Product Description': 'You can eat this to survive! It can be tasty. Or gross. Some examples of food: Tacos, Burgers, Pasta',
    'Meta': {
      'Date Added': '01/08/2018',
      'Views': 500,
    },
    'Related Products': [
      {
        'Item Name': 'Burger',
        'Description': 'Meat on a bun',
      },
      {
        'Item Name': 'Taco',
        'Description': 'Toppings in a tortilla',
      },
      {
        'Item Name': 'Pasta',
        'Description': 'Carbs in a bowl',
      },
    ],
    'Basic List': [
      'Banana', 'Apple', 'Orange', 'Kiwi',
    ],
    'Terrible Nested': [
      ['Aa', 'Bb', 'Cc'],
      ['Foo', 'Bar', 'Baz'],
      ['Cat', 'Dog', 'Bat'],
    ],
  },
  {
    'Product Name': 'Cool stuff',
    'Product ID': 5,
    'Product Description': 'Not to be confused with boring things',
    'Meta': {
      'Date Added': '01/10/2018',
      'Views': 515,
    },
    'Related Products': [
      {
        'Item Name': 'Video Games',
        'Description': 'Just my opinion, man',
      },
      {
        'Item Name': 'Fast cars',
        'Description': 'Zoom Zoom!',
      },
      {
        'Item Name': 'Friends',
        'extra field': 'this is an extra field',
      },
    ],
  },
  {
    'Product Name': 'Acronyms that start and end with P',
    'Product ID': 666,
    'Product Description': 'For some reason, these usually are annoying. e.g. PHP, PGP',
    'Meta': {
      'Date Added': '01/19/2018',
      'Views': 50,
    },
    'Related Products': [

    ],
  },
  {
    'Product Name': 'This product does not conform',
    'Product ID': 6,
  },
  // {
  //   'Product Name': 'Scooter',
  //   'Product ID': 10,
  //   'Product Description': 'Do you like skateboards but want handlebars? Scooters are for you! Some are electric, others are not.',
  //   'Meta': {
  //     'Date Added': '01/18/2018',
  //     'Views': 25,
  //   },
  //   'Here are some numbers': [
  //     [1, 2, 3],
  //     [3, 2, 1],
  //     [1, 3, 2],
  //     [2, 1, 3],
  //   ],
  // },
];

// temporary helper for debugging. delete this
export function treeFromDocument(document: object, name = '', fieldSettingsOverride?): TemplateField
{
  if (document === null)
  {
    return _TemplateField();
  }

  try
  {
    JSON.stringify(document);
  }
  catch (e)
  {
    return _TemplateField();
  }

  const children = [];

  for (const key of Object.keys(document))
  {
    const value = document[key];

    if (value !== Object(value))
    {
      if (typeof value === 'number')
      {
        children.push(_TemplateField({ name: key, langSettings: _ElasticFieldSettings({ type: ELASTIC_TYPES.FLOAT }) }));
      }
      else if (typeof value === 'boolean')
      {
        children.push(_TemplateField({ name: key, langSettings: _ElasticFieldSettings({ type: ELASTIC_TYPES.BOOLEAN }) }));
      }
      else // assume text
      {
        children.push(_TemplateField({ name: key, langSettings: _ElasticFieldSettings({ type: ELASTIC_TYPES.TEXT }) }));
      }
    }
    else if (Array.isArray(value))
    {
      let arrayVal: any = Array.isArray(value) && value.length > 0 ? value[0] : '';
      const arrayType = [];

      while (Array.isArray(arrayVal))
      {
        arrayType.push(ELASTIC_TYPES.ARRAY);
        if (arrayVal.length > 0)
        {
          arrayVal = arrayVal[0];
        }
        else
        {
          arrayVal = '';
        }
      }
      if (typeof arrayVal === 'object')
      {
        arrayType.push(ELASTIC_TYPES.NESTED);
      }
      else if (typeof arrayVal === 'number')
      {
        arrayType.push(ELASTIC_TYPES.FLOAT);
      }
      else if (typeof arrayVal === 'boolean')
      {
        arrayType.push(ELASTIC_TYPES.BOOLEAN);
      }
      else
      {
        arrayType.push(ELASTIC_TYPES.TEXT);
      }
      if (typeof arrayVal === 'object')
      {
        const override = _ElasticFieldSettings({ type: ELASTIC_TYPES.ARRAY, arrayType: List(arrayType) });
        children.push(treeFromDocument(arrayVal, key, override));
      }
      else
      {
        children.push(_TemplateField(
          {
            name: key,
            langSettings: _ElasticFieldSettings({ type: ELASTIC_TYPES.ARRAY, arrayType: List(arrayType) }),
          }));
      }
    }
    else // nested
    {
      children.push(treeFromDocument(value, key));
    }
  }
  return _TemplateField(
    {
      name,
      children: List(children),
      langSettings: fieldSettingsOverride !== undefined ? fieldSettingsOverride : _ElasticFieldSettings({ type: ELASTIC_TYPES.NESTED }),
    });
}
