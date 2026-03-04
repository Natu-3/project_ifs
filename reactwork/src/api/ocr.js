import axios from 'axios';

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || '913917fab3msh4f60a803548f410p177f75jsn61de36325751';
const RAPIDAPI_HOST = 'apis-freeocr-ai.p.rapidapi.com';
const OCR_API_URL = `https://${RAPIDAPI_HOST}/extract`;

/**
 * 이미지 파일을 Base64로 변환
 */
export const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // data:image/jpeg;base64, 부분을 제거하고 순수 base64만 반환
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * 이미지를 리사이즈하여 파일 크기 줄이기
 * @param {File} file - 원본 이미지 파일
 * @param {number} maxWidth - 최대 너비 (기본값: 2000)
 * @param {number} maxHeight - 최대 높이 (기본값: 2000)
 * @param {number} quality - JPEG 품질 (0.1 ~ 1.0, 기본값: 0.8)
 * @returns {Promise<File>} 리사이즈된 이미지 파일
 */
export const resizeImage = (file, maxWidth = 2000, maxHeight = 2000, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 원본 크기
                let width = img.width;
                let height = img.height;

                // 비율 유지하면서 리사이즈
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }

                // Canvas에 그리기
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Blob으로 변환
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            // 원본 파일명 유지하면서 새 File 객체 생성
                            const resizedFile = new File([blob], file.name, {
                                type: file.type || 'image/jpeg',
                                lastModified: Date.now()
                            });
                            console.log('이미지 리사이즈 완료:', {
                                원본크기: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                                리사이즈크기: `${(resizedFile.size / 1024 / 1024).toFixed(2)}MB`,
                                원본해상도: `${img.width}x${img.height}`,
                                리사이즈해상도: `${width}x${height}`
                            });
                            resolve(resizedFile);
                        } else {
                            reject(new Error('이미지 리사이즈 실패'));
                        }
                    },
                    file.type || 'image/jpeg',
                    quality
                );
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * FreeOCR.AI API를 사용하여 이미지에서 텍스트 추출
 * @param {File} imageFile - 이미지 파일
 * @param {Array} fields - 추출할 필드 목록 (예: ['product', 'price', 'quantity'])
 * @param {string} format - 반환 형식 ('json' 또는 'text')
 * @returns {Promise<Object>} OCR 결과
 */
