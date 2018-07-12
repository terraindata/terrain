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
// tslint:disable:no-var-requires max-classes-per-file
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { instanceFnDecorator } from 'shared/util/Classes';

import ObjectForm from 'common/components/ObjectForm';
import DatabasePicker from 'etl/common/components/DatabasePicker';
import FileConfigForm from 'etl/common/components/FileConfigForm';
import UploadFileButton from 'etl/common/components/UploadFileButton';
import { LibraryState } from 'library/LibraryTypes';
import
{
  _FileConfig,
  _RootPostProcessConfig,
  _SourceConfig,
  FileConfig,
  RootInputConfig,
  RootPostProcessConfig,
  SinkConfig,
  SourceConfig,
} from 'shared/etl/immutable/EndpointRecords';
import
{
  FileConfig as FileConfigI, GoogleAnalyticsOptions, HttpOptions,
  MagentoOptions, SftpOptions, SinkOptionsType, Sinks, SourceOptionsType,
  Sources, SQLOptions,
} from 'shared/etl/types/EndpointTypes';

import { FileTypes, Languages } from 'shared/etl/types/ETLTypes';
import
{
  KV,
  KVConditionsArr,
  KVConditionsNames,
  MagentoParamConfigDefaults,
  MagentoParamConfigType,
  MagentoParamPayloadTypes,
  MagentoParamTypes,
  MagentoRoutes,
  MagentoRoutesNames,
  MagentoSinkRoutesArr,
  MagentoSourceRoutesArr,
} from 'shared/etl/types/MagentoTypes';
import { InputForm, InputsForm } from '../../endpoints/InputForm';
import { PostProcessForm, TransformForm } from '../../endpoints/PostProcessForm';
import { EndpointFormBase } from './EndpointFormClasses';

const { List } = Immutable;

type MagentoState = SinkOptionsType<Sinks.Magento>;
export class MagentoEndpoint extends EndpointFormBase<MagentoState>
{
  public inputMap: InputDeclarationMap<MagentoState> = {
    route: {
      type: DisplayType.Pick,
      displayName: 'Route',
      options: {
        pickOptions: this.computeMagentoRoutes,
        indexResolver: (value) => this.computeMagentoRoutes().indexOf(value),
        displayNames: (s) => MagentoRoutesNames,
      },
    },
    params: {
      type: DisplayType.Custom,
      widthFactor: 5,
      style: { padding: '0px' },
      options: {
        render: this.renderParams,
      },
    },
    esdbid: {
      type: DisplayType.Custom,
      widthFactor: 5,
      style: { padding: '0px' },
      getDisplayState: this.computeDBPickerDisplayState,
      options: {
        render: this.renderDatabasePicker,
      },
    },
    remapping: {
      type: DisplayType.Custom,
      widthFactor: -1,
      options: {
        render: this.renderRemappingForm,
      },
    },
    onlyFirst: {
      type: DisplayType.CheckBox,
      displayName: 'Only First Product',
    },
    includedFields: {
      type: DisplayType.TagsBox,
      displayName: 'Included Fields',
    },
  };

  public computeDBPickerDisplayState(state: MagentoState)
  {
    return state.route != null && MagentoParamPayloadTypes[state.route] !== undefined
      && MagentoParamPayloadTypes[state.route]['dbPicker'] ? DisplayState.Active : DisplayState.Hidden;
  }

  public computeMagentoRoutes(s?)
  {
    return this.props.isSource === true ? MagentoSourceRoutesArr : MagentoSourceRoutesArr;
  }

  public renderDatabasePicker(state: MagentoState, disabled: boolean)
  {
    const { esdbid, esindex } = state;
    return (
      <DatabasePicker
        allowEmpty={true}
        language={Languages.Elastic}
        serverId={esdbid != null ? esdbid : -1}
        database={esindex != null ? esindex : ''}
        table={'data'}
        onChange={this.handleDbPickerChange}
        constantHeight={true}
      />
    );
  }

  public handleDbPickerChange(serverId: ID, database: string, table: string, language: Languages)
  {
    const { onChange, endpoint } = this.props;
    const newOptions = _.extend({}, endpoint.options, { esdbid: serverId, esindex: database });
    onChange(endpoint.set('options', newOptions));
  }

  public renderRemappingForm(state: MagentoState, disabled)
  {
    return (
      <ObjectForm
        object={state.remapping != null ? state.remapping : {}}
        onChange={this.handleRemappingChange}
        label='Remap Fields'
        onSubmit={this.onSubmit}
      />
    );
  }

  public onSubmit()
  {
    // do nothing
  }

  public handleRemappingChange(newRemapping, apply?: boolean)
  {
    const newOptions = _.extend({}, this.props.endpoint.options, {
      remapping: newRemapping,
    });
    this.handleOptionsFormChange(newOptions);
  }

