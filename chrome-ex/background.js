(function () {
    'use strict';
    
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        alert(JSON.stringify({
            where: 'background.js',
            message: message,
            sender: sender
        }, null, 2));

        chrome.cookies.get({
            url: 'https://open.worktile.com/oauth2/authorize?client_id=54599295762c424b8aced6e7ee891a47&redirect_uri=https://fohlpnkpbkafcncdpnocfhhckkgnmjna.chromiumapp.org/&display=mobile',
            name: 'sid'
        }, function (cookies) {
            alert(JSON.stringify(cookies, null, 2));
            sendResponse(cookies);
        });

        return true;
    });
})();