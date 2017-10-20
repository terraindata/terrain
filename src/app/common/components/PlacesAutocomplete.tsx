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

import * as classNames from 'classnames';
import { List } from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';

import { backgroundColor, Colors } from '../../colors/Colors';
import MapUtil from '../../util/MapUtil';
import TerrainComponent from './TerrainComponent';

export interface Props
{
  geocoder: string;
  onError?: (status: any) => void;
  clearItemsOnError?: boolean;
  highlightFirstSuggestion?: boolean;
  inputProps: any;
  options?: any;
  onSelect?: (address: string, placeId: string) => void;
  onEnterKeyDown?: (value: string) => void;
  classNames?: any;
  styles?: any;
}

const defaultStyles = {
  root: {
    position: 'relative',
    paddingBottom: '0px',
  },
  input: {
    display: 'inline-block',
    width: '100%',
    padding: '10px',
  },
  autocompleteContainer: {
    position: 'absolute',
    top: '100%',
    backgroundColor: 'white',
    border: '1px solid #555555',
    width: '100%',
  },
  autocompleteItem: {
    backgroundColor: '#ffffff',
    padding: '10px',
    color: '#555555',
    cursor: 'pointer',
  },
  autocompleteItemActive: {
    backgroundColor: '#fafafa',
    padding: '10px',
    color: '#555555',
    cursor: 'pointer',
  },
};

class PlacesAutocomplete extends TerrainComponent<Props>
{
  public autocompleteService;
  public autocompleteOK;
  public state: {
    autocompleteItems: any,
  } =
  {
    autocompleteItems: [],
  };

  public constructor(props: Props)
  {
    super(props);
    this.fetchPredictions = _.debounce(this.fetchPredictions, 5);
  }

  public componentDidMount()
  {
    if (this.props.geocoder === 'google')
    {
      if ((window as any).google === undefined)
      {
        throw new Error(`Google Maps JavaScript API library must be loaded. See:
          https://github.com/kenny-hibino/react-places-autocomplete#load-google-library`);
      }

      if ((window as any).google.maps.places === undefined)
      {
        throw new Error(`Google Maps Places library must be loaded. Please add libraries=places
          to the src URL. See: https://github.com/kenny-hibino/react-places-autocomplete#load-google-library`);
      }
      const google = (window as any).google;
      this.autocompleteService = new google.maps.places.AutocompleteService();
      this.autocompleteOK = google.maps.places.PlacesServiceStatus.OK;
    }
    // have another geocoder option

  }

  public photonAutocompleteCallback(predictions)
  {
    this.setState({
      autocompleteItems: predictions.features.map((p, idx) =>
      {
        const { housenumber, street, city, state, country, osm_id } = p.properties;
        let address: string = '';
        if (housenumber !== undefined)
        {
          address += String(housenumber) + ' ';
        }
        if (street !== undefined)
        {
          address += String(street) + ', ';
        }
        if (city !== undefined)
        {
          address += String(city) + ', ';
        }
        if (state !== undefined)
        {
          address += String(state) + ', ';
        }
        if (country !== undefined)
        {
          address += String(country);
        }
        return {
          suggestion: address,
          placeId: String(osm_id) + '_' + String(idx),
          active: this.props.highlightFirstSuggestion && idx === 0 ? true : false,
          formattedSuggestion: address,
          index: idx,
          coordinates: p.geometry.coordinates,
        };
      }),
    });
  }

  public autocompleteCallback(predictions, status)
  {
    if (status !== this.autocompleteOK)
    {
      if (this.props.onError !== undefined)
      {
        this.props.onError(status);
      }
      if (this.props.clearItemsOnError)
      {
        this.clearAutocomplete();
      }
      return;
    }
    const highlightFirstSuggestion = this.props.highlightFirstSuggestion;
    this.setState({
      autocompleteItems: predictions.map((p, idx) =>
      {
        return {
          suggestion: p.description,
          placeId: p.place_id,
          active: this.props.highlightFirstSuggestion && idx === 0 ? true : false,
          index: idx,
          formattedSuggestion: this.formattedSuggestion(p.structured_formatting),
        };
      }),
    });
  }

  public formattedSuggestion(structuredFormatting)
  {
    return {
      mainText: structuredFormatting.main_text,
      secondaryText: structuredFormatting.secondary_text,
    };
  }

  public fetchPredictions()
  {
    const value = this.props.inputProps.value;
    if (value.length > 0)
    {
      if (this.props.geocoder === 'google')
      {
        this.autocompleteService.getPlacePredictions(_.extend({}, this.props.options, {
          input: value,
        }), this.autocompleteCallback);
      }
      else if (this.props.geocoder === 'photon')
      {
        // handle photon get predictions
        this.ajax(this.photonAutocompleteCallback, 'https://photon.komoot.de/api/?',
          { q: value, limit: 5, lat: 37.4449002, lon: -122.16174969999997 });
      }
    }
  }

  public ajax(callback, url: string, params)
  {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url + MapUtil.buildQueryString(params), true);

