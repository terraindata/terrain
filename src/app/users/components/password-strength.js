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

//adapted from https://www.npmjs.com/package/react-password-strength-meter

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { 
  function defineProperties(target, props) 
  { 
    for (var i = 0; i < props.length; i++) 
      { var descriptor = props[i]; 
        descriptor.enumerable = descriptor.enumerable || false; 
        descriptor.configurable = true; 
        if ('value' in descriptor) 
        {
          descriptor.writable = true;
        } 
        Object.defineProperty(target, descriptor.key, descriptor);
     } 
   } 
   return function (Constructor, protoProps, staticProps) 
   { 
    if (protoProps) 
      {
        defineProperties(Constructor.prototype, protoProps);
      } 
    if (staticProps) 
      {
        defineProperties(Constructor, staticProps);
      } 
    return Constructor; 
  }; 
})();

var _get = function get(_x, _x2, _x3) 
{ 
  var _again = true; 
  _function: while (_again) { 
    var object = _x, property = _x2, receiver = _x3; 
    desc = parent = getter = undefined; 
    _again = false; 
    if (object === null) object = Function.prototype; 
    var desc = Object.getOwnPropertyDescriptor(object, property); 
    if (desc === undefined) 
    {
      var parent = Object.getPrototypeOf(object); 
      if (parent === null) 
      { 
        return undefined; 
      } 
      else 
      { 
        _x = parent; 
        _x2 = property; 
        _x3 = receiver; 
        _again = true; 
        continue _function; 
      } 
    } 
    else if ('value' in desc) 
    { 
      return desc.value; 
    } 
    else 
    { 
      var getter = desc.get; 
      if (getter === undefined) 
      { 
        return undefined; 
      } 
    return getter.call(receiver); 
    } 
  } 
};

function _interopRequireDefault(obj) 
{ 
  return obj && obj.__esModule ? obj : { 'default': obj }; 
}

function _classCallCheck(instance, Constructor) 
{ if (!(instance instanceof Constructor)) 
  { 
    throw new TypeError('Cannot call a class as a function'); 
  } 
}

function _inherits(subClass, superClass) 
{ 
  if (typeof superClass !== 'function' && superClass !== null) 
{
  throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); 
} 
subClass.prototype = Object.create(superClass && superClass.prototype, 
  { constructor: { value: subClass, enumerable: false, writable: true, configurable: true 
  } });
if (superClass) 
{
  subClass.__proto__ = superClass; 
}
}

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _zxcvbn = require('zxcvbn');

var _zxcvbn2 = _interopRequireDefault(_zxcvbn);

var PasswordStrengthMeter = (function (_Component) {
  _inherits(PasswordStrengthMeter, _Component);

  function PasswordStrengthMeter(props) {
    _classCallCheck(this, PasswordStrengthMeter);

    _get(Object.getPrototypeOf(PasswordStrengthMeter.prototype), 'constructor', this).call(this, props);
    this.handleInput = this.handleInput.bind(this);
    this.state = {
      resultScore: 'Very Weak',
      warning: '',
      suggestions: ''
    };
  }

  _createClass(PasswordStrengthMeter, [{
    key: 'handleInput',
    value: function handleInput(event) {
      event.preventDefault();
      var strength = this.props.strength;

      strength = strength ? strength : {
        0: 'Very Weak',
        1: 'Weak',
        2: 'Okay',
        3: 'Good',
        4: 'Strong',
      };
      var password = _reactDom2['default'].findDOMNode(this.refs.password);
      var meter = _reactDom2['default'].findDOMNode(this.refs.passwordStrengthMeter);
      var text = _reactDom2['default'].findDOMNode(this.refs.passwordStrengthText);

      var val = password.value;
      var result = (0, _zxcvbn2['default'])(val);

      // Update the password strength meter
      meter.value = result.score;

      // Update the text indicator
      if (val !== '') {
        this.setState({
          resultScore: strength[result.score],
          warning: '',
          suggestions: ''
        });
      } else {
        this.setState({
          resultScore: 'Very Weak',
          warning: '',
          suggestions: ''
        });
      }

      if (typeof this.props.onChange === 'function') {
        this.props.onChange(event);
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var passwordText = this.props.passwordText;

      var passwordHeader = passwordText ? passwordText : '';
      var _state = this.state;
      var resultScore = _state.resultScore;
      var warning = _state.warning;
      var suggestions = _state.suggestions;

      var inputType = this.props.type || 'password';

      return _react2['default'].createElement(
        'section',
        null,
        _react2['default'].createElement('input', { value: this.props.value, onInput: this.handleInput, type: inputType, name: 'password', id: 'password', ref: 'password' }),
        _react2['default'].createElement('meter', { max: '4', id: 'password-strength-meter', ref: 'passwordStrengthMeter' })
      );
    }
  }]);

  return PasswordStrengthMeter;
})(_react.Component);

exports['default'] = PasswordStrengthMeter;

PasswordStrengthMeter.propTypes = {
  passwordText: _react2['default'].PropTypes.string,
  strength: _react2['default'].PropTypes.object,
  onChange: _react2['default'].PropTypes.func
};
module.exports = exports['default'];
