export type FamilyOrderable = {
  id: number;
  data_nascimento: string | null;
};

/**
 * Siblings with a known birth date are chronological. Siblings without one
 * retain insertion order, represented by the database auto-increment ID.
 */
export function compareFamilyOrder(left: FamilyOrderable, right: FamilyOrderable): number {
  if (left.data_nascimento && right.data_nascimento) {
    const byDate = left.data_nascimento.localeCompare(right.data_nascimento);
    if (byDate !== 0) return byDate;
  } else if (left.data_nascimento) {
    return -1;
  } else if (right.data_nascimento) {
    return 1;
  }

  return left.id - right.id;
}