  public formStateToOptions(newState: MagentoState): MagentoState
  {
    if (newState.route !== this.props.endpoint.options.route)
    {
      const defaultParam = _.get(MagentoParamPayloadTypes, [newState.route, 'paramName'], undefined);
      const defaultMap = defaultParam !== undefined ? { '': defaultParam } : {};
      const isOnlyFirst = _.get(MagentoParamPayloadTypes, [newState.route, 'isArray'], true);

      return _.extend({}, newState, {
        params: MagentoParamConfigDefaults[newState.route],
        remapping: defaultMap,
        onlyFirst: !isOnlyFirst,
      });
    }
    return newState;
  }

  public renderParams(state: MagentoState, disabled: boolean)
  {
    const route = state.route;
    switch (route)
    {
      case MagentoRoutes.CatalogCategoryAssignedProducts:
        return (
          <CategoryAssignedProductsForm
            onChange={this.onChangeParams}
            inputState={state.params as MagentoParamConfigType<typeof route>}
          />
        );
      case MagentoRoutes.CatalogCategoryAssignProduct:
        return (
          <CategoryAssignProductForm
            onChange={this.onChangeParams}
            inputState={state.params as MagentoParamConfigType<typeof route>}
          />
        );
      case MagentoRoutes.CatalogCategoryRemoveProduct:
        return (
          <CategoryRemoveProductForm
            onChange={this.onChangeParams}
            inputState={state.params as MagentoParamConfigType<typeof route>}
          />
        );
      case MagentoRoutes.CatalogInventoryStockItemList:
        return null;
      case MagentoRoutes.CatalogProductAttributeMediaList:
        return (
          <AttributeMediaListForm
            onChange={this.onChangeParams}
            inputState={state.params as MagentoParamConfigType<typeof route>}
          />
        );
      case MagentoRoutes.CatalogProductInfo:
        return (
          <ProductInfoForm
            onChange={this.onChangeParams}
            inputState={state.params as MagentoParamConfigType<typeof route>}
          />
        );
      case MagentoRoutes.CatalogProductList:
        return (
          <ProductListForm
            onChange={this.onChangeParams}
            inputState={state.params as MagentoParamConfigType<typeof route>}
          />
        );
      default:
        return null;
    }
  }

  public onChangeParams(newParams: object)
  {
    const newOptions = _.extend({}, this.props.endpoint.options, {
      params: newParams,
    });
    this.handleOptionsFormChange(newOptions);
  }
}

interface ParamProps<T>
{
  onChange: (val, apply?) => void;
  inputState: T;
}

type CatalogProductListType = MagentoParamConfigType<MagentoRoutes.CatalogProductList>;
class ProductListForm extends TerrainComponent<ParamProps<CatalogProductListType>>
{
  public inputMap: InputDeclarationMap<CatalogProductListType> = {
    storeView: {
      type: DisplayType.NumberBox,
      displayName: 'Store View',
    },
    filters: {
      type: DisplayType.Delegate,
      displayName: 'Filters',
      options: {
        component: KVForm,
        isList: true,
        listDefaultValue: {
          key: 'type',
          value: {
            key: 'in',
            value: 'value',
          },
        },
      },
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.inputState}
      />
    );
  }
}

class KVForm extends TerrainComponent<{ onChange: (val) => void; inputState: KV }>
{
  public inputMap: InputDeclarationMap<KV> = {
    key: {
      type: DisplayType.TextBox,
      displayName: 'Data Field',
    },
    value: {
      type: DisplayType.Delegate,
      displayName: '',
      options: {
        component: KVValueForm,
      },
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.inputState}
      />
    );
  }
}

class KVValueForm extends TerrainComponent<{ inputState: { key: string, value: string }; onChange: (val) => void }>
{
  public inputMap: InputDeclarationMap<{ key: string, value: string }> = {
    key: {
      type: DisplayType.Pick,
      displayName: 'Condition',
      options: {
        pickOptions: this.computeKVCondition,
        indexResolver: (value) => this.computeKVCondition().indexOf(value),
        displayNames: (s) => KVConditionsNames,
      },
    },
    value: {
      type: DisplayType.TextBox,
      displayName: 'Value',
    },
  };

  public computeKVCondition(s?)
  {
    return KVConditionsArr;
  }

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.inputState}
      />
    );
  }
}

type CatalogCategoryAssignedProductsType = MagentoParamConfigType<MagentoRoutes.CatalogCategoryAssignedProducts>;
class CategoryAssignedProductsForm extends TerrainComponent<ParamProps<CatalogCategoryAssignedProductsType>>
{
  public inputMap: InputDeclarationMap<CatalogCategoryAssignedProductsType> = {
    categoryId: {
      type: DisplayType.TextBox,
      displayName: 'Category ID',
    },
    storeView: {
      type: DisplayType.NumberBox,
      displayName: 'Store View',
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.inputState}
      />
    );
  }
}

