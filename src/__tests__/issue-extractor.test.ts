import { IssueExtractor } from '../issue-extractor';

describe('IssueExtractor', () => {
  let extractor: IssueExtractor;

  beforeEach(() => {
    extractor = new IssueExtractor();
  });

  describe('extractIssueKeys', () => {
    it('should extract JIRA issue keys from commit messages', () => {
      const commits = [
        { message: 'feat(auth): add login functionality ABC-123' },
        { message: 'fix: resolve bug in user service PROJ-456' },
        { message: 'docs: update README' }
      ];

      const result = extractor.extractIssueKeys(commits);
      expect(result).toEqual(['ABC-123', 'PROJ-456']);
    });

    it('should extract multiple issue keys from single commit', () => {
      const commits = [
        { message: 'feat: implement feature ABC-123 DEF-456 GHI-789' }
      ];

      const result = extractor.extractIssueKeys(commits);
      expect(result).toEqual(['ABC-123', 'DEF-456', 'GHI-789']);
    });

    it('should deduplicate issue keys', () => {
      const commits = [
        { message: 'feat: part 1 ABC-123' },
        { message: 'fix: part 2 ABC-123' }
      ];

      const result = extractor.extractIssueKeys(commits);
      expect(result).toEqual(['ABC-123']);
    });

    it('should return empty array when no issues found', () => {
      const commits = [
        { message: 'feat: add new feature' },
        { message: 'fix: resolve bug' }
      ];

      const result = extractor.extractIssueKeys(commits);
      expect(result).toEqual([]);
    });

    it('should work with custom pattern', () => {
      const customExtractor = new IssueExtractor('\\b(TASK|BUG)-\\d+\\b');
      const commits = [
        { message: 'feat: implement TASK-123 and fix BUG-456' },
        { message: 'ignored ABC-789' }
      ];

      const result = customExtractor.extractIssueKeys(commits);
      expect(result).toEqual(['TASK-123', 'BUG-456']);
    });
  });

  describe('extractFromText', () => {
    it('should extract issue keys from text', () => {
      const text = 'This fixes ABC-123 and resolves DEF-456';
      const result = extractor.extractFromText(text);
      expect(result).toEqual(['ABC-123', 'DEF-456']);
    });

    it('should return empty array for text without issues', () => {
      const text = 'This is just plain text';
      const result = extractor.extractFromText(text);
      expect(result).toEqual([]);
    });
  });
});