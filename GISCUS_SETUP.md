# Giscus 댓글 시스템 설정 가이드

## 🎯 개요
이 페이지에는 GitHub Discussions 기반의 Giscus 댓글 시스템이 통합되어 있습니다.
7가지 테마에 맞춰 자동으로 댓글 시스템 테마도 변경됩니다.

---

## 📋 설정 단계

### 1단계: GitHub Discussions 활성화

1. GitHub 저장소로 이동: https://github.com/gurupia/gurupia.github.io
2. **Settings** 탭 클릭
3. 아래로 스크롤하여 **Features** 섹션 찾기
4. **Discussions** 체크박스 활성화 ✅

### 2단계: Giscus 앱 설치

1. https://github.com/apps/giscus 방문
2. **Install** 버튼 클릭
3. 저장소 선택:
   - **Only select repositories** 선택
   - `gurupia.github.io` 저장소 선택
4. **Install** 클릭

### 3단계: Giscus 설정 생성

1. https://giscus.app/ko 방문
2. 다음 정보 입력:

#### 저장소 설정
```
저장소: gurupia/gurupia.github.io
```

#### Discussion 카테고리
- **General** 또는 **Announcements** 선택 (추천: General)

#### 매핑
- **pathname** 선택 (현재 설정)
- URL 경로를 기반으로 자동 매핑

#### 기능
- ✅ 반응 활성화
- ✅ 메타데이터 전송 비활성화
- ✅ 댓글 입력 위치: 상단

#### 테마
- **dark** (기본값, 코드에서 자동 전환됨)

#### 언어
- **한국어 (ko)**

### 4단계: 생성된 코드에서 ID 복사

Giscus 설정 페이지 하단에 생성된 스크립트에서 다음 값을 복사:

```html
<script src="https://giscus.app/client.js"
        data-repo="gurupia/gurupia.github.io"
        data-repo-id="R_여기에_생성된_ID"  ← 이 값 복사
        data-category="General"
        data-category-id="DIC_여기에_생성된_ID"  ← 이 값 복사
        ...
</script>
```

### 5단계: index.html 업데이트

`index.html` 파일에서 다음 부분을 찾아 수정:

**현재 (794-823줄 근처):**
```html
<script src="https://giscus.app/client.js"
        data-repo="gurupia/gurupia.github.io"
        data-repo-id="YOUR_REPO_ID"  ← 여기 수정
        data-category="General"
        data-category-id="YOUR_CATEGORY_ID"  ← 여기 수정
```

**수정 후:**
```html
<script src="https://giscus.app/client.js"
        data-repo="gurupia/gurupia.github.io"
        data-repo-id="R_kgDON..."  ← 복사한 값 붙여넣기
        data-category="General"
        data-category-id="DIC_kwDON..."  ← 복사한 값 붙여넣기
```

### 6단계: GitHub에 푸시

```bash
git add index.html
git commit -m "Add Giscus comment system"
git push origin main
```

---

## 🎨 테마별 Giscus 테마 매핑

| 페이지 테마 | Giscus 테마 | 설명 |
|------------|------------|------|
| Matrix | dark | 기본 다크 테마 |
| Cyberpunk | dark_dimmed | 어두운 딤 테마 |
| Terminal | dark_high_contrast | 고대비 다크 테마 |
| Retro | dark_tritanopia | 색맹 친화적 다크 |
| Monochrome | light | 라이트 테마 |
| Grayscale | light_high_contrast | 고대비 라이트 |
| Artist | dark_dimmed | 어두운 딤 테마 |

테마 전환 시 댓글 시스템도 자동으로 변경됩니다!

---

## ✨ 기능

### 댓글 작성
- GitHub 계정으로 로그인 필요
- 마크다운 지원
- 코드 블록, 이미지 첨부 가능

### 답글
- 댓글에 답글 작성 가능
- 스레드 형태로 대화 진행

### 반응
- 👍 👎 😄 🎉 😕 ❤️ 🚀 👀 등 GitHub 반응 사용 가능

### 알림
- GitHub 알림으로 새 댓글 수신
- 이메일 알림 설정 가능

---

## 🔧 고급 설정

### 카테고리 변경
다른 Discussion 카테고리를 사용하려면:

1. GitHub 저장소 → Discussions → Categories
2. 새 카테고리 생성 또는 기존 카테고리 선택
3. Giscus 설정 페이지에서 해당 카테고리 선택
4. 새로운 `data-category-id` 복사 및 업데이트

### 매핑 방식 변경
- **pathname**: URL 경로 기반 (현재 설정)
- **url**: 전체 URL 기반
- **title**: 페이지 제목 기반
- **og:title**: Open Graph 제목 기반
- **specific**: 특정 Discussion 번호 지정
- **number**: Discussion 번호 직접 입력

---

## 🐛 문제 해결

### 댓글이 표시되지 않는 경우

1. **Discussions 활성화 확인**
   - 저장소 Settings → Features → Discussions 체크

2. **Giscus 앱 설치 확인**
   - https://github.com/apps/giscus 에서 설치 상태 확인

3. **ID 값 확인**
   - `data-repo-id`와 `data-category-id`가 올바른지 확인
   - `YOUR_REPO_ID` 같은 플레이스홀더가 남아있지 않은지 확인

4. **저장소 공개 여부**
   - Giscus는 공개(public) 저장소에서만 작동
   - 저장소 Settings → Danger Zone에서 확인

5. **브라우저 콘솔 확인**
   - F12 → Console 탭에서 에러 메시지 확인

### 테마가 변경되지 않는 경우

- 페이지 새로고침 후 테마 전환 시도
- 브라우저 캐시 삭제
- 1초 정도 기다린 후 테마 전환 (iframe 로딩 시간)

---

## 📚 참고 자료

- Giscus 공식 사이트: https://giscus.app/ko
- Giscus GitHub: https://github.com/giscus/giscus
- GitHub Discussions 문서: https://docs.github.com/en/discussions

---

## 💡 팁

### 댓글 관리
- GitHub 저장소의 Discussions 탭에서 모든 댓글 관리 가능
- 스팸 댓글 삭제, 수정, 잠금 가능
- 카테고리별로 정리 가능

### 알림 설정
- GitHub Settings → Notifications에서 알림 설정
- 새 댓글 시 이메일 또는 웹 알림 수신

### 모더레이션
- 저장소 Settings → Moderation에서 차단 사용자 관리
- 댓글 자동 잠금 설정 가능

---

**설정 완료 후 페이지를 새로고침하면 댓글 시스템이 활성화됩니다!** 🎉
