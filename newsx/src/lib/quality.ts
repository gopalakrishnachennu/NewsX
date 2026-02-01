export const QualityFilters = {
    // Regex for basic clickbait detection (simplified)
    CLICKBAIT_PATTERNS: [
        /you won['’]t believe/i,
        /can['’]t miss/i,
        /shocking truth/i,
        /top \d+ (reasons|things)/i,
        /mind-blowing/i
    ],

    isClickbait(title: string): { isClickbait: boolean; score: number } {
        let score = 0;
        this.CLICKBAIT_PATTERNS.forEach(pattern => {
            if (pattern.test(title)) score += 20;
        });

        // Cap score at 100
        return {
            isClickbait: score >= 40,
            score: Math.min(score, 100)
        };
    },

    hasMinWordCount(content: string, minWords = 100): boolean {
        if (!content) return false;
        const wordCount = content.trim().split(/\s+/).length;
        return wordCount >= minWords;
    },

    isPressRelease(title: string, content: string): boolean {
        const prPatterns = [/press release/i, /link business wire/i, /prnewswire/i];
        return prPatterns.some(p => p.test(title) || p.test(content));
    }
};
