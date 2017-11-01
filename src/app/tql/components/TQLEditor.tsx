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

import * as React from 'react';

import * as _ from 'lodash';

const CodeMirror = require('./Codemirror.js');
import './TQLEditor.less';

import { Colors } from '../../colors/Colors';
import ColorsActions from '../../colors/data/ColorsActions';
import TerrainComponent from './../../common/components/TerrainComponent';

// syntax highlighters
import ElasticHighlighter from '../highlighters/ElasticHighlighter';

// Formatting and Parsing
import ESConverter from '../../../../shared/database/elastic/formatter/ESConverter';
import ESJSONParser from '../../../../shared/database/elastic/parser/ESJSONParser';

import { Doc, Editor } from 'codemirror';
import * as CodeMirrorLib from 'codemirror';

import './ElasticMode';
import './TQLMode.js';

// Style sheets and addons for CodeMirror
import 'codemirror/addon/display/placeholder.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/lint/lint.css';
import 'codemirror/addon/lint/lint.js';
import 'codemirror/addon/mode/overlay.js';
import 'codemirror/mode/javascript/javascript.js';

import './codemirror.less';
import './themes/cobalt.less';
import './themes/monokai.less';
import './themes/neo.less';

import 'codemirror/addon/dialog/dialog.js';
import 'codemirror/addon/scroll/annotatescrollbar.js';
import 'codemirror/addon/search/jump-to-line.js';
import 'codemirror/addon/search/matchesonscrollbar.css';
import 'codemirror/addon/search/matchesonscrollbar.js';
import 'codemirror/addon/search/search.js';
import 'codemirror/addon/search/searchcursor.js';
import './dialog.less';

export interface Props
{
  tql: string;
  language?: string;
  canEdit: boolean;

  highlightedLine?: number;

  isDiff?: boolean;
  diffTql?: string;

  placeholder?: string;

  onChange?(tql: string, noAction?: boolean, manualRequest?: boolean);

  toggleSyntaxPopup?(event, line);

  defineTerm?(value, event);

  turnSyntaxPopupOff?();

  hideTermDefinition?();
}

export interface MarkerAnnotation
{
  showing: boolean;
  msg: string;
}

class TQLEditor extends TerrainComponent<Props>
{
  public state: {
    codeMirrorInstance: Doc,
  } = {
    codeMirrorInstance: undefined,
  };

  constructor(props: Props)
  {
    super(props);
    // this.executeChange = _.debounce(this.executeChange, 300);
  }

  public componentWillMount()
  {
    ColorsActions.setStyle('span.cm-atom', { color: Colors().builder.cards.booleanClause + '!important' });
    ColorsActions.setStyle('span.cm-property ', { color: Colors().builder.cards.structureClause + '!important' });
    ColorsActions.setStyle('span.cm-attribute', { color: '#f00' /* what is an attribute? */ + '!important' });
    ColorsActions.setStyle('span.cm-keyword', { color: Colors().builder.cards.mapClause + '!important' });
    ColorsActions.setStyle('span.cm-builtin', { color: Colors().builder.cards.baseClause + '!important' });
    ColorsActions.setStyle('span.cm-string', { color: Colors().builder.cards.stringClause + '!important' });
    ColorsActions.setStyle('span.cm-variable', { color: Colors().builder.cards.fieldClause + '!important' });
    ColorsActions.setStyle('span.cm-variable-2', { color: Colors().builder.cards.inputParameter + '!important' });
    ColorsActions.setStyle('span.cm-variable-3', { color: Colors().builder.cards.fieldClause + '!important' });
    ColorsActions.setStyle('span.es-null', { color: Colors().builder.cards.nullClause + '!important' });
    ColorsActions.setStyle('span.es-number', { color: Colors().builder.cards.numberClause + '!important' });
    ColorsActions.setStyle('span.es-boolean', { color: Colors().builder.cards.booleanClause + '!important' });
    ColorsActions.setStyle('span.es-parameter', { color: Colors().builder.cards.inputParameter + '!important' });
    ColorsActions.setStyle('span.es-strin', { color: Colors().builder.cards.stringClause + '!important' });
    ColorsActions.setStyle('.CodeMirror-scroll', { background: Colors().bg3 + '!important' });
    ColorsActions.setStyle('.CodeMirror-gutters', { background: Colors().bg3 + '!important' });
  }

