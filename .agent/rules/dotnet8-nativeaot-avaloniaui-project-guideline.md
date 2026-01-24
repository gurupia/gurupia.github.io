---
trigger: manual
---

이 지침은 "빠르고, 가볍고, 독립적인(Fast, Lightweight, Self-contained)" 애플리케이션 구축을 목표로 합니다.

️ 1. 아키텍처 원칙: 독립성과 고성능 (Architecture Philosophy)
프로젝트의 핵심 철학은 외부 의존성을 최소화하고 하드웨어 성능을 극한으로 끌어내는 것입니다.
완전 독립 실행형 (Fully Self-Contained):
사용자에게 런타임 설치를 강요하지 마십시오. .NET 8+ 프로젝트는 반드시 NativeAOT (Ahead-of-Time) 컴파일을 적용하여 단일 실행 파일로 배포해야 합니다.
Trimming 활성화: 빌드 크기를 줄이기 위해 TrimMode=full을 기본으로 설정하되, 리플렉션 오류를 방지하기 위해 rd.xml을 관리하십시오.
Zero Allocation (무할당 원칙):
GC(가비지 컬렉터)의 개입을 최소화하여 끊김 없는(Stutter-free) 사용자 경험을 제공해야 합니다. 힙(Heap) 할당을 피하고 스택(Stack)과 풀링(Pooling)을 적극 활용하십시오.
Zero Tracking & No Pop-ups:
사용자 경험을 최우선으로 하여, 불필요한 데이터 수집이나 팝업을 배제한 깔끔한 UI/UX를 설계하십시오.

️ 2. 기술 스택 및 구현 전략 (Tech Stack Strategy)
PicView의 성공 사례를 벤치마킹하여 다음과 같은 라이브러리와 패턴을 표준으로 채택합니다.
A. UI 프레임워크: Avalonia UI (Cross-Platform)
선정 이유: Windows(WPF/WinForms 대체)와 macOS를 동시에 지원하며, XAML 기반의 강력한 유연성을 제공합니다.
구현 지침:
WPF/WinForms 스타일의 코드 비하인드(Code-behind)를 지양하고, 철저한 MVVM 패턴을 준수하십시오.
Compiled Bindings(x:CompileBindings="True")를 사용하여 런타임 리플렉션 비용을 제거하고 바인딩 속도를 높이십시오.
B. 데이터 처리 및 성능 최적화 (Cysharp Ecosystem)
문자열 처리: C#의 기본 string 대신 ZString을 사용하여 문자열 포맷팅 시 발생하는 메모리 할당을 제거하십시오.
LINQ 대체: 표준 LINQ 대신 구조체 기반의 ZLinq를 사용하여 반복문 처리 시 GC 부하를 없애십시오.
반응형 프로그래밍: System.Reactive 대신 R3를 도입하십시오. 이는 NativeAOT와 호환되며, Observable 스트림 처리에 있어 할당 비용이 거의 없습니다.
C. 이미지 및 미디어 처리
라이브러리: Magick.NET을 표준으로 사용하되, 플랫폼(ARM64/x64)에 맞는 NuGet 패키지를 조건부로 참조하도록 .csproj를 구성하십시오.
스트리밍: 대용량 파일(CBZ, PDF 등) 처리 시, 전체를 로딩하지 말고 가상 파일 시스템(VFS) 구조를 통해 필요한 부분만 메모리 스트림으로 추출하십시오 (대화 기록 참조).

⚡ 3. 동시성 및 비동기 모델 (Concurrency & Async)
UI 프리징을 방지하고 반응성을 극대화하기 위한 스레딩 규칙입니다.
R3 기반의 이벤트 제어:
사용자의 연속적인 입력(스크롤, 페이지 넘김)은 R3의 .Switch() 연산자를 사용하여 이전 작업을 즉시 취소(Cancel)하고 최신 요청만 처리하십시오.
SerialDisposable을 활용하여 이미지 리소스나 네이티브 핸들을 즉시 해제하십시오.
스레드 격리:
무거운 작업(압축 해제, 렌더링)은 반드시 Task.Run으로 스레드 풀로 위임해야 합니다.
결과 업데이트 시에만 .ObserveOnCurrentSynchronizationContext()를 통해 UI 스레드로 복귀하십시오.

 4. 상호 운용성 및 Rust 통합 (Interop & FFI)
C#만으로 성능 한계가 있거나 보안이 중요한 모듈은 Rust로 작성하고 연동하는 것을 권장합니다.
Source Generator 활용:
기존의 [DllImport] 대신 .NET 7+의 [LibraryImport]를 사용하여 마샬링 코드를 컴파일 시점에 생성하십시오 (대화 기록 참조).
이는 런타임 오버헤드를 줄이고 NativeAOT 빌드 오류를 방지합니다.
Zero-Copy 데이터 전달:
이미지 데이터나 대용량 배열을 전달할 때는 Marshal.Copy를 피하고, unsafe 포인터(void*)나 Span<T>를 사용하여 네이티브 메모리를 직접 참조하십시오.

 5. 빌드 및 배포 파이프라인 (Build & CI/CD)
멀티 아키텍처 지원:
Windows(x64, arm64)와 macOS(x64, arm64)를 모두 타겟팅해야 합니다. 특히 Apple Silicon(M1/M2) 및 Surface Pro X와 같은 ARM64 장비 지원을 위해 조건부 컴파일 설정을 필수적으로 포함하십시오.
자동화:
GitHub Actions를 통해 빌드, 테스트, 그리고 바이러스 검사 및 코드 서명(Code Signing)을 자동화하여 배포 신뢰성을 확보하십시오.
 요약: 범용 프로젝트 체크리스트
[Core] .NET 8 + Avalonia UI + NativeAOT (TrimMode=Full)
[Perf] ZString, ZLinq, ArrayPool 사용 (No new byte[])
[Reactive] R3를 이용한 ViewModel 바인딩 및 이벤트 핸들링
[Interop] [LibraryImport] 및 Source Generator 적극 활용
[Platform] Windows/macOS 및 x64/ARM64 교차 지원 구성