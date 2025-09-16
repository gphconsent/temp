// ===================================================================
// script.js (v6 - 수정 기능 버그 해결 및 코드 통합)
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
    const loadingModal = document.getElementById('loading-modal');

    // --- 이메일 인증 관련 요소 ---
    const emailVerificationSection = document.getElementById('email-verification-section');
    const emailInput = document.getElementById('email');
    const sendVerificationBtn = document.getElementById('send-verification-btn');
    const verificationCodeGroup = document.getElementById('verification-code-group');
    const verificationCodeInput = document.getElementById('verification-code');
    const confirmVerificationBtn = document.getElementById('confirm-verification-btn');
    const emailStatusMsg = document.getElementById('email-status-msg');

    // --- 서명패드 관련 요소 ---
    const namePadCanvas = document.getElementById('name-pad');
    const signaturePadCanvas = document.getElementById('signature-pad');
    const clearNameBtn = document.getElementById('clear-name');
    const clearSignatureBtn = document.getElementById('clear-signature');
    const signaturePreview = document.getElementById('signature-preview');

    // --- 수정 기능 관련 요소 ---
    const openEditModalBtn = document.getElementById('open-edit-modal-btn');
    const editRequestModal = document.getElementById('edit-request-modal');
    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    const requestEditLinkBtn = document.getElementById('request-edit-link-btn');
    const editEmailInput = document.getElementById('edit-email');
    const editPasswordInput = document.getElementById('edit-password-check');
    const editStatusMsg = document.getElementById('edit-status-msg');
    const originalEmailSection = document.getElementById('original-email-section');
    const originalEmailDisplay = document.getElementById('original-email-display');

    // --- 이미지 미리보기 요소 ---
    const contractImageInput = document.getElementById('contractImage');
    const contractPreview = document.getElementById('contract-preview');
    const nameChangeImageInput = document.getElementById('nameChangeImage');
    const nameChangePreview = document.getElementById('nameChange-preview');

    // --- 상태 변수 ---
    let isEmailVerified = false;
    let serverVerificationCode = '';
    let currentEditMode = false;
    let originalEmail = ''; // 수정 모드에서 원본 이메일 저장

    // --- 서명패드 초기화 ---
    if (typeof SignaturePad === 'undefined') {
        console.error('SignaturePad library not loaded!');
        return alert('서명 기능을 불러오는데 실패했습니다. 페이지를 새로고침 해주세요.');
    }
    const resizeCanvas = (canvas) => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        canvas.getContext('2d').scale(ratio, ratio);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas(namePadCanvas);
    resizeCanvas(signaturePadCanvas);
    const namePad = new SignaturePad(namePadCanvas, { backgroundColor: 'rgb(255, 255, 255)', minWidth: 1, maxWidth: 2.5 });
    const signaturePad = new SignaturePad(signaturePadCanvas, { backgroundColor: 'rgb(255, 255, 255)', minWidth: 1, maxWidth: 2.5 });

    window.addEventListener('resize', () => {
        const nameData = namePad.toDataURL();
        const signatureData = signaturePad.toDataURL();
        resizeCanvas(namePadCanvas);
        resizeCanvas(signaturePadCanvas);
        namePad.fromDataURL(nameData);
        signaturePad.fromDataURL(signatureData);
    });

    // ===================================================================
    // 헬퍼 함수
    // ===================================================================

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({ base64: reader.result.split(',')[1], type: file.type, name: file.name });
        reader.onerror = error => reject(error);
    });

    const combinePads = (namePad, signaturePad) => new Promise((resolve, reject) => {
        const nameImage = new Image();
        const signatureImage = new Image();
        let loadedImages = 0;
        const onImageLoad = () => {
            if (++loadedImages === 2) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = nameImage.width + signatureImage.width;
                canvas.height = Math.max(nameImage.height, signatureImage.height);
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(nameImage, 0, 0);
                ctx.drawImage(signatureImage, nameImage.width, 0);
                resolve(canvas.toDataURL('image/png'));
            }
        };
        nameImage.onload = signatureImage.onload = onImageLoad;
        nameImage.onerror = () => reject(new Error("이름 이미지 로딩 실패"));
        signatureImage.onerror = () => reject(new Error("서명 이미지 로딩 실패"));
        nameImage.src = namePad.toDataURL('image/png');
        signatureImage.src = signaturePad.toDataURL('image/png');
    });

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

    // ===================================================================
    // 수정 모드 데이터 처리
    // ===================================================================

    const populateForm = (data) => {
        console.log("폼 데이터 채우기 시작:", data);
        originalEmail = data['이메일 주소'];
        
        // --- 텍스트 필드 ---
        document.getElementById('fullName').value = data['1. 성명 (계약서와 일치)'] || '';
        document.getElementById('dongHo').value = data['2. 동 호수'] || '';
        document.getElementById('dob').value = data['3. 생년월일 (8자리)'] || '';
        document.getElementById('phone').value = data['4. 연락처'] || '';
        const editPasswordField = document.getElementById('editPassword');
        editPasswordField.placeholder = '새 비밀번호 입력 시에만 변경됩니다';
        editPasswordField.required = false;

        // --- 라디오 및 체크박스 ---
        const checkRadio = (name, value) => {
            const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (el) el.checked = true;
        };
        checkRadio('isContractor', data['1-1. 본 설문을 작성하시는 분은 계약자 본인이십니까?']);
        checkRadio('agreeTermsRadio', data['6. 위임 내용'] === '동의합니다' ? 'agree' : 'disagree');
        checkRadio('agreeMarketingRadio', data['9. 홍보 및 소식 전달을 위한 개인정보 수집·이용 동의 (선택)'] === '동의합니다' ? 'agree' : 'disagree');

        document.getElementById('agreePrivacy').checked = data['7. 개인정보 수집 및 이용 동의'] === '동의합니다';
        document.getElementById('agreeProvider').checked = data['8. 개인정보 제3자 제공 동의'] === '동의합니다';
        
        // --- 이미지 미리보기 ---
        const setImagePreview = (imgElement, url) => {
            if (url) {
                // Google Drive URL을 프록시해야 할 수 있으므로, CORS 문제 방지를 위해 직접 링크 대신 표시만 합니다.
                // 실제로는 브라우저 캐시나 다른 방법으로 이미지를 보여주는 것이 더 안정적입니다.
                // 지금은 간단히 src에 할당합니다.
                imgElement.src = url;
                imgElement.classList.remove('hidden');
            }
        };
        setImagePreview(contractPreview, data['5. 계약서 사진 첨부']);
        setImagePreview(signaturePreview, data['10. 자필 성명과 서명']);
        setImagePreview(nameChangePreview, data['11. (선택) 명의변경 등의 변경 내역 확인 필요 시 사진 첨부']);

        // --- UI 변경 ---
        emailVerificationSection.classList.add('hidden');
        originalEmailDisplay.textContent = originalEmail;
        originalEmailSection.classList.remove('hidden');
        
        isEmailVerified = true;
        submitBtn.disabled = false;
        submitBtn.textContent = '수정 완료하기';
        document.querySelector('header h1').textContent = '동의서 내용 수정';
        openEditModalBtn.classList.add('hidden');
    };

    // ===================================================================
    // 이벤트 리스너
    // ===================================================================

    // --- 이메일 인증 ---
    sendVerificationBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return alert('유효한 이메일 주소를 입력해주세요.');
        }
        sendVerificationBtn.disabled = true;
        sendVerificationBtn.textContent = '발송 중...';
        emailStatusMsg.textContent = '';
        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ apiKey: API_KEY, action: 'sendVerificationEmail', email })
            });
            const result = await response.json();
            if (result.status === 'success') {
                serverVerificationCode = result.verificationCode;
                verificationCodeGroup.classList.remove('hidden');
                emailStatusMsg.textContent = '입력하신 이메일로 인증번호를 발송했습니다.';
                emailStatusMsg.className = 'status-msg';
            } else {
                throw new Error(result.message || '인증번호 발송 실패');
            }
        } catch (error) {
            emailStatusMsg.textContent = `오류: ${error.message}`;
            emailStatusMsg.className = 'status-msg error';
        } finally {
            sendVerificationBtn.disabled = false;
            sendVerificationBtn.textContent = '인증번호 발송';
        }
    });

    confirmVerificationBtn.addEventListener('click', () => {
        if (verificationCodeInput.value.trim() === serverVerificationCode && serverVerificationCode) {
            isEmailVerified = true;
            emailStatusMsg.textContent = '✅ 이메일 인증이 완료되었습니다.';
            emailStatusMsg.className = 'status-msg success';
            [emailInput, verificationCodeInput, sendVerificationBtn, confirmVerificationBtn].forEach(el => el.disabled = true);
            submitBtn.disabled = false;
        } else {
            isEmailVerified = false;
            emailStatusMsg.textContent = '인증번호가 일치하지 않습니다.';
            emailStatusMsg.className = 'status-msg error';
            submitBtn.disabled = true;
        }
    });

    // --- 수정 모달 ---
    openEditModalBtn.addEventListener('click', () => editRequestModal.classList.remove('hidden'));
    closeEditModalBtn.addEventListener('click', () => editRequestModal.classList.add('hidden'));
    requestEditLinkBtn.addEventListener('click', async () => {
        const email = editEmailInput.value;
        const password = editPasswordInput.value;
        if (!email || !password) return alert('이메일과 비밀번호를 모두 입력해주세요.');
        
        requestEditLinkBtn.disabled = true;
        requestEditLinkBtn.textContent = '요청 중...';
        editStatusMsg.textContent = '';
        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ apiKey: API_KEY, action: 'requestEditLink', email, editPassword: password })
            });
            const result = await response.json();
            editStatusMsg.className = result.status === 'success' ? 'status-msg success' : 'status-msg error';
            editStatusMsg.textContent = result.message;
        } catch(e) {
            editStatusMsg.className = 'status-msg error';
            editStatusMsg.textContent = '오류가 발생했습니다: ' + e.message;
        } finally {
            requestEditLinkBtn.disabled = false;
            requestEditLinkBtn.textContent = '수정 링크 요청';
        }
    });

    // --- 서명패드 및 이미지 미리보기 ---
    clearNameBtn.addEventListener('click', () => namePad.clear());
    clearSignatureBtn.addEventListener('click', () => signaturePad.clear());
    setupImagePreview(contractImageInput, contractPreview);
    setupImagePreview(nameChangeImageInput, nameChangePreview);

    // --- 폼 제출 처리 ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isEmailVerified) return alert('이메일 인증을 먼저 완료해주세요.');

        // 필수 필드 유효성 검사 (신규 제출 시에만 엄격하게)
        if (!currentEditMode) {
             const requiredFields = { fullName: "성명", dongHo: "동호수", dob: "생년월일", phone: "연락처", editPassword: "수정용 비밀번호" };
             for (const [id, name] of Object.entries(requiredFields)) {
                 if (!document.getElementById(id).value) return alert(`필수 항목을 입력해주세요: ${name}`);
             }
             if (!contractImageInput.files[0]) return alert("필수 항목을 첨부해주세요: 계약서 사진");
             if (namePad.isEmpty() || signaturePad.isEmpty()) return alert("필수 항목을 입력해주세요: 이름(정자체)과 서명");
        }

        loadingModal.classList.remove('hidden');
        submitBtn.disabled = true;

        try {
            const formData = Object.fromEntries(new FormData(form).entries());
            let combinedSignatureObject = null;
            if (!namePad.isEmpty() && !signaturePad.isEmpty()) {
                const dataUrl = await combinePads(namePad, signaturePad);
                combinedSignatureObject = { base64: dataUrl.split(',')[1], type: 'image/png', name: 'combined_signature.png' };
            }
            
            const dataToSend = {
                ...formData,
                originalEmail: currentEditMode ? originalEmail : formData.email,
                contractImageFile: await fileToBase64(contractImageInput.files[0]),
                nameChangeImageFile: await fileToBase64(nameChangeImageInput.files[0]),
                combinedSignature: combinedSignatureObject,
            };

            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ 
                    apiKey: API_KEY, 
                    action: currentEditMode ? 'updateForm' : 'submitForm',
                    formData: dataToSend 
                })
            });
            const result = await response.json();
            if (result.status === 'success') {
                alert(result.message);
                window.location.href = window.location.pathname; // 페이지 새로고침
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

    // ===================================================================
    // ✨ 페이지 초기화 (메인 로직) ✨
    // ===================================================================
    const initializePage = async () => {
        console.log("페이지 로드 완료. 수정 토큰을 확인합니다...");
        submitBtn.disabled = true; // 기본적으로 제출 버튼 비활성화

        const params = new URLSearchParams(window.location.search);
        const editToken = params.get('editToken');

        if (editToken) {
            console.log("수정 토큰 발견:", editToken);
            currentEditMode = true;
            loadingModal.classList.remove('hidden');
            try {
                const response = await fetch(GAS_WEB_APP_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ apiKey: API_KEY, action: 'getEditData', token: editToken })
                });
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message);
                
                populateForm(result.data);

            } catch (e) {
                alert('데이터 로딩 실패: ' + e.message);
                window.location.href = window.location.pathname; // 실패 시 URL 초기화
            } finally {
                loadingModal.classList.add('hidden');
            }
        } else {
            console.log("수정 토큰 없음. 일반 제출 모드로 시작합니다.");
            // 일반 모드에서는 이메일 인증 후 제출 버튼 활성화
        }
    };

    // --- 페이지 초기화 함수 실행 ---
    initializePage();
});