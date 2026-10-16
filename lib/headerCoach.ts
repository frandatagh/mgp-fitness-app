import type {
    AdviceItem,
    InsightItem,
    MyStatisticsResponse,
} from './statistics';


/*
 * ==========================================
 * TIPOS
 * ==========================================
 */

export type HeaderCoachMessage = {
    text: string;

    showStar?: boolean;

    loading?: boolean;
};


export type HeaderCoachInput = {

    pathname:
    string;

    stats:
    MyStatisticsResponse | null;

    adviceItems:
    AdviceItem[];

    loading:
    boolean;

    statsError:
    string | null;

    /*
     * Lo dejamos inyectable para que
     * posteriormente sea fácil testearlo.
     */
    date?:
    Date;
};


/*
 * ==========================================
 * UTILIDADES
 * ==========================================
 */

function isValidNumber(
    value:
        unknown
): value is number {

    return (
        typeof value === 'number' &&
        Number.isFinite(value)
    );
}


function difference(
    a:
        number | null | undefined,

    b:
        number | null | undefined
) {

    if (
        !isValidNumber(a) ||
        !isValidNumber(b)
    ) {
        return null;
    }

    return a - b;
}


/*
 * ==========================================
 * INSIGHTS
 * ==========================================
 */

function hasInsight(
    insights:
        InsightItem[],

    id:
        string
) {

    return insights.some(
        (item) =>
            item.id === id
    );
}


/*
 * ==========================================
 * CONSEJOS
 * ==========================================
 */

function hasAdviceType(
    adviceItems:
        AdviceItem[],

    type:
        AdviceItem['type']
) {

    return adviceItems.some(
        (item) =>
            item.type === type
    );
}


/*
 * Intentamos detectar si un consejo
 * de entrenamiento habla específicamente
 * de técnica o ejecución.
 *
 * Así evitamos interpretar cualquier
 * consejo "training" como un problema
 * técnico.
 */
function hasTechniqueAdvice(
    adviceItems:
        AdviceItem[]
) {

    const keywords = [
        'técnica',
        'tecnica',
        'ejecución',
        'ejecucion',
        'forma',
        'control',
        'movimiento',
        'postura',
    ];


    return adviceItems.some(
        (item) => {

            if (
                item.type !==
                'training'
            ) {
                return false;
            }


            const text =
                `${item.title} ${item.description}`
                    .toLowerCase();


            return keywords.some(
                (keyword) =>
                    text.includes(
                        keyword
                    )
            );
        }
    );
}


/*
 * ==========================================
 * FRASE ESTABLE POR DÍA
 * ==========================================
 *
 * No usamos Math.random().
 *
 * pathname + fecha producen siempre
 * la misma frase durante ese día.
 */

export function getStablePhrase(
    pathname:
        string,

    phrases:
        readonly string[],

    date:
        Date = new Date()
) {

    if (
        phrases.length === 0
    ) {
        return '';
    }


    const dayKey =
        [
            date.getFullYear(),

            String(
                date.getMonth() + 1
            ).padStart(
                2,
                '0'
            ),

            String(
                date.getDate()
            ).padStart(
                2,
                '0'
            ),
        ].join('-');


    const seed =
        `${pathname}-${dayKey}`;


    let hash =
        0;


    for (
        let index = 0;
        index < seed.length;
        index += 1
    ) {

        hash =
            (
                hash * 31 +
                seed.charCodeAt(index)
            ) >>> 0;
    }


    return phrases[
        hash %
        phrases.length
    ];
}


/*
 * ==========================================
 * HOME
 * ==========================================
 */