    xhr.onload = (e) =>
    {
      if (xhr.status === 200)
      {
        if (callback)
        {
          callback(JSON.parse(xhr.response));
        }
      }
      else
      {
        if (this.props.onError !== undefined)
        {
          this.props.onError(xhr.status);
        }
      }
    };
    xhr.send();
  }

  public clearAutocomplete()
  {
    this.setState({
      autocompleteItems: [],
    });
  }

  public selectAddress(address, placeId)
  {
    this.clearAutocomplete();
    this.handleSelect(address, placeId);
  }

  public selectAndSetAddress(address, placeId)
  {
    this.selectAddress(address, placeId);
    if (this.props.onEnterKeyDown !== undefined)
    {
      setTimeout(this.props.onEnterKeyDown, 100);
    }
  }

  public handleSelect(address, placeId)
  {
    this.props.onSelect !== undefined ? this.props.onSelect(address, placeId) : this.props.inputProps.onChange(address);
  }

  public getActiveItem()
  {
    return this.state.autocompleteItems.find((item) =>
    {
      return item.active;
    });
  }

  public selectActiveItemAtIndex(index)
  {
    const activeName = this.state.autocompleteItems.find((item) =>
    {
      return item.index === index;
    }).suggestion;
    this.setActiveItemAtIndex(index);
    this.props.inputProps.onChange(activeName);
  }

  public handleEnterKey()
  {
    const activeItem = this.getActiveItem();
    if (activeItem === undefined)
    {
      if (this.props.onEnterKeyDown !== undefined)
      {
        this.props.onEnterKeyDown(this.props.inputProps.value);
        this.clearAutocomplete();
      } else
      {
        return;
      }
    }
    else
    {
      this.selectAndSetAddress(activeItem.suggestion, activeItem.placeId);
    }
  }

  public handleDownKey()
  {
    if (this.state.autocompleteItems.length === 0)
    {
      return;
    }
    const activeItem = this.getActiveItem();
    if (activeItem === undefined)
    {
      this.selectActiveItemAtIndex(0);
    }
    else
    {
      const nextIndex = (activeItem.index as number + 1) % this.state.autocompleteItems.length;
      this.selectActiveItemAtIndex(nextIndex);
    }
  }

  public handleUpKey()
  {
    if (this.state.autocompleteItems.length === 0)
    {
      return;
    }
    const activeItem = this.getActiveItem();
    if (activeItem === undefined)
    {
      this.selectActiveItemAtIndex(this.state.autocompleteItems.length - 1);
    }
    else
    {
      const prevIndex = (activeItem.index - 1) % this.state.autocompleteItems.length;
      this.selectActiveItemAtIndex(prevIndex);
    }
  }

  public handleInputKeyDown(event)
  {
    switch (event.key)
    {
      case 'Enter':
        event.preventDefault();
        this.handleEnterKey();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.handleDownKey();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.handleUpKey();
        break;
      case 'Escape':
        this.clearAutocomplete();
        break;
      default:
        break;
    }
    if (this.props.inputProps.onKeyDown)
    {
      this.props.inputProps.onKeyDown(event);
    }
  }

  public setActiveItemAtIndex(index)
  {
    this.setState({
      autocompleteItems: this.state.autocompleteItems.map((item, idx) =>
      {
        if (idx === index)
        {
          return _.extend({}, item, { active: true });
        }
        else
        {
          return _.extend({}, item, { active: false });
        }
      }),
    });
  }

  public autocompleteItem(suggestion)
  {
    return (
      <div>
        {suggestion}
      </div>
    );
  }

  public handleInputChange(event)
  {
    this.props.inputProps.onChange(event.target.value);
    if (event.target.value === undefined || event.target.value === null)
    {
      this.clearAutocomplete();
      return;
    }
    this.fetchPredictions();
  }

  public handleInputOnBlur(event)
  {
    this.clearAutocomplete();
    if (this.props.inputProps.onBlur !== undefined)
    {
      this.props.inputProps.onBlur(event);
    }
  }

  public getStyleFor(type)
  {
    if (this.props.styles !== undefined)
    {
      return _.extend({}, defaultStyles[type], this.props.styles[type]);
    }
    return _.extend({}, defaultStyles[type]);
  }

  public getInputProps()
  {
    const defaultInputProps = {
      autoComplete: 'on',
    };
    return _.extend({}, defaultInputProps, this.props.inputProps, {
      onChange: (event) =>
      {
        this.handleInputChange(event);
      },
      onKeyDown: (event) =>
      {
        this.handleInputKeyDown(event);
      },
      onBlur: (event) =>
      {
        this.handleInputOnBlur(event);
      },
      style: this.getStyleFor('input'),
      className: this.props.classNames !== undefined ? this.props.classNames.input : '',
    });
  }

  public render()
  {
    const autocompleteItems = this.state.autocompleteItems;
    const inputProps = this.getInputProps();

    return (
      <div
        id='PlacesAutocomplete__root'
        style={this.getStyleFor('root')}
        className={this.props.classNames !== undefined ? this.props.classNames.root : ''}
      >
        <input
          {...inputProps}
        />
        {
          autocompleteItems.length > 0 ?
            <div
              id='PlacesAutocomplete__autocomplete-container'
              style={this.getStyleFor('autocompleteContainer')}
              className={this.props.classNames !== undefined ? this.props.classNames.autocompleteContainer : ''}
            >
              {
                autocompleteItems.map((p, idx) =>
                {
                  return (
                    <div
                      key={p.placeId}
                      onMouseOver={this._fn(this.setActiveItemAtIndex, p.index)}
                      onMouseDown={this._fn(this.selectAndSetAddress, p.suggestion, p.placeId)}
                      onClick={this._fn(this.selectAndSetAddress, p.suggestion, p.placeId)}
                      style={p.active ? this.getStyleFor('autocompleteItemActive') : this.getStyleFor('autocompleteItem')}
                    >
                      {this.autocompleteItem(p.suggestion)}
                    </div>
                  );
                })
              }

            </div>

            :
            null
        }
      </div>
    );
  }

}

export default PlacesAutocomplete;
