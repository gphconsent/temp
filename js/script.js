// ==================================================================
// Phase 5: 프론트엔드 기능 구현 (gphconsent.github.io)
// ==================================================================

document.addEventListener('DOMContentLoaded', () => {

  // --- ⚙️ 설정: 이 부분을 반드시 수정해야 합니다! ---
  // 1. 위 Code.gs를 웹 앱으로 배포한 후 생성된 URL을 여기에 붙여넣으세요.
  const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxWlNtc1ovqxmUn-1I9oK9PJykPWCKfayqsUJXpu_kbT4Q874Qzw8M3Qovi8us9169y6g/exec"; 
  
  // 2. Apps Script의 CONFIG 객체에 설정한 API_KEY와 동일한 값을 입력하세요.
  const API_KEY = "GEM-PROJECT-GPH-2025";
  // --------------------------------------------------

  // HTML 요소 가져오기
  const form = document.getElementById('consent-form');
  const submitBtn = document.getElementById('submit-btn');
  const loadingIndicator = document.getElementById('loading-indicator');
  const canvas = document.getElementById('signature-pad');
  const clearSignatureBtn = document.getElementById('clear-signature');
  const signaturePad = new SignaturePad(canvas, {
    backgroundColor: 'rgb(255, 255, 255)'
  });

  // 브라우저 창 크기가 변경될 때 캔버스 크기 조정
  function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    signaturePad.clear(); // 크기 변경 후 서명 다시 받기
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // "다시 서명" 버튼 기능
  clearSignatureBtn.addEventListener('click', () => {
    signaturePad.clear();
  });

  // 폼 제출 이벤트 처리
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // 기본 제출 동작 방지

    // 유효성 검사
    if (signaturePad.isEmpty()) {
      alert("서명을 반드시 입력해야 합니다.");
      return;
    }

    // 로딩 시작: 버튼 비활성화 및 로딩 인디케이터 표시
    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';
    loadingIndicator.classList.remove('hidden');

    try {
      // 1. 폼 데이터 수집
      const formData = new FormData(form);
      const params = {};
      for (let [key, value] of formData.entries()) {
        if (key.startsWith('terms')) { // 체크박스 값 처리
            params[key] = value ? "동의합니다" : "";
        } else if (key !== 'contractFile') { // 파일 제외
            params[key] = value;
        }
      }
      
      // FormData에는 있지만 누락될 수 있는 선택 동의 항목 처리
      if (!params.terms4) params.terms4 = "";

      // 2. 파일 및 서명 이미지 Base64로 변환
      const contractFile = document.getElementById('contract-file').files[0];
      const contractFileBase64 = await fileToBase64(contractFile);
      const signatureImageBase64 = signaturePad.toDataURL('image/png').split(',')[1];
      
      // 3. 백엔드로 보낼 최종 데이터 객체 생성
      const payload = {
        params: params,
        contractFile: {
          base64: contractFileBase64,
          type: contractFile.type,
          name: contractFile.name
        },
        signatureImage: {
          base64: signatureImageBase64,
          type: 'image/png',
          name: 'signature.png'
        }
      };

      // 4. fetch API로 백엔드에 데이터 전송
      const response = await fetch(`${GAS_WEB_APP_URL}?apiKey=${API_KEY}`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } // GAS doPost는 이 헤더를 권장
      });
      
      const result = await response.json();

      // 5. 결과 처리
      if (result.status === 'success') {
        alert('제출이 성공적으로 완료되었습니다.');
        form.reset();
        signaturePad.clear();
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('제출 중 오류 발생:', error);
      alert(`오류가 발생했습니다: ${error.message}`);
    } finally {
      // 로딩 종료: 버튼 활성화 및 로딩 인디케이터 숨김
      submitBtn.disabled = false;
      submitBtn.textContent = '제출하기';
      loadingIndicator.classList.add('hidden');
    }
  });

  /**
   * [헬퍼 함수] File 객체를 Base64 문자열로 변환합니다.
   * @param {File} file - 변환할 파일 객체
   * @returns {Promise<string>} - Base64로 인코딩된 문자열 (데이터 부분만)
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  }
});