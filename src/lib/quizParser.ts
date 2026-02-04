export type ParsedQuestion = {
    text: string;
    options: string[];
    correctAnswer: string;
};

export function parseQuizText(content: string): ParsedQuestion[] {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const questions: ParsedQuestion[] = [];

    let currentQuestion: Partial<ParsedQuestion> = {};
    let currentOptions: string[] = [];

    // Helper to finalize a question
    const finalizeQuestion = () => {
        if (currentQuestion.text && currentOptions.length > 0 && currentQuestion.correctAnswer) {
            questions.push({
                text: currentQuestion.text,
                options: currentOptions,
                correctAnswer: currentQuestion.correctAnswer
            });
        }
        // Reset
        currentQuestion = {};
        currentOptions = [];
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for Answer line (Flexible: "Answer:", "Correct Answer:", "Ans:")
        const answerMatch = line.match(/^(?:correct\s+)?(?:answer|ans)[:\.\-]\s*(.*)/i);
        if (answerMatch) {
            const answerRaw = answerMatch[1].trim(); // "C) France" or "C"
            currentQuestion.correctAnswer = answerRaw;
            finalizeQuestion();
            continue;
        }

        // Check for Option
        // Matches: "A) ...", "a. ...", "1. ..." (if we assume numeric options are options not questions)
        // STRICTER: Must start with single letter A-D/a-d followed by ) or .
        // OR common patterns if indented? Text file usually has flat structure.
        const optionMatch = line.match(/^([A-Da-d])[\)\.]\s+(.*)/);
        if (optionMatch) {
            currentOptions.push(line);
            continue;
        }

        // Logic flow:
        // If we don't have text yet, this is the question.
        // If we have text, but NO options yet, append to text (multi-line question).
        // If we have options, this CANNOT be part of the previous question text. Use heuristic.

        if (!currentQuestion.text) {
            // Clean up leading numbers like "1." or "Q1:"
            currentQuestion.text = line.replace(/^(?:Q\d+|Question\s+\d+|\d+)[\.\:\)]\s*/i, '');
        } else {
            if (currentOptions.length === 0) {
                // Continuation of question text
                currentQuestion.text += " " + line;
            } else {
                // We have options, but this line isn't an Option match (A) ...) and isn't Answer.
                // It might be an option without a prefix? or a malformed line.
                // Let's assume it's an option for safety in "Simple format".
                currentOptions.push(line);
            }
        }
    }

    return questions.map(q => {
        // Refine options and answer
        const cleanOptions = q.options.map(opt => {
            // Remove "A) ", "a. " etc
            return opt.replace(/^([A-Da-d])[\)\.]\s+/, '');
        });

        let cleanAnswer = q.correctAnswer;

        // 1. If Answer is "C) France", we want "France" (or match index C).
        // 2. If Answer is "C", we want index 2.

        // Check if answer starts with a Letter Prefix that matches an option logic
        const answerPrefixMatch = cleanAnswer.match(/^([A-Da-d])[\)\.]?\s*(.*)/);

        if (answerPrefixMatch) {
            const letter = answerPrefixMatch[1].toLowerCase();
            const index = letter.charCodeAt(0) - 97; // a=0

            // If the rest of the string is empty or matches the option content
            if (cleanOptions[index]) {
                // We prefer the CONTENT from the options array to be the consistent answer value
                cleanAnswer = cleanOptions[index];
            }
        }

        // If we couldn't resolve by letter, we leave it (it might be full text "France")
        // The gameManager checks `answer === currentQ.correctAnswer`
        // So we must ensure `cleanAnswer` matches exactly one of `cleanOptions`.

        // Final pass: if cleanAnswer is NOT in cleanOptions, try to find it?
        if (!cleanOptions.includes(cleanAnswer)) {
            // Try fuzzy match? Or just leave it (user might have typo in answer key)
            // Common issue: "France" vs "France "
            const found = cleanOptions.find(o => o.trim().toLowerCase() === cleanAnswer.trim().toLowerCase());
            if (found) cleanAnswer = found;
        }

        return {
            text: q.text || "Untitled Question",
            options: cleanOptions,
            correctAnswer: cleanAnswer || cleanOptions[0] // Fallback
        };
    });
}
