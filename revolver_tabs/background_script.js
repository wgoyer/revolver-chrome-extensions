/* global chrome */
// Global Variables - When possible pulling form Local Storage set via Options page.
var activeWindows = [],
	tabsManifest = [],
	settings = JSON.parse(localStorage["revolverSettings"]),
	advSettings = JSON.parse(localStorage["revolverAdvSettings"]),
	timeDelay = 10000,
	tabReload = false,
	tabInactive = false,
	tabAutostart = false,
	noRefreshList = [],
	windowId,
	moverInterval,
	badgeColor = [139,137,137,137]; //Grey - inactive.
//Base Settings
if (settings.seconds) timeDelay = settings.seconds*1000;
if (settings.reload) tabReload = true;
if (settings.inactive) tabInactive = true; 
if (settings.autostart) tabAutostart = true; 
if (settings.noRefreshList) noRefreshList = settings.noRefreshList;

//Autostart function, procesed on initial startup.
if(tabAutostart) {
	chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT},
		function(tabs){
			createTabsManifest();
			//Start Revolver Tabs in main window.
			go(tabs[0].windowId);
		}
	);
}

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
	windowId = tab.windowId;
	if (activeInWindow(windowId)) {
		stop(windowId);
	} else {
		go(windowId);
	}
});	

function include(arr,obj) {
    return (arr.indexOf(obj) != -1);
}

function activeInWindow(windowId){
	for(var i in activeWindows) {
		if(activeWindows[i] == windowId) {
			return true;
		}
	}
}

function checkAdvancedSettings(callback) {
	chrome.tabs.query({active: true}, function(tab){
		for(var i=0;i<advSettings.length;i++){
			console.log("Comparing:  "+advSettings[i].url+ " || "+tab[0].url);
			if(advSettings[i].url == tab[0].url) {
				console.log("Match.");
				return callback(advSettings[i]);
				break;
			}
		}
		callback(false);
	});
}

function assignAdvancedSettings(tabs, callback) {
	for(var y=0;y<tabs.length;y++){
		for(var i=0;i<advSettings.length;i++){
			console.log("Comparing:  "+advSettings[i].url+ " || "+tabs[y].url);
			if(advSettings[i].url == tabs[y].url) {
				console.log("Match.");
				tabs[y].reload = advSettings[i].reload;
				tabs[y].seconds = advSettings[i].seconds;
			}
		}	
	}
	return callback(false);
}

function assignBaseSettings(tabs, callback) {
	for(var i = 0;i<tabs.length;i++){
		tabs[i].reload = (tabs[i].reload || settings.reload);
		tabs[i].seconds = (tabs[i].seconds || settings.seconds);	
	};
	return callback;
}

function badgeTabs(text) {
	switch (text)
	{
	case 'on':
	// - Unicode character:  Dot - looks like play button. Color is green.
	  chrome.browserAction.setBadgeText({text:"\u2022"}); 
	  chrome.browserAction.setBadgeBackgroundColor({color:[0,255,0,100]});
	  break;
	case '':
	// - Unicode character:  X - looks like stop button.  Color is red.
	  chrome.browserAction.setBadgeText({text:"\u00D7"}); 
	  chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,100]});
	  break;
	default:
	// - Removes the unicode character, I don't understand the point of the default action here.
	  chrome.browserAction.setBadgeText({text:""});
	}
}

// Start on a specific window
function go(windowId) {
	if (settings.seconds) { timeDelay = (settings.seconds*1000);}
	moverInterval = setInterval(function() { moveTabIfIdle(); }, timeDelay);
        console.log('Starting: timeDelay:'+timeDelay+' reload:'+tabReload+' inactive:'+tabInactive);
	activeWindows.push(windowId);
	badgeTabs('on');
}

// Stop on a specific window
function stop(windowId) {
	clearInterval(moverInterval);
        console.log('Stopped.');
	var index = activeWindows.indexOf(windowId);
	if(index >= 0) {
		activeWindows.splice(index);
		badgeTabs('');
	}
}

function activateReloadAndCallback(tab){
	chrome.tabs.update(tab.id, {url: tab.url, highlighted: tab.highlighted}, null);
	chrome.tabs.onUpdated.addListener(function activateTabCallback(tabId, info){
		if(info.status === "completed" && tabId === tab.id) {
			chrome.tabs.onUpdated.removeListener(activateTabCallback);
			chrome.tabs.update(tabId, {highlighted: true});
		}
	});
}

// Switch Tab URL functionality.
function activateTab(tab) {
	checkAdvancedSettings(function(tabSetting){
		if(tabSetting){
			if(tabSetting.reload){
				activateReloadAndCallback(tab);
			}
		} else {
			if (tabReload && !include(noRefreshList, tab.url)) {
				activateReloadAndCallback(tab);
			} else {
				// Swich Tab right away
				chrome.tabs.update(tab.id, {selected: true});
			}	
		}
	});
}

// Call moveTab if the user isn't actually interacting with the browser
function moveTabIfIdle() {
	if (tabInactive) {
		// 15 is the lowest allowable number of seconds for this call
		// If you try lower, Chrome complains
		chrome.idle.queryState(15, function(state) {
			if(state == 'idle') {
				moveTab();
			} else {
				//Change text to pause button and color to yellow.
				chrome.browserAction.setBadgeText({text:"\u23F8"});
				chrome.browserAction.setBadgeBackgroundColor({color:[255,245,102,100]});
				console.log('Browser was active, waiting.');
			}
		});
	} else {
		moveTab();
	}
}

// Switches to next URL in manifest, re-requests feed if at end of manifest.
function moveTab() {
	for(var i in activeWindows) {
		windowId = activeWindows[i];
		badgeTabs('on');
		//ToDo:  Let's move this to its own function so it's not declared inside the loop.
		checkManifestIndex();
	}
}

function checkManifestIndex() {
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

function createTabsManifest(){
	chrome.tabs.query({}, function(tabs){
		tabsManifest = tabs;
		assignSettingsToTabs(tabs);
	});
}

function assignSettingsToTabs(tabs){
	assignAdvancedSettings(tabs, function(){
		assignBaseSettings(tabs, function(){
			return;
		});	
	});
}