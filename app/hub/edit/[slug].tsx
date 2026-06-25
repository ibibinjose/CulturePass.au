import { useEffect, useMemo, useState } from "react";
import { Switch, View, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { OptionCard } from "@/components/ui/OptionCard";
import { Stepper } from "@/components/ui/Stepper";
import { TagInput } from "@/components/ui/TagInput";
import { ImagePickerComponent } from "@/components/ui/ImagePicker";

import {
  HUB_TYPES,
  HUB_TYPE_LABELS,
  HUB_TYPE_DESCRIPTIONS,
  AUSTRALIAN_STATES,
} from "@/lib/constants";
import { hubDraftSchema, hubPublishSchema } from "@/lib/validation/hub";
import { useCouncils } from "@/features/reference/api";
import { useHub } from "@/features/hubs/api";
import { useUpdateHub, useDeleteHub } from "@/features/hubs/api";
import { useMyProfile } from "@/features/profiles/api";
import { getCurrentProfileId } from "@/features/auth/api";

export default function EditHubScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: profile } = useMyProfile();
  const { data: hub, isLoading: hubLoading } = useHub(slug || '');
  const updateHub = useUpdateHub();
  const deleteHub = useDeleteHub();
  
  const [step, setStep] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Initialize form with hub data
  const [form, setForm] = useState({
    type: hub?.type || undefined,
    name: hub?.name || '',
    short_description: hub?.short_description || '',
    full_description: hub?.full_description || '',

    welcome_to_country: hub?.welcome_to_country || '',
    traditional_custodians: hub?.traditional_custodians || [],
    indigenous_led: hub?.indigenous_led || false,
    indigenous_partners: hub?.indigenous_partners || [],

    location_state: hub?.location_state || undefined,
    location_council_id: hub?.location_council_id || undefined,
    location_city: hub?.location_city || '',
    location_postcode: hub?.location_postcode || '',
    address: hub?.address || '',
    website: hub?.website || '',
    contact_email: hub?.contact_email || '',
    phone: hub?.phone || '',
    tags: hub?.tags || [],
    images: hub?.images ? (Array.isArray(hub.images) ? hub.images : []) : [],
  });

  useEffect(() => {
    if (hub) {
      setForm({
        type: hub.type,
        name: hub.name,
        short_description: hub.short_description || '',
        full_description: hub.full_description || '',
        welcome_to_country: hub.welcome_to_country || '',
        traditional_custodians: hub.traditional_custodians || [],
        indigenous_led: hub.indigenous_led || false,
        indigenous_partners: hub.indigenous_partners || [],
        location_state: hub.location_state || undefined,
        location_council_id: hub.location_council_id || undefined,
        location_city: hub.location_city || '',
        location_postcode: hub.location_postcode || '',
        address: hub.address || '',
        website: hub.website || '',
        contact_email: hub.contact_email || '',
        phone: hub.phone || '',
        tags: hub.tags || [],
        images: hub.images ? (Array.isArray(hub.images) ? hub.images : []) : [],
      });
    }
  }, [hub]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const HUB_WIZARD_STEPS = ["Type", "Identity", "Place", "Culture", "Review"] as const;
  const isLast = step === HUB_WIZARD_STEPS.length - 1;

  // Check if user can edit this hub (must be the owner)
  const canEdit = profile && hub && hub.owner_id === profile.id;

  if (!canEdit && !hubLoading) {
    return (
      <Screen maxWidth="form" contentClassName="pt-10">
        <Button
          label="← Back"
          variant="ghost"
          size="sm"
          className="mb-6 self-start"
          onPress={() => router.back()}
        />
        <Card>
          <Text variant="subheading">Access Denied</Text>
          <Text variant="caption" tone="muted" className="mt-1">
            You don't have permission to edit this hub.
          </Text>
          <Button
            label="Go back"
            variant="secondary"
            className="mt-4 self-start"
            onPress={() => router.back()}
          />
        </Card>
      </Screen>
    );
  }

  async function submit(publish: boolean) {
    setBanner(null);
    const schema = publish ? hubPublishSchema : hubDraftSchema;
    const parsed = schema.safeParse({ ...form });
    if (!parsed.success) {
      setBanner(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    if (!hub) {
      setBanner("Hub not loaded");
      return;
    }

    setSubmitting(true);
    try {
      // Convert images array to JSON format for Supabase
      const formData = {
        ...buildUpdate(form, publish),
        images: JSON.stringify(parsed.data.images),
      };

      await updateHub.mutateAsync({
        id: hub.id,
        patch: formData,
      });
      router.replace(`/hub/${hub.slug}`);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const confirmAndDelete = () => {
    if (!hub) return;
    
    Alert.alert(
      "Delete Hub",
      `Are you sure you want to delete "${hub.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteHub.mutateAsync(hub.id);
              router.replace('/my-hubs'); // Redirect to user's hubs page
            } catch (err) {
              setBanner(err instanceof Error ? err.message : "Failed to delete hub.");
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  // Validation for each step
  const stepIsValid = (step: number, formData: typeof form): boolean => {
    switch (step) {
      case 0: // Type
        return !!formData.type;
      case 1: // Identity
        return formData.name.trim().length >= 2 && formData.short_description.trim().length >= 10;
      case 2: // Place
        return true; // All fields are optional except for publishing
      case 3: // Culture
        return true; // All fields are optional
      case 4: // Review
        return true; // Validation happens on submit
      default:
        return false;
    }
  };

  const canContinue = useMemo(() => stepIsValid(step, form), [step, form]);

  return (
    <Screen maxWidth="form" contentClassName="pt-10">
      <View className="mb-6 flex-row items-center justify-between">
        <Button
          label="← Back"
          variant="ghost"
          size="sm"
          onPress={() => (step === 0 ? router.back() : setStep(step - 1))}
        />
        <Text variant="overline" tone="ochre">
          Edit Hub
        </Text>
      </View>

      <Stepper steps={HUB_WIZARD_STEPS} current={step} className="mb-8" />

      {step === 0 && (
        <View className="gap-6">
          <StepHeading
            title="What type of hub is this?"
            subtitle="Choose the category that best describes your hub."
          />

          <View className="gap-3">
            {HUB_TYPES.map((type) => (
              <OptionCard
                key={type}
                title={HUB_TYPE_LABELS[type]}
                description={HUB_TYPE_DESCRIPTIONS[type]}
                selected={form.type === type}
                onPress={() => set({ type })}
              />
            ))}
          </View>
        </View>
      )}

      {step === 1 && (
        <View className="gap-6">
          <StepHeading
            title="Tell us about your hub"
            subtitle="Share the basics so people can discover and connect with your hub."
          />

          <Field label="Hub name">
            <Input
              value={form.name}
              onChangeText={(name) => set({ name })}
              placeholder="e.g. Sydney Community Arts Collective"
            />
          </Field>

          <Field label="One-line description">
            <Input
              value={form.short_description}
              onChangeText={(short_description) => set({ short_description })}
              placeholder="Briefly describe your hub in one line"
              maxLength={160}
              multiline
            />
          </Field>

          <Field label="Full description" optional>
            <Input
              value={form.full_description}
              onChangeText={(full_description) => set({ full_description })}
              placeholder="Tell the full story of your hub…"
              multiline
            />
          </Field>

          <Field label="Images" optional>
            <ImagePickerComponent
              currentImageUrl={form.images.length > 0 ? form.images[0].url : null}
              onImageChange={(url) => {
                if (url) {
                  set({ images: [{ url, alt: "Hub image" }] });
                } else {
                  set({ images: [] });
                }
              }}
              imageType="hub"
              folderPath="hub-images"
              label="Upload Hub Image"
              helperText="Add a cover image for your hub"
            />
          </Field>

          <Field label="Tags" optional>
            <TagInput
              value={form.tags}
              onChange={(tags) => set({ tags })}
              placeholder="Add searchable tags"
            />
          </Field>
        </View>
      )}

      {step === 2 && <StepPlace draft={form} update={set} />}

      {step === 3 && <StepCulture draft={form} update={set} />}

      {step === 4 && (
        <View>
          <StepHeading title="Review your hub" />
          <Card elevated className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text variant="overline" tone="faint">
                Summary
              </Text>
              <Button label="Edit" variant="ghost" size="sm" onPress={() => setStep(0)} />
            </View>
            <Text variant="subheading">{form.name || "Untitled hub"}</Text>
            <Text variant="caption" tone="muted">
              {form.type ? HUB_TYPE_LABELS[form.type] : "No type"} ·{" "}
              {form.location_state ?? "No location"}
            </Text>
            {form.short_description ? (
              <Text variant="caption" tone="muted">
                {form.short_description}
              </Text>
            ) : null}
          </Card>
        </View>
      )}

      {banner ? (
        <Card className="mt-6 border-danger/30 bg-terracotta-50">
          <Text variant="caption" className="text-terracotta-600">
            {banner}
          </Text>
        </Card>
      ) : null}

      <View className="mt-8 gap-3">
        {isLast ? (
          <>
            <Button
              label="Update hub"
              loading={submitting}
              onPress={() => submit(hub?.status === 'published')}
            />
            <Button
              label="Save as draft"
              variant="outline"
              disabled={submitting}
              onPress={() => submit(false)}
            />
          </>
        ) : (
          <Button label="Continue" disabled={!canContinue} onPress={() => setStep(step + 1)} />
        )}
      </View>

      {/* Delete button for the last step */}
      {isLast && (
        <View className="mt-6 pt-6 border-t border-sand">
          <Text variant="caption" tone="muted" className="mb-2">
            Danger zone
          </Text>
          <Button
            label="Delete this hub"
            variant="danger"
            size="sm"
            disabled={deleting}
            loading={deleting}
            onPress={confirmAndDelete}
          />
        </View>
      )}
    </Screen>
  );
}

// --- shared bits -------------------------------------------------------------
interface StepProps {
  draft: any;
  update: (patch: Partial<any>) => void;
}

function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text variant="title">{title}</Text>
      {subtitle ? (
        <Text variant="body" tone="muted" className="mt-3">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function StepPlace({ draft, update }: StepProps) {
  const { data: councils, isLoading } = useCouncils(draft.location_state);
  const [councilSearch, setCouncilSearch] = useState("");

  const filtered = useMemo(() => {
    const list = councils ?? [];
    const q = councilSearch.trim().toLowerCase();
    const matches = q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
    return matches.slice(0, 8);
  }, [councils, councilSearch]);

  return (
    <View className="gap-6">
      <StepHeading
        title="Where is your hub based?"
        subtitle="Location powers discovery and connects your hub to its Country."
      />

      <Field label="State or territory">
        <View className="flex-row flex-wrap gap-2">
          {AUSTRALIAN_STATES.map((s) => (
            <Chip
              key={s.code}
              label={s.code}
              selected={draft.location_state === s.code}
              onPress={() =>
                update({ location_state: s.code, location_council_id: undefined })
              }
            />
          ))}
        </View>
      </Field>

      {draft.location_state ? (
        <Field label="Council (Local Government Area)">
          <Input
            value={councilSearch}
            onChangeText={setCouncilSearch}
            placeholder="Search councils…"
          />
          <View className="mt-2 gap-2">
            {isLoading ? (
              <Text variant="caption" tone="faint">
                Loading councils…
              </Text>
            ) : filtered.length === 0 ? (
              <Text variant="caption" tone="faint">
                No councils match — connect Supabase to load reference data.
              </Text>
            ) : (
              filtered.map((c) => (
                <OptionCard
                  key={c.id}
                  title={c.name}
                  selected={draft.location_council_id === c.id}
                  onPress={() => update({ location_council_id: c.id })}
                />
              ))
            )}
          </View>
        </Field>
      ) : null}

      <Field label="City or town" optional>
        <Input
          value={draft.location_city}
          onChangeText={(location_city) => update({ location_city })}
          placeholder="e.g. Surry Hills"
        />
      </Field>

      <Field label="Postcode" optional>
        <Input
          value={draft.location_postcode}
          onChangeText={(location_postcode) => update({ location_postcode })}
          placeholder="e.g. 2010"
          maxLength={4}
          keyboardType="number-pad"
        />
      </Field>

      <Field label="Street address" optional>
        <Input
          value={draft.address}
          onChangeText={(address) => update({ address })}
          placeholder="Street address (optional)"
        />
      </Field>

      <Field label="Contact details" optional>
        <Input
          value={draft.website}
          onChangeText={(website) => update({ website })}
          placeholder="Website URL"
          autoCapitalize="none"
          keyboardType="url"
        />
      </Field>

      <View className="flex-row gap-3">
        <Field label="Email" optional className="flex-1">
          <Input
            value={draft.contact_email}
            onChangeText={(contact_email) => update({ contact_email })}
            placeholder="contact@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </Field>
        <Field label="Phone" optional className="flex-1">
          <Input
            value={draft.phone}
            onChangeText={(phone) => update({ phone })}
            placeholder="Phone number"
          />
        </Field>
      </View>
    </View>
  );
}

function StepCulture({ draft, update }: StepProps) {
  return (
    <View className="gap-6">
      <StepHeading
        title="Acknowledge the Traditional Custodians"
        subtitle="Help visitors understand the Country your hub sits on."
      />

      <Field label="Traditional Custodians" optional>
        <TagInput
          value={draft.traditional_custodians}
          onChange={(traditional_custodians) => update({ traditional_custodians })}
          placeholder="e.g. Gadigal people of the Eora Nation"
        />
      </Field>

      <Field label="Welcome to Country" optional>
        <Input
          value={draft.welcome_to_country}
          onChangeText={(welcome_to_country) => update({ welcome_to_country })}
          placeholder="Share a Welcome to Country statement…"
          multiline
        />
      </Field>

      <Field label="Indigenous-led?" optional>
        <View className="flex-row items-center justify-between">
          <Text variant="body">Is this hub Indigenous-led?</Text>
          <Switch
            value={draft.indigenous_led}
            onValueChange={(indigenous_led) => update({ indigenous_led })}
          />
        </View>
      </Field>

      <Field label="Indigenous partners" optional>
        <TagInput
          value={draft.indigenous_partners}
          onChange={(indigenous_partners) => update({ indigenous_partners })}
          placeholder="Names of Indigenous partner organisations"
        />
      </Field>
    </View>
  );
}

function buildUpdate(draft: any, publish: boolean) {
  const orNull = (v: string) => (v.trim().length > 0 ? v.trim() : null);
  return {
    type: draft.type,
    name: draft.name.trim(),
    short_description: draft.short_description.trim(),
    full_description: orNull(draft.full_description),
    welcome_to_country: orNull(draft.welcome_to_country),
    traditional_custodians: draft.traditional_custodians,
    indigenous_led: draft.indigenous_led,
    indigenous_partners: draft.indigenous_partners,
    location_state: draft.location_state ?? null,
    location_council_id: draft.location_council_id ?? null,
    location_city: orNull(draft.location_city),
    location_postcode: orNull(draft.location_postcode),
    address: orNull(draft.address),
    website: orNull(draft.website),
    contact_email: orNull(draft.contact_email),
    phone: orNull(draft.phone),
    images: draft.images,
    tags: draft.tags,
    status: publish ? ("published" as const) : ("draft" as const),
  };
}