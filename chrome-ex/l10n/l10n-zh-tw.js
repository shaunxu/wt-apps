(function () {
    'use strict';

    var locale = angular.module('l10n-zh-tw', ['l10n']);

    locale.run(function ($l10n) {
        $l10n.set('zh-tw', {
            name: '簡體中文',
            flag: 'img/flags/tw.png',
            items: {
                'target-name': '名稱',
                'target-content': '描述',
                'target-pid': '項目',
                'target-eid': '列表',
                'target-assignees': '分配',
                'target-followers': '關註',
                'copy': '從當前瀏覽器復制',
                'adv-mode': '專家模式',
                'login': '登錄',
                'logout': '退出',
                'refresh': '刷新',
                'submit': '提交',
                'err-load-prj': '獲取項目數據失敗。',
                'err-load-members-entries': '獲取項目成員和列表失敗。',
                'err-login': '登錄失敗。',
                'err-logout': '退出失敗。',
                'err-name-required': '請輸入名稱。',
                'err-pid-required': '請選擇一個項目。',
                'inf-submitted': '提交成功。',
                'err-submitted': '提交失敗。',
                'err-refresh': '刷新失敗。',
                'signature': '發自我的Worktile Chrome Extension',
                'opt-caption': '配置谷歌瀏覽器插件',
                'signature-label': '簽名',
                'language-label': '語言',
                'save': '保存'
            }
        });
    });

})();