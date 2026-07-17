# 포스 프로그램 다운로드

이 폴더의 `jjajangnara-pos-bridge.zip`은 관리자 패널과 `/pos-install.html`에서 제공합니다.

패키지 갱신(저장소 루트에서):

```powershell
$staging = "downloads\_pos-bridge-staging"
New-Item -ItemType Directory -Force -Path $staging | Out-Null
Copy-Item pos-bridge\bridge.ps1, pos-bridge\install.ps1, pos-bridge\config.example.json, pos-bridge\README.md -Destination $staging
Compress-Archive -Path "$staging\*" -DestinationPath "downloads\jjajangnara-pos-bridge.zip" -Force
Remove-Item $staging -Recurse -Force
```

`config.json`(토큰·프린터 설정)은 절대 ZIP에 포함하지 마세요.
