import { describe, expect, it } from "vitest";
import { parseRepoUrl } from "./github";

describe("GitHub API", () => {
  describe("parseRepoUrl", () => {
    it("should parse full GitHub URL", () => {
      const result = parseRepoUrl("https://github.com/vercel/next.js");
      expect(result).toEqual({ owner: "vercel", repo: "next.js" });
    });

    it("should parse GitHub URL without protocol", () => {
      const result = parseRepoUrl("github.com/facebook/react");
      expect(result).toEqual({ owner: "facebook", repo: "react" });
    });

    it("should parse owner/repo format", () => {
      const result = parseRepoUrl("microsoft/vscode");
      expect(result).toEqual({ owner: "microsoft", repo: "vscode" });
    });

    it("should remove .git suffix", () => {
      const result = parseRepoUrl("https://github.com/nodejs/node.git");
      expect(result).toEqual({ owner: "nodejs", repo: "node" });
    });

    it("should return null for invalid URL", () => {
      const result = parseRepoUrl("invalid-url");
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = parseRepoUrl("");
      expect(result).toBeNull();
    });
  });
});
