/**
 * D1 Database Interface & Local In-Memory / File SQLite Adapter
 * Позволяет приложению прозрачно работать и на Cloudflare Workers (D1),
 * и локально в Vite / Node / Wrangler dev.
 */

export interface IDatabase {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ success: boolean; changes?: number }>;
  batch(statements: { sql: string; params?: unknown[] }[]): Promise<void>;
}

export class CloudflareD1Adapter implements IDatabase {
  constructor(private readonly d1: any) {}

  private session() {
    if (typeof this.d1.withSession === "function") {
      return this.d1.withSession("first-primary");
    }
    return this.d1;
  }

  private prepare(sql: string, params: unknown[] = []) {
    const stmt = this.session().prepare(sql);
    return params.length > 0 ? stmt.bind(...params) : stmt;
  }

  public async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.prepare(sql, params).all();
    return (res.results as T[]) || [];
  }

  public async execute(sql: string, params: unknown[] = []): Promise<{ success: boolean; changes?: number }> {
    const res = await this.prepare(sql, params).run();
    if (res.success === false) {
      throw new Error(res.error || "D1 execute failed");
    }
    return { success: res.success ?? true, changes: res.meta?.changes };
  }

  public async batch(statements: { sql: string; params?: unknown[] }[]): Promise<void> {
    const db = this.session();
    const stmts = statements.map((s) => {
      const stmt = db.prepare(s.sql);
      return s.params && s.params.length > 0 ? stmt.bind(...s.params) : stmt;
    });
    await db.batch(stmts);
  }
}

/**
 * Локальное хранилище в памяти для мгновенного preview без настройки Cloudflare
 */
export class MemoryDatabaseAdapter implements IDatabase {
  private static instance: MemoryDatabaseAdapter;
  private posts: Map<string, any> = new Map();
  private variants: Map<string, any> = new Map();
  private bodies: Map<string, any> = new Map();
  private methodologies: Map<string, any> = new Map();
  private toneProfiles: Map<string, any> = new Map();
  private media: Map<string, any> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  public static getInstance(): MemoryDatabaseAdapter {
    if (!MemoryDatabaseAdapter.instance) {
      MemoryDatabaseAdapter.instance = new MemoryDatabaseAdapter();
    }
    return MemoryDatabaseAdapter.instance;
  }

