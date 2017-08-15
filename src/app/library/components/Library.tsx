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
import { browserHistory } from 'react-router';
import * as _ from 'underscore';
import TerrainAreaChart from '../../charts/components/TerrainAreaChart';
import { backgroundColor, Colors, fontColor } from '../../common/Colors';
import InfoArea from './../../common/components/InfoArea';
import TerrainComponent from './../../common/components/TerrainComponent';
import RolesActions from './../../roles/data/RolesActions';
import UserActions from './../../users/data/UserActions';
import { LibraryState } from './../data/LibraryStore';
import Store from './../data/LibraryStore';
import * as LibraryTypes from './../LibraryTypes';
import AlgorithmsColumn from './AlgorithmsColumn';
import GroupsColumn from './GroupsColumn';
import './Library.less';
import LibraryInfoColumn from './LibraryInfoColumn';
import VariantsColumn from './VariantsColumn';

export interface Props
{
  params?: any;
  location?: any;
  router?: any;
  route?: any;
  variantsMultiselect?: boolean;
  basePath: string;
}

export interface State
{
  libraryState: LibraryState;
  selectedDomain: any;
  zoomDomain: any;
}

class Library extends TerrainComponent<any>
{
  public static defaultProps: Partial<Props> = {
    params: {},
    location: {},
    router: {},
    route: {},
    variantsMultiselect: false,
  };

  public cancelSubscription = null;

  public state: State = {
    libraryState: null,
    selectedDomain: {},
    zoomDomain: {},
  };

  public componentWillMount()
  {
    const { basePath } = this.props;

    if ((!this.props.params || !this.props.params.groupId))
    {
      // no path given, redirect to last library path
      const path = this.getLastPath();
      if (path != null)
      {
        browserHistory.replace(path);
      }
    }
  }

  public componentDidMount()
  {
    RolesActions.fetch();
    UserActions.fetch();
  }

  public getData()
  {
    return [...Array(20).keys()].map((i) =>
    {
      const time = new Date(2017, 8, i, 0, 0, 0);
      return { time, value: _.random(1, 100) };
    });
  }

  public getDatasets()
  {
    const { library: libraryState } = this.props;
    const { variants, selectedVariants } = libraryState;

    let metricId = 0;
    const metricName = 'Click Through Rate';

    const datasets = variants
      .filter((variant) =>
      {
        return selectedVariants.includes(variant.id.toString());
      })
      .map((variant) =>
      {
        metricId += 1;
        return { metric: { id: metricId, name: metricName }, data: this.getData() };
      });

    return datasets.toMap();
  }

  public getLastPath()
  {
    const { basePath } = this.props;

    const lastPath = basePath === 'library' ? 'lastLibraryPath' : 'lastAnalyticsPath';
    // no path given, redirect to last library path
    return localStorage.getItem(lastPath);
  }

  public setLastPath()
  {
    const { location, basePath } = this.props;

    const lastPath = basePath === 'library' ? 'lastLibraryPath' : 'lastAnalyticsPath';
    localStorage.setItem(lastPath, location.pathname);
  }

  public render()
  {
    const { library: libraryState } = this.props;

    const {
      dbs,
      groups,
      algorithms,
      variants,
      selectedVariants,
      groupsOrder
    } = libraryState;

    const { router, basePath, variantsMultiselect } = this.props;
    const { params } = router;

    const datasets = this.getDatasets();

    const groupId = params.groupId ? +params.groupId : null;
    const algorithmId = params.algorithmId ? +params.algorithmId : null;
    const variantIds = params.variantId ? params.variantId.split(',') : null;

    let group: LibraryTypes.Group;
    let algorithm: LibraryTypes.Algorithm;
    let variant: LibraryTypes.Variant;
    let algorithmsOrder: List<ID>;
    let variantsOrder: List<ID>;

    if (groupId !== null)
    {
      group = groups.get(groupId);

      if (group !== undefined)
      {
        algorithmsOrder = group.algorithmsOrder;

        if (algorithmId !== null)
        {
          algorithm = algorithms.get(algorithmId);

          if (algorithm !== undefined)
          {
            variantsOrder = algorithm.variantsOrder;

            if (variantIds !== null)
            {
              if (variantIds.length === 0)
              {
                browserHistory.replace(`/${basePath}/${groupId}/${algorithmId}`);
              } else if (variantIds.length === 1)
              {
                variant = variants.get(+variantIds[0]);
              }
            }
          } else
          {
            // !algorithm
            browserHistory.replace(`/${basePath}/${groupId}`);
          }
        }
      }
      else
      {
        // !group
        browserHistory.replace(`/${basePath}`);
      }
    }

    if (!!this.props.location.pathname)
    {
      this.setLastPath();
    }

    return (
      <div className='library'>
        <div className='library-top'>
          <GroupsColumn
            {...{
              groups,
              groupsOrder,
              params,
              basePath,
              groupActions: this.props.libraryGroupActions,
            }}
            isFocused={algorithm === undefined}
          />
          <AlgorithmsColumn
            {...{
              dbs,
              groups,
              algorithms,
              variants,
              algorithmsOrder,
              groupId,
              params,
              basePath,
              algorithmActions: this.props.libraryAlgorithmActions,
            }}
            isFocused={variantIds !== null && variantIds.length === 0}
          />
          <VariantsColumn
            {...{
              variants,
              selectedVariants,
              variantsOrder,
              groupId,
              algorithmId,
              params,
              multiselect: variantsMultiselect,
              basePath,
              router,
              variantActions: this.props.libraryVariantActions,
            }}
          />
          {!variantsMultiselect ?
            <LibraryInfoColumn
              {...{
                group,
                algorithm,
                variant,
              }}
            /> : null}
        </div>
        {variantsMultiselect && selectedVariants.count() > 0 ?
          <div className='library-bottom'>
            <TerrainAreaChart variants={variants} datasets={datasets} />
          </div> : null
        }
      </div>
    );
  }
}

export default Library;
