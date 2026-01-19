

import { Language } from './types';

type TranslationKeys = 
  | 'appName'
  | 'heroTitle'
  | 'heroSubtitle'
  | 'uploadTitle'
  | 'uploadSubtitle'
  | 'galleryTitle'
  | 'gallerySubtitle'
  | 'galleryEmpty'
  | 'goCreate'
  | 'editor'
  | 'gallery'
  | 'madeBy'
  | 'undo'
  | 'redo'
  | 'cancel'
  | 'apply'
  | 'save'
  | 'go'
  | 'back'
  | 'addToGallery'
  | 'savedToGallery'
  | 'errorGenerating'
  | 'promptPlaceholder'
  | 'describeChanges'
  | 'drawBoxHint'
  | 'nudgeHint'
  | 'resizeHint'
  | 'zoomHint'
  | 'panHint'
  | 'moveHint'
  | 'ctrlResize'
  | 'drawHint'
  | 'listening'
  | 'transcribing'
  | 'open'
  | 'delete'
  | 'deleteAll'
  | 'groqKeyTitle'
  | 'groqKeyDesc'
  | 'groqKeyPlaceholder'
  | 'groqLinkText'
  | 'libraryTitle'
  | 'libraryDragHint'
  | 'edit'
  | 'cropTitle'
  | 'confirmCrop'
  | 'useExample'
  | 'rotate'
  | 'brush'
  | 'eraser'
  | 'maskHint'
  | 'layerEraser'
  | 'size'
  | 'softness'
  | 'edgeBlur';

