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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function isURLBlacklisted(URL) {
    let blacklist = await browser.storage.local.get(["cursors.blacklist"]);
    if (!blacklist["cursors.blacklist"]) {
        console.log("cursors: contentScript.js: blacklist not found. Creating blacklist...");
        await browser.storage.local.set({ "cursors.blacklist": [] });
        blacklist = await browser.storage.local.get(["cursors.blacklist"]);
    }

    return (blacklist["cursors.blacklist"].includes(URL));
}

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

function injectCSS() {
    var alreadyInjected = document.getElementById("CursorConnectUniqueCSSStyle");

    if (!alreadyInjected) {
        //create a new style element
        var style = document.createElement("style");
        style.id = "CursorConnectUniqueCSSStyle";
        //set the style element content
        style.innerHTML = `
        .CursorConnectUniqueCSSClass {
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

        //console.log("cursorConnect: injected css into: " + URL);
    }
}

function animateCursor(cursor, targetX, targetY) {
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

function addClient(id, skinId) {
    connectedUserCounter++;

    //create a new cursor element
    var cursor = document.createElement("img");
    cursor.id = id;
    cursor.className = "CursorConnectUniqueCSSClass";

    try {
        cursor.src = browser.runtime.getURL("customization/cursors/" + skinId + ".png");
    }
    catch (e) {
        cursor.src = browser.runtime.getURL("customization/cursors/0.png");
    }
    //add the cursor to the page
    document.body.appendChild(cursor);
}

function removeClient(id) {
    //remove the cursor from the page
    connectedUserCounter--;

    document.body.removeChild(document.getElementById(id));
}

function updateCursor(id, x, y) {
    // Get the cursor element
    var cursor = document.getElementById(id);

    // Padding to keep the cursor slightly away from the edges
    const padding = 32;

    // Get viewport dimensions and positions
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + viewportHeight - padding;
    const viewportLeft = scrollLeft;
    const viewportRight = scrollLeft + viewportWidth - padding;

    // Determine if the cursor is out of bounds vertically or horizontally
    const isInVerticalBounds = y >= viewportTop && y <= viewportBottom;
    const isInHorizontalBounds = x >= viewportLeft && x <= viewportRight;

    if (isInVerticalBounds && isInHorizontalBounds) {
        // If the target is within both vertical and horizontal bounds, animate the cursor
        cursor.style.opacity = '1'; // Unhide the cursor
        animateCursor(cursor, x, y);
    } else {
        // Initialize stale positions with the current target position
        let staleX = x;
        let staleY = y;

        // Check vertical bounds and adjust staleY if needed
        if (y < viewportTop) {
            staleY = viewportTop;
        } else if (y > viewportBottom) {
            staleY = viewportBottom;
        }

        // Check horizontal bounds and adjust staleX if needed
        if (x < viewportLeft) {
            staleX = viewportLeft;
        } else if (x > viewportRight) {
            staleX = viewportRight;
        }

        // Update cursor position and hide it
        cursor.style.left = `${staleX}px`;
        cursor.style.top = `${staleY}px`;
        cursor.style.animation = 'none';
        cursor.style.opacity = '0'; // Hide the cursor
    }

}



window.addEventListener("load", () => {
    (async () => {
        try {
            chrome.runtime.sendMessage({ type: "logout" });
            await sleep(2000); // This might circumvent some random URL changes or security policies for now
            main();
        } catch (error) {
            console.error("Error in isolated async logic:", error);
        }
    })();
});

async function main() {
    let URL = window.location.toString();
    if (isLocalNetworkURL(URL)) {
        return;
    }

    if (await isURLBlacklisted()) {
        return;
    }

    var skinId = await getSkinIdFromStorage();

    let mousePosition = {
        x: -2000,
        y: -2000,
        lastX: -2000,
        lastY: -2000
    };

    window.addEventListener('mousemove', (event) => {
        //get the cursor position
        mousePosition.x = event.pageX;
        mousePosition.y = event.pageY;
    });

    window.addEventListener('beforeunload', (event) => {
        //terminate the websocket before leaving the page
        chrome.runtime.sendMessage({ type: "logout" });
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

    injectCSS();

    //send cursor position every 10ms
    setInterval(function () {
        if (mousePosition.lastX == mousePosition.x && mousePosition.lastY == mousePosition.y) { //if the cursor position hasn't changed
            return;
        }
        mousePosition.lastX = mousePosition.x;
        mousePosition.lastY = mousePosition.y;
        //send the cursor position to the server
        chrome.runtime.sendMessage({ type: "cursor-update", x: mousePosition.x, y: mousePosition.y });

    }, 20); //10ms is 100 times per second. This is a good balance between smoothness and performance. Human eyes cant notice anything that has been less than 13ms on the screen.

    setInterval(function () {
        chrome.runtime.sendMessage({ type: "keep-alive" });
    }, 10000);
}

var connectedUserCounter = 0;
browser.runtime.onMessage.addListener((obj, sender, response) => {
    if (obj.type == "fetch-user-count") {
        response(connectedUserCounter);
    }
});

browser.runtime.onMessage.addListener((obj, sender, response) => {
    if (obj.type == "cursor-update") {
        updateCursor(obj.id, obj.x, obj.y);
    }
});

browser.runtime.onMessage.addListener((obj, sender, response) => {
    if (obj.type == "add-client") {
        addClient(obj.id, obj.skinId);
    }
});

browser.runtime.onMessage.addListener((obj, sender, response) => {
    if (obj.type == "remove-client") {
        removeClient(obj.id);
    }
});