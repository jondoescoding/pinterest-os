import { getSettings } from "@/lib/settings";
import SettingsPanel from "./SettingsPanel";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <div className="page-head">
        <h1>Settings</h1>
        <p>Defaults for the Pinterest pipeline and the 30-image batch.</p>
      </div>
      <SettingsPanel initialSettings={settings} />
    </div>
  );
}
