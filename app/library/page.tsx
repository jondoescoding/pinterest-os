import { listContent } from "@/lib/content";
import { listSchedulesForContent } from "@/lib/schedules";
import LibraryView from "./LibraryView";

// Server component: read content items straight from the DB (no fetch waterfall);
// the client island handles the state filter + per-row delete.
export default async function LibraryPage() {
  const items = await listContent();
  const schedules = await listSchedulesForContent(items.map((item) => item.id));

  return (
    <div>
      <div className="page-head">
        <h1>Content library</h1>
        <p>Everything you've created — draft, scheduled, and posted.</p>
      </div>
      <LibraryView items={items} schedules={schedules} />
    </div>
  );
}
