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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions max-line-length no-unused-expression

// Libraries
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import { DragDropContext } from 'react-dnd';
const HTML5Backend = require('react-dnd-html5-backend');
import { browserHistory } from 'react-router';
import { withRouter } from 'react-router';

// Data
import { ItemStatus } from '../../../items/types/Item';
import Query from '../../../items/types/Query';
import FileImportStore from '../../fileImport/data/FileImportStore';
import * as FileImportTypes from '../../fileImport/FileImportTypes';
import LibraryActions from '../../library/data/LibraryActions';
import * as LibraryTypes from '../../library/LibraryTypes';
import RolesStore from '../../roles/data/RolesStore';
import TerrainStore from '../../store/TerrainStore';
import Util from './../../util/Util';
import BuilderActions from './../data/BuilderActions';
import { BuilderState } from './../data/BuilderState';
type Algorithm = LibraryTypes.Algorithm;

// Components
import { tooltip } from 'common/components/tooltip/Tooltips';
import { UserState } from 'users/UserTypes';
import { backgroundColor, Colors } from '../../colors/Colors';
import InfoArea from '../../common/components/InfoArea';
import Modal from '../../common/components/Modal';
import FileImportPreviewColumn from '../../fileImport/components/FileImportPreviewColumn';
import { notificationManager } from './../../common/components/InAppNotification';
import TerrainComponent from './../../common/components/TerrainComponent';
import BuilderColumn from './BuilderColumn';
import LayoutManager from './layout/LayoutManager';
import { TabAction, Tabs } from './layout/Tabs';
import ResultsManager from './results/ResultsManager';

const NewIcon = require('./../../../images/icon_new_21x17.svg?name=NewIcon');
const OpenIcon = require('./../../../images/icon_open_11x10.svg?name=OpenIcon');
const DuplicateIcon = require('./../../../images/icon_save_as.svg?name=DuplicateIcon');
const SaveIcon = require('./../../../images/icon_save_10x10.svg?name=SaveIcon');
const UndoIcon = require('./../../../images/icon_undo.svg?name=UndoIcon');
const RedoIcon = require('./../../../images/icon_redo.svg?name=RedoIcon');

const { Map, List } = Immutable;

export interface Props
{
  params?: any;
  location?: any;
  router?: any;
  route?: any;
  users?: UserState;
  library?: LibraryTypes.LibraryState;
  algorithmActions: typeof LibraryActions.algorithms;
  builder?: BuilderState;
  builderActions?: typeof BuilderActions;
}

class Builder extends TerrainComponent<Props>
{
  public state: {
    exportState: FileImportTypes.FileImportState,
    algorithms: IMMap<ID, Algorithm>,

    colKeys: List<number>;
    noColumnAnimation: boolean;
    columnType: number;
    selectedCardName: string;
    manualIndex: number;

    leaving: boolean;
    nextLocation: any;
    tabActions: List<TabAction>;

    nonexistentAlgorithmIds: List<ID>;

    navigationException: boolean; // does Builder need to allow navigation w/o confirm dialog?

    saveAsTextboxValue: string;
    saving?: boolean;
    savingAs?: boolean;

    hitsPage: number;

  } = {
      exportState: FileImportStore.getState(),
      algorithms: this.props.library.algorithms,

      colKeys: null,
      noColumnAnimation: false,
      columnType: null,
      selectedCardName: '',
      manualIndex: -1,

      leaving: false,
      nextLocation: null,
      tabActions: this.getTabActions(this.props.builder),

      nonexistentAlgorithmIds: List([]),

      navigationException: false,

      saveAsTextboxValue: '',
      hitsPage: 1,

    };

  public initialColSizes: any;

  public confirmedLeave: boolean = false;

