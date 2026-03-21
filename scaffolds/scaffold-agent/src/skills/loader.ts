/**
 * Skill loader for dynamic skill discovery and activation
 */

import { glob } from "glob";
import { readFile } from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type { Skill, SkillMetadata } from "../core/types.js";

export class SkillLoader {
  private skills: Map<string, Skill> = new Map();
  private skillsDirectory: string = "./src/skills";

  /**
   * Load all skills from a directory
   */
  async loadSkills(skillsDir?: string): Promise<void> {
    if (skillsDir) {
      this.skillsDirectory = skillsDir;
    }

    try {
      const skillFiles = await glob(`${this.skillsDirectory}/**/SKILL.md`);

      for (const file of skillFiles) {
        try {
          const skill = await this.parseSkill(file);
          this.skills.set(skill.name, skill);
        } catch (error) {
          console.error(`Failed to load skill from ${file}:`, error);
        }
      }

      console.log(`Loaded ${this.skills.size} skills`);
    } catch (error) {
      // Skills directory may not exist - that's ok
      console.log("No skills directory found, continuing without skills");
    }
  }

  /**
   * Parse a skill file
   */
  async parseSkill(filePath: string): Promise<Skill> {
    const content = await readFile(filePath, "utf-8");
    const { data, content: body } = matter(content);
    const metadata = data as SkillMetadata;

    const skillDir = path.dirname(filePath);
    const scripts = await this.loadScripts(path.join(skillDir, "scripts"));
    const references = await this.loadReferences(path.join(skillDir, "references"));

    return {
      name: metadata.name || path.basename(skillDir),
      description: metadata.description || "",
      version: metadata.version || "1.0.0",
      content: body,
      activationKeywords: metadata.activation_keywords || [],
      autoActivate: metadata.auto_activate ?? false,
      tokenBudget: metadata.token_budget || 2000,
      scripts,
      references,
    };
  }

  /**
   * Load scripts from a directory
   */
  private async loadScripts(scriptsDir: string): Promise<Map<string, string>> {
    const scripts = new Map<string, string>();

    try {
      const scriptFiles = await glob(`${scriptsDir}/*`);
      for (const file of scriptFiles) {
        const name = path.basename(file);
        const content = await readFile(file, "utf-8");
        scripts.set(name, content);
      }
    } catch {
      // Scripts directory may not exist
    }

    return scripts;
  }

  /**
   * Load references from a directory
   */
  private async loadReferences(refsDir: string): Promise<Map<string, string>> {
    const references = new Map<string, string>();

    try {
      const refFiles = await glob(`${refsDir}/*`);
      for (const file of refFiles) {
        const name = path.basename(file);
        const content = await readFile(file, "utf-8");
        references.set(name, content);
      }
    } catch {
      // References directory may not exist
    }

    return references;
  }

  /**
   * Get a skill by name
   */
  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * Get skill for context based on activation keywords
   */
  getSkillForContext(context: string): Skill | null {
    const contextLower = context.toLowerCase();

    for (const skill of this.skills.values()) {
      // Check auto-activate skills first
      if (skill.autoActivate) {
        for (const keyword of skill.activationKeywords) {
          if (contextLower.includes(keyword.toLowerCase())) {
            return skill;
          }
        }
      }
    }

    // Then check non-auto-activate skills
    for (const skill of this.skills.values()) {
      if (!skill.autoActivate) {
        for (const keyword of skill.activationKeywords) {
          if (contextLower.includes(keyword.toLowerCase())) {
            return skill;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get all loaded skills
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skill names
   */
  getSkillNames(): string[] {
    return Array.from(this.skills.keys());
  }

  /**
   * Check if a skill exists
   */
  hasSkill(name: string): boolean {
    return this.skills.has(name);
  }

  /**
   * Build skill prompt for agent
   */
  buildSkillPrompt(skill: Skill): string {
    let prompt = skill.content;

    // Append references if within token budget
    if (skill.references.size > 0) {
      prompt += "\n\n## References\n";
      for (const [name, content] of skill.references) {
        prompt += `\n### ${name}\n${content}\n`;
      }
    }

    return prompt;
  }

  /**
   * Clear all loaded skills
   */
  clear(): void {
    this.skills.clear();
  }
}

// Singleton loader
export const skillLoader = new SkillLoader();
