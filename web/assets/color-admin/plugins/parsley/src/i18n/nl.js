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

// ParsleyConfig definition if not already set
window.ParsleyConfig = window.ParsleyConfig || {};
window.ParsleyConfig.i18n = window.ParsleyConfig.i18n || {};

// Define then the messages
window.ParsleyConfig.i18n.nl = $.extend(window.ParsleyConfig.i18n.nl || {}, {
    // parsley //////////////////////////////////////
      defaultMessage: "Deze waarde lijkt onjuist."
    , type: {
          email:      "Dit lijkt geen geldig e-mail adres te zijn."
        , url:        "Dit lijkt geen geldige URL te zijn."
        , urlstrict:  "Dit is geen geldige URL."
        , number:     "Deze waarde moet een nummer zijn."
        , digits:     "Deze waarde moet numeriek zijn."
        , dateIso:    "Deze waarde moet een datum in het volgende formaat zijn: (YYYY-MM-DD)."
        , alphanum:   "Deze waarde moet alfanumeriek zijn."
      }
    , notnull:        "Deze waarde mag niet leeg zijn."
    , notblank:       "Deze waarde mag niet leeg zijn."
    , required:       "Dit veld is verplicht"
    , regexp:         "Deze waarde lijkt onjuist te zijn."
    , min:            "Deze waarde mag niet lager zijn dan %s."
    , max:            "Deze waarde mag niet groter zijn dan %s."
    , range:          "Deze waarde moet tussen %s en %s liggen."
    , minlength:      "Deze tekst is te kort. Deze moet uit minimaal %s karakters bestaan."
    , maxlength:      "Deze waarde is te lang. Deze mag maximaal %s karakters lang zijn."
    , rangelength:    "Deze waarde moet tussen %s en %s karakters lang zijn."
    , equalto:        "Deze waardes moeten identiek zijn."

    // parsley.extend ///////////////////////////////
    , minwords:       "Deze waarde moet minstens %s woorden bevatten."
    , maxwords:       "Deze waarde mag maximaal %s woorden bevatten."
    , rangewords:     "Deze waarde moet tussen de %s en %s woorden bevatten."
    , greaterthan:    "Deze waarde moet groter dan %s zijn."
    , lessthan:       "Deze waarde moet kleiner dan %s zijn."
});

// If file is loaded after Parsley main file, auto-load locale
if ('undefined' !== typeof window.ParsleyValidator)
  window.ParsleyValidator.addCatalog('nl', window.ParsleyConfig.i18n.nl, true);
