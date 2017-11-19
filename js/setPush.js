jQuery.noConflict();
(($) => {
    'use strict';

    const configAppId = 0;
    const apiRecNo = 1;

    const yahooTokenUrl = 'https://auth.login.yahoo.co.jp/yconnect/v1/token';

    kintone.events.on([
        'app.record.create.submit.success'
    ], (event) => {
        return kintoneUtility.rest.getRecord({
            'app': configAppId,
            'id': apiRecNo
        }).then((response) => {
            return new kintone.Promise((resolve, reject) => {
                let rec = response.record;

                //アクセストークンの再取得
                const header = {
                    'Authorization': 'Basic ' + btoa(rec.clientID.value + ':' + rec.secret.value),
                    'Content-Type': 'application/x-www-form-urlencoded'
                };
                const body = 'grant_type=refresh_token' +
                    '&refresh_token=' + rec.refreshToken.value;
                kintone.proxy(yahooTokenUrl, 'POST', header, body).then((response) => {
                    const responseCode = response[1];
                    const responseBody = JSON.parse(response[0]);
                    if (responseCode === 200) {
                        //トークン取得に成功
                        const header = {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': 'Bearer ' + responseBody.access_token

                        };
                        const body = 'entry=' + encodeURIComponent(JSON.stringify({
                            'message': event.record.通知項目.value
                        }));
                        resolve({
                            'success': true,
                            'url': rec.endPointUrl.value,
                            'header': header,
                            'body': body
                        });
                    } else {
                        throw new Exception();
                    }
                }, (error) => {
                    alert('トークンの取得でエラーが発生しました。');
                    reject();
                });
            }).then((result) => {
                if (result.success) {
                    return new kintone.Promise((resolve, reject) => {
                        // myThings にカスタムトリガーを送信
                        kintone.proxy(result.url, 'POST', result.header, result.body).then((response) => {
                            resolve(response);
                        }, (error) => {
                            throw new Exception();
                        });
                    }).then((result) => {
                        console.log(response[1]);
                        return event;
                    }, (error) => {
                        alert('トリガーの送信でエラーが発生しました。');
                    });
                }
            });
        });
    });
})(jQuery);