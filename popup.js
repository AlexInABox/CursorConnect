var counter = 0;
window.browser = (function () {
    return window.msBrowser ||
        window.browser ||
        window.chrome;
})();

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

async function askContentScriptForUserCount() {
    try {
        const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
        const response = await browser.tabs.sendMessage(tab.id, { type: "fetch-user-count" });

        updateCursorCounter(response);
    }
    catch (e) {
        // Handle the case where the content script was not injected
        console.log("Error: Content script not injected.");
        updateCursorCounter(0);
    }
}

// Call the askContentScriptForUserCount function at regular intervals
askContentScriptForUserCount();
setInterval(askContentScriptForUserCount, 1000);

function isLocalNetworkURL(url) {
    //remove the protocol
    url = url.replace(/.*?:\/\//g, "");
    //remove everything after the first slash or colon
    url = url.replace(/\/.*|:.*/g, "");
    // Regular expression to match IP addresses in the local network (private IP ranges)
    const localNetworkRegex = /^(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)/;
    return localNetworkRegex.test(url);
}

getBlacklistedStatus();
async function getBlacklistedStatus() {
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    const URL = tab.url;

    var blacklist = await browser.storage.local.get(["cursors.blacklist"]);
    console.log("blacklist: " + blacklist["cursors.blacklist"]);
    if (blacklist["cursors.blacklist"].includes(URL)) {
        console.log("blacklist contains url, setting to blacklisted");
        document.getElementById("switchDefaultState").id = "switchBlacklisted";
    } else if (URL.startsWith("http://") || URL.startsWith("https://") && !isLocalNetworkURL(URL)) {
        console.log("blacklist does not contain url, but url is valid, setting to whitelisted");
        document.getElementById("switchDefaultState").id = "switchWhitelisted";
    } else {
        console.log("blacklist does not contain url, but url is not valid, setting to disabled");
        document.getElementById("switchDefaultState").id = "switchBlacklisted";
    }
}

async function blackwhitelistWebsite() {
    // First, get the active tab to ensure the content script is injected
    // Second, look if the url is already in the blacklist by checking the local storage
    // Third, if it is in the blacklist, remove it from the blacklist
    // Fourth, if it is not in the blacklist, add it to the blacklist

    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    const URL = tab.url;

    var blacklist = await browser.storage.local.get(["cursors.blacklist"]);
    var changed = false;
    if (blacklist["cursors.blacklist"].includes(URL)) {
        // Remove the url from the blacklist
        var index = blacklist["cursors.blacklist"].indexOf(URL);
        if (index > -1) {
            blacklist["cursors.blacklist"].splice(index, 1);
        }
        await browser.storage.local.set({ "cursors.blacklist": blacklist["cursors.blacklist"] });
        document.getElementById("switchBlacklisted").id = "switchWhitelisted";
        changed = true;
    } else if ((!URL.startsWith("http://") && !URL.startsWith("https://")) || isLocalNetworkURL(URL)) {
        // Do nothing
    } else {
        // Add the url to the blacklist
        blacklist["cursors.blacklist"].push(URL);
        await browser.storage.local.set({ "cursors.blacklist": blacklist["cursors.blacklist"] });
        document.getElementById("switchWhitelisted").id = "switchBlacklisted";
        changed = true;
    }
    if (changed) {
        document.getElementById("refreshButton").style.display = "flex";
        document.getElementsByClassName("switchContainer")[0].style.justifyContent = "right";
    }
}

var blacklistToggleButton = document.getElementById("switchButton");
blacklistToggleButton.addEventListener("click", blackwhitelistWebsite);

var refreshButton = document.getElementById("refreshButton");
refreshButton.addEventListener("click", async function () {
    //refrsh the page
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });

    browser.tabs.reload(tab.id);
    window.close();
});


var customizationButtons = document.getElementsByClassName("customizationElement");
for (let i = 0; i < customizationButtons.length; i++) {
    image = customizationButtons[i].children[0];
    imageSource = image.src; //browser-extension://mnaknebffpoaobpghjjpmlpdpjmnbfnc/customization/cursors/0.png
    imageSource = imageSource.substring(imageSource.lastIndexOf("/") + 1, imageSource.lastIndexOf("."));
    customizationButtons[i].addEventListener("click", applyCustomization.bind(null, imageSource));
}

function applyCustomization(id) {
    console.log("applyCustomization: " + id);

    //Write the skinId to the local storage
    browser.storage.local.set({ "cursors.customization.skinId": id }, function () {
        if (browser.runtime.lastError) {
            // Catch the error here
            console.log("Error: " + browser.runtime.lastError);
        }
        document.getElementById("refreshButton").style.display = "flex";
        document.getElementsByClassName("switchContainer")[0].style.justifyContent = "right";
        console.log("Set skinId to " + id);
    });
}

function getActiveSkin() {
    browser.storage.local.get("cursors.customization.skinId", function (result) {
        if (result["cursors.customization.skinId"]) {
            var skinId = result["cursors.customization.skinId"];
            if (skinId) {
                console.log("getActiveSkin: skinId: " + skinId);
                var customizationButtons = document.getElementsByClassName("customizationElement");
                for (let i = 0; i < customizationButtons.length; i++) {
                    image = customizationButtons[i].children[0];
                    imageSource = image.src; //browser-extension://mnaknebffpoaobpghjjpmlpdpjmnbfnc/customization/cursors/0.png
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
                imageSource = image.src; //browser-extension://mnaknebffpoaobpghjjpmlpdpjmnbfnc/customization/cursors/0.png
                imageSource = imageSource.substring(imageSource.lastIndexOf("/") + 1, imageSource.lastIndexOf("."));
                if (imageSource == 0) {
                    customizationButtons[i].classList.add("active");
                }
            }
        }
    });
}
getActiveSkin();