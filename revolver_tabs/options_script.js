/* global chrome */
var bg = chrome.extension.getBackgroundPage();
// Saves options to localStorage.
function add_event_listeners(){
    build_current_tabs_list();
    document.querySelector('#save').addEventListener('click', save_options);
    document.querySelector('#savetop').addEventListener('click', save_options);
}

function save_advanced_options(){
    var advUriObjectArray = [],
        advancedSettings = document.getElementById("adv-settings"),
        advancedDivs = advancedSettings.getElementsByTagName("div"),
        divInputTags;
        for(var i = 0, checkboxes=0;i<advancedDivs.length;i++){
           if(advancedDivs[i].getElementsByClassName("enable")[0].checked == true){
               divInputTags = advancedDivs[i].getElementsByTagName("input");
            advUriObjectArray.push({
               "uri" : advancedDivs[i].innerText,
               "reload" : divInputTags[0],
               "seconds" : divInputTags[1]
            });               
           } 
           console.log(advUriObjectArray);
        }
}

//function restore_advanced_options(){
//    
//}


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

function generate_advanced_settings_html(tab){
    var advancedSettings = document.getElementsByClassName("adv-settings")[0],
        enableHtmlChunk = '<div><input type="checkbox" class="enable" name="'+tab.id+'_enable" id="'+tab.id+'_enable">',
        iconAndUriChunk = '<img class="icon" src='+tab.favIconUrl+'\>'+tab.url,
        secondsChunk = '<p><label for="seconds">Seconds:</label> <input type="text" name="seconds" id="'+tab.id+'_seconds" style="width:30px;">',
        reloadChunk = '<label class="inline" for="'+tab.id+'_reload">Reload:</label> <input type="checkbox" name="'+tab.id+'_reload" id="'+tab.id+'_reload"></p></div>';
        advancedSettings.innerHTML += enableHtmlChunk + iconAndUriChunk + secondsChunk + reloadChunk;
};

function build_current_tabs_list(){
    chrome.tabs.query({}, function(tabs){
       tabs.forEach(function(tab){
           if(tab.url.substring(0, 16)!="chrome-extension"){ 
            generate_advanced_settings_html(tab); 
           }
       });
       create_advanced_save_button(); 
    });
}

function create_advanced_save_button(){
//    document.getElementsByClassName("adv-settings")[0].innerHTML += '<button id="adv-save">Save</button><span id="status3"></span>';
    var parent = document.querySelector("#adv-settings"),
        advSaveButton = document.createElement('button'),
        advSaveIndicator = document.createElement('span');
    advSaveButton.setAttribute("id", "adv-save");
    advSaveButton.innerText = "Save";
    advSaveIndicator.setAttribute("id", "status3");
    advSaveButton.addEventListener('click', save_advanced_options);
    parent.appendChild(advSaveButton);
    parent.appendChild(advSaveIndicator);
  
}


// Adding listeners for restoring and saving options
document.addEventListener('DOMContentLoaded', add_event_listeners);