var Ybc = (function() {
    var removedVideos = [],     // Bookmarks which refer to removed videos from YouTube
        checkBoxes    = [],     // Checkboxes in each table row which correspond to the removed video
        videoIds      = [],     // The YouTube video ids for all the matched bookmarks
        tableList,              // The list.js List object for making the table sortable
        options       = { valueNames: ["name", "folder", "date"] }, // Options for the List object
        tableBody     = document.getElementById("table-body"),      // References to HTML elements
        deleteButton  = document.getElementById("delete-button");

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
        // Remove any old table entries
        for (var i=0; i<checkBoxes.length; i++)
            tableBody.removeChild((checkBoxes[i].parentElement).parentElement);

        // Reset the arrays
        removedVideos = [];
        checkBoxes = [];
        responseCount = 0;

        // Get the bookmarks tree and traverse it for YouTube bookmarks
        // Need to pass first element of tree since getTree always returns an array
        // Once the traversal is complete, assemble the requests for the
        // matched YouTube bookmarks, send them, and check the responses
        chrome.bookmarks.getTree(function(tree) {
            var videoIdSegments = new Array(Math.ceil(videoIds.length / 50)),
                requests = new Array(videoIdSegments.length);

            traverseTree(tree[0]);

            // Divide videoIds into segments of 50 since
            // the API only allows up to 50 videos per request
            for (var i=0, beg=0, end=50; i<videoIdSegments.length; i++, beg+=50, end+=50)
                videoIdSegments[i] = videoIds.slice(beg, end);

            // Assemble the requests
            for (i=0; i<requests.length; i++)
                requests[i] = gapi.client.youtube.videos.list(
                    {"part": "id,status", "id": videoIdSegments[i].join()});

            // Send the requests and check the responses
            for (i=0; i<requests.length; i++) {
                requests[i].execute(function(response) {
                    console.log(response);
                    //if (response.pageInfo.totalResults === videoIds.length)
                    //    return;      // All videos are ok
                    //else
                    //    determine which videos are removed
                });
            }
        });
    };
 
    var deleteBookmarks = function() {
        for (var i=0; i<checkBoxes.length; i++) {
            if (checkBoxes[i].checked) {
                // Delete the checked bookmark
                chrome.bookmarks.remove(removedVideos[i].id);
                console.log(removedVideos[i].title + " bookmark deleted...");

                // Remove its row from the table
                tableBody.removeChild((checkBoxes[i].parentElement).parentElement);
            }
        }

        // Remove the references of the deleted bookmarks from the arrays
        for (i=checkBoxes.length-1; i>=0; i--) {
            if (checkBoxes[i].checked) {
                removedVideos.splice(i, 1);
                checkBoxes.splice(i, 1);
            }
        }
    };

    var toggleAllCheckboxes = function() {
        // Check all the checkboxes if select-all is checked
        if (this.checked) {
            for (i=0; i<checkBoxes.length; i++)
                checkBoxes[i].checked = true;

            // Enable the delete button if it is disabled
            if (deleteButton.disabled)
                deleteButton.disabled = false;

            // Enable the hover effect
            deleteButton.classList.add("button-enabled");
        }
        // Uncheck all the checkboxes if select-all is unchecked
        else {
            for (var i=0; i<checkBoxes.length; i++)
                checkBoxes[i].checked = false;

            // Disable the delete button
            deleteButton.disabled = true;

            // Disable the hover effect
            deleteButton.classList.remove("button-enabled");
        }
    };

    var toggleDeleteButton = function() {
        // Enable the delete button if it is disabled and the checkbox is checked
        if (deleteButton.disabled && this.checked) {
            deleteButton.disabled = false;

            // Enable the hover effect
            deleteButton.classList.add("button-enabled");
        }
        // Otherwise disable it if all the other checkboxes are unchecked
        else {
            for (var i=0; i<checkBoxes.length; i++) {
                if (checkBoxes[i].checked)
                    return;
            }

            deleteButton.disabled = true;

            // Disable the hover effect
            deleteButton.classList.remove("button-enabled");
        }
    };

    deleteButton.addEventListener("click", deleteBookmarks, false);
    document.getElementById("select-all").addEventListener("change", toggleAllCheckboxes, false);

    // Public methods
    return {
        init: function() {
            getBookmarks();
        }
    };
})();

