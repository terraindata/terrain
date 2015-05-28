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
window.ParsleyConfig.i18n['pt-br'] = $.extend(window.ParsleyConfig.i18n['pt-br'] || {}, {
  defaultMessage: "This value seems to be invalid.",
  type: {
    email:        "Esse campo deve ser um email válido.",
    url:          "Esse campo deve ser uma url válida.",
    number:       "Esse campo deve ser um número válido.",
    integer:      "Esse campo deve ser um inteiro válido.",
    digits:       "Esse campo deve conter apenas dígitos.",
    alphanum:     "Esse campo deve ser alfa numérico."
  },
  notblank:       "Esse campo não pode ficar vazio.",
  required:       "Esse campo é obrigatório.",
  pattern:        "Esse campo parece estar inválido.",
  min:            "Esse campo deve ser maior ou igual a %s.",
  max:            "Esse campo deve ser menor ou igual a %s.",
  range:          "Esse campo deve estar entre %s e %s.",
  minlength:      "Esse campo é pequeno demais. Ele deveria ter %s characteres ou mais.",
  maxlength:      "Esse campo grande demais. Ele deveri ter %s characteres ou menos.",
  length:         "O tamanho desse campo é inválido. Ele deveria ter entre %s e %s characteres.",
  mincheck:       "Você deve escolher pelo menos %s opções.",
  maxcheck:       "Você deve escolher %s opções ou mais",
  check:          "Você deve escolher entre %s e %s opções.",
  equalto:        "Este valor deveria ser igual."
});

// If file is loaded after Parsley main file, auto-load locale
if ('undefined' !== typeof window.ParsleyValidator)
  window.ParsleyValidator.addCatalog('pt-br', window.ParsleyConfig.i18n['pt-br'], true);
