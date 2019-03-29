export async function asyncForEach<T>(
  array: T[],
  callback: (el: T, idx: number, arr: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < array.length; i++) {
    await callback(array[i], i, array);
  }
}
