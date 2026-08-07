export type ParsedRoutineExercise = {
    name: string;
    sets: string;
    reps: string;
    weight: string;
    notes: string;
};

export type ParsedRoutineResult = {
    title: string;
    description: string;
    exercises: ParsedRoutineExercise[];
    rawText: string;
    importMode: 'simple' | 'complex';
    warning?: string;
};

const knownExerciseNames = [
    'aperturas con mancuernas',
    'press inclinado',
    'press banca',
    'jalón al pecho',
    'jalon al pecho',
    'remo en polea',
    'sentadilla',
    'prensa',
    'curl bíceps',
    'curl biceps',
    'tríceps en polea',
    'triceps en polea',
    'abdominales',
];

const complexExerciseNamePatterns = [
    'rot ext hombro',
    'gato cont enojado',
    'gato conten enojado',
    'bicho muerto',
    'manc alternado',
    'espinales alternados',
    'press pallof',
    'banco plano barra',
    'banco piano barra',
    'dom abierta',
    'dom cerrada',
    'serrucho',
    'fuerza de brazo carga',
    'remo hammer',
    'ab cn pausa',
    'vuelos posteriores',
    'curl de biceps mancuerna',
    'curl de bíceps mancuerna',
    'vuelos laterales',
    'fondos romano',
    '90/90 acostarse',
    '90/90 + acostarse',
    'flexoexten tobillo ktb',
    'flexoexten tobillo',
    'flexoexten cadera',
    'molino cuadripedia',
    'buen dia disco',
    'buen día disco',
    'plancha copenhague',
    'hiptrhust barra',
    'hip thrust barra',
    'peso muerto asimetrico manc',
    'peso muerto asimétrico manc',
    'sent sumo landmine',
    'camilla de isquios',
    'bulgaras inclinado',
    'búlgaras inclinado',
    'curl de isquios fitball',
    'elevaciones romano',
    'twist ktb',
    'turco disco',
    'press militar manc arrod',
    'press inclinado mancuerna',
    'press inclinado mancuerma',
    'jalon al pecho estocada',
    'jalón al pecho estocada',
    'vuelos frontales disco',
    'triceps polea',
    'tríceps polea',
    'triceps polea 1 b',
    'vuelos laterales mancuerna',
    'martillo polea',
    'flexoexten rodilla',
    'sentadilla barra libre',
    'pistols',
    'estocada fija',
    'bulgaras',
    'búlgaras',
    'gemelos maquina',
    'gemelos máquina',
    'hack sumo',
    'v-ups acordeon',
    'v-ups acordeón',
];

const knownExerciseWords = [
    'press',
    'banca',
    'inclinado',
    'aperturas',
    'mancuernas',
    'jalón',
    'jalon',
    'pecho',
    'remo',
    'polea',
    'sentadilla',
    'prensa',
    'curl',
    'bíceps',
    'biceps',
    'tríceps',
    'triceps',
    'abdominales',
];

const nonExerciseWords = [
    'objetivo',
    'rutina',
    'gimnasio',
    'descanso',
    'frecuencia',
    'notas generales',
    'general',
    'hipertrofia',
    'ejercicio',
    'series',
    'reps',
    'peso',
    'notas',
];