function getHomeMessage(
    stats:
        MyStatisticsResponse | null,

    loading:
        boolean,

    statsError:
        string | null
): HeaderCoachMessage {

    /*
     * Si todavía no tenemos datos
     * y estamos cargando:
     */
    if (
        loading &&
        !stats
    ) {

        return {
            text: '',
            showStar: false,
            loading: true,
        };
    }


    /*
     * Si nunca pudimos obtener
     * estadísticas:
     */
    if (
        statsError &&
        !stats
    ) {

        return {
            text: '--',
            showStar: false,
            loading: false,
        };
    }


    const weeklyAverage =
        stats?.performance
            .weeklyAverage ??
        null;


    const monthlyAverage =
        stats?.performance
            .monthlyAverage ??
        null;


    const latestAverage =
        stats?.performance
            .latestAverage ??
        null;


    /*
     * 1 — SEMANA
     */

    if (
        isValidNumber(
            weeklyAverage
        )
    ) {

        return {
            text:
                weeklyAverage
                    .toFixed(1),

            showStar:
                true,

            loading:
                false,
        };
    }


    /*
     * 2 — MES
     */

    if (
        isValidNumber(
            monthlyAverage
        )
    ) {

        return {
            text:
                monthlyAverage
                    .toFixed(1),

            showStar:
                true,

            loading:
                false,
        };
    }


    /*
     * 3 — ÚLTIMA VALORACIÓN
     */

    if (
        isValidNumber(
            latestAverage
        )
    ) {

        return {
            text:
                latestAverage
                    .toFixed(1),

            showStar:
                true,

            loading:
                false,
        };
    }


    /*
     * Consulta correcta,
     * pero todavía sin valoraciones.
     */

    return {
        text:
            'Entrena ahora!',

        showStar:
            false,

        loading:
            false,
    };
}


/*
 * ==========================================
 * ESTADÍSTICAS
 * ==========================================
 */

function getStatisticsMessage(
    stats:
        MyStatisticsResponse | null
): HeaderCoachMessage {

    if (!stats) {

        return {
            text:
                'Mira tu progreso',
        };
    }


    const {
        weeklyAverage,
        monthlyAverage,
        latestAverage,
    } =
        stats.performance;


    const insights =
        stats.insights ?? [];


    /*
     * 1 — Buen rendimiento
     */

    if (
        hasInsight(
            insights,
            'high-performance-week'
        ) ||
        (
            isValidNumber(
                weeklyAverage
            ) &&
            weeklyAverage >= 8
        )
    ) {

        return {
            text:
                'Buen rendimiento',
        };
    }


    /*
     * 2 — Semana claramente
     * por encima del mes.
     */

    const weeklyVsMonthly =
        difference(
            weeklyAverage,
            monthlyAverage
        );


    if (
        weeklyVsMonthly != null &&
        weeklyVsMonthly >= 0.5
    ) {

        return {
            text:
                'Tendencia positiva',
        };
    }


    /*
     * 3 — Última valoración
     * mejor que la referencia.
     */

    const baseline =
        isValidNumber(
            weeklyAverage
        )
            ? weeklyAverage
            : monthlyAverage;


    const latestVsBaseline =
        difference(
            latestAverage,
            baseline
        );


    if (
        latestVsBaseline != null &&
        latestVsBaseline >= 0.5
    ) {

        return {
            text:
                'Vas mejorando',
        };
    }


    /*
     * 4 — Constancia sin grandes
     * variaciones.
     */

    if (
        stats.summary
            .weeklySessions >= 3 &&
        weeklyVsMonthly != null &&
        Math.abs(
            weeklyVsMonthly
        ) < 0.5
    ) {

        return {
            text:
                'Ritmo constante',
        };
    }


    /*
     * 5 — Estado neutral.
     */

    return {
        text:
            'Mira tu progreso',
    };
}


/*
 * ==========================================
 * HISTORIAL
 * ==========================================
 */

function getHistoryMessage(
    stats:
        MyStatisticsResponse | null
): HeaderCoachMessage {

    if (!stats) {

        return {
            text:
                'Sigue construyendo',
        };
    }


    const insights =
        stats.insights ?? [];


    /*
     * La constancia tiene prioridad.
     */

    if (
        hasInsight(
            insights,
            'good-consistency'
        ) ||
        stats.summary
            .weeklySessions >= 3
    ) {

        return {
            text:
                'La constancia cuenta',
        };
    }


    /*
     * Hito inicial de recorrido.
     *
     * Luego podemos convertir
     * 10 / 25 / 50 / 100 km
     * en hitos diferentes.
     */

    if (
        stats.summary
            .totalDistanceMeters >=
        10_000
    ) {

        return {
            text:
                'Buen recorrido',
        };
    }


    /*
     * Hay actividad esta semana.
     */

    if (
        stats.summary
            .weeklySessions > 0
    ) {

        return {
            text:
                'Cada sesión suma',
        };
    }


    /*
     * Hay historial aunque esta
     * semana esté tranquila.
     */

    if (
        isValidNumber(
            stats.performance
                .monthlyAverage
        ) ||
        isValidNumber(
            stats.performance
                .latestAverage
        ) ||
        stats.summary
            .totalDistanceMeters > 0
    ) {

        return {
            text:
                'Mira tu progreso',
        };
    }


    return {
        text:
            'Sigue construyendo',
    };
}


