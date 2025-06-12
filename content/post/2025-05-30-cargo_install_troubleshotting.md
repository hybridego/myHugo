+++
author = "Lionel.J"
title = 'Cargo troubleshooting'
date = '2025-05-26T12:52:23+09:00'
description = "cargo install - SSL connection error"
draft = false
tags = [
    "rust", "cargo", "SSL Connection error"
]
+++

## Cargo install troubleshooting

cargo로 뭐 설치하려고 할 때
```
PS D:\dev\rust> rustup update
info: syncing channel updates for 'stable-x86_64-pc-windows-msvc'
info: checking for self-update

  stable-x86_64-pc-windows-msvc unchanged - rustc 1.87.0 (17067e9ac 2025-05-09)

info: cleaning up downloads & tmp directories
PS D:\dev\rust> cargo install create-tauri-app --locked
    Updating crates.io index
warning: spurious network error (3 tries remaining): [35] SSL connect error (schannel: next InitializeSecurityContext failed: CRYPT_E_NO_REVOCATION_CHECK (0x80092012))
warning: spurious network error (2 tries remaining): [35] SSL connect error (schannel: next InitializeSecurityContext failed: CRYPT_E_NO_REVOCATION_CHECK (0x80092012))
warning: spurious network error (1 tries remaining): [35] SSL connect error (schannel: next InitializeSecurityContext failed: CRYPT_E_NO_REVOCATION_CHECK (0x80092012))
error: download of config.json failed

Caused by:
  failed to download from `https://index.crates.io/config.json`

Caused by:
  [35] SSL connect error (schannel: next InitializeSecurityContext failed: CRYPT_E_NO_REVOCATION_CHECK (0x80092012))
```
이런 에러가 발생한다면

다음 파일을 만들고
$HOME/.cargo/config.toml

내용에 다음을 추가하면 문제가 발생하지 않음.
```toml
[http]
check-revoke = false
```
