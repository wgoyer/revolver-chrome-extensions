/* global chrome */
// Global Variables - When possible pulling from Local Storage set via Options page.
var activeWindows = [],
	tabsManifest = {},
	settings = {},
	advSettings = {},
	windowId,
	windowStatus = {},
	moverTimeOut = {},
	listeners = {};

checkForAndMigrateOldSettings(function(){
	initSettings();	
});
// Check if the objects exist in local storage, create them if they don't, load them if they do.
function createBaseSettingsIfTheyDontExist(){
	if(!localStorage["revolverSettings"]){
		settings.seconds = 15;
		settings.reload = false;
		settings.inactive = false;
		settings.autoStart = false;
		localStorage["revolverSettings"] = JSON.stringify(settings);
	} else {
		settings = JSON.parse(localStorage["revolverSettings"]);
	};
	if(localStorage["revolverAdvSettings"]){
		advSettings = JSON.parse(localStorage["revolverAdvSettings"]);
	}
	return true;
}
function autoStartIfEnabled(windowId){
	if(settings.autostart) {
		createTabsManifest(windowId, function(){
			go(windowId);
		});
	}	
};
// Main start function:  Sets badge text to stop state, creates objects in local storage if they don't exist
// and adds the event listeners to stop/start the extension as well as change badge text.  If autostart is
// enabled the system will start revolver tabs without prompting.
function initSettings(){
	badgeTabs("default");
	createBaseSettingsIfTheyDontExist();
	addEventListeners("startup", function(){
		autoStartIfEnabled(chrome.windows.WINDOW_ID_CURRENT);
	});	
}
// This will convert users old settings into the new object format and remove the old ones.
function checkForAndMigrateOldSettings(callback){
	if(localStorage["revolverSettings"]) callback();
	else {
		var oldSettings = ["seconds", "autostart", "inactive", "noRefreshList", "reload"],
			tempSettings = {};
		for(var i=0;i<oldSettings.length;i++){
			if(localStorage[oldSettings[i]]) {
				tempSettings[oldSettings[i]] = localStorage[oldSettings[i]];
				delete localStorage[oldSettings[i]];
			}
		}
		console.log(tempSettings);
		if(JSON.stringify(tempSettings) != "{}"){
			localStorage["revolverSettings"] = JSON.stringify(tempSettings);	
		}
		callback();
	}
}
// Checks each tab object for settings, if they don't exist assign them to the object.
function assignBaseSettings(tabs, callback) {
	for(var i = 0;i<tabs.length;i++){
		tabs[i].reload = (tabs[i].reload || settings.reload);
		tabs[i].seconds = (tabs[i].seconds || settings.seconds);	
	};
	callback();
}
// If the window has revolver tabs enabled, make sure the badge text reflects that.
function setBadgeStatusOnActiveWindow(tab){
	if(windowStatus[tab.windowId] === "on")	badgeTabs("on", tab.windowId);
	else if (windowStatus[tab.windowId] === "pause") badgeTabs("pause", tab.windowId);
	else if (activeInWindow(tab.windowId)) badgeTabs("", tab.windowId);
}
// If there are advanced settings for the URL, set them to the tab.
function assignAdvancedSettings(tabs, callback) {
	for(var y=0;y<tabs.length;y++){
		for(var i=0;i<advSettings.length;i++){
			if(advSettings[i].url == tabs[y].url) {
				tabs[y].reload = advSettings[i].reload;
				tabs[y].seconds = advSettings[i].seconds;
			}
		}	
	}
	callback();
}
// Get the settings for a tab.
function grabTabSettings(windowId, tab, callback) {
	for(var i=0; i<tabsManifest[windowId].length; i++){
		if(tabsManifest[windowId][i].url === tab.url){
			callback(tabsManifest[windowId][i]);
		}
	}
}
// Returns all the tabs for the current window.
function getAllTabsInCurrentWindow(callback){
	chrome.tabs.query({windowId: chrome.windows.WINDOW_ID_CURRENT}, function(tabs){
		callback(tabs);
	});
}
// Creates all of the event listeners to start/stop the extension and ensure badge text is up to date.
function addEventListeners(type, callback){
	if(type === "startup"){
		chrome.browserAction.onClicked.addListener(function(tab) {
			windowId = tab.windowId;
			if (activeInWindow(windowId)) {
				stop(windowId);
			} else {
				createTabsManifest(windowId, function(){
					go(windowId);
				});
			}
		});	
		callback();
	} else {
		chrome.tabs.onCreated.addListener(
			listeners.onCreated = function (tab){
				createTabsManifest(tab.windowId, function(){
					setBadgeStatusOnActiveWindow(tab);	
				});
			}
		);
		chrome.tabs.onUpdated.addListener(
			listeners.onUpdated = function onUpdated(tabId, changeObj, tab){
				setBadgeStatusOnActiveWindow(tab);
				if(changeObj.url) createTabsManifest(tab.windowId, function(){
					return true;
				});
			}
		);
		chrome.tabs.onActivated.addListener(
			listeners.onActivated = function(tab){
				setBadgeStatusOnActiveWindow(tab);
			}
		);
		chrome.tabs.onAttached.addListener(
			listeners.onAttached = function(tabId, newWindow){
				createTabsManifest(newWindow.newWindowId, function(){
					return true;
				});
			}
		);
		chrome.tabs.onDetached.addListener(
			listeners.onDetached = function(tabId, detachWindow){
				createTabsManifest(detachWindow.oldWindowId, function(){
					return true;
				});
			}
		);
		chrome.tabs.onRemoved.addListener(
			listeners.onRemoved = function(tabId, removedFromWindow){
				createTabsManifest(removedFromWindow.windowId, function(){
					return true;
				});
			}
		);
		chrome.windows.onCreated.addListener(
			listeners.onWindowCreated = function(window){
				autoStartIfEnabled(window.id);
			}
		);
		chrome.windows.onRemoved.addListener(
			listeners.onWindowRemoved = function(window){
				var index = activeWindows.indexOf(window.id);
				activeWindows.splice(index, 1);
				delete windowStatus[window.id];
				delete tabsManifest[window.id];
				removeTimeout(moverTimeOut[windowId]);
			}
		);
		callback();	
	}	
};
//Change the badge icon/background color.  
function badgeTabs(text, windowId) {
	if(text === "default") {
		chrome.browserAction.setBadgeText({text:"\u00D7"}); //Letter X
 		chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,100]}); //Red	
	} else {
		chrome.tabs.query({"windowId": windowId, "active": true}, function(tab){
			if(text === "on") {
				chrome.browserAction.setBadgeText({text:"\u2022", tabId: tab[0].id}); //Play button
		  		chrome.browserAction.setBadgeBackgroundColor({color:[0,255,0,100], tabId: tab[0].id}); //Green
			} else
			if (text === "pause"){
				chrome.browserAction.setBadgeText({text:"\u2022", tabId: tab[0].id}); //Play button
				chrome.browserAction.setBadgeBackgroundColor({color:[255,238,0,100], tabId: tab[0].id}); //Yellow
			} else {
				chrome.browserAction.setBadgeText({text:"\u00D7", tabId: tab[0].id}); //Letter X
		 		chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,100], tabId: tab[0].id}); //Red
			}
		});	
	}	
}		
//Helper method.  Checks if a string exists in an array.
function include(arr,url) {
    return (arr.indexOf(url) != -1);
}
//Helper method.  Checks if parameter exists in the activeWindows array which is populated by go()
function activeInWindow(windowId){
	for(var i in activeWindows) {
		if(activeWindows[i] == windowId) {
			return true;
		}
	}
}
// This stupid function exists because for whatever reason pushing the windowId to the array is duplicating windowIds.
// when auto-start is enabled and the user creates a brand new window.  It's only called one time but still duplicated.  
// Potential fix is to loop over the window status until it's finished loading then update the array?
function addToActiveWindows(windowId){
	for(var i=0;i<activeWindows.length;i++){
		if(activeWindows[i] === windowId) return;
	}
	activeWindows.push(windowId);
}
// Start revolving the tabs
function go(windowId) {
	addEventListeners(null, function(){
		chrome.tabs.query({"windowId": windowId, "active": true}, function(tab){
			grabTabSettings(windowId, tab[0], function(tabSetting){
				setMoverTimeout(windowId, tabSetting.seconds);
				addToActiveWindows(windowId);
				// activeWindows.push(windowId);
				windowStatus[windowId] = "on";
				badgeTabs('on', windowId);
			});	
		});
	});
}
// Stop revolving the tabs
function stop(windowId) {
	var index = activeWindows.indexOf(windowId);
	removeTimeout(windowId);
	if(index >= 0) {
		activeWindows.splice(index, 1);
		chrome.tabs.query({"windowId": windowId, "active": true}, function(tab){
			windowStatus[windowId] = "off";
			badgeTabs('', windowId);
		});
	}
}
// Switch to the next tab.
function activateTab(nextTab) {
	grabTabSettings(nextTab.windowId, nextTab, function(tabSetting){
		if(tabSetting.reload && !include(settings.noRefreshList, nextTab.url)){
			chrome.tabs.reload(nextTab.id, function(){
				chrome.tabs.update(nextTab.id, {selected: true}, function(){
					setMoverTimeout(tabSetting.windowId, tabSetting.seconds);
				});
			});
		} else {
			// Switch Tab right away
			chrome.tabs.update(nextTab.id, {selected: true});
			setMoverTimeout(tabSetting.windowId, tabSetting.seconds);
		}	
	});
}
// Call moveTab if the user isn't interacting with the browser
function moveTabIfIdle(timerWindowId, tabTimeout) {
	if (settings.inactive) {
		// 15 is the lowest allowable number of seconds for this call
		chrome.idle.queryState(15, function(state) {
			if(state == 'idle') {
				windowStatus[timerWindowId] = "on";
				badgeTabs("on", timerWindowId);
				return moveTab(timerWindowId);
			} else {
				windowStatus[timerWindowId] = "pause";
				badgeTabs("pause", timerWindowId);
				return setMoverTimeout(timerWindowId, tabTimeout);
			}
		});
	} else {
		moveTab(timerWindowId);
	}
}
// Switches to next tab in the index, re-requests feed if at end of the index.
function moveTab(timerWindowId) {
	var nextTabIndex = 0;
	chrome.tabs.getSelected(timerWindowId, function(currentTab){
		chrome.tabs.getAllInWindow(timerWindowId, function(tabs) {
			if(currentTab.index + 1 < tabs.length) {
				nextTabIndex = currentTab.index + 1;
			} else {
				nextTabIndex = 0;
			}
			activateTab(tabs[nextTabIndex]);
		});
	});
}
// Create the tabs object with settings in tabsManifest object.
function createTabsManifest(windowId, callback){
	chrome.tabs.query({"windowId" : windowId}, function(tabs){
		assignSettingsToTabs(tabs, function(){
			tabsManifest[windowId] = tabs;
			callback();
		});
	});
}
// Go through each tab and assign settings to them.
function assignSettingsToTabs(tabs, callback){
	assignAdvancedSettings(tabs, function(){
		assignBaseSettings(tabs, function(){
			callback();
		});	
	});
}
// Generate the timeout and assign it to moverTimeOut object.
function setMoverTimeout(timerWindowId, seconds){
	moverTimeOut[timerWindowId] = setTimeout(function(){
		removeTimeout(timerWindowId);
		moveTabIfIdle(timerWindowId, seconds);	
	}, parseInt(seconds)*1000);
}
// Remove the timeout specified.
function removeTimeout(windowId){
	clearTimeout(moverTimeOut[windowId]);
}
//If a user changes settings this will update them on the fly.  Called from options_script.js
function updateSettings(){
	settings = JSON.parse(localStorage["revolverSettings"]);
	advSettings = JSON.parse(localStorage["revolverAdvSettings"]);
	getAllTabsInCurrentWindow(function(tabs){
		assignBaseSettings(tabs, function(){
			assignAdvancedSettings(tabs, function(){
				createTabsManifest(tabs[0].windowId, function(){
					return true;	
				});
			});
		});
	});
}