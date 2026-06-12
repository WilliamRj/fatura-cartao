const ALL_RECORDS = "all";

export const queryKeys = {
  faturas: {
    all: ["faturas"] as const,
    lists: () => [...queryKeys.faturas.all, "list"] as const,
    list: (userId: string) =>
      [...queryKeys.faturas.lists(), userId] as const,
  },
  gastos: {
    all: ["gastos"] as const,
    lists: () => [...queryKeys.gastos.all, "list"] as const,
    userLists: (userId: string) =>
      [...queryKeys.gastos.lists(), userId] as const,
    list: (userId: string, faturaId?: string) =>
      [
        ...queryKeys.gastos.userLists(userId),
        faturaId ?? ALL_RECORDS,
      ] as const,
    details: (userId: string) =>
      [...queryKeys.gastos.all, "detail", userId] as const,
    detail: (userId: string, gastoId: string) =>
      [...queryKeys.gastos.details(userId), gastoId] as const,
  },
  parcelamentos: {
    all: ["parcelamentos"] as const,
    lists: () => [...queryKeys.parcelamentos.all, "list"] as const,
    userLists: (userId: string) =>
      [...queryKeys.parcelamentos.lists(), userId] as const,
    list: (userId: string, faturaId?: string) =>
      [
        ...queryKeys.parcelamentos.userLists(userId),
        faturaId ?? ALL_RECORDS,
      ] as const,
  },
  responsaveis: {
    all: ["responsaveis"] as const,
    lists: () => [...queryKeys.responsaveis.all, "list"] as const,
    list: (userId: string) =>
      [...queryKeys.responsaveis.lists(), userId] as const,
  },
} as const;
