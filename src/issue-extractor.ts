export class IssueExtractor {
  private issuePattern: RegExp;

  constructor(pattern?: string) {
    // Default pattern matches common JIRA issue formats like ABC-123, PROJ-456
    if (pattern) {
      this.issuePattern = new RegExp(pattern, 'g');
    } else {
      this.issuePattern = /\b[A-Z][A-Z0-9]*-\d+\b/g;
    }
  }

  extractIssueKeys(commits: Array<{ message: string }>): string[] {
    const issueKeys = new Set<string>();
    
    for (const commit of commits) {
      const matches = commit.message.match(this.issuePattern);
      if (matches) {
        matches.forEach(match => issueKeys.add(match));
      }
    }

    return Array.from(issueKeys);
  }

  extractFromText(text: string): string[] {
    const matches = text.match(this.issuePattern);
    return matches ? Array.from(new Set(matches)) : [];
  }
}