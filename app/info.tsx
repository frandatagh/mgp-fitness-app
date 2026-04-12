// app/info.tsx
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

type SectionKey = 'mgp' | 'primerospasos' | 'rutinas' | 'sugerencias' | 'puntos' | 'consejos';

export default function InfoScreen() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    const scrollViewRef = useRef<ScrollView | null>(null);
    const [sectionPositions, setSectionPositions] = useState<Record<SectionKey, number>>({
        mgp: 0,
        primerospasos: 0,
        rutinas: 0,
        sugerencias: 0,
        puntos: 0,
        consejos: 0,
    });

    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

    const handleScrollTo = (section: SectionKey) => {
        const y = sectionPositions[section] ?? 0;
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y, animated: true });
        }
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
                        source={require('../assets/img/iconmgp.png')}
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
                        className='px-2'
                    >
                        {/* TÍTULO */}
                        <View className="mb-2 px-1">
                            <Text
                                className="text-[20px] font-semibold py-2"
                                style={{ color: COLORS.textLight }}
                            >
                                Información de la aplicación
                            </Text>
                            <Text
                                className="text-[13px] mt-1"
                                style={{ color: COLORS.textMuted }}
                            >
                                Conoce cómo funciona MGP Rutina Fitness y cómo aprovechar cada sección.
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
                                    onPress={() => handleScrollTo('mgp')}
                                    className="mr-2 mb-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: '#222222' }}
                                >
                                    <Text
                                        className="text-[14px]"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        ¿Qué es MGP Rutina Fitness?
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => handleScrollTo('primerospasos')}
                                    className="mr-2 mb-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: '#222222' }}
                                >
                                    <Text
                                        className="text-[14px]"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Primeros pasos
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => handleScrollTo('rutinas')}
                                    className="mr-2 mb-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: '#222222' }}
                                >
                                    <Text
                                        className="text-[14px]"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Sección “Mis rutinas”
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => handleScrollTo('sugerencias')}
                                    className="mr-2 mb-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: '#222222' }}
                                >
                                    <Text
                                        className="text-[14px]"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Sección “Sugerencias”
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => handleScrollTo('puntos')}
                                    className="mr-2 mb-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: '#222222' }}
                                >
                                    <Text
                                        className="text-[14px]"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Sección “Puntos cercanos”
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => handleScrollTo('consejos')}
                                    className="mr-2 mb-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: '#222222' }}
                                >
                                    <Text
                                        className="text-[14px]"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Consejos de uso responsable
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* SECCIÓN 1: ¿Qué es MGP Rutina Fitness? */}
                        <View
                            onLayout={(e) => {
                                const y = e.nativeEvent.layout.y;
                                handleSectionLayout('mgp', y);
                            }}
                        >
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                ¿Qué es MGP Rutina Fitness?
                            </Text>
                            <Text
                                className="text-[13px] mb-3 leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                MGP Rutina Fitness es una aplicación pensada para acompañarte en tu entrenamiento diario de forma simple, clara y ordenada. El objetivo principal es ayudarte a organizar tus rutinas de ejercicio, registrar qué hacés cada día y tener siempre a mano un plan que puedas seguir sin perder tiempo. No pretende reemplazar a un profesional de la salud o un entrenador personal, sino ser tu herramienta práctica para llevar al día tu entrenamiento y mantenerte motivado.
                                {'\n\n'}
                                Dentro de la app vas a encontrar distintas secciones que trabajan juntas: un panel principal con tus rutinas, un espacio de sugerencias para descubrir nuevas ideas de entrenamiento, un mapa con puntos de ejercicio cercanos y, más adelante, un perfil con estadísticas y una sección inteligente para crear rutinas personalizadas. Todo esto se construye con un diseño sencillo, pensado para que puedas usar la app incluso si no tenés mucha experiencia con aplicaciones de entrenamiento.
                                {'\n\n'}
                                La filosofía de MGP Rutina Fitness es que cada persona pueda avanzar a su ritmo. Por eso, podés crear rutinas muy simples o rutinas más completas, con varios días, series, repeticiones y notas detalladas. La app no te obliga a seguir un plan rígido, sino que te ofrece un espacio flexible para que tu forma de entrenar se vea reflejada en tu propio lenguaje.
                            </Text>
                        </View>

                        {/* SECCIÓN 2: Primeros pasos en la aplicación */}
                        <View
                            onLayout={(e) => {
                                const y = e.nativeEvent.layout.y;
                                handleSectionLayout('primerospasos', y);
                            }}
                        >
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Primeros pasos en la aplicación
                            </Text>
                            <Text
                                className="text-[13px] mb-3 leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                Al ingresar a la aplicación por primera vez, vas a ver la pantalla de inicio de sesión o registro. Una vez que crees tu cuenta y accedas, llegarás al home, donde se muestran tus rutinas principales. Si tu cuenta es nueva y todavía no creaste ninguna, la app te mostrará un mensaje explicando qué significa cada botón y cómo empezar. Esta primera ayuda está pensada para que puedas orientarte sin necesidad de leer un manual largo antes.
                                {'\n\n'}
                                El camino más sencillo para comenzar es usar el botón “Crear rutina”. Desde allí vas a poder poner un título a tu entrenamiento (por ejemplo, “Full body principiantes” o “Piernas y glúteos”), añadir una descripción breve y registrar cada ejercicio con sus series, repeticiones y notas. La app también permite organizar los ejercicios por día, para que puedas tener una rutina de varios días dentro de un mismo plan general.
                                {'\n\n'}
                                Una vez que guardes tu primera rutina, la vas a ver listada en el home. Cada tarjeta te mostrará el título, una breve descripción, algunos ejercicios de ejemplo y el total de ejercicios que contiene. Desde esa tarjeta vas a poder entrar a ver el detalle completo, editar la rutina o eliminarla cuando ya no la necesites.
                            </Text>
                        </View>

                        {/* SECCIÓN 3: Sección “Mis rutinas” */}
                        <View
                            onLayout={(e) => {
                                const y = e.nativeEvent.layout.y;
                                handleSectionLayout('rutinas', y);
                            }}
                        >
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Sección “Mis rutinas”
                            </Text>
                            <Text
                                className="text-[13px] mb-3 leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                La sección “Mis rutinas” es el corazón de la aplicación. Aquí se muestran todas las rutinas que pertenecen a tu cuenta. Podés tener una sola rutina activa o varias, por ejemplo una para gimnasio, otra para entrenar en casa y otra para salir a correr. La app te permite ver de un vistazo cuál fue tu actividad más reciente, destacando la rutina que editaste o realizaste por última vez.
                                {'\n\n'}
                                Dentro de cada rutina vas a encontrar una tabla organizada por días (si los configuraste) y por ejercicios. Cada fila muestra el nombre del ejercicio, la cantidad de series, repeticiones y un campo de notas para comentar detalles importantes, como el peso utilizado, sensación de esfuerzo o recordatorios específicos. Esta estructura imita una planilla de entrenamiento clásica, pero en formato digital y portátil.
                                {'\n\n'}
                                Además, cuando completes una sesión, podés marcar la rutina como “Realizada por hoy”. Esto no sólo funciona como un gesto motivacional, sino que más adelante puede servir como base para estadísticas simples de seguimiento. La idea es que puedas sentir que cerraste el entrenamiento del día y que tu esfuerzo queda registrado.
                            </Text>
                        </View>
                        {/* SECCIÓN 4: Sección “Sugerencias” */}
                        <View
                            onLayout={(e) => {
                                const y = e.nativeEvent.layout.y;
                                handleSectionLayout('sugerencias', y);
                            }}
                        >
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Sección “Sugerencias”
                            </Text>
                            <Text
                                className="text-[13px] mb-3 leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                La sección “Sugerencias” está pensada para esos momentos en los que no sabés por dónde empezar o querés probar algo nuevo. Aquí la app te muestra rutinas recomendadas, diseñadas previamente y guardadas en un usuario especial de sugerencias. No son planes personalizados, pero sí ejemplos organizados que te pueden inspirar o servir como base.
                                {'\n\n'}
                                Al entrar a una rutina sugerida, vas a poder ver todos los ejercicios, días, series y repeticiones igual que en tus propias rutinas. La diferencia es que estas rutinas no se pueden editar directamente, porque funcionan como modelos. Sin embargo, vas a encontrar un botón para copiar la rutina a tu cuenta. Cuando confirmás que querés guardarla, la app crea una nueva rutina en tu perfil, con el mismo contenido, y a partir de ese momento podés editarla, cambiar el título o ajustar los ejercicios según tus necesidades.
                                {'\n\n'}
                                De esta forma, las sugerencias funcionan como una biblioteca de ideas: no estás obligado a usarlas tal cual vienen, pero podés aprovecharlas para ahorrar tiempo y descubrir otros estilos de entrenamiento.
                            </Text>
                        </View>
                        {/* SECCIÓN 5: Sección “Puntos cercanos” */}
                        <View
                            onLayout={(e) => {
                                const y = e.nativeEvent.layout.y;
                                handleSectionLayout('puntos', y);
                            }}
                        >
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Sección “Puntos cercanos”
                            </Text>
                            <Text
                                className="text-[13px] mb-3 leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                La sección “Puntos cercanos” te permite ver en un mapa los lugares de entrenamiento disponibles alrededor tuyo. La idea es que puedas descubrir plazas con aparatos, canchas, gimnasios y otros espacios deportivos sin tener que salir a buscarlos a ciegas. La app utiliza tu ubicación (con tu permiso) para centrar el mapa en tu zona y mostrarte marcadores con distintos tipos de puntos.
                                {'\n\n'}
                                Podés filtrar entre puntos de entrenamiento al aire libre, gimnasios u otras actividades deportivas, según lo que te interese ese día. La interfaz del mapa está pensada para ser simple: tocás un marcador y se abre un pequeño panel con información básica del lugar. En versiones futuras, esta sección puede integrarse con modos especiales de “correr hacia el punto” o registrar recorridos en tiempo real.
                                {'\n\n'}
                                Es importante recordar que la información del mapa es orientativa. Siempre se recomienda chequear horarios, condiciones y seguridad del lugar, especialmente si vas a entrenar de noche o en zonas poco conocidas.</Text>
                        </View>
                        {/* SECCIÓN 6: Consejos de uso responsable */}
                        <View
                            onLayout={(e) => {
                                const y = e.nativeEvent.layout.y;
                                handleSectionLayout('consejos', y);
                            }}
                        >
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Consejos de uso responsable
                            </Text>
                            <Text
                                className="text-[13px] mb-3 leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                Aunque MGP Rutina Fitness te ayuda a organizar tu entrenamiento, es fundamental que escuches a tu cuerpo y respetes tus límites. La aplicación no evalúa tu estado de salud ni tu condición física actual. Por eso, si tenés enfermedades preexistentes, dolores fuertes o dudas sobre la seguridad de un ejercicio, lo ideal es que consultes con un profesional de la salud o un entrenador calificado antes de seguir una rutina exigente.
                                {'\n\n'}
                                Usá la app como una aliada para organizarte y recordar lo que hacés, no como una obligación rígida que tengas que cumplir a toda costa. Ajustá las rutinas según tu progreso, descansá cuando sea necesario y utilizá el espacio de notas para registrar cómo te sentís. De esta forma, MGP Rutina Fitness puede convertirse en un registro valioso de tu camino de entrenamiento, ayudándote a mantener la constancia sin perder de vista tu bienestar.</Text>
                        </View>

                    </ScrollView>
                </View>

                {/* BOTONES INFERIORES */}
                <View className="mt-2 flex-row justify-between px-2">
                    {/* Volver al home */}
                    <Pressable
                        onPress={() => router.replace('/home')}
                        className="flex-1 mr-2 px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}
                        >
                            Volver al home
                        </Text>
                    </Pressable>

                    {/* Contactanos (futura pantalla) */}
                    <Pressable
                        onPress={() => router.push('/contact')}
                        className="flex-1 px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-semibold"
                            style={{ color: COLORS.textLight }}
                        >
                            Contactanos
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}