function cleanLine(line: string) {
    return line
        .replace(/\t/g, ' ')
        .replace(/[•●]/g, '')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeTextForOcr(rawText: string) {
    return rawText
        .replace(/\r/g, '\n')
        .replace(/[|¦]/g, '|')
        .replace(/kq/gi, 'kg')
        .replace(/kgs/gi, 'kg')
        .replace(/I\s*g/gi, '1 kg')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function removeLeadingNumber(line: string) {
    return line
        .replace(/^\s*\|?\s*\d{1,2}\s*[\.\-\)]\s*/, '')
        .trim();
}

function removeLeadingNoise(line: string) {
    return line
        .replace(/^[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/, '')
        .replace(/^\s*[a-z]\s+(?=rutina|entrenamiento|gimnasio)/i, '')
        .trim();
}

function looksLikeHeader(line: string) {
    const lower = line.toLowerCase();

    const hasExercisePattern =
        /\d+\s*x\s*\d+/i.test(lower) ||
        /\d+\s+series/i.test(lower) ||
        /\d+\s+\d+\s+\d+\s*kg/i.test(lower) ||
        containsKnownExerciseWord(lower);

    if (hasExercisePattern) return false;

    return nonExerciseWords.some((word) => lower.includes(word));
}

function cleanTitle(title: string) {
    let cleaned = removeLeadingNoise(title);

    const lower = cleaned.toLowerCase();
    const rutinaIndex = lower.indexOf('rutina');
    const entrenamientoIndex = lower.indexOf('entrenamiento');
    const gimnasioIndex = lower.indexOf('gimnasio');

    const indexes = [rutinaIndex, entrenamientoIndex, gimnasioIndex]
        .filter((index) => index >= 0)
        .sort((a, b) => a - b);

    if (indexes.length > 0) {
        cleaned = cleaned.slice(indexes[0]).trim();
    }

    cleaned = cleaned
        .replace(/\s+/g, ' ')
        .replace(/\s+\|+$/g, '')
        .trim();

    return cleaned || 'Rutina importada';
}

function extractTitle(lines: string[]) {
    const possibleTitle = lines.find((line) => {
        const lower = line.toLowerCase();

        return (
            lower.includes('rutina') ||
            lower.includes('entrenamiento') ||
            lower.includes('gimnasio')
        );
    });

    return possibleTitle ? cleanTitle(possibleTitle) : 'Rutina importada';
}

function normalizeWeight(value: string | undefined) {
    if (!value) return '';

    return value
        .replace(/kg/gi, '')
        .replace(',', '.')
        .replace(/[^\d.]/g, '')
        .trim();
}

function containsKnownExerciseWord(line: string) {
    const lower = line.toLowerCase();

    return knownExerciseWords.some((word) => lower.includes(word));
}

function isProbablyNotExercise(line: string) {
    const lower = line.toLowerCase();

    if (!line.trim()) return true;

    if (
        lower.includes('descanso entre series') ||
        lower.includes('frecuencia') ||
        lower.includes('notas generales') ||
        lower.includes('objetivo')
    ) {
        return true;
    }

    return false;
}

function prettifyExerciseName(name: string) {
    let cleaned = name
        .replace(/\|/g, ' ')
        .replace(/^\s*\d{1,2}\s*[\.\-\)]\s*/, '')
        .replace(/\b(af|fa|aa|er|erer|eec|en|cn|ct|ele|err|oe|om)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const lower = cleaned.toLowerCase();

    const canonical = knownExerciseNames.find((exerciseName) =>
        lower.includes(exerciseName.toLowerCase())
    );

    if (canonical) {
        return canonical
            .replace('jalon', 'jalón')
            .replace('biceps', 'bíceps')
            .replace('triceps', 'tríceps');
    }

    return cleaned;
}

function prettifyNote(note: string) {
    return note
        .replace(/Espaldarecta/gi, 'Espalda recta')
        .replace(/Pausaal/gi, 'Pausa al')
        .replace(/Bajarcontrolado/gi, 'Bajar controlado')
        .replace(/Nobloquear/gi, 'No bloquear')
        .replace(/Codosfijos/gi, 'Codos fijos')
        .replace(/Extension/gi, 'Extensión')
        .replace(/completa/gi, 'completa')
        .replace(/\s+/g, ' ')
        .replace(/^\|+/, '')
        .trim();
}

function splitRawTextIntoCandidateLines(rawText: string) {
    const normalized = normalizeTextForOcr(rawText);

    /**
     * A veces el OCR devuelve varios ejercicios en una sola línea.
     * Insertamos saltos antes de patrones tipo:
     * 1. Press banca
     * | 5. Remo en polea
     */
    const withExerciseBreaks = normalized
        .replace(/\s+\|\s*(?=\d{1,2}\s*[\.\)]\s*)/g, '\n')
        .replace(/\s+(?=\d{1,2}\s*[\.\)]\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g, '\n');

    return withExerciseBreaks
        .split(/\n/)
        .map(cleanLine)
        .filter(Boolean);
}

function extractNumbers(line: string): string[] {
    const matches = line.match(/\b\d{1,3}(?:[.,]\d+)?\b/g);

    return matches ? matches : [];
}

function parsePipeOrTableLine(line: string): ParsedRoutineExercise | null {
    const parts = line
        .split('|')
        .map((part) => cleanLine(part))
        .filter(Boolean);

    if (parts.length < 3) return null;

    const name = prettifyExerciseName(removeLeadingNumber(parts[0]));
    const sets = parts[1] ?? '';
    const reps = parts[2] ?? '';
    const weight = normalizeWeight(parts[3] ?? '');
    const notes = prettifyNote(parts.slice(4).join(' · '));

    if (!name || !sets || !reps) return null;
    if (isProbablyNotExercise(name)) return null;

    return {
        name,
        sets,
        reps,
        weight,
        notes,
    };
}

function parseCompactLine(line: string): ParsedRoutineExercise | null {
    const clean = removeLeadingNumber(line);

    const compactRegex =
        /^(?<name>.+?)\s*[-–—]?\s*(?<sets>\d{1,2})\s*x\s*(?<reps>\d{1,3})(?:\s*[-–—]?\s*(?<weight>\d+(?:[.,]\d+)?)\s*kg?)?(?:\s*[-–—]?\s*(?<notes>.+))?$/i;

    const match = clean.match(compactRegex);

    if (!match?.groups) return null;

    const name = prettifyExerciseName(match.groups.name.trim());

    if (!name || isProbablyNotExercise(name)) return null;

    return {
        name,
        sets: match.groups.sets.trim(),
        reps: match.groups.reps.trim(),
        weight: normalizeWeight(match.groups.weight),
        notes: prettifyNote(match.groups.notes?.trim() ?? ''),
    };
}

function parseSeriesWordsLine(line: string): ParsedRoutineExercise | null {
    const clean = removeLeadingNumber(line);

    const seriesRegex =
        /^(?<name>.+?)\s+(?<sets>\d{1,2})\s*(?:series|serie)\s*(?:de)?\s*(?<reps>\d{1,3})\s*(?:reps|rep|repeticiones|repeticion)?(?:\s+(?<weight>\d+(?:[.,]\d+)?)\s*kg?)?(?:\s*[-–—]?\s*(?<notes>.+))?$/i;

    const match = clean.match(seriesRegex);

    if (!match?.groups) return null;

    const name = prettifyExerciseName(match.groups.name.trim());

    if (!name || isProbablyNotExercise(name)) return null;

    return {
        name,
        sets: match.groups.sets.trim(),
        reps: match.groups.reps.trim(),
        weight: normalizeWeight(match.groups.weight),
        notes: prettifyNote(match.groups.notes?.trim() ?? ''),
    };
}

function parseLooseTableLine(line: string): ParsedRoutineExercise | null {
    const clean = removeLeadingNumber(line);

    const looseRegex =
        /^(?<name>[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+?)\s+(?<sets>\d{1,2})\s+(?<reps>\d{1,3})(?:\s+(?<weight>\d+(?:[.,]\d+)?)\s*kg?)?(?:\s+(?<notes>.+))?$/i;

    const match = clean.match(looseRegex);

    if (!match?.groups) return null;

    const name = prettifyExerciseName(match.groups.name.trim());

    if (name.length < 3) return null;
    if (isProbablyNotExercise(name)) return null;

    return {
        name,
        sets: match.groups.sets.trim(),
        reps: match.groups.reps.trim(),
        weight: normalizeWeight(match.groups.weight),
        notes: prettifyNote(match.groups.notes?.trim() ?? ''),
    };
}

function parseKnownExerciseFromDamagedLine(line: string): ParsedRoutineExercise | null {
    const cleaned = cleanLine(removeLeadingNoise(line));

    if (isProbablyNotExercise(cleaned)) return null;
    if (!containsKnownExerciseWord(cleaned)) return null;

    const lower = cleaned.toLowerCase();

    const matchedKnownName = knownExerciseNames.find((exerciseName) =>
        lower.includes(exerciseName.toLowerCase())
    );

    let name = '';

    if (matchedKnownName) {
        name = prettifyExerciseName(matchedKnownName);
    } else {
        const weightIndex = cleaned.search(/\d+(?:[.,]\d+)?\s*kg/i);
        const beforeWeight =
            weightIndex >= 0 ? cleaned.slice(0, weightIndex) : cleaned;

        name = prettifyExerciseName(beforeWeight);
    }

    if (!name || name.length < 3) return null;

    const weightMatch = cleaned.match(/(?<weight>\d+(?:[.,]\d+)?)\s*kg/i);
    const weight = normalizeWeight(weightMatch?.groups?.weight);

    const allNumbers = extractNumbers(cleaned);

    /**
     * Quitamos número de orden y peso para intentar rescatar series/reps.
     */
    const leadingOrderMatch = cleaned.match(/^\s*\|?\s*(\d{1,2})\s*[\.\)]/);
    const leadingOrder = leadingOrderMatch?.[1];

    const weightNumber = weightMatch?.groups?.weight?.replace(',', '.');

    const candidateNumbers = allNumbers.filter((numberValue, index) => {
        const normalizedNumber = numberValue.replace(',', '.');

        if (index === 0 && leadingOrder && normalizedNumber === leadingOrder) {
            return false;
        }

        if (weightNumber && normalizedNumber === weightNumber) {
            return false;
        }

        return true;
    });

    const sets = candidateNumbers[0] ?? '';
    const reps = candidateNumbers[1] ?? '';

    let notes = '';

    const pipeParts = cleaned
        .split('|')
        .map((part) => cleanLine(part))
        .filter(Boolean);

    if (pipeParts.length > 1) {
        notes = pipeParts.slice(1).join(' · ');
    } else if (weightMatch && typeof weightMatch.index === 'number') {
        const afterWeight = cleaned.slice(weightMatch.index + weightMatch[0].length);
        notes = afterWeight;
    }

    notes = prettifyNote(notes);

    return {
        name,
        sets,
        reps,
        weight,
        notes,
    };
}

function parseDamagedOcrExerciseLine(line: string): ParsedRoutineExercise | null {
    const clean = cleanLine(removeLeadingNumber(line));

    if (!containsKnownExerciseWord(clean)) return null;

    const parts = clean
        .split('|')
        .map((part) => cleanLine(part))
        .filter(Boolean);

    const mainPart = parts[0] ?? clean;
    const notePart = parts.slice(1).join(' · ');

    const weightMatch = mainPart.match(/(?<weight>\d+(?:[.,]\d+)?)\s*kg/i);
    const weight = normalizeWeight(weightMatch?.groups?.weight);

    let namePart = mainPart;

    if (weightMatch && typeof weightMatch.index === 'number') {
        namePart = mainPart.slice(0, weightMatch.index).trim();
    }

    const numbers = extractNumbers(mainPart);
    const candidateNumbers = numbers.filter((numberValue) => {
        const normalizedNumber = numberValue.replace(',', '.');
        return normalizedNumber !== weight;
    });

    const sets = candidateNumbers[0] ?? '';
    const reps = candidateNumbers[1] ?? '';

    namePart = prettifyExerciseName(namePart);

    if (!namePart || namePart.length < 3) return null;
    if (isProbablyNotExercise(namePart)) return null;

    return {
        name: namePart,
        sets,
        reps,
        weight,
        notes: prettifyNote(notePart),
    };
}

function parseRoutineLine(line: string): ParsedRoutineExercise | null {
    const cleaned = cleanLine(line);

    if (!cleaned) return null;
    if (looksLikeHeader(cleaned)) return null;

    return (
        parsePipeOrTableLine(cleaned) ||
        parseCompactLine(cleaned) ||
        parseSeriesWordsLine(cleaned) ||
        parseLooseTableLine(cleaned) ||
        parseKnownExerciseFromDamagedLine(cleaned) ||
        parseDamagedOcrExerciseLine(cleaned)
    );
}

function scoreExercise(exercise: ParsedRoutineExercise) {
    let score = 0;

    if (exercise.name) score += 5;
    if (exercise.sets) score += 2;
    if (exercise.reps) score += 2;
    if (exercise.weight) score += 2;
    if (exercise.notes) score += 1;

    return score;
}

function normalizeNameKey(name: string) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function mergeDuplicateExercises(exercises: ParsedRoutineExercise[]) {
    const map = new Map<string, ParsedRoutineExercise>();

    for (const exercise of exercises) {
        const key = normalizeNameKey(exercise.name);

        if (!key) continue;

        const existing = map.get(key);

        if (!existing) {
            map.set(key, exercise);
            continue;
        }

        const merged: ParsedRoutineExercise = {
            name: existing.name || exercise.name,
            sets: existing.sets || exercise.sets,
            reps: existing.reps || exercise.reps,
            weight: existing.weight || exercise.weight,
            notes: existing.notes || exercise.notes,
        };

        const better =
            scoreExercise(exercise) > scoreExercise(existing)
                ? exercise
                : merged;

        map.set(key, better);
    }

    return Array.from(map.values());
}
function normalizeSectionTitle(line: string) {
    const lower = line
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    if (lower === 'ejercicio' || lower === 'ejercicios') return 'exercise';
    if (lower === 'series' || lower === 'serie') return 'sets';
    if (lower === 'reps' || lower === 'rep' || lower === 'repeticiones') return 'reps';
    if (lower === 'peso' || lower === 'pesos') return 'weight';
    if (lower === 'notas' || lower === 'nota') return 'notes';

    return null;
}

function isRoutineMetadataLine(line: string) {
    const lower = line.toLowerCase();

    return (
        lower.includes('objetivo:') ||
        lower.includes('descanso entre series') ||
        lower.includes('frecuencia:') ||
        lower.includes('notas generales:')
    );
}

function isSimpleNumber(line: string) {
    return /^\d{1,3}$/.test(line.trim());
}

function isWeightLine(line: string) {
    return /^\d{1,3}(?:[.,]\d+)?\s*kg$/i.test(line.trim());
}

function cleanColumnExerciseName(line: string) {
    return prettifyExerciseName(
        line
            .replace(/^\s*\d{1,2}\s*[\.\-\)]\s*/, '')
            .replace(/\s+/g, ' ')
            .trim()
    );
}

