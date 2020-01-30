# Overview

自動売買システムです。
これは私がtypescriptとjavascriptを勉強するために作成したものです。
実際に稼働させることは推奨いたしません。

This repository is for me to study typescript and javascript, So running this BOT is not recommended.

# Referenced

参考させて頂いたリポジトリ・記事
### github
[ryoctrl/BitFlyerAutoTrader](https://github.com/ryoctrl/BitFlyerAutoTrader)

ほとんどこちらのリポジトリの劣化コピーになってしまいました。
ryoctrl様には心より感謝いたします。

### article
[TypescriptでLog4jsを組み込んでロギングしまくる](https://qiita.com/filunK/items/ad47bfb7e88b4bfb4ef7)

# Stating

```
node -v v12.14.1
    $ npm i
    $ cp .env.example .env
    $ vi .env BitflyerのAPI_KEY SECRET_KEYを設定
    $ npm run dev
```
