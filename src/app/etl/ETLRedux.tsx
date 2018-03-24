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
// tslint:disable:import-spacing

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import MidwayError from 'shared/error/MidwayError';
import { ConstrainedMap, GetType, TerrainRedux, Unroll, WrappedPayload } from 'src/app/store/TerrainRedux';

import { SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import ETLAjax, { ExecuteConfig } from 'etl/ETLAjax';
import { ErrorHandler } from 'etl/ETLAjax';
import { Sinks, Sources, SinkOptionsType, SourceOptionsType } from 'shared/etl/types/EndpointTypes';

import { _ETLTemplate, ETLTemplate } from 'etl/templates/TemplateTypes';
import { _ETLState, ETLState } from './ETLTypes';

import { FileTypes } from 'shared/etl/types/ETLTypes';

export interface ETLActionTypes
{
  setLoading: { // sort of a semaphore to track if there are pending requests for a given query
    actionType: 'setLoading';
    key: string;
    isLoading: boolean;
  };
  getTemplate: {
    actionType: 'getTemplate';
    id: number;
    onLoad: (response: List<ETLTemplate>) => void;
    onError?: ErrorHandler;
  };
  executeTemplate: {
    actionType: 'executeTemplate',
    template: ETLTemplate,
  };
  fetchTemplates: {
    actionType: 'fetchTemplates';
    onLoad?: (response: List<ETLTemplate>) => void;
    onError?: ErrorHandler;
  };
  setTemplates: {
    actionType: 'setTemplates';
    templates: List<ETLTemplate>;
  };
  createTemplate: {
    actionType: 'createTemplate';
    template: ETLTemplate;
    onLoad: (response: List<ETLTemplate>) => void;
    onError?: ErrorHandler;
  };
  saveTemplate: {
    actionType: 'saveTemplate';
    template: ETLTemplate;
    onLoad: (response: List<ETLTemplate>) => void;
    onError?: ErrorHandler;
  };
  updateLocalTemplates: { // find the given template and update our list
    actionType: 'updateLocalTemplates';
    template: ETLTemplate;
  };
}

class ETLRedux extends TerrainRedux<ETLActionTypes, ETLState>
{
  public namespace: string = 'etl';

  public reducers: ConstrainedMap<ETLActionTypes, ETLState> =
    {
      getTemplate: (state, action) => state, // overriden reducers
      fetchTemplates: (state, action) => state,
      executeTemplate: (state, action) => state,
      createTemplate: (state, action) => state,
      saveTemplate: (state, action) => state,
      setLoading: (state, action) =>
      {
        let value = _.get(state.loading, action.payload.key, 0);
        if (action.payload.isLoading)
        {
          value++;
        }
        else if (value !== 0)
        {
          value--;
        }
        else
        {
          // TODO throw an error?
        }
        const newLoading = _.extend({}, state.loading,
          { [action.payload.key]: value },
        );
        return state.set('loading', newLoading);
      },
      setTemplates: (state, action) =>
      {
        return state.set('templates', action.payload.templates);
      },
      updateLocalTemplates: (state, action) =>
      {
        const index = state.templates.findIndex((template) =>
        {
          return template.id === action.payload.template.id;
        });
        if (index === -1)
        {
          return state.update('templates', (templates) => templates.push(action.payload.template));
        }
        else
        {
          return state.update('templates', (templates) => templates.set(index, action.payload.template));
        }
      },
    };

  // TODO, add a thing to the state where we can log errors?
  public onErrorFactory(onError: ErrorHandler, directDispatch: typeof ETLActions, key: string): ErrorHandler
  {
    return (response: string | MidwayError) =>
    {
      directDispatch({
        actionType: 'setLoading',
        isLoading: false,
        key,
      });
      if (onError !== undefined)
      {
        onError(response);
      }
    };
  }

  // creates a function that updates the loading map, and also runs all the onLoads
  public onLoadFactory<T>(onLoads: Array<(response: T) => void>, directDispatch, key: string)
  {
    return (response: T) =>
    {
      directDispatch({
        actionType: 'setLoading',
        isLoading: false,
        key,
      });
      for (const onLoad of onLoads)
      {
        onLoad(response);
      }
    };
  }

  public executeTemplate(action: ETLActionType<'executeTemplate'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;

    const template = action.template;
    const defaultSink = template.getSink('_default');
    const defaultSource = template.getSource('_default');

    if (defaultSink === undefined)
    {
      return; // todo error
    }
    else
    {
      const options: ExecuteConfig = {};
      if (defaultSink.type === Sinks.Download)
      {
        const extension = defaultSink.fileConfig.fileType === FileTypes.Json ?
          '.json' : '.csv';
        const mimeType = defaultSink.fileConfig.fileType === FileTypes.Json ?
          'application/json' : 'text/csv';
        const downloadFilename = `Export_${template.id}${extension}`;
        options.download = {
          downloadFilename,
          mimeType,
        }
      }
      else if (defaultSource.type === Sources.Upload)
      {
        const file = (defaultSource.options as SourceOptionsType<Sources.Upload>).file;
        options.files = [file];
      }
      else
      {
        // tslint:disable-next-line
        console.log(`Sink Type ${defaultSink.type} not implemented yet, ` +
          `or Source Type ${defaultSource.type} not implemented yet`);
        return;
      }

      ETLAjax.executeTemplate(template.id, options)
        .then(this.onLoadFactory<any>([], directDispatch, name))
        .catch(this.onErrorFactory(undefined, directDispatch, name));
    }
  }

  public fetchTemplates(action: ETLActionType<'fetchTemplates'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;

    directDispatch({
      actionType: 'setLoading',
      isLoading: true,
      key: name,
    });

    const setTemplates = (templates: List<ETLTemplate>) =>
    {
      directDispatch({
        actionType: 'setTemplates',
        templates,
      });
    };
    const loadFunctions = [
      setTemplates,
    ];
    if (action.onLoad !== undefined)
    {
      loadFunctions.push(action.onLoad);
    }

    ETLAjax.fetchTemplates()
      .then(this.onLoadFactory(loadFunctions, directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
  }

  public getTemplate(action: ETLActionType<'getTemplate'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;

    directDispatch({
      actionType: 'setLoading',
      isLoading: true,
      key: name,
    });

    ETLAjax.getTemplate(action.id)
      .then(this.onLoadFactory([action.onLoad], directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name))
  }

  public createTemplate(action: ETLActionType<'createTemplate'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;

    directDispatch({
      actionType: 'setLoading',
      isLoading: true,
      key: name,
    });

    const updateTemplate = (templates: List<ETLTemplate>) =>
    {
      if (templates.size > 0)
      {
        const template = templates.get(0);
        directDispatch({
          actionType: 'updateLocalTemplates',
          template,
        });
      }
      else
      {
        // TODO error?
      }
    };

    ETLAjax.createTemplate(action.template)
      .then(this.onLoadFactory([updateTemplate, action.onLoad], directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
  }

  public saveTemplate(action: ETLActionType<'saveTemplate'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;

    directDispatch({
      actionType: 'setLoading',
      isLoading: true,
      key: name,
    });

    const updateTemplate = (templates: List<ETLTemplate>) =>
    {
      if (templates.size > 0)
      {
        const template = templates.get(0);
        directDispatch({
          actionType: 'updateLocalTemplates',
          template,
        });
      }
      else
      {
        // TODO error?
      }
    };
    ETLAjax.saveTemplate(action.template)
      .then(this.onLoadFactory([updateTemplate, action.onLoad], directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
  }

  public overrideAct(action: Unroll<ETLActionTypes>)
  {
    switch (action.actionType)
    {
      case 'fetchTemplates':
        return this.fetchTemplates.bind(this, action);
      case 'getTemplate':
        return this.getTemplate.bind(this, action);
      case 'executeTemplate':
        return this.executeTemplate.bind(this, action);
      case 'createTemplate':
        return this.createTemplate.bind(this, action);
      case 'saveTemplate':
        return this.saveTemplate.bind(this, action);
      default:
        return undefined;
    }
  }
}

const ReduxInstance = new ETLRedux();
export const ETLActions = ReduxInstance._actionsForExport();
export const ETLReducers = ReduxInstance._reducersForExport(_ETLState);
export declare type ETLActionType<K extends keyof ETLActionTypes> =
  GetType<K, ETLActionTypes>;