function isProbablyExerciseNameLine(line: string) {
    const cleaned = cleanLine(line);
    const withoutNumber = cleaned
        .replace(/^\s*\d{1,2}\s*[\.\-\)]\s*/, '')
        .trim();

    if (!withoutNumber) return false;
    if (withoutNumber.length < 3) return false;

    const sectionTitle = normalizeSectionTitle(withoutNumber);

    if (sectionTitle) return false;
    if (isRoutineMetadataLine(withoutNumber)) return false;
    if (isSimpleNumber(withoutNumber)) return false;
    if (isWeightLine(withoutNumber)) return false;

    const lower = withoutNumber.toLowerCase();

    const blockedWords = [
        'objetivo',
        'descanso',
        'frecuencia',
        'notas generales',
        'series',
        'reps',
        'peso',
        'notas',
    ];

    if (blockedWords.some((word) => lower.includes(word))) {
        return false;
    }

    return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/.test(withoutNumber);
}

function parseColumnBasedRoutine(lines: string[]): ParsedRoutineExercise[] {
    const sections: {
        exercise: string[];
        sets: string[];
        reps: string[];
        weight: string[];
        notes: string[];
    } = {
        exercise: [],
        sets: [],
        reps: [],
        weight: [],
        notes: [],
    };

    let currentSection: keyof typeof sections | null = null;

    for (const line of lines) {
        const cleaned = cleanLine(line);

        if (!cleaned) continue;

        const sectionTitle = normalizeSectionTitle(cleaned);

        if (sectionTitle) {
            currentSection = sectionTitle;
            continue;
        }

        if (isRoutineMetadataLine(cleaned)) {
            continue;
        }

        if (!currentSection) {
            continue;
        }

        if (currentSection === 'exercise') {
            if (isProbablyExerciseNameLine(cleaned)) {
                sections.exercise.push(cleanColumnExerciseName(cleaned));
            }

            continue;
        }

        if (currentSection === 'sets') {
            if (isSimpleNumber(cleaned)) {
                sections.sets.push(cleaned.trim());
            }

            continue;
        }

        if (currentSection === 'reps') {
            if (isSimpleNumber(cleaned)) {
                sections.reps.push(cleaned.trim());
            }

            continue;
        }

        if (currentSection === 'weight') {
            if (isWeightLine(cleaned)) {
                sections.weight.push(normalizeWeight(cleaned));
            }

            continue;
        }

        if (currentSection === 'notes') {
            sections.notes.push(prettifyNote(cleaned));
        }
    }

    if (sections.exercise.length === 0) {
        return [];
    }

    return sections.exercise.map((name, index) => ({
        name,
        sets: sections.sets[index] ?? '',
        reps: sections.reps[index] ?? '',
        weight: sections.weight[index] ?? '',
        notes: sections.notes[index] ?? '',
    }));
}

