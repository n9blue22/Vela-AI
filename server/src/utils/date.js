export function getDateKey(now = new Date()) {
  try {
    return now.toISOString().slice(0, 10);
  } catch (error) {
    console.error("[date] Could not create date key", error);
    return "";
  }
}

