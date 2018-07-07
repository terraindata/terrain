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
import * as Immutable from 'immutable';

export interface MagentoConfig
{
  host: string;
  params?: MagentoParamConfigType<MagentoParamTypes>;
  route: MagentoRoutes;
  sessionId?: string;
}

export interface MagentoParamConfigTypes
{
  CatalogInventoryStockItemList: {
    products: string[];
  };
  CatalogProductAttributeMediaList: {
    product: string;
    storeView: number;
  };
  CatalogProductInfo: {
    productId: string;
    storeView: number;
  };
  CatalogProductList: {
    filters: KV[];
    storeView: number;
  };
}

export const MagentoParamConfigDefaults: MagentoParamConfigTypes =
{
  CatalogInventoryStockItemList: {
    products: [],
  },
  CatalogProductAttributeMediaList: {
    product: '',
    storeView: -1,
  },
  CatalogProductInfo: {
    productId: '',
    storeView: -1,
  },
  CatalogProductList: {
    filters: [],
    storeView: -1,
  },
};

export interface KV
{
  key: string;
  value: {
    key: 'in';
    value: string;
  }
}

export interface PartialMagentoConfig
{
  host: string;
  sessionId: string;
}

export interface WSDLTree
{
  message: object;
  portType: object;
  types: object;
}

export type MagentoResponse = string | object | object[];

export enum MagentoRoutes
{
  CatalogProductAttributeMediaList = 'CatalogProductAttributeMediaList',
  CatalogProductInfo = 'CatalogProductInfo',
  CatalogInventoryStockItemList = 'CatalogInventoryStockItemList',
  CatalogProductList = 'CatalogProductList',
}

export const MagentoRoutesNames = Immutable.Map<string, string>({
  [MagentoRoutes.CatalogProductAttributeMediaList]: 'Catalog Product Attribute Media List',
  [MagentoRoutes.CatalogProductInfo]: 'Catalog Product Info',
  [MagentoRoutes.CatalogInventoryStockItemList]: 'Catalog Inventory Stock Item List',
  [MagentoRoutes.CatalogProductList]: 'Catalog Product List',
});

export enum MagentoRoutesRaw
{
  CatalogProductAttributeMediaList = 'catalogProductAttributeMediaList',
  CatalogProductInfo = 'catalogProductInfo',
  CatalogInventoryStockItemList = 'catalogInventoryStockItemList',
  CatalogProductList = 'catalogProductList',
}

export const MagentoRoutesArr: List<MagentoRoutes> = Immutable.List([
  MagentoRoutes.CatalogInventoryStockItemList,
  MagentoRoutes.CatalogProductAttributeMediaList,
  MagentoRoutes.CatalogProductInfo,
  MagentoRoutes.CatalogProductList,
]);

// export const MagentoRoutesNamesArr: List<string> = MagentoRoutesNames.valueSeq().toList();

export type MagentoParamTypes = keyof MagentoParamConfigTypes;
export type MagentoParamConfigType<key extends MagentoParamTypes> = MagentoParamConfigTypes[key];
type MagentoAssertTypesExhaustive =
{
  [K in MagentoRoutes]: MagentoParamConfigTypes[K];
}
