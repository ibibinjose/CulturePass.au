import { useMemo, useState } from "react";
import { Switch, View } from "react-native";
import { useRouter } from "expo-router";

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
import { useCreateHub } from "@/features/hubs/api";
import { getCurrentProfileId } from "@/features/auth/api";
import {
  useHubDraftStore,
  HUB_WIZARD_STEPS,
  type HubDraft,
} from "@/features/hubs/useHubDraftStore";

export default function CreateHubWizard() {
  const router = useRouter();
  const { step, draft, next, back, setStep, update, reset } = useHubDraftStore();
  const createHub = useCreateHub();
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canContinue = useMemo(() => stepIsValid(step, draft), [step, draft]);
  const isLast = step === HUB_WIZARD_STEPS.length - 1;

  async function submit(publish: boolean) {
    setBanner(null);
    
    // Validate draft before submission
    const schema = publish ? hubPublishSchema : hubDraftSchema;
    const parsed = schema.safeParse({ ...draft });
    if (!parsed.success) {
      setBanner(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setSubmitting(true);
    try {
      const ownerId = await getCurrentProfileId();
      if (!ownerId) {
        setBanner("Sign in to save your hub — accounts are coming in the next step.");
        return;
      }
      const created = await createHub.mutateAsync(buildInsert(draft, ownerId, publish));
      reset();
      router.replace(`/hub/${created.slug}`);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen maxWidth="form" contentClassName="pt-10">
      <View className="mb-6 flex-row items-center justify-between">
        <Button
          label="← Back"
          variant="ghost"
          size="sm"
          onPress={() => (step === 0 ? router.back() : back())}
        />
        <Text variant="overline" tone="ochre">
          New Hub
        </Text>
      </View>

      <Stepper steps={HUB_WIZARD_STEPS} current={step} className="mb-8" />

      {step === 0 && <StepType draft={draft} update={update} />}
      {step === 1 && <StepIdentity draft={draft} update={update} />}
      {step === 2 && <StepPlace draft={draft} update={update} />}
      {step === 3 && <StepCulture draft={draft} update={update} />}
      {step === 4 && <StepReview draft={draft} update={update} onEditStep={setStep} />}

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
              label="Publish hub"
              loading={submitting}
              onPress={() => submit(true)}
            />
            <Button
              label="Save as draft"
              variant="outline"
              disabled={submitting}
              onPress={() => submit(false)}
            />
          </>
        ) : (
          <Button label="Continue" disabled={!canContinue} onPress={next} />
        )}
        <Text variant="caption" tone="faint" className="text-center">
          Your progress saves automatically on this device.
        </Text>
      </View>
    </Screen>
  );
}

// --- step validation gate (lightweight; full Zod runs on submit) -------------
function stepIsValid(step: number, draft: HubDraft): boolean {
  switch (step) {
    case 0:
      return !!draft.type;
    case 1:
      return draft.name.trim().length >= 2;
    case 2:
      return !!draft.location_state && !!draft.location_council_id;
    default:
      return true;
  }
}

// --- Step 1: Type ------------------------------------------------------------
function StepType({ draft, update }: StepProps) {
  return (
    <View className="gap-4">
      <StepHeading
        title="What kind of hub is this?"
        subtitle="Choose the category that fits best. You can refine details later."
      />
      <View className="gap-3">
        {HUB_TYPES.map((type) => (
          <OptionCard
            key={type}
            title={HUB_TYPE_LABELS[type]}
            description={HUB_TYPE_DESCRIPTIONS[type]}
            selected={draft.type === type}
            onPress={() => update({ type })}
          />
        ))}
      </View>
    </View>
  );
}

// --- Step 2: Identity --------------------------------------------------------
function StepIdentity({ draft, update }: StepProps) {
  return (
    <View className="gap-6">
      <StepHeading title="Name & describe your hub" />
      <Field label="Name">
        <Input
          value={draft.name}
          onChangeText={(name) => update({ name })}
          placeholder="e.g. Wiradjuri Cultural Collective"
        />
      </Field>
      <Field
        label="One-line description"
        helper={`${draft.short_description.length}/160 — shown on cards`}
      >
        <Input
          value={draft.short_description}
          onChangeText={(short_description) =>
            update({ short_description: short_description.slice(0, 160) })
          }
          placeholder="A short, welcoming summary"
        />
      </Field>
      <Field label="Full description" optional>
        <Input
          value={draft.full_description}
          onChangeText={(full_description) => update({ full_description })}
          placeholder="Tell people who you are and what you do…"
          multiline
        />
      </Field>
      <Field label="Hub Images" optional>
        <ImagePickerComponent
          currentImageUrl={draft.images?.[0]?.url ?? null}
          onImageChange={(url) => {
            if (url) {
              update({ images: [{ url, type: "cover", alt: "Hub cover image" }] });
            } else {
              update({ images: [] });
            }
          }}
          imageType="hub"
          folderPath="hub-images"
          label="Upload Hub Image"
          helperText="Add a cover image for your hub"
        />
      </Field>
    </View>
  );
}

// --- Step 3: Place -----------------------------------------------------------
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

      <View className="flex-row gap-3">
        <Field label="City / Suburb" optional className="flex-1">
          <Input
            value={draft.location_city}
            onChangeText={(location_city) => update({ location_city })}
            placeholder="e.g. Dubbo"
          />
        </Field>
        <Field label="Postcode" optional className="w-32">
          <Input
            value={draft.location_postcode}
            onChangeText={(location_postcode) =>
              update({ location_postcode: location_postcode.replace(/\D/g, "").slice(0, 4) })
            }
            placeholder="2830"
            keyboardType="number-pad"
          />
        </Field>
      </View>

      <Field label="Address" optional>
        <Input
          value={draft.address}
          onChangeText={(address) => update({ address })}
          placeholder="Street address"
        />
      </Field>
    </View>
  );
}

