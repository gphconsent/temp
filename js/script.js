// ===================================================================
// script.js (전체 교체)
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------
    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 설정 영역 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzbees1nuvN2GNOoZGgIp_9RLBRjahfFunHG08zK0l358EEMZTwQrM5pKI5RRN-bZLbMw/exec'; 
    const API_KEY = 'GEM-PROJECT-GPH-2025';
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 설정 영역 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    // -------------------------------------------------------------------

    // --- 기본 요소 정의 ---
    const form = document.getElementById('consent-form');
    const submitBtn = document.getElementById('submit-btn');

    // 디버깅: 요소들이 제대로 찾아졌는지 확인
    console.log('Form:', form);
    console.log('Submit button:', submitBtn);

    // --- 이메일 인증 관련 요소 정의 (신규) ---
    const emailInput = document.getElementById('email');
    const sendVerificationBtn = document.getElementById('send-verification-btn');
    const verificationCodeGroup = document.getElementById('verification-code-group');
    const verificationCodeInput = document.getElementById('verification-code');
    const confirmVerificationBtn = document.getElementById('confirm-verification-btn');
    const emailStatusMsg = document.getElementById('email-status-msg');

    // --- 상태 변수 (신규) ---
    let isEmailVerified = false;
    let serverVerificationCode = ''; // 서버로부터 받은 인증코드를 저장할 변수

    // --- 서명패드 관련 요소 정의 ---
    const namePadCanvas = document.getElementById('name-pad');
    const signaturePadCanvas = document.getElementById('signature-pad');
    const clearNameBtn = document.getElementById('clear-name');
    const clearSignatureBtn = document.getElementById('clear-signature');

    // --- 수정 관련 요소 정의 ---
    const openEditModalBtn = document.getElementById('open-edit-modal-btn');
    const editRequestModal = document.getElementById('edit-request-modal');
    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    const requestEditLinkBtn = document.getElementById('request-edit-link-btn');
    const editEmailInput = document.getElementById('edit-email');
    const editPasswordInput = document.getElementById('edit-password-check');
    const editStatusMsg = document.getElementById('edit-status-msg');

    let currentEditMode = false; // 현재 수정 모드인지 확인하는 플래그

    // --- 수정 모달 열고 닫기 ---
    openEditModalBtn.addEventListener('click', () => editRequestModal.classList.remove('hidden'));
    closeEditModalBtn.addEventListener('click', () => editRequestModal.classList.add('hidden'));


    // SignaturePad 라이브러리 확인 및 초기화
    if (typeof SignaturePad === 'undefined') {
        console.error('SignaturePad library not loaded!');
        alert('서명 기능을 불러오는데 실패했습니다. 페이지를 새로고침 해주세요.');
        return;
    }

    // Canvas 크기 조정 함수
    const resizeCanvas = (canvas) => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const rect = canvas.getBoundingClientRect();

        // Canvas의 실제 크기를 CSS 크기에 맞춤
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;

        // Context 스케일링
        const ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);

        // CSS 크기 설정
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
    };

    // Canvas들 크기 조정
    resizeCanvas(namePadCanvas);
    resizeCanvas(signaturePadCanvas);

    const namePad = new SignaturePad(namePadCanvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        minWidth: 1,
        maxWidth: 2.5
    });
    const signaturePad = new SignaturePad(signaturePadCanvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        minWidth: 1,
        maxWidth: 2.5
    });

    // 윈도우 리사이즈 시 canvas 크기 재조정
    window.addEventListener('resize', () => {
        const nameData = namePad.toDataURL();
        const signatureData = signaturePad.toDataURL();

        resizeCanvas(namePadCanvas);
        resizeCanvas(signaturePadCanvas);

        namePad.fromDataURL(nameData);
        signaturePad.fromDataURL(signatureData);
    });

    console.log('SignaturePads initialized successfully');
    console.log('Name canvas dimensions:', namePadCanvas.width, 'x', namePadCanvas.height);
    console.log('Signature canvas dimensions:', signaturePadCanvas.width, 'x', signaturePadCanvas.height);
    console.log('Name canvas style:', namePadCanvas.style.width, 'x', namePadCanvas.style.height);
    console.log('Signature canvas style:', signaturePadCanvas.style.width, 'x', signaturePadCanvas.style.height);
    
    // --- 이미지 미리보기 요소 정의 ---
    const contractImageInput = document.getElementById('contractImage');
    const contractPreview = document.getElementById('contract-preview');
    const nameChangeImageInput = document.getElementById('nameChangeImage');
    const nameChangePreview = document.getElementById('nameChange-preview');

    // [수정] 제출 버튼을 기본적으로 비활성화
    submitBtn.disabled = true;

    // ===================================================================
    // 헬퍼 함수
    // ===================================================================

    // ===================================================================
    // 이벤트 리스너
    // ===================================================================

    // --- 페이지 로드: 수정 모드 감지 ---
    window.addEventListener('load', async () => {
        console.log("페이지 로드 완료. 수정 토큰을 확인합니다...");
        const params = new URLSearchParams(window.location.search);
        const editToken = params.get('editToken');
        if (editToken) {
            console.log("수정 토큰 발견:", editToken);
            isEditMode = true;
            document.querySelector('header h1').textContent = '동의서 내용 수정';
            openEditModalBtn.classList.add('hidden');
            loadingModal.classList.remove('hidden');
            try {
                const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ apiKey: API_KEY, action: 'getEditData', token: editToken }) });
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message);
                populateForm(result.data);
            } catch (e) {
                alert('데이터 로딩 실패: ' + e.message);
                window.location.href = window.location.pathname;
            } finally {
                loadingModal.classList.add('hidden');
            }
        }
    });

    // --- 폼 채우기 함수 ---
    function populateForm(data) {
        originalEmail = data['이메일 주소']; // 원본 이메일 저장
        document.getElementById('fullName').value = data['1. 성명(계약서와 일치)'] || '';
        document.getElementById('dongHo').value = data['2. 동 호수'] || '';
        document.getElementById('dob').value = data['3. 생년월일(8자리)'] || '';
        document.getElementById('phone').value = data['4. 연락처'] || '';
        document.getElementById('editPassword').placeholder = '새 비밀번호 입력 시에만 변경됩니다';
        document.getElementById('editPassword').required = false;

        document.querySelector(`input[name="isContractor"][value="${data['1-1. 본 설문을 작성하시는 분은 계약자 본인이십니까?']}"]`).checked = true;
        document.querySelector(`input[name="agreeTermsRadio"][value="${data['6. 위임 내용'] === '동의합니다' ? 'agree' : 'disagree'}"]`).checked = true;
        document.getElementById('agreePrivacy').checked = data['7. 개인정보 수집 및 이용 동의'] === '동의합니다';
        document.getElementById('agreeProvider').checked = data['8. 개인정보 제3자 제공 동의'] === '동의합니다';
        document.querySelector(`input[name="agreeMarketingRadio"][value="${data['9. 홍보 및 소식 전달을 위한 개인정보 수집·이용 동의 (선택)'] === '동의합니다' ? 'agree' : 'disagree'}"]`).checked = true;

        const setImagePreview = (imgElement, url) => {
            if (url) {
                imgElement.src = url;
                imgElement.classList.remove('hidden');
            }
        };
        setImagePreview(contractPreview, data['5. 계약서 사진첨부']);
        setImagePreview(signaturePreview, data['10. 자필 성명과 서명']);
        setImagePreview(nameChangePreview, data['11. (선택) 명의변경 등']);

        emailSection.classList.add('hidden');
        originalEmailDisplay.textContent = originalEmail;
        originalEmailSection.classList.remove('hidden');
        isEmailVerified = true;
        submitBtn.disabled = false;
        submitBtn.textContent = '수정 완료하기';
    }

    // 서명패드가 비어있는지 확인하는 함수
    const isPadEmpty = (pad) => pad.isEmpty();

    // 파일을 Base64로 변환하는 함수
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve({ base64, type: file.type, name: file.name });
            };
            reader.onerror = error => reject(error);
        });
    };

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

    // ===================================================================
    // 통합 유효성 검사 시스템
    // ===================================================================

    // 모든 오류 메시지를 숨기고 스타일 초기화
    const clearAllErrors = () => {
        // 모든 오류 메시지 숨기기
        document.querySelectorAll('.field-error').forEach(errorDiv => {
            errorDiv.classList.add('hidden');
            errorDiv.textContent = '';
        });

        // 모든 필드에서 오류/성공 클래스 제거
        document.querySelectorAll('input, .signature-pad-container, .radio-group, .checkbox-group').forEach(element => {
            element.classList.remove('error', 'success');
        });
    };

    // 특정 필드에 오류 표시
    const showFieldError = (fieldId, message) => {
        const errorDiv = document.getElementById(`${fieldId}-error`);
        const field = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);

        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }

        if (field) {
            field.classList.add('error');
            field.classList.remove('success');

            // 특수한 경우들 처리
            if (fieldId === 'isContractor' || fieldId === 'agreeTermsRadio') {
                const radioGroup = field.closest('.radio-group');
                if (radioGroup) {
                    radioGroup.classList.add('error');
                    radioGroup.classList.remove('success');
                }
            } else if (fieldId === 'agreePrivacy' || fieldId === 'agreeProvider') {
                const checkboxGroup = field.closest('.checkbox-group');
                if (checkboxGroup) {
                    checkboxGroup.classList.add('error');
                    checkboxGroup.classList.remove('success');
                }
            }
        }

        // 서명 패드 특수 처리
        if (fieldId === 'signature') {
            const signatureContainer = document.querySelector('.signature-pad-container');
            if (signatureContainer) {
                signatureContainer.classList.add('error');
                signatureContainer.classList.remove('success');
            }
        }
    };

    // 특정 필드에 성공 표시
    const showFieldSuccess = (fieldId) => {
        const field = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);
        const errorDiv = document.getElementById(`${fieldId}-error`);

        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }

        if (field) {
            field.classList.remove('error');
            field.classList.add('success');

            // 특수한 경우들 처리
            if (fieldId === 'isContractor' || fieldId === 'agreeTermsRadio') {
                const radioGroup = field.closest('.radio-group');
                if (radioGroup) {
                    radioGroup.classList.remove('error');
                    radioGroup.classList.add('success');
                }
            } else if (fieldId === 'agreePrivacy' || fieldId === 'agreeProvider') {
                const checkboxGroup = field.closest('.checkbox-group');
                if (checkboxGroup) {
                    checkboxGroup.classList.remove('error');
                    checkboxGroup.classList.add('success');
                }
            }
        }

        // 서명 패드 특수 처리
        if (fieldId === 'signature') {
            const signatureContainer = document.querySelector('.signature-pad-container');
            if (signatureContainer) {
                signatureContainer.classList.remove('error');
                signatureContainer.classList.add('success');
            }
        }
    };

    // 통합 유효성 검사 함수
    const validateAllFields = () => {
        clearAllErrors();
        let isValid = true;
        const errors = [];

        // 1. 텍스트 입력 필드들
        const textFields = {
            fullName: "성명을 입력해주세요",
            dongHo: "동호수를 입력해주세요",
            dob: "생년월일을 입력해주세요",
            phone: "연락처를 입력해주세요",
            editPassword: "수정용 비밀번호를 입력해주세요"
        };

        Object.entries(textFields).forEach(([fieldId, message]) => {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                showFieldError(fieldId, message);
                isValid = false;
                errors.push(message);
            } else {
                showFieldSuccess(fieldId);
            }
        });

        // 2. 생년월일 형식 검사
        const dobField = document.getElementById('dob');
        if (dobField && dobField.value) {
            const dobRegex = /^\d{8}$/;
            if (!dobRegex.test(dobField.value)) {
                showFieldError('dob', '생년월일은 8자리 숫자로 입력해주세요 (예: 19900101)');
                isValid = false;
                errors.push('생년월일 형식이 올바르지 않습니다');
            }
        }

        // 3. 수정용 비밀번호 형식 검사
        const passwordField = document.getElementById('editPassword');
        if (passwordField && passwordField.value) {
            const passwordRegex = /^\d{4}$/;
            if (!passwordRegex.test(passwordField.value)) {
                showFieldError('editPassword', '수정용 비밀번호는 숫자 4자리로 입력해주세요');
                isValid = false;
                errors.push('수정용 비밀번호 형식이 올바르지 않습니다');
            }
        }

        // 4. 라디오 버튼들
        const radioFields = {
            isContractor: "계약자 본인 여부를 선택해주세요",
            agreeTermsRadio: "위임 내용 동의 여부를 선택해주세요"
        };

        Object.entries(radioFields).forEach(([fieldName, message]) => {
            const checkedRadio = document.querySelector(`input[name="${fieldName}"]:checked`);
            if (!checkedRadio) {
                showFieldError(fieldName, message);
                isValid = false;
                errors.push(message);
            } else {
                showFieldSuccess(fieldName);
            }
        });

        // 5. 체크박스들
        const checkboxFields = {
            agreePrivacy: "개인정보 수집 및 이용에 동의해주세요",
            agreeProvider: "개인정보 제3자 제공에 동의해주세요"
        };

        Object.entries(checkboxFields).forEach(([fieldId, message]) => {
            const checkbox = document.getElementById(fieldId);
            if (!checkbox || !checkbox.checked) {
                showFieldError(fieldId, message);
                isValid = false;
                errors.push(message);
            } else {
                showFieldSuccess(fieldId);
            }
        });

        // 6. 계약서 파일 첨부
        if (!contractImageInput.files || contractImageInput.files.length === 0) {
            showFieldError('contractImage', '계약서 사진을 첨부해주세요');
            isValid = false;
            errors.push('계약서 사진이 첨부되지 않았습니다');
        } else {
            showFieldSuccess('contractImage');
        }

        // 7. 서명 패드들
        if (isPadEmpty(namePad)) {
            showFieldError('name-pad', '이름을 정자체로 써주세요');
            isValid = false;
            errors.push('이름이 작성되지 않았습니다');
        }

        if (isPadEmpty(signaturePad)) {
            showFieldError('signature', '서명을 해주세요');
            isValid = false;
            errors.push('서명이 작성되지 않았습니다');
        }

        if (!isPadEmpty(namePad) && !isPadEmpty(signaturePad)) {
            showFieldSuccess('signature');
        }

        return { isValid, errors };
    };

    // --- 이메일 인증 이벤트 리스너 (신규) ---

    sendVerificationBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('유효한 이메일 주소를 입력해주세요.');
            return;
        }
        sendVerificationBtn.disabled = true;
        sendVerificationBtn.textContent = '발송 중...';
        emailStatusMsg.textContent = '';

        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',                
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    apiKey: API_KEY,
                    action: 'sendVerificationEmail',
                    email: email
                })
            });
            const result = await response.json();
            if (result.status === 'success') {
                serverVerificationCode = result.verificationCode;
                verificationCodeGroup.classList.remove('hidden');
                emailStatusMsg.textContent = '입력하신 이메일로 인증번호를 발송했습니다.';
                emailStatusMsg.className = 'status-msg';
            } else {
                throw new Error(result.message || '인증번호 발송에 실패했습니다.');
            }
        } catch (error) {
            emailStatusMsg.textContent = `오류: ${error.message}`;
            emailStatusMsg.className = 'status-msg error';
            sendVerificationBtn.disabled = false;
        } finally {
            sendVerificationBtn.textContent = '인증번호 발송';
        }
    });

    confirmVerificationBtn.addEventListener('click', () => {
        const userCode = verificationCodeInput.value.trim();
        if (userCode === serverVerificationCode && userCode !== '') {
            isEmailVerified = true;
            emailStatusMsg.textContent = '✅ 이메일 인증이 완료되었습니다.';
            emailStatusMsg.className = 'status-msg success';
            emailInput.disabled = true;
            verificationCodeInput.disabled = true;
            sendVerificationBtn.disabled = true;
            confirmVerificationBtn.disabled = true;
            submitBtn.disabled = false;
        } else {
            isEmailVerified = false;
            emailStatusMsg.textContent = '인증번호가 일치하지 않습니다. 다시 확인해주세요.';
            emailStatusMsg.className = 'status-msg error';
            submitBtn.disabled = true;
        }
    });
    
    emailInput.addEventListener('input', () => {
        if (isEmailVerified) {
            isEmailVerified = false;
            submitBtn.disabled = true;
            emailStatusMsg.textContent = '이메일 주소가 변경되었습니다. 다시 인증해주세요.';
            emailStatusMsg.className = 'status-msg error';
            emailInput.disabled = false;
            verificationCodeInput.disabled = false;
            sendVerificationBtn.disabled = false;
            confirmVerificationBtn.disabled = false;
            verificationCodeGroup.classList.add('hidden');
        }
    });
    
    // --- 기타 UI 이벤트 리스너 ---
    clearNameBtn.addEventListener('click', () => namePad.clear());
    clearSignatureBtn.addEventListener('click', () => signaturePad.clear());

    const setupImagePreview = (input, preview) => {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    preview.src = event.target.result;
                    preview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            } else {
                preview.classList.add('hidden');
            }
        });
    };
    setupImagePreview(contractImageInput, contractPreview);
    setupImagePreview(nameChangeImageInput, nameChangePreview);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isEmailVerified) return alert('이메일 인증을 먼저 완료해주세요.');
        
        // 유효성 검사
        if (!isEditMode) {
            // 신규 제출 시에만 엄격한 유효성 검사 적용
            const requiredFields = { fullName: "성명", dongHo: "동호수", dob: "생년월일", phone: "연락처", editPassword: "수정용 비밀번호" };
            for (const [id, name] of Object.entries(requiredFields)) {
                if (!document.getElementById(id).value) {
                    alert(`필수 항목을 입력해주세요: ${name}`);
                    return;
                }
            }
            if (!contractImageInput.files[0]) {
                alert("필수 항목을 첨부해주세요: 계약서 사진");
                return;
            }
            if (namePad.isEmpty() || signaturePad.isEmpty()) {
                 alert("필수 항목을 입력해주세요: 이름(정자체)과 서명");
                return;
            }
        }
    
        loadingModal.classList.remove('hidden');
        submitBtn.disabled = true;
    
        try {
            const formDataObj = new FormData(form);
            const formData = Object.fromEntries(formDataObj.entries());
            
            let combinedSignatureObject = null;
            // 서명 패드에 새로 그린 내용이 있을 때만 이미지를 생성하고 객체로 만듭니다.
            if (!namePad.isEmpty() && !signaturePad.isEmpty()) {
                const combinedSignatureDataUrl = await combinePads(namePad, signaturePad);
                combinedSignatureObject = {
                    base64: combinedSignatureDataUrl.split(',')[1],
                    type: 'image/png',
                    name: 'combined_signature.png'
                };
            }
    
            const dataToSend = {
                ...formData,
                originalEmail: isEditMode ? originalEmail : formData.email,
                contractImageFile: await fileToBase64(contractImageInput.files[0]),
                nameChangeImageFile: await fileToBase64(nameChangeImageInput.files[0]),
                combinedSignature: combinedSignatureObject // [버그 수정] 항상 올바른 객체 형식을 사용
            };
    
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ 
                    apiKey: API_KEY, 
                    action: isEditMode ? 'updateForm' : 'submitForm',
                    formData: dataToSend 
                })
            });
    
            const result = await response.json();
    
            if (result.status === 'success') {
                alert(result.message);
                window.location.href = window.location.pathname;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            alert('오류가 발생했습니다: ' + error.message);
            submitBtn.disabled = false;
        } finally {
            loadingModal.classList.add('hidden');
        }
    });

    // --- 수정 링크 요청 버튼 클릭 이벤트 ---
    requestEditLinkBtn.addEventListener('click', async () => {
        const email = editEmailInput.value;
        const password = editPasswordInput.value;
        if (!email || !password) {
            alert('이메일과 비밀번호를 모두 입력해주세요.');
            return;
        }

        requestEditLinkBtn.disabled = true;
        requestEditLinkBtn.textContent = '요청 중...';
        editStatusMsg.textContent = '';
        
        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    apiKey: API_KEY,
                    action: 'requestEditLink',
                    email: email,
                    editPassword: password
                })
            });
            const result = await response.json();
            if (result.status === 'success') {
                editStatusMsg.className = 'status-msg success';
            } else {
                editStatusMsg.className = 'status-msg error';
            }
            editStatusMsg.textContent = result.message;

        } catch(e) {
            editStatusMsg.className = 'status-msg error';
            editStatusMsg.textContent = '오류가 발생했습니다: ' + e.message;
        } finally {
            requestEditLinkBtn.disabled = false;
            requestEditLinkBtn.textContent = '수정 링크 요청';
        }
    });


    // --- 페이지 로드 시 수정 토큰 확인 및 데이터 로드 ---
    window.addEventListener('load', async () => {
        const params = new URLSearchParams(window.location.search);
        const editToken = params.get('editToken');

        if (editToken) {
            currentEditMode = true;
            document.querySelector('header h1').textContent = '동의서 내용 수정';
            loadingModal.classList.remove('hidden');

            try {
                const response = await fetch(GAS_WEB_APP_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        apiKey: API_KEY,
                        action: 'getEditData',
                        token: editToken
                    })
                });
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message);

                // 폼 채우기 함수 호출
                populateForm(result.data);
                
                // 이메일 필드는 수정 불가하도록 처리
                emailInput.value = result.data['이메일 주소'];
                emailInput.disabled = true;
                
            } catch (e) {
                alert('데이터를 불러오는 데 실패했습니다: ' + e.message);
                // 에러 발생 시 URL에서 토큰 제거
                window.location.href = window.location.pathname;
            } finally {
                loadingModal.classList.add('hidden');
            }
        }
    });

    // --- 폼을 데이터로 채우는 함수 ---
    function populateForm(data) {
        // 간단한 input 필드 채우기
        document.getElementById('fullName').value = data['1. 성명(계약서와 일치)'];
        document.getElementById('dongHo').value = data['2. 동 호수'];
        document.getElementById('dob').value = data['3. 생년월일(8자리)'];
        document.getElementById('phone').value = data['4. 연락처'];
        // 비밀번호는 다시 입력받도록 비워둡니다.
        
        // 라디오 버튼/체크박스 채우기
        document.querySelector(`input[name="isContractor"][value="${data['1-1. 본 설문을 작성하시는 분은 계약자 본인이십니까?']}"]`).checked = true;
        document.querySelector(`input[name="agreeTermsRadio"][value="${data['6. 위임 내용'] === '동의합니다' ? 'agree' : 'disagree'}"]`).checked = true;
        document.getElementById('agreePrivacy').checked = data['7. 개인정보 수집 및 이용 동의'] === '동의합니다';
        document.getElementById('agreeProvider').checked = data['8. 개인정보 제3자 제공 동의'] === '동의합니다';
        document.querySelector(`input[name="agreeMarketingRadio"][value="${data['9. 홍보 및 소식 전달을 위한 개인정보 수집·이용 동의 (선택)'] === '동의합니다' ? 'agree' : 'disagree'}"]`).checked = true;

        // 이미지 미리보기 설정
        // (서명, 계약서 등은 URL을 받아 미리보기 처리 필요 - 다음 단계에서 구현)
        
        // 이메일 인증은 수정모드에서는 건너뛰도록 처리
        isEmailVerified = true;
        submitBtn.disabled = false;
        document.getElementById('email-verification-section').classList.add('hidden'); // 이메일 인증 영역 숨기기
        document.getElementById('submit-btn').textContent = '수정 완료'; // 버튼 텍스트 변경
    }
});