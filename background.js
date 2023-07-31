function isLocalNetworkURL(url) {
    //remove the protocol
    url = url.replace(/.*?:\/\//g, "");
    //remove everything after the first slash or colon
    url = url.replace(/\/.*|:.*/g, "");
    // Regular expression to match IP addresses in the local network (private IP ranges)
    const localNetworkRegex = /^(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)/;
    console.log("background.js: isLocalNetworkURL: " + url + " " + localNetworkRegex.test(url));
    return localNetworkRegex.test(url);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the page loading is complete (status is "complete")
    if (changeInfo.status === "complete") {
        console.log("background.js: " + tab.url);

        // Check if the URL is valid and not on the local network
        if (tab.url && (tab.url.startsWith("http://") || tab.url.startsWith("https://")) && !isLocalNetworkURL(tab.url)) {

            //check if the url is in the blacklist
            chrome.storage.local.get("cursors.blacklist", function (result) {
                if (result["cursors.blacklist"]) {
                    var blacklist = result["cursors.blacklist"];
                    if (blacklist.includes(tab.url)) {
                        console.log("background.js: " + tab.url + " is blacklisted.");
                    } else {
                        console.log("background.js: " + tab.url + " is not blacklisted.");


                        console.log("background.js: fired:" + tab.url);
                        chrome.tabs.sendMessage(tabId, {
                            type: "new-url",
                            url: tab.url
                        }, function (response) {
                            if (chrome.runtime.lastError) {
                                // Catch the error here
                            } else {
                                // Handle the response from the content script (if any)
                                console.log("Message sent successfully!");
                            }
                        });
                    }
                } else {
                    console.log("background.js: " + tab.url + " is not blacklisted.");

                    console.log("background.js: fired:" + tab.url);
                    chrome.tabs.sendMessage(tabId, {
                        type: "new-url",
                        url: tab.url
                    }, function (response) {
                        if (chrome.runtime.lastError) {
                            // Catch the error here
                        } else {
                            // Handle the response from the content script (if any)
                            console.log("Message sent successfully!");
                        }
                    });
                }
            });
        }
    }
});