// --- Step 4: Culture ---------------------------------------------------------
function StepCulture({ draft, update }: StepProps) {
  return (
    <View className="gap-6">
      <StepHeading
        title="Culture & Country"
        subtitle="Share a Welcome to Country and recognise Traditional Custodians. Please use only language you have permission to share."
      />

      <Card className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text variant="subheading">This hub is Indigenous-led</Text>
          <Text variant="caption" tone="muted" className="mt-1">
            Led and governed by First Nations people.
          </Text>
        </View>
        <Switch
          value={draft.indigenous_led}
          onValueChange={(indigenous_led) => update({ indigenous_led })}
          trackColor={{ true: "#1C1815", false: "#EDE4D6" }}
          thumbColor="#FAF6EF"
        />
      </Card>

      <Field
        label="Welcome to Country"
        helper="A Welcome to Country is offered by Traditional Owners. Only include one you are authorised to share."
        optional
      >
        <Input
          value={draft.welcome_to_country}
          onChangeText={(welcome_to_country) => update({ welcome_to_country })}
          placeholder="Add a Welcome to Country statement…"
          multiline
        />
      </Field>

      <Field label="Traditional Custodians" optional>
        <TagInput
          value={draft.traditional_custodians}
          onChange={(traditional_custodians) => update({ traditional_custodians })}
          placeholder="e.g. Wiradjuri"
        />
      </Field>

      <Field label="Indigenous partners" optional>
        <TagInput
          value={draft.indigenous_partners}
          onChange={(indigenous_partners) => update({ indigenous_partners })}
          placeholder="Partner groups or organisations"
        />
      </Field>
    </View>
  );
}

// --- Step 5: Review ----------------------------------------------------------
function StepReview({
  draft,
  update,
  onEditStep,
}: StepProps & { onEditStep: (step: number) => void }) {
  return (
    <View className="gap-6">
      <StepHeading title="Contact & review" subtitle="Add ways to reach you, then publish." />

      <Field label="Website" optional>
        <Input
          value={draft.website}
          onChangeText={(website) => update({ website })}
          placeholder="https://"
          autoCapitalize="none"
          keyboardType="url"
        />
      </Field>
      <Field label="Contact email" optional>
        <Input
          value={draft.contact_email}
          onChangeText={(contact_email) => update({ contact_email })}
          placeholder="hello@example.org"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </Field>
      <Field label="Phone" optional>
        <Input
          value={draft.phone}
          onChangeText={(phone) => update({ phone })}
          placeholder="02 1234 5678"
          keyboardType="phone-pad"
        />
      </Field>
      <Field label="Tags" optional>
        <TagInput
          value={draft.tags}
          onChange={(tags) => update({ tags })}
          placeholder="Add searchable tags"
        />
      </Field>

      <Card elevated className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text variant="overline" tone="faint">
            Summary
          </Text>
          <Button label="Edit" variant="ghost" size="sm" onPress={() => onEditStep(0)} />
        </View>
        <Text variant="subheading">{draft.name || "Untitled hub"}</Text>
        <Text variant="caption" tone="muted">
          {draft.type ? HUB_TYPE_LABELS[draft.type] : "No type"} ·{" "}
          {draft.location_state ?? "No location"}
        </Text>
        {draft.short_description ? (
          <Text variant="caption" tone="muted">
            {draft.short_description}
          </Text>
        ) : null}
      </Card>
    </View>
  );
}

// --- shared bits -------------------------------------------------------------
interface StepProps {
  draft: HubDraft;
  update: (patch: Partial<HubDraft>) => void;
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

function buildInsert(draft: HubDraft, ownerId: string, publish: boolean) {
  const orNull = (v: string) => (v.trim().length > 0 ? v.trim() : null);

  return {
    owner_id: ownerId,
    type: draft.type!,
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
    images: draft.images ?? [],
    tags: draft.tags,
    status: publish ? ("published" as const) : ("draft" as const),
  };
}