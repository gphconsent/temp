document.addEventListener('DOMContentLoaded', () => {
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

    // 캔버스 크기 조절 함수
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

    // 1. (가장 먼저) 캔버스 크기 조절 실행
    resizeCanvas();

    // 2. (크기가 맞춰진 후) 서명패드 기능 적용
    const namePad = new SignaturePad(nameCanvas, { backgroundColor: 'rgb(255, 255, 255)' });
    const signaturePad = new SignaturePad(signatureCanvas, { backgroundColor: 'rgb(255, 255, 255)' });

    // 브라우저 창 크기 변경 시 실시간으로 캔버스 크기 다시 조절
    window.addEventListener("resize", () => {
        resizeCanvas();
        namePad.clear();
        signaturePad.clear();
    });

    // '지우기' 버튼 기능
    document.getElementById('clear-name').addEventListener('click', () => namePad.clear());
    document.getElementById('clear-signature').addEventListener('click', () => signaturePad.clear());

    // 계약서 이미지 미리보기 기능
    const contractImageInput = document.getElementById('contractImage');
    contractImageInput.addEventListener('change', () => {
        const file = contractImageInput.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // 이전에 미리보기 이미지가 없었다면 새로 생성
                let preview = document.getElementById('contract-preview');
                if (!preview) {
                    preview = document.createElement('img');
                    preview.id = 'contract-preview';
                    preview.style.maxWidth = '100%';
                    preview.style.maxHeight = '200px';
                    preview.style.marginTop = '15px';
                    contractImageInput.after(preview);
                }
                preview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // 명의변경 이미지 미리보기 기능
    const nameChangeImageInput = document.getElementById('nameChangeImage');
    if (nameChangeImageInput) {
        nameChangeImageInput.addEventListener('change', () => {
            const file = nameChangeImageInput.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById('nameChange-preview');
                    if (preview) {
                        preview.src = e.target.result;
                        preview.classList.remove('hidden');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 폼 제출 시 실행될 메인 이벤트
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // 기본 제출 기능 중단

        // [기능 복원] 1. 필수 입력 항목 유효성 검사
        if (!validateForm(namePad, signaturePad)) {
            return; // 검사 실패 시 중단
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '처리 중...';

        try {
            // [기능 복원] 2. 이름과 서명 이미지 하나로 합치기
            const combinedImageBase64 = await combinePads(namePad, signaturePad);
            const contractChangedImage = document.getElementById('nameChangeImage').files[0];
            
            // TODO: 백엔드(GAS)로 데이터 전송하는 로직 추가 예정
            console.log("병합된 최종 서명 (Base64):", combinedImageBase64.substring(0, 100) + "...");
            if (contractChangedImage) {
                console.log("명의 변경 파일:", contractChangedImage.name);
            }
            alert('모든 기능 포함된 최종 스크립트 실행 성공! (백엔드 연동 전)');

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
 * [기능 복원] 필수 항목 유효성 검사 함수
 */
function validateForm(namePadInstance, signaturePadInstance) {
    const requiredFields = [
        { id: 'fullName', name: '1. 성명' },
        { nameAttr: 'isContractor', name: '1-1. 계약자 본인 여부' },
        { id: 'dongHo', name: '2. 동호수' },
        { id: 'dob', name: '3. 생년월일' },
        { id: 'phone', name: '4. 연락처' },
        { id: 'contractImage', name: '5. 계약서 사진' },
    ];
    
    let missingFields = [];

    // 텍스트, 파일, 라디오 버튼 검사
    requiredFields.forEach(field => {
        let element;
        if (field.id) {
            element = document.getElementById(field.id);
            if (element.type === 'file' && element.files.length === 0) {
                missingFields.push(field.name);
            } else if (element.type !== 'file' && !element.value.trim()) {
                missingFields.push(field.name);
            }
        } else if (field.nameAttr) {
            if (!document.querySelector(`input[name="${field.nameAttr}"]:checked`)) {
                missingFields.push(field.name);
            }
        }
    });

    // 이름 및 서명 패드가 비어있는지 검사
    if (namePadInstance.isEmpty()) {
        missingFields.push('10. 서명 (이름)');
    }
    if (signaturePadInstance.isEmpty()) {
        missingFields.push('10. 서명 (서명란)');
    }

    // 누락된 항목이 있으면 알림창 표시
    if (missingFields.length > 0) {
        alert(`다음 필수 항목을 확인해주세요:\n- ${missingFields.join('\n- ')}`);
        return false;
    }
    return true;
}

/**
 * [기능 복원] 두 개의 서명패드 이미지를 좌우로 합치는 함수
 */
function combinePads(namePad, signaturePad) {
    return new Promise((resolve, reject) => {
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