  private seedDefaultData() {
    // Начальные методики для X
    const defaultMethodologies = [
      {
        id: "meth-1",
        name: "PAS (Проблема - Боль - Решение)",
        category: "Структуры",
        description: "Классическая формула убеждения. Сначала бьем в проблему, усиливаем боль, затем даем четкое решение.",
        formula: "1. Назови проблему аудитории\n2. Усили боль: что будет, если игнорировать\n3. Предложи конкретное решение в 1-2 шага",
        template_example: "Большинство создателей контента тратят по 4 часа на один твит. [Проблема]\n\nВ итоге выгорают за месяц и бросают X с нулем подписчиков. [Усиление]\n\nВот система из 3 шагов, которая экономит мне 80% времени: [Решение]",
        created_at: new Date().toISOString()
      },
      {
        id: "meth-2",
        name: "Contrarian Take (Противоположный взгляд)",
        category: "Хуки",
        description: "Разрушение общепринятого мифа или популярного совета в вашей нише. Вызывает мгновенный интерес.",
        formula: "1. Возьми популярный совет («Все говорят делай X»)\n2. Опровергни его («На самом деле X убивает ваш результат»)\n3. Объясни свою логику с пруфами",
        template_example: "«Пишите по 5 твитов каждый день» — худший совет для новичков в X.\n\nВот почему это гарантированно загонит вас в теневой бан и убьет мотивацию (и что делать вместо этого):",
        created_at: new Date().toISOString()
      },
      {
        id: "meth-3",
        name: "Before-After-Bridge (До - После - Мост)",
        category: "Сторителлинг",
        description: "Показывает трансформацию. Было плохо -> стало потрясающе -> вот как я этого достиг.",
        formula: "1. Точка А: какой был провал/хаос\n2. Точка Б: какой результат сейчас\n3. Мост: ключевой инсайт или инструмент",
        template_example: "6 месяцев назад: 140 просмотров на твит и ноль лидов.\n\nСегодня: 50,000+ охвата в неделю и стабильный поток клиентов.\n\nЯ изменил всего 1 вещь в первой строчке постов:",
        created_at: new Date().toISOString()
      },
      {
        id: "meth-4",
        name: "Curated List (Золотая подборка)",
        category: "Виральность",
        description: "Один из самых сохраняемых форматов в X. Люди добавляют в закладки закладки/тулы/фреймворки.",
        formula: "1. Обещание экономии времени/денег («Я протестировал 100 X, чтобы вам не пришлось»)\n2. Список 3-7 топовых пунктов с пользой\n3. Призыв сохранить в закладки",
        template_example: "Я протестировал более 40 AI-инструментов за последние полгода.\n\n90% из них — бесполезный мусор.\n\nВот 5 инструментов, которые реально экономят мне 15+ часов в неделю:",
        created_at: new Date().toISOString()
      }
    ];

    defaultMethodologies.forEach((m) => this.methodologies.set(m.id, m));

    // Начальный пример черновика
    const samplePostId = "sample-post-1";
    const sampleVariantId = "sample-variant-1";
    const sampleBodyId = "sample-body-1";

    this.posts.set(samplePostId, {
      id: samplePostId,
      status: "DRAFT",
      active_variant_id: sampleVariantId,
      tags: JSON.stringify(["AI", "Продуктивность"]),
      notes: "Проверить гипотезу: формат списка инструментов получает на 40% больше закладок.",
      tweet_url: "",
      metrics: JSON.stringify({}),
      scheduled_for: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.bodies.set(sampleBodyId, {
      id: sampleBodyId,
      post_id: samplePostId,
      text: "Вот 3 системных промпта, которые превращают AI в персонального редактора:\n\n1. Ролевой контекст\n2. Ограничение по ToV\n3. Запрет на штампы\n\nСохраняйте в закладки 🔖",
      body_label: "Тело 1 (Тезисы)",
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.variants.set(sampleVariantId, {
      id: sampleVariantId,
      post_id: samplePostId,
      hook: "Большинство людей используют ChatGPT как продвинутый Google и упускают 90% его силы.",
      body: "Вот 3 системных промпта, которые превращают AI в персонального редактора:\n\n1. Ролевой контекст\n2. Ограничение по ToV\n3. Запрет на штампы\n\nСохраняйте в закладки 🔖",
      variant_label: "Вариант 1 (Провокация)",
      pinned_body_id: sampleBodyId,
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  public async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const lower = sql.toLowerCase().trim();

    if (lower.includes("from media")) {
      let items = Array.from(this.media.values());
      if (lower.includes("where id =")) {
        items = items.filter((m) => m.id === params[0]);
      } else if (lower.includes("model_type") && lower.includes("model_id")) {
        items = items.filter((m) => m.model_type === params[0] && m.model_id === params[1]);
      } else if (lower.includes("model_type")) {
        items = items.filter((m) => m.model_type === params[0]);
      }
      return items as unknown as T[];
    }

    if (lower.startsWith("select * from posts") || lower.includes("from posts")) {
      const allPosts = Array.from(this.posts.values());
      return allPosts as unknown as T[];
    }

    if (lower.startsWith("select * from post_variants") || lower.includes("from post_variants")) {
      if (lower.includes("where post_id =")) {
        const postId = params[0] as string;
        const filtered = Array.from(this.variants.values()).filter((v) => v.post_id === postId);
        return filtered as unknown as T[];
      }
      return Array.from(this.variants.values()) as unknown as T[];
    }

    if (lower.startsWith("select * from post_bodies") || lower.includes("from post_bodies")) {
      if (lower.includes("where post_id =")) {
        const postId = params[0] as string;
        const filtered = Array.from(this.bodies.values()).filter((b) => b.post_id === postId);
        return filtered as unknown as T[];
      }
      return Array.from(this.bodies.values()) as unknown as T[];
    }

    if (lower.includes("from methodologies")) {
      return Array.from(this.methodologies.values()) as unknown as T[];
    }

    return [] as T[];
  }

  public async execute(sql: string, params: unknown[] = []): Promise<{ success: boolean; changes?: number }> {
    const lower = sql.toLowerCase().trim();

    if (lower.startsWith("insert into posts") || lower.startsWith("insert or replace into posts")) {
      const [id, status, active_variant_id, tags, notes, tweet_url, metrics, scheduled_for, created_at, updated_at] = params as any[];
      this.posts.set(id, {
        id,
        status,
        active_variant_id,
        tags,
        notes,
        tweet_url,
        metrics,
        scheduled_for,
        created_at,
        updated_at
      });
      return { success: true, changes: 1 };
    }

    if (lower.startsWith("insert into post_variants") || lower.startsWith("insert or replace into post_variants")) {
      const [id, post_id, hook, body, variant_label, order_index, created_at, updated_at, pinned_body_id] = params as any[];
      this.variants.set(id, {
        id,
        post_id,
        hook,
        body,
        variant_label,
        order_index,
        created_at,
        updated_at,
        pinned_body_id: pinned_body_id ?? null
      });
      return { success: true, changes: 1 };
    }

    if (lower.startsWith("insert into post_bodies") || lower.startsWith("insert or replace into post_bodies")) {
      const [id, post_id, text, body_label, order_index, created_at, updated_at] = params as any[];
      this.bodies.set(id, {
        id,
        post_id,
        text,
        body_label,
        order_index,
        created_at,
        updated_at
      });
      return { success: true, changes: 1 };
    }

    if (lower.startsWith("insert into media") || lower.startsWith("insert or replace into media")) {
      const [
        id,
        model_type,
        model_id,
        kind,
        filename,
        mime_type,
        size_bytes,
        storage_key,
        alt_text,
        is_primary,
        order_index,
        created_at
      ] = params as any[];
      this.media.set(id, {
        id,
        model_type,
        model_id,
        kind,
        filename,
        mime_type,
        size_bytes,
        storage_key,
        alt_text,
        is_primary,
        order_index,
        created_at
      });
      return { success: true, changes: 1 };
    }

    if (lower.startsWith("delete from media where id =")) {
      const id = params[0] as string;
      this.media.delete(id);
      return { success: true, changes: 1 };
    }

    if (lower.startsWith("delete from posts where id =")) {
      const id = params[0] as string;
      this.posts.delete(id);
      // каскадное удаление вариантов и тел
      for (const [vid, v] of this.variants.entries()) {
        if (v.post_id === id) this.variants.delete(vid);
      }
      for (const [bid, b] of this.bodies.entries()) {
        if (b.post_id === id) this.bodies.delete(bid);
      }
      return { success: true, changes: 1 };
    }

    if (lower.startsWith("delete from post_variants where id =")) {
      const id = params[0] as string;
      this.variants.delete(id);
      return { success: true, changes: 1 };
    }

    if (lower.startsWith("delete from post_variants where post_id =")) {
      const postId = params[0] as string;
      for (const [vid, v] of this.variants.entries()) {
        if (v.post_id === postId) this.variants.delete(vid);
      }
      return { success: true, changes: 1 };
    }

    if (lower.startsWith("delete from post_bodies where id =")) {
      const id = params[0] as string;
      this.bodies.delete(id);
      return { success: true, changes: 1 };
    }

    if (lower.startsWith("delete from post_bodies where post_id =")) {
      const postId = params[0] as string;
      for (const [bid, b] of this.bodies.entries()) {
        if (b.post_id === postId) this.bodies.delete(bid);
      }
      return { success: true, changes: 1 };
    }

    return { success: true, changes: 1 };
  }

  public async batch(statements: { sql: string; params?: unknown[] }[]): Promise<void> {
    for (const stmt of statements) {
      await this.execute(stmt.sql, stmt.params);
    }
  }
}
