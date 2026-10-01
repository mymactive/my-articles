# my-articles

[Zenn](https://zenn.dev/)用のレポジトリです。
私の記事で何か意見等がございましたらissueまでお願いします。
一部記事は酔った勢いで書き殴っているものもあるので、ご容赦ください。

## 最初に

- Node.js 24 LTS と npm を使います（バージョン指定は `.node-version`）。
- クローン後、リポジトリのルートで `npm ci --ignore-scripts` を実行します。
- 記事は `articles/`、本は `books/`、記事内の画像は `images/` にあります。
- このリポジトリは npm パッケージとして公開するものではありません。

## 下書きを作って読む

```sh
# 作業用ブランチを作成
# Zenn と連携しているブランチには直接書き込まない
git switch -c draft/my-next-article

# ランダムな slug の記事を published: false で作成
npm run new:article -- --title "残しておきたい話"

# プレビュー（http://localhost:8000）
npm run preview
```

slug を指定したい場合は `npm run new:article -- --slug my-next-article --title "残しておきたい話"`。
slug は英小文字・数字・ハイフン・アンダースコアの12〜50文字です。
既存の記事・本の slug は URL と対応するため、気軽に変更しないでください。
プレビューの終了は `Ctrl+C`、別のポートを使う場合は `npm run preview -- --port 8001` です。

### 会話を文章にするとき

自分用のメモはこの公開リポジトリの外に残し、記事として清書するものだけをここへ持ってきます。
会話やメモのうち「残したい話」「結論」「試したこと」を材料に、まず短い下書きを作ります。
構成を決めるために必要な点だけ確認し、未確認の事実や出典、本人が話していない経験・意見を補いません。
技術的な主張は必要に応じて公式資料で確認し、個人的な観察と区別します。
最初から完成した長文にせず、プレビューを見ながら整えます。

## チェックする

```sh
# 下書き作成・プレビュー・文章チェック設定のスモークテスト（既存原稿は変更しない）
npm test

# 全記事・本の文章チェック（自動修正なし）
npm run lint

# 1ファイルだけ確認
npm exec -- textlint articles/my-next-article.md
```

文章チェックには既存の JTF スタイルルールを使います。
過去の原稿にも指摘が残っているため、GitHub Actions では文章の指摘を助言として表示し、原稿を自動修正しません。
ローカルの `npm run lint` は指摘があれば終了コード1を返します。
依存関係のインストール、テスト、textlint の設定読み込みなどの失敗は CI を失敗させます。
Ruby、Bundler、Danger のセットアップは不要です。

## 保存と公開の注意

- `published: false` は **Zenn 上で未公開**という意味です。**公開 GitHub リポジトリに push した下書きや PR は、GitHub 上では誰でも読めます**。
- 非公開にしたい会話の原文、個人情報、認証情報などは、このリポジトリに commit / push しないでください。
- 新しい記事は下書きのままレビューし、Zenn へ公開すると決めたときだけ `published: true` にします。
- Zenn の GitHub 連携に登録されたブランチへの push / マージは、記事・本の同期につながります。公開済み原稿の修正も対象です。
- 実際の連携先ブランチや同期結果は [Zenn のデプロイ画面](https://zenn.dev/dashboard/deploys) で確認してください。リポジトリだけでは連携設定は分かりません。
- 既存記事・本の公開状態や内容を、ツール更新のついでに変更しないでください。

## ツールの更新

`package-lock.json` を含めて更新し、`npm ci --ignore-scripts`、`npm test`、`npm run lint`、ブラウザでのプレビューを確認します。
依存関係は検証したバージョンを固定しています。Zenn CLI はマイナーバージョンでも互換性が変わる場合があるため、更新後の確認が必要です。

- [Zenn CLI の使い方](https://zenn.dev/zenn/articles/zenn-cli-guide)
- [Zenn と GitHub の連携](https://zenn.dev/zenn/articles/connect-to-github)
