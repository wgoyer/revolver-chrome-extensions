/* global chrome */
var bg = chrome.extension.getBackgroundPage();
// Saves options to localStorage.
function add_event_listeners(){
    restore_options();
    restore_advanced_options();
    build_current_tabs_list();
    document.querySelector('#save').addEventListener('click', save_options);
    document.querySelector('#savetop').addEventListener('click', save_options);
}

//Base options code (TODO:  Change settings to revolverSettings object)
function save_options() {
        localStorage["seconds"] = document.getElementById("seconds").value;
        bg.timeDelay = (document.getElementById("seconds").value*1000);
        if (document.getElementById("reload").checked == true) {
                localStorage["reload"] = 'true';
                bg.tabReload = true;
        } else {
                localStorage["reload"] = 'false';
                bg.tabReload = false;
        }
        if (document.getElementById("inactive").checked == true) {
                localStorage["inactive"] = 'true';
                bg.tabInactive = true;
        } else {
                localStorage["inactive"] = 'false';
                bg.tabInactive = false;
        }
	if (document.getElementById("autostart").checked == true) {
                localStorage["autostart"] = 'true';
                bg.tabInactive = true;
        } else {
                localStorage["autostart"] = 'false';
                bg.tabInactive = false;
        }
	localStorage["noRefreshList"] = JSON.stringify(document.getElementById('noRefreshList').value.split('\n'));
        bg.noRefreshList = document.getElementById('noRefreshList').value.split('\n');
  // Update status to let user know options were saved.
  var status = document.getElementById("status");
  var status2 = document.getElementById("status2");
  status.innerHTML = "OPTIONS SAVED";
  status2.innerHTML = "OPTIONS SAVED";
  setTimeout(function() {
    status.innerHTML = "";
    status2.innerHTML = "";
  }, 1000);
}
// Restores saved values from localStorage.
function restore_options() {
        if (localStorage["seconds"]) {
                document.getElementById("seconds").value = localStorage["seconds"];
        } else {
                document.getElementById("seconds").value = "10";
        }
        if (localStorage["reload"]) {
                if (localStorage["reload"] == 'true') {
                        document.getElementById("reload").checked = true;
                } else {
                        document.getElementById("reload").checked = false;
                }
        } else {
                document.getElementById("reload").checked = true;
        }
        if (localStorage["inactive"]) {
                if (localStorage["inactive"] == 'true') {
                        document.getElementById("inactive").checked = true;
                } else {
                        document.getElementById("inactive").checked = false;
                }
        } else {
                document.getElementById("inactive").checked = true;
        }
	if (localStorage["autostart"]) {
                if (localStorage["autostart"] == 'true') {
                        document.getElementById("autostart").checked = true;
                } else {
                        document.getElementById("autostart").checked = false;
                }
        } else {
                document.getElementById("autostart").checked = false;
        }
        if (localStorage["noRefreshList"]) {
                document.getElementById("noRefreshList").value = JSON.parse(localStorage["noRefreshList"]).join("\n");
        } else {
                document.getElementById("noRefreshList").value = "";
        }
}

//Advanced options code
function save_advanced_options(){
    var advUrlObjectArray = [],
        advancedSettings = document.getElementById("adv-settings"),
        advancedDivs = advancedSettings.getElementsByTagName("div"),
        divInputTags;
        for(var i = 0, checkboxes=0;i<advancedDivs.length;i++){
           if(advancedDivs[i].getElementsByClassName("enable")[0].checked == true){
               divInputTags = advancedDivs[i].getElementsByTagName("input");
                advUrlObjectArray.push({
                    "url" : advancedDivs[i].getElementsByClassName("url-text")[0].value,
                    "reload" : divInputTags[3].checked,
                    "seconds" : divInputTags[2].value,
                    "favIconUrl": advancedDivs[i].getElementsByClassName("icon")[0].src
                });               
           }
        }
        localStorage["revolverSettings"] = JSON.stringify(advUrlObjectArray);
}

