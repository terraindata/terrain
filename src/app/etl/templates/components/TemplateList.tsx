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

// tslint:disable:no-var-requires strict-boolean-expressions

import { List } from 'immutable';
import memoizeOne from 'memoize-one';
import * as React from 'react';
import Util from 'util/Util';

import Button from 'app/common/components/Button';
import FloatingInput from 'app/common/components/FloatingInput';
import TerrainTools from 'app/util/TerrainTools';
import { MenuOption } from 'common/components/Menu';
import TerrainComponent from 'common/components/TerrainComponent';
import { HeaderConfig, ItemList } from 'etl/common/components/ItemList';
import { ETLActions } from 'etl/ETLRedux';
import ETLRouteUtil from 'etl/ETLRouteUtil';
import Initializers from 'etl/helpers/TemplateInitializers';
import { _ETLTemplate, ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import { instanceFnDecorator } from 'shared/util/Classes';
import './TemplateList.less';
const RemoveIcon = require('images/icon_close_8x8.svg?name=RemoveIcon');

export interface AllowedActions
{
  delete?: boolean;
  apply?: boolean;
}

export interface Props
{
  onClick?: (template: ETLTemplate) => void;
  getRowStyle?: (template: ETLTemplate) => object | object[];
  filter?: (template: ETLTemplate) => boolean;
  allowedActions?: AllowedActions;
  onMenuItemClicked?: (template: ETLTemplate, which: keyof AllowedActions) => void;
  // injected props
  etlAct: typeof ETLActions;
  templates: List<ETLTemplate>;
  algorithms: Immutable.Map<ID, Algorithm>;
}

class TemplateList extends TerrainComponent<Props>
{
  public state: {
    rawTemplate: string,
  } = {
      rawTemplate: '',
    };

  public displayConfig: HeaderConfig<ETLTemplate> = [
    {
      name: 'ID',
      render: (template, index) => template.id,
      style: { width: `5%` },
    },
    {
      name: 'Name',
      render: (template, index) => template.templateName,
      style: { width: `35%` },
    },
    {
      name: 'Description',
      render: (template, index) => template.getDescription(this.props.algorithms as any),
      style: { width: `60%` },
    },
  ];

  @instanceFnDecorator(memoizeOne)
  public _getTemplates(templates, filter)
  {
    if (typeof filter === 'function')
    {
      return templates.filter(filter);
    }
    else
    {
      return templates;
    }
  }

  public getTemplates()
  {
    const { templates, filter } = this.props;
    return this._getTemplates(templates, filter);
  }

  public getRowStyle(index)
  {
    const { templates, getRowStyle } = this.props;
    if (getRowStyle !== undefined)
    {
      return getRowStyle(templates.get(index));
    }
    else
    {
      return templateListItemStyle;
    }
  }

  @instanceFnDecorator(memoizeOne)
  public computeMenuOptionsFactory(allowedActions: AllowedActions)
    : (template: ETLTemplate, index: number) => List<MenuOption>
  {
    if (allowedActions === undefined)
    {
      return undefined;
    }

    return (template, index) =>
    {
      let options = List([]);
      if (allowedActions.delete === true)
      {
        options = options.push({
          text: 'Delete Template',
          onClick: this.deleteTemplateClickFactory(template),
        });
      }
      if (allowedActions.apply === true)
      {
        options = options.push({
          text: 'Apply Template',
          onClick: this.applyTemplateClickFactory(template),
        });
      }
      return options;
    };
  }

  public getActions(index: number, template)
  {
    return (
      <RemoveIcon
        className='template-delete close'
        onClick={this._fn(this.deleteAction, template)}
      />
    );
  }

  public handleCreateTemplate()
  {
    try
    {
      const templateConfig = JSON.parse(this.state.rawTemplate);
      const newTemplate = _ETLTemplate(templateConfig, true);
      this.props.etlAct({
        actionType: 'createTemplate',
        template: newTemplate.set('id', undefined),
        onLoad: undefined,
      });
    }
    catch (e)
    {
      this.props.etlAct({
        actionType: 'addModal',
        props: {
          title: 'Error',
          message: String(e),
          error: true,
        },
      });
    }
  }

  public render()
  {
    const computeOptions = this.computeMenuOptionsFactory(this.props.allowedActions);
    return (
      <div
        className='template-table-wrapper'
      >
        <ItemList
          items={this.props.templates.sortBy((a) => a.id).toList()}
          columnConfig={this.displayConfig}
          onRowClicked={this.handleOnClick}
          getMenuOptions={computeOptions}
          itemsName='template'
          getActions={!computeOptions ? this.getActions : undefined}
          canCreate={TerrainTools.isAdmin()}
          onCreate={() => ETLRouteUtil.gotoWalkthroughStep(0)}
        />
        {
          TerrainTools.isFeatureEnabled(TerrainTools.TEMPLATE_COPY) ?
            <div
              className='template-list-raw-input'
            >
              <FloatingInput
                label={'Paste Raw Template Here'}
                value={this.state.rawTemplate}
                onChange={this._setStateWrapper('rawTemplate')}
                isTextInput={true}
                canEdit={true}
                forceFloat={true}
              />
              <Button
                text={'Create'}
                onClick={this.handleCreateTemplate}
              />
            </div>
            : null
        }
      </div>
    );
  }

  public handleOnClick(index)
  {
    const { templates } = this.props;
    const template = templates.get(index);
    if (this.props.onClick != null)
    {
      this.props.onClick(template);
    }
    else
    {
      // open that template in the template editor
      ETLRouteUtil.gotoEditTemplate(template.id);
    }
  }

  public applyTemplateClickFactory(template: ETLTemplate)
  {
    return (event) =>
    {
      Initializers.initFromApplyTemplate(template.id);
      if (this.props.onMenuItemClicked !== undefined)
      {
        this.props.onMenuItemClicked(template, 'apply');
      }
    };
  }

  public deleteTemplateClickFactory(template: ETLTemplate)
  {
    return (event) =>
    {
      this.deleteAction(template, event);
    };
  }

  public deleteAction(template: ETLTemplate, e?)
  {
    if (e !== undefined)
    {
      e.stopPropagation();
    }
    const onConfirm = () =>
    {
      this.props.etlAct({
        actionType: 'deleteTemplate',
        template,
      });
    };
    this.props.etlAct({
      actionType: 'addModal',
      props: {
        title: 'Delete Template',
        message: 'Are you sure you want to delete this template?',
        closeOnConfirm: true,
        confirm: true,
        confirmButtonText: 'Delete',
        onConfirm,
      },
    });
    if (this.props.onMenuItemClicked !== undefined)
    {
      this.props.onMenuItemClicked(template, 'delete');
    }
  }
}

const templateListItemStyle = {};

export default Util.createContainer(
  TemplateList,
  [
    ['etl', 'templates'],
    ['library', 'algorithms'],
  ],
  { etlAct: ETLActions },
);