/*
 * ==========================================
 * RUTINA
 * ==========================================
 */

function getRoutineMessage(
    stats:
        MyStatisticsResponse | null,

    adviceItems:
        AdviceItem[]
): HeaderCoachMessage {

    const insights =
        stats?.insights ?? [];


    /*
     * 1 — Recuperación / esfuerzo alto.
     */

    if (
        hasAdviceType(
            adviceItems,
            'recovery'
        ) ||
        hasInsight(
            insights,
            'high-gym-effort'
        )
    ) {

        return {
            text:
                'Regula el esfuerzo',
        };
    }


    /*
     * 2 — Consejo específicamente
     * relacionado con técnica.
     */

    if (
        hasTechniqueAdvice(
            adviceItems
        )
    ) {

        return {
            text:
                'Cuida la técnica',
        };
    }


    /*
     * 3 — La valoración reciente
     * cayó respecto de su referencia.
     */

    if (stats) {

        const {
            weeklyAverage,
            monthlyAverage,
            latestAverage,
        } =
            stats.performance;


        const baseline =
            isValidNumber(
                weeklyAverage
            )
                ? weeklyAverage
                : monthlyAverage;


        const latestVsBaseline =
            difference(
                latestAverage,
                baseline
            );


        if (
            latestVsBaseline != null &&
            latestVsBaseline <= -0.5
        ) {

            return {
                text:
                    'Calidad primero',
            };
        }


        /*
         * 4 — Buena constancia.
         */

        if (
            hasInsight(
                insights,
                'good-consistency'
            ) ||
            stats.summary
                .weeklySessions >= 3
        ) {

            return {
                text:
                    'Sigue el plan',
            };
        }
    }


    /*
     * 5 — Estado normal.
     */

    return {
        text:
            'Entrena con control',
    };
}


/*
 * ==========================================
 * RUNNING
 * ==========================================
 */

function getRunningMessage(
    stats:
        MyStatisticsResponse | null,

    adviceItems:
        AdviceItem[]
): HeaderCoachMessage {

    const insights =
        stats?.insights ?? [];


    /*
     * 1 — Recuperación.
     */

    if (
        hasAdviceType(
            adviceItems,
            'recovery'
        ) ||
        hasInsight(
            insights,
            'high-gym-effort'
        )
    ) {

        return {
            text:
                'Corre liviano',
        };
    }


    /*
     * 2 — El backend detectó
     * mejora real del pace.
     */

    if (
        hasInsight(
            insights,
            'running-pace-improved'
        )
    ) {

        return {
            text:
                'Buen ritmo',
        };
    }


    if (stats) {

        /*
         * 3 — Tenemos actividad
         * y pace calculado.
         */

        if (
            stats.running
                .weeklyDistanceMeters >
            0 &&
            isValidNumber(
                stats.running
                    .weeklyAvgPaceSecPerKm
            )
        ) {

            return {
                text:
                    'Ritmo constante',
            };
        }


        /*
         * 4 — Hay actividad de running,
         * aunque todavía no haya un pace
         * suficientemente útil.
         */

        if (
            stats.running
                .weeklyDistanceMeters >
            0
        ) {

            return {
                text:
                    'Mantén el ritmo',
            };
        }
    }


    /*
     * 5 — Sin una señal concreta.
     */

    return {
        text:
            'Respira y sigue',
    };
}


/*
 * ==========================================
 * FRASES NO PRIORITARIAS
 * ==========================================
 */

const PROFILE_PHRASES = [
    'Sigue tu plan',
    'Tu progreso',
    'Todo preparado',
    'Tu espacio',
] as const;


const SUGGESTIONS_PHRASES = [
    'Ideas para hoy',
    'Prueba algo nuevo',
    'Suma variedad',
    'Elige tu rutina',
    'Nuevo desafío',
] as const;


const NEW_ROUTINE_PHRASES = [
    'Nueva rutina',
    'Arma tu plan',
    'Planifica',
    'A tu medida',
    'Empieza aquí',
] as const;


const EDIT_ROUTINE_PHRASES = [
    'Ajusta tu plan',
    'Afina tu rutina',
    'Mejora tu plan',
    'A tu medida',
] as const;


