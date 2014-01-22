var Ybc = (function() {
    // Send the assembled request to the YouTube Data API and check the response
    // The request is sent in this function, instead of in the for loop of scanNode(),
    // since sync issues arise when a callback function is used in a loop
    var sendRequest = function(request, node, i) {
        request.execute(function(response) {
        if (response.pageInfo.totalResults === 0)
            console.log(node.children[i].title + " has been removed from YouTube...");
        });
    };

    // Search for bookmarks in the specified node
    // Regex from Marc's comment on Stack Overflow
    // http://stackoverflow.com/questions/3452546/
    // javascript-regex-how-to-get-youtube-video-id-from-url#comment20895940_14701040
    var scanNode = function(node) {
        var regex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/;
        var match;
        var videoId;
        var request;

        // Iterate over the child nodes of the parent node
        for (var i=0; i<node.children.length; i++) {
            // Extract YouTube video id from nodes that are bookmarks, ie not folders
            if (node.children[i].url) {
                match = node.children[i].url.match(regex);
                // Length of 11 is necessary to avoid false positives, since video id's are 11 chars
                videoId = (match && match[1].length === 11) ? match[1] : null;
                // If the video id is valid, assemble the request and send it
                if (videoId) {
                    request = gapi.client.youtube.videos.list({"part": "status", "id": videoId});
                    sendRequest(request, node, i);
                }
            }
        }
    };

    // Perform depth-first, pre-order traversal over the tree
    var traverseTree = function(node) {
        if (!node.children) return;
        scanNode(node);
        for (var i=0; i<node.children.length; i++)
            traverseTree(node.children[i]);
    };

    // Get bookmarks in the form of a tree
    // Need to pass first element of tree since getTree always returns an array
    var getBookmarks = function() {
        chrome.bookmarks.getTree(function(tree) { traverseTree(tree[0]); });
    };
 
    // Public methods
    return {
        init: function() {
            getBookmarks();
        }
    };
})();

