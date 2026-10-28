export const sources = {
  H1B: {
    label: "USCIS · H-1B filing checklist",
    url: "https://www.uscis.gov/sites/default/files/document/forms/m-735.pdf",
  },
  F1: {
    label: "U.S. Department of State · Student visas",
    url: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html",
  },
  FAMILY: {
    label: "USCIS · Form I-485 instructions",
    url: "https://www.uscis.gov/sites/default/files/document/forms/i-485instr.pdf",
  },
};
export const visaNames = {
  H1B: "H-1B · Specialty occupation",
  F1: "F-1 · Student visa",
  FAMILY: "Family-based · Adjustment of status",
};
export function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value
  );
}
const row = (id, title, detail, group, offset) => ({
  id,
  title,
  detail,
  group,
  offset,
});
export function checklist(profile) {
  if (!visaNames[profile.visa])
    throw new Error("Select a supported visa type.");
  const common = [
    row(
      "passport",
      "Valid passport",
      "Prepare a clear copy of the biographic page. Confirm validity for your application.",
      "Personal documents",
      -35,
    ),
  ];
  const sets = {
    H1B: [
      row(
        "i129",
        "Form I-129 and H classification supplement",
        "Employer or counsel prepares the petition and applicable supplements.",
        "Petition & employment",
        -21,
      ),
      row(
        "lca",
        "Certified Labor Condition Application",
        "Obtain the certified LCA from your sponsoring employer.",
        "Petition & employment",
        -28,
      ),
      row(
        "degree",
        "Degree certificates & transcripts",
        "Include credential evaluation when applicable to a foreign degree.",
        "Qualifications",
        -28,
      ),
      row(
        "job",
        "Job offer & specialty occupation evidence",
        "Employer support letter, duties, and evidence relating the role to your degree.",
        "Petition & employment",
        -21,
      ),
      row(
        "registration",
        "Registration selection notice, if applicable",
        "For a cap-subject filing, confirm registration selection and filing window with your employer.",
        "Petition & employment",
        -35,
      ),
    ],
    F1: [
      row(
        "i20",
        "Signed Form I-20",
        "Obtain your school-issued I-20 and check all personal and program details.",
        "School & application",
        -35,
      ),
      row(
        "ds160",
        "DS-160 confirmation page",
        "Complete the online nonimmigrant visa application for consular processing.",
        "School & application",
        -21,
      ),
      row(
        "sevis",
        "I-901 SEVIS fee receipt",
        "Check whether payment is required for your SEVIS record.",
        "School & application",
        -21,
      ),
      row(
        "funding",
        "Financial & academic evidence",
        "Prepare proof of available funds and academic preparation as requested by the consulate.",
        "Supporting evidence",
        -14,
      ),
      row(
        "photo",
        "Visa photograph & fee receipt",
        "Follow current consulate photo and application fee instructions.",
        "Supporting evidence",
        -14,
      ),
    ],
    FAMILY: [
      row(
        "i485",
        "Form I-485 & eligibility evidence",
        "Confirm your adjustment category, visa availability, and eligibility before filing.",
        "Application & eligibility",
        -35,
      ),
      row(
        "birth",
        "Birth certificate & certified translation",
        "Provide a qualifying birth record and full certified English translation where needed.",
        "Personal documents",
        -28,
      ),
      row(
        "petition",
        "Underlying petition evidence",
        "Include petition approval or concurrent-filing evidence where permitted.",
        "Application & eligibility",
        -28,
      ),
      row(
        "medical",
        "Form I-693, when required",
        "Follow current USCIS medical examination and sealed-envelope instructions.",
        "Supporting evidence",
        -21,
      ),
      row(
        "support",
        "Affidavit of Support, when required",
        "Confirm whether Form I-864 or an exemption applies to your category.",
        "Supporting evidence",
        -21,
      ),
      row(
        "photos",
        "Passport-style photographs",
        "Follow the current I-485 instructions for number and specifications.",
        "Personal documents",
        -14,
      ),
    ],
  };
  let items = [...common, ...sets[profile.visa]];
  if (profile.visa === "H1B" && profile.location === "outside")
    items.push(
      row(
        "consular",
        "Consular visa application documents",
        "After petition approval, check the consulate instructions for DS-160, photograph, fee receipt and interview evidence.",
        "Consular preparation",
        -14,
      ),
    );
  if (profile.location === "inside" && profile.visa !== "F1")
    items.push(
      row(
        "i94",
        "I-94 & current immigration status",
        "Include arrival/departure record and relevant status or approval notices.",
        "Personal documents",
        -28,
      ),
    );
  if (profile.dependents)
    items.push(
      row(
        "dependents",
        "Dependent identity & relationship records",
        "Prepare passports, marriage/birth records and applicable separate applications for each dependent.",
        "Family documents",
        -21,
      ),
    );
  if (profile.translations)
    items.push(
      row(
        "translations",
        "Certified English translations",
        "Include complete translations and translator certifications for non-English records.",
        "Supporting evidence",
        -14,
      ),
    );
  return items.map((item) => ({
    ...item,
    due: validDate(profile.target)
      ? new Date(
          Date.parse(profile.target + "T12:00:00Z") + item.offset * 86400000,
        )
          .toISOString()
          .slice(0, 10)
      : null,
    source: sources[profile.visa],
  }));
}
export function milestones(profile) {
  const items = checklist(profile);
  return [
    {
      id: "prepare",
      title: "Gather your documents",
      offset: -35,
      detail: "Collect identity records and check your personalized list.",
    },
    {
      id: "review",
      title: "Review your application",
      offset: -14,
      detail:
        "Review forms and evidence with your employer, school, or qualified counsel.",
    },
    {
      id: "submit",
      title:
        profile.visa === "F1"
          ? "Interview / application target"
          : "Application filing target",
      offset: 0,
      detail:
        "Your chosen planning date. Confirm any actual filing window separately.",
    },
  ].map((m) => ({
    ...m,
    due: items[0].due
      ? new Date(
          Date.parse(profile.target + "T12:00:00Z") + m.offset * 86400000,
        )
          .toISOString()
          .slice(0, 10)
      : null,
  }));
}
export function validateReceipt(value) {
  return typeof value === "string" && /^[A-Z]{3}\d{10}$/.test(value);
}
export function cosine(a, b) {
  if (a.length !== b.length) return 0;
  const dot = a.reduce((s, x, i) => s + x * b[i], 0);
  const norm = Math.sqrt(
    a.reduce((s, x) => s + x * x, 0) * b.reduce((s, x) => s + x * x, 0),
  );
  return norm ? dot / norm : 0;
}
export function chunks(text, size = 1300, overlap = 180) {
  const out = [];
  for (let i = 0; i < text.length; i += size - overlap) {
    out.push(text.slice(i, i + size));
    if (out.length >= 250) break;
  }
  return out;
}
