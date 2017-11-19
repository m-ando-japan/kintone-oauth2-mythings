jQuery.noConflict();
(($) => {
    'use strict';

    const yahooAuthUrl = 'https://auth.login.yahoo.co.jp/yconnect/v1/authorization';
    const yahooTokenUrl = 'https://auth.login.yahoo.co.jp/yconnect/v1/token';

    const setShown = (field, value) => {
        const sp = kintone.app.record.getSpaceElement(field);
        if(sp){
            $(sp).parent().hide();
        } else {
            kintone.app.record.setFieldShown(field, value);
        }
    };
    
    const createButtonContent = (funcName) => {
        var buttons = (() => {
            /*
<div id="csv_import_box" class="ocean-ui-dialog-buttons" style="padding-top: 25px; position: relative; display: block; vertical-align: top; font-size: 0; white-space: nowrap;">
    <button type="submit" id="get_token" class="button-simple-cybozu" style="position: relative; display: inline-block; background-color: #fff;">トークン取得</button>
</div>
            */
        }).toString().match(/\/\*([^]*)\*\//)[1];
        const box = $(buttons);
        $(kintone.app.record.getSpaceElement('getToken')).append(box);
        $('#get_token').on('click', function(e) {
            const dataSet = kintone.app.record.get();
            location.href = yahooAuthUrl 
                + '?response_type=code'
                + '&client_id=' + dataSet.record.clientID.value
                + '&redirect_uri=' + getRedirectUrl(funcName)
                + '&state=' + getUniqueStr();
        });
    };

    const getRedirectUrl = (base) => {
        const pathname = location.pathname.replace(base, 'edit?record=');
        return encodeURI('https://' + location.host + pathname + kintone.app.record.getId());
    };

    const getUniqueStr = () => {
        const strong = 1000;
        return new Date().getTime().toString(16) + Math.floor(strong * Math.random()).toString(16);
    };

    const getArgs = () => {
        // 下記の2パターンを想定
        // https://xxxxx.cybozu.com/k/xxx/edit?...
        // https://xxxxx.cybozu.com/k/xxx/show#...
        const pair = (location.href.substring(location.host.length + location.pathname.length + 9)).split('&');
        let args = {};
        for(let i = 0; pair[i]; i++) {
            const kv = pair[i].split('=');
            args[kv[0]] = kv[1];
        }
        return args;
    };

/*
 -------------- kintone events --------------
*/

    kintone.events.on([
        'app.record.create.show'
    ], (event) => {
        const args = getArgs();
        if ('code' in args) {
            location.href = 'https://' + location.host
                + location.pathname.replace('edit', 'show')
                + '#record=' + args.record
                + '&mode=edit'
                + '&code=' + args.code
                + '&state=' + args.state;
        } else {
            setShown('getToken', false);
            setShown('refreshToken', false);
        }
    });

    kintone.events.on([
        'app.record.detail.show'
    ], (event) => {
        createButtonContent('show');
    });

    kintone.events.on([
        'app.record.edit.show'
    ], (event) => {
        const args = getArgs();
        if ('code' in args) {
            //トークン認証
            const header = {
                'Authorization': 'Basic ' + btoa(event.record.clientID.value + ':' + event.record.secret.value),
                'Content-Type': 'application/x-www-form-urlencoded'
            };
            const body = 'grant_type=authorization_code'
                + '&redirect_uri=' + getRedirectUrl('show')
                + '&code=' + args.code;
            kintone.proxy(yahooTokenUrl, 'POST', header, body).then((response) => {
                const responseCode = response[1];
                const responseBody = JSON.parse(response[0]);
                if (responseCode === 200) {
                    let dataSet = kintone.app.record.get();
                    dataSet.record.refreshToken.value = responseBody.refresh_token;
                    kintone.app.record.set(dataSet);
                    $('#appForm-gaia .gaia-ui-actionmenu-save').trigger('click');
                } else {
                    throw new Exception();
                }
            }, (error) => {
                alert('トークンの取得でエラーが発生しました。\n' + error.message);
            });
        }
        setShown('getToken', false);
    });

})(jQuery);
