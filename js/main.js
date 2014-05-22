var Ybc = (function() {
    var videoIds      = [],     // The YouTube video ids for all the matched bookmarks
        queries       = [],     // Array for storing multiple Query objects
        removedVideos = [];

    // Object used to match a group of videos
    // with its request and corresponding response
    var Query = function(videoIdSegment, request) {
        this.videoIdSegment = videoIdSegment;
        this.request = request;

        // The execute method of request needs to be called
        // from within a method of the Query object in
        // order to associate the response with the request
        // A reference to the object needs to be stored in order to
        // add the response property from within the callback function
        this.sendRequest = function() {
            var self = this;

            this.request.execute(function(response) {
                self.response = response;

                //self.findRemovedVids();

                if (response.pageInfo.totalResults !== self.videoIdSegment.length) {
                    for (var i=0, j=0; i<self.videoIdSegment.length; i++) {
                        if (self.videoIdSegment[i] !== self.response.items[j].id)
                            removedVideos.push(self.videoIdSegment[i]);
                        else
                            j++;
                    }
                }
            });
        };

        this.findRemovedVids = function() {
            if (this.response.pageInfo.totalResults !== this.videoIdSegment.length) {
                for (var i=0, j=0; i<this.videoIdSegment.length; i++) {
                    if (this.videoIdSegment[i] !== this.response.items[j].id)
                        removedVideos.push(this.videoIdSegment[i]);
                    else
                        j++;
                }
            }
        };
    };

    // Search for bookmarks in the specified node
    // Regex from Marc's comment on Stack Overflow
    // http://stackoverflow.com/questions/3452546/
    // javascript-regex-how-to-get-youtube-video-id-from-url#comment20895940_14701040
    var scanNode = function(node) {
        var regex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/,
            match,
            videoId;

        // Iterate over the child nodes of the parent node
        for (var i=0; i<node.children.length; i++) {
            // Extract YouTube video id from nodes that are bookmarks, ie not folders
            if (node.children[i].url) {
                match = node.children[i].url.match(regex);
                // Length of 11 is necessary to avoid false positives, since video id's are 11 chars
                videoId = (match && match[1].length === 11) ? match[1] : null;
                // Store the video id if it is valid
                if (videoId)
                    videoIds.push(videoId);
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

    // Start the bookmarks retrieval process
    var getBookmarks = function() {
        chrome.bookmarks.getTree(function(tree) {
            // Need to pass first element of tree since getTree always returns an array
            traverseTree(tree[0]);

            var videoIdSegments = new Array(Math.ceil(videoIds.length / 50)),
                requests = new Array(videoIdSegments.length);

            queries = new Array(requests.length);

            // Divide videoIds into segments of 50 since
            // the API only allows up to 50 videos per request
            for (var i=0, beg=0, end=50; i<videoIdSegments.length; i++, beg+=50, end+=50)
                videoIdSegments[i] = videoIds.slice(beg, end);

            // Assemble the requests
            for (i=0; i<requests.length; i++)
                requests[i] = gapi.client.youtube.videos.list(
                    {"part": "id,status", "id": videoIdSegments[i].join()});

            // Create the Query objects
            for (i=0; i<requests.length; i++)
                queries[i] = new Query(videoIdSegments[i], requests[i]);

            // Send the requests
            for (i=0; i<queries.length; i++)
                queries[i].sendRequest();
        });
    };
 
    // Public methods
    return {
        init: function() {
            getBookmarks();
        }
    };
})();

