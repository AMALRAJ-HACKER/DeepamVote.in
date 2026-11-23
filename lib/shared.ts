export type Choice = "YES" | "NO";
export type Stats = {
    yes: number;
    no: number;
    total: number;
    gross: number;
    updated: string | null;
};
export type Results = {
    mode: "test" | "live";
    stats: Stats;
} | {
    mode: "setup" | "unavailable";
    stats: null;
};
export const numberIN = (value: number) => new Intl.NumberFormat("en-IN").format(value);
export const choices = {
    YES: "I support allowing the traditional Deepam lighting.",
    NO: "I do not support allowing the proposed lighting."
} as const;
export const refundTerms = "You can cancel before payment. Confirmed participation is normally final. Duplicate or erroneous charges are reviewed for refund to the original payment method, subject to applicable rights.";
