const ip = document.getElementById("ip").value;
const port = document.getElementById("port").value;
const loader = document.getElementById("loader");
let user = document.getElementById("user");
let messages = document.getElementById("messageContainer");
let html = "";
let html1 = "";
let contacts = [];
let db;
let ws = null;
var app = {
    // Application Constructor
    initialize: function () {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function () {
        this.receivedEvent('deviceready');
    },

    // Update DOM on a Received Event
    receivedEvent: function (id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }


};


let savedNote = localStorage.getItem("login");
if (savedNote != null) {
    load();
}


function save() {
    if (savedNote == null) {
        localStorage.setItem("login", ip + ":" + port);
        console.log("Saved" + " " + ip + ":" + port);
    }
    else {
        localStorage.removeItem("login");
        localStorage.setItem("login", ip + ":" + port);
        console.log("Updated" + " " + ip + ":" + port);
        load();
    }
}

function load() {
    document.getElementById("main").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    connectWebSocket();
    openDatabase();

}

function getLogin() {
    savedNote = savedNote.split(":");
    console.log("Loaded" + " " + savedNote[0] + " " + savedNote[1]);
    //ip.value += savedNote[0];
    //port.value += savedNote[1];
    document.getElementById("ip").value = savedNote[0];
    document.getElementById("port").value = savedNote[1];
}

function getMessage() {
    savedNote = savedNote.split(":");
    fetch('https://' + savedNote[0] + ':' + savedNote[1] + '/contacts', {
        method: 'GET'
    })
        .then(response => response.json())
        .then(async data => {
            console.log(data.user);
            contacts = data;
            await showContacts();
        })
        .catch(async (error) => {
            console.error('Error:', error);
            //await setTimeout(() => {console.log("trying...") ;getMessage()}, 30000);
        });
}
// Example: send JSON data with POST
let result;
async function GetAvatar(id, accessHash) {

    const response = await fetch('https://' + savedNote[0] + ':' + savedNote[1] + '/userprofileimage', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: id,
            accessHash: accessHash,
        })
    });

    result = await response.json();
    //console.log(result);
}
let sult;
async function GetChat(id, accessHash, limit) {

    const response = await fetch('https://' + savedNote[0] + ':' + savedNote[1] + '/getusermessage', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: id,
            accessHash: accessHash,
            limit: limit
        })
    });

    sult = await response.json();
    console.log(sult);
}


function connectWebSocket() {
    if (!savedNote) {
        console.error("No saved login info");
        return;
    }

    const parts = savedNote.split(":");
    const ip = parts[0];
    const port = parts[1];

    const url = `wss://${ip}:${port}/ws`;
    console.log("Connecting WS:", url);

    ws = new WebSocket(url);

    ws.onopen = () => console.log("WebSocket connected");
    ws.onerror = e => console.error("WebSocket error", e);
    ws.onclose = () => console.log("WebSocket closed");

    ws.onmessage = async e => {
        console.log(e.data);
        let b = "";
        let data = JSON.parse(e.data);
        if (data.fromId == 0) {
            b = "218428841";
            appendChat(b, data);
            if (document.getElementsByClassName("chat")[0].id == b) {
                await ShowOneMessage(data);
            }
        }
        else {
            b = data.fromId.toString();
            appendChat(b, data);
            if (document.getElementsByClassName("chat")[0].id == b) {
                await ShowOneMessage(data);
            }
        }

        // TODO: push message to UI
    };
}


// Convert Base64 to Blob
function base64ToBlob(base64Data) {
    const parts = base64Data.split(",");
    const mime = parts[0].match(/:(.*?);/)[1];
    const byteString = atob(parts[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
    }
    return new Blob([uint8Array], { type: mime });
}

// Open DB

//indexedDB.deleteDatabase("ProfileDB");
//console.log("Old database deleted");
indexedDB.deleteDatabase("chats");

function openDatabase() {
    const request = indexedDB.open("ProfileDB", 2);
    request.onupgradeneeded = e => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains("images")) {
            db.createObjectStore("images", { keyPath: ["userId", "photoId"] });
            console.log("Object store 'images' created");
        }

        if (!db.objectStoreNames.contains("chats")) {
            const store = db.createObjectStore("chats", {
                keyPath: ["userId"]
            });

            console.log("Object store 'chats' created");
        }
    };

    request.onsuccess = e => {
        db = e.target.result;
        console.log("Object store 'chats' created");
        console.log("Database opened");
        const tx = db.transaction("chats", "readwrite"); 
        tx.objectStore("chats").clear();
        getMessage();
    };

    request.onerror = e => {
        console.error("Database error:", e.target.error);
    };
}

function saveChat(userId, chatinfo) {
    const tx = db.transaction("chats", "readwrite");
    const store = tx.objectStore("chats");
    if (chatinfo == null) {
        return
    }
    else {
        store.put({ userId, chatinfo });
        //store.add({ userId, chatinfo});
        // key = [userId, chatId]
    }
}


