/* global chrome */
// Global Variables - When possible pulling form Local Storage set via Options page.
var activeWindows = [],
	tabsManifest = [],
	settings = JSON.parse(localStorage["revolverSettings"]),
	advSettings = JSON.parse(localStorage["revolverAdvSettings"]),
	tabReload = false,
	tabInactive = false,
	tabAutostart = false,
	noRefreshList = [],
	windowId,
	moverTimeOut;

//probably a better way to default this.
badgeTabs('');

//Base Settings
if (settings.reload) tabReload = true;
if (settings.inactive) tabInactive = true; 
if (settings.autostart) tabAutostart = true; 
if (settings.noRefreshList) noRefreshList = settings.noRefreshList;

//Autostart function, procesed on initial startup.
if(tabAutostart) {
	chrome.tabs.query({'active': true}, function(tabs){
			createTabsManifest(tabs[0].windowId);
			//Start Revolver Tabs in main window.
			go(tabs[0].windowId);
		}
	);
}

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
	windowId = tab.windowId;
	createTabsManifest(windowId);
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

function grabTabSettings(tab, callback) {
	for(var i=0; i<tabsManifest.length; i++){
		if(tabsManifest[i].url === tab.url){
			return callback(tabsManifest[i]);
		}
	}
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
	return callback(false);
}

function assignBaseSettings(tabs, callback) {
	for(var i = 0;i<tabs.length;i++){
		tabs[i].reload = (tabs[i].reload || settings.reload);
		tabs[i].seconds = (tabs[i].seconds || settings.seconds);	
	};
	return callback;
}

//Change this to an if statement, default is red x.
function badgeTabs(text) {
	if(text === "on") {
		chrome.browserAction.setBadgeText({text:"\u2022"}); 
	  	chrome.browserAction.setBadgeBackgroundColor({color:[0,255,0,100]});
	} else 
	if (text === "pause"){
		chrome.browserAction.setBadgeText({text:"\u2022"});
		chrome.browserAction.setBadgeBackgroundColor({color:[255,238,0,100]});
	} else {
		chrome.browserAction.setBadgeText({text:"\u00D7"}); 
	 	chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,100]});
	}
}

// Start on a specific window
function go(windowId) {
	chrome.tabs.query({"windowId": windowId, "active": true}, function(tab){
		grabTabSettings(tab[0], function(tabSetting){
			console.log("setMoverTimeout 108");
			setMoverTimeout(tabSetting.seconds);
			activeWindows.push(windowId);
			badgeTabs('on');
		});	
	});
}

// Stop on a specific window
function stop(windowId) {
	clearTimeout(moverTimeOut);
        console.log('Stopped.');
	var index = activeWindows.indexOf(windowId);
	if(index >= 0) {
		activeWindows.splice(index);
		badgeTabs('');
	}
}

// Switch Tab URL functionality.
function activateTab(nextTab) {
	grabTabSettings(nextTab, function(tabSetting){
		if(tabSetting.reload && !include(noRefreshList, nextTab.url)){
			chrome.tabs.update(nextTab.id, {selected: true}, function(){
				chrome.tabs.reload(nextTab.id);
				console.log("setMoverTimeout 132");
				setMoverTimeout(tabSetting.seconds);
			});
		} else {
			// Swich Tab right away
			chrome.tabs.update(nextTab.id, {selected: true});
			console.log("setMoverTimeout 137");
			setMoverTimeout(tabSetting.seconds);
		}	
	});
}

// Call moveTab if the user isn't actually interacting with the browser
function moveTabIfIdle(tabTimeout) {
	clearTimeout(moverTimeOut);
	if (tabInactive) {
		// 15 is the lowest allowable number of seconds for this call
		chrome.idle.queryState(15, function(state) {
			if(state == 'idle') {
				return moveTab();
			} else {
				//Change text to play button and color to yellow.
				badgeTabs("pause");
				console.log('Browser was active, waiting.');
				if(tabTimeout) {
					return setMoverTimeout(tabTimeout);	
				} else {
					console.log("There was no tabTimeout assigned at line 160: "+tabTimeout);
				}
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

function createTabsManifest(windowId){
	chrome.tabs.query({"windowId" : windowId}, function(tabs){
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

function setMoverTimeout(seconds){
	var timeDelay = (parseInt(seconds)*1000);
	console.log('Starting: timeDelay:'+timeDelay+' reload:'+tabReload+' inactive:'+tabInactive);
	moverTimeOut = setTimeout(function() {
		console.log("timeout triggered.");
		moveTabIfIdle(seconds); 
	}, timeDelay);
}