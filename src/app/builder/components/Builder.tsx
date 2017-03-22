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
import * as moment from 'moment';
var HTML5Backend = require('react-dnd-html5-backend');
const {browserHistory} = require('react-router');
const { withRouter } = require('react-router');

// Data
import { BuilderStore, BuilderState } from "./../data/BuilderStore";
import Actions from "./../data/BuilderActions";
import Util from "./../../util/Util";
import UserActions from '../../users/data/UserActions';
import UserStore from '../../users/data/UserStore';
import RolesStore from '../../roles/data/RolesStore';
import RolesActions from '../../roles/data/RolesActions';
import LibraryTypes from '../../library/LibraryTypes';
import { LibraryStore, LibraryState } from '../../library/data/LibraryStore';
import LibraryActions from '../../library/data/LibraryActions';
import Types from '../BuilderTypes';
type Query = Types.Query;
type Variant = LibraryTypes.Variant;

// Components

import PureClasss from './../../common/components/PureClasss';
import BuilderColumn from "./BuilderColumn";
import {Tabs, TabAction} from "./layout/Tabs";
import LayoutManager from "./layout/LayoutManager";
import Card from "./cards/Card";
import ResultsManager from './results/ResultsManager';
import Ajax from "./../../util/Ajax";
import InfoArea from '../../common/components/InfoArea';
import {notificationManager} from './../../common/components/InAppNotification'
import Modal from '../../common/components/Modal';

var NewIcon = require("./../../../images/icon_new_21x17.svg?name=NewIcon");
var OpenIcon = require("./../../../images/icon_open_11x10.svg?name=OpenIcon");
var DuplicateIcon = require("./../../../images/icon_duplicate_11x12.svg?name=DuplicateIcon");
var SaveIcon = require("./../../../images/icon_save_10x10.svg?name=SaveIcon");

let { Map, List } = Immutable;

interface Props
{
  params?: any;
  location?: any;
  router?: any;
  route?: any;
}

class Builder extends PureClasss<Props>
{
  state: {
    builderState: BuilderState,
    variants: Map<ID, Variant>,
    
    colKeys: List<number>;
    noColumnAnimation: boolean;
    columnType: number;
    selectedCardName: string;
    manualIndex: number;
    
    leaving: boolean;
    nextLocation: any;
    tabActions: List<TabAction>;
    
    nonexistentVariantIds: List<ID>;
    
    navigationException: boolean; // does Builder need to allow navigation w/o confirm dialog?
  } = {
    builderState: BuilderStore.getState(),
    variants: LibraryStore.getState().variants,
    
    colKeys: null,
    noColumnAnimation: false,
    columnType: null,
    selectedCardName: '',
    manualIndex: -1,
    
    leaving: false,
    nextLocation: null,
    tabActions: this.getTabActions(BuilderStore.getState()),
    
    nonexistentVariantIds: List([]),
    
    navigationException: false,
  };
  
  initialColSizes: any;

