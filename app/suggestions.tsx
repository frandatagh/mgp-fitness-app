// app/suggestions.tsx

import React, {
    useEffect,
    useState,
} from 'react';

import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    Pressable,
    Modal,
} from 'react-native';

import {
    SafeAreaView,
} from 'react-native-safe-area-context';

import {
    router,
} from 'expo-router';

import {
    Ionicons,
} from '@expo/vector-icons';

import {
    COLORS,
} from '../constants/colors';

import {
    useAuth,
} from '../context/AuthContext';

import {
    Routine,
    getSuggestedRoutines,
} from '../lib/routines';

import {
    RoutineCard,
} from '../components/RoutineCard';



/*
 * =========================================
 * BOTÓN DE NAVEGACIÓN INFERIOR
 * =========================================
 */

function SuggestionsNavButton({
    icon,
    onPress,
}: {
    icon: React.ReactNode;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}

            style={({
                pressed,
            }) => ({
                flex: 1,

                minWidth: 0,

                height: 58,

                borderRadius: 17,

                alignItems:
                    'center',

                justifyContent:
                    'center',

                backgroundColor:
                    pressed
                        ? '#333333'
                        : '#242424',

                borderWidth: 3,

                borderColor:
                    '#353535',

                opacity:
                    pressed
                        ? 0.8
                        : 1,
            })}
        >
            {icon}
        </Pressable>
    );
}


