window.browser = (function () {
    return window.msBrowser ||
        window.browser ||
        window.chrome;
})();

let ws = null;

browser.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        switch (request.type) {
            case "keep-alive":
                sendKeepAlive();
                break;
            case "cursor-update":
                sendCursorUpdate(request.x, request.y);
                break;
            case "logout":
                sendLogout();
                break;
        }
    }
);

//Catch URL changes
browser.tabs.onActivated.addListener((activeInfo) => {
    browser.tabs.get(activeInfo.tabId, async (tab) => {
        console.log("[INFO] Active tab changed to: " + tab.url)
        let skinId = await getSkinIdFromStorage();
        sendLogin(tab.url, skinId);
    });
});

browser.webNavigation.onCompleted.addListener(async (details) => {
    if (details.frameId === 0) {
        console.log("[INFO] Active tab url changed to:", details.url);
        let skinId = await getSkinIdFromStorage();
        sendLogin(details.url, skinId);
    }
});
//end-of catching URL changes


//Outgoing traffic
async function sendKeepAlive() {
    try {
        ws.send(JSON.stringify({ type: "keep-alive" }));
        console.log("[INFO] Sending a keep-alive!")
    } catch (error) {
        console.log("[ERROR] Tried sending a keep-alive but failed." + error)
    }
}

function sendCursorUpdate(x, y) {
    try {
        ws.send(JSON.stringify({ type: "cursor-update", x: x, y: y }));
        //console.log("[INFO] Sent a cursor-update: {x: " + x + " y: " + y + "}")
    } catch (error) {
        console.log("[ERROR] Tried sending a cursor-update but failed." + error)
    }
}

function sendLogin(url, skinId) {
    sendLogout();
    ws = new WebSocket("wss://alexinabox.de/wss/");

    //Register onmessage event handler
    ws.onmessage = function (message) {
        //parse the message
        var data = JSON.parse(message.data);
        //if the message is a cursor update
        if (data.type == "cursor-update") {
            //update the cursor
            informUpdateCursor(data.id, data.x, data.y);
        }
        //if the message is a new client
        if (data.type == "connected") {
            //add the client to the list
            informAddClient(data.id, data.skinId || 0);
        }
        //if the message is a client disconnect
        if (data.type == "disconnected") {
            //remove the client from the list
            informRemoveClient(data.id);
        }
    }

    //when the websocket connection is established
    ws.onopen = function () {
        //send a message to the server
        ws.send(JSON.stringify({ type: "login", room: url, skinId: skinId || 0 }));
    }
}

function sendLogout() {
    if (ws == null) {
        return;
    }
    ws.onmessage = null;
    ws.close();
    ws = null;
}
//end-of outgoing traffic



//Incomming traffic
async function informUpdateCursor(id, x, y) {
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    browser.tabs.sendMessage(tab.id, { type: "cursor-update", id: id, x: x, y: y });
    console.log("[INFO] Received cursor-update: { id: " + id + ", x: " + x + ", y: " + y + " }")
}

async function informAddClient(id, skinId) {
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    browser.tabs.sendMessage(tab.id, { type: "add-client", id: id, skinId: skinId });
    console.log("[INFO] Received add-client: { id: " + id + ", skinId: " + skinId + " }")
}

async function informRemoveClient(id) {
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    browser.tabs.sendMessage(tab.id, { type: "remove-client", id: id });
    console.log("[INFO] Received remove-client: { id: " + id + " }")
}
//end-of incomming traffic

//Storage
async function getSkinIdFromStorage() {
    let skinId;
    browser.storage.local.get("cursors.customization.skinId", function (result) {
        if (result["cursors.customization.skinId"]) {
            skinId = result["cursors.customization.skinId"];
        }
    });

    if (skinId == undefined) {
        return 0;
    }
    return skinId;
}
//end-of storage