import { IPlaybookRepository } from "../domain/repositories/IPlaybookRepository.ts";
import { Methodology } from "../domain/entities/Methodology.ts";
import { ToneProfile } from "../domain/entities/ToneProfile.ts";
import { IDatabase } from "../../../shared/infrastructure/db/D1Database.ts";

export class D1PlaybookRepository implements IPlaybookRepository {
  constructor(private readonly db: IDatabase) {}

  public async getAllMethodologies(): Promise<Methodology[]> {
    const rows = await this.db.query<any>("SELECT * FROM methodologies ORDER BY category ASC, name ASC");
    return rows.map((r) =>
      Methodology.create(
        {
          name: r.name,
          category: r.category,
          description: r.description,
          formula: r.formula,
          templateExample: r.template_example,
          createdAt: new Date(r.created_at)
        },
        r.id
      ).getValue()
    );
  }

  public async getMethodologyById(id: string): Promise<Methodology | null> {
    const rows = await this.db.query<any>("SELECT * FROM methodologies WHERE id = ?", [id]);
    const r = rows.find((row) => row.id === id);
    if (!r) return null;

    return Methodology.create(
      {
        name: r.name,
        category: r.category,
        description: r.description,
        formula: r.formula,
        templateExample: r.template_example,
        createdAt: new Date(r.created_at)
      },
      r.id
    ).getValue();
  }

  public async saveMethodology(methodology: Methodology): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO methodologies (
        id, name, category, description, formula, template_example, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      methodology.id,
      methodology.name,
      methodology.category,
      methodology.description,
      methodology.formula,
      methodology.templateExample,
      methodology.createdAt.toISOString()
    ];
    await this.db.execute(sql, params);
  }

  public async deleteMethodology(id: string): Promise<void> {
    await this.db.execute("DELETE FROM methodologies WHERE id = ?", [id]);
  }

  public async getToneProfile(): Promise<ToneProfile> {
    const rows = await this.db.query<any>("SELECT * FROM tone_profiles LIMIT 1");
    if (rows.length === 0) {
      const defaultProfile = ToneProfile.create({}).getValue();
      await this.saveToneProfile(defaultProfile);
      return defaultProfile;
    }

    const r = rows[0];
    let rules = [];
    let avoidWords = [];
    try {
      rules = typeof r.rules === "string" ? JSON.parse(r.rules) : r.rules;
      avoidWords = typeof r.avoid_words === "string" ? JSON.parse(r.avoid_words) : r.avoid_words;
    } catch {
      rules = [];
      avoidWords = [];
    }

    return ToneProfile.create(
      {
        name: r.name,
        rules,
        avoidWords,
        targetAudience: r.target_audience,
        updatedAt: new Date(r.updated_at)
      },
      r.id
    ).getValue();
  }

  public async saveToneProfile(profile: ToneProfile): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO tone_profiles (
        id, name, rules, avoid_words, target_audience, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      profile.id,
      profile.name,
      JSON.stringify(profile.rules),
      JSON.stringify(profile.avoidWords),
      profile.targetAudience,
      profile.updatedAt.toISOString()
    ];
    await this.db.execute(sql, params);
  }
}