  constructor(props: Props)
  {
    super(props);
    this._subscribe(FileImportStore, {
      stateKey: 'exportState',
    });

    let colKeys: List<number>;

    if (localStorage.getItem('colKeys'))
    {
      colKeys = List(JSON.parse(localStorage.getItem('colKeys'))) as List<number>;
    }
    else
    {
      colKeys = List([Math.random(), Math.random()]);
      localStorage.setItem('colKeys', JSON.stringify(colKeys.toJS()));
    }

    if (localStorage.getItem('selectedCardName'))
    {
      this.state.selectedCardName = localStorage.getItem('selectedCardName');
    }

    this.state.colKeys = colKeys;

    this.addManualColumn = _.debounce(this.addManualColumn, 1);

    let colSizes = JSON.parse(localStorage.getItem('colSizes') || '[]');

    if (!Array.isArray(colSizes) || _.reduce(colSizes, (sum, size) => sum + size['x'], 0) !== 0)
    {
      colSizes = [];
    }
    this.initialColSizes = colSizes;
  }

  public unregisterLeaveHook1: any = () => undefined;
  public unregisterLeaveHook2: any = () => undefined;

  public componentWillMount()
  {
    this.checkConfig(this.props);
  }

  public componentDidMount()
  {
    window.onbeforeunload = (e) =>
    {
      Util.executeBeforeLeaveHandlers();

      if (this.state.navigationException)
      {
        this.setState({
          navigationException: false,
        });
        return undefined;
      }

      if (this.shouldSave())
      {
        const msg = 'You have unsaved changes to this Algorithm. If you leave, they will be lost. Are you sure you want to leave?';
        e && (e.returnValue = msg);
        return msg;
      }
    };

    this.unregisterLeaveHook1 = this.props.router.setRouteLeaveHook(this.props.route, this.routerWillLeave);
  }

  public componentWillUnmount()
  {
    this.unregisterLeaveHook1();
    this.unregisterLeaveHook2();
    window.onbeforeunload = null;
  }

