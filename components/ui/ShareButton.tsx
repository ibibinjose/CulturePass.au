import { useState } from "react";
import { View } from "react-native";

import { Button, type ButtonProps } from "./Button";
import { Icon } from "./Icon";
import { colors } from "@/lib/theme";
import { shareContent, copyText, shareUrl } from "@/lib/share";

const SOLID = new Set(["primary", "secondary", "danger", "whatsapp"]);

interface ShareButtonProps {
  /** In-app path to share, e.g. "/l/profile/123". */
  path: string;
  title?: string;
  message?: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}

/** Triggers the native share sheet / Web Share API for an in-app path. */
export function ShareButton({
  path,
  title,
  message,
  label = "Share",
  variant = "outline",
  size = "sm",
  className,
}: ShareButtonProps) {
  const iconColor = SOLID.has(variant ?? "outline") ? colors.paper : colors.ink;
  return (
    <Button
      label={label}
      variant={variant}
      size={size}
      className={className}
      leftIcon={<Icon name="share" size={size === "sm" ? 15 : 17} color={iconColor} />}
      accessibilityLabel={`Share ${title ?? "link"}`}
      onPress={() => shareContent({ url: shareUrl(path), title, message })}
    />
  );
}

interface CopyLinkButtonProps {
  path: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}

/** Copies the absolute link to the clipboard with brief "Copied" feedback. */
export function CopyLinkButton({
  path,
  label = "Copy link",
  variant = "ghost",
  size = "sm",
  className,
}: CopyLinkButtonProps) {
  const [state, setState] = useState<"idle" | "copied">("idle");

  async function handle() {
    const result = await copyText(shareUrl(path));
    if (result === "copied") {
      setState("copied");
      setTimeout(() => setState("idle"), 1800);
    }
  }

  return (
    <Button
      label={state === "copied" ? "Copied ✓" : label}
      variant={variant}
      size={size}
      className={className}
      onPress={handle}
    />
  );
}

/** Share + Copy link side by side — used on link-in-bio and card pages. */
export function ShareBar({
  path,
  title,
  message,
  className,
}: {
  path: string;
  title?: string;
  message?: string;
  className?: string;
}) {
  return (
    <View className={className}>
      <View className="flex-row gap-3">
        <ShareButton
          path={path}
          title={title}
          message={message}
          variant="primary"
          className="flex-1"
        />
        <CopyLinkButton path={path} variant="outline" className="flex-1" />
      </View>
    </View>
  );
}
