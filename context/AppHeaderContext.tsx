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
    usePathname,
} from 'expo-router';

import {
    useAuth,
} from './AuthContext';

import {
    getMyProfile,
} from '../lib/profile';

import {
    useFitnessInsights,
} from './FitnessInsightsContext';

import {
    getHeaderCoachMessage,
} from '../lib/headerCoach';


/*
 * ==========================================
 * MENSAJE DEL HEADER
 * ==========================================
 *
 * Por ahora utilizaremos mensajes simples.
 *
 * Más adelante una pantalla podrá reemplazar
 * temporalmente el mensaje por algo dinámico:
 *
 * "Buen rendimiento"
 * "Sigue el plan"
 * "Más lento, mejor técnica"
 * etc.
 */

export type AppHeaderMessage = {
    text: string;

    showStar?: boolean;

    loading?: boolean;
} | null;


/*
 * ==========================================
 * CONTEXTO
 * ==========================================
 */

type AppHeaderContextValue = {

    /*
     * Perfil que utiliza el header.
     */
    profileImageUrl:
    string | null;

    displayName:
    string;

    profileLoading:
    boolean;


    /*
     * Mensaje mostrado debajo
     * de la imagen.
     */
    headerMessage:
    string | null;

    headerMessageLoading:
    boolean;

    headerMessageShowStar:
    boolean;


    /*
     * Estas funciones serán útiles
     * más adelante desde otras pantallas.
     */
    setHeaderMessage: (
        message:
            AppHeaderMessage
    ) => void;

    clearHeaderMessage:
    () => void;


    /*
     * Permiten actualizar inmediatamente
     * el header cuando Perfil cambie
     * nombre o imagen.
     */
    setHeaderProfileImage:
    (
        imageUrl:
            string | null
    ) => void;

    setHeaderDisplayName:
    (
        name:
            string | null
    ) => void;

    refreshHeaderProfile:
    () => Promise<void>;

    headerVisible:
    boolean;

    setHeaderVisible:
    (
        visible: boolean
    ) => void;
};


const AppHeaderContext =
    createContext<
        AppHeaderContextValue
        | undefined
    >(undefined);


/*
 * ==========================================
 * MENSAJES BÁSICOS SEGÚN RUTA
 * ==========================================
 */

function getDefaultHeaderMessage(
    pathname: string
): string | null {

    /*
     * Primero las rutas de rutina
     * más específicas.
     */

    if (
        pathname.startsWith(
            '/routine/edit/'
        )
    ) {
        return 'Editando';
    }


    if (
        pathname ===
        '/routine/new'
    ) {
        return 'Nueva rutina';
    }


    if (
        pathname ===
        '/routine/scan-photo'
    ) {
        return 'Escanear';
    }


    if (
        pathname ===
        '/routine/review-import'
    ) {
        return 'Revisando';
    }


    if (
        pathname.startsWith(
            '/routine/'
        )
    ) {
        return 'Tu rutina';
    }


    /*
     * Pantallas principales.
     */

    switch (pathname) {

        case '/home':
            return 'Home';


        case '/profile':
            return 'Perfil';


        case '/statistics':
            return 'Estadísticas';


        case '/statistics-history':
            return 'Historial';


        case '/suggestions':
            return 'Sugerencias';


        case '/account':
            return 'Tu cuenta';


        case '/liverun':
            return 'Running';


        case '/nearby':
            return 'Cerca de ti';


        case '/contact':
            return 'Contacto';


        case '/support':
            return 'Soporte';


        case '/info':
            return 'Información';


        case '/about':
            return 'Acerca de';


        case '/terms':
            return 'Términos';


        default:
            return null;
    }
}


/*
 * ==========================================
 * PROVIDER
 * ==========================================
 */

