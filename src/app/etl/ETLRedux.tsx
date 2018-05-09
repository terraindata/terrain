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
import Util from 'app/util/Util';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import MidwayError from 'shared/error/MidwayError';
import { ConstrainedMap, GetType, TerrainRedux, Unroll, WrappedPayload } from 'src/app/store/TerrainRedux';

import { ModalProps, MultiModal } from 'common/components/overlay/MultiModal';
import ETLAjax, { ExecuteConfig } from 'etl/ETLAjax';
import { ErrorHandler } from 'etl/ETLAjax';
import { SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import { SinkOptionsType, Sinks, SourceOptionsType, Sources } from 'shared/etl/types/EndpointTypes';

import { _IntegrationConfig, IntegrationConfig } from 'shared/etl/immutable/IntegrationRecords';
import { _ETLTemplate, ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import { AuthConfigType, ConnectionConfigType } from 'shared/etl/types/IntegrationTypes';
import { _ETLState, ETLState } from './ETLTypes';

import { FileTypes } from 'shared/etl/types/ETLTypes';

export interface ETLActionTypes
{
  addModal: {
    actionType: 'addModal';
    props: ModalProps;
  };
  setModalRequests: {
    actionType: 'setModalRequests';
    requests: List<ModalProps>;
  };
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
    actionType: 'executeTemplate';
    template: ETLTemplate;
    onSuccess?: () => void;
    onError?: (ev: any) => void;
  };
  createExecuteJob: {
    actionType: 'createExecuteJob';
    onLoad: (id: number) => void;
    onError: (ev: any) => void;
  };
  runExecuteJob: {
    actionType: 'runExecuteJob';
    jobId: number;
    template: ETLTemplate;
    files?: { [k: string]: File };
    downloadName?: string;
    mimeType?: string;
    onLoad: () => void;
    onError: (ev: any) => void;
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
  deleteTemplate: {
    actionType: 'deleteTemplate';
    template: ETLTemplate;
    onLoad?: () => void;
    onError?: ErrorHandler;
  };
  createTemplate: {
    actionType: 'createTemplate';
    template: ETLTemplate;
    onLoad: (response: List<ETLTemplate>) => void;
    onError?: ErrorHandler;
  };
  saveAsTemplate: {
    actionType: 'saveAsTemplate';
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
  setRunningTemplate: {
    actionType: 'setRunningTemplate',
    templateId: number,
    template: ETLTemplate,
  };
  clearRunningTemplate: {
    actionType: 'clearRunningTemplate',
    templateId: number,
  };
  setAcknowledgedRun: {
    actionType: 'setAcknowledgedRun',
    templateId: number,
    value: boolean,
  };
  // Integration Action Types
  getIntegrations: {
    actionType: 'getIntegrations',
    simple?: boolean,
    onError?: ErrorHandler,
  };
  getIntegration: {
    actionType: 'getIntegration',
    integrationId: ID,
    simple?: boolean;
    onError?: ErrorHandler,
  };
  updateIntegration: {
    actionType: 'updateIntegration',
    integrationId: ID,
    integration: IntegrationConfig,
    onError?: ErrorHandler,
  };
  deleteIntegration: {
    actionType: 'deleteIntegration',
    integrationId: ID,
    onError?: ErrorHandler,
  };
  createIntegration: {
    actionType: 'createIntegration',
    integration: IntegrationConfig,
    onError?: ErrorHandler,
    onLoad?: (result: IntegrationConfig) => void,
  };
  getIntegrationsSuccess: {
    actionType: 'getIntegrationsSuccess',
    integrations: IntegrationConfig[],
  };
  getIntegrationSuccess: {
    actionType: 'getIntegrationSuccess',
    integration: IntegrationConfig,
  };
  deleteIntegrationSuccess: {
    actionType: 'deleteIntegrationSuccess';
    integrationId: ID;
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
      createExecuteJob: (state, action) => state,
      runExecuteJob: (state, action) => state,
      deleteTemplate: (state, action) => state,
      createTemplate: (state, action) => state,
      saveAsTemplate: (state, action) => state,
      saveTemplate: (state, action) => state,
      addModal: (state, action) =>
      {
        return state.set('modalRequests',
          MultiModal.addRequest(state.modalRequests, action.payload.props));
      },
      setModalRequests: (state, action) =>
      {
        return state.set('modalRequests', action.payload.requests);
      },
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
      setRunningTemplate: (state, action) =>
      {
        return state.update('runningTemplates',
          (templates) => templates.set(action.payload.templateId, action.payload.template));
      },
      clearRunningTemplate: (state, action) =>
      {
        return state.update('runningTemplates',
          (templates) => templates.delete(action.payload.templateId));
      },
      setAcknowledgedRun: (state, action) =>
      {
        return state.update('acknowledgedRuns',
          (runs) => runs.set(action.payload.templateId, action.payload.value));
      },
      // overriden reducers
      getIntegrations: (state, action) => state,
      getIntegration: (state, action) => state,
      updateIntegration: (state, action) => state,
      createIntegration: (state, action) => state,
      deleteIntegration: (state, action) => state,
      getIntegrationsSuccess: (state, action) =>
      {
        const integrations: Map<ID, IntegrationConfig> = Util.arrayToImmutableMap(
          action.payload.integrations,
          'id',
          _IntegrationConfig,
        );

        return state.set('integrations', integrations);
      },
      deleteIntegrationSuccess: (state, action) =>
      {
        return state.deleteIn(['integrations', action.payload.integrationId]);
      },
      getIntegrationSuccess: (state, action) =>
      {
        const integration = _IntegrationConfig(action.payload.integration);
        return state.setIn(['integrations', integration.id], integration);
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
        if (onLoad !== undefined)
        {
          onLoad(response);
        }
      }
    };
  }

  public getFileTypeExtension(fileType: any): string
  {
    switch (fileType)
    {
      case FileTypes.Json:
        return '.json';
      case FileTypes.Csv:
        return '.csv';
      case FileTypes.Xml:
        return '.xml';
      default:
        return '.txt';
    }
  }

  public getFileTypeMIMEType(fileType: any): string
  {
    switch (fileType)
    {
      case FileTypes.Json:
        return 'application/json';
      case FileTypes.Csv:
        return 'text/csv';
      case FileTypes.Xml:
        return 'text/xml';
      default:
        return 'text';
    }
  }

  public executeTemplate(action: ETLActionType<'executeTemplate'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;

    const template = action.template;
    const defaultSink = template.getDefaultSink();

    if (defaultSink === undefined)
    {
      // tslint:disable-next-line
      console.error('default sink not defined');
      return; // todo error
    }
    else
    {
      const options: ExecuteConfig = {};
      if (defaultSink.type === Sinks.Download)
      {
        const extension = this.getFileTypeExtension(defaultSink.fileConfig.fileType);
        const mimeType = this.getFileTypeMIMEType(defaultSink.fileConfig.fileType);
        const downloadFilename = `Export_${template.id}${extension}`;
        options.download = {
          downloadFilename,
          mimeType,
        };
      }
      template.getSources().forEach((source, key) =>
      {
        if (source.type === Sources.Upload)
        {
          _.set(options, ['files', key], (source.options as SourceOptionsType<Sources.Upload>).file);
        }
      });

      const onLoad = () =>
      {
        if (action.onSuccess !== undefined)
        {
          action.onSuccess();
        }
      };

      ETLAjax.executeTemplate(template, options)
        .then(this.onLoadFactory<any>([onLoad], directDispatch, name))
        .catch(this.onErrorFactory(action.onError, directDispatch, name));
    }
  }

  public createExecuteJob(action: ETLActionType<'createExecuteJob'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;

    directDispatch({
      actionType: 'setLoading',
      isLoading: true,
      key: name,
    });

    ETLAjax.createExecuteJob()
      .then(this.onLoadFactory([action.onLoad], directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
  }

  public runExecuteJob(action: ETLActionType<'runExecuteJob'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;

    directDispatch({
      actionType: 'setLoading',
      isLoading: true,
      key: name,
    });

    ETLAjax.runExecuteJob(action.jobId, action.template, action.files, action.downloadName, action.mimeType)
      .then(this.onLoadFactory([action.onLoad], directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
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
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
  }

  public handleResponseFactory(directDispatch)
  {
    return (templates: List<ETLTemplate>) =>
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
  }

  public beforeSaveOrCreate(name, directDispatch)
  {
    directDispatch({
      actionType: 'setLoading',
      isLoading: true,
      key: name,
    });
  }

  public deleteTemplate(action: ETLActionType<'deleteTemplate'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;
    this.beforeSaveOrCreate(name, directDispatch);

    const onLoad = () =>
    {
      this.fetchTemplates({ actionType: 'fetchTemplates' }, dispatch);
    };

    ETLAjax.deleteTemplate(action.template)
      .then(this.onLoadFactory([onLoad, action.onLoad], directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
  }

  public createTemplate(action: ETLActionType<'createTemplate'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;
    const updateTemplate = this.handleResponseFactory(directDispatch);
    this.beforeSaveOrCreate(name, directDispatch);

    ETLAjax.createTemplate(action.template)
      .then(this.onLoadFactory([updateTemplate, action.onLoad], directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
  }

  public saveAsTemplate(action: ETLActionType<'saveAsTemplate'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;
    const updateTemplate = this.handleResponseFactory(directDispatch);
    this.beforeSaveOrCreate(name, directDispatch);

    const newTemplate = action.template.set('id', -1);
    ETLAjax.createTemplate(newTemplate)
      .then(this.onLoadFactory([updateTemplate, action.onLoad], directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
  }

  public saveTemplate(action: ETLActionType<'saveTemplate'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;
    const updateTemplate = this.handleResponseFactory(directDispatch);
    this.beforeSaveOrCreate(name, directDispatch);

    ETLAjax.saveTemplate(action.template)
      .then(this.onLoadFactory([updateTemplate, action.onLoad], directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
  }

  public getIntegrations(action: ETLActionType<'getIntegrations'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;
    this.beforeSaveOrCreate(name, directDispatch);
    const onLoad = (response) =>
    {
      directDispatch({
        actionType: 'getIntegrationsSuccess',
        integrations: response,
      });
    };
    ETLAjax.getIntegrations(action.simple)
      .then(this.onLoadFactory([onLoad], directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
  }

  public getIntegration(action: ETLActionType<'getIntegration'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;
    this.beforeSaveOrCreate(name, directDispatch);
    const onLoad = (response) =>
    {
      directDispatch({
        actionType: 'getIntegrationSuccess',
        integration: response[0],
      });
    };
    ETLAjax.getIntegration(action.integrationId, action.simple)
      .then(this.onLoadFactory([onLoad], directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
  }

  public updateIntegration(action: ETLActionType<'updateIntegration'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const { integrationId, integration, actionType: name } = action;
    this.beforeSaveOrCreate(name, directDispatch);
    const onLoad = (response) =>
    {
      this.getIntegration(
        {
          actionType: 'getIntegration',
          integrationId: response.id,
        },
        dispatch,
      );
    };
    return ETLAjax.updateIntegration(integrationId, integration.toJS())
      .then(this.onLoadFactory([onLoad], directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
  }

  public createIntegration(action: ETLActionType<'createIntegration'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;
    this.beforeSaveOrCreate(name, directDispatch);
    const onLoad = (response) =>
    {
      this.getIntegration(
        {
          actionType: 'getIntegration',
          integrationId: response.id,
        },
        dispatch,
      );
    };
    return ETLAjax.createIntegration(action.integration.toJS())
      .then(this.onLoadFactory([onLoad, action.onLoad], directDispatch, name))
      .catch(this.onErrorFactory(action.onError, directDispatch, name));
  }

  public deleteIntegration(action: ETLActionType<'deleteIntegration'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const name = action.actionType;
    this.beforeSaveOrCreate(name, directDispatch);
    const onLoad = (response) =>
    {
      directDispatch({
        actionType: 'deleteIntegrationSuccess',
        integrationId: response[0].id,
      });
    };
    return ETLAjax.deleteIntegration(action.integrationId)
      .then(this.onLoadFactory([onLoad], directDispatch, name))
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
      case 'createExecuteJob':
        return this.createExecuteJob.bind(this, action);
      case 'runExecuteJob':
        return this.runExecuteJob.bind(this, action);
      case 'deleteTemplate':
        return this.deleteTemplate.bind(this, action);
      case 'createTemplate':
        return this.createTemplate.bind(this, action);
      case 'saveAsTemplate':
        return this.saveAsTemplate.bind(this, action);
      case 'saveTemplate':
        return this.saveTemplate.bind(this, action);
      case 'getIntegrations':
        return this.getIntegrations.bind(this, action);
      case 'getIntegration':
        return this.getIntegration.bind(this, action);
      case 'updateIntegration':
        return this.updateIntegration.bind(this, action);
      case 'createIntegration':
        return this.createIntegration.bind(this, action);
      case 'deleteIntegration':
        return this.deleteIntegration.bind(this, action);
      default:
        return undefined;
    }
  }
}

const ReduxInstance = new ETLRedux();
export const ETLActions = ReduxInstance._actionsForExport();
export const ETLReducers = ReduxInstance._reducersForExport(_ETLState);
export const ETLActionTypes = ReduxInstance._actionTypesForExport();
export declare type ETLActionType<K extends keyof ETLActionTypes> =
  GetType<K, ETLActionTypes>;
