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

// Libraries
import * as React from 'react';
import * as ReactDOM from "react-dom";
import * as _ from "underscore";
import * as $ from 'jquery';
import * as classNames from 'classnames';
import { DragDropContext } from 'react-dnd';
import * as Immutable from 'immutable';
var HTML5Backend = require('react-dnd-html5-backend');

// Data
import Store from "./../data/BuilderStore.tsx";
import { BuilderState } from "./../data/BuilderStore.tsx";
import Actions from "./../data/BuilderActions.tsx";
import Util from "./../../util/Util.tsx";
import UserActions from '../../users/data/UserActions.tsx';
import RolesActions from '../../roles/data/RolesActions.tsx';
import BrowserTypes from '../../browser/BrowserTypes.tsx';
import Types from '../BuilderTypes.tsx';
type IQuery = Types.IQuery;

// Components
import PureClasss from './../../common/components/PureClasss.tsx';
import BuilderColumn from "./BuilderColumn.tsx";
import Tabs from "./layout/Tabs.tsx";
import LayoutManager from "./layout/LayoutManager.tsx";
import Card from "./cards/Card.tsx";
import Result from "./results/Result.tsx";
import Ajax from "./../../util/Ajax.tsx";
import InfoArea from '../../common/components/InfoArea.tsx';
import {notificationManager} from './../../common/components/InAppNotification.tsx'

var NewIcon = require("./../../../images/icon_new_21x17.svg?name=NewIcon");
var OpenIcon = require("./../../../images/icon_open_11x10.svg?name=OpenIcon");
var DuplicateIcon = require("./../../../images/icon_duplicate_11x12.svg?name=DuplicateIcon");
var SaveIcon = require("./../../../images/icon_save_10x10.svg?name=SaveIcon");

let { Map, List } = Immutable;

interface Props
{
  params?: any;
  history?: any;
  location?: any;
}

class Builder extends PureClasss<Props>
{
  state: {
    builder: BuilderState,
    colKeys: List<number>;
    noColumnAnimation: boolean;
    columnType: number;
    selectedCardName: string;
    manualIndex: number;
    
    curDb: string;
  } = {
    builder: Store.getState(),
    colKeys: null,
    noColumnAnimation: false,
    columnType: null,
    selectedCardName: '',
    manualIndex: -1,
    curDb: '',
  };
  
  constructor(props:Props)
  {
    super(props);
    
    this._subscribe(Store, {
      stateKey: 'builder',
    });
    
    if(localStorage.getItem('colKeys'))
    {
      var colKeys = List(JSON.parse(localStorage.getItem('colKeys'))) as List<number>;
    }
    else
    {
      var colKeys = List([Math.random(), Math.random()]);
      localStorage.setItem('colKeys', JSON.stringify(colKeys.toJS()));
    }
    
    if(localStorage.getItem('selectedCardName'))
    {
      this.state.selectedCardName = localStorage.getItem('selectedCardName');
    }

    this.state.colKeys = colKeys;

    this.addManualColumn = _.debounce(this.addManualColumn, 1);
  }
  
  componentWillMount()
  {
    this.checkConfig(this.props);
    RolesActions.fetch();
    this.loadTables(this.props);
  }
  
  querySub: any;
  schemaXhr: XMLHttpRequest;
  loadTables(props:Props, query?:IQuery)
  {
    query = query || this.getSelectedQuery(props);
    
    if(!query)
    {
      var queryId = this.getSelectedId(props);
      
      if(this.querySub)
      {
        this.querySub();
      }
      
      // query hasn't loaded yet
      this.querySub = Store.subscribe(() => {
        let state:BuilderState = Store.getState();
        query = state.queries.get(queryId);
        
        if(query && this.querySub)
        {
          this.querySub();
          this.querySub = null;
          this.loadTables(null, query);
        }
      });
      return;
    }

    let {db} = query;
    if(db !== this.state.curDb)
    {
      this.schemaXhr && this.schemaXhr.abort();
      this.schemaXhr = Ajax.schema(db, (tables: {name: string, columns: {name: string}[]}[]) => {
        Actions.change(
          Immutable.List(['tables']),
          Immutable.List(tables.map(table => table.name))
        );
        Actions.change(
          Immutable.List(['tableColumns']),
          tables.reduce(
            (memo: Map<string, List<string>>, table: {name: string, columns: {name: string}[]}) =>
              memo.set(table.name, 
                Immutable.List(table.columns.map(col => col.name))
              )
            , Immutable.Map({})
          )
        );
      });
      
      this.setState({
        curDb: db,
      });
    }
  }
  
  componentWillReceiveProps(nextProps)
  {
    this.checkConfig(nextProps);
    this.loadTables(nextProps);
  }
  