function saveImage(userId, photoId, base64Image) {
    const tx = db.transaction("images", "readwrite");
    const store = tx.objectStore("images");
    if (base64Image == null) {
        console.log("Saving null image for user:", userId);
        store.put({ userId, photoId, blob: "null" });
    }
    else {
        store.put({ userId, photoId, blob: base64ToBlob(base64Image) });
        // key = [userId, photoId]
    }
}
function appendChat(userId, newChat) {
    const tx = db.transaction("chats", "readwrite");
    const store = tx.objectStore("chats");

    const getReq = store.get([userId]);
    console.log("Appending chat for user:", userId);
    console.log(newChat);
    getReq.onsuccess = () => {
        let record = getReq.result;

        if (record) {
            // Ensure chatinfo is an array
            if (!Array.isArray(record.chatinfo)) {
                record.chatinfo = [];
            }
            newChat = newChat;
            // Append new chat
            record.chatinfo.unshift(newChat);

            // Save updated record
            store.put(record);
        } else {
            // No record exists → create new one
            console.log("No existing chat record found for user:", userId);
        }
    };

    getReq.onerror = () => {
        console.error("Failed to load chat for update");
    };
}

function loadChat(userId, callback) {
    if (!db) {
        callback(null);
        return;
    }

    const tx = db.transaction("chats", "readonly");
    const store = tx.objectStore("chats");

    const getReq = store.get([userId]);
    getReq.onsuccess = () => {
        const record = getReq.result;

        if (record != null && record != undefined && record != "null") {
            callback(record.chatinfo);
        } else {
            callback(null);
        }
    };
}

function loadImage(userId, photoId, callback) {
    if (!db) {
        callback(null);
        return;
    }

    const tx = db.transaction("images", "readonly");
    const store = tx.objectStore("images");

    const getReq = store.get([userId, photoId]);

    getReq.onsuccess = () => {
        const record = getReq.result;

        if (record && record.blob instanceof Blob) {
            callback(URL.createObjectURL(record.blob));
        } else if (record && record.blob === "null") {
            callback("null");
        } else {
            callback(null);
        }
    };
}

function getAllIds() {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve([]);
            return;
        }

        const tx = db.transaction("images", "readonly");
        const store = tx.objectStore("images");

        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}


async function image(id, photoId, accessHash) {
    //console.log("Processing image for user:", id);
    loadImage(id, photoId, async (url) => {
        if (url) {
            if (url == "null" || url == null || url.length < 10) {
                document.getElementById(id).src = "./img/disability.png";
                document.getElementById(id).classList.remove("loadAvatar");
                document.getElementById(id).classList.add("avatar");
            }
            else {
                console.log("Image loaded from cache for user:", id);
                document.getElementById(id).src = url;
                document.getElementById(id).classList.remove("loadAvatar");
                document.getElementById(id).classList.add("avatar");
            }
        } else {
            await GetAvatar(id, accessHash);
            //console.log(result.res)
            if (result.res != null) {
                console.log("Image fetched from server for user:", id);
                saveImage(id, photoId, result.res);
                document.getElementById(id).src = result.res;
                document.getElementById(id).classList.remove("loadAvatar");
                document.getElementById(id).classList.add("avatar");
            } else {
                console.warn("No photo available for user:", id);
                saveImage(id, photoId, null);
                document.getElementById(id).src = "./img/disability.png";
                document.getElementById(id).classList.remove("loadAvatar");
                document.getElementById(id).classList.add("avatar");
            }
        }
    });
}
const MAX_CONCURRENT = 4;
let active = 0;
const queue = [];

function enqueueImage(id, photoId, accessHash) {
    queue.push({ id, photoId, accessHash });
    processQueue();
}

function processQueue() {
    while (active < MAX_CONCURRENT && queue.length > 0) {
        const { id, photoId, accessHash } = queue.shift();
        active++;
        loadimm(id, photoId, accessHash).finally(() => {
            active--;
            processQueue();
        });

        //console.log(result.res)

    }
}
async function loadimm(id, photoId, accessHash) {
    await GetAvatar(id, accessHash);
    if (result.res != null) {
        console.log("Image fetched from server for user:", id);
        saveImage(id, photoId, result.res);
        document.getElementById(id).src = result.res;
        document.getElementById(id).classList.remove("loadAvatar");
        document.getElementById(id).classList.add("avatar");
    } else {
        console.warn("No photo available for user:", id);
        saveImage(id, photoId, null);
        document.getElementById(id).src = "./img/disability.png";
        document.getElementById(id).classList.remove("loadAvatar");
        document.getElementById(id).classList.add("avatar");
    }
}
let loadedIds = [];
async function showContacts() {
    user.innerHTML = "";
    const def = "./img/profile-picture.png";
    const loadAvatar = "./img/Chad-Profile-pic-circle.png";
    let avatar = "";
    let load = "";
    for (let i = 0; i < contacts.user.length; i++) {
        if (contacts.user[i].name == "") { continue }
        if (contacts.user[i].thumbnail == "") {
            console.log("No thumbnail for user");
            avatar = "avatar";
            load = def
        }
        else {
            avatar = "loadAvatar";
            load = loadAvatar
        }
        if (contacts.user[i].bot == true) {
            console.log("User is a bot");
            avatar = "avatar";
            load = "./img/bot.png"
        }
        let num;
        if (contacts.user[i].note == 0) {
            num = "";
        }
        else {
            num = `<p class="num">${contacts.user[i].note}</p>`;
        }

        html += `<div class="cell" onclick="StartChat('${contacts.user[i].id}', '${contacts.user[i].accessHash}', 20)"><img class="${avatar}" src="${load}" alt="bruh" id="${contacts.user[i].id}" data-photoId="${contacts.user[i].imageId}" data-userid="${contacts.user[i].id}" data-accesshash="${contacts.user[i].accessHash}"><p class="name">${contacts.user[i].name}</p>${num}</div>`;
    }
    loader.classList.add("hidden");
    user.innerHTML = html;
    // Attach observer to all boxes
    document.querySelectorAll(".loadAvatar").forEach(box => observer.observe(box));
    loadedIds = await getAllIds();
}
async function StartChat(id, accessHash, limit) {
    document.getElementById("loader").classList.remove("hidden");
    document.getElementById("user").classList.add("hidden");
    await ChatHandeler(id, limit, accessHash);
    await showChat();
    document.getElementsByClassName("chat")[0].id = id;
}

