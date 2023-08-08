var counter = 0;


function handleTickInit(tick) {

    //wait 1 sec before updating
    //setTimeout(function () { }, 1000);
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
                } else {
                    // Handle the case where the content script was not injected
                    console.log("Error: Content script not injected.");
                    updateCursorCounter(0);
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
    console.log("getBlacklistedStatus");
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
                    if (blacklist.includes(url)) {
                        console.log("blacklist contains url, setting to blacklisted");
                        document.getElementById("switchDefaultState").id = "switchBlacklisted";
                    } else if (url.startsWith("http://") || url.startsWith("https://")) {
                        console.log("blacklist does not contain url, but url is valid, setting to whitelisted");
                        document.getElementById("switchDefaultState").id = "switchWhitelisted";
                    } else {
                        console.log("blacklist does not contain url, and url is not valid, setting to disabled");
                        document.getElementById("switchDefaultState").id = "switchBlacklisted";
                    }
                } else {
                    if (url.startsWith("http://") || url.startsWith("https://")) {
                        console.log("blacklist does not exist, but url is valid, setting to whitelisted");
                        document.getElementById("switchDefaultState").id = "switchWhitelisted";
                    } else {
                        console.log("blacklist does not exist, and url is not valid, setting to disabled");
                        document.getElementById("switchDefaultState").id = "switchBlacklisted";
                    }
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
                    console.log("blacklist does not exist, creating it");
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


var customizationButtons = document.getElementsByClassName("customizationElement");
for (let i = 0; i < customizationButtons.length; i++) {
    image = customizationButtons[i].children[0];
    imageSource = image.src; //chrome-extension://mnaknebffpoaobpghjjpmlpdpjmnbfnc/customization/cursors/0.png
    imageSource = imageSource.substring(imageSource.lastIndexOf("/") + 1, imageSource.lastIndexOf("."));
    customizationButtons[i].addEventListener("click", applyCustomization.bind(null, imageSource));
}

function applyCustomization(id) {
    console.log("applyCustomization: " + id);

    //Write the skinId to the local storage
    chrome.storage.local.set({ "cursors.customization.skinId": id }, function () {
        if (chrome.runtime.lastError) {
            // Catch the error here
            console.log("Error: " + chrome.runtime.lastError);
        }
        document.getElementById("refreshButton").style.display = "flex";
        document.getElementsByClassName("switchContainer")[0].style.justifyContent = "right";
        console.log("Set skinId to " + id);
    });
}

function getActiveSkin() {
    chrome.storage.local.get("cursors.customization.skinId", function (result) {
        if (result["cursors.customization.skinId"]) {
            var skinId = result["cursors.customization.skinId"];
            if (skinId) {
                console.log("getActiveSkin: skinId: " + skinId);
                var customizationButtons = document.getElementsByClassName("customizationElement");
                for (let i = 0; i < customizationButtons.length; i++) {
                    image = customizationButtons[i].children[0];
                    imageSource = image.src; //chrome-extension://mnaknebffpoaobpghjjpmlpdpjmnbfnc/customization/cursors/0.png
                    imageSource = imageSource.substring(imageSource.lastIndexOf("/") + 1, imageSource.lastIndexOf("."));
                    if (imageSource == skinId) {
                        customizationButtons[i].classList.add("active");
                    }
                }
            }
        } else {
            console.log("getActiveSkin: skinId does not exist therefore the default skin is active");
            var customizationButtons = document.getElementsByClassName("customizationElement");
            for (let i = 0; i < customizationButtons.length; i++) {
                image = customizationButtons[i].children[0];
                imageSource = image.src; //chrome-extension://mnaknebffpoaobpghjjpmlpdpjmnbfnc/customization/cursors/0.png
                imageSource = imageSource.substring(imageSource.lastIndexOf("/") + 1, imageSource.lastIndexOf("."));
                if (imageSource == 0) {
                    customizationButtons[i].classList.add("active");
                }
            }
        }
    });
}
getActiveSkin();