  checkConfig(props:Props)
  {
    let storedConfig = localStorage.getItem('config') || '';
    let open = props.location.query.o;
    var newConfig = props.params.config;

    if(open)
    {
      if(!storedConfig || storedConfig === 'undefined' || storedConfig === '')
      {
        // no stored config, just load the open tab.
        newConfig = '!' + open;     
      }
      else
      {
        // append or update the open id to the stored config list
        var configArr = storedConfig.split(',').map(id => id.indexOf('!') === 0 ? id.substr(1) : id);
        var i = configArr.indexOf(open);
        if(i === -1)
        {
          i = configArr.length;
        }
        configArr[i] = '!' + open;
        
        newConfig = configArr.join(',');
      }
    }
    else if(!props.params.config || !props.params.config.length)
    {
      // no 'open' passed in and no config in the url params
      newConfig = storedConfig;
    }
    
    if(newConfig && newConfig.length && !newConfig.split(',').some(c => c.substr(0,1) === '!'))
    {
      newConfig = '!' + newConfig;
    }
    
    if(newConfig !== props.params.config)
    {
      props.history.replaceState({}, `/builder/${newConfig}`);
    }
    localStorage.setItem('config', newConfig || '');
    this.fetch(newConfig);
  }
  
  fetch(config:string)
  {
    if(!config)
    {
      return;
    }
    Actions.fetch(Immutable.List(
      config.split(',').map(id => id.indexOf('!') === 0 ? id.substr(1) : id)
    ));
  }
  
  getSelectedId(props?:Props)
  {
    props = props || this.props;
    var selected = props.params.config && props.params.config.split(',').find(id => id.indexOf('!') === 0);
    return selected && selected.substr(1);
  }
  
  getSelectedQuery(props?:Props): IQuery
  {
    return this.state.builder.queries.get(this.getSelectedId(props));
  }
  
  createAlgorithm()
  {
    // Actions.algorithm.create();
  }
  
  duplicateAlgorithm()
  {
    // Actions.algorithm.duplicate(this.state.algorithmId);
  }
  
  loadAlgorithm()
  {
    // Actions.algorithm.load(JSON.parse(prompt("Paste Algorithm state here")));
  }
  
  tabActions = Immutable.List([
  //   {
  //     text: 'Duplicate',
  //     icon: <DuplicateIcon />,
  //     onClick: this.duplicateAlgorithm,
  //   },
  //   {
  //     text: 'Open',
  //     icon: <OpenIcon />,
  //     onClick: this.loadAlgorithm,
  //   },
    {
      text: 'Save',
      icon: <SaveIcon />,
      onClick: this.onSave,
    },
  ]);
  
  onSave()
  {
    if (this.getSelectedQuery().version) 
    {
      if (!confirm('You are editing an old version of the Variant. Saving will replace the current contents of the Variant. Are you sure you want to save?')) 
      {
        return;
      }
    }
    this.save()
}
  onSaveSuccess()
  {
    notificationManager.addNotification(
      'Saved',
      this.getSelectedQuery().name,
      'info', 
      4
    );
  }

  onSaveError()
  {
    notificationManager.addNotification(
      'Error Saving',
      '"' + this.getSelectedQuery().name + '" failed to save.', 
      'error', 
      0
    );
  }

  save()
  {
    Ajax.saveItem(BrowserTypes.variantForSave(
        this.state.builder.queries.get(this.getSelectedId()) as BrowserTypes.Variant
      ),
      this.onSaveSuccess,
      this.onSaveError
    );
    
    var configArr = window.location.pathname.split('/')[2].split(',');
    var currentVariant;
    configArr = configArr.map(function(tab)
      {
        if(tab.substr(0,1) === '!')
        {
          currentVariant = tab.substr(1).split('@')[0];
          return '!' + currentVariant;
        }
        return tab;
      }
    );
    for(let i = 0; i < configArr.length; i++)
    {
      if(configArr[i] === currentVariant)
      {
        configArr.splice(i, 1);
      }
    }
    var newConfig = configArr.join(',');
    this.props.history.replaceState({}, `/builder/${newConfig}`);
  }
  
  getLayout()
  {
    return {
      fullHeight: true,
      initialColSizes: JSON.parse(localStorage.getItem('colSizes')),
      onColSizeChange: this.handleColSizeChange,
      columns:
        _.range(0, this.state.colKeys.size).map(index => 
          this.getColumn(index)
        )
    };
  }
  
  handleColSizeChange(adjustments)
  {
    localStorage.setItem('colSizes', JSON.stringify(adjustments));
  }
  
