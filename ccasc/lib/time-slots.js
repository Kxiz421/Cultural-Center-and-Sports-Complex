export const TIME_SLOT = {
  DAY: "1",
  NIGHT: "2",
  WHOLE_DAY: "3",
};

export const TIME_SLOT_OPTIONS = [
  { id: 1, value: TIME_SLOT.DAY, label: "Day (8:00 AM – 5:00 PM)" },
  { id: 2, value: TIME_SLOT.NIGHT, label: "Night (5:00 PM – 10:00 PM)" },
  { id: 3, value: TIME_SLOT.WHOLE_DAY, label: "Whole Day (8:00 AM – 10:00 PM)" },
];

export const WHOLE_DAY_SLOT = {
  timeSlotId: 3,
  startTime: "08:00 AM",
  endTime: "10:00 PM",
};

export function timeSlotKey(value) {
  return String(value || "");
}

export function isDaySlot(value) {
  return timeSlotKey(value) === TIME_SLOT.DAY;
}

export function isNightSlot(value) {
  return timeSlotKey(value) === TIME_SLOT.NIGHT;
}

export function isWholeDaySlot(value) {
  return timeSlotKey(value) === TIME_SLOT.WHOLE_DAY;
}

export function getTimeSlotLabel(value) {
  const match = TIME_SLOT_OPTIONS.find((opt) => opt.value === timeSlotKey(value));
  return match?.label || "Unknown time slot";
}

/** Keep Whole Day if the user already chose it; otherwise follow the package slot. */
export function timeSlotAfterPackageChange(currentSlotId, packageTimeSlotId) {
  if (isWholeDaySlot(currentSlotId)) return timeSlotKey(currentSlotId);
  if (packageTimeSlotId != null && packageTimeSlotId !== "") {
    return timeSlotKey(packageTimeSlotId);
  }
  return timeSlotKey(currentSlotId || TIME_SLOT.DAY);
}
