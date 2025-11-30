# 🚀 Giscus 설정 빠른 가이드 (5분 완성)

## ✅ 체크리스트

- [ ] 1단계: GitHub Discussions 활성화
- [ ] 2단계: Giscus 앱 설치
- [ ] 3단계: Giscus ID 발급
- [ ] 4단계: index.html 업데이트
- [ ] 5단계: GitHub에 푸시

---

## 1️⃣ GitHub Discussions 활성화

### 방법:
1. 이 링크를 클릭: https://github.com/gurupia/gurupia.github.io/settings
2. 페이지 아래로 스크롤
3. **Features** 섹션 찾기
4. **Discussions** 체크박스 클릭 ✅
5. 자동 저장됨

### 확인:
- 저장소 탭에 "Discussions" 메뉴가 나타나면 성공!

---

## 2️⃣ Giscus 앱 설치

### 방법:
1. 이 링크를 클릭: https://github.com/apps/giscus
2. **Install** 버튼 클릭
3. **Only select repositories** 선택
4. 드롭다운에서 **gurupia.github.io** 선택
5. **Install** 클릭

### 확인:
- "Giscus was successfully installed" 메시지가 나타나면 성공!

---

## 3️⃣ Giscus ID 발급

### 방법:
1. 이 링크를 클릭: https://giscus.app/ko
2. **저장소** 입력란에 입력:
   ```
   gurupia/gurupia.github.io
   ```
3. ✅ 체크 표시가 나타날 때까지 기다리기
4. **Discussion 카테고리** 선택: **General** (또는 원하는 카테고리)
5. 페이지 아래로 스크롤
6. **giscus 사용** 섹션에서 생성된 코드 찾기

### 복사할 값:
생성된 스크립트에서 다음 두 줄을 찾아 값을 복사:

```html
data-repo-id="R_kgDO..."  ← 이 전체 값 복사
data-category-id="DIC_kwDO..."  ← 이 전체 값 복사
```

**예시:**
```
data-repo-id="R_kgDONabcde"
data-category-id="DIC_kwDONabcde4Cfgh"
```

---

## 4️⃣ index.html 업데이트

### 방법 A: 직접 편집 (추천)

1. VS Code에서 `f:\repos\gurupia.github.io-main\index.html` 열기
2. Ctrl+F로 검색: `YOUR_REPO_ID`
3. 찾은 줄을 복사한 실제 ID로 교체:

**변경 전:**
```html
data-repo-id="YOUR_REPO_ID"
data-category-id="YOUR_CATEGORY_ID"
```

**변경 후:**
```html
data-repo-id="R_kgDONabcde"
data-category-id="DIC_kwDONabcde4Cfgh"
```

4. 파일 저장 (Ctrl+S)

### 방법 B: 아래 명령어 실행

PowerShell에서 실행 (값을 실제 ID로 교체):

```powershell
cd f:\repos\gurupia.github.io-main

# YOUR_REPO_ID를 실제 값으로 교체
(Get-Content index.html) -replace 'YOUR_REPO_ID', 'R_kgDONabcde' | Set-Content index.html

# YOUR_CATEGORY_ID를 실제 값으로 교체
(Get-Content index.html) -replace 'YOUR_CATEGORY_ID', 'DIC_kwDONabcde4Cfgh' | Set-Content index.html
```

---

## 5️⃣ GitHub에 푸시

### 방법:

PowerShell에서 실행:

```powershell
cd f:\repos\gurupia.github.io-main

git add index.html
git commit -m "Update Giscus configuration with real IDs"
git push origin main
```

### 확인:
- 푸시 성공 메시지가 나타나면 완료!
- 1-2분 후 https://gurupia.github.io 새로고침

---

## 🎉 완료 확인

1. https://gurupia.github.io 접속
2. 페이지 아래로 스크롤
3. 댓글 섹션에 "Sign in with GitHub" 버튼이 보이면 성공! ✅

---

## 🐛 문제 해결

### "저장소를 찾을 수 없습니다"
- Discussions가 활성화되었는지 확인
- Giscus 앱이 설치되었는지 확인
- 저장소 이름 철자 확인: `gurupia/gurupia.github.io`

### "연결을 거부했습니다"
- `file://` 대신 `https://gurupia.github.io`에서 테스트
- 브라우저 캐시 삭제 후 새로고침

### ID가 표시되지 않음
- Discussions 카테고리를 선택했는지 확인
- 페이지를 아래로 스크롤하여 "giscus 사용" 섹션 찾기

---

## 📞 도움이 필요하신가요?

각 단계를 진행하시면서 문제가 발생하면 말씀해주세요!

- 스크린샷을 보여주시면 더 정확한 도움을 드릴 수 있습니다
- 에러 메시지를 복사해주세요

---

**예상 소요 시간: 5분**
**난이도: ⭐⭐☆☆☆ (쉬움)**

화이팅! 🚀
