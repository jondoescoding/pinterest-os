// GET /api/surfaces - agent-readable map of app surfaces and backing endpoints.
export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    surfaces: [
      {
        id: "overview",
        href: "/",
        endpoint: "/api/overview",
        description: "Global dashboard metrics and recent activity.",
      },
      {
        id: "campaigns",
        href: "/campaigns",
        endpoint: "/api/campaigns",
        description: "Campaign list and CRUD entrypoint.",
      },
      {
        id: "campaign-workspace",
        href: "/campaigns/{campaignId}",
        endpoint: "/api/campaigns/{campaignId}/workspace",
        tabs: ["overview", "content", "calendar", "generation", "settings"],
        description:
          "Campaign-specific content, Postiz calendar, generation sets, and settings.",
      },
      {
        id: "library",
        href: "/library",
        endpoint: "/api/content",
        description:
          "All generated content across campaigns. Filter with campaignId and state.",
      },
      {
        id: "calendar",
        href: "/calendar",
        endpoint: "/api/calendar",
        description:
          "Postiz calendar posts for a date range; optional campaignId filter.",
      },
      {
        id: "settings",
        href: "/settings",
        endpoint: "/api/settings",
        description: "Global defaults applied when a campaign has no override.",
      },
      {
        id: "generation-sets",
        href: "/campaigns/{campaignId}?tab=generation",
        endpoint: "/api/generation-sets?campaignId={campaignId}",
        executeEndpoint: "/api/generation-sets/{generationSetId}/generate",
        description:
          "Reusable generation presets. Generate drafts by default; schedule only when explicitly requested.",
      },
    ],
  });
}
