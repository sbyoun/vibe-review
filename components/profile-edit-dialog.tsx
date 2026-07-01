"use client";

import { useRef } from "react";
import { Pencil, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { updateCurrentUserProfile } from "@/server/actions";

const inputClass =
  "vc-input";

const labelClass = "vc-label";

type EditableProfile = {
  name: string | null;
  handle: string | null;
  bio: string | null;
  primaryRoles: string[];
  toolsUsed: string[];
};

type ProfileEditDialogProps = {
  profile: EditableProfile;
};

export function ProfileEditDialog({ profile }: ProfileEditDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Pencil className="size-4" aria-hidden="true" />
        내 정보 수정
      </Button>

      <dialog
        ref={dialogRef}
        className="w-[min(92vw,560px)] border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-base font-semibold">내 정보 수정</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="닫기"
            onClick={() => dialogRef.current?.close()}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <form action={updateCurrentUserProfile} className="grid gap-3 p-4">
          <label className="grid gap-1">
            <span className={labelClass}>이름</span>
            <input
              className={inputClass}
              name="name"
              defaultValue={profile.name ?? profile.handle ?? ""}
              required
              autoComplete="name"
            />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>핸들</span>
            <input
              className={inputClass}
              name="handle"
              defaultValue={profile.handle ?? ""}
              required
              autoComplete="username"
            />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>소개</span>
            <textarea
              className={inputClass}
              name="bio"
              defaultValue={profile.bio ?? ""}
              rows={4}
            />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>역할</span>
            <input
              className={inputClass}
              name="primaryRoles"
              defaultValue={profile.primaryRoles.join(", ")}
              placeholder="Builder, Reviewer"
            />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>도구</span>
            <input
              className={inputClass}
              name="toolsUsed"
              defaultValue={profile.toolsUsed.join(", ")}
              placeholder="Codex, Cursor, Vercel"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialogRef.current?.close()}
            >
              취소
            </Button>
            <Button type="submit">
              <Save className="size-4" aria-hidden="true" />
              저장
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
