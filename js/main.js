var Ybc = (function() {
    var removedVideos = [],     // Bookmarks which refer to removed videos from YouTube
        checkBoxes    = [],     // Checkboxes in each table row which correspond to the removed video
        tableBody     = document.getElementById("table-body"),
        deleteButton  = document.getElementById("delete-button");

    // Send the assembled request to the YouTube Data API and check the response
    // The request is sent in this function, instead of in the for loop of scanNode(),
    // since sync issues arise when a callback function is used in a loop
    var sendRequest = function(request, node, i) {
        request.execute(function(response) {
            if (response.pageInfo.totalResults === 0) {
                var table      = document.getElementById("table"),
                    tableRow   = document.createElement("tr"),
                    selectCell = document.createElement("td"),
                    nameCell   = document.createElement("td"),
                    folderCell = document.createElement("td"),
                    dateCell   = document.createElement("td"),
                    checkBox   = document.createElement("input"),
                    link       = document.createElement("a"),
                    date       = new Date(node.children[i].dateAdded);

                // Display the table if it is hidden
                if (window.getComputedStyle(table, null).getPropertyValue("display") === "none")
                    table.style.display = "table";
 
                // Add the bookmark to the table
                checkBox.setAttribute("type", "checkbox");
                // Bind to the click event instead of change to avoid chain-firing from select-all
                checkBox.addEventListener("click", toggleDeleteButton, false);
                link.setAttribute("href", node.children[i].url);
                link.textContent = node.children[i].title;
                selectCell.appendChild(checkBox);
                selectCell.classList.add("checkbox-cell");
                nameCell.appendChild(link);
                folderCell.textContent = node.title;
                dateCell.textContent = date.toLocaleDateString();
                tableRow.appendChild(selectCell);
                tableRow.appendChild(nameCell);
                tableRow.appendChild(folderCell);
                tableRow.appendChild(dateCell);
                tableBody.appendChild(tableRow);

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

    var getBookmarks = function() {
        // Remove any old table entries
        for (var i=0; i<checkBoxes.length; i++)
            tableBody.removeChild((checkBoxes[i].parentElement).parentElement);

        // Reset the arrays
        removedVideos = [];
        checkBoxes = [];

        // Get the bookmarks tree and perform the traversal on it
        // Need to pass first element of tree since getTree always returns an array
        chrome.bookmarks.getTree(function(tree) { traverseTree(tree[0]); });
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

