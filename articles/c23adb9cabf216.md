---
title: "Next.jsでのテスト環境の作り方"
emoji: "🔖"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: [Nextjs, Jest]
published: false
---

# TL;DR
<!-- 基本のJest, react componentをテストする時、hooksをテスト  -->

| やりたいこと                                  | やること                                |
| --------------------------------------------- | --------------------------------------- |
| 単体テストの環境を整えたい                    | Jestを入れる                            |
| Reactコンポーネントをテストする環境を整えたい | testing-library/reactを入れる           |
| Reactフックスをテストする環境を整えたい       | testing-library/react-hooksを入れる[^1] |
| APIをモックしたい                             | mswを入れる                             |

[^1]:実はReact18ではtesting-library/reactにtesting-library/react-hooksに統合されたので必要ないです


# 前提
<!-- Next12以上であることを念じる -->

Next.js12以上であることを前提とします

# 最速の方法

公式レポジトリで管理されているものを使ってください！
正直これが最速

# テスト環境構築方法



## 単体テストの環境を整える

