// app/support.tsx
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
    NativeSyntheticEvent,
    NativeScrollEvent,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

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

    const scrollRef = useRef<ScrollView | null>(null);
    const [openItem, setOpenItem] = useState<string | null>(null);
    const [showReportButton, setShowReportButton] = useState(false);

    const handleToggle = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpenItem(prev => (prev === id ? null : id));
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;

        // Aparece cuando el usuario scrollea hacia abajo
        if (offsetY > 120 && !showReportButton) {
            setShowReportButton(true);
        }

        if (offsetY <= 120 && showReportButton) {
            setShowReportButton(false);
        }
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
            style={{ backgroundColor: COLORS.background }}
        >
            <View
                className="flex-1 px-4 pt-1 pb-2"
                style={{ maxWidth: 800, alignSelf: 'center' }}
            >
                {/* Logo */}
                <View className="items-center">
                    <Image
                        source={require('../assets/img/icontwist.png')}
                        style={{ width: 85, height: 85, resizeMode: 'contain' }}
                    />
                </View>

                {/* Título */}
                <View className="self-start px-3 mb-1">
                    <Text className="text-md text-gray-500">
                        Soporte & Ayuda
                    </Text>
                </View>

                {/* Panel principal */}
                <View
                    className="flex-1 mt-2 rounded-3xl px-3 py-4"
                    style={{ borderWidth: 2, borderColor: COLORS.primary }}
                >
                    <ScrollView
                        ref={scrollRef}
                        showsVerticalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                    >

                        {/* Introducción */}
                        <Text
                            className="text-[13px] py-2 px-2"
                            style={{ color: COLORS.textMuted }}
                        >
                            Aquí encontrarás respuestas rápidas a dudas frecuentes y
                            soluciones para problemas comunes dentro de la aplicación.
                        </Text>

                        {/* Preguntas frecuentes */}
                        <Text
                            className="text-[15px] font-semibold py-2 px-2"
                            style={{ color: COLORS.accent }}
                        >
                            Preguntas frecuentes
                        </Text>

                        {faqItems.map(renderAccordion)}

                        {/* Problemas comunes */}
                        <Text
                            className="text-[15px] font-semibold py-2 px-2"
                            style={{ color: COLORS.accent }}
                        >
                            Problemas comunes
                        </Text>

                        {problemItems.map(renderAccordion)}

                        {/* Introducción */}
                        <Text
                            className="text-[13px] mt-2 mb-4 py-2 px-2"
                            style={{ color: COLORS.textMuted }}
                        >
                            Si no encuentras la solución a tu problema o tienes una sugerencia, no dudes en contactarnos.
                            Recuerda comunicarnos bien tu inconveniente para que podamos ayudarte de la mejor manera posible.
                            Estamos aquí para brindarte la mejor experiencia posible.
                        </Text>

                    </ScrollView>
                </View>

                {/* Botones inferiores */}
                <View className="mt-2 flex-row justify-between px-2">
                    <Pressable
                        onPress={handleBackHome}
                        className="flex-1 mr-2 px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}
                        >
                            Volver
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => router.push('/contact')}
                        className="flex-1  px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-semibold"
                            style={{ color: COLORS.textLight }}
                        >
                            Contáctanos
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}