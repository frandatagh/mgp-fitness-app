export type ParsedRoutineExercise = {
    name: string;
    sets: string;
    reps: string;
    weight: string;
    notes: string;
};

export type ParsedRoutineResult = {
    title: string;
    exercises: ParsedRoutineExercise[];
    rawText: string;
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

export function parseRoutineText(rawText: string): ParsedRoutineResult {
    const lines = splitRawTextIntoCandidateLines(rawText);

    const title = extractTitle(lines);

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
        exercises: mergeDuplicateExercises(exercises),
        rawText,
    };
}