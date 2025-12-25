import { useContext } from "react";
import { ExternalCalendarsContext } from "./ExternalCalendarsContext";

export function useExternalCalendarsContext() {
  const ctx = useContext(ExternalCalendarsContext);
  if (!ctx) throw new Error('useExternalCalendarsContext must be used within ExternalCalendarsProvider');
  return ctx;
}