function isNumberedExerciseLine(line: string) {
    return /^\s*\d{1,2}\s*[\.\-\)]\s+.+$/.test(line.trim());
}

function extractExerciseNameFromNumberedLine(line: string) {
    return cleanColumnExerciseName(
        line.replace(/^\s*\d{1,2}\s*[\.\-\)]\s+/, '').trim()
    );
}

function isHeaderLine(line: string) {
    const sectionTitle = normalizeSectionTitle(line);

    if (sectionTitle) return true;

    const lower = line.toLowerCase().trim();

    return (
        lower === '#' ||
        lower === 'n°' ||
        lower === 'nº' ||
        lower === 'numero' ||
        lower === 'número'
    );
}

function parsePaddleSequentialRoutine(lines: string[]): ParsedRoutineExercise[] {
    const exercises: ParsedRoutineExercise[] = [];

    let index = 0;

    while (index < lines.length) {
        const currentLine = cleanLine(lines[index]);

        if (!currentLine) {
            index++;
            continue;
        }

        if (!isNumberedExerciseLine(currentLine)) {
            index++;
            continue;
        }

        const name = extractExerciseNameFromNumberedLine(currentLine);

        let sets = '';
        let reps = '';
        let weight = '';
        let notes = '';

        index++;

        const values: string[] = [];

        while (index < lines.length) {
            const nextLine = cleanLine(lines[index]);

            if (!nextLine) {
                index++;
                continue;
            }

            if (isNumberedExerciseLine(nextLine)) {
                break;
            }

            if (isHeaderLine(nextLine)) {
                index++;
                continue;
            }

            if (isRoutineMetadataLine(nextLine)) {
                break;
            }

            values.push(nextLine);
            index++;
        }

        for (const value of values) {
            if (!sets && isSimpleNumber(value)) {
                sets = value.trim();
                continue;
            }

            if (sets && !reps && isSimpleNumber(value)) {
                reps = value.trim();
                continue;
            }

            if (!weight && isWeightLine(value)) {
                weight = normalizeWeight(value);
                continue;
            }

            if (!notes) {
                notes = prettifyNote(value);
                continue;
            }

            notes = `${notes} ${prettifyNote(value)}`.trim();
        }

        const hasUsefulData = Boolean(sets || reps || weight || notes);

        if (name && hasUsefulData) {
            exercises.push({
                name,
                sets,
                reps,
                weight,
                notes,
            });
        }
    }

    return exercises;
}

function isVisualTableExerciseRow(line: string) {
    return /^\s*\d{1,2}[\.\)]?\s+.+\s+\d{1,2}\s+/.test(line.trim());
}

