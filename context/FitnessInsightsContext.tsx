import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

import {
    getMyAdvice,
    getMyStatistics,
    type AdviceItem,
    type MyStatisticsResponse,
} from '../lib/statistics';

import {
    useAuth,
} from './AuthContext';


type FitnessInsightsContextValue = {

    /*
     * Datos principales provenientes
     * de /statistics/me
     */
    stats:
    MyStatisticsResponse | null;


    /*
     * Consejos provenientes
     * de /statistics/advice
     */
    adviceItems:
    AdviceItem[];


    /*
     * Indica si estamos consultando
     * nuevamente los datos.
     */
    loading:
    boolean;


    /*
     * Separamos los errores.
     *
     * Si fallan los consejos pero
     * funcionan las estadísticas,
     * el coach todavía puede trabajar.
     */
    statsError:
    string | null;

    adviceError:
    string | null;


    /*
     * Última actualización correcta.
     */
    lastUpdated:
    Date | null;


    /*
     * Permite refrescar los datos
     * después de registrar una rutina,
     * un running, una valoración, etc.
     */
    refreshFitnessInsights:
    () => Promise<void>;
};


const FitnessInsightsContext =
    createContext<
        FitnessInsightsContextValue
        | undefined
    >(undefined);


export function FitnessInsightsProvider({
    children,
}: {
    children: ReactNode;
}) {

    const {
        isAuthenticated,
    } = useAuth();


    const [
        stats,
        setStats,
    ] = useState<
        MyStatisticsResponse | null
    >(null);


    const [
        adviceItems,
        setAdviceItems,
    ] = useState<
        AdviceItem[]
    >([]);


    const [
        loading,
        setLoading,
    ] = useState(false);


    const [
        statsError,
        setStatsError,
    ] = useState<
        string | null
    >(null);


    const [
        adviceError,
        setAdviceError,
    ] = useState<
        string | null
    >(null);


    const [
        lastUpdated,
        setLastUpdated,
    ] = useState<
        Date | null
    >(null);


    /*
     * Cada consulta obtiene un número.
     *
     * Si una consulta vieja termina
     * después que una nueva, ignoramos
     * el resultado viejo.
     */
    const requestIdRef =
        useRef(0);


    /*
     * ======================================
     * LIMPIAR DATOS
     * ======================================
     */

    const clearFitnessInsights =
        useCallback(
            () => {

                requestIdRef.current += 1;

                setStats(
                    null
                );

                setAdviceItems(
                    []
                );

                setStatsError(
                    null
                );

                setAdviceError(
                    null
                );

                setLastUpdated(
                    null
                );

                setLoading(
                    false
                );
            },
            []
        );


    /*
     * ======================================
     * CARGAR / ACTUALIZAR
     * ======================================
     */

    const refreshFitnessInsights =
        useCallback(
            async () => {

                if (!isAuthenticated) {
                    clearFitnessInsights();
                    return;
                }


                const requestId =
                    ++requestIdRef.current;


                try {

                    setLoading(
                        true
                    );

                    setStatsError(
                        null
                    );

                    setAdviceError(
                        null
                    );


                    /*
                     * Usamos allSettled porque
                     * los consejos pueden fallar
                     * sin inutilizar las estadísticas.
                     */
                    const [
                        statsResult,
                        adviceResult,
                    ] =
                        await Promise.allSettled([
                            getMyStatistics(),
                            getMyAdvice(),
                        ]);


                    /*
                     * Ya existe una consulta
                     * más nueva.
                     */
                    if (
                        requestId !==
                        requestIdRef.current
                    ) {
                        return;
                    }


                    let hadSuccessfulRequest =
                        false;


                    /*
                     * ==================================
                     * ESTADÍSTICAS
                     * ==================================
                     */

                    if (
                        statsResult.status ===
                        'fulfilled'
                    ) {

                        setStats(
                            statsResult.value
                        );

                        setStatsError(
                            null
                        );

                        hadSuccessfulRequest =
                            true;

                    } else {

                        console.log(
                            'Error cargando estadísticas globales:',
                            statsResult.reason
                        );

                        setStatsError(
                            'No pudimos actualizar tus estadísticas.'
                        );
                    }


                    /*
                     * ==================================
                     * CONSEJOS
                     * ==================================
                     */

                    if (
                        adviceResult.status ===
                        'fulfilled'
                    ) {

                        setAdviceItems(
                            adviceResult.value
                                .items ?? []
                        );

                        setAdviceError(
                            null
                        );

                        hadSuccessfulRequest =
                            true;

                    } else {

                        console.log(
                            'Error cargando consejos globales:',
                            adviceResult.reason
                        );

                        setAdviceError(
                            'No pudimos actualizar los consejos.'
                        );
                    }


                    /*
                     * Solamente marcamos una nueva
                     * actualización si algo pudo
                     * recuperarse correctamente.
                     */
                    if (
                        hadSuccessfulRequest
                    ) {

                        setLastUpdated(
                            new Date()
                        );
                    }

                } finally {

                    if (
                        requestId ===
                        requestIdRef.current
                    ) {

                        setLoading(
                            false
                        );
                    }
                }
            },
            [
                isAuthenticated,
                clearFitnessInsights,
            ]
        );


    /*
     * ======================================
     * AUTENTICACIÓN
     * ======================================
     *
     * Al iniciar sesión cargamos una vez.
     *
     * Al cerrar sesión eliminamos todos
     * los datos del usuario anterior.
     */

    useEffect(() => {

        if (
            isAuthenticated
        ) {

            void refreshFitnessInsights();

        } else {

            clearFitnessInsights();
        }

    }, [
        isAuthenticated,
        refreshFitnessInsights,
        clearFitnessInsights,
    ]);


    /*
     * ======================================
     * VALUE
     * ======================================
     */

    const value =
        useMemo(
            () => ({
                stats,
                adviceItems,

                loading,

                statsError,
                adviceError,

                lastUpdated,

                refreshFitnessInsights,
            }),
            [
                stats,
                adviceItems,

                loading,

                statsError,
                adviceError,

                lastUpdated,

                refreshFitnessInsights,
            ]
        );


    return (
        <FitnessInsightsContext.Provider
            value={value}
        >
            {children}
        </FitnessInsightsContext.Provider>
    );
}


/*
 * ==========================================
 * HOOK
 * ==========================================
 */

export function useFitnessInsights() {

    const context =
        useContext(
            FitnessInsightsContext
        );


    if (!context) {

        throw new Error(
            'useFitnessInsights debe utilizarse dentro de FitnessInsightsProvider'
        );
    }


    return context;
}