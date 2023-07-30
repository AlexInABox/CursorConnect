(() => {
    let URL;

    let mousePosition = {
        x: -2000,
        y: -2000
    };

    let cursorUserCounter = 0;

    chrome.runtime.onMessage.addListener((obj, sender, response) => {
        if (obj.type == "new-url") {
            URL = obj.url;
            logThisMessage();
            terminatePreviousWebSocket();
            injectCSS();
            connectToWebSocket();
            response(200);
        } else if (obj.type == "fetch-user-count") {
            response(cursorUserCounter);
        }
    });

    window.addEventListener('mousemove', (event) => {
        //get the cursor position
        mousePosition.x = event.clientX;
        mousePosition.y = event.clientY;
    });

    const terminatePreviousWebSocket = () => {
        if (ws) {
            try {
                ws.close();
            } catch (e) {
                console.log("contentScript.js: terminatePreviousWebSocket: " + e);
            }
        }
    };

    const logThisMessage = () => {
        console.log("contentScript.js: " + URL);
    };

    let ws; //websocket connection

    const connectToWebSocket = () => {
        ws = new WebSocket("wss://node.alexinabox.de:2053");

        //when the websocket connection is established
        ws.onopen = function () {
            //send a message to the server
            ws.send(JSON.stringify({ type: "login", room: URL }));
        }

        //when the websocket receives a message
        ws.onmessage = function (message) {
            //parse the message
            var data = JSON.parse(message.data);
            //if the message is a cursor update
            if (data.type == "cursor-update") {
                //update the cursor
                updateCursor(data.id, data.x, data.y);
            }
            //if the message is a new client
            if (data.type == "connected") {
                //add the client to the list
                addClient(data.id);
            }
            //if the message is a client disconnect
            if (data.type == "disconnected") {
                //remove the client from the list
                removeClient(data.id);
            }
        }

        //send cursor position every 10ms
        var lastX = -2000;
        var lastY = -2000;
        setInterval(function () {
            if (lastX == mousePosition.x && lastY == mousePosition.y || ws.readyState != 1) { //if the cursor position hasn't changed or the websocket isn't open
                return;
            }
            lastX = mousePosition.x;
            lastY = mousePosition.y;
            //send the cursor position to the server
            try {
                ws.send(JSON.stringify({ type: "cursor-update", x: lastX, y: lastY }));
            } catch (error) {
                console.log("cursors: We ran into an WebSocket related error when sendin a message. No need to alarm google tho... Here: " + String(error));
            }

        }, 20);

        ws.onclose = function (event) {

            cursorUserCounter = 0;

            console.log("cursors: websocket closed for reason: " + event.code);
        }

        ws.onerror = function (error) {

            cursorUserCounter = 0;

            console.log("cursors: We ran into an WebSocket related error. No need to alarm google tho...");
        }
    }

    const addClient = (id) => {
        console.log("contentScript.js: addClient: id: " + id);

        cursorUserCounter++;

        //create a new cursor by taking the cursor.png image
        var cursor = document.createElement("img");
        cursor.id = id;
        cursor.className = "cursor";
        cursor.src = chrome.runtime.getURL("assets/cursor.png");

        //add the cursor to the page
        document.body.appendChild(cursor);
    }

    const removeClient = (id) => {
        //remove the cursor from the page
        cursorUserCounter--;

        document.body.removeChild(document.getElementById(id));
    }

    const updateCursor = (id, x, y) => {
        //get the cursor
        var cursor = document.getElementById(id);
        //update the cursor position
        cursor.style.left = x + "px";
        cursor.style.top = y + "px";
    }

    const injectCSS = () => {
        var alreadyInjected = document.getElementById("multiCursorStyle");

        if (!alreadyInjected) {
            //create a new style element
            var style = document.createElement("style");
            style.id = "multiCursorStyle";
            //set the style element content
            style.innerHTML = `
        .cursor {
            position: absolute;
            transform: translate(-3%, -4%);
            left: -2000px;
            top: -2000px;
            pointer-events: none;
            width: 40px;
        }
        `;
            //add the style element to the page

            document.head.appendChild(style);

            console.log("cursors: injected css into: " + URL);
        }
    }
})();
