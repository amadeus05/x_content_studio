import { Entity } from "../../../../shared/domain/Entity.ts";
import { Result } from "../../../../shared/domain/Result.ts";

export interface ToneProfileProps {
  name: string;
  rules: string[];
  avoidWords: string[];
  targetAudience: string;
  updatedAt: Date;
}

export class ToneProfile extends Entity<ToneProfileProps> {
  private constructor(props: ToneProfileProps, id?: string) {
    super(props, id);
  }

  get name(): string {
    return this.props.name;
  }

  get rules(): string[] {
    return [...this.props.rules];
  }

  get avoidWords(): string[] {
    return [...this.props.avoidWords];
  }

  get targetAudience(): string {
    return this.props.targetAudience;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public update(rules: string[], avoidWords: string[], targetAudience: string): void {
    this.props.rules = rules;
    this.props.avoidWords = avoidWords;
    this.props.targetAudience = targetAudience;
    this.props.updatedAt = new Date();
  }

  /**
   * Формирует системную инструкцию для AI-промпта
   */
  public toSystemPromptGuidance(): string {
    const rulesList = this.props.rules.length > 0
      ? `Правила стиля:\n- ${this.props.rules.join("\n- ")}`
      : "";
    const avoidList = this.props.avoidWords.length > 0
      ? `Исключить слова/клише: ${this.props.avoidWords.join(", ")}`
      : "";
    const audience = this.props.targetAudience
      ? `Целевая аудитория: ${this.props.targetAudience}`
      : "";

    return [rulesList, avoidList, audience].filter(Boolean).join("\n\n");
  }

  public static create(
    props: {
      name?: string;
      rules?: string[];
      avoidWords?: string[];
      targetAudience?: string;
      updatedAt?: Date;
    },
    id?: string
  ): Result<ToneProfile> {
    const profile = new ToneProfile(
      {
        name: props.name || "Личный стиль",
        rules: props.rules || [
          "Пиши живо, ритмично и без канцелярской воды",
          "Первая строчка — жесткий хук без приветствий и банальностей",
          "Короткие абзацы (1-2 предложения максимум)",
          "Без избытка эмодзи (максимум 1-2 смысловых)"
        ],
        avoidWords: props.avoidWords || ["В современном мире", "Не секрет, что", "Давайте разберемся", "Итак"],
        targetAudience: props.targetAudience || "Предприниматели, разработчики, создатели контента",
        updatedAt: props.updatedAt ?? new Date()
      },
      id || "default-tone-profile"
    );

    return Result.ok(profile);
  }
}
