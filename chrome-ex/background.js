(function () {
    'use strict';

    var id;

    var loadOptions = function () {
        return localStorage['options'] || {};
    };

    chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
        title: "Sync Messages",
        contexts: ["browser_action"],
        onclick: function() {
            refresh();
        }
    });

    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        if (message.action === 'options_saved') {
            if (id) {
                clearInterval(id);
            }
            id = setInterval(refresh, (loadOptions.internal || 5) * 60 * 1000);
            return sendResponse({ data: 'reload_successfully' });
        }
        else {
            return sendResponse({});
        }
    });

    var rawToken = localStorage['token'];
    if (rawToken) {
        var token = JSON.parse(rawToken);
        var expired_on = token.expired_on || Date.now();
        var now = Date.now();
        if (expired_on - now > 3 * 24 * 60 * 60 * 1000) {
            $.ajax({
                method: 'GET',
                url: 'https://api.worktile.com/oauth2/refresh_token?refresh_token=' + token.refresh_token + '&client_id=54599295762c424b8aced6e7ee891a47',
                headers: {
                    'Accept': 'application/json',
                    'refresh_token': token.refresh_token,
                    'client_id': '54599295762c424b8aced6e7ee891a47'
                },
                success: function (data, textStatus, jqXHR) {
                    var json = Object.prototype.toString.call(data) === '[object String]' ? JSON.parse(data) : data;
                    if (json) {
                        json.expired_on = Date.now() + json.expires_in * 1000;
                        localStorage['token'] = JSON.stringify(json);
                        console.log('bbb-1');
                    }
                    else {
                        chrome.browserAction.setBadgeText({ text: '!' });
                        console.log('bbb-2');
                    }
                    console.log('bbb');
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    chrome.browserAction.setBadgeText({ text: '!' });
                    console.log('ccc');
                }
            });
        }
    }

    var refresh = function () {
        chrome.browserAction.setBadgeText({ text: '...' });
        $.ajax({
            method: 'GET',
            url: 'https://new.worktile.com/api/notices?type=all&since_id=0&count=all&is_read=0&dt=' + new Date().getTime(),
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.8,zh-CN;q=0.6,zh-TW;q=0.4',
                'Cache-Control': 'no-cache'
            },
            success: function (data, textStatus, jqXHR) {
                var json = Object.prototype.toString.call(data) === '[object String]' ? JSON.parse(data) : data;
                if (json.code === 200) {
                    if ($.isArray(json.data) && json.data.length > 0) {
                        var messageLength  = json.data.length;
                        if (messageLength > 99) {
                            chrome.browserAction.setBadgeText({ text: '99+' });
                        }
                        else {
                            chrome.browserAction.setBadgeText({ text: messageLength + '' });
                        }
                    }
                    else {
                        chrome.browserAction.setBadgeText({ text: '' });
                    }
                }
                else {
                    chrome.browserAction.setBadgeText({ text: '?' });
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                chrome.browserAction.setBadgeText({ text: '?' });
            }
        });
    };

    id = setInterval(refresh, (loadOptions.internal || 5) * 60 * 1000);

    refresh();
})();