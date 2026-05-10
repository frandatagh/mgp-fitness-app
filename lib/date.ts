// lib/date.ts

export const APP_TIME_ZONE = 'America/Argentina/Buenos_Aires';

export function formatAppShortDate(dateString?: string | null) {
    if (!dateString) return '--';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '--';

    return new Intl.DateTimeFormat('es-AR', {
        timeZone: APP_TIME_ZONE,
        day: 'numeric',
        month: 'numeric',
    }).format(date);
}

export function formatAppTime(dateString?: string | null) {
    if (!dateString) return '--';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '--';

    return new Intl.DateTimeFormat('es-AR', {
        timeZone: APP_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function formatAppHistoryDayLabel(dateString?: string | null) {
    if (!dateString) return 'Sin fecha';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';

    return new Intl.DateTimeFormat('es-AR', {
        timeZone: APP_TIME_ZONE,
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
    }).format(date);
}

export function getAppDateKey(dateString?: string | null) {
    if (!dateString) return 'sin-fecha';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'sin-fecha';

    return new Intl.DateTimeFormat('en-CA', {
        timeZone: APP_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

export function formatAppFullDateTime(dateString?: string | null) {
    if (!dateString) return '--';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '--';

    return new Intl.DateTimeFormat('es-AR', {
        timeZone: APP_TIME_ZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}