import { Entity } from "../../../../shared/domain/Entity.ts";
import { Result } from "../../../../shared/domain/Result.ts";

export interface MethodologyProps {
  name: string;
  category: string;
  description: string;
  formula: string;
  templateExample: string;
  createdAt: Date;
}

export class Methodology extends Entity<MethodologyProps> {
  private constructor(props: MethodologyProps, id?: string) {
    super(props, id);
  }

  get name(): string {
    return this.props.name;
  }

  get category(): string {
    return this.props.category;
  }

  get description(): string {
    return this.props.description;
  }

  get formula(): string {
    return this.props.formula;
  }

  get templateExample(): string {
    return this.props.templateExample;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  public static create(
    props: {
      name: string;
      category: string;
      description: string;
      formula: string;
      templateExample: string;
      createdAt?: Date;
    },
    id?: string
  ): Result<Methodology> {
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail("Название методики не может быть пустым");
    }

    const methodology = new Methodology(
      {
        name: props.name.trim(),
        category: props.category || "Общие",
        description: props.description || "",
        formula: props.formula || "",
        templateExample: props.templateExample || "",
        createdAt: props.createdAt ?? new Date()
      },
      id
    );

    return Result.ok(methodology);
  }
}
