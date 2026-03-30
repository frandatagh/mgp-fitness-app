
import { apiFetch } from './api';

export type InquiryType =
    | 'technical'
    | 'general'
    | 'suggestion'
    | 'bug'
    | 'other';

export type ContactPayload = {
    name: string;
    email: string;
    inquiryType: InquiryType;
    subject: string;
    message: string;
    sentFrom: 'authenticated' | 'guest';
    platform: string;
    accountName: string | null;
    accountEmail: string | null;
};

export async function submitContactMessage(payload: ContactPayload) {
    const res = await apiFetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    let data: any = null;
    try {
        data = await res.json();
    } catch {
        data = null;
    }

    if (!res.ok) {
        const backendMessage =
            data?.message ||
            data?.error ||
            'No se pudo enviar el mensaje. Intenta nuevamente.';
        throw new Error(backendMessage);
    }

    return data;
}