type CatalogCategoryAssignProductType = MagentoParamConfigType<MagentoRoutes.CatalogCategoryAssignProduct>;
class CategoryAssignProductForm extends TerrainComponent<ParamProps<CatalogCategoryAssignProductType>>
{
  public inputMap: InputDeclarationMap<CatalogCategoryAssignProductType> = {
    categoryId: {
      type: DisplayType.TextBox,
      displayName: 'Category ID',
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.inputState}
      />
    );
  }
}

type CatalogCategoryRemoveProductType = MagentoParamConfigType<MagentoRoutes.CatalogCategoryRemoveProduct>;
class CategoryRemoveProductForm extends TerrainComponent<ParamProps<CatalogCategoryRemoveProductType>>
{
  public inputMap: InputDeclarationMap<CatalogCategoryRemoveProductType> = {
    categoryId: {
      type: DisplayType.TextBox,
      displayName: 'Category ID',
    },
    storeView: {
      type: DisplayType.NumberBox,
      displayName: 'Store View',
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.inputState}
      />
    );
  }
}

type CatalogProductInfoType = MagentoParamConfigType<MagentoRoutes.CatalogProductInfo>;
class ProductInfoForm extends TerrainComponent<ParamProps<CatalogProductInfoType>>
{
  public inputMap: InputDeclarationMap<CatalogProductInfoType> = {
    storeView: {
      type: DisplayType.NumberBox,
      displayName: 'Store View',
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.inputState}
      />
    );
  }
}

type AttributeMediaListType = MagentoParamConfigType<MagentoRoutes.CatalogProductAttributeMediaList>;
class AttributeMediaListForm extends TerrainComponent<ParamProps<AttributeMediaListType>>
{
  public inputMap: InputDeclarationMap<AttributeMediaListType> = {
    storeView: {
      type: DisplayType.NumberBox,
      displayName: 'Store View',
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.inputState}
      />
    );
  }
}

// export interface MagentoOptions
// {
//   params: MagentoParamConfigType<MagentoParamTypes>;
//   route: MagentoRoutes;
// }

// export interface MagentoConfig
// {
//   host: string;
//   params?: MagentoParamConfigType<MagentoParamTypes>;
//   route: MagentoRoutes;
//   sessionId?: string;
// }

// export interface MagentoParamConfigTypes
// {
//   CatalogInventoryStockItemList: {
//     products: string[];
//   };
//   CatalogProductAttributeMediaList: {
//     product: string;
//     storeView: number;
//   };
//   CatalogProductInfo: {
//     productId: string;
//     storeView: number;
//   };
//   CatalogProductList: {
//     filters: KV[];
//     storeView: number;
//   };
// }

// export interface ComplexFilter
// {
//   item: KV[];
// }

// export interface KV
// {
//   key: string;
//   value: {
//     key: 'in';
//     value: string;
//   }
// }

// export interface PartialMagentoConfig
// {
//   host: string;
//   sessionId: string;
// }

// export interface WSDLTree
// {
//   message: object;
//   portType: object;
//   types: object;
// }

// export type MagentoResponse = string | object | object[];

// export enum MagentoRoutes
// {
//   CatalogProductAttributeMediaList = 'CatalogProductAttributeMediaList',
//   CatalogProductInfo = 'CatalogProductInfo',
//   CatalogInventoryStockItemList = 'CatalogInventoryStockItemList',
//   CatalogProductList = 'CatalogProductList',
// }

// export enum MagentoRoutesNames
// {
//   CatalogProductAttributeMediaList = 'Catalog Product Attribute Media List',
//   CatalogProductInfo = 'Catalog Product Info',
//   CatalogInventoryStockItemList = 'Catalog Inventory Stock Item List',
//   CatalogProductList = 'Catalog Product List',
// }

// export enum MagentoRoutesRaw
// {
//   CatalogProductAttributeMediaList = 'catalogProductAttributeMediaList',
//   CatalogProductInfo = 'catalogProductInfo',
//   CatalogInventoryStockItemList = 'catalogInventoryStockItemList',
//   CatalogProductList = 'catalogProductList',
// }

// export const MagentoRoutesArr: MagentoRoutes[] =
//   [
//     MagentoRoutes.CatalogInventoryStockItemList,
//     MagentoRoutes.CatalogProductAttributeMediaList,
//     MagentoRoutes.CatalogProductInfo,
//     MagentoRoutes.CatalogProductList,
//   ];

// export const MagentoRoutesNamesArr: MagentoRoutesNames[] =
//   [
//     MagentoRoutesNames.CatalogInventoryStockItemList,
//     MagentoRoutesNames.CatalogProductAttributeMediaList,
//     MagentoRoutesNames.CatalogProductInfo,
//     MagentoRoutesNames.CatalogProductList,
//   ];

// export type MagentoParamTypes = keyof MagentoParamConfigTypes;
// export type MagentoParamConfigType<key extends MagentoParamTypes> = MagentoParamConfigTypes[key];
// type MagentoAssertTypesExhaustive =
// {
//   [K in MagentoRoutes]: MagentoParamConfigTypes[K];
// }