function parseVisualTableRow(line: string): ParsedRoutineExercise | null {
    const cleaned = cleanLine(line).replace(/\s+/g, ' ').trim();

    const match = cleaned.match(
        /^\s*\d{1,2}[\.\)]?\s+(.+?)\s+(\d{1,2})\s+(\d{1,3}(?:\s*[-–]\s*\d{1,3})?(?:\s*(?:por\s+\w+|seg))?)\s+((?:peso\s+corporal)|(?:\d{1,3}(?:\s*[-–]\s*\d{1,3})?\s*kg))\s+(.+)$/i
    );

    if (!match) {
        return null;
    }

    const [, rawName, rawSets, rawReps, rawWeight, rawNotes] = match;

    const isBodyWeight = rawWeight.toLowerCase().includes('peso corporal');

    const weight = isBodyWeight ? '' : normalizeWeightForOcr(rawWeight);

    const notes = isBodyWeight
        ? `${rawWeight} ${rawNotes}`.trim()
        : rawNotes;

    const fixedName = fixExerciseNameWordOrder(rawName);

    return {
        name: cleanColumnExerciseName(fixedName),
        sets: rawSets.trim(),
        reps: rawReps.replace(/\s+/g, ' ').trim(),
        weight,
        notes: prettifyNote(notes),
    };
}

function shouldAppendAsNoteContinuation(line: string) {
    const cleaned = cleanLine(line);

    if (!cleaned) return false;
    if (isHeaderLine(cleaned)) return false;
    if (isRoutineMetadataLine(cleaned)) return false;
    if (isNumberedExerciseLine(cleaned)) return false;
    if (isVisualTableExerciseRow(cleaned)) return false;

    const lower = cleaned.toLowerCase();

    if (lower.includes('notas generales')) return false;
    if (lower.includes('la consistencia')) return false;
    if (lower.includes('clave del progreso')) return false;
    if (lower.startsWith('•')) return false;

    return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/.test(cleaned);
}

function parseVisualTableRoutine(lines: string[]): ParsedRoutineExercise[] {
    const exercises: ParsedRoutineExercise[] = [];

    for (let index = 0; index < lines.length; index++) {
        const currentLine = cleanLine(lines[index]);

        if (!isVisualTableExerciseRow(currentLine)) {
            continue;
        }

        const exercise = parseVisualTableRow(currentLine);

        if (!exercise) {
            continue;
        }

        let nextIndex = index + 1;

        while (nextIndex < lines.length) {
            const nextLine = cleanLine(lines[nextIndex]);

            if (!shouldAppendAsNoteContinuation(nextLine)) {
                break;
            }

            exercise.notes = `${exercise.notes} ${prettifyNote(nextLine)}`.trim();
            index = nextIndex;
            nextIndex++;
        }

        exercises.push(exercise);
    }

    return exercises;
}

function normalizeWeightForOcr(weight: string) {
    const cleaned = cleanLine(weight)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\s*[-–]\s*/g, ' - ')
        .replace(/\s*kg\b/g, '')
        .trim();

    return cleaned;
}

function fixExerciseNameWordOrder(name: string) {
    const cleaned = cleanLine(name).replace(/\s+/g, ' ').trim();

    const lower = cleaned
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    if (lower === 'mancuernas aperturas con') {
        return 'Aperturas con mancuernas';
    }

    if (lower === 'en polea jalon al pecho') {
        return 'Jalón al pecho en polea';
    }

    if (lower === 'polea remo sentado') {
        return 'Remo sentado en polea';
    }

    if (lower === 'con barra sentadilla') {
        return 'Sentadilla con barra';
    }

    if (lower === 'polea extension de triceps') {
        return 'Extensión de tríceps en polea';
    }

    return cleaned;
}

function normalizeOcrTextForDetection(text: string) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function countMatches(text: string, patterns: RegExp[]) {
    return patterns.reduce((total, pattern) => {
        const matches = text.match(pattern);
        return total + (matches ? matches.length : 0);
    }, 0);
}

function isSimpleRoutineTableText(lines: string[]) {
    const text = normalizeOcrTextForDetection(lines.join('\n'));

    const hasSimpleHeader =
        /\bejercicios?\s+series\s+(repeticiones|reps)\s+peso\b/.test(text) ||
        /\bejercicio\s+series\s+(repeticiones|reps)\s+peso\b/.test(text) ||
        /\bejercicios?\s+series\s+(repeticiones|reps)\s+peso\s+referencial\s+notas\b/.test(text);

    const numberedExerciseRows = lines.filter((line) =>
        /^\s*\d{1,2}[\.\)]?\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(cleanLine(line))
    ).length;

    const hasRealComplexStructure =
        /\bsem\s*\.?\s*\d+\b/.test(text) ||
        /\bsemana\s*\d+\b/.test(text) ||
        /\bweek\s*\d+\b/.test(text) ||
        /\bbloque\s*\d*\b/.test(text) ||
        /\bblock\s*\d*\b/.test(text) ||
        /\bmomento\b/.test(text) ||
        /\bmesociclo\b/.test(text) ||
        /\bmicrociclo\b/.test(text) ||
        /\bfase\s*\d*\b/.test(text);

    return hasSimpleHeader && numberedExerciseRows >= 3 && !hasRealComplexStructure;
}

