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

"use strict";

// Adapted from javascript syntax codemirror file
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

var TqlConfig = require('../../../../shared/backends/mysql/syntax/SQLSyntaxConfig.json');

(function(mod)
{
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../../../node_modules/codemirror/lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../../../node_modules/codemirror/lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror)
{

  CodeMirror.defineMode("tql", function(config, parserConfig)
  {
    var jsonldMode = parserConfig.jsonld;
    var jsonMode = parserConfig.json || jsonldMode;
    var isTS = parserConfig.typescript;
    var wordRE = parserConfig.wordCharacters || /[\w$\xa1-\uffff]/;

    // Tokenizer

    var keywords = function()
    {
      function kw(type) { return { type: type, style: "keyword" }; }
      var operator = kw("operator"), atom = { type: "atom", style: "atom" };

      var tqlKeywords = {};
      for (var index = 0; index < TqlConfig[0].keywords.length; index++)
      {
        var key = TqlConfig[0].keywords[index];
        var keyCap = key.toUpperCase();
        tqlKeywords[key] = kw(key);
        tqlKeywords[keyCap] = kw(keyCap);
      }
      for (var index = 0; index < TqlConfig[0].keywords2.length; index++)
      {
        var key = TqlConfig[0].keywords2[index];
        tqlKeywords[key] = kw(key);
      }
      for (var index = 0; index < TqlConfig[0].operators.length; index++)
      {
        var key = TqlConfig[0].operators[index];
        tqlKeywords[key] = kw("operator");
      }
      for (var index = 0; index < TqlConfig[0].atom.length; index++)
      {
        var key = TqlConfig[0].atom[index];
        tqlKeywords[key] = atom;
      }
      for (var index = 0; index < TqlConfig[0].var.length; index++)
      {
        var key = TqlConfig[0].var[index];
        tqlKeywords[key] = kw("var");
      }

      if (isTS)
      {
        var type = { type: "variable", style: "variable-3" };
        var tsKeywords =
          {
            "string": type, "number": type, "boolean": type, "any": type
          };

        for (var attr in tsKeywords)
        {
          tqlKeywords[attr] = tsKeywords[attr];
        }
      }
      return tqlKeywords;
    }();

    var isOperatorChar = /[+\-*%=<>!?()^]/;

    // Used as scratch variables to communicate multiple values without
    // consing up tons of objects.
    var type, content;
    function ret(tp, style, cont)
    {
      type = tp; content = cont;
      return style;
    }
    function tokenBase(stream, state)
    {
      var ch = stream.next();
      if (ch == '"' || ch == "'")
      {
        state.tokenize = tokenString(ch);
        return state.tokenize(stream, state);
      } else if (ch == "." && stream.match(/^\d+(?:[eE][+\-]?\d+)?/))
      {
        return ret("number", "number");
      } else if (ch == "." && stream.match(".."))
      {
        return ret("spread", "meta");
      } else if (/[\[\]{}\(\),;\:\.]/.test(ch))
      {
        return ret(ch);
      } else if (ch == "0" && stream.eat(/x/i))
      {
        stream.eatWhile(/[\da-f]/i);
        return ret("number", "number");
      } else if (ch == "0" && stream.eat(/o/i))
      {
        stream.eatWhile(/[0-7]/i);
        return ret("number", "number");
      } else if (ch == "0" && stream.eat(/b/i))
      {
        stream.eatWhile(/[01]/i);
        return ret("number", "number");
      } else if (/\d/.test(ch))
      {
        stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);
        return ret("number", "number");
      } else if (ch == "/")
      {
        if (stream.eat("*"))
        {
          state.tokenize = tokenComment;
          return tokenComment(stream, state);
        }
        else if (stream.eat("/"))
        {
          stream.skipToEnd();
          return ret("comment", "comment");
        }
        else
        {
          stream.eatWhile(isOperatorChar);
          return ret("operator", "operator", stream.current());
        }
      }
      else if (isOperatorChar.test(ch))
      {
        var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
        return (known && state.lastType != ".") ? ret(known.type, known.style, word) :
          ret("operator", "operator", word);
      }
      else if (ch == "&")
      {
        if (stream.eat("&"))
        {
          var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
          return (known && state.lastType != ".") ? ret(known.type, known.style, word) :
            ret("variable", "variable", word);
        }
      }
      else if (ch == "|")
      {
        if (stream.eat("|"))
        {
          var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
          return (known && state.lastType != ".") ? ret(known.type, known.style, word) :
            ret("variable", "variable", word);
        }
      }
      else if (wordRE.test(ch))
      {
        stream.eatWhile(wordRE);
        var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
        return (known && state.lastType != ".") ? ret(known.type, known.style, word) :
          ret("variable", "variable", word);
      }
    }

    function tokenString(quote)
    {
      return function(stream, state)
      {
        var escaped = false, next;
        while ((next = stream.next()) != null)
        {
          if (next == quote && !escaped) break;
          escaped = !escaped && next == "\\";
        }
        if (!escaped) state.tokenize = tokenBase;
        return ret("string", "string");
      };
    }

    function tokenComment(stream, state)
    {
      var maybeEnd = false, ch;
      while (ch = stream.next())
      {
        if (ch == "/" && maybeEnd)
        {
          state.tokenize = tokenBase;
          break;
        }
        maybeEnd = (ch == "*");
      }
      return ret("comment", "comment");
    }

    // Parser

    var atomicTypes = { "atom": true, "number": true, "variable": true, "string": true, "this": true };

    function JSLexical(column, type, align, prev, info)
    {
      this.column = column;
      this.type = type;
      this.prev = prev;
      this.info = info;
      if (align != null) this.align = align;
    }

    function inScope(state, varname)
    {
      for (var v = state.localVars; v; v = v.next)
        if (v.name == varname) return true;
      for (var cx = state.context; cx; cx = cx.prev)
      {
        for (var v = cx.vars; v; v = v.next)
          if (v.name == varname) return true;
      }
    }

    function parseJS(state, style, type, content, stream)
    {
      var cc = state.cc;
      // Communicate our context to the combinators.
      // (Less wasteful than consing up a hundred closures on every call.)
      cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc; cx.style = style;

      if (!state.lexical.hasOwnProperty("align"))
        state.lexical.align = true;

      while (true)
      {
        var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
        if (combinator(type, content))
        {
          while (cc.length && cc[cc.length - 1].lex)
            cc.pop()();
          if (cx.marked) return cx.marked;
          if (type == "variable" && inScope(state, content)) return "variable-2";
          return style;
        }
      }
    }

    // Combinator utils
    var cx = { state: null, column: null, marked: null, cc: null };
    function pass()
    {
      for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
    }
    function cont()
    {
      pass.apply(null, arguments);
      return true;
    }
    function register(varname)
    {
      function inList(list)
      {
        for (var v = list; v; v = v.next)
          if (v.name == varname) return true;
        return false;
      }
      var state = cx.state;
      cx.marked = "def";
      if (state.context)
      {
        if (inList(state.localVars)) return;
        state.localVars = { name: varname, next: state.localVars };
      } else
      {
        if (inList(state.globalVars)) return;
        if (parserConfig.globalVars)
          state.globalVars = { name: varname, next: state.globalVars };
      }
    }

    // Combinators
    var defaultVars = { name: "this", next: { name: "arguments" } };
    function pushcontext()
    {
      cx.state.context = { prev: cx.state.context, vars: cx.state.localVars };
      cx.state.localVars = defaultVars;
    }
    function popcontext()
    {
      cx.state.localVars = cx.state.context.vars;
      cx.state.context = cx.state.context.prev;
    }
    function pushlex(type, info)
    {
      var result = function()
      {
        var state = cx.state;
        state.lexical = new JSLexical(cx.stream.column(), type, null, state.lexical, info);
      };
      result.lex = true;
      return result;
    }
    function poplex()
    {
      var state = cx.state;
      if (state.lexical.prev)
      {
        state.lexical = state.lexical.prev;
      }
    }
    poplex.lex = true;

    function statement(type, value)
    {
      if (type == "var") return cont(pushlex("vardef", value.length), vardef, poplex);
      if (type == "{") return cont(pushlex("}"), block, poplex);
      if (type == ";") return cont();
      if (type == "function") return cont(functiondef);
      if (type == "variable") return cont(pushlex("stat"), maybelabel);
      return pass(pushlex("stat"), expression, poplex);
    }
    function expression(type)
    {
      return expressionInner(type, false);
    }
    function expressionNoComma(type)
    {
      return expressionInner(type, true);
    }
    function expressionInner(type, noComma)
    {
      var maybeop = noComma ? maybeoperatorNoComma : maybeoperatorComma;
      if (atomicTypes.hasOwnProperty(type)) return cont(maybeop);
      if (type == "function") return cont(functiondef, maybeop);
      if (type == "(") return cont(pushlex(")"), maybeexpression, poplex, maybeop);
      if (type == "operator") return cont(noComma ? expressionNoComma : expression);
      return cont();
    }
    function maybeexpression(type)
    {
      if (type.match(/[;\}\)\],]/)) return pass();
      return pass(expression);
    }
    function maybeexpressionNoComma(type)
    {
      if (type.match(/[;\}\)\],]/)) return pass();
      return pass(expressionNoComma);
    }

    function maybeoperatorComma(type, value)
    {
      if (type == ",") return cont(expression);
      return maybeoperatorNoComma(type, value, false);
    }
    function maybeoperatorNoComma(type, value, noComma)
    {
      var me = noComma == false ? maybeoperatorComma : maybeoperatorNoComma;
      var expr = noComma == false ? expression : expressionNoComma;
      if (type == "operator")
      {
        if (/\+\+|--/.test(value)) return cont(me);
        if (value == "?") return cont(expression, expr);
        return cont(expr);
      }
      if (type == ";") return;
      if (type == "(") return contCommasep(expressionNoComma, ")", "call", me);
      if (type == ".") return cont(property, me);
      if (type == "[") return cont(pushlex("]"), maybeexpression, poplex, me);
    }
    function target(_, value)
    {
      if (value == "target") { cx.marked = "keyword"; return cont(maybeoperatorComma); }
    }
    function targetNoComma(_, value)
    {
      if (value == "target") { cx.marked = "keyword"; return cont(maybeoperatorNoComma); }
    }
    function maybelabel(type)
    {
      if (type == ":") return cont(poplex, statement);
      return pass(maybeoperatorComma, poplex);
    }
    function property(type)
    {
      if (type == "variable") { cx.marked = "property"; return cont(); }
    }
    function commasep(what, end)
    {
      function proceed(type, value)
      {
        if (type == ",")
        {
          var lex = cx.state.lexical;
          if (lex.info == "call") lex.pos = (lex.pos || 0) + 1;
          return cont(what, proceed);
        }
      }
      return function(type, value)
      {
        if (type == end || value == end) return cont();
        return pass(what, proceed);
      };
    }
    function contCommasep(what, end, info)
    {
      for (var i = 3; i < arguments.length; i++)
        cx.cc.push(arguments[i]);
      return cont(pushlex(end, info), commasep(what, end), poplex);
    }
    function block(type)
    {
      if (type == "}") return cont();
      return pass(statement, block);
    }
    function maybetype(type)
    {
      if (isTS && type == ":") return cont(typeexpr);
    }
    function maybedefault(_, value)
    {
      if (value == "=") return cont(expressionNoComma);
    }
    function typeexpr(type)
    {
      if (type == "variable") { cx.marked = "variable-3"; return cont(afterType); }
    }
    function afterType(type, value)
    {
      if (value == "<") return cont(commasep(typeexpr, ">"), afterType);
      if (type == "[") return cont(afterType)
    }
    function vardef()
    {
      return pass(pattern, maybetype, maybeAssign, vardefCont);
    }
    function pattern(type, value)
    {
      if (type == "variable") { register(value); return cont(); }
      if (type == "[") return contCommasep(pattern, "]");
      if (type == "{") return contCommasep(proppattern, "}");
    }
    function proppattern(type, value)
    {
      if (type == "variable" && !cx.stream.match(/^\s*:/, false))
      {
        register(value);
        return cont(maybeAssign);
      }
      if (type == "variable") cx.marked = "property";
      if (type == "}") return pass();
      return cont(pattern, maybeAssign);
    }
    function maybeAssign(_type, value)
    {
      if (value == "=") return cont(expressionNoComma);
    }
    function vardefCont(type)
    {
      if (type == ",") return cont(vardef);
    }
    function functiondef(type, value)
    {
      if (value == "*") { cx.marked = "keyword"; return cont(functiondef); }
      if (type == "variable") { register(value); return cont(functiondef); }
      if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, maybetype, statement, popcontext);
    }
    function funarg(type)
    {
      return pass(pattern, maybetype, maybedefault);
    }
    function isContinuedStatement(state, textAfter)
    {
      return state.lastType == "operator" || state.lastType == "," ||
        isOperatorChar.test(textAfter.charAt(0)) ||
        /[,.]/.test(textAfter.charAt(0));
    }

    // Interface

    return {
      startState: function(basecolumn)
      {
        var state = {
          tokenize: tokenBase,
          lastType: "sof",
          cc: [],
          lexical: new JSLexical(0, "block", false),
          localVars: parserConfig.localVars,
          context: parserConfig.localVars && { vars: parserConfig.localVars },
        };
        if (parserConfig.globalVars && typeof parserConfig.globalVars == "object")
          state.globalVars = parserConfig.globalVars;
        return state;
      },

      token: function(stream, state)
      {
        if (stream.sol())
        {
          if (!state.lexical.hasOwnProperty("align"))
            state.lexical.align = false;
        }
        if (state.tokenize != tokenComment && stream.eatSpace()) return null;
        var style = state.tokenize(stream, state);
        if (type == "comment") return style;
        state.lastType = type == "operator" && (content == "++" || content == "--") ? "incdec" : type;
        return parseJS(state, style, type, content, stream);
      },

      blockCommentStart: jsonMode ? null : "/*",
      blockCommentEnd: jsonMode ? null : "*/",
      lineComment: jsonMode ? null : "//",
      fold: "brace",
      closeBrackets: "()[]{}''\"\"``",

    };
  });

});


