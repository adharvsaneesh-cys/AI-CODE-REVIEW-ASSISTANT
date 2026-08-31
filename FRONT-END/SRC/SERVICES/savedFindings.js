const STORAGE_KEY =
  "codeguardSavedFindings";

export function getSavedFindings() {
  try {
    const stored =
      localStorage.getItem(
        STORAGE_KEY,
      );

    if (!stored) {
      return [];
    }

    const parsed =
      JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function saveFinding(
  finding,
) {
  const current =
    getSavedFindings();

  const id =
    finding.savedId ||
    `${finding.ruleId || "finding"}-${finding.fileName || "file"}-${finding.line || 0}`;

  const alreadyExists =
    current.some(
      (item) =>
        item.savedId === id,
    );

  if (alreadyExists) {
    return {
      saved: false,
      duplicate: true,
      findings: current,
    };
  }

  const savedFinding = {
    ...finding,

    savedId: id,

    savedAt:
      new Date().toISOString(),
  };

  const updated = [
    savedFinding,
    ...current,
  ];

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updated),
  );

  return {
    saved: true,
    duplicate: false,
    findings: updated,
  };
}

export function removeSavedFinding(
  savedId,
) {
  const updated =
    getSavedFindings().filter(
      (finding) =>
        finding.savedId !==
        savedId,
    );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updated),
  );

  return updated;
}

export function clearSavedFindings() {
  localStorage.removeItem(
    STORAGE_KEY,
  );

  return [];
}

export function isFindingSaved({
  ruleId,
  fileName,
  line,
}) {
  const id =
    `${ruleId || "finding"}-${fileName || "file"}-${line || 0}`;

  return getSavedFindings().some(
    (finding) =>
      finding.savedId === id,
  );
}