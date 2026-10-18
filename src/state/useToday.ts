import { useEffect, useState } from "react";
import { todayISO } from "../domain/dates";
import type { ISODate } from "../domain/subscription";

/** Today's local date; re-evaluated every minute so "days until" rolls over at midnight. */
export function useToday(): ISODate {
  const [today, setToday] = useState(() => todayISO());
  useEffect(() => {
    const id = setInterval(() => setToday(todayISO()), 60_000);
    return () => clearInterval(id);
  }, []);
  return today;
}
