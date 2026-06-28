import { useRouter } from "expo-router";
import {
  Button,
} from "@/components/ui";
import { useMyProfile } from "@/features/profiles/api";

interface CreateEventButtonProps {
  hubId: string;
  hubOwnerId: string;
  label?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CreateEventButton({
  hubId,
  hubOwnerId,
  label = "+ Create Event",
  variant = "primary",
  size = "md",
  className,
}: CreateEventButtonProps) {
  const router = useRouter();
  const { data: profile } = useMyProfile();
  
  // Check if the current user is the hub owner or has editor rights
  const canCreateEvent = profile && hubOwnerId === profile.id;

  if (!canCreateEvent) {
    return null; // Don't render if user doesn't have permission
  }

  return (
    <Button
      label={label}
      variant={variant}
      size={size}
      className={className}
      onPress={() => router.push(`/create/event?hubId=${hubId}`)}
    />
  );
}