  public routerWillLeave(nextLocation): boolean
  {
    if (this.confirmedLeave)
    {
      this.confirmedLeave = false;
      return true;
    }

    if (this.shouldSave(this.props.builder))
    {
      // ^ need to pass in the most recent state, because when you've navigated away
      // in a dirty state, saved on the navigation prompt, and then returned,
      // Builder's copy of the state gets out of date at this point

      const path = nextLocation.pathname;
      const pieces = path.split('/');
      if (pieces[1] === 'builder' && pieces[2])
      {
        const config = pieces[2].split(',');
        if (config.indexOf('!' + this.getSelectedId()) !== -1)
        {
          // current opened algorithm is still open, move along.
          // TODO
          return true;
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

  public componentWillReceiveProps(nextProps: Props)
  {
    const currentOpen = this.props.location.query && this.props.location.query.o;
    const nextOpen = nextProps.location.query && nextProps.location.query.o;
    if (currentOpen !== nextOpen)
    {
      this.setState({
        hitsPage: 1,
      });
    }
    if (
      nextProps.builder.query !== this.props.builder.query
      || nextProps.builder.pastQueries !== this.props.builder.pastQueries
      || nextProps.builder.nextQueries !== this.props.builder.nextQueries
      || nextProps.builder.isDirty !== this.props.builder.isDirty
    )
    {
      this.setState({
        tabActions: this.getTabActions(nextProps.builder),
      });
    }

    if (
      nextProps.params.config !== this.props.params.config
      || currentOpen !== nextOpen
    )
    {
      this.confirmedLeave = false;
      if (!nextProps.location.query || !nextProps.location.query.o)
      {
        this.unregisterLeaveHook2 = this.props.router.setRouteLeaveHook(nextProps.route, this.routerWillLeave);
      }
      this.checkConfig(nextProps);
    }
  }

  public checkConfig(props: Props)
  {
    const storedConfig = localStorage.getItem('config') || '';
    const open = props.location.query && props.location.query.o;
    const originalConfig = props.params.config || storedConfig;
    let newConfig = originalConfig;

    if (open)
    {
      if (!storedConfig || storedConfig === 'undefined' || storedConfig === '')
      {
        // no stored config, just load the open tab.
        newConfig = '!' + open;
      }
      else
      {
        // append or update the open id to the stored config list
        const configArr = storedConfig.split(',').map((id) => id.indexOf('!') === 0 ? id.substr(1) : id);
        let i = configArr.indexOf(open);
        if (i === -1)
        {
          i = configArr.length;
        }
        configArr[i] = '!' + open;

        newConfig = configArr.join(',');
      }
    }

    if (newConfig && newConfig.length && !newConfig.split(',').some((c) => c.substr(0, 1) === '!'))
    {
      newConfig = '!' + newConfig;
    }
    if (newConfig !== props.params.config
      && (props.params.config !== undefined || newConfig.length)
    )
    {
      browserHistory.replace(`/builder/${newConfig}`);
    }
    localStorage.setItem('config', newConfig || '');

    const pieces = newConfig.split(',');
    let algorithmId = pieces.find(
      (piece) => piece.indexOf('!') === 0,
    );
    if (algorithmId)
    {
      algorithmId = algorithmId.substr(1); // trim '!'
    }
    if (newConfig && (props === this.props || algorithmId !== this.getSelectedId(this.props)))
    {
      const algorithm = this.props.library.algorithms.get(+algorithmId);
      // need to fetch data for new query
      this.props.builderActions.fetchQuery(algorithmId, this.handleNoAlgorithm, algorithm && algorithm.db);
    }
  }

  public handleNoAlgorithm(algorithmId: ID)
  {
    if (this.props.params.config && this.state.nonexistentAlgorithmIds.indexOf(algorithmId) === -1)
    {
      this.setState({
        nonexistentAlgorithmIds: this.state.nonexistentAlgorithmIds.push(algorithmId),
      });
      const newConfigArr = localStorage['config']
        .split(',')
        .filter((id) => id !== algorithmId && id !== '!' + algorithmId);
      if (newConfigArr.length && !newConfigArr.some((c) => c.substr(0, 1) === '!'))
      {
        newConfigArr[0] = '!' + newConfigArr[0];
      }

      const newConfig = newConfigArr.join(',');
      localStorage.setItem('config', newConfig); // so that empty configs don't cause a freak out
      browserHistory.replace(`/builder/${newConfig}`);
    }
  }

  public getSelectedId(props?: Props)
  {
    props = props || this.props;
    const selected = props.params.config && props.params.config.split(',').find((id) => id.indexOf('!') === 0);
    return selected && selected.substr(1);
  }

  // loadingQuery = Types._Query({
  //   loading: true,
  //   name: 'Loading',
  // });

  public getQuery(props?: Props): Query
  {
    return this.props.builder.query; // || this.loadingQuery;
  }

  public getAlgorithm(props?: Props): LibraryTypes.Algorithm
  {
    if (!this.state)
    {
      return null;
    }

    const algorithmId = this.getSelectedId(props);
    const algorithm = this.props.library.algorithms &&
      this.props.library.algorithms.get(+algorithmId);
    if (algorithmId && !algorithm)
    {
      this.props.algorithmActions.fetchVersion(algorithmId, () =>
      {
        // no version available
        this.handleNoAlgorithm(algorithmId);
      });
    }
    return algorithm; // || this.loadingAlgorithm;
  }

  public getTabActions(builderState: BuilderState): List<TabAction>
  {
    return Immutable.List([
      {
        tooltip: 'Undo',
        icon: <UndoIcon />,
        onClick: this.handleUndo,
        enabled: !!builderState.pastQueries.size,
      },
      {
        tooltip: 'Redo',
        icon: <RedoIcon />,
        onClick: this.handleRedo,
        enabled: !!builderState.nextQueries.size,
      },
      {
        tooltip: 'Save As',
        icon: <DuplicateIcon />,
        onClick: this.onSaveAs,
        enabled: true,
      },
      {
        text: 'SAVE',
        icon: null,
        onClick: this.onSave,
        enabled: this.shouldSave(builderState),
        style: { top: -3 },
      },
      //   {
      //     text: 'Duplicate',
      //     icon: <DuplicateIcon />,
      //     onClick: this.duplicateGroup,
      //   },
      //   {
      //     text: 'Open',
      //     icon: <OpenIcon />,
      //     onClick: this.loadGroup,
      //   },
    ]);
  }

  public handleUndo()
  {
    this.props.builderActions.undo();
  }

  public handleRedo()
  {
    this.props.builderActions.redo();
  }

  public onSave()
  {
    if (this.getAlgorithm().version)
    {
      if (!confirm('You are editing an old version of the Algorithm. Saving will replace the current contents of the Algorithm. Are you sure you want to save?'))
      {
        return;
      }
    }
    this.save();
  }

  public onSaveAs()
  {
    this.setState({
      saveAsTextboxValue: Util.duplicateNameFor(this.getAlgorithm().name),
      savingAs: true,
    });
  }

  public onSaveSuccess(algorithm: Algorithm)
  {
    notificationManager.addNotification(
      'Saved',
      algorithm.name,
      'info',
      4,
    );
  }

  public onSaveError(algorithm: Algorithm)
  {
    this.props.builderActions.save(false);
    notificationManager.addNotification(
      'Error Saving',
      '"' + algorithm.name + '" failed to save.',
      'error',
      0,
    );
  }

  // called by a child if needing to navigate without save dialog
  public handleNavigationException()
  {
    this.setState({
      navigationException: true,
    });
  }

  public shouldSave(overrideState?: BuilderState): boolean
  {
    // empty builder or un-saveable, should never have to save
    if (!this.props.params.config || !this.canEdit())
    {
      return false;
    }

    const { users } = this.props;
    const algorithm = this.getAlgorithm();
    if (algorithm)
    {
      if (algorithm.status === ItemStatus.Deployed || algorithm.status === ItemStatus.Approve)
      {
        return false;
      }
      if (
        !Util.haveRole(algorithm.categoryId, 'builder', users, RolesStore)
        && !Util.haveRole(algorithm.categoryId, 'admin', users, RolesStore)
      )
      {
        // not auth
        return false;
      }
    }

    return !!(overrideState || this.props.builder).isDirty;
  }

  public save()
  {
    let algorithm = LibraryTypes.touchAlgorithm(this.getAlgorithm());
    if (this.shouldSave())
    {
      algorithm = algorithm.set('query', this.getQuery());
      this.setState({
        saving: true,
      });

      // TODO remove if queries/algorithms model changes
      this.props.algorithmActions.change(algorithm);
      this.onSaveSuccess(algorithm);
      this.props.builderActions.save(); // register that we are saving

      let configArr = window.location.pathname.split('/')[2].split(',');
      let currentAlgorithm;
      configArr = configArr.map((tab) =>
      {
        if (tab.substr(0, 1) === '!')
        {
          currentAlgorithm = tab.substr(1).split('@')[0];
          return '!' + currentAlgorithm;
        }
        return tab;
      },
      );
      for (let i = 0; i < configArr.length; i++)
      {
        if (configArr[i] === currentAlgorithm)
        {
          configArr.splice(i, 1);
        }
      }
      const newConfig = configArr.join(',');
      if (newConfig !== this.props.params.config)
      {
        browserHistory.replace(`/builder/${newConfig}`);
      }
    }
  }

  public getLayout()
  {
    return {
      fullHeight: true,
      initialColSizes: this.initialColSizes,
      onColSizeChange: this.handleColSizeChange,
      minColWidth: 316,
      columns:
        _.range(0, this.state.colKeys.size).map((index) =>
          this.getColumn(index),
        ),
    };
  }

  public handleColSizeChange(adjustments)
  {
    localStorage.setItem('colSizes', JSON.stringify(adjustments));
  }

  public canEdit(): boolean
  {
    const { users } = this.props;
    const algorithm = this.getAlgorithm();
    return algorithm && (
      (algorithm.status === ItemStatus.Build ||
        algorithm.status === ItemStatus.Live)
      && Util.canEdit(algorithm, users, RolesStore));
  }

  public cantEditReason(): string
  {
    const algorithm = this.getAlgorithm();
    if (!algorithm || this.canEdit())
    {
      return '';
    }
    if (algorithm.status !== ItemStatus.Build || algorithm.status !== ItemStatus.Live)
    {
      return 'This Algorithm is not in Build or Live status';
    }
    return 'You are not authorized to edit this Algorithm';
  }

  public getColumn(index)
  {
    const key = this.state.colKeys.get(index);
    const query = this.getQuery();
    const algorithm = this.getAlgorithm();
    return {
      minWidth: 316,
      resizeable: true,
      resizeHandleRef: 'resize-handle',
      content: query && <BuilderColumn
        query={query}
        resultsState={this.props.builder.resultsState}
        exportState={this.state.exportState}
        index={index}
        colKey={key}
        algorithm={algorithm}
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
        schema={(TerrainStore.getState() as any).schema}
        onIncrementHitsPage={this.incrementHitsPage}
      />,
      // hidden: this.state && this.state.closingIndex === index,
      key,
    };
  }

  public incrementHitsPage(hitsPage: number)
  {
    this.setState({
      hitsPage: hitsPage + 1,
    });
  }

  public switchToManualCol(index)
  {
    this.setState({
      manualIndex: index,
    });
  }

  public changeSelectedCardName(selectedCardName)
  {
    this.setState({
      selectedCardName,
    });
    localStorage.setItem('selectedCardName', selectedCardName);
  }

  public addManualColumn(index, selectedCardName?)
  {
    index = index + 1;
    const newKey = Math.random();
    const colKeys = this.state.colKeys.splice(index, 0, newKey);
    this.setState({
      colKeys,
      columnType: 4,
      selectedCardName,
      manualIndex: index,
    });
    localStorage.setItem('colKeys', JSON.stringify(colKeys.toJS()));
    if (localStorage.getItem('colKeyTypes'))
    {
      const colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes'));
      colKeyTypes[newKey] = 4;
      localStorage.setItem('colKeyTypes', JSON.stringify(colKeyTypes));
    }
  }

  public handleAddManualColumn(index, selectedCardName?)
  {
    if (this.state.manualIndex !== -1) // Manual column already open
    {
      this.setState({
        selectedCardName,
      });
    }
    else
    {
      if (this.state.colKeys.size === 3)
      {
        const closeIndex = index < 2 ? 2 : 1;
        this.handleCloseColumn(closeIndex);
      }
      this.addManualColumn(index, selectedCardName);
    }
  }

  public handleAddColumn(index)
  {
    index = index + 1;
    const colKeys = this.state.colKeys.splice(index, 0, Math.random());
    this.setState({
      colKeys,
    });
    localStorage.setItem('colKeys', JSON.stringify(colKeys.toJS()));
  }

  public handleCloseColumn(index)
  {
    const oldKey = this.state.colKeys[index];
    const colKeys = this.state.colKeys.splice(index, 1);
    this.setState({
      colKeys,
      manualIndex: (index === this.state.manualIndex) ? -1 : this.state.manualIndex,
      columnType: 0,
    });
    localStorage.setItem('colKeys', JSON.stringify(colKeys.toJS()));
    if (localStorage.getItem('colKeyTypes'))
    {
      const colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes'));
      delete colKeyTypes[oldKey];
    }
  }

  public moveColumn(curIndex, newIndex)
  {
    const tmp = this.state.colKeys.get(curIndex);
    const colKeys = this.state.colKeys.splice(curIndex, 1).splice(newIndex, 0, tmp);
    this.setState({
      colKeys,
      noColumnAnimation: true,
    });
    localStorage.setItem('colKeys', JSON.stringify(colKeys.toJS()));
    setTimeout(() => this.setState({
      noColumnAnimation: false,
    }), 250);
  }

  public revertVersion()
  {
    if (confirm('Are you sure you want to revert? Reverting Resets the Algorithm’s contents to this version. You can always undo the revert, and reverting does not lose any of the Algorithm’s history.'))
    {
      this.save();
    }
  }

  public renderVersionToolbar()
  {
    const algorithm = this.getAlgorithm();

    if (algorithm && algorithm.version)
    {
      const lastEdited = Util.formatDate(algorithm.lastEdited);

      return (
        <div className='builder-revert-toolbar'>
          <div className='builder-revert-time-message'>
            Version from {lastEdited}
          </div>
          <div className='builder-white-space' />
          {
            this.canEdit() &&
            tooltip(
              <div
                className='button builder-revert-button'
                onClick={this.revertVersion}
              >
                Revert to this version
              </div>,
              "Resets the Algorithm's contents to this version.\nYou can always undo the revert. Reverting\ndoes not lose any of the Algorithm's history.",
            )
          }
        </div>
      );
    }
    return null;
  }

  public goToLibrary()
  {
    browserHistory.push('/library');
  }

  public handleModalCancel()
  {
    this.setState({
      leaving: false,
    });
  }

  public handleModalDontSave()
  {
    this.confirmedLeave = true;
    this.setState({
      leaving: false,
    });
    browserHistory.push(this.state.nextLocation);
  }

  public handleModalSave()
  {
    this.save();
    this.confirmedLeave = true;
    this.setState({
      leaving: false,
    });
    browserHistory.push(this.state.nextLocation);
  }

  public handleSaveAsTextboxChange(newValue: string): void
  {
    this.setState({
      saveAsTextboxValue: newValue,
    });
  }

  public handleModalSaveAs()
  {
    let algorithm = LibraryTypes.touchAlgorithm(this.getAlgorithm());
    algorithm = algorithm.set('query', this.getQuery());
    this.props.algorithmActions.duplicateAs(algorithm, algorithm.get('index'), this.state.saveAsTextboxValue,
      (response, newAlgorithm) =>
      {
        this.onSaveSuccess(newAlgorithm);
        this.props.builderActions.save();

        let configArr = window.location.pathname.split('/')[2].split(',');
        let currentAlgorithm;
        configArr = configArr.map((tab) =>
        {
          if (tab.substr(0, 1) === '!')
          {
            currentAlgorithm = tab.substr(1).split('@')[0];
            return '!' + response.id.toString();
          }
          return tab;
        },
        );
        for (let i = 0; i < configArr.length; i++)
        {
          if (configArr[i] === currentAlgorithm)
          {
            configArr.splice(i, 1);
          }
        }

        this.setState({
          savingAs: false,
        });
        const newConfig = configArr.join(',');
        if (newConfig !== this.props.params.config)
        {
          browserHistory.replace(`/builder/${newConfig}`);
        }
      });
  }

  public handleModalSaveAsCancel()
  {
    this.setState({
      savingAs: false,
    });
  }

  public render()
  {
    const config = this.props.params.config;
    const algorithm = this.getAlgorithm();
    const query = this.getQuery();
    const algorithmIdentifier = algorithm === undefined ? '' :
      `${algorithm.categoryId},${algorithm.groupId},${algorithm.id}`;
    return (
      <div
        className={classNames({
          'builder': true,
          'builder-no-column-animation': this.state.noColumnAnimation,
        })}
      >
        {
          !config || !config.length ?
            <InfoArea
              large='No algorithms open'
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
                onNoAlgorithm={this.handleNoAlgorithm}
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
          message={'Save changes' + (algorithm ? ' to ' + algorithm.name : '') + ' before leaving?'}
          title='Unsaved Changes'
          confirmButtonText='Save'
          confirm={true}
          onClose={this.handleModalCancel}
          onConfirm={this.handleModalSave}
          thirdButtonText="Don't Save"
          onThirdButton={this.handleModalDontSave}
        />
        <Modal
          open={this.state.savingAs}
          title='Save As'
          confirmButtonText='Save'
          confirm={true}
          onClose={this.handleModalSaveAsCancel}
          onConfirm={this.handleModalSaveAs}
          initialTextboxValue={this.state.saveAsTextboxValue}
          textboxPlaceholderValue={'Algorithm Name'}
          message={'What would you like to name the copy of the algorithm?'}
          showTextbox={true}
          onTextboxValueChange={this.handleSaveAsTextboxChange}
        />
        <ResultsManager
          query={query}
          algorithmPath={algorithmIdentifier}
          resultsState={this.props.builder.resultsState}
          db={this.props.builder.db}
          onResultsStateChange={this.props.builderActions.results}
          hitsPage={this.state.hitsPage}
        />
      </div>
    );
  }
}
const BuilderContainer = Util.createTypedContainer(
  Builder,
  ['library', 'users', 'builder'],
  {
    algorithmActions: LibraryActions.algorithms,
    builderActions: BuilderActions,
  },
);
export default withRouter(DragDropContext(HTML5Backend)(BuilderContainer));
