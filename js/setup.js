// Register the onclick event of the scan button 
document.getElementById("scan-button").onclick = Ybc.init;

// Once the library is loaded, authenticate using the key
// defined in key.js and load the YouTube Data API
var loadYoutubeApi = function() {
    console.log("Library loaded...");
    gapi.client.setApiKey(apiKey);
    console.log("Key set...");
    gapi.client.load("youtube", "v3", function() { console.log("API loaded..."); });
};

