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
// tslint:disable:no-var-requires

import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as Radium from 'radium';
import * as React from 'react';
import { withRouter } from 'react-router';

import { Algorithm, LibraryState } from 'library/LibraryTypes';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { _FileConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import { ETLActions } from 'etl/ETLRedux';
import ETLRouteUtil from 'etl/ETLRouteUtil';
import TemplateEditor from 'etl/templates/components/TemplateEditor';
import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { createInitialTemplate } from 'etl/templates/SyncUtil';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { _ETLTemplate, ETLTemplate, TemplateEditorState } from 'etl/templates/TemplateTypes';
import { WalkthroughState } from 'etl/walkthrough/ETLWalkthroughTypes';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

const { List } = Immutable;
import './ETLEditorPage.less';

export interface Props
{
  // injected
  location?: any;
  params?: {
    algorithmId?: number,
    templateId?: number;
  };
  algorithms?: IMMap<ID, Algorithm>;
  walkthrough?: WalkthroughState;
  templates?: List<ETLTemplate>;
  editorAct?: typeof TemplateEditorActions;
  etlAct?: typeof ETLActions;
}

function getAlgorithmId(params): number
{
  const asNumber = (params != null && params.algorithmId != null) ? Number(params.algorithmId) : NaN;
  return Number.isNaN(asNumber) ? -1 : asNumber;
}

function getTemplateId(params): number
{
  const asNumber = (params != null && params.templateId != null) ? Number(params.templateId) : NaN;
  return Number.isNaN(asNumber) ? -1 : asNumber;
}

function createInitialTemplateFn(
  editorAct: typeof TemplateEditorActions,
  source?: SourceConfig,
  sink?: SinkConfig,
): (hits: List<object>) => void
{
  return (hits) =>
  {
    const { template, fieldMap } = createInitialTemplate(hits, source, sink);
    editorAct({
      actionType: 'setTemplate',
      template,
    });
    editorAct({
      actionType: 'setFieldMap',
      fieldMap,
    });
  };
}

// Some of this logic could be put in redux using some neat features of Thunk (particularly getState)
@Radium
class ETLEditorPage extends TerrainComponent<Props>
{
  public saveTemplate(template: ETLTemplate)
  {
    const { etlAct, editorAct } = this.props;

    const handleLoad = (savedTemplates: List<ETLTemplate>) =>
    {
      if (savedTemplates.size > 0)
      {
        const savedTemplate = savedTemplates.get(0);
        editorAct({
          actionType: 'setTemplate',
          template: savedTemplate,
        });
        editorAct({
          actionType: 'rebuildFieldMap',
        });
        editorAct({ // todo need to lock the ui during a save
          actionType: 'setIsDirty',
          isDirty: false,
        });
        if (savedTemplate.id !== template.id) // check if its a save
        {
          ETLRouteUtil.gotoEditTemplate(savedTemplate.id);
        }
      }
      else
      {
        // todo handle error
      }
    };
    const handleError = (ev) =>
    {
      // TODO
    };

    if (template.id === -1) // then its a new template
    {
      etlAct({
        actionType: 'createTemplate',
        template,
        onLoad: handleLoad,
        onError: handleError,
      });
    }
    else
    {
      etlAct({
        actionType: 'saveTemplate',
        template,
        onLoad: handleLoad,
        onError: handleError,
      });
    }
  }

  // create a new template from the results of an algorithm
  public initFromAlgorithm()
  {
    const { algorithms, params, editorAct } = this.props;
    const algorithmId = getAlgorithmId(params);
    const source = _SourceConfig({
      type: Sources.Algorithm,
      fileConfig: _FileConfig({
        fileType: FileTypes.Json,
      }),
      options: {
        algorithmId,
      },
    });
    const onFetched = createInitialTemplateFn(editorAct, source);

    editorAct({
      actionType: 'fetchDocuments',
      source,
      algorithms,
      onFetched,
    });
  }

  // create a new template from thewalkthrough process
  public initFromWalkthrough()
  {
    const { editorAct, walkthrough } = this.props;
    const source = walkthrough.source;
    const sink = walkthrough.sink;
    const onFetched = createInitialTemplateFn(editorAct, source, sink);

    if (source.type === Sources.Upload)
    {
      editorAct({
        actionType: 'fetchDocuments',
        source,
        file: walkthrough.file,
        onFetched,
      });
    }
    else
    {
      // TODO other types
    }
  }

  // is there a way to cleanly put this in redux?
  public loadExistingTemplate(templateId: number)
  {
    const onLoad = (response: List<ETLTemplate>) =>
    {
      const { editorAct, templates, algorithms } = this.props;
      const index = templates.findIndex((template) => template.id === templateId);
      // TODO what happens if algorithms haven't loaded in yet?
      if (index === -1)
      {
        // TODO error
      }
      else
      {
        const template = templates.get(index);
        const onFetched = () =>
        {
          // do nothing
        };
        editorAct({
          actionType: 'setTemplate',
          template,
        });
        editorAct({
          actionType: 'rebuildFieldMap',
        });
        editorAct({
          actionType: 'fetchDocuments',
          source: template.sources.get('primary'),
          algorithms,
          onFetched,
        });
      }
    };
    const onError = (response) =>
    {
      // TODO
    };
    const { etlAct } = this.props;
    etlAct({
      actionType: 'fetchTemplates',
      onLoad,
      onError,
    });
  }

  // is there a better pattern for this?
  public componentWillReceiveProps(nextProps)
  {
    const { params } = this.props;
    const { nextParams } = nextProps;
    if (params == null || nextParams == null)
    {
      return;
    }
    if (
      ETLRouteUtil.isRouteNewTemplate(this.props.location) &&
      getTemplateId(nextParams) !== -1
    )
    {
      // then we went from new template to saved template
    }
    else if (
      getAlgorithmId(params) !== -1 &&
      getTemplateId(nextParams) !== -1
    )
    {
      // then we went from an algorithm export to saved template
    }
    else if (params.algorithmId !== nextParams.algorithmId)
    {
      this.initFromRoute();
    }
    else if (params.templateId !== nextParams.templateId)
    {
      this.initFromRoute();
    }
    else if (ETLRouteUtil.isRouteNewTemplate(this.props.location) !==
      ETLRouteUtil.isRouteNewTemplate(nextProps.location))
    {
      this.initFromRoute();
    }
  }

  public initFromRoute()
  {
    const { params, editorAct } = this.props;
    editorAct({
      actionType: 'resetState',
    });
    if (params.algorithmId !== undefined)
    {
      this.initFromAlgorithm();
    }
    else if (params.templateId !== undefined)
    {
      const templateId = getTemplateId(params);
      this.loadExistingTemplate(templateId);
    }
    else if (ETLRouteUtil.isRouteNewTemplate(this.props.location) &&
      this.props.walkthrough.source.type != null)
    {
      this.initFromWalkthrough();
    }
    else
    {
      ETLRouteUtil.gotoWalkthroughStep(0);
    }
  }

  public componentWillMount()
  {
    this.props.editorAct({
      actionType: 'resetState',
    });
    this.initFromRoute();
  }

  public render()
  {
    return (
      <div
        className='template-display-wrapper'
        style={[fontColor(Colors().text1)]}
      >
        <div className='export-display-logo-bg' />
        <TemplateEditor onSave={this.saveTemplate} />
      </div>
    );
  }
}

export default withRouter(Util.createContainer(
  ETLEditorPage,
  [
    ['library', 'algorithms'],
    ['walkthrough'],
    ['etl', 'templates'],
  ],
  { editorAct: TemplateEditorActions, etlAct: ETLActions },
));
