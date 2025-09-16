document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------
    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 설정 영역 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    // 
    // 1. Google Apps Script(GAS) 배포 후 생성된 웹 앱 URL을 여기에 붙여넣으세요.
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyENWLvR5fPz4ytYSYJ0dgbY1GUkQIstQKlsu7q4LOCX5DBrpTKDH7uaWYe5J3Eoe9Vdg/exec'; 
    //
    // 2. GAS 코드에 설정한 API 키와 동일한 값을 입력하세요.
    const API_KEY = 'GEM-PROJECT-GPH-2025';
    //
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 설정 영역 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    // -------------------------------------------------------------------

    // 기본 요소 정의
    const form = document.getElementById('consent-form');
    const submitBtn = document.getElementById('submit-btn');

    // SignaturePad 라이브러리 로드 확인
    if (typeof SignaturePad === 'undefined') {
        alert('서명 기능을 불러오는데 실패했습니다. 페이지를 새로고침 해주세요.');
        return;
    }

    // 캔버스 요소 정의
    const nameCanvas = document.getElementById('name-pad');
    const signatureCanvas = document.getElementById('signature-pad');

    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const canvases = [nameCanvas, signatureCanvas];
        canvases.forEach(canvas => {
            if (canvas) {
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                canvas.getContext("2d").scale(ratio, ratio);
            }
        });
    }

    resizeCanvas();
    const namePad = new SignaturePad(nameCanvas, { backgroundColor: 'rgb(255, 255, 255)' });
    const signaturePad = new SignaturePad(signatureCanvas, { backgroundColor: 'rgb(255, 255, 255)' });
    
    window.addEventListener("resize", () => {
        const nameData = namePad.toDataURL();
        const signatureData = signaturePad.toDataURL();
        resizeCanvas();
        namePad.fromDataURL(nameData);
        signaturePad.fromDataURL(signatureData);
    });

    document.getElementById('clear-name').addEventListener('click', () => namePad.clear());
    document.getElementById('clear-signature').addEventListener('click', () => signaturePad.clear());

    // 이미지 미리보기 기능 헬퍼 함수
    const setupImagePreview = (inputId, previewId) => {
        const inputElement = document.getElementById(inputId);
        inputElement.addEventListener('change', () => {
            const file = inputElement.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById(previewId);
                    if (preview) {
                        preview.src = e.target.result;
                        preview.classList.remove('hidden');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    };

    setupImagePreview('contractImage', 'contract-preview');
    setupImagePreview('nameChangeImage', 'nameChange-preview');


    // 폼 제출 시 실행될 메인 이벤트
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (GAS_WEB_APP_URL === '여기에_GAS_웹앱_URL을_붙여넣으세요') {
            alert('오류: GAS 웹 앱 URL이 설정되지 않았습니다. script.js 파일을 확인해주세요.');
            return;
        }

        if (!validateForm(namePad, signaturePad)) {
            return; 
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '처리 중...';

        try {
            // 1. 모든 폼 데이터 수집
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // 2. 이름+서명 이미지, 계약서 이미지 Base64로 변환
            data.combinedSignature = await combinePads(namePad, signaturePad);
            data.contractImageFile = await fileToBase64(document.getElementById('contractImage').files[0]);
            
            const nameChangeFile = document.getElementById('nameChangeImage').files[0];
            if (nameChangeFile) {
                data.nameChangeImageFile = await fileToBase64(nameChangeFile);
            }

            // 3. 서버로 전송할 최종 데이터 객체 생성
            const payload = {
                apiKey: API_KEY,
                formData: data
            };

            // 4. fetch를 사용하여 Google Apps Script로 데이터 전송
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8', // GAS Web App은 이 형식을 사용해야 함
                },
            });

            const result = await response.json();

            if (result.status === 'success') {
                alert('동의서가 성공적으로 제출되었습니다.');
                form.reset();
                namePad.clear();
                signaturePad.clear();
                document.getElementById('contract-preview').classList.add('hidden');
                document.getElementById('nameChange-preview').classList.add('hidden');
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('제출 처리 중 오류 발생:', error);
            alert('오류가 발생했습니다: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '제출하기';
        }
    });
});