async function showChat() {
    document.getElementById("loader").classList.add("hidden");
    document.getElementById("messages").classList.remove("hidden");
    document.getElementById("bar").classList.remove("hidden");
    document.getElementById("bar1").classList.add("hidden");
    document.getElementById("app").classList.add("hidden");
}

async function ChatHandeler(id, limit, accessHash) {
    await loadChat(id, async (chatinfo) => {
        if (chatinfo != null) {
            sult = chatinfo;
            console.log("Chat loaded from cache for chat:", id);
            await ShowMessage(id);
        } else {
            await GetChat(id, accessHash, limit);
            console.log("Chat fetched from server for chat:", id);
            saveChat(id, sult);
            await ShowMessage(id);
        }
    });
}

async function ShowMessage(id) {
    messages.innerHTML = "";
    html1 = "";
    let container = document.getElementsByClassName("chat")[0];
    //console.log(sult.length-1);
    for (let i = sult.length - 1; i >= 0; i--) {
        //console.log(i);
        if (sult[i].text != "") {
            //console.log("showing");
            if (sult[i].fromId == 218428841 || container.id == "218428841") {
                html1 += `<div class="message-orange"><p class="message-content">${sult[i].text}</p><div class="message-timestamp-right">${sult[i].date}</div></div>`;
            }
            else {
                html1 += `<div class="message-blue"><p class="message-content">${sult[i].text}</p><div class="message-timestamp-left">${sult[i].date}</div></div>`;
            }
        }
    }
    messages.innerHTML = html1;
    const chat = document.querySelector(".container");
    chat.scrollTop = chat.scrollHeight;
}
async function ShowOneMessage(message) {
    html1 = "";

    if (message.text != "") {
        if (message.fromId == 0) {
            console.log("you");
            html1 += `<div class="message-orange"><p class="message-content">${message.text}</p><div class="message-timestamp-right">${message.date}</div></div>`;
        }
        else {
            console.log("me");
            html1 += `<div class="message-blue"><p class="message-content">${message.text}</p><div class="message-timestamp-left">${message.date}</div></div>`;
        }
    }
    messages.innerHTML += html1;
    const chat = document.querySelector(".container");
    chat.scrollTop = chat.scrollHeight;
}
function isImageCached(userId, photoId) {
    return loadedIds.some(
        key => key[0] == userId && key[1] == photoId
    );
}


function loadImageForBox(box) {
    const userId = box.dataset.userid;
    const accessHash = box.dataset.accesshash;
    const photoId = box.dataset.photoid;
    //console.log(isImageCached(userId, photoId));
    if (!userId || !accessHash) {
        console.error("Missing userId or accessHash on box:", box);
        return;
    }
    if (isImageCached(userId, photoId)) {
        console.log("Image is cached for user:", userId);
        // loadImage(userId, photoId, async (url) => {
        //     if (url) {
        //         document.getElementById(userId).src = url;
        //         document.getElementById(userId).classList.remove("loadAvatar");
        //         document.getElementById(userId).classList.add("avatar");
        //     }
        // });
        image(userId, photoId, accessHash);
        return;

    }
    else {
        console.log("Enqueuing image load for user:", userId);
        enqueueImage(userId, photoId, accessHash);
    }
}


document.getElementById("go").addEventListener("click", function () {
    save();
});
document.getElementById("back").addEventListener("click", function () {
    document.getElementById("messages").classList.add("hidden");
    document.getElementById("bar").classList.add("hidden");
    document.getElementById("bar1").classList.remove("hidden");
    document.getElementById("app").classList.remove("hidden");
    document.getElementById("user").classList.remove("hidden");
});
document.getElementById("change").addEventListener("click", function () {
    document.getElementById("main").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
    getLogin();
});
// Function to load image for a box
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {

            loadImageForBox(entry.target);
            observer.unobserve(entry.target);
            // stop observing once loaded
        }
    });
});
app.initialize();