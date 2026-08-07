import { Platform } from 'react-native';
import {
    extractTextFromImage,
    isSupported,
} from 'expo-text-extractor';

export type MobileOcrResponse = {
    rawText: string;
    source: 'mobile-mlkit';
};

export async function extractRoutineTextOnDevice(
    imageUri: string
): Promise<MobileOcrResponse> {
    if (Platform.OS === 'web') {
        throw new Error(
            'El OCR con ML Kit no está disponible en navegador. Probalo desde una development build en iPhone o Android.'
        );
    }

    if (!isSupported) {
        throw new Error(
            'Este dispositivo no soporta extracción de texto con ML Kit / Apple Vision.'
        );
    }

    const lines = await extractTextFromImage(imageUri);

    const rawText = Array.isArray(lines) ? lines.join('\n') : '';

    return {
        rawText,
        source: 'mobile-mlkit',
    };
}