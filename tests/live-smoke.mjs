import fs from "node:fs/promises";
const base = "http://127.0.0.1:4317";
let r = await fetch(base + "/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message:
      "In one sentence, explain what a document checklist helps with. Do not give legal advice.",
    rag: false,
  }),
});
console.log(
  "Live Ollama chat",
  r.status,
  JSON.stringify(await r.json()).slice(0, 1200),
);
const data = new FormData();
data.append(
  "file",
  new Blob([
    "Waypoint integration test document. The preparation review phrase is green lantern. This document is a synthetic test fixture, not immigration guidance.",
  ]),
  "waypoint-qa-fixture.txt",
);
r = await fetch(base + "/api/documents", { method: "POST", body: data });
const uploaded = await r.json();
console.log(
  "Local embedding import",
  r.status,
  uploaded.error ||
    uploaded.documents.map((d) => ({ id: d.id, chunks: d.chunks })),
);
const fixture = uploaded.documents?.find(
  (d) => d.name === "waypoint-qa-fixture.txt",
);
if (fixture) {
  r = await fetch(base + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "What is the preparation review phrase in the test document?",
      rag: true,
    }),
  });
  console.log(
    "Live RAG answer",
    r.status,
    JSON.stringify(await r.json()).slice(0, 1800),
  );
  await fetch(base + "/api/documents/" + fixture.id, { method: "DELETE" });
}
