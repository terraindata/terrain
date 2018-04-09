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

// tslint:disable:strict-boolean-expressions

import { List } from 'immutable';
import * as React from 'react';

import { MidwayError } from './../../../../shared/error/MidwayError';
import Modal from './../../common/components/Modal';
import TerrainComponent from './../../common/components/TerrainComponent';
import UserThumbnail from './../../users/components/UserThumbnail';
import Ajax from './../../util/Ajax';
import Util from './../../util/Util';
import * as LibraryTypes from './../LibraryTypes';
import './LibraryAlgorithmInfo.less';
import StatusDropdown from './StatusDropdown';

type Algorithm = LibraryTypes.Algorithm;

export interface Props
{
  algorithm: Algorithm;
  isSuperUser: boolean;
  isBuilder: boolean;
  algorithmActions: any;
  library?: LibraryTypes.LibraryState;
}

// TODO MOD centralize
// TODO Re-add AlgorithmVersions
const LANGUAGES = List(['elastic', 'mysql']);

class LibraryInfoColumn extends TerrainComponent<Props>
{
  public state: {
    algorithmStatus: string,
    algorithmStatusErrorModalOpen: boolean,
    errorModalMessage: string,
    selectedAlgorithm: ID,
    algorithmStatusAjax: any;
  } = {
      algorithmStatus: 'Loading...',
      algorithmStatusErrorModalOpen: false,
      errorModalMessage: '',
      selectedAlgorithm: -1,
      algorithmStatusAjax: null,
    };

  public killAlgorithmStatusAjax()
  {
    if (this.state.algorithmStatusAjax)
    {
      const xhr = this.state.algorithmStatusAjax.xhr;
      if (xhr)
      {
        xhr.abort();
      }
    }
  }

  public componentWillUnmount()
  {
    this.killAlgorithmStatusAjax();
  }

  public componentWillReceiveProps(nextProps)
  {
    const { selectedAlgorithm, changingStatusOf } = nextProps.library;
    if (selectedAlgorithm !== this.props.library.selectedAlgorithm ||
      changingStatusOf)
    {
      this.setState({
        selectedAlgorithm,
      });
      this.fetchStatus(changingStatusOf || this.props.algorithm);
    }

    if (nextProps.algorithm !== this.props.algorithm)
    {
      this.fetchStatus(nextProps.algorithm);
    }
  }

  public toggleAlgorithmStatusError()
  {
    this.setState({
      algorithmStatusErrorModalOpen: !this.state.algorithmStatusErrorModalOpen,
    });
  }

  public componentDidMount()
  {
    if (this.props.algorithm !== undefined)
    {
      this.fetchStatus(this.props.algorithm);
    }
  }

  public fetchStatus(algorithm: Algorithm)
  {
    if (algorithm !== undefined)
    {
      this.setState({ algorithmStatus: 'Loading...' });
      this.killAlgorithmStatusAjax();
      const algorithmStatusAjax = Ajax.getAlgorithmStatus(
        algorithm.id,
        algorithm.db.id as number,
        algorithm.deployedName,
        (response) =>
        {
          this.setState({
            algorithmStatus: response,
            algorithmStatusAjax: null,
          });
        },
        (error) =>
        {
          let readable;
          try
          {
            readable = MidwayError.fromJSON(error).getDetail();
          }
          catch {
            readable = error;
          }
          this.setState({
            errorModalMessage: readable,
            algorithmStatusAjax: null,
          });
          this.toggleAlgorithmStatusError();
        },
      );
      this.setState({
        algorithmStatusAjax,
      });
    }
  }

  public render()
  {
    if (!this.props.algorithm)
    {
      return null;
    }

    const { isBuilder, isSuperUser } = this.props;
    const { algorithm } = this.props;

    return (
      <div
        className='library-info-algorithm'
      >
        <div className='biv-table-wrapper'>
          <div
            className='biv-table'
          >
            <div className='biv-row'>
              <div className='biv-cell-first'>
                Status
              </div>
              <div className='biv-cell-second'>
                <StatusDropdown
                  algorithm={this.props.algorithm}
                  algorithmActions={this.props.algorithmActions}
                />
              </div>
            </div>
            <div className='biv-row'>
              <div className='biv-cell-first'>
                Updated At
              </div>
              <div className='biv-cell-second'>
                {
                  Util.formatDate(algorithm.lastEdited)
                }
              </div>
            </div>
            <div className='biv-row'>
              <div className='biv-cell-first'>
                Updated By
              </div>
              <div className='biv-cell-second'>
                <UserThumbnail
                  userId={algorithm.lastUserId}
                  smallest={true}
                  showName={true}
                  link={true}
                />
              </div>
            </div>
            <div className='biv-row'>
              <div className='biv-cell-first'>
                Deployed Status
              </div>
              <div className='biv-cell-second'>
                {
                  this.state.algorithmStatus
                }
              </div>
            </div>
          </div>
        </div>
        <Modal
          message={this.state.errorModalMessage}
          onClose={this.toggleAlgorithmStatusError}
          open={this.state.algorithmStatusErrorModalOpen}
          error={true}
        />
      </div>
    );
  }
}

export default Util.createTypedContainer(
  LibraryInfoColumn,
  ['library'],
  {},
);
