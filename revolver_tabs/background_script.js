/* global chrome */
// Global Variables - When possible pulling form Local Storage set via Options page.
var activeWindows = [],
	settings = JSON.parse(localStorage["revolverSettings"]),
	advSettings = JSON.parse(localStorage["revolverAdvSettings"]),
	timeDelay = 10000,
	tabReload = false,
	tabInactive = false,
	tabAutostart = false,
	noRefreshList = [],
	badgeColor = [139,137,137,137];
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
			//Start Revolver Tabs in main window.
			go(tabs[0].windowId);
		}
	);
}

// Setup Initial Badge Text
chrome.browserAction.setBadgeBackgroundColor({color: badgeColor});

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
	var windowId = tab.windowId;
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

function badgeTabs(windowId, text) {
	chrome.tabs.getAllInWindow(windowId, function(tabs) {
		for(var i in tabs) {
			switch (text)
			{
			case 'on':
			  chrome.browserAction.setBadgeText({text:"\u2022"});
			  chrome.browserAction.setBadgeBackgroundColor({color:[0,255,0,100]});
			  break;
			case '':
			  chrome.browserAction.setBadgeText({text:"\u00D7"});
			  chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,100]});
			  break;
			default:
			  chrome.browserAction.setBadgeText({text:""});
			}
		}	
	});
}

// Start on a specific window
function go(windowId) {
	if (settings.seconds) { timeDelay = (settings.seconds*1000);}
	var moverInteval = setInterval(function() { moveTabIfIdle() }, timeDelay);
        console.log('Starting: timeDelay:'+timeDelay+' reload:'+tabReload+' inactive:'+tabInactive);
	activeWindows.push(windowId);
	badgeTabs(windowId, 'on');
}

// Stop on a specific window
function stop(windowId) {
	clearInterval(moverInteval);
        console.log('Stopped.');
	var index = activeWindows.indexOf(windowId);
	if(index >= 0) {
		activeWindows.splice(index);
		badgeTabs(windowId, '');
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
//				chrome.tabs.update(tab.id, {url: tab.url, selected: tab.selected}, null);
			}
		} else {
			if (tabReload && !include(noRefreshList, tab.url)) {
				activateReloadAndCallback(tab);
				// Trigger a reload
//				chrome.tabs.update(tab.id, {url: tab.url, selected: tab.selected}, null);
//				// Add a callback to swich tabs after the reload is complete
//				chrome.tabs.onUpdated.addListener(
//				function activateTabCallback( tabId , info ) {
//		    		if ( info.status == "complete" && tabId == tab.id) {
//						chrome.tabs.onUpdated.removeListener(activateTabCallback);
//		        		chrome.tabs.update(tabId, {selected: true});
//		    		}
//				});
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
				//Set "wait" color and log.
				chrome.browserAction.setBadgeText({text:"\u2022"});
				chrome.browserAction.setBadgeBackgroundColor({color:[0,0,255,100]});
				console.log('Browser was active, waiting.');
			}
		});
	} else {
		moveTab();
	}
}

// Switches to next URL in manifest, re-requests feed if at end of manifest.
function moveTab() {
	for(i in activeWindows) {
		windowId = activeWindows[i];
		badgeTabs(windowId, 'on');
		chrome.tabs.getSelected(windowId, function(currentTab){
			chrome.tabs.getAllInWindow(currentTab.windowId, function(tabs) {
				nextTabIndex = 0;
				if(currentTab.index + 1 < tabs.length) {
					nextTabIndex = currentTab.index + 1;
				}
				activateTab(tabs[nextTabIndex]);
			});
		});
	}
}