  constructor(props:Props)
  {
    super(props);
    
    
    this._subscribe(BuilderStore, {
      stateKey: 'builderState',
      updater: (builderState:BuilderState) =>
      {
        if(
            builderState.query !== this.state.builderState.query
            || builderState.pastQueries !== this.state.builderState.pastQueries
            || builderState.nextQueries !== this.state.builderState.nextQueries
            || builderState.isDirty !== this.state.builderState.isDirty
          )
        {
          this.setState({
            tabActions: this.getTabActions(builderState),
          });
        }
      }
    });
    this._subscribe(LibraryStore, {
      stateKey: 'variants',
      storeKeyPath: ['variants'],
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
    
    let colSizes = JSON.parse(localStorage.getItem('colSizes') || '[]');
    
    if(!Array.isArray(colSizes) || _.reduce(colSizes, (sum, size) => sum + size['x'], 0) !== 0)
    {
      colSizes = [];
    }
    this.initialColSizes = colSizes;
  }
  
  componentWillMount()
  {
    this.checkConfig(this.props);
    this.loadTables(this.props);
  }
  
  componentDidMount()
  {
    window.onbeforeunload = (e) => 
    {
      Util.executeBeforeLeaveHandlers();
      
      if(this.state.navigationException)
      {
        this.setState({
          navigationException: false,
        });
        return;
      }
      
      if(this.shouldSave())
      {
        let msg = 'You have unsaved changes to this Variant. If you leave, they will be lost. Are you sure you want to leave?';
        e && (e.returnValue = msg);
        return msg;
      }
    }
    
    this.props.router.setRouteLeaveHook(this.props.route, this.routerWillLeave);
  }
  
  componentWillUnmount()
  {
    window.onbeforeunload = null;
  }
  
  routerWillLeave(nextLocation): boolean
  {
    if(this.confirmedLeave)
    {
      this.confirmedLeave = false;
      return true;
    }
    
    if(this.shouldSave(BuilderStore.getState()))
    {
      // ^ need to pass in the most recent state, because when you've navigated away
      // in a dirty state, saved on the navigation prompt, and then returned,
      // Builder's copy of the state gets out of date at this point
      
      let path = nextLocation.pathname;
      let pieces = path.split('/');
      if(pieces[1] === 'builder' && pieces[2])
      {
        let config = pieces[2].split(',');
        if(config.indexOf('!' + this.getSelectedId()) !== -1)
        {
          // current opened variant is still open, move along.
          // TODO
          return  true;
          // note: don't currently return true because that resets unsaved changes in open v
          //  but when we redo how the stores work, then that shouldn't happen.
        }
      }
      
      this.setState({
        leaving: true,
        nextLocation,
      });
      return false;
    }
    
    return true;
  }
  
  componentWillReceiveProps(nextProps: Props)
  {
    let currentOpen = this.props.location.query && this.props.location.query.o;
    let nextOpen = nextProps.location.query && nextProps.location.query.o;
    
    if(
      nextProps.params.config !== this.props.params.config
      || currentOpen !== nextOpen
    )
    {
      this.confirmedLeave = false;
      if(!nextProps.location.query || !nextProps.location.query.o)
      {
        this.props.router.setRouteLeaveHook(nextProps.route, this.routerWillLeave);
      }
      this.checkConfig(nextProps);
    }
  }
  
  checkConfig(props:Props)
  {
    let storedConfig = localStorage.getItem('config') || '';
    let open = props.location.query && props.location.query.o;
    let originalConfig = props.params.config || storedConfig;
    let newConfig = originalConfig;
    
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
    
    if(newConfig && newConfig.length && !newConfig.split(',').some(c => c.substr(0,1) === '!'))
    {
      newConfig = '!' + newConfig;
    }
    if(newConfig !== props.params.config 
      && (props.params.config !== undefined || newConfig.length)
      )
    {
      browserHistory.replace(`/builder/${newConfig}`);
    }
    localStorage.setItem('config', newConfig || '');
    
    const pieces = newConfig.split(',');
    let variantId = pieces.find(
      piece => piece.indexOf('!') === 0
    )
    if(variantId)
    {
      variantId = variantId.substr(1); // trim '!'
    }
    if(newConfig && (props === this.props || variantId !== this.getSelectedId(this.props)))
    {
      // need to fetch data for new query
      Actions.fetchQuery(variantId, this.handleNoVariant);
    }
  }
  
  handleNoVariant(variantId: ID)
  {
    if(this.props.params.config && this.state.nonexistentVariantIds.indexOf(variantId) === -1)
    {
      this.setState({
        nonexistentVariantIds: this.state.nonexistentVariantIds.push(variantId),
      })
      let newConfigArr = localStorage['config']
        .split(',')
        .filter(id => id !== variantId && id !== '!' + variantId);
      if(newConfigArr.length && !newConfigArr.some(c => c.substr(0,1) === '!'))
      {
        newConfigArr[0] = '!' + newConfigArr[0];
      }
      
      let newConfig = newConfigArr.join(',');
      localStorage.setItem('config', newConfig); // so that empty configs don't cause a freak out
      browserHistory.replace(`/builder/${newConfig}`);
    }
  }
  
  getSelectedId(props?:Props)
  {
    props = props || this.props;
    var selected = props.params.config && props.params.config.split(',').find(id => id.indexOf('!') === 0);
    return selected && selected.substr(1);
  }
  
  // loadingQuery = Types._Query({
  //   loading: true,
  //   name: 'Loading',
  // });
  
  getQuery(props?:Props): Query
  {
    return this.state.builderState.query; // || this.loadingQuery;
  }
  
  getVariant(props?:Props): LibraryTypes.Variant
  {
    if(!this.state)
    {
      return null;
    }
    
    let variantId = this.getSelectedId(props);
    let variant = this.state.variants && 
      this.state.variants.get(variantId);
    if(variantId && !variant)
    {
      LibraryActions.variants.fetchVersion(variantId, () =>
      {
        // no version available
        this.handleNoVariant(variantId);
      });
    }
    return variant; // || this.loadingVariant;
  }
  
  getTabActions(builderState:BuilderState): List<TabAction>
  {
    return Immutable.List([
      {
        text: 'Undo',
        icon: null,
        onClick: this.handleUndo,
        enabled: !!builderState.pastQueries.size,
      },
      {
        text: 'Redo',
        icon: null,
        onClick: this.handleRedo,
        enabled: !!builderState.nextQueries.size,
      },
      {
        text: 'Save',
        icon: <SaveIcon />,
        onClick: this.onSave,
        enabled: this.shouldSave(builderState),
      },
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
    ]);
  }
  
  handleUndo()
  {
    Actions.undo();
  }
  
  handleRedo()
  {
    Actions.redo();
  }
  
  
  onSave()
  {
    if(this.getVariant().version) 
    {
      if(!confirm('You are editing an old version of the Variant. Saving will replace the current contents of the Variant. Are you sure you want to save?')) 
      {
        return;
      }
    }
    this.save()
  }
  
  onSaveSuccess(variant: Variant)
  {
    notificationManager.addNotification(
      'Saved',
      variant.name,
      'info', 
      4
    );
    
    //TODO remove if queries/variants model changes
    LibraryActions.variants.change(variant);
  }

  onSaveError(variant: Variant)
  {
    Actions.save(false);
    notificationManager.addNotification(
      'Error Saving',
      '"' + variant.name + '" failed to save.', 
      'error', 
      0
    );
  }
  
  // called by a child if needing to navigate without save dialog
  handleNavigationException()
  {
    this.setState({
      navigationException: true,
    });
  }
  
  shouldSave(overrideState?:BuilderState): boolean
  {
    let variant = this.getVariant();
    if(variant)
    {
      if(variant.status === LibraryTypes.EVariantStatus.Live)
      {
        return false;
      }
      if(
        !Util.haveRole(variant.groupId, 'builder', UserStore, RolesStore)
        && !Util.haveRole(variant.groupId, 'admin', UserStore, RolesStore)
      ) {
        // not auth
        return false;
      }
    }
    
    return !!(overrideState || this.state.builderState).isDirty;
  }
  
  save()
  {
    let variant = LibraryTypes.touchVariant(this.getVariant());
    variant = variant.set('query', this.getQuery());
    Ajax.saveItem(
      LibraryTypes.variantForSave(variant),
      this.onSaveSuccess.bind(this, variant),
      this.onSaveError.bind(this, variant)
    );
    Actions.save();
    
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
    if(newConfig !== this.props.params.config)
    {
      browserHistory.replace(`/builder/${newConfig}`);
    }
  }
  
  getLayout()
  {
    return {
      fullHeight: true,
      initialColSizes: this.initialColSizes,
      onColSizeChange: this.handleColSizeChange,
      minColWidth: 316,
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
  
  canEdit(): boolean
  {
    let variant = this.getVariant();
    return variant && (variant.status === LibraryTypes.EVariantStatus.Build
      && Util.canEdit(variant, UserStore, RolesStore))
  }
  
  cantEditReason(): string
  {
    let variant = this.getVariant();
    if(!variant || this.canEdit())
    {
      return '';
    }
    if(variant.status !== LibraryTypes.EVariantStatus.Build)
    {
      return 'This Variant is not in Build status';
    } 
    return 'You are not authorized to edit this Variant';
  }
  
  getColumn(index)
  {
    let key = this.state.colKeys.get(index);
    let query = this.getQuery();
    let variant = this.getVariant();
 
    
    return {
      minWidth: 316,
      resizeable: true,
      resizeHandleRef: 'resize-handle',
      content: query && <BuilderColumn
        query={query}
        resultsState={this.state.builderState.resultsState}
        index={index}
        colKey={key}
        variant={variant}
        onAddColumn={this.handleAddColumn}
        onAddManualColumn={this.handleAddManualColumn}
        onCloseColumn={this.handleCloseColumn}
        canAddColumn={this.state.colKeys.size < 3}
        canCloseColumn={this.state.colKeys.size > 1}
        columnType={this.state.columnType}
        selectedCardName={this.state.selectedCardName}
        switchToManualCol={this.switchToManualCol}
        changeSelectedCardName={this.changeSelectedCardName}
        canEdit={this.canEdit()}
        cantEditReason={this.cantEditReason()}
        onNavigationException={this.handleNavigationException}
      />,
      // hidden: this.state && this.state.closingIndex === index,
      key,
    };
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
    if(this.state.manualIndex !== -1) // Manual column already open
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
  
  revertVersion()
  {
    if(confirm('Are you sure you want to revert? Reverting Resets the Variant’s contents to this version. You can always undo the revert, and reverting does not lose any of the Variant’s history.')) 
    {
      this.save();
    }
  }

  renderVersionToolbar()
  {
    let variant = this.getVariant();

    if(variant && variant.version)
    {
      var lastEdited = moment(variant.lastEdited).format("h:mma on M/D/YY")
      return (
        <div className='builder-revert-toolbar'> 
          <div className='builder-revert-time-message'>
            Version from {lastEdited}
          </div>
          <div className='builder-white-space'/>
          {
            this.canEdit() &&
              <div 
                className='button builder-revert-button' 
                onClick={this.revertVersion}
                data-tip="Resets the Variant's contents to this version.\nYou can always undo the revert. Reverting\ndoes not lose any of the Variant's history."
              >
                Revert to this version
              </div>
           }
        </div>
      );
    }
    return null;
  }
  
  goToLibrary()
  {
    browserHistory.push('/library');
  }
  
  handleModalCancel()
  {
    this.setState({
      leaving: false,
    });
  }
  
  confirmedLeave: boolean = false;
  handleModalDontSave()
  {
    this.confirmedLeave = true;
    this.setState({
      leaving: false,
    });
    browserHistory.push(this.state.nextLocation);
  }
  
  handleModalSave()
  {
    this.save();
    this.confirmedLeave = true;
    this.setState({
      leaving: false,
    });
    browserHistory.push(this.state.nextLocation);
  }
  
	render()
  {
    let config = this.props.params.config;
    let variant = this.getVariant();
    let query = this.getQuery();
    console.log(this.state.builderState);
    return (
      <div className={classNames({
        'builder': true,
        'builder-no-column-animation': this.state.noColumnAnimation,
      })}>
        {
          !config || !config.length ? 
            <InfoArea
              large='No variants open'
              small='You can open one in the Library'
              button='Go to the Library'
              onClick={this.goToLibrary}
            />
          :
            <div>
              <Tabs
                actions={this.state.tabActions}
                config={config}
                ref='tabs'
                onNoVariant={this.handleNoVariant}
              />
              <div className='tabs-content'>
                {
                  this.renderVersionToolbar()
                }
                <LayoutManager layout={this.getLayout()} moveTo={this.moveColumn} />
              </div>
            </div>
        }
        <Modal
          open={this.state.leaving}
          message={'Save changes' + (variant ? ' to ' + variant.name : '') + ' before leaving?'}
          title='Unsaved Changes'
          confirmButtonText='Save'
          confirm={true}
          onClose={this.handleModalCancel}
          onConfirm={this.handleModalSave}
          thirdButtonText="Don't Save"
          onThirdButton={this.handleModalDontSave}
        />
        
        <ResultsManager
          query={query}
          resultsState={this.state.builderState.resultsState}
          db={this.state.builderState.db}
          onResultsStateChange={Actions.results}
        />
      </div>
    );
	}
};

export default withRouter(DragDropContext(HTML5Backend)(Builder));
