import { requireAuth } from "@/lib/auth";
import { SettingsService } from "@/services/settings.service";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireAuth();
  const settings = await SettingsService.getCompanySettings();

  return <SettingsClient settings={settings} user={session} />;
}
