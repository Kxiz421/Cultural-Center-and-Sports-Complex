"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DEFAULT_AVATAR } from "@/lib/constants";

export function ProfileAvatar({ endpoint = "/api/staff/me", href }) {
  const router = useRouter();
  const [profile, setProfile] = React.useState(null);
  const [photoBroken, setPhotoBroken] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setProfile(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [endpoint]);

  const photoUrl =
    !photoBroken && profile?.profilePhoto ? profile.profilePhoto : DEFAULT_AVATAR;

  return (
    <button
      type="button"
      title="View my profile"
      aria-label="View my profile"
      onClick={() => {
        if (href) router.push(href);
      }}
      className="shrink-0 rounded-full transition-transform hover:scale-105"
    >
      <img
        src={photoUrl}
        alt="My profile"
        onError={() => setPhotoBroken(true)}
        className="size-8 rounded-full bg-white/15 object-cover ring-2 ring-white/25"
      />
    </button>
  );
}
