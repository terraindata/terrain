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
import * as Immutable from 'immutable';
import * as React from 'react';
import './LibraryVariantInfo.less';
const { List } = Immutable;
import BackendInstance from './../../../../shared/backends/types/BackendInstance';
import Dropdown from './../../common/components/Dropdown';
import TerrainComponent from './../../common/components/TerrainComponent';
import UserThumbnail from './../../users/components/UserThumbnail';
import Util from './../../util/Util';
import Actions from './../data/LibraryActions';
import * as LibraryTypes from './../LibraryTypes';
import StatusDropdown from './StatusDropdown';
import VariantVersions from './VariantVersions';

type Variant = LibraryTypes.Variant;

export interface Props
{
  variant: Variant;
  dbs: List<BackendInstance>;
  isSuperUser: boolean;
  isBuilder: boolean;
}

// TODO MOD centralize
const LANGUAGES = Immutable.List(['elastic', 'mysql']);

class LibraryInfoColumn extends TerrainComponent<Props>
{
  public handleDbChange(dbIndex: number)
  {
    Actions.variants.change(this.props.variant.set('db', this.props.dbs.get(dbIndex)));
  }

  public handleLanguageChange(langIndex: number)
  {
    const language = LANGUAGES.get(langIndex);
    Actions.variants.change(
      this.props.variant
        .set('language', language)
        .setIn(['query', 'language'], language), // TODO change once we remove query from variant
    );
  }

  public render()
  {
    if (!this.props.variant)
    {
      return null;
    }

    const { isBuilder, isSuperUser } = this.props;
    const { variant } = this.props;

    return (
      <div
        className='library-info-variant'
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
                  variant={this.props.variant}
                />
              </div>
            </div>
            <div className='biv-row'>
              <div className='biv-cell-first'>
                Language
              </div>
              <div className='biv-cell-second'>
                <Dropdown
                  selectedIndex={LANGUAGES.indexOf(this.props.variant.language)}
                  options={LANGUAGES}
                  onChange={this.handleLanguageChange}
                  canEdit={isBuilder || isSuperUser}
                  className='bic-db-dropdown'
                />
              </div>
            </div>
            <div className='biv-row'>
              <div className='biv-cell-first'>
                Database
              </div>
              <div className='biv-cell-second'>
                <Dropdown
                  selectedIndex={this.props.dbs && this.props.dbs.findIndex(
                    (db) => db.id === this.props.variant.db.id,
                  )}
                  options={this.props.dbs.map((db) => db.name + ' (' + db.type + ')').toList()}
                  onChange={this.handleDbChange}
                  canEdit={isBuilder || isSuperUser}
                  className='bic-db-dropdown'
                />
              </div>
            </div>
            <div className='biv-row'>
              <div className='biv-cell-first'>
                Updated At
              </div>
              <div className='biv-cell-second'>
                {
                  Util.formatDate(variant.lastEdited)
                }
              </div>
            </div>
            <div className='biv-row'>
              <div className='biv-cell-first'>
                Updated By
              </div>
              <div className='biv-cell-second'>
                <UserThumbnail
                  userId={variant.lastUserId}
                  smallest={true}
                  showName={true}
                  link={true}
                />
              </div>
            </div>
          </div>
        </div>

        <VariantVersions
          variant={this.props.variant}
        />
      </div>
    );
  }
}

export default LibraryInfoColumn;
