import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RoutineCard } from '../components/RoutineCard';
import { router } from 'expo-router';

const MOCK_ROUTINES = [
    {
        id: '1',
        title: 'Rutina de prueba',
        description:
            'Rutina de prueba. Ejercicios de calentamiento 15 minutos. Tres veces a la semana. Volver a evaluar en tres meses.',
        highlighted: true,
        tag: 'Visto recientemente',
    },
    {
        id: '2',
        title: 'Calentamiento para correr',
        description:
            'Rutina de ejercicios para correr. Rodillas arriba 2x2. Trote lateral 3x2. Fondos por loma x4. Descansos intermedios. Estiramientos varios.',
        highlighted: false,
    },
];

export default function HomeScreen() {
    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View className="flex-1 px-4 pt-6 pb-4">
                {/* LOGO SUPERIOR */}
                <View className="items-center mb-4">
                    <Text
                        className="text-3xl font-extrabold tracking-tight"
                        style={{ color: COLORS.accent }}
                    >
                        MGP{' '}
                        <Text style={{ color: COLORS.primary }}>
                            RUTINA
                        </Text>{' '}
                        FITNESS
                    </Text>
                </View>

                {/* TABS SUPERIORES */}
                <View className="flex-row justify-around mb-2">
                    <View className="items-center">
                        <Text style={{ color: COLORS.accent }}>Mis rutinas</Text>
                        <View
                            className="mt-1 h-1 w-14 rounded-full"
                            style={{ backgroundColor: COLORS.primary }}
                        />
                    </View>
                    <View className="items-center">
                        <Text style={{ color: COLORS.textMuted }}>Recomendadas</Text>
                    </View>
                    <View className="items-center">
                        <Text style={{ color: COLORS.textMuted }}>Personalizar IA</Text>
                    </View>
                    <View className="items-center">
                        <Text style={{ color: COLORS.textMuted }}>Ajustes</Text>
                    </View>
                </View>

                {/* MARCO PRINCIPAL (similar al recuadro verde de tu diseño) */}
                <View
                    className="flex-1 mt-2 rounded-3xl px-3 py-4"
                    style={{ borderWidth: 2, borderColor: COLORS.primary }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {MOCK_ROUTINES.map((routine) => (
                            <RoutineCard
                                key={routine.id}
                                title={routine.title}
                                description={routine.description}
                                highlighted={routine.highlighted}
                                tag={routine.tag}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* BOTONES INFERIORES */}
                <View className="flex-row justify-between mt-4">
                    <Pressable
                        className="flex-1 mr-2 px-4 py-3 rounded-xl items-center"
                        style={{ backgroundColor: '#444444' }}
                        onPress={() => router.push('/routine/new')}
                    >
                        <Text style={{ color: COLORS.textLight }}>+ Crear rutina</Text>
                    </Pressable>

                    <Pressable
                        className="flex-1 mx-1 px-4 py-3 rounded-xl items-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text style={{ color: COLORS.textLight }}>Subir archivo</Text>
                    </Pressable>

                    <Pressable
                        className="flex-1 ml-2 px-4 py-3 rounded-xl items-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text style={{ color: COLORS.textLight }}>Puntos cercanos</Text>
                    </Pressable>
                </View>

                {/* FOOTER */}
                <View className="items-center mt-4">
                    <Text
                        className="font-bold"
                        style={{ color: COLORS.accent }}
                    >
                        MGP{' '}
                        <Text style={{ color: COLORS.primary }}>
                            RUTINA FITNESS
                        </Text>
                    </Text>
                    <Text style={{ color: COLORS.textLight }}>
                        ¡Tu entrenamiento al instante!
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}
