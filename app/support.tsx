// app/support.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';

// Habilita animaciones en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AccordionItem = {
    id: string;
    title: string;
    content: string;
};

export default function SupportScreen() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();


    const [openItem, setOpenItem] = useState<string | null>(null);


    const handleToggle = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpenItem(prev => (prev === id ? null : id));
    };



    const handleBackHome = () => {
        if (isAuthenticated) {
            router.replace('/home');
        } else {
            router.replace('/');
        }
    };

    const faqItems: AccordionItem[] = [
        {
            id: 'faq1',
            title: '¿Cómo creo una rutina nueva?',
            content:
                'Desde la pantalla principal presiona el botón "Crear rutina". Allí podrás asignar un título, agregar ejercicios, series, repeticiones y notas. Luego guarda los cambios.',
        },
        {
            id: 'faq2',
            title: '¿Cómo copio una rutina sugerida?',
            content:
                'En la sección Sugerencias abre una rutina recomendada y presiona el botón "Copiar rutina". Se guardará automáticamente en tu cuenta y podrás editarla.',
        },
        {
            id: 'faq3',
            title: '¿Qué significa "Realizada por hoy"?',
            content:
                'Es una forma de registrar que completaste tu entrenamiento del día. Esto permitirá futuras estadísticas de progreso.',
        },
        {
            id: 'faq4',
            title: '¿Puedo editar una rutina guardada?',
            content:
                'Sí. Ingresa a la rutina desde "Mis rutinas" y selecciona la opción de editar para modificar ejercicios o notas.',
        },
    ];

    const problemItems: AccordionItem[] = [
        {
            id: 'prob1',
            title: 'No aparecen mis rutinas',
            content:
                'Verifica tu conexión a internet. Si el problema persiste, cierra sesión y vuelve a iniciar sesión.',
        },
        {
            id: 'prob2',
            title: 'No puedo iniciar sesión',
            content:
                'Asegúrate de estar ingresando el correo y contraseña correctos. Si olvidaste tu contraseña, próximamente habrá opción de recuperación.',
        },
        {
            id: 'prob3',
            title: 'El mapa no muestra puntos',
            content:
                'Verifica que hayas otorgado permisos de ubicación a la aplicación.',
        },
        {
            id: 'prob4',
            title: 'Una función no está disponible',
            content:
                'Algunas funciones están en desarrollo. Revisa la sección de Información para conocer qué características estarán disponibles próximamente.',
        },
    ];

    const renderAccordion = (item: AccordionItem) => {
        const isOpen = openItem === item.id;

        return (
            <View
                key={item.id}
                className="mb-1 rounded-xl px-3 py-2"
                style={{ backgroundColor: '#1A1A1A' }}
            >
                <Pressable onPress={() => handleToggle(item.id)}>
                    <Text
                        className="text-[14px] font-semibold"
                        style={{ color: COLORS.textLight }}
                    >
                        {item.title}
                    </Text>
                </Pressable>

                {isOpen && (
                    <Text
                        className="text-[13px] mt-2 leading-5"
                        style={{ color: COLORS.textMuted }}
                    >
                        {item.content}
                    </Text>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView
            className="flex-1"
            style={{
                backgroundColor:
                    COLORS.background,
            }}
        >
            {/* ========================================= */}
            {/* CONTENEDOR GENERAL                       */}
            {/* ========================================= */}

            <View
                className="flex-1 w-full px-2"
                style={{
                    maxWidth: 800,
                    alignSelf: 'center',
                }}
            >
                {/* ===================================== */}
                {/* HEADER                                */}
                {/* ===================================== */}

                <View className="px-2">
                    <AppHeader
                        showProfile={
                            isAuthenticated
                        }
                    />
                </View>


                {/* ===================================== */}
                {/* TÍTULO                                */}
                {/* ===================================== */}

                <Text
                    className="ml-5 pl-1 text-md text-gray-500"
                >
                    Soporte & Ayuda
                </Text>


                {/* ===================================== */}
                {/* PANEL PRINCIPAL                       */}
                {/* ===================================== */}

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

                        overflow: 'hidden',
                    }}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={
                            false
                        }

                        style={{
                            flex: 1,
                        }}

                        contentContainerStyle={{
                            padding: 18,

                            paddingBottom: 28,
                        }}
                    >
                        {/* ============================= */}
                        {/* INTRODUCCIÓN                  */}
                        {/* ============================= */}

                        <Text
                            style={{
                                color:
                                    COLORS.textMuted,

                                fontSize: 13,

                                lineHeight: 19,

                                marginBottom: 16,

                                paddingHorizontal: 2,
                            }}
                        >
                            Aquí encontrarás respuestas rápidas a dudas frecuentes y soluciones para problemas comunes dentro de la aplicación.
                        </Text>


                        {/* ============================= */}
                        {/* PREGUNTAS FRECUENTES          */}
                        {/* ============================= */}

                        <Text
                            style={{
                                color:
                                    COLORS.accent,

                                fontSize: 15,

                                fontWeight: '700',

                                marginBottom: 8,

                                paddingHorizontal: 2,
                            }}
                        >
                            Preguntas frecuentes
                        </Text>


                        {faqItems.map(
                            renderAccordion
                        )}


                        {/* ============================= */}
                        {/* PROBLEMAS COMUNES             */}
                        {/* ============================= */}

                        <Text
                            style={{
                                color:
                                    COLORS.accent,

                                fontSize: 15,

                                fontWeight: '700',

                                marginTop: 16,

                                marginBottom: 8,

                                paddingHorizontal: 2,
                            }}
                        >
                            Problemas comunes
                        </Text>


                        {problemItems.map(
                            renderAccordion
                        )}


                        {/* ============================= */}
                        {/* MENSAJE FINAL                 */}
                        {/* ============================= */}

                        <Text
                            style={{
                                color:
                                    COLORS.textMuted,

                                fontSize: 13,

                                lineHeight: 19,

                                marginTop: 18,

                                paddingHorizontal: 2,
                            }}
                        >
                            Si no encuentras la solución a tu problema o tienes una sugerencia, no dudes en contactarnos.
                            {'\n\n'}
                            Recuerda comunicarnos bien tu inconveniente para que podamos ayudarte de la mejor manera posible.
                        </Text>


                        {/* ============================= */}
                        {/* CONTACTANOS                   */}
                        {/* ============================= */}

                        <Pressable
                            onPress={() =>
                                router.push(
                                    '/contact'
                                )
                            }

                            style={({ pressed }) => ({
                                minHeight: 50,

                                marginTop: 18,

                                borderRadius: 15,

                                flexDirection:
                                    'row',

                                alignItems:
                                    'center',

                                justifyContent:
                                    'center',

                                backgroundColor:
                                    pressed
                                        ? '#B4E800'
                                        : COLORS.primary,

                                opacity:
                                    pressed
                                        ? 0.9
                                        : 1,
                            })}
                        >
                            <Text
                                style={{
                                    color:
                                        '#111111',

                                    fontSize: 14,

                                    fontWeight:
                                        '900',
                                }}
                            >
                                Contáctanos
                            </Text>
                        </Pressable>
                    </ScrollView>
                </View>


                {/* ===================================== */}
                {/* NAVEGACIÓN INFERIOR                  */}
                {/* ===================================== */}

                <View
                    style={{
                        marginHorizontal: 8,

                        marginTop: 10,

                        marginBottom: 10,
                    }}
                >
                    <Pressable
                        onPress={
                            handleBackHome
                        }

                        style={({ pressed }) => ({
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
                        <Text
                            style={{
                                color:
                                    '#FFFFFF',

                                fontSize: 14,

                                fontWeight:
                                    '700',
                            }}
                        >
                            Volver al home
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}