export function AppHeaderProvider({
    children,
}: {
    children: ReactNode;
}) {

    const {
        isAuthenticated,
        user,
    } = useAuth();

    const {
        stats,
        adviceItems,
        loading: fitnessLoading,
        statsError,
    } = useFitnessInsights();


    const pathname =
        usePathname();

    const [
        headerVisible,
        setHeaderVisible,
    ] = useState(true);


    /*
     * ======================================
     * PERFIL DEL HEADER
     * ======================================
     */

    const [
        profileImageUrl,
        setProfileImageUrl,
    ] = useState<
        string | null
    >(null);


    const [
        profileDisplayName,
        setProfileDisplayName,
    ] = useState<
        string | null
    >(null);


    const [
        profileLoading,
        setProfileLoading,
    ] = useState(false);




    /*
     * ======================================
     * MENSAJE PERSONALIZADO
     * ======================================
     */

    const [
        customMessage,
        setCustomMessage,
    ] = useState<
        AppHeaderMessage
    >(null);


    /*
     * Spinner pequeño cuando
     * cambia la pantalla.
     */

    const [
        routeChanging,
        setRouteChanging,
    ] = useState(false);


    const firstRouteRef =
        useRef(true);


    /*
     * ======================================
     * NOMBRE MOSTRADO
     * ======================================
     */

    const displayName =
        profileDisplayName ??
        user?.name ??
        user?.email ??
        'usuario';


    /*
     * ======================================
     * CARGAR PERFIL
     * ======================================
     */

    const refreshHeaderProfile =
        useCallback(
            async () => {

                /*
                 * INVITADO:
                 *
                 * Nunca consultamos
                 * /profile/me.
                 */

                if (!isAuthenticated) {

                    setProfileImageUrl(
                        null
                    );

                    setProfileDisplayName(
                        null
                    );

                    setProfileLoading(
                        false
                    );

                    return;
                }


                try {

                    setProfileLoading(
                        true
                    );


                    const data =
                        await getMyProfile();


                    setProfileImageUrl(
                        data.profile
                            .profileImageUrl ??
                        null
                    );


                    setProfileDisplayName(
                        data.user.name ??
                        data.user.email ??
                        null
                    );

                } catch (error) {

                    console.log(
                        'Error cargando perfil del AppHeader:',
                        error
                    );

                } finally {

                    setProfileLoading(
                        false
                    );
                }
            },
            [
                isAuthenticated,
            ]
        );


    /*
     * Se ejecuta cuando cambia
     * el estado de autenticación.
     *
     * NO cuando cambia cada página.
     */

    useEffect(() => {

        refreshHeaderProfile();

    }, [
        refreshHeaderProfile,
    ]);


    /*
     * ======================================
     * CAMBIO DE PANTALLA
     * ======================================
     */

    useEffect(() => {

        setHeaderVisible(true);

        /*
         * Al entrar a una nueva ruta,
         * cualquier mensaje dinámico anterior
         * deja de tener sentido.
         */

        setCustomMessage(
            null
        );


        /*
         * La primera pantalla no necesita
         * animación de transición.
         */

        if (
            firstRouteRef.current
        ) {

            firstRouteRef.current =
                false;

            setRouteChanging(
                false
            );

            return;
        }


        /*
         * Pequeño spinner entre páginas.
         *
         * Más adelante podemos reemplazar
         * esto por el loading real
         * de cada pantalla.
         */

        setRouteChanging(
            true
        );


        const timeout =
            setTimeout(
                () => {
                    setRouteChanging(
                        false
                    );
                },
                220
            );


        return () => {
            clearTimeout(
                timeout
            );
        };

    }, [
        pathname,
    ]);


    /*
 * ======================================
 * MENSAJE AUTOMÁTICO DEL COACH
 * ======================================
 */

    const coachMessage =
        useMemo(
            () => {

                return getHeaderCoachMessage({
                    pathname,

                    stats,

                    adviceItems,

                    loading:
                        fitnessLoading,

                    statsError,
                });

            },
            [
                pathname,

                stats,

                adviceItems,

                fitnessLoading,

                statsError,
            ]
        );


    /*
     * ======================================
     * MENSAJE BÁSICO DE RESPALDO
     * ======================================
     *
     * Lo conservamos.
     *
     * Si en el futuro aparece una ruta
     * todavía no contemplada por el coach,
     * seguirá mostrando su nombre normal.
     */

    const defaultMessage =
        getDefaultHeaderMessage(
            pathname
        );


    /*
     * ======================================
     * MENSAJE AUTOMÁTICO FINAL
     * ======================================
     */

    const automaticMessage:
        AppHeaderMessage =
        coachMessage ??
        (
            defaultMessage
                ? {
                    text:
                        defaultMessage,
                }
                : null
        );


    /*
     * ======================================
     * MENSAJE FINAL DEL HEADER
     * ======================================
     *
     * Prioridad:
     *
     * 1. Mensaje manual de una pantalla.
     * 2. Header Coach.
     * 3. Nombre básico de la ruta.
     */

    const finalMessage =
        customMessage ??
        automaticMessage;


    const headerMessage =
        finalMessage?.text ??
        null;


    const headerMessageLoading =
        routeChanging ||
        finalMessage?.loading ===
        true;


    const headerMessageShowStar =
        finalMessage?.showStar ??
        false;


    /*
     * ======================================
     * FUNCIONES PÚBLICAS
     * ======================================
     */

    const clearHeaderMessage =
        useCallback(
            () => {
                setCustomMessage(
                    null
                );
            },
            []
        );


    const setHeaderProfileImage =
        useCallback(
            (
                imageUrl:
                    string | null
            ) => {

                setProfileImageUrl(
                    imageUrl
                );
            },
            []
        );


    const setHeaderDisplayName =
        useCallback(
            (
                name:
                    string | null
            ) => {

                setProfileDisplayName(
                    name
                );
            },
            []
        );


    /*
     * ======================================
     * VALUE
     * ======================================
     */

    const value =
        useMemo(
            () => ({
                profileImageUrl,

                displayName,

                profileLoading,

                headerMessage,

                headerMessageLoading,

                headerMessageShowStar,

                setHeaderMessage:
                    setCustomMessage,

                clearHeaderMessage,

                setHeaderProfileImage,

                setHeaderDisplayName,

                refreshHeaderProfile,

                headerVisible,

                setHeaderVisible,
            }),
            [
                profileImageUrl,

                displayName,

                profileLoading,

                headerMessage,

                headerMessageLoading,

                headerMessageShowStar,

                clearHeaderMessage,

                setHeaderProfileImage,

                setHeaderDisplayName,

                refreshHeaderProfile,

                headerVisible,

                setHeaderVisible,
            ]
        );


    return (
        <AppHeaderContext.Provider
            value={value}
        >
            {children}
        </AppHeaderContext.Provider>
    );
}


/*
 * ==========================================
 * HOOK
 * ==========================================
 */

export function useAppHeader() {

    const context =
        useContext(
            AppHeaderContext
        );


    if (!context) {

        throw new Error(
            'useAppHeader debe utilizarse dentro de AppHeaderProvider'
        );
    }


    return context;
}