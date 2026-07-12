import { Platform } from 'react-native';
import { apiFetch } from './api';

export type RoutineImageOcrResponse = {
    rawText: string;
};

function getFileNameFromUri(imageUri: string) {
    const cleanUri = imageUri.split('?')[0];
    return cleanUri.split('/').pop() || 'routine-image.jpg';
}

function getFileTypeFromFileName(fileName: string) {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (extension === 'png') return 'image/png';
    if (extension === 'webp') return 'image/webp';
    if (extension === 'heic') return 'image/heic';
    if (extension === 'heif') return 'image/heif';

    return 'image/jpeg';
}

export async function uploadRoutineImageForOcr(
    imageUri: string
): Promise<RoutineImageOcrResponse> {
    const formData = new FormData();

    const fileName = getFileNameFromUri(imageUri);
    const fileType = getFileTypeFromFileName(fileName);

    if (Platform.OS === 'web') {
        const imageResponse = await fetch(imageUri);
        const imageBlob = await imageResponse.blob();

        formData.append('image', imageBlob, fileName);
    } else {
        formData.append('image', {
            uri: imageUri,
            name: fileName,
            type: fileType,
        } as any);
    }

    const res = await apiFetch('/ocr/routine-image', {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.log('Error OCR, respuesta:', text);
        throw new Error('No se pudo leer el texto de la imagen.');
    }

    const data = (await res.json()) as RoutineImageOcrResponse;

    return {
        rawText: data.rawText ?? '',
    };
}