export const extractTextFromImage = async (imageFile, fields = [], format = 'json') => {
    try {
        // 큰 이미지는 자동으로 리사이즈 (1MB 이상이면 리사이즈)
        // Base64 인코딩 시 약 33% 증가하므로, 원본 1MB는 인코딩 후 약 1.3MB
        let processedFile = imageFile;
        if (imageFile.size > 1 * 1024 * 1024) {
            console.log('이미지가 큽니다. 자동으로 리사이즈합니다...', {
                원본크기: `${(imageFile.size / 1024 / 1024).toFixed(2)}MB`
            });
            try {
                processedFile = await resizeImage(imageFile, 1500, 1500, 0.7);
                console.log('리사이즈 완료:', {
                    원본: `${(imageFile.size / 1024 / 1024).toFixed(2)}MB`,
                    리사이즈: `${(processedFile.size / 1024 / 1024).toFixed(2)}MB`
                });
            } catch (resizeError) {
                console.warn('리사이즈 실패, 원본 사용:', resizeError);
                processedFile = imageFile;
            }
        }
        
        // 이미지를 Base64로 변환
        const base64Image = await imageToBase64(processedFile);
        
        console.log('이미지 파일 정보:', {
            name: imageFile.name,
            type: imageFile.type,
            원본크기: `${(imageFile.size / 1024 / 1024).toFixed(2)}MB`,
            처리된크기: `${(processedFile.size / 1024 / 1024).toFixed(2)}MB`,
            base64Length: `${(base64Image.length / 1024 / 1024).toFixed(2)}MB`
        });

        // URL 파라미터 구성 (fields는 필수 필드)
        const params = new URLSearchParams();
        // fields는 필수 필드이므로 빈 배열이라도 전송
        params.append('fields', JSON.stringify(fields.length > 0 ? fields : []));
        params.append('format', format);

        // multipart/form-data 형식으로 파일 직접 전송 (Base64 아님)
        const formData = new FormData();
        formData.append('image', processedFile); // 실제 File 객체 전송

        // API 호출 (URL에 쿼리 파라미터 추가)
        const urlWithParams = `${OCR_API_URL}?${params.toString()}`;
        
        console.log('API 요청 정보:', {
            url: urlWithParams,
            method: 'POST',
            contentType: 'multipart/form-data',
            apiKey: RAPIDAPI_KEY.substring(0, 20) + '...', // 보안을 위해 일부만 표시
            apiHost: RAPIDAPI_HOST,
            파일크기: `${(processedFile.size / 1024 / 1024).toFixed(2)}MB`,
            fields: fields.length > 0 ? fields : []
        });
        
        const response = await axios.post(urlWithParams, formData, {
            headers: {
                // multipart/form-data는 브라우저가 자동으로 Content-Type과 boundary 설정
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST,
            },
        });

        console.log('API 응답 성공:', response.status);
        return response.data;
    } catch (error) {
        console.error('OCR API 호출 실패:', error);
        
        // 에러 응답 상세 정보 로깅
        if (error.response) {
            console.error('=== 에러 상세 정보 ===');
            console.error('응답 상태:', error.response.status);
            console.error('응답 데이터 (원본):', error.response.data);
            console.error('응답 데이터 (JSON):', JSON.stringify(error.response.data, null, 2));
            
            // 응답 데이터의 모든 키 확인
            if (error.response.data && typeof error.response.data === 'object') {
                console.error('응답 데이터 키들:', Object.keys(error.response.data));
                console.error('응답 데이터 값들:', Object.values(error.response.data));
            }
            
            console.error('응답 헤더:', error.response.headers);
            console.error('요청 URL:', error.config?.url);
            console.error('요청 헤더:', error.config?.headers);
            console.error('요청 데이터 길이:', error.config?.data?.length);
            console.error('요청 데이터 처음 100자:', error.config?.data?.substring(0, 100));
            console.error('API 키 확인:', error.config?.headers?.['x-rapidapi-key']?.substring(0, 20) + '...');
            
            // Network 탭에서 확인하라고 안내
            console.error('=== Network 탭에서 확인하세요 ===');
            console.error('1. F12 → Network 탭 열기');
            console.error('2. 이미지 업로드');
            console.error('3. extract?format=json 요청 클릭');
            console.error('4. Response 탭에서 실제 API 에러 메시지 확인');
        } else if (error.request) {
            console.error('요청은 전송되었지만 응답을 받지 못함:', error.request);
            console.error('API 서버에 연결할 수 없습니다. 네트워크 연결을 확인하세요.');
        } else {
            console.error('요청 설정 중 오류:', error.message);
        }
        
        // 실제 API 에러 메시지 추출
        let errorMessage = '이미지에서 텍스트를 추출하는데 실패했습니다.';
        
        if (error.response?.data) {
            const responseData = error.response.data;
            // 다양한 형태의 에러 메시지 확인
            if (typeof responseData === 'string') {
                errorMessage = responseData;
            } else if (responseData.message) {
                errorMessage = responseData.message;
            } else if (responseData.error) {
                errorMessage = responseData.error;
            } else if (responseData.detail) {
                errorMessage = responseData.detail;
            } else {
                // 전체 응답 데이터를 문자열로 변환
                errorMessage = JSON.stringify(responseData);
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
    }
};

/**
 * 이미지에서 텍스트만 추출 (간단한 버전)
 */
export const extractSimpleText = async (imageFile) => {
    try {
        const result = await extractTextFromImage(imageFile, [], 'text');
        return result;
    } catch (error) {
        throw error;
    }
};

