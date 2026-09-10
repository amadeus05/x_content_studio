import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    // Разрешаем .ts расширения в импортах (как в tsconfig allowImportingTsExtensions)
    alias: {
      // Нет нужды в alias — vitest резолвит через Node
    }
  },
  resolve: {
    // Позволяет импортировать файлы с .ts расширением явно
    extensions: [".ts", ".tsx", ".js"]
  }
});
