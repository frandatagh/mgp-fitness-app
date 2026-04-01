// app/about.tsx
import React from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
    Linking,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

export default function AboutScreen() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    const handleBack = () => {
        router.replace(isAuthenticated ? '/home' : '/');
    };

    const openExternalLink = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);

            if (!supported) {
                Alert.alert('Enlace no disponible', 'No se pudo abrir este enlace en tu dispositivo.');
                return;
            }

            await Linking.openURL(url);
        } catch (error) {
            Alert.alert('Error', 'No se pudo abrir el enlace.');
        }
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
                {/* LOGO SUPERIOR */}
                <View className="items-center mb-2">
                    <Image
                        source={require('../assets/img/icontwist.png')}
                        style={{ width: 85, height: 85, resizeMode: 'contain' }}
                    />
                </View>

                {/* PANEL PRINCIPAL */}
                <View
                    className="flex-1 rounded-3xl px-3 py-4"
                    style={{ borderWidth: 2, borderColor: COLORS.primary }}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        className="px-2"
                    >
                        {/* TÍTULO */}
                        <View className="mb-2 px-1">
                            <Text
                                className="text-[20px] font-semibold py-2"
                                style={{ color: COLORS.textLight }}
                            >
                                Acerca de nosotros
                            </Text>
                        </View>

                        {/* BLOQUE 1 */}
                        <Text
                            className="text-[15px] font-semibold mb-2"
                            style={{ color: COLORS.accent }}
                        >
                            ¿Por qué fue creada esta aplicación?
                        </Text>
                        <Text
                            className="text-[13px] mb-3 leading-5"
                            style={{ color: COLORS.textMuted }}
                        >
                            MGP Rutina Fitness fue creada con la idea de ofrecer una herramienta
                            clara, práctica y accesible para organizar entrenamientos sin depender
                            de sistemas complejos o planes difíciles de seguir. Muchas personas
                            comienzan a entrenar con entusiasmo, pero con el tiempo pierden
                            constancia por falta de orden, seguimiento o una estructura básica que
                            las ayude a sostener el hábito.
                            {'\n\n'}
                            Esta aplicación nació para cubrir esa necesidad: permitir que cada
                            usuario tenga un espacio propio para crear rutinas, guardar ejercicios,
                            revisar sugerencias, consultar puntos de entrenamiento cercanos y, poco
                            a poco, construir una experiencia más completa alrededor del cuidado
                            físico y la constancia personal.
                            {'\n\n'}
                            También fue pensada como un proyecto en evolución, donde cada mejora
                            técnica, ajuste visual o nueva funcionalidad responde al objetivo de
                            hacer la experiencia más útil, más intuitiva y más cercana a las
                            necesidades reales de quienes entrenan día a día.
                        </Text>

                        {/* BLOQUE 2 */}
                        <Text
                            className="text-[15px] font-semibold mb-2"
                            style={{ color: COLORS.accent }}
                        >
                            ¿Para qué sirve MGP Rutina Fitness?
                        </Text>
                        <Text
                            className="text-[13px] mb-3 leading-5"
                            style={{ color: COLORS.textMuted }}
                        >
                            La aplicación sirve como una herramienta de apoyo para personas que
                            desean organizar mejor sus rutinas y tener un control más claro sobre
                            sus entrenamientos. Su propósito no es reemplazar a un entrenador ni a
                            un profesional de la salud, sino ayudar al usuario a estructurar su
                            práctica de una manera más simple y constante.
                            {'\n\n'}
                            Entre sus funciones principales se encuentran la creación de rutinas
                            personalizadas, la posibilidad de editar ejercicios y notas, el acceso
                            a rutinas sugeridas, la exploración de puntos de entrenamiento en el
                            mapa y otras herramientas que seguirán creciendo con nuevas versiones.
                            {'\n\n'}
                            A medida que el proyecto avance, la idea es que la app también permita
                            mostrar estadísticas, mejorar el perfil del usuario, enriquecer el
                            seguimiento del progreso y ampliar las opciones disponibles para cada
                            tipo de entrenamiento.
                        </Text>

                        {/* BLOQUE 3 */}
                        <Text
                            className="text-[15px] font-semibold mb-2"
                            style={{ color: COLORS.accent }}
                        >
                            Nuestra visión
                        </Text>
                        <Text
                            className="text-[13px] mb-3 leading-5"
                            style={{ color: COLORS.textMuted }}
                        >
                            La visión detrás de MGP Rutina Fitness es construir una app útil,
                            cercana y realista, que no dependa solamente de una buena idea, sino de
                            una experiencia concreta para el usuario. Queremos que la aplicación
                            pueda crecer de manera progresiva, manteniendo una interfaz simple y
                            moderna, pero también incorporando herramientas cada vez más potentes
                            para apoyar el entrenamiento personal.
                            {'\n\n'}
                            Buscamos que la app sea un espacio donde el usuario encuentre orden,
                            motivación y una base confiable para sostener sus objetivos físicos.
                            No importa si recién empieza o si ya entrena hace tiempo: la meta es
                            ofrecer una plataforma que acompañe el proceso de forma clara y útil.
                        </Text>

                        {/* BLOQUE 4 */}
                        <Text
                            className="text-[15px] font-semibold mb-2"
                            style={{ color: COLORS.accent }}
                        >
                            Estado actual del proyecto
                        </Text>
                        <Text
                            className="text-[13px] mb-4 leading-5"
                            style={{ color: COLORS.textMuted }}
                        >
                            Actualmente MGP Rutina Fitness se encuentra en una etapa de desarrollo
                            activo. Ya cuenta con funciones centrales como la gestión de rutinas,
                            sugerencias, contacto, soporte y exploración de puntos cercanos. Sin
                            embargo, todavía hay secciones que seguirán evolucionando, como el
                            perfil del usuario, estadísticas más completas y futuras herramientas
                            adicionales.
                            {'\n\n'}
                            El crecimiento del proyecto se realiza paso a paso, priorizando
                            estabilidad, claridad y una experiencia cada vez más sólida. Por eso,
                            algunas secciones pueden cambiar, ampliarse o refinarse a medida que el
                            desarrollo continúe.
                        </Text>

                        {/* REDES / ENLACES */}
                        <Text
                            className="text-[15px] font-semibold mb-2"
                            style={{ color: COLORS.accent }}
                        >
                            Redes y enlaces
                        </Text>
                        <Text
                            className="text-[13px] mb-3 leading-5"
                            style={{ color: COLORS.textMuted }}
                        >
                            Aquí podrás encontrar nuestros enlaces principales. Más adelante
                            podrás personalizar esta sección con tus redes oficiales, sitio web,
                            portafolio o canales de contacto directo.
                        </Text>

                        <View className="mb-3">
                            <Pressable
                                onPress={() => openExternalLink('https://www.instagram.com/')}
                                className="rounded-xl px-4 py-3 mb-2"
                                style={{ backgroundColor: '#111111' }}
                            >
                                <Text
                                    className="text-[14px] font-semibold"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Instagram
                                </Text>
                                <Text
                                    className="text-[12px] mt-1"
                                    style={{ color: COLORS.textMuted }}
                                >
                                    Visita nuestro perfil en Instagram
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => openExternalLink('https://github.com/')}
                                className="rounded-xl px-4 py-3 mb-2"
                                style={{ backgroundColor: '#111111' }}
                            >
                                <Text
                                    className="text-[14px] font-semibold"
                                    style={{ color: COLORS.textLight }}
                                >
                                    GitHub
                                </Text>
                                <Text
                                    className="text-[12px] mt-1"
                                    style={{ color: COLORS.textMuted }}
                                >
                                    Conoce más sobre el desarrollo del proyecto
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => openExternalLink('mailto:mgprutinafitness@gmail.com')}
                                className="rounded-xl px-4 py-3"
                                style={{ backgroundColor: '#111111' }}
                            >
                                <Text
                                    className="text-[14px] font-semibold"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Correo electrónico
                                </Text>
                                <Text
                                    className="text-[12px] mt-1"
                                    style={{ color: COLORS.textMuted }}
                                >
                                    Escríbenos directamente por email
                                </Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>

                {/* BOTÓN INFERIOR */}
                <View className="mt-2 px-2">
                    <Pressable
                        onPress={handleBack}
                        className="px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}
                        >
                            Volver
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}