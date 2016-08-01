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

var React = require('react');
var ReactDOM = require('react-dom');

var Constants = require('./constants');
var Helpers = require('./helpers');
var merge = require('object-assign');
var CloseIcon = require('./icon_close.svg');
/* From Modernizr */
var whichTransitionEvent = function() {
  var t;
  var el = document.createElement('fakeelement');
  var transitions = {
    'transition': 'transitionend',
    'OTransition': 'oTransitionEnd',
    'MozTransition': 'transitionend',
    'WebkitTransition': 'webkitTransitionEnd'
  };

  for (t in transitions) {
    if (el.style[t] !== undefined) {
      return transitions[t];
    }
  }
};

var NotificationItem = React.createClass({displayName: "NotificationItem",

  propTypes: {
    notification: React.PropTypes.object,
    getStyles: React.PropTypes.object,
    onRemove: React.PropTypes.func,
    allowHTML: React.PropTypes.bool,
    noAnimation: React.PropTypes.bool
  },

  getDefaultProps: function() {
    return {
      noAnimation: false,
      onRemove: function() {},
      allowHTML: false
    };
  },

  getInitialState: function() {
    return {
      visible: false,
      removed: false
    };
  },

  componentWillMount: function() {
    var getStyles = this.props.getStyles;
    var level = this.props.notification.level;

    this._noAnimation = this.props.noAnimation;

    this._styles = {
      notification: getStyles.byElement('notification')(level),
      title: getStyles.byElement('title')(level),
      dismiss: getStyles.byElement('dismiss')(level),
      messageWrapper: getStyles.byElement('messageWrapper')(level),
      actionWrapper: getStyles.byElement('actionWrapper')(level),
      action: getStyles.byElement('action')(level)
    };

    if (!this.props.notification.dismissible) {
      this._styles.notification.cursor = 'default';
    }
  },

  _styles: {},

  _notificationTimer: null,

  _height: 0,

  _noAnimation: null,

  _isMounted: false,

  _removeCount: 0,

  _getCssPropertyByPosition: function() {
    var position = this.props.notification.position;
    var css = {};

    switch (position) {
    case Constants.positions.tl:
    case Constants.positions.bl:
      css = {
        property: 'left',
        value: -200
      };
      break;

    case Constants.positions.tr:
    case Constants.positions.br:
      css = {
        property: 'right',
        value: -200
      };
      break;

    case Constants.positions.tc:
      css = {
        property: 'top',
        value: -100
      };
      break;

    case Constants.positions.bc:
      css = {
        property: 'bottom',
        value: -100
      };
      break;

    default:
    }

    return css;
  },

  _defaultAction: function(event) {
    var notification = this.props.notification;

    event.preventDefault();
    this._hideNotification();
    if (typeof notification.action.callback === 'function') {
      notification.action.callback();
    }
  },

  _hideNotification: function() {
    if (this._notificationTimer) {
      this._notificationTimer.clear();
    }

    if (this._isMounted) {
      this.setState({
        visible: false,
        removed: true
      });
    }

    if (this._noAnimation) {
      this._removeNotification();
    }
  },

  _removeNotification: function() {
    this.props.onRemove(this.props.notification.uid);
  },

  _dismiss: function() {
    if (!this.props.notification.dismissible) {
      return;
    }

    this._hideNotification();
  },

  _showNotification: function() {
    var self = this;
    setTimeout(function() {
      if (self._isMounted) {
        self.setState({
          visible: true
        });
      }
    }, 50);
  },

  _onTransitionEnd: function() {
    if (this._removeCount > 0) return;
    if (this.state.removed) {
      this._removeCount++;
      this._removeNotification();
    }
  },

  componentDidMount: function() {
    var self = this;
    var transitionEvent = whichTransitionEvent();
    var notification = this.props.notification;
    var element = ReactDOM.findDOMNode(this);

    this._height = element.offsetHeight;

    this._isMounted = true;

    // Watch for transition end
    if (!this._noAnimation) {
      if (transitionEvent) {
        element.addEventListener(transitionEvent, this._onTransitionEnd);
      } else {
        this._noAnimation = true;
      }
    }


    if (notification.autoDismiss) {
      this._notificationTimer = new Helpers.Timer(function() {
        self._hideNotification();
      }, notification.autoDismiss * 1000);
    }

    this._showNotification();
  },

  _handleMouseEnter: function() {
    var notification = this.props.notification;
    if (notification.autoDismiss) {
      this._notificationTimer.pause();
    }
  },

  _handleMouseLeave: function() {
    var notification = this.props.notification;
    if (notification.autoDismiss) {
      this._notificationTimer.resume();
    }
  },

  componentWillUnmount: function() {
    var element = ReactDOM.findDOMNode(this);
    var transitionEvent = whichTransitionEvent();
    element.removeEventListener(transitionEvent, this._onTransitionEnd);
    this._isMounted = false;
  },

  _allowHTML: function(string) {
    return { __html: string };
  },

  render: function() {
    var notification = this.props.notification;
    var className = 'notification notification-' + notification.level;
    var notificationStyle = merge({}, this._styles.notification);
    var cssByPos = this._getCssPropertyByPosition();
    var dismiss = null;
    var actionButton = null;
    var title = null;
    var message = null;

    if (this.state.visible) {
      className = className + ' notification-visible';
    } else {
      className = className + ' notification-hidden';
    }

    if (!notification.dismissible) {
      className = className + ' notification-not-dismissible';
    }

    if (this.props.getStyles.overrideStyle) {
      if (!this.state.visible && !this.state.removed) {
        notificationStyle[cssByPos.property] = cssByPos.value;
      }

      if (this.state.visible && !this.state.removed) {
        notificationStyle.height = this._height;
        notificationStyle[cssByPos.property] = 0;
      }

      if (this.state.removed) {
        notificationStyle.overlay = 'hidden';
        notificationStyle.height = 0;
        notificationStyle.marginTop = 0;
        notificationStyle.paddingTop = 0;
        notificationStyle.paddingBottom = 0;
      }
      notificationStyle.opacity = this.state.visible ? this._styles.notification.isVisible.opacity : this._styles.notification.isHidden.opacity;
    }

    if (notification.title) {
      title = React.createElement("h4", {className: "notification-title", style:  this._styles.title},  notification.title);
    }

    if (notification.message) {
      if (this.props.allowHTML) {
        message = (
          React.createElement("div", {className: "notification-message", style:  this._styles.messageWrapper, dangerouslySetInnerHTML:  this._allowHTML(notification.message) })
        );
      } else {
        message = (
          React.createElement("div", {className: "notification-message", style:  this._styles.messageWrapper},  notification.message)
        );
      }
    }

    if (notification.dismissible) {
      dismiss = React.createElement("span", {className: "notification-dismiss", style:  this._styles.dismiss}, "×");
      //dismiss = React.createElement("img", {className: "notification-dismiss", style: this._styles.dismiss, src: "./icon_close.svg"});
    }

    if (notification.action) {
      actionButton = (
        React.createElement("div", {className: "notification-action-wrapper", style:  this._styles.actionWrapper}, 
          React.createElement("button", {className: "notification-action-button", 
            onClick:  this._defaultAction, 
            style:  this._styles.action}, 
               notification.action.label
          )
        )
      );
    }
    return (
      React.createElement("div", {className:  className, onClick:  this._dismiss, onMouseEnter:  this._handleMouseEnter, onMouseLeave:  this._handleMouseLeave, style:  notificationStyle }, 
         title, 
         message, 
         dismiss, 
         actionButton 
      )
    );
  }

});

module.exports = NotificationItem;
