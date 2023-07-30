var counter = 0;


function handleTickInit(tick) {
    tick.value = 0;

    //wait 1 sec before updating
    setTimeout(function () { }, 1000);
}

function updateCursorCounter(value) {
    var tick = document.getElementsByClassName("tick");
    for (let i = 0; i < tick.length; i++) {
        tick[i].setAttribute("data-value", value);
    }
    counter = value;
}

function sendMessageToContentScript() {
    // First, get the active tab to ensure the content script is injected
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0] && tabs[0].id) {
            // Try to send the message to the content script
            chrome.tabs.sendMessage(tabs[0].id, { type: "fetch-user-count" }, function (response) {
                if (chrome.runtime.lastError) {
                    // If an error occurred during message sending, handle it here
                    console.log("Error sending message:", chrome.runtime.lastError);
                    updateCursorCounter(0);
                } else if (response) {
                    // Process the response if available
                    updateCursorCounter(response);
                }
            });
        } else {
            // Handle the case where the active tab is not accessible (e.g., browser settings)
            console.log("Error: Unable to access the active tab.");
            updateCursorCounter(0);
        }
    });
}

// Call the sendMessageToContentScript function at regular intervals
sendMessageToContentScript();
setInterval(sendMessageToContentScript, 1000);

getBlacklistedStatus();
function getBlacklistedStatus() {
    // First, get the active tab to ensure the content script is injected
    // Second, look if the url is already in the blacklist by checking the local storage
    // Third, if it is in the blacklist set the button to blacklisted
    // Fourth, if it is not in the blacklist set the button to whitelisted

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0] && tabs[0].id && tabs[0].url) {
            var url = tabs[0].url;
            chrome.storage.local.get("cursors.blacklist", function (result) {
                if (result["cursors.blacklist"]) {
                    var blacklist = result["cursors.blacklist"];
                    if (blacklist.includes(url) || !(url.startsWith("http://") || url.startsWith("https://"))) {
                        document.getElementById("switchDefaultState").id = "switchBlacklisted";
                    } else {
                        document.getElementById("switchDefaultState").id = "switchWhitelisted";
                    }
                } else {
                    document.getElementById("switchDefaultState").id = "switchBlacklisted";
                }
            });
        } else {
            // Handle the case where the active tab is not accessible (e.g., browser settings)
            console.log("Error: Unable to access the active tab.");
        }
    });
}

function blackwhitelistWebsite() {
    // First, get the active tab to ensure the content script is injected
    // Second, look if the url is already in the blacklist by checking the local storage
    // Third, if it is in the blacklist, remove it from the blacklist
    // Fourth, if it is not in the blacklist, add it to the blacklist

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0] && tabs[0].id && tabs[0].url) {
            var url = tabs[0].url;
            chrome.storage.local.get("cursors.blacklist", function (result) {
                var changed = false;
                if (result["cursors.blacklist"]) {
                    var blacklist = result["cursors.blacklist"];
                    if (blacklist.includes(url) && (url.startsWith("http://") || url.startsWith("https://"))) {
                        // Remove the url from the blacklist
                        var index = blacklist.indexOf(url);
                        if (index > -1) {
                            blacklist.splice(index, 1);
                        }
                        chrome.storage.local.set({ "cursors.blacklist": blacklist }, function () {
                            console.log("Removed " + url + " from blacklist.");
                        });

                        document.getElementById("switchBlacklisted").id = "switchWhitelisted";
                        changed = true;
                    } else if ((url.startsWith("http://") || url.startsWith("https://"))) {
                        // Add the url to the blacklist
                        blacklist.push(url);
                        chrome.storage.local.set({ "cursors.blacklist": blacklist }, function () {
                            console.log("Added " + url + " to blacklist.");
                        });

                        document.getElementById("switchWhitelisted").id = "switchBlacklisted";
                        changed = true;
                    }
                } else if (url.startsWith("http://") || url.startsWith("https://")) {
                    // Add the url to the blacklist
                    var blacklist = [];
                    blacklist.push(url);
                    chrome.storage.local.set({ "cursors.blacklist": blacklist }, function () {
                        console.log("Added " + url + " to blacklist.");
                    });

                    document.getElementById("switchWhitelisted").id = "switchBlacklisted";
                    changed = true;
                }
                if (changed) {
                    document.getElementById("refreshButton").style.display = "flex";
                    document.getElementsByClassName("switchContainer")[0].style.justifyContent = "right";
                }
            });
        } else {
            // Handle the case where the active tab is not accessible (e.g., browser settings)
            console.log("Error: Unable to access the active tab.");
        }
    });
}

var blacklistToggleButton = document.getElementById("switchButton");
blacklistToggleButton.addEventListener("click", blackwhitelistWebsite);

var refreshButton = document.getElementById("refreshButton");
refreshButton.addEventListener("click", function () {
    //refrsh the page
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0] && tabs[0].id) {
            chrome.tabs.reload(tabs[0].id);
        } else {
            // Handle the case where the active tab is not accessible (e.g., browser settings)
            console.log("Error: Unable to access the active tab.");
        }
    });
    window.close();
});
