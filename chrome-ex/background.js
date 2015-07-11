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
                        chrome.browserAction.setBadgeText({ text: json.data.length + '' });
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