function isComplexRoutineText(lines: string[]) {
    const text = normalizeOcrTextForDetection(lines.join('\n'));

    // Si parece una tabla simple clásica, no la marcamos como compleja.
    if (isSimpleRoutineTableText(lines)) {
        return false;
    }

    let score = 0;

    const strongStructurePatterns = [
        /\bsem\s*\.?\s*\d+\b/g,
        /\bsemana\s*\d+\b/g,
        /\bweek\s*\d+\b/g,
        /\bdia\s*\d+\b/g,
        /\bday\s*\d+\b/g,
        /\bbloque\s*\d*\b/g,
        /\bblock\s*\d*\b/g,
        /\bmomento\b/g,
        /\bfase\s*\d*\b/g,
        /\bphase\s*\d*\b/g,
        /\bmesociclo\b/g,
        /\bmicrociclo\b/g,
        /\bprogresion\b/g,
        /\bprogression\b/g,
    ];

    const mediumStructurePatterns = [
        /\bempuje\b/g,
        /\bpush\b/g,
        /\btraccion\b/g,
        /\bpull\b/g,
        /\bdominante\b/g,
        /\bdom\s+cadera\b/g,
        /\bdom\s+rod\b/g,
        /\bcadera\b/g,
        /\brodilla\b/g,
        /\btorso\b/g,
        /\bpierna\b/g,
        /\bleg\b/g,
        /\bupper\b/g,
        /\blower\b/g,
        /\bfull\s*body\b/g,
    ];

    const advancedTablePatterns = [
        /\bsem\s*1\b/g,
        /\bsem\s*2\b/g,
        /\bsem\s*3\b/g,
        /\bsem\s*4\b/g,
        /\bsemana\s*1\b/g,
        /\bsemana\s*2\b/g,
        /\bsemana\s*3\b/g,
        /\bsemana\s*4\b/g,
        /\bejercicio\s+sem\b/g,
        /\bejercicios\s+sem\b/g,
    ];

    const prescriptionPatterns = [
        /\b\d{1,3}\s*[xX]\s*\d{1,3}\b/g,
        /\b\d{1,3}\s*[xX]\s*\d{1,3}\s*[xX]\s*\d{1,3}\b/g,
        /\bf\s*[+\-]?\s*\d*\s*[xX]\s*\d{1,3}\b/g,
    ];

    const strongHits = countMatches(text, strongStructurePatterns);
    const mediumHits = countMatches(text, mediumStructurePatterns);
    const advancedTableHits = countMatches(text, advancedTablePatterns);
    const prescriptionHits = countMatches(text, prescriptionPatterns);

    score += strongHits * 3;
    score += mediumHits * 1;
    score += advancedTableHits * 3;

    const hasMultipleWeeks =
        /\bsem\s*1\b/.test(text) &&
        /\bsem\s*2\b/.test(text) &&
        /\bsem\s*3\b/.test(text);

    const hasBlocksAndWeeks =
        /\bbloque\b/.test(text) &&
        (/\bsem\s*\d+\b/.test(text) || /\bsemana\s*\d+\b/.test(text));

    const hasPlanningStructure =
        /\bmomento\b/.test(text) &&
        /\bejercicios?\b/.test(text) &&
        (/\bsem\b/.test(text) || /\bsemana\b/.test(text));

    if (hasMultipleWeeks) score += 5;
    if (hasBlocksAndWeeks) score += 6;
    if (hasPlanningStructure) score += 6;

    // Las progresiones por sí solas no convierten una rutina en compleja.
    // Solo suman si ya hay señales estructurales.
    if (strongHits >= 2 && prescriptionHits >= 10) {
        score += 2;
    }

    return score >= 8;
}

function extractUsefulComplexDescriptionFragments(rawText: string) {
    const lines = splitRawTextIntoCandidateLines(rawText);

    const usefulFragments: string[] = [];

    for (const line of lines) {
        const cleaned = cleanLine(line);

        if (!cleaned) continue;

        const lower = cleaned.toLowerCase();

        const isUsefulDescriptionLine =
            lower.includes('objetivo:') ||
            lower.includes('frecuencia:') ||
            lower.includes('duración estimada:') ||
            lower.includes('duracion estimada:') ||
            lower.includes('descanso entre series:') ||
            lower.includes('notas generales:');

        if (isUsefulDescriptionLine) {
            usefulFragments.push(cleaned);
            continue;
        }

        const isSectionLine =
            lower.includes('momento') ||
            lower.includes('empuje') ||
            lower.includes('traccion') ||
            lower.includes('tracción') ||
            lower.includes('dom cadera') ||
            lower.includes('dom rod') ||
            lower.includes('dominante') ||
            lower.includes('bloque');

        if (isSectionLine && cleaned.length <= 90) {
            usefulFragments.push(cleaned);
        }
    }

    return Array.from(new Set(usefulFragments)).slice(0, 8);
}

function buildComplexRoutineDescription(rawText: string) {
    const fragments = extractUsefulComplexDescriptionFragments(rawText);

    const baseDescription = [
        'Rutina compleja detectada desde escaneo.',
        'Puede contener bloques, semanas, progresiones o varias secciones.',
        'Revisá y corregí la información antes de usarla.',
    ];

    if (fragments.length === 0) {
        return baseDescription.join('\n');
    }

    return [
        ...baseDescription,
        '',
        'Fragmentos detectados:',
        ...fragments.map((fragment) => `- ${fragment}`),
    ].join('\n');
}

function isComplexHeaderOrNoise(line: string) {
    const lower = cleanLine(line)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    if (!lower) return true;

    return (
        lower.includes('momento') ||
        lower.includes('ejercicios') ||
        lower.includes('ejercicio') ||
        lower.includes('sem 1') ||
        lower.includes('sem 2') ||
        lower.includes('sem 3') ||
        lower.includes('sem 4') ||
        lower.includes('semana') ||
        lower.includes('week') ||
        lower.includes('bloque') ||
        lower.includes('block') ||
        lower.includes('fase') ||
        lower.includes('phase') ||
        lower.includes('mesociclo') ||
        lower.includes('microciclo') ||
        lower.includes('objetivo') ||
        lower.includes('frecuencia') ||
        lower.includes('duracion') ||
        lower.includes('descanso') ||
        lower.includes('notas generales') ||
        lower === 'santi' ||
        lower === 'liggo' ||
        lower.includes('empuje') ||
        lower.includes('traccion') ||
        lower.includes('dominante') ||
        lower.includes('dom cadera') ||
        lower.includes('dom rod')
    );
}