  public componentWillUnmount()
  {
    this.executeChange.flush();
  }

  public render()
  {
    const options =
      {
        readOnly: !this.props.canEdit,
        lineNumbers: true,
        extraKeys: {
          'Shift-Tab': 'indentLess',
          'Tab': 'indentMore',
          'Ctrl-F': 'findPersistent',
          'Ctrl-Alt-F': this.handleAutoFormatRequest,
          'Ctrl-Enter': this.issueQuery,
        },
        lineWrapping: true,
        theme: Colors().tqlEditor,
        matchBrackets: true,
        autoCloseBrackets: true,
        foldGutter: true,
        lint: false,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers'],
        revertButtons: false,
        connect: 'align',
        tabSize: ESConverter.defaultIndentSize,
        origLeft: this.props.diffTql,
      };
    if (this.props.language === 'elastic')
    {
      options['mode'] = 'elastic';
    }
    else if (this.props.language === 'mysql')
    {
      options['mode'] = 'tql';
    }
    else
    {
      options['mode'] = '';
    }

    let CM: any;

    if (this.props.isDiff)
    {
      options['value'] = this.props.tql || '';
      CM = (
        <CodeMirror
          ref='cm2'
          className='codemirror-text'
          options={options}

          isDiff={true}
          diff={this.props.diffTql}
        />
      );
    }
    CM = (
      <CodeMirror
        ref='cm'
        className='codemirror-text'
        value={this.props.tql || ''}
        options={options}

        highlightedLine={this.props.highlightedLine}
        onFocusChange={this.handleFocusChange}
        toggleSyntaxPopup={this.props.toggleSyntaxPopup}
        defineTerm={this.props.defineTerm}
        turnSyntaxPopupOff={this.props.turnSyntaxPopupOff}
        hideTermDefinition={this.props.hideTermDefinition}
        onCodeMirrorMount={this.registerCodeMirror}
        placeholder={(this.props.placeholder !== '' && this.props.placeholder !== undefined) ?
          this.props.placeholder : 'Write your query here'}
      />
    );
    return (
      <div>
        {
          CM
        }
      </div>
    );
  }

  /*
   *  Returns the formatted query, or null if the query has errors.
   */
  public autoFormatQuery(input: string): string | null
  {
    if (this.props.language === 'elastic')
    {
      const parser: ESJSONParser = new ESJSONParser(input);
      if (!parser.hasError())
      {
        const newText: string = ESConverter.formatES(parser);
        return newText;
      }
    }
    return null;
  }

  private issueQuery(cmInstance): void
  {
    if (this.props.onChange)
    {
      this.props.onChange(cmInstance.getValue(), false, true);
    }
  }

  private handleAutoFormatRequest(cmInstance): void
  {
    if (this.props.language === 'elastic')
    {
      const formatted = this.autoFormatQuery(cmInstance.getDoc().getValue());
      if (formatted)
      {
        const cursor = cmInstance.getCursor();
        this.state.codeMirrorInstance.setValue(formatted);
        this.executeChange();
        cmInstance.setCursor(cursor);
      }
    }
  }

  private executeChange: any = () =>
  {
    this.props.onChange(this.state.codeMirrorInstance.getValue());
  }

  private handleHighlighting(cmInstance, change)
  {
    if (this.props.language === 'elastic')
    {
      ElasticHighlighter.highlightES(cmInstance);
    }
  }

  private handleTQLChange(cmInstance, changes)
  {
    this.executeChange();
  }

  private handleFocusChange(focused: boolean)
  {
    if (!focused)
    {
      this.executeChange.flush();
    }
  }

