# GurupiaCapture 배포 가이드

**버전**: 1.1.0  
**작성일**: 2025-12-18  
**대상**: 개발자 및 릴리즈 관리자

---

## 📋 목차

1. [사전 준비](#사전-준비)
2. [빌드 프로세스](#빌드-프로세스)
3. [설치 프로그램 생성](#설치-프로그램-생성)
4. [배포 체크리스트](#배포-체크리스트)
5. [GitHub Release 생성](#github-release-생성)
6. [문제 해결](#문제-해결)

---

## 🔧 사전 준비

### 필수 도구

1. **Visual Studio 2019+** (C++ 및 C# 워크로드)
2. **Inno Setup 6.0+**
   - 다운로드: https://jrsoftware.org/isdl.php
   - 설치 후 시스템 PATH에 `ISCC.exe` 추가 권장

3. **.NET Framework 4.8 SDK**
4. **Git** (버전 태깅용)

### 환경 변수 확인

```powershell
# Inno Setup 컴파일러 경로 확인
where iscc

# 출력 예시: C:\Program Files (x86)\Inno Setup 6\ISCC.exe
```

---

## 🏗️ 빌드 프로세스

### 1. C++ Core 빌드

```powershell
# 프로젝트 루트에서 실행
cd f:\repos\CPP\GurupiaCapture

# C++ Core 빌드 (Release x64)
msbuild src\Core\GurupiaCapture.Core.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PlatformToolset=v143

# 빌드 결과 확인
dir src\Core\Release\GurupiaCapture.Core.dll
```

### 2. C# App 빌드

```powershell
# App 빌드 스크립트 실행
cd src\App
.\build_app.bat

# 또는 수동 빌드
dotnet restore GurupiaCapture.App.csproj
msbuild GurupiaCapture.App.csproj /p:Configuration=Release /p:Platform=x64

# 빌드 결과 확인
dir bin\Release\GurupiaCapture.exe
dir bin\Release\GurupiaCapture.Core.dll
```

### 3. GuruRecover 빌드

```powershell
cd src\Tools\GuruRecover
msbuild GuruRecover.vcxproj /p:Configuration=Release /p:Platform=x64

# 빌드 결과 확인
dir bin\Release\GuruRecover.exe
```

### 4. 전체 빌드 자동화 (권장)

```powershell
# 루트에 build_all.ps1 생성 (아래 스크립트 참고)
.\build_all.ps1
```

**`build_all.ps1` 내용:**
```powershell
# GurupiaCapture Full Build Script
param(
    [string]$Configuration = "Release",
    [string]$Platform = "x64"
)

Write-Host "=== GurupiaCapture Full Build ===" -ForegroundColor Cyan
Write-Host "Configuration: $Configuration" -ForegroundColor Yellow
Write-Host "Platform: $Platform" -ForegroundColor Yellow

# 1. C++ Core
Write-Host "`n[1/3] Building C++ Core..." -ForegroundColor Green
msbuild src\Core\GurupiaCapture.Core.vcxproj /p:Configuration=$Configuration /p:Platform=$Platform /p:PlatformToolset=v143
if ($LASTEXITCODE -ne 0) { throw "C++ Core build failed" }

# 2. C# App
Write-Host "`n[2/3] Building C# App..." -ForegroundColor Green
cd src\App
.\build_app.bat
if ($LASTEXITCODE -ne 0) { throw "C# App build failed" }
cd ..\..

# 3. GuruRecover
Write-Host "`n[3/3] Building GuruRecover..." -ForegroundColor Green
msbuild src\Tools\GuruRecover\GuruRecover.vcxproj /p:Configuration=$Configuration /p:Platform=$Platform
if ($LASTEXITCODE -ne 0) { throw "GuruRecover build failed" }

Write-Host "`n=== Build Completed Successfully ===" -ForegroundColor Green
```

---

## 📦 설치 프로그램 생성

### 방법 1: Inno Setup GUI 사용

1. **Inno Setup Compiler** 실행
2. `File` → `Open` → `installer\GurupiaCapture.iss` 선택
3. `Build` → `Compile` (또는 `Ctrl+F9`)
4. 완료 후 `installer\output\GurupiaCapture-Setup-1.1.0.exe` 생성 확인

### 방법 2: 명령줄 빌드 (자동화)

```powershell
# Inno Setup 컴파일러로 빌드
iscc installer\GurupiaCapture.iss

# 출력 확인
dir installer\output\GurupiaCapture-Setup-*.exe
```

### 방법 3: 통합 빌드 스크립트

**`build_installer.ps1` 생성:**
```powershell
# Build All + Create Installer
param(
    [string]$Version = "1.1.0"
)

Write-Host "=== Building GurupiaCapture v$Version ===" -ForegroundColor Cyan

# Step 1: Full Build
.\build_all.ps1
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

# Step 2: Update version in .iss
$issFile = "installer\GurupiaCapture.iss"
(Get-Content $issFile) -replace '#define MyAppVersion ".*"', "#define MyAppVersion `"$Version`"" | Set-Content $issFile

# Step 3: Compile Installer
Write-Host "`n=== Creating Installer ===" -ForegroundColor Green
iscc $issFile
if ($LASTEXITCODE -ne 0) { throw "Installer creation failed" }

Write-Host "`n=== Installer Created Successfully ===" -ForegroundColor Green
Write-Host "Output: installer\output\GurupiaCapture-Setup-$Version.exe" -ForegroundColor Yellow
```

**실행:**
```powershell
.\build_installer.ps1 -Version "1.1.0"
```

---

## ✅ 배포 체크리스트

릴리즈 전 다음 항목을 확인하세요:

### 코드 품질
- [ ] 모든 빌드 경고 해결
- [ ] 주요 기능 수동 테스트 완료
- [ ] 메모리 누수 점검 (장시간 녹화 테스트)
- [ ] 크래시 리포트 확인 (없음)

### 버전 관리
- [ ] `AssemblyInfo.cs` 버전 업데이트
- [ ] `GurupiaCapture.iss` 버전 업데이트
- [ ] `CHANGELOG.md` 작성
- [ ] Git 태그 생성 (`v1.1.0`)

### 문서
- [ ] `README.md` 업데이트 (새 기능 반영)
- [ ] `docs/` 폴더 최신화
- [ ] 릴리즈 노트 작성

### 설치 프로그램
- [ ] 설치 테스트 (깨끗한 Windows 10/11 VM)
- [ ] 업그레이드 테스트 (이전 버전 → 신규 버전)
- [ ] 언인스톨 테스트
- [ ] .guru 파일 연결 확인
- [ ] 바이러스 스캔 (VirusTotal 업로드)

---

## 🚀 GitHub Release 생성

### 1. Git 태그 생성

```powershell
# 현재 변경사항 커밋
git add .
git commit -m "Release v1.1.0"

# 태그 생성
git tag -a v1.1.0 -m "Release v1.1.0 - UI/UX Improvements & MMF Stability"

# 푸시
git push origin main
git push origin v1.1.0
```

### 2. GitHub Release 생성

1. GitHub 저장소 → `Releases` → `Draft a new release`
2. **Tag version**: `v1.1.0` 선택
3. **Release title**: `GurupiaCapture v1.1.0 - UI/UX Improvements`
4. **Description** (예시):

```markdown
## 🎉 What's New in v1.1.0

### Major Features
- **Freeze Mode Drawing**: 완전히 새로운 그리기 모드로 안정성 대폭 향상
- **Real-time Preview**: MMF 기반 Zero-Copy 미리보기 완벽 구현
- **Modern UI**: 캡슐형 녹화 컨트롤 바 및 동적 리사이징

### Bug Fixes
- Fixed: MMF preview black screen (struct alignment issue)
- Fixed: Drawing overlay visibility and interaction
- Fixed: MessageBox Z-order issues

### Performance
- CPU usage reduced by 10-15% during recording
- Memory copy eliminated (498 MB/s → 0 MB/s)

### Documentation
- Added comprehensive troubleshooting guide
- Updated architecture and MMF optimization docs

## 📥 Download

- **Windows Installer**: `GurupiaCapture-Setup-1.1.0.exe` (권장)
- **Portable**: `GurupiaCapture-Portable-1.1.0.zip`

## 📋 System Requirements

- Windows 10/11 (64-bit)
- .NET Framework 4.8
- 4GB RAM (8GB recommended for 4K recording)

## 🔗 Links

- [User Guide](https://github.com/gurupia/GurupiaCapture/wiki)
- [Report Issues](https://github.com/gurupia/GurupiaCapture/issues)
```

5. **Assets 업로드**:
   - `GurupiaCapture-Setup-1.1.0.exe`
   - (선택) Portable ZIP 버전

6. **Publish release** 클릭

---

## 🐛 문제 해결

### 문제 1: "ISCC.exe not found"

**해결:**
```powershell
# Inno Setup 경로를 PATH에 추가
$env:Path += ";C:\Program Files (x86)\Inno Setup 6"

# 또는 전체 경로 사용
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\GurupiaCapture.iss
```

### 문제 2: "GurupiaCapture.Core.dll not found"

**원인**: C++ Core 빌드 실패 또는 경로 불일치

**해결:**
```powershell
# C++ Core 수동 빌드
msbuild src\Core\GurupiaCapture.Core.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PlatformToolset=v143

# DLL을 App 폴더로 수동 복사
copy src\Core\Release\GurupiaCapture.Core.dll src\App\bin\Release\
```

### 문제 3: 설치 시 ".NET Framework 4.8 required" 메시지

**정상 동작**: 스크립트가 자동으로 .NET 4.8 설치 페이지로 안내합니다.

**오프라인 설치 지원 (선택):**
1. .NET 4.8 오프라인 설치 파일 다운로드
2. `installer\redist\` 폴더에 저장
3. `.iss` 파일 수정하여 번들 설치 구현

---

## 📊 배포 통계 (참고)

### 예상 파일 크기
- **설치 프로그램**: ~15-20 MB (압축)
- **설치 후 크기**: ~50-60 MB
- **Core DLL**: ~2-3 MB
- **App EXE**: ~5-8 MB

### 다운로드 속도 (참고)
- GitHub Releases: 평균 5-10 MB/s
- CDN 사용 시: 20-50 MB/s

---

## 🔄 자동 업데이트 (Phase 8.2 - 향후 구현)

현재는 수동 다운로드 방식이지만, 향후 자동 업데이트 기능 구현 예정:

```csharp
// Services/UpdateService.cs (예정)
public async Task<UpdateInfo> CheckForUpdates() {
    var response = await httpClient.GetAsync(
        "https://api.github.com/repos/gurupia/GurupiaCapture/releases/latest");
    // ...
}
```

---

**작성자**: AI Assistant (Antigravity)  
**최종 업데이트**: 2025-12-18  
**다음 단계**: 실제 설치 프로그램 빌드 및 테스트