function restore_advanced_options(){
    var settings = JSON.parse(localStorage["revolverSettings"]);
    if(settings.length>0){
        for(var i=0;i<settings.length;i++){
            generate_advanced_settings_html(settings[i], true);
        }    
    }
}

function generate_advanced_settings_html(tab, saved){
    var advancedSettings = document.getElementsByClassName("adv-settings")[0],
        enableHtmlChunk = '<div><input type="checkbox" class="enable" name="enable">',
        iconAndUrlChunk = '<img class="icon" src='+tab.favIconUrl+'\><input class="url-text" type="text" value="'+tab.url+'">',
        secondsChunk = '<p><label for="seconds">Seconds:</label> <input type="text" name="seconds" value="10" style="width:30px;">',
        reloadChunk = '<label class="inline" for="reload">Reload:</label> <input type="checkbox" name="reload"></p></div>';
        if(saved){ 
            enableHtmlChunk = '<div><input type="checkbox" class="enable" name="enable" checked>';
            secondsChunk = '<p><label for="seconds">Seconds:</label> <input type="text" name="seconds" value="'+tab.seconds+'" style="width:30px;">';
            if(tab.reload){
                reloadChunk = '<label class="inline" for="reload">Reload:</label> <input type="checkbox" name="reload" checked></p></div>';    
            } 
        }
        advancedSettings.innerHTML += enableHtmlChunk + iconAndUrlChunk + secondsChunk + reloadChunk;
};

function get_current_tabs(callback){
    var returnTabs=[];
    chrome.tabs.query({}, function(tabs){
       tabs.forEach(function(tab){
          if(tab.url.substring(0,16) != "chrome-extension"){
              returnTabs.push(tab);
          }
       });
       callback(returnTabs);
    });
}

function build_current_tabs_list(){ 
    get_current_tabs(function(allCurrentTabs){
        if(JSON.parse(localStorage["revolverSettings"]).length>0){
        compare_saved_and_current_urls(function(urls){
            for(var i=0;i<urls.length;i++){
                for(var y=0;y<allCurrentTabs.length;y++){
                    if(urls[i] === allCurrentTabs[y].url){
                        generate_advanced_settings_html(allCurrentTabs[y]);
                    }
                }
            } 
            create_advanced_save_button();
        });    
        } else {
            allCurrentTabs.forEach(function(tab) {
                generate_advanced_settings_html(tab);
            });
            create_advanced_save_button();
        }
    });
}

function compare_saved_and_current_urls(callback){
    var currentTabsUrls = [],
        savedTabsUrls = [],
        urlsToWrite = [];
        
    JSON.parse(localStorage["revolverSettings"]).forEach(function(save){
       savedTabsUrls.push(save.url); 
    });
    get_current_tabs(function(allCurrentTabs){
       for(var i=0;i<allCurrentTabs.length;i++){
         currentTabsUrls.push(allCurrentTabs[i].url);
       };
       for(var i=0;i<currentTabsUrls.length;i++){
            if(savedTabsUrls.indexOf(currentTabsUrls[i]) == -1){
                urlsToWrite.push(currentTabsUrls[i]);        
            }
       };
       callback(urlsToWrite);
    });
}

function create_advanced_save_button(){
    var parent = document.querySelector("#adv-settings"),
        advSaveButton = document.createElement("button"),
        advSaveIndicator = document.createElement("span");
    advSaveButton.setAttribute("id", "adv-save");
    advSaveButton.innerText = "Save";
    advSaveButton.addEventListener("click", save_advanced_options);
    advSaveIndicator.setAttribute("id", "status3");
    parent.appendChild(advSaveButton);
    parent.appendChild(advSaveIndicator); 
}

// Adding listeners for restoring and saving options
document.addEventListener('DOMContentLoaded', add_event_listeners);