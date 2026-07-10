import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';

import AppHeader from '../../components/AppHeader';
import { COLORS } from '../../constants/colors';
import { parseRoutineText } from '../../utils/parseRoutineText';

const sampleText = `Rutina Gimnasio x3

Press banca 4x10 40kg
Press inclinado 3 x 12 30 kg
Aperturas con mancuernas 3 12 10 kg Sin balanceo
Sentadilla 4 series 10 reps 50 kg
Remo en polea | 3 | 12 | 40 kg | Pausa al final
Abdominales 3x20`;

export default function TestParserScreen() {
    const router = useRouter();

    const [rawText, setRawText] = useState(sampleText);
    const [parsedResult, setParsedResult] = useState(() =>
        parseRoutineText(sampleText)
    );

    const handleParse = () => {
        const result = parseRoutineText(rawText);
        setParsedResult(result);

        if (result.exercises.length === 0) {
            Alert.alert(
                'Sin ejercicios detectados',
                'El parser no encontró ejercicios en el texto.'
            );
        }
    };

    const handleGoToReview = () => {
        const result = parseRoutineText(rawText);

        if (result.exercises.length === 0) {
            Alert.alert(
                'Sin ejercicios',
                'Primero necesitás detectar al menos un ejercicio.'
            );
            return;
        }

        router.push({
            pathname: '/routine/review-import',
            params: {
                title: result.title,
                parsedExercises: JSON.stringify(result.exercises),
                source: 'parser-test',
            },
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
            <AppHeader showProfile={false} />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={{
                        padding: 16,
                        paddingBottom: 40,
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text
                        style={{
                            color: COLORS.primary,
                            fontSize: 22,
                            fontWeight: '900',
                            marginBottom: 8,
                        }}
                    >
                        Prueba de parser
                    </Text>

                    <Text
                        style={{
                            color: COLORS.textMuted,
                            fontSize: 14,
                            lineHeight: 20,
                            marginBottom: 16,
                        }}
                    >
                        Pegá un texto de rutina, tocá “Detectar ejercicios” y
                        revisá si la app interpreta bien nombre, series,
                        repeticiones y peso.
                    </Text>

                    <Text
                        style={{
                            color: '#FFFFFF',
                            fontWeight: '800',
                            marginBottom: 8,
                        }}
                    >
                        Texto de prueba
                    </Text>

                    <TextInput
                        value={rawText}
                        onChangeText={setRawText}
                        multiline
                        textAlignVertical="top"
                        placeholder="Pegá acá una rutina..."
                        placeholderTextColor="#777"
                        style={{
                            minHeight: 220,
                            backgroundColor: '#181818',
                            borderWidth: 1,
                            borderColor: '#333',
                            borderRadius: 14,
                            padding: 14,
                            color: '#FFFFFF',
                            fontSize: 14,
                            lineHeight: 20,
                            marginBottom: 14,
                        }}
                    />

                    <Pressable
                        onPress={handleParse}
                        style={{
                            backgroundColor: COLORS.primary,
                            paddingVertical: 14,
                            borderRadius: 14,
                            alignItems: 'center',
                            marginBottom: 10,
                        }}
                    >
                        <Text
                            style={{
                                color: '#000000',
                                fontWeight: '900',
                                fontSize: 15,
                            }}
                        >
                            Detectar ejercicios
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleGoToReview}
                        style={{
                            backgroundColor: '#222222',
                            paddingVertical: 14,
                            borderRadius: 14,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: '#444444',
                            marginBottom: 20,
                        }}
                    >
                        <Text
                            style={{
                                color: '#FFFFFF',
                                fontWeight: '900',
                                fontSize: 15,
                            }}
                        >
                            Probar en pantalla de revisión
                        </Text>
                    </Pressable>

                    <View
                        style={{
                            backgroundColor: '#181818',
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: '#333333',
                            padding: 14,
                        }}
                    >
                        <Text
                            style={{
                                color: '#FFFFFF',
                                fontSize: 18,
                                fontWeight: '900',
                                marginBottom: 6,
                            }}
                        >
                            Resultado
                        </Text>

                        <Text
                            style={{
                                color: COLORS.textMuted,
                                marginBottom: 12,
                            }}
                        >
                            Título detectado: {parsedResult.title}
                        </Text>

                        <Text
                            style={{
                                color: COLORS.primary,
                                fontWeight: '900',
                                marginBottom: 12,
                            }}
                        >
                            Ejercicios detectados:{' '}
                            {parsedResult.exercises.length}
                        </Text>

                        {parsedResult.exercises.map((exercise, index) => (
                            <View
                                key={`${exercise.name}-${index}`}
                                style={{
                                    backgroundColor: '#101010',
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: '#292929',
                                    padding: 12,
                                    marginBottom: 10,
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#FFFFFF',
                                        fontWeight: '900',
                                        fontSize: 15,
                                        marginBottom: 6,
                                    }}
                                >
                                    {index + 1}. {exercise.name}
                                </Text>

                                <Text style={{ color: COLORS.textMuted }}>
                                    Series: {exercise.sets || '-'} · Reps:{' '}
                                    {exercise.reps || '-'} · Peso:{' '}
                                    {exercise.weight || '-'}
                                </Text>

                                {exercise.notes ? (
                                    <Text
                                        style={{
                                            color: COLORS.textMuted,
                                            marginTop: 4,
                                        }}
                                    >
                                        Nota: {exercise.notes}
                                    </Text>
                                ) : null}
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}