function extractComplexExerciseFromLine(line: string): ParsedRoutineExercise | null {
    const cleaned = cleanLine(line).replace(/\s+/g, ' ').trim();

    if (!cleaned) return null;
    if (isComplexHeaderOrNoise(cleaned)) return null;

    const prescriptionMatch = cleaned.match(
        /\b(?:\d{1,3}\s*[xX]\s*\d{1,3}(?:\s*[xX]\s*\d{1,3})?|F\s*[xX]\s*\d{1,3}|\d{1,3}\s*[-–]\s*\d{1,3})\b/i
    );

    if (!prescriptionMatch || prescriptionMatch.index === undefined) {
        return null;
    }

    const rawName = cleaned
        .slice(0, prescriptionMatch.index)
        .replace(/\bBLOQUE\s*\d+\b/gi, '')
        .replace(/\bSEM\s*\d+\b/gi, '')
        .replace(/\bMOMENTO\b/gi, '')
        .replace(/^\d{1,2}[\.\)]?\s*/, '')
        .trim();

    if (!rawName || rawName.length < 3) {
        return null;
    }

    const progression = cleaned.slice(prescriptionMatch.index).trim();

    const name = cleanColumnExerciseName(fixExerciseNameWordOrder(rawName));

    return {
        name,
        sets: '',
        reps: prescriptionMatch[0].replace(/\s+/g, ' ').trim(),
        weight: '',
        notes: progression
            ? `Rutina compleja. Progresión detectada: ${progression}`
            : 'Rutina compleja. Revisar progresión.',
    };
}

function normalizeForComplexMatch(text: string) {
    return cleanLine(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[×]/g, 'x')
        .replace(/[^a-z0-9/+ ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function prettifyComplexExerciseName(name: string) {
    const cleaned = cleanLine(name).replace(/\s+/g, ' ').trim();

    const lower = cleaned
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const replacements: Record<string, string> = {
        'banco piano barra': 'Banco plano barra',
        'hiptrhust barra': 'Hip thrust barra',
        'press inclinado mancuerma': 'Press inclinado mancuerna',
        'gato conten enojado': 'Gato cont enojado',
        'triceps polea': 'Tríceps polea',
        'triceps polea 1 b': 'Tríceps polea 1 b',
        'buen dia disco': 'Buen día disco',
        'peso muerto asimetrico manc': 'Peso muerto asimétrico manc',
        'bulgaras': 'Búlgaras',
        'bulgaras inclinado': 'Búlgaras inclinado',
        'gemelos maquina': 'Gemelos máquina',
        'v-ups acordeon': 'V-ups acordeón',
        'jalon al pecho estocada': 'Jalón al pecho estocada',
    };

    if (replacements[lower]) {
        return replacements[lower];
    }

    return cleaned
        .split(' ')
        .map((word) => {
            if (word.length <= 2) return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

function extractProgressionFromComplexLine(line: string) {
    const cleaned = cleanLine(line)
        .replace(/[×]/g, 'x')
        .replace(/\s+/g, ' ')
        .trim();

    const progressionMatch = cleaned.match(
        /\b(?:\d{1,3}\s*x\s*\d{1,3}(?:\s*x\s*\d{1,3})?|F\s*[+\-]?\s*\d*\s*x\s*\d{1,3}|\d{1,3}\s*[-–]\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})*)\b.*$/i
    );

    return progressionMatch ? progressionMatch[0].trim() : '';
}

function extractFirstPrescriptionFromProgression(progression: string) {
    const normalized = cleanLine(progression)
        .replace(/[×]/g, 'x')
        .replace(/\s+/g, ' ')
        .trim();

    const match = normalized.match(
        /\b(?:\d{1,3}\s*x\s*\d{1,3}(?:\s*x\s*\d{1,3})?|F\s*[+\-]?\s*\d*\s*x\s*\d{1,3}|\d{1,3}\s*[-–]\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})*)\b/i
    );

    return match ? match[0].replace(/\s+/g, '').trim() : '';
}

function isPureComplexHeaderLine(line: string) {
    const normalized = normalizeForComplexMatch(line);

    if (!normalized) return true;

    const onlyHeaderPatterns = [
        /^liggo$/,
        /^momento$/,
        /^momento ejercicios$/,
        /^momento candado ejercicios.*$/,
        /^ejercicios$/,
        /^ejercicio$/,
        /^sem\s*\d+$/,
        /^semana\s*\d+$/,
        /^bloque\s*\d+$/,
        /^block\s*\d+$/,
        /^empuje$/,
        /^traccion$/,
        /^empuje traccion$/,
        /^dom cadera$/,
        /^dom rod$/,
        /^dom rodilla$/,
    ];

    return onlyHeaderPatterns.some((pattern) => pattern.test(normalized));
}

function extractComplexExercisesByVocabulary(lines: string[]) {
    const exercises: ParsedRoutineExercise[] = [];

    const patternsByLength = [...complexExerciseNamePatterns].sort(
        (a, b) => normalizeForComplexMatch(b).length - normalizeForComplexMatch(a).length
    );

    for (const line of lines) {
        const normalizedLine = normalizeForComplexMatch(line);

        if (!normalizedLine) continue;

        // Importante:
        // No descartamos líneas por contener BLOQUE, MOMENTO o DOM,
        // porque muchas veces ahí mismo vienen los ejercicios.
        if (isPureComplexHeaderLine(line)) continue;

        const progression = extractProgressionFromComplexLine(line);

        const detectedInLine = new Set<string>();

        for (const pattern of patternsByLength) {
            const normalizedPattern = normalizeForComplexMatch(pattern);

            if (!normalizedPattern) continue;

            const escapedPattern = normalizedPattern.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&'
            );

            const patternRegex = new RegExp(
                `(^|\\s)${escapedPattern}(\\s|$)`,
                'i'
            );

            if (!patternRegex.test(normalizedLine)) {
                continue;
            }

            const name = prettifyComplexExerciseName(pattern);
            const key = normalizeNameKey(name);

            if (detectedInLine.has(key)) {
                continue;
            }

            detectedInLine.add(key);

            const firstPrescription = extractFirstPrescriptionFromProgression(progression);

            exercises.push({
                name,
                sets: '',
                reps: firstPrescription,
                weight: '',
                notes: progression
                    ? `Rutina compleja. Revisar progresión: ${progression}`
                    : 'Rutina compleja. Revisar series, repeticiones y progresión.',
            });
        }
    }

    return mergeDuplicateExercises(exercises);
}

function parseComplexRoutine(lines: string[]): ParsedRoutineExercise[] {
    const vocabularyExercises = extractComplexExercisesByVocabulary(lines);

    if (vocabularyExercises.length >= 5) {
        return vocabularyExercises;
    }

    const fallbackExercises: ParsedRoutineExercise[] = [];

    for (const line of lines) {
        const exercise = extractComplexExerciseFromLine(line);

        if (exercise) {
            fallbackExercises.push(exercise);
        }
    }

    return mergeDuplicateExercises(fallbackExercises);
}

function extractDescriptionFromOcrText(lines: string[]) {
    const descriptionParts: string[] = [];

    let capturingGeneralNotes = false;

    for (const line of lines) {
        const cleaned = cleanLine(line);

        if (!cleaned) continue;

        const lower = cleaned.toLowerCase();

        const isExerciseHeader =
            lower.includes('ejercicio') &&
            (lower.includes('series') ||
                lower.includes('reps') ||
                lower.includes('repeticiones') ||
                lower.includes('peso'));

        const isExerciseRow =
            /^\s*\d{1,2}[\.\)]?\s+/.test(cleaned) &&
            !lower.includes('veces por semana');

        if (isExerciseHeader || isExerciseRow) {
            capturingGeneralNotes = false;
            continue;
        }

        const isMainDescriptionLine =
            lower.includes('objetivo:') ||
            lower.includes('frecuencia:') ||
            lower.includes('duración estimada:') ||
            lower.includes('duracion estimada:') ||
            lower.includes('descanso entre series:');

        if (isMainDescriptionLine) {
            descriptionParts.push(cleaned);
            continue;
        }

        if (lower.includes('notas generales:')) {
            capturingGeneralNotes = true;
            descriptionParts.push(cleaned);
            continue;
        }

        if (capturingGeneralNotes) {
            const shouldSkip =
                lower.includes('la consistencia es') ||
                lower.includes('clave del progreso') ||
                lower.includes('rutina ') ||
                lower.includes('objetivo:') ||
                lower.includes('frecuencia:') ||
                lower.includes('duración estimada:') ||
                lower.includes('duracion estimada:') ||
                lower.includes('descanso entre series:');

            if (shouldSkip) {
                continue;
            }

            const looksLikeUsefulNote =
                cleaned.startsWith('•') ||
                cleaned.startsWith('-') ||
                /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{4,}/.test(cleaned);

            if (looksLikeUsefulNote) {
                descriptionParts.push(
                    cleaned
                        .replace(/^•\s*/, '')
                        .replace(/^-\s*/, '')
                        .trim()
                );
            }
        }
    }

    if (descriptionParts.length === 0) {
        return 'Rutina creada desde escaneo/importación.';
    }

    return descriptionParts.join('\n');
}

