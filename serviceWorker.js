let ws = null;

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        switch (request.type) {
            case "cursor-update":
                ws.send(JSON.stringify({ type: "cursor-update", x: request.x, y: mousePosition.y }));
            case "login":
                if (ws == null) {
                    ws = new WebSocket("wss://alexinabox.de/wss/");
                }
                //when the websocket connection is established
                ws.onopen = function () {
                    //send a message to the server
                    ws.send(JSON.stringify({ type: "login", room: request.URL, skinId: request.skinId || 0 }));
                }
        }
    }
);