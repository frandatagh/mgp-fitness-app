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

function cleanLine(line: string) {
    return line
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[•●]/g, '')
        .trim();
}

function removeLeadingNumber(line: string) {
    return line.replace(/^\s*\d+[\.\-\)]\s*/, '').trim();
}

function looksLikeHeader(line: string) {
    const lower = line.toLowerCase();

    const headerWords = [
        'ejercicio',
        'series',
        'reps',
        'repeticiones',
        'peso',
        'notas',
        'rutina',
        'objetivo',
        'frecuencia',
        'descanso',
        'general',
    ];

    const isOnlyHeader =
        headerWords.some((word) => lower.includes(word)) &&
        !/\d+\s*x\s*\d+/i.test(lower) &&
        !/\d+\s+series/i.test(lower);

    return isOnlyHeader;
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

    return possibleTitle || 'Rutina importada';
}

function normalizeWeight(value: string | undefined) {
    if (!value) return '';

    return value
        .replace(/kg/gi, '')
        .replace(',', '.')
        .trim();
}

function parsePipeOrTableLine(line: string): ParsedRoutineExercise | null {
    const parts = line
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length < 3) return null;

    const name = removeLeadingNumber(parts[0]);
    const sets = parts[1] ?? '';
    const reps = parts[2] ?? '';
    const weight = normalizeWeight(parts[3] ?? '');
    const notes = parts.slice(4).join(' · ');

    if (!name || !sets || !reps) return null;

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

    /**
     * Soporta:
     * Press banca 4x10 40kg
     * Press banca 4 x 10 40 kg
     * Press banca - 4x10 - 40kg - Controlar técnica
     */
    const compactRegex =
        /^(?<name>.+?)\s*[-–—]?\s*(?<sets>\d{1,2})\s*x\s*(?<reps>\d{1,3})(?:\s*[-–—]?\s*(?<weight>\d+(?:[.,]\d+)?)\s*kg?)?(?:\s*[-–—]\s*(?<notes>.+))?$/i;

    const match = clean.match(compactRegex);

    if (!match?.groups) return null;

    return {
        name: match.groups.name.trim(),
        sets: match.groups.sets.trim(),
        reps: match.groups.reps.trim(),
        weight: normalizeWeight(match.groups.weight),
        notes: match.groups.notes?.trim() ?? '',
    };
}

function parseSeriesWordsLine(line: string): ParsedRoutineExercise | null {
    const clean = removeLeadingNumber(line);

    /**
     * Soporta:
     * Sentadilla 4 series 10 reps 50 kg
     * Sentadilla 4 series de 10 repeticiones 50 kg
     */
    const seriesRegex =
        /^(?<name>.+?)\s+(?<sets>\d{1,2})\s*(?:series|serie)\s*(?:de)?\s*(?<reps>\d{1,3})\s*(?:reps|rep|repeticiones|repeticion)?(?:\s+(?<weight>\d+(?:[.,]\d+)?)\s*kg?)?(?:\s*[-–—]\s*(?<notes>.+))?$/i;

    const match = clean.match(seriesRegex);

    if (!match?.groups) return null;

    return {
        name: match.groups.name.trim(),
        sets: match.groups.sets.trim(),
        reps: match.groups.reps.trim(),
        weight: normalizeWeight(match.groups.weight),
        notes: match.groups.notes?.trim() ?? '',
    };
}

function parseLooseTableLine(line: string): ParsedRoutineExercise | null {
    const clean = removeLeadingNumber(line);

    /**
     * Soporta líneas de OCR tipo tabla:
     * Press banca 4 10 40 kg Controlar técnica
     * Press inclinado 3 12 30 kg Movimiento completo
     */
    const looseRegex =
        /^(?<name>[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+?)\s+(?<sets>\d{1,2})\s+(?<reps>\d{1,3})(?:\s+(?<weight>\d+(?:[.,]\d+)?)\s*kg?)?(?:\s+(?<notes>.+))?$/i;

    const match = clean.match(looseRegex);

    if (!match?.groups) return null;

    const name = match.groups.name.trim();

    if (name.length < 3) return null;

    return {
        name,
        sets: match.groups.sets.trim(),
        reps: match.groups.reps.trim(),
        weight: normalizeWeight(match.groups.weight),
        notes: match.groups.notes?.trim() ?? '',
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
        parseLooseTableLine(cleaned)
    );
}

function deduplicateExercises(exercises: ParsedRoutineExercise[]) {
    const seen = new Set<string>();

    return exercises.filter((exercise) => {
        const key = `${exercise.name.toLowerCase()}-${exercise.sets}-${exercise.reps}-${exercise.weight}`;

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
    });
}

export function parseRoutineText(rawText: string): ParsedRoutineResult {
    const lines = rawText
        .split(/\r?\n/)
        .map(cleanLine)
        .filter(Boolean);

    const title = extractTitle(lines);

    const exercises = lines
        .map(parseRoutineLine)
        .filter((exercise): exercise is ParsedRoutineExercise => Boolean(exercise));

    return {
        title,
        exercises: deduplicateExercises(exercises),
        rawText,
    };
}