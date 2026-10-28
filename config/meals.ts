// Optional: meals and macros. If you don't want nutrition tracking, leave MEALS empty ({}).
//
// A block whose title matches a key in MEALS (see config/day.ts) shows each food with its calories and
// macros, a "swap for the same carbs" line for carb-heavy items, and a total. The header shows the
// day's totals. Values are standard nutrition-table estimates, not lab-exact. Replace them with
// the foods you really eat, and check them against your packaging.
//
// The meals below are PLACEHOLDERS to show the format. They are not a diet plan or nutrition advice,
// and they are not sized for any particular person. Set your own amounts.

export type Macros = { kcal: number; p: number; c: number; f: number };

// `per: "100g"` foods are measured in grams; `per: "piece"` foods are counted (eggs, bananas).
export const FOODS: Record<string, { name: string; per: "100g" | "piece"; m: Macros }> = {
  oats: { name: "rolled oats (dry)", per: "100g", m: { kcal: 379, p: 13.2, c: 67.7, f: 6.5 } },
  rice: { name: "white rice (dry)", per: "100g", m: { kcal: 365, p: 7.1, c: 80, f: 0.7 } },
  pasta: { name: "pasta (dry)", per: "100g", m: { kcal: 371, p: 13, c: 74.7, f: 1.5 } },
  chicken: { name: "chicken breast (raw)", per: "100g", m: { kcal: 120, p: 22.5, c: 0, f: 2.6 } },
  yogurt: { name: "Greek yogurt (0%)", per: "100g", m: { kcal: 59, p: 10.2, c: 3.6, f: 0.4 } },
  blueberries: { name: "blueberries", per: "100g", m: { kcal: 57, p: 0.7, c: 14.5, f: 0.3 } },
  egg: { name: "large egg", per: "piece", m: { kcal: 72, p: 6.3, c: 0.4, f: 4.8 } },
  banana: { name: "banana", per: "piece", m: { kcal: 105, p: 1.3, c: 27, f: 0.4 } },
};

// [food, amount]: grams for "100g" foods, a count for "piece" foods.
export type Portion = [food: keyof typeof FOODS, amount: number];

// Keyed by block title. Give a different list for training days and rest days (or the same one twice).
export const MEALS: Record<string, { training: Portion[]; rest: Portion[] }> = {
  Breakfast: {
    training: [["oats", 70], ["egg", 2], ["banana", 1]],
    rest: [["oats", 50], ["egg", 2]],
  },
  Lunch: {
    training: [["chicken", 180], ["rice", 90]],
    rest: [["chicken", 160], ["rice", 60]],
  },
  Dinner: {
    training: [["chicken", 150], ["pasta", 90]],
    rest: [["chicken", 150], ["pasta", 60]],
  },
};
