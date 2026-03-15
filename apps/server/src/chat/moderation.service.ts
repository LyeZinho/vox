import { Injectable } from '@nestjs/common';

@Injectable()
export class ModerationService {
    // Basic toxicity and spam patterns
    private readonly blockedPatterns: RegExp[] = [
        /toxic_word_1/i, // Placeholders for actual moderation rules
        /toxic_word_2/i,
        /spam_link_example\.com/i,
        /(.)\1{10,}/, // Repetitive characters
    ];

    validateContent(text: string): { safe: boolean; reason?: string } {
        // 1. Check blocked patterns
        for (const pattern of this.blockedPatterns) {
            if (pattern.test(text)) {
                return { safe: false, reason: 'Conteúdo contém termos proibidos ou padrões de spam.' };
            }
        }

        // 2. Length check (optional example)
        if (text.length > 2000) {
            return { safe: false, reason: 'Mensagem muito longa.' };
        }

        return { safe: true };
    }
}
