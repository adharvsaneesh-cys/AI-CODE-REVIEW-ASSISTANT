import { useEffect } from "react";
import { logoutUser } from "../services/auth";
import { getSettings } from "../services/settings";
import "./SettingsRuntime.css";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
];

export default function SettingsRuntime() {
  useEffect(() => {
    let timer = null;

    const applySettings = () => {
      const settings = getSettings();

      document.documentElement.setAttribute(
        "data-theme",
        settings.theme,
      );

      document.documentElement.setAttribute(
        "data-compact",
        settings.compactMode ? "true" : "false",
      );

      return settings;
    };

    const resetTimer = () => {
      if (timer) {
        clearTimeout(timer);
      }

      const accessToken =
        localStorage.getItem("accessToken");

      if (!accessToken) {
        return;
      }

      const settings = applySettings();
      const minutes = Math.max(
        Number(settings.sessionTimeout) || 60,
        1,
      );

      timer = window.setTimeout(async () => {
        try {
          await logoutUser();
        } catch {
          // Local logout still happens.
        }

        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");

        window.location.assign(
          "/login?reason=timeout",
        );
      }, minutes * 60 * 1000);
    };

    const onSettingsChanged = () => {
      applySettings();
      resetTimer();
    };

    applySettings();
    resetTimer();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(
        eventName,
        resetTimer,
        { passive: true },
      );
    });

    window.addEventListener(
      "codeguard-settings-changed",
      onSettingsChanged,
    );

    window.addEventListener(
      "storage",
      onSettingsChanged,
    );

    return () => {
      if (timer) {
        clearTimeout(timer);
      }

      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          resetTimer,
        );
      });

      window.removeEventListener(
        "codeguard-settings-changed",
        onSettingsChanged,
      );

      window.removeEventListener(
        "storage",
        onSettingsChanged,
      );
    };
  }, []);

  return null;
}
