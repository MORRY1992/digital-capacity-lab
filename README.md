# デジタル容量設計室 / Digital Capacity Lab

F計画SPの無料容量計算サイト。2026-10-23制作。
**現状：Cloudflare Pagesで公開済み。公開20エンドポイントのHTTP・本番設定・計算コード一致検査に合格（2026-10-23）。AdSense登録・申請は未実施。**
リポジトリ：https://github.com/MORRY1992/digital-capacity-lab （Public）。公開サイト：https://digital-capacity-lab.pages.dev

## 構成

- 保存容量：動画時間・本数・映像/合計ビットレート・音声の扱い・写真の枚数とMB/MiB。
- 完全バックアップ：元データ、追加0〜5複製、元データに対する上乗せ率、各保存先の空き容量と不足判定。
- 通信量：平均合計ビットレート、時間、日数、モバイル割合、比較条件。
- 日本語13ページ＋404。4本の解説、使い方、運営・プライバシー・注意事項・問い合わせ。
- 英語のブランド表記は Digital Capacity Lab（暫定）。英語UIは未実装・未公開。計算エンジンを独立させているため、別言語UIから再利用可能。翻訳完了後に `/en/` を追加し、相互hreflangを設定する。
- 完全静的HTML/CSS/ES modules。外部ライブラリ・有料API・会員・アップロード・永続入力保存なし。

## ローカル検証

Node.js 22以上。npm install不要。

```sh
node scripts/build.mjs
node --test tests/*.test.mjs
```

`src/core.mjs` が計算正本。`src/app.mjs` はUI。ページ原稿とHTML生成は `scripts/build.mjs`。`dist`を直接編集せず、ソースを編集して再生成する。

通常ビルドは制作確認版（noindex・robots拒否）。問い合わせ先を仮に捏造しない。公開時は下の本番ビルドが必須。

## GitHub・Cloudflare公開手順

1. MORRY1992に専用リポジトリを新規作成（重複確認）。既存3サイトを変更しない。
2. 本一式のソース・tests・docs・workflowを登録する。個人連絡先・認証情報・元指示書は含めない。
3. 公開のGitHub Issuesを問い合わせ先にする設計。公開リポジトリでIssuesが有効であり、第三者が到達できることを確認する。非公開のまま使う場合は、別の本人承認済み公開窓口が必要（問い合わせ本文も更新）。
4. Cloudflareで既存アカウントのFreeプランとビルド使用量を確認。Workers & Pages → Create application → Pages → Connect to Git。専用repoのみを選択。GitHub連携の権限拡張が必要な場合は本人確認。
5. Production branch `main`、Framework `None`、Build output `dist`、Root 空欄。Build command `node scripts/build.mjs --production && node --test tests/*.test.mjs`。
6. 確定したプロジェクトの `https://…pages.dev` を `SITE_URL`、公開済みrepoの `https://github.com/MORRY1992/…/issues` を `CONTACT_URL` に設定。Nodeは22以上。変数は秘密情報ではない。URL確定前に仮ドメインを本番用として使わない。
7. 本番ビルドはSITE_URL/CONTACT_URLが空欄なら失敗する。初期デプロイでURLが確定する場合、確定後に変数を設定して再デプロイする。
8. 公開ページで3ツール操作・リンク・404・広告未配信を確認。`SITE_URL`を設定して `node scripts/check-live.mjs` を実行。
9. 日次・週次のHTTP監視は上記の検証済み公開URLを既定値に使用する。移転時はGitHub repository variable `SITE_URL`で上書きし、Cloudflareの本番URLと一致させる。Actions稼働履歴を確認する。

公開リポジトリの標準GitHub-hostedランナーは無料という公式条件を確認済み。ただし既存repoはいずれもprivate。**この新規repoもprivateを選んだ場合は無料枠残量を確認するまでworkflowは起動しない。** 確認して無料枠内で運用できる場合のみ `ALLOW_FREE_ACTIONS=true` を設定する。支出上限を勝手に変更しない。

## 広告

広告配信コードは未設置。`ADSENSE_VERIFIED_PUBLISHER`を設定した場合だけ、所有確認用metaとads.txtの販売者行を生成する。設定前に管理画面で本人のID一致確認が必要。指示書に記載のIDだけでは有効化しない。現状ads.txtは設定待ちのコメントのみで、審査用ads.txtが完成した状態ではない。

正式サイト登録・審査申請は本人承認後。申請・承認・配信・収益は別々に記録する。広告開始前にCMP、プライバシーポリシー、CSPと配置を再検証する。現CSPは外部広告スクリプトを許可していない。自動広告の設定を勝手に変えない。広告なしモード・Adsterra・ポップアンダーはなし。

## 保守

`docs/OPERATIONS.md`、`docs/QA.md`、`docs/ADSENSE.md`を参照。自動検査は実装済み。GitHub Actions初回実行は成功（2026-10-23、15秒）。https://github.com/MORRY1992/digital-capacity-lab/actions/runs/39930743918 。日次/週次スケジュール登録済み。本番HTTP監視には検証済み公開URLを設定済み。公開後初回の定期実行結果は未確認。常時稼働や自動復旧、収益を保証しない。
