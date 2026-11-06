"use client";

import * as React from "react";
import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  NOTIFICATION_SOUND_OPTIONS,
  getNotificationSoundChoice,
  setNotificationSoundChoice,
  playNotificationSound,
} from "@/lib/notification-sound";

/**
 * Let the user preview and choose the notification chime. The choice is stored
 * per browser and read by `playNotificationSound()` when a new notification
 * arrives.
 *
 * @param {object} props
 * @param {boolean} [props.compact] smaller text, for the profile dialog
 */
export function NotificationSoundPicker({ compact = false }) {
  const [choice, setChoice] = React.useState("chime");

  React.useEffect(() => {
    setChoice(getNotificationSoundChoice());
  }, []);

  const choose = (id) => {
    setNotificationSoundChoice(id);
    setChoice(id);
    if (id !== "none") playNotificationSound(id);
  };

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <p className={compact ? "text-xs font-medium" : "text-sm font-medium"}>
        Notification sound
      </p>
      <p className="text-xs text-muted-foreground">
        Preview and choose the sound played when a new notification arrives.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {NOTIFICATION_SOUND_OPTIONS.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant={choice === option.id ? "default" : "outline"}
            className="gap-1.5"
            onClick={() => choose(option.id)}
            aria-pressed={choice === option.id}
          >
            <Volume2 className="size-3.5" />
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
