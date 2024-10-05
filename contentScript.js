window.browser = (function () {
    return window.msBrowser ||
        window.browser ||
        window.chrome;
})();

// TODO: Check if url changed by checking every second. DONT ASK THE BROWSER TO TELL YOU (permission)...

function isLocalNetworkURL(url) {
    //remove the protocol
    url = url.replace(/.*?:\/\//g, "");
    //remove everything after the first slash or colon
    url = url.replace(/\/.*|:.*/g, "");
    // Regular expression to match IP addresses in the local network (private IP ranges)
    const localNetworkRegex = /^(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)/;
    return localNetworkRegex.test(url);
}

(async () => {
    let URL = window.location.toString();
    console.log("cursors: contentScript.js: URL: " + URL);

    if (isLocalNetworkURL(URL)) {
        console.log("cursors: contentScript.js: URL is on the local-network. Exiting...");
        return;
    }

    //check if the url is in the blacklist
    let blacklist = await browser.storage.local.get(["cursors.blacklist"]);
    if (!blacklist["cursors.blacklist"]) {
        console.log("cursors: contentScript.js: blacklist not found. Creating blacklist...");
        await browser.storage.local.set({ "cursors.blacklist": [] });
        blacklist = await browser.storage.local.get(["cursors.blacklist"]);
    }

    console.log("cursors: contentScript.js: blacklist: " + blacklist["cursors.blacklist"]);
    if (blacklist["cursors.blacklist"].includes(URL)) {
        console.log("contentScript.js: " + URL + " is blacklisted.");
        return;
    }

    var skinId = 0;
    browser.storage.local.get("cursors.customization.skinId", function (result) {
        if (result["cursors.customization.skinId"]) {
            console.log("cursors: contentScript.js: user has customization");
            skinId = result["cursors.customization.skinId"];
            if (skinId) {
                console.log("cursors: contentScript.js: skinId: " + skinId);
            }
        }
    });

    let mousePosition = {
        x: -2000,
        y: -2000
    };
    let cursorUserCounter = 0;


    browser.runtime.onMessage.addListener((obj, sender, response) => {
        if (obj.type == "fetch-user-count") {
            console.log("cursors: fetch-user-count: " + cursorUserCounter);
            response(cursorUserCounter);
        }
    });

    window.addEventListener('mousemove', (event) => {
        //get the cursor position
        mousePosition.x = event.pageX;
        mousePosition.y = event.pageY;
    });

    var previousDistanceToBoundaryX = document.documentElement.scrollLeft;
    var previousDistanceToBoundaryY = document.documentElement.scrollTop;
    window.addEventListener('scroll', (event) => {
        //During a scroll event the mouse position is not updated. We need to update it manually by adding the distance we have scrolled to the mouse position.
        mousePosition.x += (document.documentElement.scrollLeft - previousDistanceToBoundaryX);
        mousePosition.y += (document.documentElement.scrollTop - previousDistanceToBoundaryY);

        previousDistanceToBoundaryX = document.documentElement.scrollLeft;
        previousDistanceToBoundaryY = document.documentElement.scrollTop;
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

    let ws; //websocket connection

    const connectToWebSocket = () => {
        ws = new WebSocket("wss://alexinabox.de/wss/");

        //when the websocket connection is established
        ws.onopen = function () {
            //send a message to the server
            ws.send(JSON.stringify({ type: "login", room: URL, skinId: skinId || 0 }));
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
                addClient(data.id, data.skinId || 0);
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

        }, 20); //10ms is 100 times per second. This is a good balance between smoothness and performance. Human eyes cant notice anything that has been less than 13ms on the screen.

        ws.onclose = function (event) {

            cursorUserCounter = 0;
            clearInterval(keepaliveInterval);

            console.log("cursors: websocket closed for reason: " + event.code);
        }

        ws.onerror = function (error) {

            cursorUserCounter = 0;
            clearInterval(keepaliveInterval);

            console.log("cursors: We ran into an WebSocket related error. No need to alarm google tho...");
        }

        //send keepalive message every 15 seconds
        const keepaliveInterval = setInterval(function () {
            ws.send(JSON.stringify({ type: "keepalive" }));
        }, 15000);
    }

    const addClient = (id, skinId) => {
        console.log("contentScript.js: addClient: adding client with id: " + id + " and skinId: " + skinId);

        cursorUserCounter++;

        //create a new cursor element
        var cursor = document.createElement("img");
        cursor.id = id;
        cursor.className = "cursor";

        try {
            cursor.src = browser.runtime.getURL("customization/cursors/" + skinId + ".png");
        }
        catch (e) {
            cursor.src = browser.runtime.getURL("customization/cursors/0.png");
        }


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
        //cursor.style.transition = 'transform 0.1s ease'; // Adjust the transition duration as needed
        //cursor.style.transform = `translate(${x}px, ${y}px)`;

        animateCursor(cursor, x, y); // TODO: Add ability to disable animation or auto-disable if cpu usage is too high
    }

    const animateCursor = (cursor, targetX, targetY) => {
        const animationDuration = 60; // Adjust the duration as needed (in milliseconds)
        const startTime = performance.now();
        const startX = parseFloat(cursor.style.left || 0);
        const startY = parseFloat(cursor.style.top || 0);

        const animate = (currentTime) => {
            const progress = (currentTime - startTime) / animationDuration;

            if (progress < 1) {
                const newX = startX + (targetX - startX) * progress;
                const newY = startY + (targetY - startY) * progress;
                cursor.style.left = newX + 'px';
                cursor.style.top = newY + 'px';
                requestAnimationFrame(animate);
            } else {
                cursor.style.left = targetX + 'px';
                cursor.style.top = targetY + 'px';
            }
        };

        requestAnimationFrame(animate);

        //Reset opacity
        // Temporarily remove the class to restart the animation
        cursor.style.animation = 'none';

        // Force a reflow, so the browser picks up the change
        cursor.offsetHeight; // This triggers a reflow

        // Reapply the animation
        cursor.style.animation = '';
    };


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
            transform: translate(-33%, -23%);
            left: -2000px;
            top: -2000px;
            pointer-events: none;
            width: 40px;
            z-index: 999999;
            opacity: 1;
            animation: fadeOut 10s forwards cubic-bezier(1,0,.8,.35);
        }

        @keyframes fadeOut {
            0% {
                opacity: 1;
            }
            100% {
                opacity: 0;
            }
        }
        `;
            //add the style element to the page

            document.head.appendChild(style);

            console.log("cursorConnect: injected css into: " + URL);
        }
    }

    terminatePreviousWebSocket();
    console.log("cursors: contentScript.js: readyState: " + document.readyState);
    if (document.readyState == "complete") {
        injectCSS();
        connectToWebSocket();
    } else {
        window.onload = () => {
            injectCSS();
            connectToWebSocket();
        };
    }

    setInterval(function () {
        if (window.location.toString() != URL) {
            URL = window.location.toString();
            console.log("cursors: contentScript.js: URL changed to: " + URL);
            terminatePreviousWebSocket();
            injectCSS();
            connectToWebSocket();
        }
    }, 1000);
})();
