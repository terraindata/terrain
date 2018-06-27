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

// Copyright 2018 Terrain Data, Inc.

// Section: Login Flow

let IS_LOGGING_IN = false;
let TIMEOUT_LONG_LOGIN = 0;
let TIMEOUT_RESET_LOGIN_MESSAGE = 0; 
let INTERVAL_CHECK_AUTOFILL = 0;

function onLoginSubmit(useExistingToken)
{
	if (IS_LOGGING_IN)
	{
		return;
	}
	
	clearLoginResetTimeouts();
	document.getElementById("login-submit").innerHTML = "Logging in";
	
	IS_LOGGING_IN = true;
	TIMEOUT_LONG_LOGIN = setTimeout(handleLoginTakingAWhile, 3000);
	
	let config;
	
	if (useExistingToken)
	{
		config = {
			route: '/midway/v1/auth/check' + genQueryString(),
			method: 'GET',
			data: undefined,
		}
	}
	else
	{
		const email = document.getElementById("login-email").value;
		const password = document.getElementById("login-password").value;
		
		if (email.length === 0 || password.length === 0)
		{
			document.getElementById("login-submit").innerHTML = "Please provide email and password";
			IS_LOGGING_IN = false;
			TIMEOUT_RESET_LOGIN_MESSAGE = setTimeout(resetLoginMessage, 3000);
			return;
		}
	
		config = {
			route: '/midway/v1/auth/login',
			method: 'POST',
			data: JSON.stringify({
				email: email,
				password: password,
			}),
		}
	}
	
	var xhr = new XMLHttpRequest();
	xhr.open(config.method, config.route, true);

	xhr.onload = function () {
		if (xhr.status == 200)
		{
			try {
				var data = JSON.parse(xhr.response);
				
				if (useExistingToken)
				{
					if (data.check === 'ok')
					{
						onLoggedIn();
					}
					else
					{
						onLoginError("Bad response from /check route");
					}
				}
				else
				{
					localStorage.setItem('accessToken', data.accessToken);
					localStorage.setItem('id', data.id);
					onLoggedIn();
				}
			}
			catch (e)
			{
				onLoginError("Login JSON error: " + xhr.response);
			}
		}
		else if (xhr.status == 401)
		{
			onLoginIncorrect();
		}
		else
		{
			onLoginError("Bad login status: " + xhr.status);
		}
	};
	xhr.onerror = onLoginError;
	
  xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.send(config.data);
}

function onLoggedIn()
{
	document.getElementById("login-submit").innerHTML = "Logged in";
	document.getElementById("login").className = document.getElementById("login").className + " logged-in";
	clearLoginResetTimeouts();
	TIMEOUT_BUNDLES_LOADING = setTimeout(handleLoadingBundles, 500);
	injectBundle('vendor.bundle.js');
	injectBundle('bundle.js');
}

function onLoginError(error)
{
	console.error(error);
	IS_LOGGING_IN = false;
	clearLoginResetTimeouts();
	document.getElementById("login-submit").innerHTML = "Server Error";
	TIMEOUT_RESET_LOGIN_MESSAGE = setTimeout(resetLoginMessage, 3000);
}

function onLoginIncorrect()
{
	IS_LOGGING_IN = false;
	clearLoginResetTimeouts();
	document.getElementById("login-submit").innerHTML = "Wrong email / Pass";
	TIMEOUT_RESET_LOGIN_MESSAGE = setTimeout(resetLoginMessage, 3000);
}

function handleLoadingBundles()
{
	document.getElementById("login-submit").innerHTML = "Loading Terrain App";
}

function resetLoginMessage()
{
	document.getElementById("login-submit").innerHTML = "Login";
}

function handleLoginTakingAWhile()
{
	document.getElementById("login-submit").innerHTML = "Poor Connection...";
}

function clearLoginResetTimeouts()
{
	clearTimeout(TIMEOUT_LONG_LOGIN);
	clearTimeout(TIMEOUT_RESET_LOGIN_MESSAGE);
}

// Next two steps (bundle's executed & data's loaded) are run by bundle.js

// Section: Event Handlers

function handleKeyDown(e)
{
	if (e.keyCode === 13)
	{
		onLoginSubmit(false);
	}
}

function handleFocus(id)
{
	clearInterval(INTERVAL_CHECK_AUTOFILL);
	const el = document.getElementById(id + "-container");
	el.className = el.className + " login-input-container-active";
}

function checkForBlur(id)
{
	const el = document.getElementById(id + "-container");
	if (!el)
	{
		clearInterval(INTERVAL_CHECK_AUTOFILL);
		return;
	}
	
	const input = document.getElementById(id);
	if (input && input.value.length === 0)
	{
		el.className = el.className.replace(/login-input-container-active/g, "");
	}
	else
	{
		el.className = el.className + " login-input-container-active";
		clearInterval(INTERVAL_CHECK_AUTOFILL);
	}
}

document.getElementById("login-submit").onclick = function()
{
	onLoginSubmit(false);
}
document.getElementById("login-email").onkeydown = handleKeyDown;
document.getElementById("login-password").onkeydown = handleKeyDown;
document.getElementById("login-email").onfocus = handleFocus.bind(this, "login-email");
document.getElementById("login-password").onfocus = handleFocus.bind(this, "login-password");
document.getElementById("login-email").onblur = checkForBlur.bind(this, "login-email");
document.getElementById("login-password").onblur = checkForBlur.bind(this, "login-password");

document.getElementById("login-forgot-password").onclick = function()
{
	const el = document.getElementById("login-forgot-password-message");
	el.className = el.className + " showing";
}

INTERVAL_CHECK_AUTOFILL = setInterval(function() {
	checkForBlur("login-email");
	checkForBlur("login-password");
}, 20);


// Section: Functional

function genQueryString()
{
	var accessToken = localStorage.getItem('accessToken');
	var id = localStorage.getItem('id');
	var queryString = '?id=' + id + '&accessToken=' + accessToken;
	
	return queryString;
}

function injectBundle(path)
{
	var queryString = genQueryString();
	const script = document.createElement('script')
	script.setAttribute('src', '/midway/v1/bundles/' + path + queryString);
	script.setAttribute('type', 'text/javascript');
	script.setAttribute('charset', 'utf-8');
	
	document.body.appendChild(script);
	console.log(path + ' injected');
}

// check for existing accessToken
if (localStorage.getItem('accessToken') && localStorage.getItem('id'))
{
	onLoginSubmit(true);
}
