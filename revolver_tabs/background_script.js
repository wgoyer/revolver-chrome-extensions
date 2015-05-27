/* global chrome */
// Global Variables - When possible pulling from Local Storage set via Options page.
var activeWindows = [],
	tabsManifest = [],
	settings = {},
	advSettings = {},
	tabReload = false,
	tabInactive = false,
	tabAutostart = false,
	noRefreshList = [],
	windowId,
	moverTimeOut;

initSettings();

// Check if the objects exist in local storage. 
function createBaseSettingsIfTheyDontExist(){
	if(!localStorage["revolverSettings"]){
		settings.seconds = 15;
		settings.reload = tabReload;
		settings.inactive = tabInactive;
		settings.autoStart = tabAutostart;
		localStorage["revolverSettings"] = JSON.stringify(settings);
	};
	return true;	
}

function initSettings(){
	badgeTabs();
	// If objects don't exist in local storage, create them.
	createBaseSettingsIfTheyDontExist();
//	if (!checkIfSettingsExist("revolverAdvSettings")) 
	if (settings.reload) tabReload = true;
	if (settings.inactive) tabInactive = true; 
	if (settings.autostart) tabAutostart = true; 
	if (settings.noRefreshList) noRefreshList = settings.noRefreshList;
	// Check autostart flag and run.
	if(tabAutostart) {
		chrome.tabs.query({'active': true}, function(tabs){
			createTabsManifest(tabs[0].windowId, function(){
				go(tabs[0].windowId);	
			});
		});
	};
	//Event handler for starting/stopping Revolver tabs when clicked.
	chrome.browserAction.onClicked.addListener(function(tab) {
		windowId = tab.windowId;
		createTabsManifest(windowId, function(){
			if (activeInWindow(windowId)) {
				stop(windowId);
			} else {
				go(windowId);
			}	
		});
	});
}

function assignBaseSettings(tabs, callback) {
	for(var i = 0;i<tabs.length;i++){
		tabs[i].reload = (tabs[i].reload || settings.reload);
		tabs[i].seconds = (tabs[i].seconds || settings.seconds);	
	};
	callback();
}

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

function grabTabSettings(tab, callback) {
	for(var i=0; i<tabsManifest.length; i++){
		if(tabsManifest[i].url === tab.url){
			callback(tabsManifest[i]);
		}
	}
}

//Change the badge icon/background color.  
function badgeTabs(text) {
	if(text === "on") {
		chrome.browserAction.setBadgeText({text:"\u2022"}); //Play button
	  	chrome.browserAction.setBadgeBackgroundColor({color:[0,255,0,100]}); //Green
	} else 
	if (text === "pause"){
		chrome.browserAction.setBadgeText({text:"\u2022"}); //Play button
		chrome.browserAction.setBadgeBackgroundColor({color:[255,238,0,100]}); //Yellow
	} else {
		chrome.browserAction.setBadgeText({text:"\u00D7"}); //Letter X
	 	chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,100]}); //Red
	}
}

//Helper method.  Checks if a string exists in an array.
function include(arr,url) {
    return (arr.indexOf(url) != -1);
}

function activeInWindow(windowId){
	for(var i in activeWindows) {
		if(activeWindows[i] == windowId) {
			return true;
		}
	}
}

// Start revolving the tabs
function go(windowId) {
	chrome.tabs.query({"windowId": windowId, "active": true}, function(tab){
		grabTabSettings(tab[0], function(tabSetting){
			setMoverTimeout(tabSetting.seconds);
			activeWindows.push(windowId);
			badgeTabs('on');
		});	
	});
}

// Stop revolving the tabs
function stop(windowId) {
	clearTimeout(moverTimeOut);
        console.log('Stopped.');
	var index = activeWindows.indexOf(windowId);
	if(index >= 0) {
		activeWindows.splice(index);
		badgeTabs('');
	}
}

// Switch to the next tab.
function activateTab(nextTab) {
	grabTabSettings(nextTab, function(tabSetting){
		if(tabSetting.reload && !include(noRefreshList, nextTab.url)){
			chrome.tabs.update(nextTab.id, {selected: true}, function(){
				chrome.tabs.reload(nextTab.id);
				setMoverTimeout(tabSetting.seconds);
			});
		} else {
			// Switch Tab right away
			chrome.tabs.update(nextTab.id, {selected: true});
			setMoverTimeout(tabSetting.seconds);
		}	
	});
}

// Call moveTab if the user isn't interacting with the browser
function moveTabIfIdle(tabTimeout) {
	clearTimeout(moverTimeOut);
	if (tabInactive) {
		// 15 is the lowest allowable number of seconds for this call
		chrome.idle.queryState(15, function(state) {
			if(state == 'idle') {
				return moveTab();
			} else {
				badgeTabs("pause");
				return setMoverTimeout(tabTimeout);	
			}
		});
	} else {
		moveTab();
	}
}

// Switches to next tab in the index, re-requests feed if at end of the index.
function moveTab() {
	for(var i in activeWindows) {
		windowId = activeWindows[i];
		badgeTabs('on');
		setNextTabIndex();
	}
}

function createTabsManifest(windowId, callback){
	chrome.tabs.query({"windowId" : windowId}, function(tabs){
		tabsManifest = tabs;
		assignSettingsToTabs(tabs, function(){
			callback();
		});
	});
}

function setNextTabIndex() {
	var nextTabIndex = 0;
	chrome.tabs.getSelected(windowId, function(currentTab){
		chrome.tabs.getAllInWindow(currentTab.windowId, function(tabs) {
			if(currentTab.index + 1 < tabs.length) {
				nextTabIndex = currentTab.index + 1;
			} else {
				nextTabIndex = 0;
			}
			activateTab(tabs[nextTabIndex]);
		});
	});
}

function assignSettingsToTabs(tabs, callback){
	assignAdvancedSettings(tabs, function(){
		assignBaseSettings(tabs, function(){
			callback();
		});	
	});
}

function setMoverTimeout(seconds){
	var timeDelay = (parseInt(seconds)*1000);
	moverTimeOut = setTimeout(function() {
		console.log("timeout triggered.");
		moveTabIfIdle(seconds); 
	}, timeDelay);
}