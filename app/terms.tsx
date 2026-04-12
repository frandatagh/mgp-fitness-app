// app/terms.tsx
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

type SectionKey =
    | 'introduccion'
    | 'uso'
    | 'responsabilidad'
    | 'limitacion'
    | 'cuenta'
    | 'desarrollo'
    | 'contacto';

export default function TermsScreen() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    const scrollViewRef = useRef<ScrollView | null>(null);
    const [sectionPositions, setSectionPositions] = useState<Record<SectionKey, number>>({
        introduccion: 0,
        uso: 0,
        responsabilidad: 0,
        limitacion: 0,
        cuenta: 0,
        desarrollo: 0,
        contacto: 0,
    });

    const handleScrollTo = (section: SectionKey) => {
        const y = sectionPositions[section] ?? 0;
        scrollViewRef.current?.scrollTo({ y, animated: true });
    };

    const handleBack = () => {
        router.replace(isAuthenticated ? '/home' : '/');
    };

    const handleSectionLayout = (section: SectionKey, y: number) => {
        setSectionPositions(prev => ({
            ...prev,
            [section]: y,
        }));
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
                        ref={scrollViewRef}
                        showsVerticalScrollIndicator={false}
                        className="px-2"
                    >
                        {/* TÍTULO */}
                        <View className="mb-2 px-1">
                            <Text
                                className="text-[20px] font-semibold py-2"
                                style={{ color: COLORS.textLight }}
                            >
                                Términos y condiciones
                            </Text>
                            <Text
                                className="text-[13px] mt-1"
                                style={{ color: COLORS.textMuted }}
                            >
                                Al registrarte o utilizar MGP Rutina Fitness, aceptas las condiciones
                                descritas en esta sección. Si no estás de acuerdo con estos términos,
                                te recomendamos no utilizar la aplicación ni crear una cuenta.
                            </Text>
                        </View>

                        {/* ÍNDICE RÁPIDO */}
                        <View className="mb-3 px-1">
                            <Text
                                className="text-[14px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Navegación rápida
                            </Text>

                            <View className="flex-row flex-wrap">
                                <Pressable
                                    onPress={() => handleScrollTo('introduccion')}
                                    className="mr-2 mb-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: '#222222' }}
                                >
                                    <Text className="text-[14px]" style={{ color: COLORS.textLight }}>
                                        Introducción
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => handleScrollTo('uso')}
                                    className="mr-2 mb-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: '#222222' }}
                                >
                                    <Text className="text-[14px]" style={{ color: COLORS.textLight }}>
                                        Uso de la aplicación
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => handleScrollTo('responsabilidad')}
                                    className="mr-2 mb-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: '#222222' }}
                                >
                                    <Text className="text-[14px]" style={{ color: COLORS.textLight }}>
                                        Responsabilidad del usuario
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => handleScrollTo('limitacion')}
                                    className="mr-2 mb-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: '#222222' }}
                                >
                                    <Text className="text-[14px]" style={{ color: COLORS.textLight }}>
                                        Limitación de responsabilidad
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => handleScrollTo('cuenta')}
                                    className="mr-2 mb-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: '#222222' }}
                                >
                                    <Text className="text-[14px]" style={{ color: COLORS.textLight }}>
                                        Cuenta y datos
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => handleScrollTo('desarrollo')}
                                    className="mr-2 mb-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: '#222222' }}
                                >
                                    <Text className="text-[14px]" style={{ color: COLORS.textLight }}>
                                        Funciones en desarrollo
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => handleScrollTo('contacto')}
                                    className="mr-2 mb-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: '#222222' }}
                                >
                                    <Text className="text-[14px]" style={{ color: COLORS.textLight }}>
                                        Contacto
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* INTRODUCCIÓN */}
                        <View
                            onLayout={(e) => {
                                const y = e.nativeEvent.layout.y;
                                handleSectionLayout('introduccion', y);
                            }}
                        >
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Introducción
                            </Text>
                            <Text
                                className="text-[13px] mb-3 leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                MGP Rutina Fitness es una aplicación creada con el objetivo de ayudar
                                a los usuarios a organizar, consultar y gestionar rutinas de entrenamiento
                                de forma práctica. Su función principal es servir como una herramienta de
                                apoyo para el seguimiento de planes personales de ejercicio, acceso a
                                rutinas sugeridas, localización de puntos de entrenamiento y otras funciones
                                complementarias que pueden ampliarse con el tiempo.
                                {'\n\n'}
                                Estos términos y condiciones regulan el acceso y uso de la aplicación.
                                Al registrarte, iniciar sesión o continuar utilizando cualquier sección de
                                la plataforma, aceptas expresamente el contenido de este documento. Si no
                                estás de acuerdo con alguno de estos términos, debes abstenerte de utilizar
                                la aplicación.
                                {'\n\n'}
                                El presente texto puede ser actualizado en cualquier momento para reflejar
                                cambios funcionales, mejoras técnicas, incorporación de nuevas secciones o
                                ajustes en la forma en que se gestionan los datos y servicios asociados.
                                El uso continuado de la aplicación luego de dichas modificaciones implicará
                                la aceptación de la versión vigente de estos términos.
                            </Text>
                        </View>

                        {/* USO DE LA APLICACIÓN */}
                        <View
                            onLayout={(e) => {
                                const y = e.nativeEvent.layout.y;
                                handleSectionLayout('uso', y);
                            }}
                        >
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Uso de la aplicación
                            </Text>
                            <Text
                                className="text-[13px] mb-3 leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                El usuario puede utilizar MGP Rutina Fitness para crear rutinas propias,
                                editar ejercicios, consultar sugerencias, explorar puntos cercanos de
                                entrenamiento y utilizar otras herramientas disponibles dentro del entorno
                                de la aplicación. Todas estas funciones están pensadas para uso personal
                                y de apoyo organizativo.
                                {'\n\n'}
                                Queda prohibido utilizar la aplicación con fines ilícitos, fraudulentos,
                                abusivos o contrarios al propósito general del servicio. El usuario no
                                deberá intentar alterar el funcionamiento interno de la plataforma, acceder
                                a secciones restringidas sin autorización, interferir con la experiencia de
                                otros usuarios ni aprovechar fallas del sistema de forma indebida.
                                {'\n\n'}
                                Algunas funciones pueden depender de servicios externos, conexión a internet,
                                geolocalización, disponibilidad de mapas, autenticación o integraciones de
                                terceros. Por ello, la experiencia de uso puede variar según el dispositivo,
                                el sistema operativo, la conectividad o la etapa de desarrollo de la aplicación.
                                {'\n\n'}
                                MGP Rutina Fitness se reserva el derecho de modificar, suspender o reemplazar
                                parcial o totalmente cualquier funcionalidad en cualquier momento, especialmente
                                cuando dichas modificaciones respondan a mejoras técnicas, correcciones de errores,
                                seguridad del sistema o evolución del proyecto.
                            </Text>
                        </View>

                        {/* RESPONSABILIDAD DEL USUARIO */}
                        <View
                            onLayout={(e) => {
                                const y = e.nativeEvent.layout.y;
                                handleSectionLayout('responsabilidad', y);
                            }}
                        >
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Responsabilidad del usuario
                            </Text>
                            <Text
                                className="text-[13px] mb-3 leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                El usuario es el único responsable del uso que haga de la información,
                                rutinas, recomendaciones o funciones disponibles dentro de la aplicación.
                                Toda rutina debe ser interpretada como una guía orientativa que debe adaptarse
                                al estado físico, experiencia, edad, salud y necesidades específicas de cada persona.
                                {'\n\n'}
                                La aplicación no sustituye el criterio de un médico, kinesiólogo, profesor de
                                educación física, entrenador personal ni otro profesional de la salud o del
                                entrenamiento. En caso de lesiones, dolores, limitaciones físicas, enfermedades
                                preexistentes o cualquier duda razonable sobre la práctica de ejercicio, el usuario
                                deberá consultar previamente con un profesional competente antes de seguir un plan
                                de entrenamiento.
                                {'\n\n'}
                                También es responsabilidad del usuario evaluar el entorno en el que entrena,
                                el equipamiento utilizado, la intensidad de las cargas, el nivel técnico de los
                                ejercicios y la necesidad de descanso o recuperación. El usuario debe actuar con
                                prudencia y criterio propio al aplicar cualquier contenido visto en la aplicación.
                                {'\n\n'}
                                El registro de datos, rutinas, mensajes o cualquier información ingresada en la
                                cuenta también es responsabilidad del usuario, quien deberá procurar que dicha
                                información sea veraz, adecuada y coherente con el uso previsto de la plataforma.
                            </Text>
                        </View>

                        {/* LIMITACIÓN DE RESPONSABILIDAD */}
                        <View
                            onLayout={(e) => {
                                const y = e.nativeEvent.layout.y;
                                handleSectionLayout('limitacion', y);
                            }}
                        >
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Limitación de responsabilidad
                            </Text>
                            <Text
                                className="text-[13px] mb-3 leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                MGP Rutina Fitness se ofrece como una herramienta de apoyo y organización.
                                No garantiza resultados físicos, deportivos, médicos ni estéticos concretos
                                derivados del uso de la aplicación. Cada usuario responde de forma distinta al
                                entrenamiento, por lo que los resultados dependerán de múltiples factores ajenos
                                a la plataforma.
                                {'\n\n'}
                                El titular o desarrollador de la aplicación no será responsable por lesiones,
                                daños, accidentes, pérdidas, interrupciones de servicio o perjuicios derivados
                                del uso de rutinas, ejercicios, sugerencias, puntos cercanos o cualquier otra
                                funcionalidad, especialmente cuando el usuario actúe sin la debida supervisión,
                                precaución o evaluación profesional.
                                {'\n\n'}
                                La información de mapas, ubicaciones y puntos de entrenamiento es orientativa
                                y puede variar según la disponibilidad de servicios externos, registros manuales,
                                datos de terceros o cambios en el entorno real. La aplicación no garantiza que
                                todos los puntos mostrados estén activos, disponibles, seguros o en las condiciones
                                esperadas al momento de su consulta.
                                {'\n\n'}
                                Asimismo, la aplicación no garantiza disponibilidad ininterrumpida, ausencia total
                                de errores, tiempos de respuesta constantes ni compatibilidad absoluta con todos los
                                dispositivos, navegadores o versiones del sistema operativo.
                            </Text>
                        </View>

                        {/* CUENTA Y DATOS */}
                        <View
                            onLayout={(e) => {
                                const y = e.nativeEvent.layout.y;
                                handleSectionLayout('cuenta', y);
                            }}
                        >
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Cuenta y datos
                            </Text>
                            <Text
                                className="text-[13px] mb-3 leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                Para acceder a ciertas funciones, el usuario puede necesitar crear una cuenta
                                o iniciar sesión. El usuario es responsable de mantener la confidencialidad de
                                sus credenciales y del uso que se realice desde su cuenta. Cualquier actividad
                                registrada desde dicha cuenta se presumirá realizada por el titular, salvo prueba
                                en contrario.
                                {'\n\n'}
                                La aplicación puede almacenar información básica necesaria para su funcionamiento,
                                incluyendo datos de autenticación, rutinas creadas, actividad reciente, mensajes
                                enviados a través de formularios de contacto y otros datos funcionales vinculados
                                al uso normal del servicio.
                                {'\n\n'}
                                Cuando el usuario envía un mensaje desde la sección de contacto, la aplicación
                                puede registrar datos como nombre, correo electrónico, tipo de consulta, asunto,
                                contenido del mensaje, plataforma utilizada y, en caso de estar autenticado, la
                                vinculación interna con su cuenta. Estos datos se almacenan con el propósito de
                                responder consultas, mejorar el servicio y mantener un registro técnico básico.
                                {'\n\n'}
                                El usuario entiende y acepta que estos datos pueden ser tratados con fines
                                operativos, de soporte, seguridad, depuración técnica y mejora continua del proyecto,
                                siempre dentro del marco de funcionamiento razonable de la aplicación.
                            </Text>
                        </View>

                        {/* FUNCIONES EN DESARROLLO */}
                        <View
                            onLayout={(e) => {
                                const y = e.nativeEvent.layout.y;
                                handleSectionLayout('desarrollo', y);
                            }}
                        >
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Funciones en desarrollo
                            </Text>
                            <Text
                                className="text-[13px] mb-3 leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                MGP Rutina Fitness es un proyecto en evolución. Algunas secciones, botones,
                                herramientas o integraciones pueden encontrarse en desarrollo, en prueba o
                                disponibles solo parcialmente. Esto puede implicar cambios visuales, ajustes de
                                navegación, variaciones en la experiencia del usuario o funciones temporalmente
                                inactivas.
                                {'\n\n'}
                                El usuario acepta que ciertas características pueden ser añadidas, modificadas
                                o eliminadas sin previo aviso cuando ello resulte necesario para mejorar la
                                estabilidad, seguridad o utilidad general del sistema.
                                {'\n\n'}
                                Del mismo modo, algunas funciones visibles en la interfaz pueden tener un
                                comportamiento progresivo o preparatorio, pensado para futuras versiones de la app.
                                La presencia de una sección en el menú no garantiza necesariamente que todas sus
                                funciones internas estén completamente habilitadas en el momento actual.
                            </Text>
                        </View>

                        {/* CONTACTO */}
                        <View
                            onLayout={(e) => {
                                const y = e.nativeEvent.layout.y;
                                handleSectionLayout('contacto', y);
                            }}
                        >
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Contacto
                            </Text>
                            <Text
                                className="text-[13px] mb-3 leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                Si el usuario tiene dudas sobre estos términos, encuentra errores dentro de la
                                aplicación o desea enviar una consulta, sugerencia o reporte técnico, puede utilizar
                                la sección de contacto incorporada en la plataforma.
                                {'\n\n'}
                                El envío de un mensaje no implica una obligación de respuesta inmediata, pero sí
                                permite generar un registro técnico y administrativo de la consulta. MGP Rutina
                                Fitness podrá utilizar dichos mensajes para tareas de soporte, seguimiento de
                                problemas y mejora del servicio.
                                {'\n\n'}
                                El uso continuado de la aplicación implica la aceptación plena de estos términos y
                                condiciones, en la versión vigente al momento del uso.
                            </Text>
                        </View>
                    </ScrollView>
                </View>

                {/* BOTÓN INFERIOR */}
                <View className="mt-2 px-2">
                    <Pressable
                        onPress={handleBack}
                        className="px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#111111', borderColor: '#2B2B2B', borderWidth: 1 }}
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