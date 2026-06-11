export const CATEGORY_DEFINITIONS = [
  { id: "1", nome: "Alimentação", icone: "utensils" },
  { id: "2", nome: "Transporte", icone: "car" },
  { id: "3", nome: "Entretenimento", icone: "gamepad-2" },
  { id: "4", nome: "Compras", icone: "shopping-bag" },
  { id: "5", nome: "Assinaturas", icone: "tv" },
  { id: "6", nome: "Saúde", icone: "heart-pulse" },
  { id: "7", nome: "Educação", icone: "graduation-cap" },
  { id: "8", nome: "Pagamentos", icone: "credit-card" },
  { id: "9", nome: "Condomínio", icone: "building" },
  { id: "10", nome: "Dívida", icone: "landmark" },
  { id: "11", nome: "Outros", icone: "more-horizontal" },
] as const;

function categoryKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

const CATEGORY_BY_KEY = new Map(
  CATEGORY_DEFINITIONS.map((category) => [categoryKey(category.nome), category.nome]),
);

export function normalizeCategory(category: string) {
  const trimmedCategory = category.trim();
  return CATEGORY_BY_KEY.get(categoryKey(trimmedCategory)) ?? trimmedCategory;
}