function extractComplexTitle(lines: string[]) {
    const blocked = [
        'momento',
        'ejercicio',
        'ejercicios',
        'sem',
        'semana',
        'bloque',
        'empuje',
        'traccion',
        'tracción',
        'dom cadera',
        'dom rod',
        'dom rodilla',
    ];

    const possibleTitle = lines.find((line) => {
        const cleaned = cleanLine(line);

        if (!cleaned) return false;
        if (cleaned.length > 35) return false;

        const lower = cleaned.toLowerCase();

        return !blocked.some((word) => lower.includes(word));
    });

    return possibleTitle ? cleanLine(possibleTitle) : 'Rutina importada';
}

export function parseRoutineText(rawText: string): ParsedRoutineResult {
    const lines = splitRawTextIntoCandidateLines(rawText);

    const title = extractTitle(lines);

    const description = extractDescriptionFromOcrText(lines);

    const isComplex = isComplexRoutineText(lines);

    if (isComplex) {
        const complexExercises = parseComplexRoutine(lines);
        const complexTitle = extractComplexTitle(lines);

        return {
            title: complexTitle,
            description: buildComplexRoutineDescription(rawText),
            exercises: complexExercises,
            rawText,
            importMode: 'complex',
            warning:
                'Detectamos una rutina compleja con bloques, semanas o progresiones. Revisá cuidadosamente los ejercicios antes de guardar.',
        };
    }

    const visualTableExercises = parseVisualTableRoutine(lines);

    if (visualTableExercises.length >= 3) {
        return {
            title,
            description,
            exercises: mergeDuplicateExercises(visualTableExercises),
            rawText,
            importMode: 'simple',
        };
    }

    const columnBasedExercises = parseColumnBasedRoutine(lines);

    if (columnBasedExercises.length >= 3) {
        return {
            title,
            description,
            exercises: mergeDuplicateExercises(columnBasedExercises),
            rawText,
            importMode: 'simple',
        };
    }

    const paddleSequentialExercises = parsePaddleSequentialRoutine(lines);

    if (paddleSequentialExercises.length >= 3) {
        return {
            title,
            description,
            exercises: mergeDuplicateExercises(paddleSequentialExercises),
            rawText,
            importMode: 'simple',
        };
    }

    const exercises = lines
        .map(parseRoutineLine)
        .filter((exercise): exercise is ParsedRoutineExercise => Boolean(exercise))
        .filter((exercise) => {
            const name = normalizeNameKey(exercise.name);

            if (!name) return false;

            return !nonExerciseWords.some((word) =>
                name.includes(normalizeNameKey(word))
            );
        });

    return {
        title,
        description,
        exercises: mergeDuplicateExercises(exercises),
        rawText,
        importMode: 'simple',
    };
}