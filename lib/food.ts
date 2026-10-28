// Calories and macros for the meals in config/meals.ts, plus "swap for the same carbs" suggestions.
// With no meals configured, nothing is shown.

import { FOODS, MEALS, type Macros, type Portion } from "@/config/meals";
import type { DayType } from "./workouts";

export type { Macros };
export type Item = { label: string; m: Macros };

const ZERO: Macros = { kcal: 0, p: 0, c: 0, f: 0 };
const scale = (x: Macros, k: number): Macros => ({ kcal: x.kcal * k, p: x.p * k, c: x.c * k, f: x.f * k });
const add = (a: Macros, b: Macros): Macros => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f });

const toItem = ([key, amount]: Portion): Item => {
  const food = FOODS[key];
  if (food.per === "piece") {
    return { label: `${amount} ${food.name}${amount > 1 ? "s" : ""}`, m: scale(food.m, amount) };
  }
  return { label: `${amount} g ${food.name}`, m: scale(food.m, amount / 100) };
};

// Items for a planned block, or null if the block isn't a configured meal.
export const itemsFor = (title: string, t: DayType): Item[] | null => {
  const meal = MEALS[title];
  return meal ? meal[t].map(toItem) : null;
};

export const total = (items: Item[]): Macros => items.reduce((a, i) => add(a, i.m), ZERO);

// Everything eaten in a day of this type.
export const dayMacros = (t: DayType): Macros => total(Object.values(MEALS).flatMap((meal) => meal[t].map(toItem)));

const r = (n: number) => Math.round(n);
const fmt = (x: Macros) => `${r(x.kcal)} kcal · P${r(x.p)} C${r(x.c)} F${r(x.f)}`;

// Empty when no meals are configured, so the header shows nothing.
export const macroLine = (x: Macros) => (x.kcal > 0 ? fmt(x) : "");

// Amounts of other carb sources with the same carbs as `carbs` grams.
const swapLine = (carbs: number) => {
  const slices = Math.round((carbs / 14.5) * 2) / 2;
  return [
    `${r(carbs / 0.8)} g dry rice`,
    `${r(carbs / 0.747)} g dry pasta`,
    `${r(carbs / 0.663)} g dry oats`,
    `${r(carbs / 7.3)} rice cakes`,
    `${slices} slice${slices === 1 ? "" : "s"} of bread`,
  ].join(", ");
};

// Text for the block's detail sheet: each item with its macros, a swap line for carb-heavy items, and a total.
export const foodDetail = (title: string, t: DayType): string | null => {
  const items = itemsFor(title, t);
  if (!items) return null;
  const lines: string[] = [];
  for (const i of items) {
    lines.push(`${i.label}\n${fmt(i.m)}`);
    if (i.m.c >= 20) lines.push(`Swap for ${r(i.m.c)} g carbs: ${swapLine(i.m.c)}`);
  }
  if (items.length > 1) lines.push(`Total: ${fmt(total(items))}`);
  return lines.join("\n");
};