  private hidePopupClickHandler(e: MouseEvent, tooltip: HTMLElement, ann: MarkerAnnotation)
  {
    const target = e.target || e.srcElement;
    CodeMirrorLib.off(target, 'mousedown', this.hidePopupClickHandler);
    if (tooltip)
    {
      CodeMirrorLib.off(tooltip, 'mousedown', this.hidePopupClickHandler);
      if (tooltip.parentNode)
      {
        tooltip.parentNode.removeChild(tooltip);
      }
      tooltip = null;
      ann.showing = false;
    }
  }

  private popupTooltips(ann: MarkerAnnotation, e: MouseEvent)
  {
    const target = e.target || e.srcElement;
    const tooltipDoc = document.createDocumentFragment();
    const tip = document.createElement('div');
    tip.className = 'CodeMirror-lint-message-error';
    tip.appendChild(document.createTextNode(ann.msg));
    tooltipDoc.appendChild(tip);
    const tooltip = this.showTooltip(e, tooltipDoc);
    // clicking either the tooltip or the token closes the tooltip
    CodeMirrorLib.on(tooltip, 'mousedown', (hideEvent: MouseEvent) =>
    {
      this.hidePopupClickHandler(hideEvent, tooltip, ann);
    });
    CodeMirrorLib.on(target, 'mousedown', (hideEvent: MouseEvent) =>
    {
      this.hidePopupClickHandler(hideEvent, tooltip, ann);
    });
  }

  private showTooltip(e: MouseEvent, content: DocumentFragment): HTMLElement
  {
    const tt = document.createElement('div');
    tt.className = 'CodeMirror-lint-tooltip';
    tt.appendChild(content.cloneNode(true));
    document.body.appendChild(tt);
    tt.style.top = Math.max(0, e.clientY - tt.offsetHeight - 5).toString() + 'px';
    tt.style.left = (e.clientX + 5).toString() + 'px';

    if (tt.style.opacity != null)
    {
      tt.style.opacity = '1';
    }

    return tt;
  }

  private handleMouseOver(cm: any, e: MouseEvent)
  {
    const target: any = e.target || e.srcElement;
    // TODO: show helping messages for other tokens too.
    if (!/\bCodeMirror-lint-mark-error/.test(target.className))
    {
      return;
    }

    const box = target.getBoundingClientRect();
    const x = ((box.left as number) + (box.right as number)) / 2;
    const y = ((box.top as number) + (box.bottom as number)) / 2;
    const spans = cm.findMarksAt(cm.coordsChar({ left: x, top: y }, 'client'));

    let ann: MarkerAnnotation;
    for (let i = 0; i < spans.length; ++i)
    {
      const a = spans[i].__annotation;
      if (a)
      {
        ann = a;
        break;
      }
    }

    if (!ann)
    {
      return;
    }

    if (ann.showing === false)
    {
      ann.showing = true;
      this.popupTooltips(ann, e);
    }
  }

  private registerCodeMirror(cmInstance)
  {
    this.setState(
      {
        codeMirrorInstance: cmInstance,
      });

    /*
     * change event (https://codemirror.net/doc/manual.html#events) is fired before CodeMirror updates the DOM.
     * Because highlightES changes how codemirror renders the content, we have to call it in the change callback.
     */
    cmInstance.on('change', this.handleHighlighting);

    /*
     * changes event is fired after CodeMirror updates the DOM.
     * Because handleTQLChange may change the react state and the change could be expensive, we call this after
     * CodeMirror updates the DOM.
     */
    cmInstance.on('changes', this.handleTQLChange);

    CodeMirrorLib.on(cmInstance.getWrapperElement(), 'mouseover', (e: MouseEvent) =>
    {
      this.handleMouseOver(cmInstance, e);
    });

    if (this.props.language === 'elastic') // make this a switch if there are more languages
    {
      ElasticHighlighter.highlightES(cmInstance);
    }
  }

}

export default TQLEditor;
