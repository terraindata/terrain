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

import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import Modal from 'common/components/Modal';

import TemplateList from 'etl/templates/components/TemplateList';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { ColumnOptions, columnOptions, TemplateEditorState } from 'etl/templates/TemplateEditorTypes';
import { ETLTemplate } from 'etl/templates/TemplateTypes';

export interface Props
{
  onSave: (template: ETLTemplate, isSaveAs: boolean) => void;
  onSwitchTemplate: (template: ETLTemplate) => void;
  onExecuteTemplate: (template: ETLTemplate) => void;
  // below from container
  templateEditor?: TemplateEditorState;
  editorAct?: typeof TemplateEditorActions;
}

@Radium
class EditorActionsSection extends TerrainComponent<Props>
{
  public state: {
    newTemplateName: string,
    saveTemplateModalOpen: boolean,
    loadTemplateOpen: boolean,
    isSaveAs: boolean,
  } = {
      newTemplateName: 'New Template',
      saveTemplateModalOpen: false,
      loadTemplateOpen: false,
      isSaveAs: false,
    };

  public renderRootLevelModals(): any[]
  {
    const modals = [];
    if (this.state.loadTemplateOpen)
    {
      modals.push(
        <Modal
          key='loadTemplate'
          title={'Load a Template'}
          open={this.state.loadTemplateOpen}
          onClose={this.closeTemplateUI}
          wide={true}
        >
          <div className='template-list-wrapper' style={backgroundColor(Colors().bg3)}>
            <TemplateList
              onClick={this.handleLoadTemplateItemClicked}
              getRowStyle={this.getTemplateItemStyle}
            />
          </div>
        </Modal>,
      );
    }
    else if (this.state.saveTemplateModalOpen)
    {
      modals.push(
        <Modal
          key='saveNew'
          title='Save Template'
          open={this.state.saveTemplateModalOpen}
          showTextbox={true}
          onConfirm={this.handleSaveConfirm}
          onClose={this.handleCloseSave}
          confirmDisabled={this.state.newTemplateName === ''}
          textboxValue={this.state.newTemplateName}
          onTextboxValueChange={this.handleNewTemplateNameChange}
          textboxPlaceholderValue='Template Name'
          closeOnConfirm={true}
          confirm={true}
        />,
      );
    }
    return modals;
  }

  public render()
  {
    const { history, template, isDirty } = this.props.templateEditor;
    let titleName = (template !== null && template.id === -1) ?
      'Unsaved Template' :
      template.templateName;
    if (isDirty)
    {
      titleName += '*';
    }
    return (
      <div className='template-editor-top-bar'>
        {... this.renderRootLevelModals()}
        <div className='top-bar-left-side'>
          <div
            className='editor-top-bar-item'
            style={topBarRunStyle}
            onClick={this.handleRun}
            key='run'
          >
            Run
          </div>
        </div>
        <div
          className='editor-top-bar-name'
          style={topBarNameStyle}
          key='title'
        >
          {titleName}
        </div>
        <div
          className='editor-top-bar-item'
          style={history.canUndo() ? topBarItemStyle : topBarItemDisabledStyle}
          onClick={this.handleUndo}
          key='undo'
        >
          Undo
        </div>
        <div
          className='editor-top-bar-item'
          style={history.canRedo() ? topBarItemStyle : topBarItemDisabledStyle}
          onClick={this.handleRedo}
          key='redo'
        >
          Redo
        </div>
        <div
          className='editor-top-bar-item'
          style={topBarItemStyle}
          onClick={this.openTemplateUI}
          key='load'
        >
          Load
        </div>
        <div
          className='editor-top-bar-item'
          style={topBarItemStyle}
          onClick={this.handleSaveClicked}
          key='save'
        >
          Save
        </div>
        <div
          className='editor-top-bar-item'
          style={topBarItemStyle}
          onClick={this.handleSaveAsClicked}
          key='save as'
        >
          Save As
        </div>
      </div>
    );
  }

  public getTemplateItemStyle(templateInList: ETLTemplate)
  {
    const { template } = this.props.templateEditor;
    return (template !== null && template.id === templateInList.id) ? templateListItemCurrentStyle : templateListItemStyle;
  }

  public handleLoadTemplateItemClicked(template: ETLTemplate)
  {
    const currentTemplate = this.props.templateEditor.template;
    if (template.id !== currentTemplate.id)
    {
      this.props.onSwitchTemplate(template);
      this.closeTemplateUI();
    }
  }

  public openTemplateUI()
  {
    this.setState({
      loadTemplateOpen: true,
    });
  }

  public closeTemplateUI()
  {
    this.setState({
      loadTemplateOpen: false,
    });
  }

  public handleSaveConfirm()
  {
    const { template } = this.props.templateEditor;
    this.props.onSave(template.set('templateName', this.state.newTemplateName), this.state.isSaveAs);
  }

  public handleCloseSave()
  {
    this.setState({
      newTemplateName: 'New Template',
      saveTemplateModalOpen: false,
    });
  }

  public handleNewTemplateNameChange(newValue: string)
  {
    this.setState({
      newTemplateName: newValue,
    });
  }

  public handleRun()
  {
    const { editorAct, templateEditor } = this.props;
    const template = templateEditor.template;
    if (templateEditor.isDirty || template.id === -1)
    {
      editorAct({
        actionType: 'addModal',
        props: {
          title: 'Please Save',
          message: `You Have Unsaved Changes. Please Save Them Before Running This Template`,
        },
      });
    }
    else
    {
      this.props.onExecuteTemplate(template);
    }
  }

  public handleSaveClicked()
  {
    const { template } = this.props.templateEditor;
    if (template.id === -1)
    {
      this.setState({
        saveTemplateModalOpen: true,
        isSaveAs: false,
      });
    }
    else
    {
      this.props.onSave(template, false);
    }
  }

  public handleSaveAsClicked()
  {
    const { template } = this.props.templateEditor;
    this.setState({
      saveTemplateModalOpen: true,
      isSaveAs: true,
    });
  }

  public handleUndo()
  {
    const { editorAct, templateEditor } = this.props;
    if (templateEditor.history.canUndo())
    {
      editorAct({
        actionType: 'undoHistory',
      });
    }
  }

  public handleRedo()
  {
    const { editorAct, templateEditor } = this.props;
    if (templateEditor.history.canRedo())
    {
      editorAct({
        actionType: 'redoHistory',
      });
    }
  }
}

const topBarItemStyle = [backgroundColor(Colors().fadedOutBg, Colors().darkerHighlight)];
const topBarItemDisabledStyle = [
  backgroundColor(Colors().fadedOutBg, Colors().fadedOutBg),
  fontColor(Colors().text3),
];
const topBarRunStyle = [backgroundColor(Colors().active, Colors().activeHover), fontColor(Colors().activeText)];
const topBarNameStyle = [fontColor(Colors().text2)];
const templateListItemStyle = [
  { cursor: 'pointer' },
  backgroundColor('rgba(0,0,0,0)', Colors().activeHover),
];
const templateListItemCurrentStyle = [
  { cursor: 'default' },
  backgroundColor(Colors().active),
  fontColor(Colors().activeText),
];

export default Util.createContainer(
  EditorActionsSection,
  ['templateEditor'],
  {
    editorAct: TemplateEditorActions,
  },
);