  getColumn(index)
  {
    let key = this.state.colKeys.get(index);
    let query = this.getSelectedQuery();
    return {
      minWidth: 316,
      resizeable: true,
      resizeHandleRef: 'resize-handle',
      content: query && <BuilderColumn
        colKey={key}
        query={query}
        index={index}
        onAddColumn={this.handleAddColumn}
        onAddManualColumn={this.handleAddManualColumn}
        onCloseColumn={this.handleCloseColumn}
        canAddColumn={this.state.colKeys.size < 3}
        canCloseColumn={this.state.colKeys.size > 1}
        history={this.props.history}
        onRevert={this.save}
        columnType={this.state.columnType}
        selectedCardName={this.state.selectedCardName}
        switchToManualCol={this.switchToManualCol}
        changeSelectedCardName={this.changeSelectedCardName}
      />,
      // hidden: this.state && this.state.closingIndex === index,
      key,
    }
  }

  switchToManualCol(index)
  {
    this.setState({
      manualIndex: index
    });
  }

  changeSelectedCardName(selectedCardName)
  {
    this.setState({
      selectedCardName
    });
    localStorage.setItem('selectedCardName', selectedCardName);
  }

  addManualColumn(index, selectedCardName?)
  {
    index = index + 1;
    var newKey = Math.random();
    let colKeys = this.state.colKeys.splice(index, 0, newKey);
    this.setState({
      colKeys,
      columnType: 4,
      selectedCardName,
      manualIndex: index
    }); 
    localStorage.setItem('colKeys', JSON.stringify(colKeys.toJS()));
    if(localStorage.getItem('colKeyTypes'))
    {
      var colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes'));
      colKeyTypes[newKey] = 4;
      localStorage.setItem('colKeyTypes', JSON.stringify(colKeyTypes));
    } 
  }

  handleAddManualColumn(index, selectedCardName?)
  {
    if(this.state.manualIndex !== -1) //Manual column already open
    {
      this.setState({
        selectedCardName
      });
    }
    else 
    {
      if(this.state.colKeys.size === 3)
      {
        var closeIndex = index < 2 ? 2 : 1;
        this.handleCloseColumn(closeIndex);
      }
        this.addManualColumn(index, selectedCardName);
    }
  }

  handleAddColumn(index)
  {
    index = index + 1;
    let colKeys = this.state.colKeys.splice(index, 0, Math.random());
    this.setState({
      colKeys,
    }); 
    localStorage.setItem('colKeys', JSON.stringify(colKeys.toJS()));
  }
  
  handleCloseColumn(index)
  {
    let oldKey = this.state.colKeys[index];
    let colKeys = this.state.colKeys.splice(index, 1);
    this.setState({
      colKeys: colKeys,
      manualIndex: (index === this.state.manualIndex) ? -1 : this.state.manualIndex,
      columnType: 0
    }); 
    localStorage.setItem('colKeys', JSON.stringify(colKeys.toJS()));
    if(localStorage.getItem('colKeyTypes'))
    {
      var colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes'));
      delete colKeyTypes[oldKey];
    }
  }
  
  handleEmptyTabs(tabIds: ID[])
  {
    if(!this.props.params.config)
    {
      return;
    }
    
    let newConfigArr = this.props.params.config.split(',').filter(tabId =>
    {
      if(tabId.indexOf('!') === 0)
      {
        tabId = tabId.substr(1);
      }
      
      return tabIds.indexOf(tabId) === -1;
    });
    
    if(newConfigArr.length && !newConfigArr.some(tabId => tabId.indexOf('!') === 0))
    {
      var prependSelect = true;
    }
    
    let newConfig = (prependSelect ? '!' : '') + newConfigArr.join(',');
    
    this.props.history.replaceState({}, `/builder/${newConfig}`);
    localStorage.setItem('config', newConfig || '');
    this.setState({
      random: Math.random(),
    });
  }
  
  moveColumn(curIndex, newIndex)
  {
    var tmp = this.state.colKeys.get(curIndex);
    var colKeys = this.state.colKeys.splice(curIndex, 1).splice(newIndex, 0, tmp);
    this.setState({
      colKeys,
      noColumnAnimation: true,
    })
    localStorage.setItem('colKeys', JSON.stringify(colKeys.toJS()));
    setTimeout(() => this.setState({
      noColumnAnimation: false,
    }), 250);
  }
  
  goToBrowser()
  {
    this.props.history.pushState({}, '/browser');
  }
  
	render()
  {
    let config = this.props.params.config;
    return (
      <div className={classNames({
        'builder': true,
        'builder-no-column-animation': this.state.noColumnAnimation,
      })}>
        <Tabs
          actions={this.tabActions}
          config={config}
          ref='tabs'
          history={this.props.history}
          reportEmptyTabs={this.handleEmptyTabs}
        />

        {
          !this.state.builder.queries.keySeq().size ? 
            <InfoArea
              large='No variants open'
              small='You can open one in the Browser'
              button='Go to the Browser'
              onClick={this.goToBrowser}
            />
          :
            <div className='tabs-content'>
              <LayoutManager layout={this.getLayout()} moveTo={this.moveColumn} />
            </div>
        }
      </div>
    );
	}
};

export default DragDropContext(HTML5Backend)(Builder);
