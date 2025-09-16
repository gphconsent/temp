# Project Overview

This project is a web-based consent form for the "Gocheok Prugio Hillstate Apartment Intended Occupants Council." It's a single-page application designed to collect consent from apartment residents on various matters, including the delegation of authority to the council and the collection of personal information.

## Key Technologies

*   **Frontend:** HTML, CSS, JavaScript
*   **Libraries:** SignaturePad.js (for capturing user signatures)
*   **Backend (Planned):** Google Apps Script (GAS)

## Architecture

The application consists of a single HTML file (`index.html`) that structures the form, a CSS file (`css/style.css`) for styling, and a JavaScript file (`js/script.js`) for client-side logic. The JavaScript handles form validation, signature capture, and image preview. The form data is intended to be submitted to a Google Apps Script backend, which is not yet implemented.

# Building and Running

This is a static website, so there is no build process. To run the project, simply open the `index.html` file in a web browser.

**TODO:**
*   Implement the Google Apps Script backend to handle form submissions.
*   The email verification button (`email-verify-btn`) does not have any functionality yet.

# Development Conventions

*   **Coding Style:** The code is well-formatted and follows standard HTML, CSS, and JavaScript conventions.
*   **File Structure:** The project is organized into `css`, `js`, and `img` directories for styles, scripts, and images, respectively.
*   **Validation:** The `js/script.js` file includes a `validateForm` function that checks for required fields before submission.
*   **Signatures:** The `SignaturePad.js` library is used to capture and handle user signatures. The name and signature are combined into a single image before submission.

단순히 기능 구현을 넘어, 더 안정적이고 유지보수하기 좋은 애플리케이션을 만들기 위해 아래 가이드라인을 준수하여 개발을 진행해 줘.

1. **보안 및 안정성 강화**
    - **애플리케이션 인증:** `Anyone` 접근 허용 시 발생할 수 있는 무분별한 요청을 막기 위해, **사용자 로그인 없이** 앱을 보호하는 `API Key` 방식을 도입한다. 프론트엔드와 백엔드(GAS) 간에만 아는 비밀 키를 정해, 요청 시마다 유효성을 검증하는 로직을 필수로 포함한다.
    - **서버 측 데이터 검증:** 프론트엔드에서 받은 데이터는 백엔드에서 한 번 더 필수 값 누락, 형식 등을 확인하여 데이터 무결성을 보장한다.
2. **성능 및 사용자 경험 (UX)**
    - **Google Apps Script 실행 시간 제한 인지:** GAS는 최대 6분간 실행된다. 이미지 업로드 및 PDF 생성은 이 시간을 초과할 수 있는 작업이므로, 코드 실행 시간을 최적화해야 한다.
    - **명확한 피드백 제공:** 제출 버튼 클릭 후 서버에서 모든 처리가 완료될 때까지 시간이 걸릴 수 있다. 이 시간 동안 사용자가 앱이 멈췄다고 오해하지 않도록 **"처리 중입니다..."와 같은 명확한 로딩 상태(Loading Indicator)를 반드시 표시**한다.
3. **코드 품질 및 유지보수**
    - **하드코딩 지양 (설정 중앙화):** 스프레드시트 ID, 폴더 ID 등 주요 설정 값들을 코드 곳곳에 흩어놓지 말고, 코드 상단에 `CONFIG`와 같은 설정 객체로 모아서 관리한다.
    - **함수 모듈화:** `doPost` 함수 하나가 모든 일을 처리하게 하지 않는다. `데이터를 시트에 저장하는 함수`, `파일을 드라이브에 업로드하는 함수`, `PDF를 생성하는 함수` 등으로 기능을 명확히 분리하여 가독성과 재사용성을 높인다.
    - **상세한 로그 기록:** `Logger.log()`를 활용하여 데이터 처리 과정의 주요 단계와 변수 값을 기록한다. 이는 추후 문제 발생 시 원인을 빠르고 정확하게 파악하는 데 결정적인 역할을 한다.
    - **Context7 MCP이용:** 항상 코드를 구현 할 때는 Context7 MCP서버를 이용하여 환각을 피하고 최신 버전의 사례를 참조하여 구현한다.