export const translations: Record<Language, Record<TranslationKeys, string>> = {
  vi: {
    appName: 'Banana Inpainting',
    heroTitle: 'Sửa MỘT VÙNG ảnh của bạn\nvới Nano Banana',
    heroSubtitle: 'Tải ảnh lên, vẽ một khung và chỉ định những gì cần thay đổi.',
    uploadTitle: 'Thả ảnh vào đây',
    uploadSubtitle: 'dán (Ctrl+V) hoặc nhấp để chọn',
    galleryTitle: 'Bộ sưu tập',
    gallerySubtitle: 'Dự án của bạn được lưu tự động.',
    galleryEmpty: 'Chưa có gì trong bộ sưu tập',
    goCreate: 'Đi tạo cái gì đó đi!',
    editor: 'Chỉnh sửa',
    gallery: 'Bộ sưu tập',
    madeBy: 'Made by nganlinh4',
    undo: 'Hoàn tác',
    redo: 'Làm lại',
    cancel: 'Hủy',
    apply: 'Áp dụng',
    save: 'Lưu',
    go: 'Đi',
    back: 'Quay lại',
    addToGallery: 'Thêm vào BST',
    savedToGallery: 'Đã lưu tự động',
    errorGenerating: 'Lỗi khi tạo ảnh. Vui lòng thử lại.',
    promptPlaceholder: 'Bạn muốn thay đổi gì?',
    describeChanges: 'Mô tả thay đổi (tùy chọn)',
    drawBoxHint: 'Vẽ khung trước...',
    nudgeHint: 'Phím mũi tên để tinh chỉnh',
    resizeHint: 'Kéo điểm neo để đổi cỡ',
    zoomHint: 'Cuộn chuột để thu phóng',
    panHint: 'Kéo để di chuyển',
    moveHint: 'Kéo vùng chọn để di chuyển',
    ctrlResize: 'Giữ Ctrl để chỉnh tâm',
    drawHint: 'Kéo chuột trái để vẽ',
    listening: 'Đang nghe... (ngừng nói để gửi)',
    transcribing: 'Đang chuyển văn bản...',
    open: 'Mở',
    delete: 'Xóa',
    deleteAll: 'Xóa hết',
    groqKeyTitle: 'Nhập API Key Groq',
    groqKeyDesc: 'Để sử dụng tính năng giọng nói, vui lòng nhập API Key Groq của bạn. Nhận miễn phí tại:',
    groqKeyPlaceholder: 'gsk_...',
    groqLinkText: 'https://console.groq.com/keys',
    libraryTitle: 'Thư viện tham khảo',
    libraryDragHint: 'Kéo ảnh vào khung để sử dụng lại',
    edit: 'Sửa',
    cropTitle: 'Cắt ảnh tham khảo',
    confirmCrop: 'Xác nhận',
    useExample: 'Dùng ảnh ví dụ này',
    rotate: 'Đổi ảnh khác',
    brush: 'Vẽ vùng chọn',
    eraser: 'Tẩy vùng chọn',
    maskHint: 'Vẽ vùng cần sửa',
    layerEraser: 'Tẩy lớp',
    size: 'Cỡ',
    softness: 'Mềm',
    edgeBlur: 'Làm mờ cạnh'
  },
  en: {
    appName: 'Banana Inpainting',
    heroTitle: 'Fix A REGION of your photo\nwith Nano Banana',
    heroSubtitle: 'Upload an image, draw a box, and specify what to change.',
    uploadTitle: 'Drop image here',
    uploadSubtitle: 'paste (Ctrl+V) or click to browse',
    galleryTitle: 'My Gallery',
    gallerySubtitle: 'Your projects are auto-saved here.',
    galleryEmpty: 'Gallery is empty',
    goCreate: 'Go create something!',
    editor: 'Editor',
    gallery: 'Gallery',
    madeBy: 'Made by nganlinh4',
    undo: 'Undo',
    redo: 'Redo',
    cancel: 'Cancel',
    apply: 'Apply',
    save: 'Save',
    go: 'Go',
    back: 'Back',
    addToGallery: 'Add to Gallery',
    savedToGallery: 'Auto-saved',
    errorGenerating: 'Error generating image. Please try again.',
    promptPlaceholder: 'What should change here?',
    describeChanges: 'Describe changes (optional)',
    drawBoxHint: 'Draw a box first...',
    nudgeHint: 'Arrow keys to nudge',
    resizeHint: 'Drag handles to resize',
    zoomHint: 'Scroll to zoom',
    panHint: 'Drag to pan',
    moveHint: 'Drag box to move',
    ctrlResize: 'Hold Ctrl to center resize',
    drawHint: 'Drag left mouse to draw',
    listening: 'Listening... (stop talking to send)',
    transcribing: 'Transcribing...',
    open: 'Open',
    delete: 'Delete',
    deleteAll: 'Delete All',
    groqKeyTitle: 'Enter Groq API Key',
    groqKeyDesc: 'To use voice commands, please enter your Groq API Key. Get one for free at:',
    groqKeyPlaceholder: 'gsk_...',
    groqLinkText: 'https://console.groq.com/keys',
    libraryTitle: 'Reference Library',
    libraryDragHint: 'Drag image to box to reuse',
    edit: 'Edit',
    cropTitle: 'Crop Reference',
    confirmCrop: 'Confirm',
    useExample: 'Use this example image',
    rotate: 'Rotate image',
    brush: 'Brush Mask',
    eraser: 'Erase Mask',
    maskHint: 'Draw mask area',
    layerEraser: 'Layer Eraser',
    size: 'Size',
    softness: 'Soft',
    edgeBlur: 'Edge Blur'
  },
  ko: {
    appName: 'Banana Inpainting',
    heroTitle: 'Nano Banana로\n사진의 일부분을 수정하세요',
    heroSubtitle: '이미지를 업로드하고 상자를 그린 다음 변경할 내용을 지정하세요.',
    uploadTitle: '이미지를 여기에 놓으세요',
    uploadSubtitle: '붙여넣기(Ctrl+V) 또는 클릭하여 찾아보기',
    galleryTitle: '내 갤러리',
    gallerySubtitle: '프로젝트가 자동으로 저장됩니다.',
    galleryEmpty: '갤러리가 비어 있습니다',
    goCreate: '무언가를 만들어보세요!',
    editor: '에디터',
    gallery: '갤러리',
    madeBy: 'Made by nganlinh4',
    undo: '실행 취소',
    redo: '다시 실행',
    cancel: '취소',
    apply: '적용',
    save: '저장',
    go: '가기',
    back: '뒤로',
    addToGallery: '갤러리에 추가',
    savedToGallery: '자동 저장됨',
    errorGenerating: '이미지 생성 오류. 다시 시도해 주세요.',
    promptPlaceholder: '무엇을 변경할까요?',
    describeChanges: '변경 사항 설명 (선택 사항)',
    drawBoxHint: '먼저 상자를 그리세요...',
    nudgeHint: '화살표를 사용하여 이동',
    resizeHint: '핸들을 드래그하여 크기 조정',
    zoomHint: '스크롤하여 확대/축소',
    panHint: '드래그하여 이동',
    moveHint: '상자를 드래그하여 이동',
    ctrlResize: 'Ctrl을 눌러 중심 조절',
    drawHint: '왼쪽 마우스로 드래그하여 그리기',
    listening: '듣고 있습니다... (말을 멈추면 전송됨)',
    transcribing: '변환 중...',
    open: '열기',
    delete: '삭제',
    deleteAll: '모두 삭제',
    groqKeyTitle: 'Groq API 키 입력',
    groqKeyDesc: '음성 명령을 사용하려면 Groq API 키를 입력하세요. 무료로 받을 수 있는 곳:',
    groqKeyPlaceholder: 'gsk_...',
    groqLinkText: 'https://console.groq.com/keys',
    libraryTitle: '참조 라이브러리',
    libraryDragHint: '이미지를 상자로 드래그하여 재사용',
    edit: '편집',
    cropTitle: '참조 자르기',
    confirmCrop: '확인',
    useExample: '이 예제 이미지 사용',
    rotate: '이미지 회전',
    brush: '브러시',
    eraser: '지우개',
    maskHint: '마스크 그리기',
    layerEraser: '지우개',
    size: '크기',
    softness: '부드러움',
    edgeBlur: '가장자리 흐림'
  }
};