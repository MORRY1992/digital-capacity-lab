# AdSense導入記録 / 2026-10-23

|段階|状態|
|---|---|
|管理画面でアカウント・Publisher IDを照合|未実施|
|新サイトの一般公開|外部認証待ち|
|所有確認用meta|生成機能のみ実装・未設定|
|ads.txtの販売者行|未設定。現在は待機コメントのみ|
|正式なサイト登録・審査申請|未実施・本人承認が必要|
|審査合格|未確認|
|広告配信|無効・配信コードなし|
|収益発生|未確認・収益データ未取得|

## 申請前

- 本番公開13ページがnoindexなしで閲覧可能、問い合わせ窓口が有効。
- 3計算機の本番操作・日英状態（英語未公開）・スマホを確認。
- 管理画面で既存Publisher IDを照合後、環境変数ADSENSE_VERIFIED_PUBLISHERを設定。
- 再ビルドでmetaとads.txtを生成し、ルートから取得できるか確認。
- 本人へ実URL・内容・ID照合結果を提示し、正式申請の承認を得る。
- Googleによる審査と所有確認は別。ads.txt取得成功だけで承認としない。

## 配信準備

- 説明セクションの後など、入力・計算ボタンから十分に離れた位置を第一候補にする。広告未配信時は空枠を出さない。
- CMPは英語版の有無ではなく訪問地域に応じて必要性を判断。EEA・英国・スイスなどの適用要件を管理画面で確認。
- プライバシーポリシーを配信実態に合わせ更新。GoogleのCookie等の目的・設定方法・第三者による収集を説明する。
- 必要なCSP許可先を公式資料で再確認し最小限追加。現状のstrict CSPでは広告は動かない。
- レスポンシブ広告による画面ずれ、誤クリック、同意撤回を検査。初期実装には広告なしモードはない。
- 本番監視では広告を実行・クリックしない。

## 確認した公式資料

2026-10-23確認：
- https://support.google.com/adsense/answer/48182 — AdSense Program policies
- https://support.google.com/adsense/answer/12169212 — 新規サイト追加と審査
- https://support.google.com/adsense/answer/7584263 — サイト接続
- https://support.google.com/adsense/answer/13554116 — EEA/英国/スイスCMP要件
- https://developers.cloudflare.com/pages/platform/limits/ — Pages無料プランの制限
- https://docs.github.com/en/actions/concepts/billing-and-usage — Actions課金

公式の無料条件と本人アカウントの利用残量は別。利用残量は未確認。新規課金契約なし。