/**
 * 필수 항목 유효성 검사 함수
 */
function validateForm(namePadInstance, signaturePadInstance) {
    const fields = [
        { id: 'email', name: '이메일 주소' },
        { id: 'fullName', name: '1. 성명' },
        { name: '1-1. 계약자 본인 여부', query: 'input[name="isContractor"]:checked' },
        { id: 'dongHo', name: '2. 동호수' },
        { id: 'dob', name: '3. 생년월일' },
        { id: 'phone', name: '4. 연락처' },
        { id: 'editPassword', name: '수정용 비밀번호' },
        { id: 'contractImage', name: '5. 계약서 사진', isFile: true },
        { name: '6. 위임 내용 동의', query: 'input[name="agreeTermsRadio"]:checked' },
        { name: '7. 개인정보 수집 동의', query: '#agreePrivacy:checked' },
        { name: '8. 개인정보 제공 동의', query: '#agreeProvider:checked' }
    ];

    const missingFields = [];

    fields.forEach(field => {
        if (field.id) {
            const element = document.getElementById(field.id);
            if (field.isFile) {
                if (element.files.length === 0) missingFields.push(field.name);
            } else if (!element.value.trim()) {
                missingFields.push(field.name);
            }
        } else if (field.query) {
            if (!document.querySelector(field.query)) missingFields.push(field.name);
        }
    });

    if (namePadInstance.isEmpty()) {
        missingFields.push('10. 서명 (이름)');
    }
    if (signaturePadInstance.isEmpty()) {
        missingFields.push('10. 서명 (서명)');
    }

    if (missingFields.length > 0) {
        alert(`다음 필수 항목을 확인해주세요:\n- ${missingFields.join('\n- ')}`);
        return false;
    }
    
    // 이메일 형식 검사
    const email = document.getElementById('email').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('올바른 이메일 주소 형식을 입력해주세요.');
        return false;
    }

    // 수정용 비밀번호 형식 검사
    const password = document.getElementById('editPassword').value;
    if (!/^\d{4}$/.test(password)) {
        alert('수정용 비밀번호는 숫자 4자리로 입력해주세요.');
        return false;
    }

    return true;
}

/**
 * 두 개의 서명패드 이미지를 좌우로 합치는 함수
 */
function combinePads(namePad, signaturePad) {
    return new Promise((resolve, reject) => {
        // ... (이 함수 내용은 변경 없음)
        const nameData = namePad.toDataURL('image/png');
        const signatureData = signaturePad.toDataURL('image/png');
        const nameImage = new Image();
        const signatureImage = new Image();
        let loadedImages = 0;
        const totalImages = 2;

        const onImageLoad = () => {
            loadedImages++;
            if (loadedImages === totalImages) {
                const tempCanvas = document.createElement('canvas');
                const ctx = tempCanvas.getContext('2d');
                tempCanvas.width = nameImage.width + signatureImage.width;
                tempCanvas.height = Math.max(nameImage.height, signatureImage.height);
                
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                
                ctx.drawImage(nameImage, 0, 0);
                ctx.drawImage(signatureImage, nameImage.width, 0);
                
                resolve(tempCanvas.toDataURL('image/png'));
            }
        };
        nameImage.onload = onImageLoad;
        signatureImage.onload = onImageLoad;
        nameImage.onerror = () => reject(new Error("이름 이미지를 불러오지 못했습니다."));
        signatureImage.onerror = () => reject(new Error("서명 이미지를 불러오지 못했습니다."));
        nameImage.src = nameData;
        signatureImage.src = signatureData;
    });
}

/**
 * [신규 추가] 파일을 Base64 데이터로 변환하는 헬퍼 함수
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // 'data:image/png;base64,' 부분 제거
            const base64 = reader.result.split(',')[1];
            resolve({
                base64: base64,
                type: file.type,
                name: file.name
            });
        };
        reader.onerror = error => reject(error);
    });
}