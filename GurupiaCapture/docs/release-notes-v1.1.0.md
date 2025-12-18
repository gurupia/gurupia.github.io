# GurupiaCapture v1.1.0 - UI/UX Improvements & MMF Stability

## 🎉 What's New

### Major Features

#### 🎨 Freeze Mode Drawing
완전히 새로운 그리기 모드로 안정성과 사용성이 대폭 향상되었습니다.
- **스크린샷 기반 그리기**: 투명도 및 입력 문제 완벽 해결
- **완전한 컨텍스트 메뉴**: 우클릭 메뉴 정상 작동
- **키보드 단축키**: ESC로 종료, Delete로 선택 항목 삭제

#### 📺 Real-time Preview
MMF 기반 Zero-Copy 미리보기가 완벽하게 구현되었습니다.
- **실시간 화면 표시**: 녹화 중인 화면을 실시간으로 확인
- **성능 최적화**: CPU 사용률 10-15% 감소
- **설정 가능**: 미리보기 크기 및 FPS 조절 가능

#### 🎯 Modern UI
캡슐형 녹화 컨트롤 바 및 동적 리사이징
- **세련된 디자인**: 둥근 모서리의 현대적인 UI
- **동적 크기 조절**: 미리보기 활성화 시 자동 확장
- **항상 위에 표시**: 다른 창에 가려지지 않음

---

## 🐛 Bug Fixes

### Critical Fixes

**MMF Preview Black Screen** ✅
- **문제**: 미리보기 화면이 검은색으로 표시되거나 멈춤
- **원인**: C#/C++ 구조체 정렬(Struct Alignment) 불일치
- **해결**: `Recorder_SetSharedMemory` 전용 API 도입으로 완벽 해결

**Drawing Overlay Visibility** ✅
- **문제**: 그리기 도구 사용 시 스트로크가 보이지 않음
- **원인**: WS_EX_LAYERED 윈도우의 투명도 처리 문제
- **해결**: Freeze Mode로 전면 재설계

**UI Clipping** ✅
- **문제**: 녹화 컨트롤 바의 미리보기 영역이 잘림
- **원인**: 고정된 Region 크기 (60px)
- **해결**: 동적 Region 크기 조절 구현

**MessageBox Z-Order** ✅
- **문제**: 녹화 완료 메시지가 다른 창 뒤에 숨김
- **해결**: TopMost 폼을 owner로 사용

---

## ⚡ Performance

### Zero-Copy Recording
메모리 복사 완전 제거로 성능 대폭 향상

| 항목 | 이전 | 현재 | 개선율 |
|------|------|------|--------|
| **메모리 복사** | 498 MB/s | 0 MB/s | **100%** |
| **CPU 사용률** | 15-25% | 10-18% | **30-40%** |
| **지연 시간** | 15-20ms | 8-12ms | **40%** |

### 4K Recording
고해상도 녹화 시 프레임 드롭 대폭 감소
- 3840x2160 @ 30fps: 안정적인 녹화 가능
- GPU 메모리 직접 접근으로 대역폭 절약

---

## 📚 Documentation

### New Documents
- **TROUBLESHOOTING_LOG.md**: 기술적 이슈 해결 가이드
- **DEPLOYMENT_GUIDE.md**: 배포 프로세스 완벽 가이드
- **CORE_ENGINE_RISK_ASSESSMENT.md**: 엔진 안정성 평가 보고서

### Updated Documents
- **Architecture.md**: MMF 파이프라인 다이어그램 업데이트
- **MMF_OPTIMIZATION_GUIDE.md**: 최신 구현 내용 반영
- **REFACTORING_TIMELINE.md**: Phase 7 완료 상태

---

## 📥 Download

### Windows Installer (권장)
**GurupiaCapture-Setup-1.1.0.exe** (2.73 MB)
- 원클릭 설치
- .NET Framework 4.8 자동 확인
- 시작 메뉴 바로가기 자동 생성

### System Requirements
- **OS**: Windows 10/11 (64-bit)
- **Runtime**: .NET Framework 4.8
- **RAM**: 4GB (8GB recommended for 4K)
- **Disk**: 100MB

---

## 🔗 Links

- [📖 User Guide](https://github.com/gurupia/GurupiaCapture/wiki)
- [🐛 Report Issues](https://github.com/gurupia/GurupiaCapture/issues)
- [💬 Discussions](https://github.com/gurupia/GurupiaCapture/discussions)

---

## 📝 Full Changelog

See [CHANGELOG.md](https://github.com/gurupia/GurupiaCapture/blob/main/CHANGELOG.md) for complete details.

---

## 🙏 Acknowledgments

Special thanks to all contributors and testers who helped make this release possible!

---

**Release Date**: 2025-12-18  
**Build**: refactor/capture-module-isolation@858e7eb
