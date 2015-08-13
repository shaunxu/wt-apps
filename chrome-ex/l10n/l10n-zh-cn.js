(function () {
    'use strict';

    var locale = angular.module('l10n-zh-cn', ['l10n']);

    locale.run(function ($l10n) {
        $l10n.set('zh-cn', {
            name: '简体中文',
            flag: 'img/flags/cn.png',
            items: {
                'target-name': '名称',
                'target-content': '描述',
                'target-pid': '项目',
                'target-eid': '列表',
                'target-assignees': '分配',
                'target-followers': '关注',
                'copy': '从当前浏览器复制',
                'adv-mode': '专家模式',
                'login': '登录',
                'logout': '退出',
                'refresh': '刷新',
                'submit': '提交',
                'err-load-prj': '获取项目数据失败。',
                'err-load-members-entries': '获取项目成员和列表失败。',
                'err-login': '登录失败。',
                'err-logout': '退出失败。',
                'err-name-required': '请输入名称。',
                'err-pid-required': '请选择一个项目。',
                'inf-submitted': '提交成功。',
                'err-submitted': '提交失败。',
                'err-refresh': '刷新失败。',
                'signature': '发自我的Worktile Chrome Extension',
                'opt-caption': '配置谷歌浏览器插件',
                'signature-label': '签名',
                'language-label': '语言',
                'save': '保存',
                'interval-label': '刷新周期',
                'interval-unit': '分钟',
                'star-projects': '常用项目',
                'personal-projects': '个人项目',
                'type-task': '任务',
                'type-post': '话题'
            }
        });
    });

})();