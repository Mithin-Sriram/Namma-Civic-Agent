export interface CivicWorkflowStep {
  id: string;
  title: string;
  details: string;
  completed: boolean;
  sourceUrl?: string;
}

export interface CivicWorkflow {
  title: string;
  summary: string;
  steps: CivicWorkflowStep[];
}

export interface CivicWorkflowResponse {
  answer: string;
  workflow: CivicWorkflow;
}

export function parseCivicWorkflow(value: unknown): CivicWorkflow | undefined {
  if (value == null || typeof value !== "object") return undefined;
  const workflow = value as Partial<CivicWorkflow>;
  if (
    typeof workflow.title !== "string" ||
    typeof workflow.summary !== "string" ||
    !Array.isArray(workflow.steps) ||
    workflow.steps.length < 1 ||
    workflow.steps.length > 8
  ) {
    return undefined;
  }

  const steps: CivicWorkflowStep[] = [];
  for (const [index, value] of workflow.steps.entries()) {
    if (value == null || typeof value !== "object") return undefined;
    const step = value as Partial<CivicWorkflowStep>;
    if (
      typeof step.title !== "string" ||
      typeof step.details !== "string" ||
      step.title.trim().length === 0 ||
      step.details.trim().length === 0
    ) {
      return undefined;
    }

    const embeddedUrl = step.details.match(/https:\/\/[^\s)]+/)?.[0]?.replace(/[.,;]+$/, "");
    const sourceUrl = (typeof step.sourceUrl === "string"
      ? safeGovernmentUrl(step.sourceUrl)
      : undefined) ?? (embeddedUrl ? safeGovernmentUrl(embeddedUrl) : undefined);
    steps.push({
      id: `step-${index + 1}`,
      title: step.title.trim().slice(0, 160),
      details: step.details.trim().slice(0, 1_200),
      completed: step.completed === true,
      ...(sourceUrl ? { sourceUrl } : {}),
    });
  }

  return {
    title: workflow.title.trim().slice(0, 160),
    summary: workflow.summary.trim().slice(0, 600),
    steps,
  };
}

export function safeGovernmentUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      [".gov.in", ".nic.in"].some((suffix) =>
        url.hostname.toLowerCase().endsWith(suffix)
      )
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function parseCivicWorkflowMetadata(
  metadata: string | null | undefined
): CivicWorkflow | undefined {
  if (!metadata) return undefined;
  try {
    const value: unknown = JSON.parse(metadata);
    return value != null && typeof value === "object"
      ? parseCivicWorkflow((value as { workflow?: unknown }).workflow)
      : undefined;
  } catch {
    return undefined;
  }
}