const INFO_PHRASES = [
    'Conoce la app',
    'Descubre funciones',
    'Aprende a usarla',
    'Explora la app',
] as const;


const SUPPORT_PHRASES = [
    '¿Necesitas ayuda?',
    'Resolvamos esto',
    'Vamos a verlo',
] as const;


const CONTACT_PHRASES = [
    'Escríbenos',
    'Cuéntanos',
    'Te leemos',
    'Estamos para ayudarte',
] as const;


const TERMS_PHRASES = [
    'Todo legal',
    'Uso responsable',
    'Condiciones',
    'Tus derechos',
] as const;


/*
 * ==========================================
 * FUNCIÓN PRINCIPAL
 * ==========================================
 */

export function getHeaderCoachMessage({
    pathname,
    stats,
    adviceItems,
    loading,
    statsError,
    date = new Date(),
}: HeaderCoachInput): HeaderCoachMessage | null {


    /*
     * HOME
     */

    if (
        pathname ===
        '/home'
    ) {

        return getHomeMessage(
            stats,
            loading,
            statsError
        );
    }


    /*
     * ESTADÍSTICAS
     */

    if (
        pathname ===
        '/statistics'
    ) {

        return getStatisticsMessage(
            stats
        );
    }


    /*
     * HISTORIAL
     */

    if (
        pathname ===
        '/statistics-history'
    ) {

        return getHistoryMessage(
            stats
        );
    }


    /*
     * RUTINAS ESPECIALES
     */

    if (
        pathname ===
        '/routine/new'
    ) {

        return {
            text:
                getStablePhrase(
                    pathname,
                    NEW_ROUTINE_PHRASES,
                    date
                ),
        };
    }


    if (
        pathname.startsWith(
            '/routine/edit/'
        )
    ) {

        return {
            text:
                getStablePhrase(
                    pathname,
                    EDIT_ROUTINE_PHRASES,
                    date
                ),
        };
    }


    if (
        pathname ===
        '/routine/scan-photo'
    ) {

        return {
            text:
                'Capturando...',
        };
    }


    if (
        pathname ===
        '/routine/review-import'
    ) {

        return {
            text:
                'Verificando',
        };
    }


    /*
     * DETALLE DE RUTINA
     */

    if (
        pathname.startsWith(
            '/routine/'
        )
    ) {

        return getRoutineMessage(
            stats,
            adviceItems
        );
    }


    /*
     * RUNNING
     */

    if (
        pathname ===
        '/liverun'
    ) {

        return getRunningMessage(
            stats,
            adviceItems
        );
    }


    /*
     * PERFIL
     */

    if (
        pathname ===
        '/profile'
    ) {

        return {
            text:
                getStablePhrase(
                    pathname,
                    PROFILE_PHRASES,
                    date
                ),
        };
    }


    /*
     * SUGERENCIAS
     */

    if (
        pathname ===
        '/suggestions'
    ) {

        return {
            text:
                getStablePhrase(
                    pathname,
                    SUGGESTIONS_PHRASES,
                    date
                ),
        };
    }


    /*
     * CUENTA
     */

    if (
        pathname ===
        '/account'
    ) {

        return {
            text:
                'A tu manera',
        };
    }


    /*
     * INFORMACIÓN
     */

    if (
        pathname ===
        '/info'
    ) {

        return {
            text:
                getStablePhrase(
                    pathname,
                    INFO_PHRASES,
                    date
                ),
        };
    }


    /*
     * SOPORTE
     */

    if (
        pathname ===
        '/support'
    ) {

        return {
            text:
                getStablePhrase(
                    pathname,
                    SUPPORT_PHRASES,
                    date
                ),
        };
    }


    /*
     * CONTACTO
     */

    if (
        pathname ===
        '/contact'
    ) {

        return {
            text:
                getStablePhrase(
                    pathname,
                    CONTACT_PHRASES,
                    date
                ),
        };
    }


    /*
     * TÉRMINOS
     */

    if (
        pathname ===
        '/terms'
    ) {

        return {
            text:
                getStablePhrase(
                    pathname,
                    TERMS_PHRASES,
                    date
                ),
        };
    }


    /*
     * ACERCA DE
     */

    if (
        pathname ===
        '/about'
    ) {

        return {
            text:
                'Acerca de',
        };
    }


    /*
     * CERCA DE TI
     */

    if (
        pathname ===
        '/nearby'
    ) {

        return {
            text:
                'Cerca de ti',
        };
    }


    return null;
}