export default function SuggestionsScreen() {
    const {
        isAuthenticated,
        user,
    } = useAuth();


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );


    const [
        routines,
        setRoutines,
    ] =
        useState<Routine[]>([]);


    /*
     * Modal:
     * crear rutina desde cero.
     */
    const [
        createRoutineConfirmVisible,
        setCreateRoutineConfirmVisible,
    ] =
        useState(false);


    /*
     * =========================================
     * CARGA DE SUGERENCIAS
     * =========================================
     */

    useEffect(() => {
        const load =
            async () => {
                try {
                    setError(null);

                    setLoading(true);

                    const data =
                        await getSuggestedRoutines();

                    setRoutines(
                        data
                    );

                } catch (err) {
                    console.error(
                        err
                    );

                    setError(
                        err instanceof Error
                            ? err.message
                            : 'No se pudieron cargar las sugerencias'
                    );

                } finally {
                    setLoading(
                        false
                    );
                }
            };


        void load();

    }, []);


    /*
     * =========================================
     * CREAR RUTINA DESDE CERO
     * =========================================
     */

    const handleConfirmCreateRoutine =
        () => {
            setCreateRoutineConfirmVisible(
                false
            );

            router.push(
                '/routine/new'
            );
        };


    return (
        <SafeAreaView
            edges={[
                'left',
                'right',
                'bottom',
            ]}
            className="flex-1"
            style={{
                backgroundColor:
                    COLORS.background,
            }}
        >
            {/* ================================= */}
            {/* CONTENEDOR GENERAL                */}
            {/* ================================= */}

            <View
                className="flex-1 w-full px-2"

                style={{
                    maxWidth: 800,

                    alignSelf:
                        'center',
                }}
            >

                {/* ============================= */}
                {/* TÍTULO                        */}
                {/* ============================= */}

                <Text
                    className="ml-5 pl-1 text-md text-gray-500"
                >
                    Sugerencias para{' '}
                    {user?.name ??
                        'tu entrenamiento'}
                </Text>


                {/* ============================= */}
                {/* PANEL PRINCIPAL               */}
                {/* ============================= */}

                <View
                    style={{
                        borderWidth: 2,

                        borderColor:
                            COLORS.primary,

                        borderRadius: 22,

                        backgroundColor:
                            '#101010',

                        marginHorizontal: 8,

                        marginTop: 10,

                        flex: 1,

                        overflow:
                            'hidden',
                    }}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={
                            false
                        }

                        scrollEnabled={
                            !loading
                        }

                        style={{
                            flex: 1,
                        }}

                        contentContainerStyle={{
                            padding: 18,

                            paddingBottom:
                                loading
                                    ? 18
                                    : 100,

                            flexGrow: 1,
                        }}
                    >
                        {loading ? (

                            /*
                             * =====================
                             * LOADING
                             * =====================
                             */

                            <View
                                style={{
                                    flex: 1,

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',
                                }}
                            >
                                <View
                                    style={{
                                        width: 62,

                                        height: 62,

                                        alignItems:
                                            'center',

                                        justifyContent:
                                            'center',
                                    }}
                                >
                                    <ActivityIndicator
                                        size="large"

                                        color={
                                            COLORS.primary
                                        }
                                    />
                                </View>


                                <Text
                                    style={{
                                        color:
                                            COLORS.textLight,

                                        fontSize: 13,

                                        fontWeight:
                                            '900',

                                        marginTop: 5,
                                    }}
                                >
                                    Cargando sugerencias
                                </Text>


                                <Text
                                    style={{
                                        color:
                                            COLORS.textMuted,

                                        fontSize: 10,

                                        marginTop: 5,

                                        textAlign:
                                            'center',
                                    }}
                                >
                                    Preparando rutinas para tu entrenamiento...
                                </Text>
                            </View>

                        ) : error ? (

                            /*
                             * =====================
                             * ERROR
                             * =====================
                             */

                            <View
                                style={{
                                    flex: 1,

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',

                                    paddingHorizontal:
                                        20,
                                }}
                            >
                                <Ionicons
                                    name="alert-circle-outline"

                                    size={34}

                                    color="#FF6B6B"
                                />

                                <Text
                                    style={{
                                        color:
                                            '#FFBABA',

                                        fontSize: 13,

                                        textAlign:
                                            'center',

                                        marginTop: 10,
                                    }}
                                >
                                    {error}
                                </Text>
                            </View>

                        ) : (

                            /*
                             * =====================
                             * CONTENIDO
                             * =====================
                             */

                            <>
                                {/* INTRODUCCIÓN */}

                                <Text
                                    style={{
                                        color:
                                            COLORS.textMuted,

                                        fontSize: 13,

                                        lineHeight: 19,

                                        marginBottom:
                                            16,

                                        paddingHorizontal:
                                            2,
                                    }}
                                >
                                    Aquí encontrarás rutinas recomendadas listas para usar.
                                    Explora las opciones, revisa los detalles y copia la rutina
                                    que más se adapte a tus objetivos.
                                    {'\n\n'}
                                    Puedes editarla luego según tus preferencias e ir añadiendo
                                    tus notas de ejercicios.
                                    {'\n\n'}
                                    Recuerda empezar con un buen calentamiento y ajustar la
                                    intensidad según tu nivel.
                                    {'\n\n'}
                                    ¡Es hora de entrenar! 💪
                                </Text>


                                {/* RUTINAS SUGERIDAS */}

                                {routines.map(
                                    (
                                        routine
                                    ) => (
                                        <RoutineCard
                                            key={
                                                routine.id
                                            }

                                            title={
                                                routine.title
                                            }

                                            description={
                                                routine.notes
                                            }

                                            highlighted={
                                                false
                                            }

                                            exercisesPreview={
                                                routine.exercises ??
                                                []
                                            }

                                            mode="suggestion"

                                            onOpen={() =>
                                                router.push({
                                                    pathname:
                                                        '/suggestions/[id]',

                                                    params: {
                                                        id:
                                                            routine.id,
                                                    },
                                                })
                                            }

                                            onEdit={() => {
                                                console.log(
                                                    'Editar rutina sugerida (no disponible)'
                                                );
                                            }}

                                            onDelete={() => {
                                                return;
                                            }}

                                            onShare={() => {
                                                console.log(
                                                    'Compartir sugerencia',
                                                    routine.id
                                                );
                                            }}
                                        />
                                    )
                                )}
                            </>
                        )}
                    </ScrollView>
                </View>


                {/* ============================= */}
                {/* NAVEGACIÓN INFERIOR          */}
                {/* ============================= */}

                <View
                    style={{
                        flexDirection:
                            'row',

                        alignItems:
                            'center',

                        justifyContent:
                            'space-between',

                        gap: 8,

                        marginHorizontal:
                            8,

                        marginTop: 10,

                        marginBottom: 10,
                    }}
                >
                    {/* 1 — HOME */}

                    <SuggestionsNavButton
                        onPress={() =>
                            router.replace(
                                '/home'
                            )
                        }

                        icon={
                            <Ionicons
                                name="home-outline"

                                size={27}

                                color="#FFFFFF"
                            />
                        }
                    />


                    {/* 2 — PERFIL */}

                    <SuggestionsNavButton
                        onPress={() =>
                            router.push(
                                '/profile'
                            )
                        }

                        icon={
                            <Ionicons
                                name="person-circle-outline"

                                size={32}

                                color="#FFFFFF"
                            />
                        }
                    />


                    {/* 3 — ESTADÍSTICAS */}

                    <SuggestionsNavButton
                        onPress={() =>
                            router.push(
                                '/statistics'
                            )
                        }

                        icon={
                            <Ionicons
                                name="stats-chart-outline"

                                size={27}

                                color="#FFFFFF"
                            />
                        }
                    />


                    {/* 4 — CREAR RUTINA */}

                    <SuggestionsNavButton
                        onPress={() =>
                            setCreateRoutineConfirmVisible(
                                true
                            )
                        }

                        icon={
                            <Ionicons
                                name="add"

                                size={34}

                                color="#FFFFFF"
                            />
                        }
                    />
                </View>
            </View>


            {/* ================================= */}
            {/* MODAL — CREAR DESDE CERO         */}
            {/* ================================= */}

            <Modal
                visible={
                    createRoutineConfirmVisible
                }

                transparent

                animationType="fade"

                onRequestClose={() =>
                    setCreateRoutineConfirmVisible(
                        false
                    )
                }
            >
                <View
                    style={{
                        flex: 1,

                        backgroundColor:
                            'rgba(0,0,0,0.75)',

                        alignItems:
                            'center',

                        justifyContent:
                            'center',

                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width:
                                '100%',

                            maxWidth: 350,

                            backgroundColor:
                                '#101010',

                            borderRadius: 24,

                            borderWidth: 1,

                            borderColor:
                                '#343434',

                            padding: 18,
                        }}
                    >



                        {/* TÍTULO */}

                        <Text
                            style={{
                                color:
                                    COLORS.textLight,

                                fontSize: 18,

                                fontWeight:
                                    '900',

                                textAlign:
                                    'center',
                            }}
                        >
                            ¿Crear una rutina desde cero?
                        </Text>


                        {/* TEXTO */}

                        <Text
                            style={{
                                color:
                                    COLORS.textMuted,

                                fontSize: 13,

                                lineHeight: 19,

                                textAlign:
                                    'center',

                                marginTop: 10,
                            }}
                        >
                            Vas a comenzar una nueva rutina vacía y podrás agregar tus ejercicios manualmente.
                        </Text>


                        {/* BOTONES */}

                        <View
                            style={{
                                flexDirection:
                                    'row',

                                gap: 10,

                                marginTop: 18,
                            }}
                        >
                            {/* CANCELAR */}

                            <Pressable
                                onPress={() =>
                                    setCreateRoutineConfirmVisible(
                                        false
                                    )
                                }

                                style={({ pressed }) => ({
                                    flex: 1,

                                    minHeight: 46,

                                    borderRadius:
                                        14,

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',

                                    backgroundColor:
                                        pressed
                                            ? '#444444'
                                            : '#303030',
                                })}
                            >
                                <Text
                                    style={{
                                        color:
                                            COLORS.textLight,

                                        fontSize: 13,

                                        fontWeight:
                                            '800',
                                    }}
                                >
                                    Cancelar
                                </Text>
                            </Pressable>


                            {/* CREAR */}

                            <Pressable
                                onPress={
                                    handleConfirmCreateRoutine
                                }

                                style={({ pressed }) => ({
                                    flex: 1,

                                    minHeight: 46,

                                    borderRadius:
                                        14,

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',

                                    backgroundColor:
                                        pressed
                                            ? '#B4E800'
                                            : COLORS.primary,
                                })}
                            >
                                <Text
                                    style={{
                                        color:
                                            '#111111',

                                        fontSize: 13,

                                        fontWeight:
                                            '900',
                                    }}
                                >
                                    Sí, crear
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}