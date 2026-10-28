// Personal settings. Everything specific to you lives in this folder (config/), so you or your AI
// can customise the app by editing these files and nothing else.

// Your time zone, as an IANA name: "Europe/London", "America/New_York", "Asia/Tokyo", ...
// Used to decide what "today" is and to show times in your local clock.
export const TIMEZONE = "UTC";

// The part of the day the timeline covers, in hours (0-24).
export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 24;

// Training rotation: one entry per day, repeating. "Rest" means no lifting.
// Each non-rest name needs exercises in config/workouts.ts.
export const SPLIT = ["Push", "Pull", "Legs", "Rest", "Upper", "Lower", "Rest"];

// Any date on which the rotation is at its first entry. Change it to shift the cycle.
// You can also change both of these later from the Admin page.
export const SPLIT_START = "2026-01-05";

// Thin lines drawn across the timeline, in minutes after midnight (22 * 60 = 22:00).
export const MARKERS = [{ id: "sleep", title: "Lights out", at: 22 * 60 }];
