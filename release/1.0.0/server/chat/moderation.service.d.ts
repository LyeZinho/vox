export declare class ModerationService {
    private readonly blockedPatterns;
    validateContent(text: string): {
        safe: boolean;
        reason?: string;
    };
}
