(function () {
    'use strict';

    var id;

    var loadOptions = function () {
        return localStorage['options'] || {};
    };

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
        if (expired_on - now <= 3 * 24 * 60 * 60 * 1000) {
            $.ajax({
                method: 'GET',
                url: 'https://api.worktile.com/oauth2/refresh_token?refresh_token=' + token.refresh_token + '&client_id=792a1327b9954217969007153b1c2cef',
                headers: {
                    'Accept': 'application/json',
                    'refresh_token': token.refresh_token,
                    'client_id': '792a1327b9954217969007153b1c2cef'
                },
                success: function (data, textStatus, jqXHR) {
                    var json = Object.prototype.toString.call(data) === '[object String]' ? JSON.parse(data) : data;
                    if (json.code === 200) {
                        localStorage['token'] = JSON.stringify(json.data);
                    }
                    else {
                        chrome.browserAction.setBadgeText({ text: '!' });
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    chrome.browserAction.setBadgeText({ text: '!' });
                }
            });
        }
    }

    var refresh = function () {
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