var Ybc = (function() {
    var removedVideos = [],
        checkBoxes    = [];

    // Send the assembled request to the YouTube Data API and check the response
    // The request is sent in this function, instead of in the for loop of scanNode(),
    // since sync issues arise when a callback function is used in a loop
    var sendRequest = function(request, node, i) {
        request.execute(function(response) {
            if (response.pageInfo.totalResults === 0) {
                var table    = document.getElementById("table"),
                    tbody    = document.getElementById("tbody"),
                    tr       = document.createElement("tr"),
                    tdSelect = document.createElement("td"),
                    tdName   = document.createElement("td"),
                    tdFolder = document.createElement("td"),
                    tdDate   = document.createElement("td"),
                    checkBox = document.createElement("input"),
                    link     = document.createElement("a"),
                    date     = new Date(node.children[i].dateAdded);

                // Display the table if it is hidden
                if (window.getComputedStyle(table, null).getPropertyValue("display") === "none")
                    table.style.display = "table";
 
                // Add the bookmark to the table
                checkBox.setAttribute("type", "checkbox");
                link.setAttribute("href", node.children[i].url);
                link.textContent = node.children[i].title;
                tdSelect.appendChild(checkBox);
                tdSelect.classList.add("checkbox-cell");
                tdName.appendChild(link);
                tdFolder.textContent = node.title;
                tdDate.textContent = date.toLocaleDateString();
                tr.appendChild(tdSelect);
                tr.appendChild(tdName);
                tr.appendChild(tdFolder);
                tr.appendChild(tdDate);
                tbody.appendChild(tr);

                // Save a reference to the removed YT bookmark for later access
                removedVideos.push(node.children[i]);

                // Save a reference to the bookmark's checkbox
                checkBoxes.push(checkBox);

                console.log(node.children[i].title + " has been removed from YouTube...");
            }
        });
    };

    // Search for bookmarks in the specified node
    // Regex from Marc's comment on Stack Overflow
    // http://stackoverflow.com/questions/3452546/
    // javascript-regex-how-to-get-youtube-video-id-from-url#comment20895940_14701040
    var scanNode = function(node) {
        var regex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/,
            match,
            videoId,
            request;

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
 
    var deleteBookmarks = function() {
        for (var i=0; i<checkBoxes.length; i++) {
            if (checkBoxes[i].checked)
                console.log(removedVideos[i].title);
        }
    };

    document.getElementById("delete-button").addEventListener("click", deleteBookmarks, false);

    // Public methods
    return {
        init: function() {
            getBookmarks();
        }
    };
})();

