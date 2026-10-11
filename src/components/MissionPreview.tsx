/** Live Mission JSON v1 preview and validation issue panel. */
import type { MissionIssue } from "../mission/types";

export interface MissionPreviewProps {
  json: string;
  issues: readonly MissionIssue[];
}

export function MissionPreview({ json, issues }: MissionPreviewProps) {
  return (
    <div className="panel" data-testid="mission-preview">
      <h2>Mission JSON v1</h2>
      {issues.length > 0 ? (
        <ul className="validation-list" data-testid="validation-errors">
          {issues.map((issue) => (
            <li key={`${issue.path}:${issue.message}`}>
              {issue.path}: {issue.message}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#98c379", margin: "0 0 0.4rem", fontSize: "0.85rem" }}>
          valid — mavctl re-validates on dry-run/upload
        </p>
      )}
      <pre className="json-preview" data-testid="json-preview">
        {json}
      </pre>
    </div>
  );
}
