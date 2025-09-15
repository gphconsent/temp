// 서명패드 라이브러리 초기화
const canvas = document.querySelector("#signature-pad");
const signaturePad = new SignaturePad(canvas, {
    backgroundColor: 'rgb(255, 255, 255)'
});

// "다시 서명" 버튼 이벤트 리스너
document.getElementById('clear-signature').addEventListener('click', function () {
    signaturePad.clear();
});

// 폼 제출 이벤트 리스너
const form = document.getElementById('consent-form');
form.addEventListener('submit', function(event) {
    event.preventDefault(); // 폼의 기본 제출 동작 방지

    // 서명이 비어있는지 확인
    if (signaturePad.isEmpty()) {
        alert("서명을 반드시 입력해야 합니다.");
        return;
    }

    // TODO: 
    // 1. 로딩 인디케이터 표시
    // 2. 폼 데이터 수집 (입력값, 파일, 서명 이미지)
    // 3. FormData 객체 생성 및 데이터 추가
    // 4. fetch를 사용하여 백엔드(GAS)로 데이터 전송
    // 5. 백엔드 응답에 따른 처리 (성공/실패 메시지 표시)
    // 6. 로딩 인디케이터 숨김

    console.log("폼 제출 버튼 클릭됨");
    // 여기에 실제 제출 로직을 구현할 예정입니다.
});